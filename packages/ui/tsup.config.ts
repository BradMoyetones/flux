import { defineConfig } from "tsup";
import { readdirSync } from "node:fs";

// Auto-descubrir componentes
const componentEntries = readdirSync("./src/components", { withFileTypes: true })
  .filter((dirent) => dirent.isFile() && /\.(tsx|ts)$/.test(dirent.name))
  .reduce<Record<string, string>>((acc, dirent) => {
    const name = dirent.name.replace(/\.[^/.]+$/, "");
    acc[`components/${name}`] = `src/components/${dirent.name}`;
    return acc;
  }, {});

const reactFlowComponentEntries = readdirSync("./src/components/react-flow", { withFileTypes: true })
  .filter((dirent) => dirent.isFile() && /\.(tsx|ts)$/.test(dirent.name))
  .reduce<Record<string, string>>((acc, dirent) => {
    const name = dirent.name.replace(/\.[^/.]+$/, "");
    acc[`components/react-flow/${name}`] = `src/components/react-flow/${dirent.name}`;
    return acc;
  }, {});

// Auto-descubrir hooks
const hookEntries = readdirSync("./src/hooks", { withFileTypes: true })
  .filter((dirent) => dirent.isFile() && /\.(tsx|ts)$/.test(dirent.name))
  .reduce<Record<string, string>>((acc, dirent) => {
    const name = dirent.name.replace(/\.[^/.]+$/, "");
    acc[`hooks/${name}`] = `src/hooks/${dirent.name}`;
    return acc;
  }, {});

// Auto-descubrir utils (excluyendo index)
const utilEntries = readdirSync("./src/utils", { withFileTypes: true })
  .filter(
    (dirent) =>
      dirent.isFile() &&
      /\.(tsx|ts)$/.test(dirent.name) &&
      !dirent.name.startsWith("index")
  )
  .reduce<Record<string, string>>((acc, dirent) => {
    const name = dirent.name.replace(/\.[^/.]+$/, "");
    acc[`utils/${name}`] = `src/utils/${dirent.name}`;
    return acc;
  }, {});

export default defineConfig({
  entry: {
    index: "src/index.tsx",
    ...componentEntries,
    ...reactFlowComponentEntries,
    ...hookEntries,
    ...utilEntries,
  },
  format: ["esm"],
  dts: true,
  clean: true,
  splitting: true,
  treeshake: true,
  minify: true,
  external: ["react", "react-dom", "react/jsx-runtime"],
  esbuildOptions(options) {
    options.banner = {
      js: '"use client"',
    };
  },
  outDir: "dist",
});
