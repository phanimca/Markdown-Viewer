#!/usr/bin/env node

/**
 * prepare.js — Build script for the Neutralinojs desktop app.
 *
 * Copies the Vite build output (dist/) into desktop-app/resources/ and
 * generates a Neutralinojs-compatible index.html by injecting the required
 * Neutralinojs script tags.
 *
 * Must be run after `npm run build` (vite build) from the repo root.
 * The desktop:prepare npm script does both steps in sequence.
 */

const fs = require("fs");
const path = require("path");

const DIST_DIR = path.resolve(__dirname, "../dist");
const RESOURCES_DIR = path.resolve(__dirname, "resources");

if (!fs.existsSync(DIST_DIR)) {
  console.error("✗ dist/ not found — run `npm run build` first");
  process.exit(1);
}

/** Recursively copy a directory, creating target dirs as needed. */
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/** Copy entire dist/ → resources/ */
copyDirSync(DIST_DIR, RESOURCES_DIR);
console.log("✓ Copied dist/ → resources/");

/** @section Generate index.html with Neutralinojs injections */

const indexPath = path.join(RESOURCES_DIR, "index.html");
let html = fs.readFileSync(indexPath, "utf-8");
const originalHtml = html;

/**
 * Vite emits: <script type="module" crossorigin src="/js/index.js"></script>
 * Inject neutralino.js + desktop-main.js before it.
 */
const moduleScriptRegex = /(<script\s[^>]*type="module"[^>]*src="\/js\/index\.js"[^>]*><\/script>)/;

if (!moduleScriptRegex.test(html)) {
  console.error("✗ Could not find Vite module script tag (/js/index.js) in resources/index.html");
  process.exit(1);
}

html = html.replace(
  moduleScriptRegex,
  '<script src="/js/neutralino.js"></script>\n    <script src="/js/desktop-main.js"></script>\n    $1',
);

if (html === originalHtml) {
  console.error("✗ No prepare.js transformations were applied");
  process.exit(1);
}

fs.writeFileSync(indexPath, html, "utf-8");
console.log("✓ Generated resources/index.html (Neutralinojs injections applied)");

/** @section Copy desktop-specific source files */
const desktopSrcDir = path.resolve(__dirname, "src");
const desktopMainSrc = path.join(desktopSrcDir, "desktop-main.js");
const desktopMainDest = path.join(RESOURCES_DIR, "js", "desktop-main.js");

if (fs.existsSync(desktopMainSrc)) {
  fs.copyFileSync(desktopMainSrc, desktopMainDest);
  console.log("✓ Copied desktop-main.js to resources/js/");
}

console.log("\nDone! Run `npm run desktop:dev` to start the desktop app.");
