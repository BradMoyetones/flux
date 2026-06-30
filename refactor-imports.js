import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach((f) => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

const replacements = [
    { regex: /@\/components\/ui/g, replace: '@/ui/components/ui' },
    { regex: /@\/components\/views\/flow-canvas/g, replace: '@/modules/flows/ui/screens/flow-canvas' },
    { regex: /@\/components\/views\/flow-node/g, replace: '@/modules/flows/ui/components/flow-node' },
    { regex: /@\/components\/views\/home-view/g, replace: '@/modules/home/ui/screens/home-view' },
    { regex: /@\/components\/views\/release-notes/g, replace: '@/modules/release-notes/ui/screens/release-notes' },
    { regex: /@\/components\//g, replace: '@/ui/components/layout/' },
    { regex: /@\/hooks/g, replace: '@/ui/hooks' },
    { regex: /@\/styles/g, replace: '@/ui/styles' },
    { regex: /@\/lib/g, replace: '@/shared/utils' },
    { regex: /@\/contexts/g, replace: '@/shared/contexts' },
    { regex: /@\/router/g, replace: '@/shared/router' },
    { regex: /@\/app/g, replace: '@/modules/app/react/App' },
];

walkDir('src', function (filePath) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.css')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let original = content;

        for (let r of replacements) {
            content = content.replace(r.regex, r.replace);
        }

        // Specific fixes for main.tsx
        if (filePath.replace(/\\/g, '/').endsWith('src/main.tsx')) {
            content = content.replace(/".\/styles\/index.css"/, '"./ui/styles/index.css"');
            content = content.replace(/".\/router"/, '"./shared/router"');
            content = content.replace(/".\/components\/ui\/sonner"/, '"./ui/components/ui/sonner"');
            content = content.replace(/".\/hooks\/use-updater"/, '"./ui/hooks/use-updater"');
        }

        if (original !== content) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated ${filePath}`);
        }
    }
});
