Create a new desktop release. Version argument: $ARGUMENTS

## CalVer format

Desktop releases use `YYYY.M.P` (no zero-padding on month or patch). Examples: `2026.4.0`, `2026.4.1`, `2026.10.0`.

The git tag must be prefixed: `desktop-v2026.4.0`.

## Steps

1. **Validate the version** in `$ARGUMENTS`. If it doesn't match `YYYY.M.P` (digits only, no leading zeros on M or P, year ≥ 2024), stop and tell the user the correct format.

2. **Check working tree is clean**: run `git status`. If there are uncommitted changes, warn the user and ask whether to proceed.

3. **Check the tag doesn't already exist**: run `git tag -l desktop-v$VERSION`. If it exists, stop.

4. **Create the annotated tag**:
   ```
   git tag -a desktop-v$VERSION -m "Desktop release $VERSION"
   ```

5. **Show the user the exact push command** to trigger the GitHub Actions release workflow — do NOT push automatically:
   ```
   git push origin desktop-v$VERSION
   ```
   Explain that the `.github/workflows/desktop-build.yml` workflow runs on `desktop-v*` tag pushes and produces Windows `.exe`, Linux, and macOS `.tar.gz` artifacts as a GitHub Release.

6. Ask the user to confirm before you run the `git tag` command.
