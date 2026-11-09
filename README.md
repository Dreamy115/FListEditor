# Folio — F-List Profile Studio

A browser-based character profile editor with Markdown+, BBCode conversion, live preview, formatting tools, templates, examples, and undo/redo. No package installation or build step is required to use it.

## Run and edit

Install **Node.js 22+**, then run:

```sh
npm ci
npm run build
npm test
```

Open `dist/Folio-Profile-Studio.html` directly in your browser. It contains all application scripts, CSS and bundled image assets. No Node.js installation is required to use the built file.

Edit application logic in the TypeScript modules under `src/`, starting at `src/main.ts`. The folders separate formatting/conversion, editor tools, character management, templates, preview controls, and application state/import/export. See [the source architecture and audit](docs/code-audit.md) for the module map and validation details. Edit the page structure in `index.html`, styles in `src/*.css`, and built-in prompts in `src/templates.ts`. The vendored renderer remains documented in `vendor/horizon/README.md`.

`index.html` is the development shell and loads the generated `build/app.js`; build after changing TypeScript. Do not edit the generated JavaScript. `npm run format` formats the TypeScript sources, and `npm run format:check` verifies their formatting.

Browser storage depends on the file location or origin. Use the editor’s backup/export controls when moving the standalone file or transferring drafts.

## Standalone build

New installations open with the welcome profile authored in `docs/feature-showcase.md`. After editing that file, run `npm run build` to refresh the standalone editor. `src/feature-showcase.ts` imports this Markdown directly; no generated source file is checked in. Existing saved characters are retained.

In VS Code, press **Ctrl+Shift+B** or run **Folio: Build**. After editing, rebuild and reopen or refresh `dist/Folio-Profile-Studio.html` directly in your browser. No preview server is required. These tasks need Node.js on your PATH and `npm ci` run once first.

Run `npm run build` (or `node --import tsx scripts/build.ts`). The result is `dist/Folio-Profile-Studio.html`, which embeds the CSS and JavaScript and can be opened directly. The build type-checks application code, build scripts, and TypeScript tests before bundling; build failures stop HTML generation. Make changes in the source files, then rebuild rather than editing the generated copy.

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
- Dash bullets compile to `–` and decompile back to `-`; plus bullets compile to `▪` and decompile back to `+`; star bullets compile to `•` and decompile back to `*`; numbered lists retain their numbers. Nested lists preserve spaces, tabs, blank lines, and continuation indentation, including inside quotes and layout macros.
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
- Click an image placeholder in the preview to attach a file or URL for its F-List ID. Click an already-mapped image to edit that mapping. These shortcuts also work with Enter or Space when focused and never change source text.
- The **Insert inline** toolbar button opens a picker with mapped image thumbnails and a custom ID field. Choosing an image inserts its ID in the current Markdown+/BBCode syntax and keeps selected text as its label. Cancel leaves the source unchanged.
- Mappings have an optional **Image alias** text field, corresponding to the right side of `{img:4455367|imagealias}`. Aliases appear in the mappings table and image picker, persist locally, and are used for new insertions when no text is selected. **Save alias** updates a mapping without replacing its image or rewriting existing source.
- **Image mappings** opens a menu to review, edit or remove all ID-to-image mappings. It lets you attach a local PNG/JPEG/GIF/WebP (up to 8 MB) or an HTTP(S) image URL to a numeric F-List image ID. Attachments persist in this browser, are shared across characters/templates, and can be replaced or removed. No login or F-List upload occurs; files stay local, while URL images contact their host. This is only a preview override: it does not verify the ID or change the real inline, and final F-List size, layout or content may differ. BBCode/Markdown keep the original ID. Local files are embedded in HTML and available to PNG capture; URL images remain remote and PNG inclusion requires host permission. Attachments are excluded from JSON backups and removed by **Purge data**.
- Export `.md` saves editable Markdown+ source. In BBCode mode it decompiles a copy for download without changing the draft or editor mode.
- **Export screenshot (.png)** below the preview controls saves the full character card, including its name, current appearance and text size, with all nested collapsibles expanded. Preview scroll and open/closed sections stay unchanged. Remote images require the image server to allow cross-origin access to appear in PNG exports.
- **Copy screenshot** copies the expanded card as a PNG image to the clipboard for pasting into other apps. Clipboard image access requires a supporting browser and permission; if unavailable, use the PNG download. **Export .html** saves a full-width page with embedded styles, selectable text, and working collapsible bars (mouse or Enter/Space). Sections start collapsed; responsive inside gutters grow to 160 px on wide screens and shrink to 12 px on narrow screens, without outer page margins or editor controls. Both preserve the current theme and text size without changing the preview. Remote profile images in HTML still require an internet connection.
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

The action-bar **Import** control loads one profile from source files or existing
single-profile backups; it is separate from full-app backups. Export all data before purging or moving
between browser origins. Unsaved template edits should be saved first.

## Package provenance

Run `npm ci` and `npm test` for a build, type checks, conversion and renderer regressions, startup/editor workflow parity, and standalone artifact validation. Tests and build scripts execute directly through the `tsx` runtime (`node --import tsx`), with no emitted test JavaScript. Run `npm run format:check` to check source formatting. The committed lockfile makes local and CI installations reproducible.

Refresh the offline HTML5 entity table in `src/formatting/named-references.json` with `npm run build:entities` when needed. Every build adapts the vendored renderer sources into ignored `build/horizon.ts`, type-checks them, and bundles `build/horizon-renderer.js`. `npm run build:renderer` only prepares that intermediate. The vendored files remain unchanged. All owned application JavaScript is generated under `build/` from `src/**/*.ts` and inlined into the standalone HTML.

Pull requests run formatting, build, and regression checks. Pushes to `main` run those same checks and deploy the resulting **single HTML file** to GitHub Pages.

The test commands discover the TypeScript test programs automatically:

| Command | Coverage |
| --- | --- |
| `npm test` | 23 DOM, conversion, state, and build/parity programs; includes the build |
| `npm run test:browser` | 11 Playwright browser programs; includes the build |
| `npm run test:all` | All 34 TypeScript test programs; includes the build |
| `npm run typecheck` | Strict application, test, and build-script checks (including unused code) without JavaScript output |

For browser checks, install Chromium once with `npx playwright install chromium` (on Linux, `npx playwright install --with-deps chromium` also installs system dependencies). Browser checks use Chromium by default; set `PLAYWRIGHT_CHANNEL=msedge` to use an installed Edge instead. The former visual fixture launchers also run through Playwright/TypeScript, including desktop, tablet, and mobile checks.

In VS Code, choose **Terminal → Run Task → Folio: Test all** or **Tasks: Run Test Task**. The default test task runs `npm run test:all`, reports failures, and uses the TypeScript problem matcher. To run one test directly after a build, use `node --import tsx tests/toolbar.ts`.

Source extracted from the latest supplied `Folio-Profile-Studio-2026-10-31.html`. The editor has since gained whitespace-aware conversion, local preview tasks, and a Horizon-based renderer.

## License and disclaimer

Folio is licensed under the [Mozilla Public License 2.0](LICENSE.md). Horizon-derived renderer files also use MPL-2.0, with upstream notices retained in `vendor/horizon`.

The software is provided "as is", without warranties of any kind, whether express, implied, or statutory, including warranties of merchantability, fitness for a particular purpose, and non-infringement. You assume the risks associated with its use, including loss of data. To the extent permitted by applicable law, contributors and distributors are not liable for damages or losses arising from use of the software. See Sections 6 and 7 of the license for the full disclaimer of warranty and limitation of liability, including applicable exceptions.
