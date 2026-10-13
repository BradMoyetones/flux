//! Base de datos local (SQLite) de Flux.
//!
//! Qué vive aquí (y qué NO):
//!  - SÍ: el índice de workflows (caché reconstruible del filesystem) y el historial de
//!    ejecuciones (runs / node_runs).
//!  - NO: la definición de los workflows (siguen siendo archivos `.flux`, fuente de verdad)
//!    ni la configuración del usuario (`ConfigService`).
//!
//! El esquema se versiona con `PRAGMA user_version`; para cambiarlo, añade una entrada a
//! `MIGRATIONS` (nunca edites una existente).

use std::path::Path;
use std::sync::Mutex;

use chrono::{Duration, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use tauri::{AppHandle, Manager};

use crate::errors::AppError;
use crate::storage::file_scanner::FluxEntry;

const MIGRATIONS: &[&str] = &[
    // v1
    "
    CREATE TABLE meta (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );

    CREATE TABLE workflows (
        path      TEXT PRIMARY KEY,
        name      TEXT NOT NULL,
        workspace TEXT NOT NULL
    );
    CREATE INDEX idx_workflows_workspace ON workflows(workspace);

    CREATE TABLE runs (
        id            TEXT PRIMARY KEY,
        workflow_id   TEXT NOT NULL,
        workflow_name TEXT NOT NULL,
        workflow_path TEXT,
        trigger       TEXT NOT NULL,
        status        TEXT NOT NULL,
        started_at    TEXT NOT NULL,
        finished_at   TEXT,
        error         TEXT
    );
    CREATE INDEX idx_runs_workflow ON runs(workflow_id, started_at DESC);
    CREATE INDEX idx_runs_started  ON runs(started_at DESC);

    CREATE TABLE node_runs (
        run_id      TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
        node_id     TEXT NOT NULL,
        status      TEXT NOT NULL,
        started_at  TEXT,
        finished_at TEXT,
        error       TEXT,
        PRIMARY KEY (run_id, node_id)
    );
    ",
];

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RunRecord {
    pub id: String,
    pub workflow_id: String,
    pub workflow_name: String,
    pub workflow_path: Option<String>,
    /// "manual" | "cron" | …
    pub trigger: String,
    /// "running" | "success" | "error" | "cancelled" | "interrupted"
    pub status: String,
    pub started_at: String,
    pub finished_at: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct NodeRunRecord {
    pub node_id: String,
    pub status: String,
    pub started_at: Option<String>,
    pub finished_at: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunDetail {
    #[serde(flatten)]
    pub run: RunRecord,
    pub nodes: Vec<NodeRunRecord>,
}

pub struct Db {
    conn: Mutex<Connection>,
}

fn now() -> String {
    Utc::now().to_rfc3339()
}

impl Db {
    pub fn open(app: &AppHandle) -> Result<Self, AppError> {
        let dir = app
            .path()
            .app_data_dir()
            .map_err(|e| AppError::Storage(format!("app_data_dir: {e}")))?;
        std::fs::create_dir_all(&dir)?;
        Self::open_at(&dir.join("flux.db"))
    }

    pub fn open_at(path: &Path) -> Result<Self, AppError> {
        let conn = Connection::open(path)?;
        // WAL: lecturas no bloquean escrituras y un crash no corrompe la base.
        conn.pragma_update(None, "journal_mode", "WAL")?;
        Self::init(conn)
    }

    #[cfg(test)]
    pub fn open_in_memory() -> Result<Self, AppError> {
        Self::init(Connection::open_in_memory()?)
    }

    fn init(conn: Connection) -> Result<Self, AppError> {
        conn.pragma_update(None, "foreign_keys", "ON")?;
        conn.busy_timeout(std::time::Duration::from_secs(5))?;
        Self::migrate(&conn)?;
        Ok(Self { conn: Mutex::new(conn) })
    }

    fn migrate(conn: &Connection) -> Result<(), AppError> {
        let current: u32 = conn.pragma_query_value(None, "user_version", |r| r.get(0))?;
        for (i, sql) in MIGRATIONS.iter().enumerate().skip(current as usize) {
            let tx = conn.unchecked_transaction()?;
            tx.execute_batch(sql)?;
            tx.pragma_update(None, "user_version", (i + 1) as u32)?;
            tx.commit()?;
            tracing::info!("DB: migración v{} aplicada", i + 1);
        }
        Ok(())
    }

    fn conn(&self) -> std::sync::MutexGuard<'_, Connection> {
        self.conn.lock().unwrap_or_else(|e| e.into_inner())
    }

    /// Factory reset: vacía todas las tablas (la conexión sigue abierta, así que no se borra el archivo).
    pub fn wipe(&self) -> Result<(), AppError> {
        self.conn()
            .execute_batch("DELETE FROM node_runs; DELETE FROM runs; DELETE FROM workflows; DELETE FROM meta;")?;
        Ok(())
    }

    // ──── meta ────

    pub fn meta_get(&self, key: &str) -> Result<Option<String>, AppError> {
        Ok(self
            .conn()
            .query_row("SELECT value FROM meta WHERE key = ?1", [key], |r| r.get(0))
            .optional()?)
    }

    pub fn meta_set(&self, key: &str, value: &str) -> Result<(), AppError> {
        self.conn().execute(
            "INSERT INTO meta (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            [key, value],
        )?;
        Ok(())
    }

    // ──── índice de workflows ────

    pub fn list_index(&self) -> Result<Vec<FluxEntry>, AppError> {
        let conn = self.conn();
        let mut stmt = conn.prepare("SELECT name, path, workspace FROM workflows ORDER BY name COLLATE NOCASE, path")?;
        let rows = stmt.query_map([], |r| {
            Ok(FluxEntry { name: r.get(0)?, path: r.get(1)?, workspace: r.get(2)? })
        })?;
        Ok(rows.collect::<Result<_, _>>()?)
    }

    /// Reemplaza TODO el índice (resync completo) en una transacción.
    pub fn replace_index(&self, entries: &[FluxEntry]) -> Result<(), AppError> {
        let mut conn = self.conn();
        let tx = conn.transaction()?;
        tx.execute("DELETE FROM workflows", [])?;
        {
            let mut stmt = tx.prepare("INSERT OR REPLACE INTO workflows (path, name, workspace) VALUES (?1, ?2, ?3)")?;
            for e in entries {
                stmt.execute(params![e.path, e.name, e.workspace])?;
            }
        }
        tx.commit()?;
        Ok(())
    }

    pub fn upsert_index(&self, entry: &FluxEntry) -> Result<(), AppError> {
        self.conn().execute(
            "INSERT INTO workflows (path, name, workspace) VALUES (?1, ?2, ?3)
             ON CONFLICT(path) DO UPDATE SET name = excluded.name, workspace = excluded.workspace",
            params![entry.path, entry.name, entry.workspace],
        )?;
        Ok(())
    }

    pub fn upsert_index_many(&self, entries: &[FluxEntry]) -> Result<(), AppError> {
        let mut conn = self.conn();
        let tx = conn.transaction()?;
        {
            let mut stmt = tx.prepare(
                "INSERT INTO workflows (path, name, workspace) VALUES (?1, ?2, ?3)
                 ON CONFLICT(path) DO NOTHING",
            )?;
            for e in entries {
                stmt.execute(params![e.path, e.name, e.workspace])?;
            }
        }
        tx.commit()?;
        Ok(())
    }

    pub fn remove_index(&self, path: &str) -> Result<(), AppError> {
        self.conn().execute("DELETE FROM workflows WHERE path = ?1", [path])?;
        Ok(())
    }

    pub fn remove_workspace_index(&self, workspace: &str) -> Result<(), AppError> {
        self.conn().execute("DELETE FROM workflows WHERE workspace = ?1", [workspace])?;
        Ok(())
    }

    pub fn rename_index(&self, old_path: &str, new_path: &str, new_name: &str) -> Result<(), AppError> {
        self.conn().execute(
            "UPDATE workflows SET path = ?2, name = ?3 WHERE path = ?1",
            params![old_path, new_path, new_name],
        )?;
        Ok(())
    }

    // ──── historial de ejecuciones ────

    pub fn run_started(
        &self,
        run_id: &str,
        workflow_id: &str,
        workflow_name: &str,
        workflow_path: Option<&str>,
        trigger: &str,
        node_ids: &[String],
    ) -> Result<(), AppError> {
        let mut conn = self.conn();
        let tx = conn.transaction()?;
        tx.execute(
            "INSERT INTO runs (id, workflow_id, workflow_name, workflow_path, trigger, status, started_at)
             VALUES (?1, ?2, ?3, ?4, ?5, 'running', ?6)",
            params![run_id, workflow_id, workflow_name, workflow_path, trigger, now()],
        )?;
        {
            let mut stmt = tx.prepare("INSERT INTO node_runs (run_id, node_id, status) VALUES (?1, ?2, 'pending')")?;
            for id in node_ids {
                stmt.execute(params![run_id, id])?;
            }
        }
        tx.commit()?;
        Ok(())
    }

    /// Actualiza el estado de un nodo. `started_at` se fija al pasar a `running`;
    /// `finished_at` al pasar a un estado terminal.
    pub fn node_status(&self, run_id: &str, node_id: &str, status: &str, error: Option<&str>) -> Result<(), AppError> {
        let terminal = matches!(status, "success" | "error" | "cancelled" | "skipped");
        self.conn().execute(
            "UPDATE node_runs SET
                status      = ?3,
                error       = ?4,
                started_at  = CASE WHEN ?3 = 'running' THEN ?5 ELSE started_at END,
                finished_at = CASE WHEN ?6 THEN ?5 ELSE finished_at END
             WHERE run_id = ?1 AND node_id = ?2",
            params![run_id, node_id, status, error, now(), terminal],
        )?;
        Ok(())
    }

    pub fn run_finished(&self, run_id: &str, status: &str, error: Option<&str>) -> Result<(), AppError> {
        self.conn().execute(
            "UPDATE runs SET status = ?2, error = ?3, finished_at = ?4 WHERE id = ?1",
            params![run_id, status, error, now()],
        )?;
        Ok(())
    }

    /// Tras un crash/cierre forzado quedan runs en `running`: se marcan `interrupted`.
    pub fn mark_orphan_runs_interrupted(&self) -> Result<usize, AppError> {
        let conn = self.conn();
        conn.execute(
            "UPDATE node_runs SET status = 'cancelled', finished_at = ?1
             WHERE status IN ('pending','running') AND run_id IN (SELECT id FROM runs WHERE status = 'running')",
            [now()],
        )?;
        Ok(conn.execute(
            "UPDATE runs SET status = 'interrupted', finished_at = ?1 WHERE status = 'running'",
            [now()],
        )?)
    }

    pub fn list_runs(&self, workflow_id: Option<&str>, limit: u32) -> Result<Vec<RunRecord>, AppError> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, workflow_id, workflow_name, workflow_path, trigger, status, started_at, finished_at, error
             FROM runs
             WHERE (?1 IS NULL OR workflow_id = ?1)
             ORDER BY started_at DESC
             LIMIT ?2",
        )?;
        let rows = stmt.query_map(params![workflow_id, limit], |r| {
            Ok(RunRecord {
                id: r.get(0)?,
                workflow_id: r.get(1)?,
                workflow_name: r.get(2)?,
                workflow_path: r.get(3)?,
                trigger: r.get(4)?,
                status: r.get(5)?,
                started_at: r.get(6)?,
                finished_at: r.get(7)?,
                error: r.get(8)?,
            })
        })?;
        Ok(rows.collect::<Result<_, _>>()?)
    }

    pub fn get_run(&self, run_id: &str) -> Result<Option<RunDetail>, AppError> {
        let run = self
            .conn()
            .query_row(
                "SELECT id, workflow_id, workflow_name, workflow_path, trigger, status, started_at, finished_at, error
                 FROM runs WHERE id = ?1",
                [run_id],
                |r| {
                    Ok(RunRecord {
                        id: r.get(0)?,
                        workflow_id: r.get(1)?,
                        workflow_name: r.get(2)?,
                        workflow_path: r.get(3)?,
                        trigger: r.get(4)?,
                        status: r.get(5)?,
                        started_at: r.get(6)?,
                        finished_at: r.get(7)?,
                        error: r.get(8)?,
                    })
                },
            )
            .optional()?;
        let Some(run) = run else { return Ok(None) };

        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT node_id, status, started_at, finished_at, error FROM node_runs WHERE run_id = ?1 ORDER BY rowid",
        )?;
        let nodes = stmt
            .query_map([run_id], |r| {
                Ok(NodeRunRecord {
                    node_id: r.get(0)?,
                    status: r.get(1)?,
                    started_at: r.get(2)?,
                    finished_at: r.get(3)?,
                    error: r.get(4)?,
                })
            })?
            .collect::<Result<_, _>>()?;
        Ok(Some(RunDetail { run, nodes }))
    }

    pub fn clear_runs(&self, workflow_id: Option<&str>) -> Result<usize, AppError> {
        Ok(self.conn().execute(
            "DELETE FROM runs WHERE status != 'running' AND (?1 IS NULL OR workflow_id = ?1)",
            params![workflow_id],
        )?)
    }

    /// Retención: borra runs más viejos que `keep_days` y, por workflow, deja solo los
    /// `max_per_workflow` más recientes.
    pub fn prune_runs(&self, keep_days: i64, max_per_workflow: u32) -> Result<usize, AppError> {
        let cutoff = (Utc::now() - Duration::days(keep_days)).to_rfc3339();
        let conn = self.conn();
        let by_age = conn.execute("DELETE FROM runs WHERE status != 'running' AND started_at < ?1", [cutoff])?;
        let by_count = conn.execute(
            "DELETE FROM runs WHERE status != 'running' AND id IN (
                SELECT id FROM (
                    SELECT id, ROW_NUMBER() OVER (PARTITION BY workflow_id ORDER BY started_at DESC) AS rn
                    FROM runs WHERE status != 'running'
                ) WHERE rn > ?1
             )",
            [max_per_workflow],
        )?;
        Ok(by_age + by_count)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(name: &str, ws: &str) -> FluxEntry {
        FluxEntry { name: name.into(), path: format!("{ws}/{name}.flux"), workspace: ws.into() }
    }

    #[test]
    fn migrations_are_idempotent_and_versioned() {
        let dir = std::env::temp_dir().join(format!("flux-db-{}-{}", std::process::id(), uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("flux.db");

        let db = Db::open_at(&path).unwrap();
        db.upsert_index(&entry("a", "/ws")).unwrap();
        drop(db);

        let db = Db::open_at(&path).unwrap(); // reabrir no re-migra ni pierde datos
        assert_eq!(db.list_index().unwrap().len(), 1);
        let v: u32 = db.conn().pragma_query_value(None, "user_version", |r| r.get(0)).unwrap();
        assert_eq!(v as usize, MIGRATIONS.len());
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn index_crud() {
        let db = Db::open_in_memory().unwrap();
        db.replace_index(&[entry("b", "/ws1"), entry("A", "/ws1"), entry("c", "/ws2")]).unwrap();
        let names: Vec<_> = db.list_index().unwrap().into_iter().map(|e| e.name).collect();
        assert_eq!(names, vec!["A", "b", "c"]); // orden case-insensitive

        db.upsert_index_many(&[entry("b", "/ws1"), entry("d", "/ws1")]).unwrap(); // b no duplica
        assert_eq!(db.list_index().unwrap().len(), 4);

        db.rename_index("/ws1/b.flux", "/ws1/z.flux", "z").unwrap();
        assert!(db.list_index().unwrap().iter().any(|e| e.path == "/ws1/z.flux" && e.name == "z"));

        db.remove_index("/ws1/z.flux").unwrap();
        db.remove_workspace_index("/ws2").unwrap();
        assert_eq!(db.list_index().unwrap().len(), 2);
    }

    #[test]
    fn run_lifecycle() {
        let db = Db::open_in_memory().unwrap();
        let nodes = vec!["n1".to_string(), "n2".to_string()];
        db.run_started("r1", "wf", "Ventas", Some("/ws/v.flux"), "manual", &nodes).unwrap();
        db.node_status("r1", "n1", "running", None).unwrap();
        db.node_status("r1", "n1", "success", None).unwrap();
        db.node_status("r1", "n2", "error", Some("boom")).unwrap();
        db.run_finished("r1", "error", Some("boom")).unwrap();

        let runs = db.list_runs(Some("wf"), 10).unwrap();
        assert_eq!(runs.len(), 1);
        assert_eq!(runs[0].status, "error");
        assert!(runs[0].finished_at.is_some());
        assert!(db.list_runs(Some("otro"), 10).unwrap().is_empty());

        let detail = db.get_run("r1").unwrap().unwrap();
        assert_eq!(detail.nodes.len(), 2);
        assert!(detail.nodes[0].started_at.is_some() && detail.nodes[0].finished_at.is_some());
        assert_eq!(detail.nodes[1].error.as_deref(), Some("boom"));
        assert!(db.get_run("nope").unwrap().is_none());
    }

    #[test]
    fn orphan_runs_are_marked_interrupted() {
        let db = Db::open_in_memory().unwrap();
        db.run_started("r1", "wf", "W", None, "cron", &["n1".to_string()]).unwrap();
        db.node_status("r1", "n1", "running", None).unwrap();

        assert_eq!(db.mark_orphan_runs_interrupted().unwrap(), 1);
        let d = db.get_run("r1").unwrap().unwrap();
        assert_eq!(d.run.status, "interrupted");
        assert_eq!(d.nodes[0].status, "cancelled");
    }

    #[test]
    fn retention_by_count_and_clear() {
        let db = Db::open_in_memory().unwrap();
        for i in 0..5 {
            let id = format!("r{i}");
            db.run_started(&id, "wf", "W", None, "manual", &[]).unwrap();
            db.run_finished(&id, "success", None).unwrap();
            std::thread::sleep(std::time::Duration::from_millis(2)); // started_at distinto
        }
        db.run_started("live", "wf", "W", None, "manual", &[]).unwrap(); // en curso: nunca se poda

        db.prune_runs(30, 2).unwrap();
        let ids: Vec<_> = db.list_runs(None, 100).unwrap().into_iter().map(|r| r.id).collect();
        assert!(ids.contains(&"live".to_string()));
        assert_eq!(ids.len(), 3); // live + 2 más recientes (live cuenta en la partición, pero no se borra)

        db.clear_runs(None).unwrap();
        assert_eq!(db.list_runs(None, 100).unwrap().len(), 1); // solo el en curso
    }
}
