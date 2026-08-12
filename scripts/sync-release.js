import fs from 'fs';
import path from 'path';

// Definir las rutas
const ROOT_DIR = process.cwd();
const CHANGELOG_PATH = path.join(ROOT_DIR, 'CHANGELOG.md');
const PACKAGE_JSON_PATH = path.join(ROOT_DIR, 'package.json');
const LATEST_RELEASE_PATH = path.join(ROOT_DIR, 'releases', 'latest.md');

function syncRelease() {
    try {
        // 1. Leer la versión del package.json actual
        const packageData = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
        const version = packageData.version;

        if (!version) {
            console.error('❌ No se encontró la versión en package.json');
            process.exit(1);
        }

        console.log(`📦 Sincronizando notas y configuración para la versión v${version}...`);

        // Sincronizar tauri.conf.json
        const TAURI_CONF_PATH = path.join(ROOT_DIR, 'src-tauri', 'tauri.conf.json');
        if (fs.existsSync(TAURI_CONF_PATH)) {
            const tauriConf = JSON.parse(fs.readFileSync(TAURI_CONF_PATH, 'utf-8'));
            if (tauriConf.version !== version) {
                tauriConf.version = version;
                fs.writeFileSync(TAURI_CONF_PATH, JSON.stringify(tauriConf, null, 4) + '\n', 'utf-8');
                console.log(`✅ tauri.conf.json actualizado a v${version}`);
            }
        }

        // 2. Leer CHANGELOG.md
        if (!fs.existsSync(CHANGELOG_PATH)) {
            console.error('❌ No se encontró CHANGELOG.md');
            process.exit(1);
        }
        
        const changelogContent = fs.readFileSync(CHANGELOG_PATH, 'utf-8');
        
        // Expresión regular para encontrar la sección de la versión recién creada.
        // Changesets normalmente genera algo como:
        // ## 1.0.1
        //
        // ### Patch Changes
        //
        // - xxx
        
        const lines = changelogContent.split('\n');
        let isExtracting = false;
        let extractedNotes = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Si encontramos la línea de la versión objetivo (ej. ## 1.0.1)
            if (line.startsWith(`## ${version}`)) {
                isExtracting = true;
                continue; // No incluimos la cabecera en sí
            }
            
            // Si estamos extrayendo y encontramos la siguiente cabecera de versión (## x.x.x)
            if (isExtracting && line.match(/^## \d+\.\d+\.\d+/)) {
                break;
            }
            
            if (isExtracting) {
                extractedNotes.push(line);
            }
        }
        
        const rawNotes = extractedNotes.join('\n').trim();
        
        if (!rawNotes) {
            console.warn(`⚠️ No se extrajeron notas para la versión ${version}. ¿El CHANGELOG está vacío para esta versión?`);
        }

        // 3. Crear el formato final con frontmatter
        // Determinar la fecha de hoy en formato amigable
        const formatter = new Intl.DateTimeFormat('es-ES', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
        const dateString = formatter.format(new Date());

        const finalContent = `---
title: Flux v${version}
version: v${version}
date: ${dateString}
tag: v${version}
---
${rawNotes || 'No hay notas detalladas para esta versión.'}
`;

        // 4. Guardar en releases/latest.md
        if (!fs.existsSync(path.join(ROOT_DIR, 'releases'))) {
            fs.mkdirSync(path.join(ROOT_DIR, 'releases'));
        }
        
        fs.writeFileSync(LATEST_RELEASE_PATH, finalContent, 'utf-8');
        console.log(`✅ Archivo releases/latest.md actualizado exitosamente con la versión v${version}!`);

    } catch (e) {
        console.error('❌ Error sincronizando el release:', e);
        process.exit(1);
    }
}

syncRelease();
