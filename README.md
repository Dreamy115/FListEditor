# Folio — F-List Profile Studio

A browser-based character profile editor with Markdown+, BBCode conversion, live preview, formatting tools, templates, examples, and undo/redo. No package installation or build step is required to use it.

## Run and edit

Open `index.html` in a browser. Edit the HTML in `index.html`, styling in `src/styles.css`, and application logic, templates, and examples in `src/app.js`. The preview also uses the vendored Horizon renderer; its sources, adapter, and notices are documented in `vendor/horizon/README.md`.

For a local server, run `python -m http.server 8000` from this directory and visit http://localhost:8000. Use `python3` instead of `python` if required on your system. Browser storage is specific to the origin: drafts saved in the previous standalone editor may not appear here. Use the editor's backup/export controls to transfer them.

## Standalone build

In VS Code, press **Ctrl+Shift+B** to build. Use **Terminal → Run Task → Folio: Build and open locally** to build, start a localhost server, and open the standalone editor in your default browser. Stop the preview with **Terminal → Terminate Task**. After edits, build again and refresh the browser.

These tasks require `python` on your PATH. You can also run `python serve.py --open` after building; use `--port 8001` to choose another port (default: 8000).

Run `python build.py`. The result is `dist/Folio-Profile-Studio.html`, which embeds the CSS and JavaScript and can be opened directly. An already built copy is included. Make changes in the source files, then rebuild rather than editing the generated copy.

## Start a repository

From the extracted project directory:

```sh
git init
git add .
git commit -m "Initial Folio source"
git branch -M main
```

Create an empty remote repository and follow its instructions for adding the remote and pushing. No repository, remote, or hosting configuration is included in this ZIP.

## Features and practical limits

- Markdown+ compiles to F-List BBCode; switching back decompiles recognized formatting.
- Decompilation prefers `#`, `##`, and `###` over heading/size macros wherever recompiling preserves the exact BBCode and whitespace. Headings that require explicit macros do not affect that preference elsewhere in the profile.
- Every exported newline is a visible F-List line break. Markdown+ preserves content line breaks, blank lines, and indentation; block macro markers and code fences add no extra breaks around their contents.
- Block macro lines (`:::center`, `:::color white`, and closing `:::`) absorb their adjacent source newline. Add a blank line next to a marker (two newlines) for one visible break. Decompilation uses this layout without inserting `{br}` or backslashes for ordinary profile spacing. For optional wrapping of ordinary prose, a trailing backslash still suppresses a newline; `{br}` remains available for an explicit break. Literal code/noparse content keeps its own whitespace.
- Nested formatting, inline macros, collapsible sections, templates, and examples.
- Multiline emphasis decompiles to `:::i`, `:::b`, `:::u`, or `:::s` blocks, preserving internal line breaks without raw BBCode wrappers.
- Source syntax highlighting distinguishes Markdown, macros, BBCode tags, and literal text while retaining native textarea editing and undo/redo.
- Headings compile as `# Title` ? `[heading][big]Title[/big][/heading]`, `## Title` ? `[heading]Title[/heading]`, and `### Title` ? `[big]Title[/big]`. `{heading|Title}` and multiline `:::heading` blocks retain ordinary heading tags. Levels 4?6 also retain ordinary heading tags. Dividers (`---`) absorb adjacent source newlines like block markers; add a blank line for a visible break. Use `{img:12345|image label}` to preserve a numeric image's label during conversion.
- Toolbar actions and keyboard formatting shortcuts insert Markdown/macros in Markdown+ mode and native tags in BBCode mode. Actions and mode changes participate in undo/redo.
- Profile colors use the 12 F-List presets: red, orange, yellow, green, cyan, purple, blue, pink, black, brown, white, gray.
- Preview text size is editable from 1?200 px, including decimal sizes (16 px by default), with preset suggestions, with a Site default option for the original theme sizing. The preference is saved locally and does not affect exported BBCode.
- Drafts use browser-local storage; back up important profiles.
- Export `.md` saves editable Markdown+ source. In BBCode mode it decompiles a copy for download without changing the draft or editor mode.
- Preview uses Horizon's parser and standard profile tags through a browser adapter. Styling is adapted to Folio; numeric inline-image IDs use placeholders without profile API metadata.
- Preview appearance includes F-List Blue, Dark, and Light palettes, with site BBCode colors, text shadows, links, and panel colors. Blue is the default for new installations; saved choices and the three Folio appearances remain available. See `docs/preview-themes.md` for sources and limits.
- Avatar/eicon previews and linked external images may require an internet connection. The editor does not log in to F-List or update profiles directly.

## Package provenance

Run `node tests/whitespace.cjs` to check conversion. Run `npm ci` then `npm test` for conversion and renderer DOM checks. Regenerate the checked-in renderer with `npm run build:renderer` after editing its adapter or vendored sources; ordinary `python build.py` builds need no npm installation.

Source extracted from the latest supplied `Folio-Profile-Studio-2026-10-31.html`. The editor has since gained whitespace-aware conversion, local preview tasks, and a Horizon-based renderer.

Horizon-derived renderer files use MPL-2.0, with upstream notices retained in `vendor/horizon`. No license has been selected for the remaining Folio application code.
