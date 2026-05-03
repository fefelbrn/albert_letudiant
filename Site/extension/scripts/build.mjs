import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");
const pub = path.join(root, "public");

const watch = process.argv.includes("--watch");

fs.mkdirSync(dist, { recursive: true });

function copyPublic() {
  for (const name of fs.readdirSync(pub)) {
    fs.cpSync(path.join(pub, name), path.join(dist, name), { recursive: true });
  }
  const logoSrc = path.join(root, "..", "V1", "public", "assets", "navicon.png");
  if (fs.existsSync(logoSrc)) {
    fs.copyFileSync(logoSrc, path.join(dist, "logo.png"));
  }
}

const common = {
  bundle: true,
  platform: "browser",
  sourcemap: watch ? "inline" : false,
  logLevel: "info",
};

async function run() {
  await esbuild.build({
    ...common,
    entryPoints: [path.join(root, "src/background.ts")],
    outfile: path.join(dist, "background.js"),
    format: "esm",
  });

  await esbuild.build({
    ...common,
    entryPoints: [path.join(root, "src/content.ts")],
    outfile: path.join(dist, "content.js"),
    format: "iife",
  });

  await esbuild.build({
    ...common,
    entryPoints: [path.join(root, "src/siteBridge.ts")],
    outfile: path.join(dist, "site-bridge.js"),
    format: "iife",
  });

  await esbuild.build({
    ...common,
    entryPoints: [path.join(root, "src/sidepanel.ts")],
    outfile: path.join(dist, "sidepanel.js"),
    format: "esm",
  });

  copyPublic();
  console.log("Built extension → dist/");
}

if (watch) {
  const ctxBg = await esbuild.context({
    ...common,
    entryPoints: [path.join(root, "src/background.ts")],
    outfile: path.join(dist, "background.js"),
    format: "esm",
  });
  const ctxCt = await esbuild.context({
    ...common,
    entryPoints: [path.join(root, "src/content.ts")],
    outfile: path.join(dist, "content.js"),
    format: "iife",
  });
  const ctxSb = await esbuild.context({
    ...common,
    entryPoints: [path.join(root, "src/siteBridge.ts")],
    outfile: path.join(dist, "site-bridge.js"),
    format: "iife",
  });
  const ctxSp = await esbuild.context({
    ...common,
    entryPoints: [path.join(root, "src/sidepanel.ts")],
    outfile: path.join(dist, "sidepanel.js"),
    format: "esm",
  });
  copyPublic();
  await Promise.all([ctxBg.watch(), ctxCt.watch(), ctxSb.watch(), ctxSp.watch()]);
  console.log("Watching… (dist/)");
} else {
  await run();
}
