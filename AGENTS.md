# Markdown Viewer — Agent Instructions

A vanilla JS web app + Neutralinojs desktop app for rendering Markdown. Uses Vite for bundling.

## Build & Dev

```bash
# Install dependencies
npm install

# Web dev server (http://localhost:5173)
npm run dev

# Build web app to dist/
npm run build

# Desktop setup + dev
npm run desktop:install   # Install desktop-app dependencies (once)
npm run desktop:prepare   # Build + copy to resources/
npm run desktop:dev       # Run desktop app

# Desktop build (Windows/Linux/macOS)
npm run desktop:build
```

No tests, no linter.

## Architecture

```
web/                # Core app — the single source of truth
  index.html        # UI markup, MathJax CDN tag only
  styles.css        # CSS custom properties; [data-theme="dark"] for dark mode
  src/              # ES modules
    main.js         # Entry point + event wiring + CSS imports
    state.js        # Shared mutable state + constants
    dom.js          # DOM element references (initDom pattern)
    preprocessors.js    # Markdown transformers (ADO TOC, callouts)
    mermaid-utils.js    # Mermaid init / zoom / drag / export
    scroll-sync.js      # Anchor cache + scroll interpolation
    render.js           # Markdown render pipeline + stats
    import-export.js    # File open/save, SharePoint/ADO import
    pdf-export.js       # PDF page-break + canvas logic
    view-mode.js        # View mode toggle + resize divider
vite.config.js      # Vite build configuration
dist/               # Vite output (gitignored)
desktop-app/        # Thin Neutralinojs wrapper
  prepare.js        # Copies dist/ → resources/, injects Neutralino SDK
  resources/js/desktop-main.js  # Desktop-only: tray menu, window close
```

**Shared code model**: `desktop-app/prepare.js` copies Vite's `dist/` output at build time. Edit `web/src/` for any logic or UI change; never edit `desktop-app/resources/` directly.

## Key Conventions

- **ES modules** — Application logic is split across `web/src/` modules. Shared state in `state.js`, DOM refs in `dom.js`.
- **npm dependencies** — marked, highlight.js, mermaid, bootstrap, etc. are npm packages bundled by Vite.
- **MathJax on CDN** — Only exception; config-based loading is simpler than bundling.
- **Debouncing**: render is debounced 100 ms (`RENDER_DELAY`); scroll sync is debounced 10 ms.
- **View modes**: `'editor'`, `'split'`, `'preview'` — managed in `state.currentViewMode`.
- **Versioning**: Desktop uses CalVer `YYYY.M.P` (e.g., 2026.2.0), tagged as `desktop-vYYYY.M.P`.
- **Mobile breakpoint**: 768 px. Separate mobile hamburger menu; desktop has a toolbar.

## Module Dependencies (no cycles)

```
preprocessors.js  ← no internal deps
state.js          ← no internal deps
dom.js            ← no internal deps

mermaid-utils.js  ← state, dom
scroll-sync.js    ← state, dom
view-mode.js      ← state, dom, scroll-sync
render.js         ← state, dom, preprocessors, mermaid-utils, scroll-sync
import-export.js  ← state, dom, render
pdf-export.js     ← state, dom, preprocessors

main.js           ← all of the above
```

## Deployment

| Target | Trigger | Notes |
|--------|---------|-------|
| Vercel (web) | Push to `main` | Runs `npm run build`, serves `dist/` |
| GHCR Docker | Push to `main` | See `Dockerfile` / `docker-compose.yml` |
| GitHub Release | Tag `desktop-v*` | `.github/workflows/build-desktop.yml` |

## Pitfalls

- Neutralinojs binaries are gitignored (`desktop-app/bin/`). Run setup before first desktop build.
- macOS tray menu is intentionally disabled (upstream Neutralinojs bug #615).
- Security headers are set in both `vercel.json` and `Dockerfile` — keep them in sync when adding new CSP directives.
- Vite pre-bundles mermaid and dayjs to handle CommonJS interop — see `optimizeDeps` in `vite.config.js`.
