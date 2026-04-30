Implement the following new feature in the Markdown Viewer: $ARGUMENTS

## Rules to follow

1. **All logic goes in `web/script.js`** inside the existing `DOMContentLoaded` closure. No new files, no modules, no global variables.
2. **If a UI element is needed**, add it to both:
   - The desktop/tablet toolbar in `web/index.html` (`.toolbar` div and/or `.view-mode-group`)
   - The mobile menu panel (`#mobile-menu-panel`) so mobile users get the same feature
3. **DOM references** belong at the top of the closure with the other `const` declarations (lines ~13–70 of script.js).
4. **Do not npm-install libraries.** If a library is needed, load it from CDN via a `<script>` tag in `web/index.html` — add it before `bootstrap.bundle.min.js` at the bottom. Keep DOMPurify loaded before any rendering script.
5. **Debounce** any handler that fires on every keystroke or scroll event. Use `RENDER_DELAY` (100 ms) for render-related debounce and `SCROLL_SYNC_DELAY` (10 ms) for scroll.
6. After implementing, remind the user to run `npm run desktop:prepare` if they want to test on the desktop app.

## Steps

1. Read `web/script.js` (full file) to understand existing patterns and find the right insertion point.
2. Read the relevant section of `web/index.html` if UI changes are needed.
3. Implement the feature following the rules above.
4. Show a brief summary of what changed and where.
