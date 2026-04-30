# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Web development
npm run dev              # Vite dev server at http://localhost:5173
npm run build            # Vite production build → dist/
npm run preview          # Preview production build locally

# Desktop development
npm run desktop:prepare  # Build + copy dist/ into desktop-app/resources/
npm run desktop:dev      # Run Neutralinojs app with hot-reload
npm run desktop:build    # Build cross-platform binaries (Windows .exe, Linux/macOS .tar.gz)
npm run desktop:install  # Install desktop-app dependencies (run once after clone)
```

There is no test framework, linter, or TypeScript compiler in this project.

## Architecture

This is a **vanilla JS markdown editor** targeting two platforms from a single shared codebase:

- **`web/`** — The canonical app (HTML + CSS + ES modules), deployed to Vercel
- **`desktop-app/`** — Neutralinojs wrapper; `prepare.js` copies `dist/` into `resources/` and injects the Neutralinojs SDK script tag into `index.html` at build time

### Shared-code model

`desktop-app/resources/` is never edited directly — it is always regenerated from `dist/` (Vite output) by `prepare.js`. All feature work happens in `web/src/`.

### ES Modules structure (`web/src/`)

Application logic is split into ES modules:

| Module | Purpose |
|--------|---------|
| `main.js` | Entry point, event wiring, CSS imports |
| `state.js` | Shared mutable state + constants |
| `dom.js` | DOM element references (`initDom()` pattern) |
| `preprocessors.js` | Pure markdown transformers (ADO TOC, callouts) |
| `mermaid-utils.js` | Mermaid init / zoom / drag / export |
| `scroll-sync.js` | Anchor cache + interpolation + scroll handlers |
| `render.js` | Markdown render pipeline + document stats |
| `import-export.js` | File open/save, SharePoint/ADO import, HTML export |
| `pdf-export.js` | PDF page-break + canvas logic |
| `view-mode.js` | View mode toggle + resize divider + pane widths |

Key subsystems:

- **Rendering pipeline**: marked → highlight.js (syntax) + MathJax (LaTeX) + Mermaid (diagrams) + JoyPixels (emoji) → DOMPurify sanitize → inject into preview pane. Render is debounced 100 ms.
- **View modes**: `'editor'` / `'split'` / `'preview'` toggled via toolbar buttons (desktop) or hamburger menu (mobile).
- **Scroll sync** (split view): Anchor-based line-position cache + piecewise-linear interpolation maps editor scroll position to preview position. Sync is debounced 10 ms.
- **Export**: PDF via jsPDF + html2canvas; HTML/Markdown raw download via file-saver.
- **Platform detection**: Checks for `window.NL_VERSION` to enable desktop-only features (file open/save via Neutralino FS API, system tray via `desktop-app/resources/js/desktop-main.js`).

### Dependencies

Runtime dependencies are npm packages bundled by Vite:
- marked, highlight.js, mermaid, dompurify, file-saver, jspdf, html2canvas
- bootstrap, bootstrap-icons, github-markdown-css, emoji-toolkit

**MathJax** remains on CDN (config-based loading is simpler than bundling).

### Build tool

**Vite** handles development server, ES module bundling, and production builds. Config in `vite.config.js`.

### Deployment

| Target | Trigger | Config |
|--------|---------|--------|
| Vercel (web) | Push to `main` | `vercel.json` |
| Docker | Push to `main` | `Dockerfile`, nginx security headers |
| GitHub Release (desktop) | Tag `desktop-v*` (CalVer, e.g. `desktop-v2026.2.0`) | `.github/workflows/build-desktop.yml` |

### Theming

CSS custom properties (`--bg-color`, `--text-color`, etc.) define the palette. The `[data-theme="dark"]` attribute on `<html>` switches themes; the preference is persisted in `localStorage`.
