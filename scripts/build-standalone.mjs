import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import react from "@vitejs/plugin-react";

// Keep the usual development/production build unchanged. This second target
// embeds the complete game so a downloaded HTML file can run without a server.
const root = fileURLToPath(new URL("../", import.meta.url));
const result = await build({
  root,
  configFile: false,
  plugins: [react()],
  base: "./",
  build: {
    write: false,
    assetsInlineLimit: Infinity,
    cssCodeSplit: false,
    modulePreload: false,
    reportCompressedSize: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});

if (Array.isArray(result) || !("output" in result)) {
  throw new Error("Expected one complete production bundle.");
}
const files = new Map(result.output.map((asset) => [asset.fileName, asset]));
const htmlAsset = files.get("index.html");
if (!htmlAsset || htmlAsset.type !== "asset") {
  throw new Error("Vite did not produce an HTML entry.");
}
let html = Buffer.from(htmlAsset.source).toString("utf8");
let scriptCount = 0;
let styleCount = 0;
html = html.replace(
  /<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g,
  (_tag, src) => {
    const chunk = files.get(src.replace(/^\.\//, ""));
    if (!chunk || chunk.type !== "chunk") {
      throw new Error(`Unresolved script: ${src}`);
    }
    scriptCount++;
    return `<script type="module">${chunk.code.replace(/<\/script/gi, "<\\/script")}</script>`;
  },
);
html = html.replace(/<link\b[^>]*\brel="stylesheet"[^>]*>/g, (tag) => {
  const href = /\bhref="([^"]+)"/.exec(tag)?.[1];
  const asset = href && files.get(href.replace(/^\.\//, ""));
  if (!asset || asset.type !== "asset") {
    throw new Error(`Unresolved stylesheet: ${href}`);
  }
  styleCount++;
  const css = Buffer.from(asset.source).toString("utf8");
  return `<style>${css.replace(/<\/style/gi, "<\\/style")}</style>`;
});
const favicon = await readFile(
  new URL("../public/favicon.svg", import.meta.url),
);
html = html.replace(
  /href="[^\"]*favicon\.svg"/,
  `href="data:image/svg+xml;base64,${favicon.toString("base64")}"`,
);
if (scriptCount !== 1 || styleCount !== 1) {
  throw new Error(
    `Expected one embedded script and stylesheet, received ${scriptCount}/${styleCount}.`,
  );
}
await mkdir(new URL("../dist/", import.meta.url), { recursive: true });
const output = new URL("../dist/guishan-standalone.html", import.meta.url);
await writeFile(output, html);
console.log(
  `Standalone game: ${fileURLToPath(output)} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB)`,
);
