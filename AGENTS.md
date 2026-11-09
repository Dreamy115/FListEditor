# Keep the editor showcase current

Whenever editor functionality changes in any way—added, changed, or removed—update `docs/feature-showcase.md` in the same change. This includes formatting syntax, controls, shortcuts, preview behavior, templates, import/export, persistence, and settings. Treat the showcase update as part of completing the functionality change.

Don't however include minutia or inconsequential changes in the user-facing document.

The showcase is the body of the first character shown to new users. Keep it a complete, technical editor usage reference with direct instructions, syntax examples, and rendered demonstrations. Avoid character-creation advice, promotional prose, and demonstrations of F-List shortcomings or workarounds. Remove obsolete examples when functionality is removed.

Fenced code examples need leading and trailing blank lines inside the fence boundaries when visible spacing is intended in the preview.

After editing the showcase, run `npm run build` to rebuild the standalone app. The TypeScript source `src/feature-showcase.ts` imports the Markdown directly; generated JavaScript belongs only in `build/`. Run `node --import tsx tests/bbcode-audit.ts` after building to verify the showcase renders without warnings, matches the bundled asset, and remains the initial character body while preserving existing saved characters.
