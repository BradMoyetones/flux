#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import {
    intro,
    outro,
    select,
    text,
    confirm,
    spinner,
    note,
    log,
    isCancel,
    cancel
} from '@clack/prompts';
import pc from 'picocolors';
import semver from 'semver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Rutas de archivos a sincronizar
const DESKTOP_PKG_PATH = path.join(ROOT_DIR, 'apps/desktop/package.json');
const TAURI_CONF_PATH = path.join(ROOT_DIR, 'apps/desktop/src-tauri/tauri.conf.json');
const CARGO_TOML_PATH = path.join(ROOT_DIR, 'apps/desktop/src-tauri/Cargo.toml');
const CARGO_LOCK_PATH = path.join(ROOT_DIR, 'apps/desktop/src-tauri/Cargo.lock');
const LATEST_RELEASE_PATH = path.join(ROOT_DIR, 'apps/desktop/releases/latest.md');

function runCommand(command, { silent = false } = {}) {
    try {
        return execSync(command, {
            cwd: ROOT_DIR,
            encoding: 'utf-8',
            stdio: silent ? 'pipe' : 'inherit'
        });
    } catch (error) {
        if (!silent) {
            log.error(`Error al ejecutar comando: ${command}`);
        }
        throw error;
    }
}

function runCommandOutput(command) {
    return execSync(command, { cwd: ROOT_DIR, encoding: 'utf-8' }).trim();
}

function handleCancel(value) {
    if (isCancel(value)) {
        cancel('Operación cancelada por el usuario.');
        process.exit(0);
    }
    return value;
}

async function main() {
    intro(pc.bgCyan(pc.black(' FLUX RELEASE ASSISTANT ')));

    // 1. Verificaciones previas de Git
    const gitStatus = runCommandOutput('git status --porcelain');
    if (gitStatus) {
        log.warn('Existen cambios sin confirmar en el directorio de trabajo:');
        console.log(pc.dim(gitStatus));

        const continueWithDirty = handleCancel(
            await confirm({
                message: '¿Deseas continuar a pesar de los cambios pendientes?',
                initialValue: false
            })
        );

        if (!continueWithDirty) {
            cancel('Por favor realiza commit o stash de tus cambios antes de continuar.');
            process.exit(0);
        }
    }

    const currentBranch = runCommandOutput('git rev-parse --abbrev-ref HEAD');
    if (currentBranch !== 'main') {
        log.warn(`La rama activa es "${currentBranch}" (se recomienda publicar desde "main").`);
        const continueBranch = handleCancel(
            await confirm({
                message: '¿Continuar en esta rama?',
                initialValue: false
            })
        );

        if (!continueBranch) {
            cancel('Operación cancelada.');
            process.exit(0);
        }
    }

    // 2. Determinar versiones semver
    if (!fs.existsSync(DESKTOP_PKG_PATH)) {
        log.error(`No se encontró el archivo: ${DESKTOP_PKG_PATH}`);
        process.exit(1);
    }

    const desktopPkg = JSON.parse(fs.readFileSync(DESKTOP_PKG_PATH, 'utf-8'));
    const currentVersion = semver.clean(desktopPkg.version || '0.0.0');

    if (!currentVersion) {
        log.error(`La versión actual "${desktopPkg.version}" no es un semver válido.`);
        process.exit(1);
    }

    const nextPatch = semver.inc(currentVersion, 'patch');
    const nextMinor = semver.inc(currentVersion, 'minor');
    const nextMajor = semver.inc(currentVersion, 'major');

    log.info(`Versión actual: ${pc.bold(pc.cyan(`v${currentVersion}`))}`);

    const selectedType = handleCancel(
        await select({
            message: 'Selecciona el tipo de versión a publicar:',
            options: [
                {
                    value: nextPatch,
                    label: `Patch  ${pc.green(`v${nextPatch}`)}`,
                    hint: 'corrección de errores y cambios menores'
                },
                {
                    value: nextMinor,
                    label: `Minor  ${pc.cyan(`v${nextMinor}`)}`,
                    hint: 'nuevas funcionalidades compatibles'
                },
                {
                    value: nextMajor,
                    label: `Major  ${pc.yellow(`v${nextMajor}`)}`,
                    hint: 'cambios incompatibles o arquitecturales'
                },
                {
                    value: 'custom',
                    label: 'Personalizada',
                    hint: 'especificar manualmente número de versión'
                }
            ]
        })
    );

    let targetVersion = selectedType;

    if (selectedType === 'custom') {
        targetVersion = handleCancel(
            await text({
                message: 'Introduce la nueva versión (ej. 2.1.1 o v2.1.1):',
                placeholder: nextPatch,
                validate(val) {
                    const cleaned = semver.clean(val);
                    if (!cleaned) return 'Debes introducir una versión semver válida (ej. 2.1.1).';
                    if (semver.lte(cleaned, currentVersion)) {
                        return `La versión debe ser mayor a la actual (v${currentVersion}).`;
                    }
                }
            })
        );
        targetVersion = semver.clean(targetVersion);
    }

    const targetTag = `v${targetVersion}`;

    // Validar si el tag ya existe
    const existingTags = runCommandOutput('git tag -l').split('\n').filter(Boolean);
    if (existingTags.includes(targetTag)) {
        log.error(`El tag "${targetTag}" ya existe en este repositorio.`);
        process.exit(1);
    }

    // 3. Sincronización de archivos y plantilla
    const s = spinner();
    s.start(`Actualizando manifiestos a v${targetVersion}...`);

    // apps/desktop/package.json
    desktopPkg.version = targetVersion;
    fs.writeFileSync(DESKTOP_PKG_PATH, JSON.stringify(desktopPkg, null, 4) + '\n', 'utf-8');

    // apps/desktop/src-tauri/tauri.conf.json
    if (fs.existsSync(TAURI_CONF_PATH)) {
        const tauriConf = JSON.parse(fs.readFileSync(TAURI_CONF_PATH, 'utf-8'));
        tauriConf.version = targetVersion;
        fs.writeFileSync(TAURI_CONF_PATH, JSON.stringify(tauriConf, null, 4) + '\n', 'utf-8');
    }

    // apps/desktop/src-tauri/Cargo.toml
    if (fs.existsSync(CARGO_TOML_PATH)) {
        let cargoContent = fs.readFileSync(CARGO_TOML_PATH, 'utf-8');
        cargoContent = cargoContent.replace(
            /(\[package\][\s\S]*?version\s*=\s*)"[^"]+"/,
            `$1"${targetVersion}"`
        );
        fs.writeFileSync(CARGO_TOML_PATH, cargoContent, 'utf-8');
    }

    // apps/desktop/releases/latest.md
    const dateFormatter = new Intl.DateTimeFormat('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    const dateString = dateFormatter.format(new Date());

    const releasesDir = path.dirname(LATEST_RELEASE_PATH);
    if (!fs.existsSync(releasesDir)) {
        fs.mkdirSync(releasesDir, { recursive: true });
    }

    const templateContent = `---
title: Flux ${targetTag}
version: ${targetTag}
date: ${dateString}
tag: ${targetTag}
---
### Novedades principales

- 

### Mejoras y Optimización

- 

### Corrección de errores

- 
`;

    fs.writeFileSync(LATEST_RELEASE_PATH, templateContent, 'utf-8');
    s.stop(`Archivos sincronizados a ${pc.bold(pc.green(targetTag))}`);

    // 4. Pausa guiada para redactar las notas
    note(
        `Ruta del archivo:\n${pc.bold(pc.cyan('apps/desktop/releases/latest.md'))}\n\n` +
        `Escribe las notas de la versión y guarda el archivo antes de continuar.`,
        'Redacción de Release Notes'
    );

    const readyToCommit = handleCancel(
        await confirm({
            message: '¿Has terminado de editar y guardar latest.md?',
            initialValue: true
        })
    );

    if (!readyToCommit) {
        log.info('Puedes editar el archivo y ejecutar el comando nuevamente cuando estés listo.');
        process.exit(0);
    }

    // 5. Commit y Tag local
    const shouldCommit = handleCancel(
        await confirm({
            message: `¿Crear commit y tag ${pc.bold(pc.cyan(targetTag))}?`,
            initialValue: true
        })
    );

    if (!shouldCommit) {
        log.info('Archivos actualizados sin commit ni tag en Git.');
        process.exit(0);
    }

    s.start(`Creando commit y tag ${targetTag}...`);

    const filesToStage = [DESKTOP_PKG_PATH, TAURI_CONF_PATH, CARGO_TOML_PATH, LATEST_RELEASE_PATH];
    if (fs.existsSync(CARGO_LOCK_PATH)) {
        filesToStage.push(CARGO_LOCK_PATH);
    }

    runCommand(`git add ${filesToStage.map((f) => `"${f}"`).join(' ')}`);
    runCommand(`git commit -m "chore(release): ${targetTag}"`);
    runCommand(`git tag -a "${targetTag}" -m "Release ${targetTag}"`);

    s.stop(`Commit y tag ${pc.bold(pc.green(targetTag))} creados localmente.`);

    // 6. Push a GitHub
    const shouldPush = handleCancel(
        await confirm({
            message: `¿Subir el tag y cambios a origin (${currentBranch}) ahora?`,
            initialValue: true
        })
    );

    if (shouldPush) {
        s.start(`Subiendo a origin ${currentBranch} con tags...`);
        runCommand(`git push origin ${currentBranch} --follow-tags`);
        s.stop(`Cambios y tag ${targetTag} subidos.`);

        outro(
            pc.green(`Release ${pc.bold(targetTag)} publicado con éxito.\nEl workflow de GitHub Actions iniciará la compilación automáticamente.`)
        );
    } else {
        outro(
            `Release ${pc.bold(targetTag)} preparado localmente.\nPara publicarlo manualmente ejecuta:\n${pc.dim(`  git push origin ${currentBranch} --follow-tags`)}`
        );
    }
}

main().catch((err) => {
    log.error(`Error inesperado: ${err.message}`);
    process.exit(1);
});
