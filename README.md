# Folio — F-List Profile Studio

A browser-based character profile editor with Markdown+, BBCode conversion, live preview, formatting tools, templates, examples, and undo/redo. No package installation or build step is required to use it.

## Run and edit

Open `index.html` in a browser. Edit the HTML in `index.html`, styling in `src/styles.css`, and application logic and formatting examples in `src/app.js`, and built-in profile prompts in `src/templates.js`. The preview also uses the vendored Horizon renderer; its sources, adapter, and notices are documented in `vendor/horizon/README.md`.

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
- Decompilation prefers `#` and `##` over heading macros wherever recompiling preserves the exact BBCode and whitespace. Standalone `[big]` text uses the explicit `{big|…}` macro because Markdown headings represent actual headings.
- Heading source newlines are editing boundaries and do not add BBCode breaks before or after the heading. Add a blank line for an intentional break. Packed headings followed immediately by prose decompile to hash notation using these same rules.
- Standard Markdown is preferred for quotes (`>`), links/autolinks, and literal code. Consecutive `>` lines form one quote, with nested quotes supported. See `docs/conversion-maps.md` for the full mapping and fallback rules.
- BBCode text bullets decompile into `-` lists; numbered lists retain their numbers. Nested lists preserve spaces, tabs, blank lines, and continuation indentation, including inside quotes and layout macros.
- Every exported newline is a visible F-List line break. Markdown+ preserves content line breaks, blank lines, and indentation; block macro markers and code fences add no extra breaks around their contents.
- Block macro lines (`:::center`, `:::color white`, and closing `:::`) absorb their adjacent source newline. Add a blank line next to a marker (two newlines) for one visible break. Decompilation uses this layout without inserting `{br}` or backslashes for ordinary profile spacing. A backslash at the end of a line joins it to the next with one space (`ab` + backslash + newline + `cd` becomes `ab cd`); `{br}` inserts an explicit break. Literal code/noparse content keeps its own whitespace.
- Nested formatting, inline macros, collapsible sections, templates, and examples.
- Character and template names switch between independent editors, retaining each editor's text, mode, cursor, and undo history during the session. Built-in template clicks also open a template editor. Use **My templates** or **Manage templates** to resume template editing, **New blank** to create another template, or choose a character under **New template from** and click **Create template** to make a copy. **Save template** only saves the template; it never changes a character. Choose a character in **Apply template to**, then click **Apply** to confirm replacing that character (including an empty one), respecting its source mode. **New from this template** creates a separate character using the displayed template contents and mode, without replacing any existing character. Applying uses the displayed template contents without implicitly saving them. Custom templates are saved locally; unsaved template editors remain available while switching and prompt before leaving the page.
- **Clone** in the editor header duplicates the current character or template, including current edits. Open a character, custom template, or built-in first, then use the header Clone button. Copies get unique names, independent editors/history, and are saved and opened immediately; originals remain unchanged.
- Multiline emphasis decompiles to `:::i`, `:::b`, `:::u`, or `:::s` blocks, preserving internal line breaks without raw BBCode wrappers.
- Source syntax highlighting distinguishes Markdown, macros, and literal text in Markdown+ mode, and native tags in BBCode mode while retaining native textarea editing and undo/redo.
- **App appearance**, at the top right of the preview header, selects Folio (the original/default style), Graphite dark, Paper light, or Verdant (an alternate green-and-gold style with gold/teal syntax). Each preset themes the full application and its editor surface, gutter, caret, and syntax/depth colors. The browser remembers this choice independently of profile appearance, and it applies to both character and template editors.
- Source line numbers follow wrapped lines and scrolling. Block (`:::`) and inline (`{}`) macros use different palettes; a continuous full-width background tint spans the lines of the innermost matching section under the caret, while dotted unmatched markers help navigate deeply nested formatting.
- Drag the divider between source and preview to resize the panes. Focus it and use arrow keys (Shift for larger steps), Home/End for limits, or double-click to reset. The split is saved locally; narrow screens stack the panes. The preview note can be dismissed, and its dismissal is also saved locally.
- Headings compile as `# Title` -> `[heading][big]Title[/big][/heading]`; levels 2-6 compile to `[heading]Title[/heading]`. Use `{big|Title}` for large inline text and `:::big` for multiline large text. Dividers (`---`) absorb adjacent source newlines like block markers; add a blank line for a visible break. Use `{img:12345|image label}` to preserve a numeric image's label during conversion.
- The toolbar provides H1/H2, center/right/justify alignment, Sup/Sub, color and font pickers, and one divider button. Toolbar actions and keyboard formatting shortcuts insert Markdown/macros in Markdown+ mode and native tags in BBCode mode. Actions and mode changes participate in undo/redo.
- Profile colors use the 12 F-List presets: red, orange, yellow, green, cyan, purple, blue, pink, black, brown, white, gray.
- Preview text size is editable from 1-200 px, including decimal sizes (Site default for new installations), with preset suggestions, with a Site default option for theme sizing. The preference is saved locally and does not affect exported BBCode.
- Drafts use browser-local storage; back up important profiles.
- Export `.md` saves editable Markdown+ source. In BBCode mode it decompiles a copy for download without changing the draft or editor mode.
- Preview uses Horizon's parser and standard profile tags through a browser adapter. Styling is adapted to Folio; numeric inline-image IDs use placeholders without profile API metadata.
- Live edits retain preview scrolling and expanded/collapsed sections. View state is kept separately for character and template editors during the session; previews with unchanged compiled code are reused. Sections are matched by title, nesting, and occurrence, with a positional fallback for renamed headers.
- Preview appearance includes F-List Default (Blue), Dark, and Light, with site BBCode colors, text shadows, links, panel colors, and legacy profile layout. The Folio appearance group provides Horizon Default, Light, Dark, and Moon Prism, using Horizon character-viewer typography and card layout. Blue is the default for new installations; saved choices and the three Horizon-style Folio appearances remain available. See `docs/preview-themes.md` for sources and limits.
- Avatar/eicon previews may require an internet connection. External image URLs are unsupported by F-List and produce warnings; use uploaded numeric image IDs. The editor does not log in to F-List or update profiles directly.

## Source modes and Unicode fonts

Markdown+ accepts Markdown and macros only. Square-bracket text, including
`[b]`, `[color=purple]` and `[noparse]`, is literal text in this mode. Standard
Markdown links still work. Use BBCode mode to edit native tags; use backticks,
`{noparse|text}`, or fenced code blocks for literal Markdown examples.

For example, `and he was [there]` exports as
`and he was [noparse][there][/noparse]`. Decompilation removes the generated
wrapper and restores the literal bracket expression.

The **Font** dropdown applies Unicode alphabets, rather than unsupported F-List
font tags. Available macro names are `smallcaps`, `bold`, `doublestruck`, `italic`,
`bolditalic`, `sans`, `sansbold`, `fraktur`, `monospace`, and `fullwidth`.
Use `{font:doublestruck|Lucas}` for a single line. For multiple lines:

```text
:::font bold
first line
second line
:::
```

Multiline selections in the Font dropdown use blocks automatically. Inline font
macros must stay on one line. Font blocks accept Markdown and other formatting
macros. Nesting fonts, including an inline font inside a font block, produces a
warning. Font block boundaries follow the same newline rules as other blocks.

Decompilation wraps recognized styled characters in font macros. Adjacent unchanged characters on the same line are greedily included only if
applying that font leaves them unchanged. For example, small-cap `x` stays ordinary `x`, but
`{font:smallcaps|your text}` can still return as one editable macro. Characters that the font would change stay outside, and this greedy expansion
does not cross line breaks. Font choices that change no characters
cannot be recovered from exported text. Recognizable multiline runs use font
blocks; literal code does not become active font macros.

HTML5 named and numeric Unicode references work in Markdown+: `&mdash;` exports
an em dash, while `&#x25C6;` or `&#9670;` exports a diamond. Decompilation prefers
font macros and readable Unicode literals rather than escaping every symbol.
Entity-looking literal text is escaped when necessary to preserve a round trip.
Code keeps references unchanged; see [conversion rules](docs/conversion-maps.md).
The **Prefer literals** checkbox above the source editor converts the current
Markdown+ source immediately: checked uses Unicode characters, unchecked uses
hexadecimal references. It preserves compiled output, macro syntax, links, and
literal code. Conversion participates in undo/redo. The choice is saved locally,
included in full-app backups, and used when switching back from BBCode. Entity
codes have a distinct warm red highlight, with a darker
shade in the Paper theme. In literal mode, convertible Unicode glyphs have a subtle
warm red outline so you can see what toggling to codes will change. Literal code
and syntax are excluded.


## Backups and local data

The bottom-left footer provides **Export all data**, **Import all data**, and
**Purge data**. A full-app JSON backup includes all saved characters, custom
templates, the active character, and persisted appearance/layout settings. It
does not include unsaved template edits or session-only undo/cursor/preview state.
Import validates the full-app format and asks before replacing the current data.
Purge asks before deleting local app data and resetting settings.

The action-bar **Backup** and **Import** controls operate on one profile; they
are separate from full-app backups. Export all data before purging or moving
between browser origins. Unsaved template edits should be saved first.

## Package provenance

Run `node tests/whitespace.cjs` to check conversion. Refresh the bundled offline HTML5 entity table with `python scripts/build-entities.py` when needed. Run `npm ci` then `npm test` for conversion and renderer DOM checks. Regenerate the checked-in renderer with `npm run build:renderer` after editing its adapter or vendored sources; ordinary `python build.py` builds need no npm installation.

On Windows with Microsoft Edge installed, run `python tests/check_template_editor.py` for the full template editing lifecycle at desktop, tablet, and mobile widths.

Source extracted from the latest supplied `Folio-Profile-Studio-2026-10-31.html`. The editor has since gained whitespace-aware conversion, local preview tasks, and a Horizon-based renderer.

## License and disclaimer

Folio is licensed under the [Mozilla Public License 2.0](LICENSE.md). Horizon-derived renderer files also use MPL-2.0, with upstream notices retained in `vendor/horizon`.

The software is provided "as is", without warranties of any kind, whether express, implied, or statutory, including warranties of merchantability, fitness for a particular purpose, and non-infringement. You assume the risks associated with its use, including loss of data. To the extent permitted by applicable law, contributors and distributors are not liable for damages or losses arising from use of the software. See Sections 6 and 7 of the license for the full disclaimer of warranty and limitation of liability, including applicable exceptions.
