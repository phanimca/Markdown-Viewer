Sync web/ changes to the desktop app resources and verify the result.

## What this does

`desktop-app/prepare.js` copies `web/` into `desktop-app/resources/` and injects the Neutralinojs SDK `<script>` tag into the copied `index.html`. The `resources/` directory is the only thing the Neutralinojs runtime reads — it does NOT read `web/` directly.

**Never edit `desktop-app/resources/` by hand.** All changes must go in `web/` first.

## Steps

1. Run the prepare script:
   ```
   npm run desktop:prepare
   ```
2. Confirm the key files were updated by checking modification times:
   ```
   git diff --stat desktop-app/resources/
   ```
3. Report which files changed. If nothing changed, note that the resources were already up to date.
4. Remind the user they can now run `npm run desktop:dev` to test the desktop build.
