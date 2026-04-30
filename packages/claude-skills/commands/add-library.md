Add a new CDN library to the Markdown Viewer. Library / purpose: $ARGUMENTS

## Rules

- All CDN tags live in `web/index.html`. Never npm-install runtime dependencies.
- **CSS `<link>` tags** go in `<head>` after the existing stylesheet links, before `<link rel="stylesheet" href="styles.css">`.
- **JS `<script>` tags** go in `<head>` with the other library scripts. Ordering constraints:
  - `dompurify` must load before any rendering library (marked, mermaid, etc.)
  - `highlight.js` must load before `script.js`
  - `bootstrap.bundle.min.js` is at the bottom of `<body>` — do not move it; it must stay last
- Use a pinned version URL from cdnjs.cloudflare.com or cdn.jsdelivr.net. Do not use `@latest`.
- After adding to `web/index.html`, add the same tags to `desktop-app/resources/index.html` if it exists, OR remind the user to run `npm run desktop:prepare` to regenerate the desktop resources.
- If the library exposes a global (e.g. `window.Prism`), note the global name so it can be used in `script.js`.

## Steps

1. Read `web/index.html` to see the current load order.
2. Identify the correct CDN URL and version for the requested library (use WebSearch if needed).
3. Insert the tag(s) in the right position following the constraints above.
4. Summarise: what was added, where, and what global it exposes (if any).
