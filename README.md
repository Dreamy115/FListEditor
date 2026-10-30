# Folio — F-List Profile Studio

A browser-based character profile editor with Markdown+, BBCode conversion, live preview, formatting tools, templates, examples, and undo/redo. No package installation or build step is required to use it.

## Run and edit

Open `index.html` in a browser. Edit the HTML in `index.html`, styling in `src/styles.css`, and application logic, templates, and examples in `src/app.js`. These are all the application source files; there are no bundled dependencies or source maps.

For a local server, run `python -m http.server 8000` from this directory and visit http://localhost:8000. Use `python3` instead of `python` if required on your system. Browser storage is specific to the origin: drafts saved in the previous standalone editor may not appear here. Use the editor's backup/export controls to transfer them.

## Standalone build

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
- Nested formatting, inline macros, collapsible sections, templates, and examples.
- Toolbar actions and mode changes participate in undo/redo.
- Profile colors use the 12 F-List presets: red, orange, yellow, green, cyan, purple, blue, pink, black, brown, white, gray.
- Drafts use browser-local storage; back up important profiles.
- Preview approximates F-List rendering. Numeric inline-image IDs use placeholders.
- Avatar/eicon previews and linked external images may require an internet connection. The editor does not log in to F-List or update profiles directly.

## Package provenance

Source extracted from the latest supplied `Folio-Profile-Studio-2026-10-31.html`. The included standalone build reproduces that file byte for byte. This packaging separates the existing source without redesigning application behavior.

No open-source license has been selected for this project. Choose one before distributing it under open-source terms.
