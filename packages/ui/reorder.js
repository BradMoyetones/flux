import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Configuración de rutas para entornos ESM nativos
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function main() {
    const componentsDir = path.join(__dirname, "src/components");
    const indexFile = path.join(__dirname, "src/index.tsx");

    if (!fs.existsSync(indexFile)) {
        console.error("No se encontró el archivo src/index.tsx");
        return;
    }

    const files = fs.readdirSync(componentsDir);
    let indexContent = fs.readFileSync(indexFile, "utf8");

    const targetComment = "//-- Shadcn UI Components --//";

    if (!indexContent.includes(targetComment)) {
        console.error(`No se encontró el comentario de control: ${targetComment}`);
        return;
    }

    const partBeforeComment = indexContent.split(targetComment)[0] + targetComment;

    let newExports = "";
    files.forEach((file) => {
        if (file.endsWith(".tsx") && file !== "index.tsx") {
            const componentName = file.replace(".tsx", "");
            newExports += `\nexport * from "./components/${componentName}";`;
        }
    });

    const finalContent = `${partBeforeComment}${newExports}\n`;

    fs.writeFileSync(indexFile, finalContent, "utf8");
    console.log("¡index.tsx limpiado y actualizado con éxito!");
}

main();