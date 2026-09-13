// Bundlea la extensión (content script + background) a extension/dist/
// y copia el manifest. Uso: node extension/build.mjs [--watch]
import * as esbuild from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");
const watch = process.argv.includes("--watch");

fs.mkdirSync(distDir, { recursive: true });
fs.copyFileSync(
  path.join(__dirname, "manifest.json"),
  path.join(distDir, "manifest.json"),
);

const shared = {
  bundle: true,
  outdir: distDir,
  target: "chrome110",
  jsx: "automatic",
  jsxImportSource: "react",
  sourcemap: true,
  logLevel: "info",
};

// Content script: se carga como <script> clasico via manifest content_scripts,
// no soporta ESM ahi -> bundlear como IIFE.
const contentOptions = {
  ...shared,
  entryPoints: { content: path.join(__dirname, "src/content/inject.tsx") },
  format: "iife",
};

// Background: MV3 service worker declarado con "type":"module" en el manifest,
// ahi si soporta ESM.
const backgroundOptions = {
  ...shared,
  entryPoints: { background: path.join(__dirname, "src/background/service-worker.ts") },
  format: "esm",
};

if (watch) {
  const [ctxContent, ctxBackground] = await Promise.all([
    esbuild.context(contentOptions),
    esbuild.context(backgroundOptions),
  ]);
  await Promise.all([ctxContent.watch(), ctxBackground.watch()]);
  console.log("Watching extension/src for changes...");
} else {
  await Promise.all([esbuild.build(contentOptions), esbuild.build(backgroundOptions)]);
  console.log("Build listo en extension/dist/");
}
