import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT_DIR, "src");
const PKG_JSON_PATH = path.join(ROOT_DIR, "package.json");

function syncExports() {
  try {
    const pkg = JSON.parse(fs.readFileSync(PKG_JSON_PATH, "utf-8"));

    // Base exports que siempre están presentes
    const newExports = {
      ".": {
        types: "./dist/index.d.ts",
        import: "./dist/index.js",
      },
      "./styles.css": "./dist/index.css",
    };

    // Hooks
    const hooksDir = path.join(SRC_DIR, "hooks");
    if (fs.existsSync(hooksDir)) {
      const hooks = fs
        .readdirSync(hooksDir)
        .filter((f) => f.match(/\.(tsx|ts)$/));
      for (const hook of hooks) {
        const name = hook.replace(/\.[^/.]+$/, "");
        newExports[`./hooks/${name}`] = {
          types: `./dist/hooks/${name}.d.ts`,
          import: `./dist/hooks/${name}.js`,
        };
      }
    }

    // Utils
    const utilsDir = path.join(SRC_DIR, "utils");
    if (fs.existsSync(utilsDir)) {
      const utils = fs
        .readdirSync(utilsDir)
        .filter(
          (f) =>
            f.match(/\.(tsx|ts)$/) && f !== "index.ts" && f !== "index.tsx"
        );
      for (const util of utils) {
        const name = util.replace(/\.[^/.]+$/, "");
        newExports[`./utils/${name}`] = {
          types: `./dist/utils/${name}.d.ts`,
          import: `./dist/utils/${name}.js`,
        };
      }
    }

    // Components (exportados como @fpjd/ui/{component-name})
    const componentsDir = path.join(SRC_DIR, "components");
    if (fs.existsSync(componentsDir)) {
      const components = fs.readdirSync(componentsDir, {
        withFileTypes: true,
      });
      for (const dirent of components) {
        if (dirent.name.startsWith(".")) continue;

        const name = dirent.isDirectory()
          ? dirent.name
          : dirent.name.replace(/\.[^/.]+$/, "");

        newExports[`./${name}`] = {
          types: `./dist/components/${name}.d.ts`,
          import: `./dist/components/${name}.js`,
        };
      }
    }

    const reactFlowComponentsDir = path.join(SRC_DIR, "components", "react-flow");
    if (fs.existsSync(reactFlowComponentsDir)) {
      const components = fs.readdirSync(reactFlowComponentsDir, {
        withFileTypes: true,
      });
      for (const dirent of components) {
        if (dirent.name.startsWith(".")) continue;

        const name = dirent.isDirectory()
          ? dirent.name
          : dirent.name.replace(/\.[^/.]+$/, "");

        newExports[`./react-flow/${name}`] = {
          types: `./dist/components/react-flow/${name}.d.ts`,
          import: `./dist/components/react-flow/${name}.js`,
        };
      }
    }

    pkg.exports = newExports;
    fs.writeFileSync(
      PKG_JSON_PATH,
      JSON.stringify(pkg, null, 4) + "\n",
      "utf-8"
    );
    console.log("✅ package.json exports sincronizados correctamente.");
    console.log(
      `   ${Object.keys(newExports).length} entry points generados.`
    );
  } catch (error) {
    console.error("Error sincronizando exports:", error.message);
    process.exit(1);
  }
}

syncExports();
