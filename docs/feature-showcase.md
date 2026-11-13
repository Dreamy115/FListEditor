:::center
# {color:cyan|Folio / Editor reference}
{small|Markdown+ · BBCode · Live preview · Local drafts · Export}
:::

**Source pane:** edit Markdown+ or BBCode. **Preview pane:** rendered output, updated as you type.
Select text to format it with the toolbar. Toolbar insertions use the current source mode. Expand a section below for syntax, controls, and behavior.
Text selections keep a visible caret at the active end while the source editor has focus, including after moving selected lines with Alt+Up / Alt+Down.

---

:::collapse 01 / Source modes & syntax
**Markdown+** accepts Markdown, inline macros, and block macros. **BBCode** edits native profile tags. Switching modes converts the current source in either direction and participates in undo/redo.

**Inline macro**
`{color:cyan|Text}` → {color:cyan|Text}
Macros can contain other formatting: `{color:purple|**Bold** and *italic*}` → {color:purple|**Bold** and *italic*}.

**Block macro**
```text

:::center
Centered text
:::

```
Open with three colons and a macro name; close with three colons. Blocks can contain Markdown, inline macros, and other blocks.

**Native BBCode**
```text

[b]Bold[/b]
[color=cyan]Colored text[/color]
[collapse=Section title]Section body[/collapse]

```
Enter these tags in **BBCode** mode. In Markdown+, square-bracket text is literal.

**Examples & macros:** open the cookbook, search or filter by category, then insert an example at the cursor. Insertions can be undone.
:::

:::collapse 02 / Text formatting & headings
**Bold** · *Italic* · ***Bold italic*** · ++Underline++ · ~~Strikethrough~~
{big|Large text} · {small|Small text} · x{sup|2} · H{sub|2}O

**Inline syntax**
```text

**Bold** or __Bold__ or {b|Bold}
*Italic* or _Italic_ or {i|Italic}
***Bold italic***
++Underline++ or {u|Underline} or {underline|Underline}
~~Strikethrough~~ or {s|Strikethrough}
{big|Large text} / {small|Small text}
x{sup|2} / H{sub|2}O

```

**Heading syntax**
`# Heading` → large heading; `## Heading` through `###### Heading` → standard heading.
Toolbar **H1 / H2** inserts the corresponding heading syntax.

# H1 output

## H2–H6 output

**Multiline formatting**
Use block names `b`, `i`, `u`, `s`, `big`, `small`, or `heading`.
```text

:::b
Bold line 1
Bold line 2
:::

```

:::b
Bold line 1
Bold line 2
:::

**Toolbar:** bold, italic, underline, strike, H1/H2, larger/smaller text, superscript, and subscript. Select text before clicking to wrap it. Bold, italic, underline, and strike toggle off when you select an already formatted span, including its markers or just its entire body. The same toggle behavior applies to keyboard shortcuts in both source modes. Bold and italic toggle independently: applying italic to bold text produces bold italic; toggling italic off keeps the bold.
:::

:::collapse 03 / Colors
**Color presets**
{color:red|red} · {color:orange|orange} · {color:yellow|yellow} · {color:green|green}
{color:cyan|cyan} · {color:blue|blue} · {color:purple|purple} · {color:pink|pink}
{color:black|black} · {color:brown|brown} · {color:white|white} · {color:gray|gray}

**Inline:** `{color:purple|Text}`
**Block:** open with `:::color purple`, close with `:::`.

:::color purple
Colored line 1
Colored line 2 with **bold** and ++underline++.
:::

The toolbar color picker applies a preset to the selection. **Profile appearance** changes the preview theme; exported color names remain the same.
:::

:::collapse 04 / Alignment, indentation, quotes & lists
**Alignment blocks:** `:::left`, `:::center`, `:::right`, `:::justify`. Close each with `:::`.
Nested alignment is supported; the innermost alignment takes precedence.
**Inline equivalents:** `{left|Text}`, `{center|Text}`, `{right|Text}`, `{justify|Text}`.

:::left
Left-aligned output
:::

:::center
Centered output
:::

:::right
Right-aligned output
:::

:::justify
Justified output distributes spacing across wrapped lines. Resize the preview pane to inspect alignment at different widths. The final line retains its normal spacing.
:::

**Indentation:** `:::indent` blocks can be nested.

:::indent
Indent level 1
:::indent
Indent level 2
:::
:::

**Quotes:** prefix consecutive source lines with `>`. Use `> >` for a nested quote. An explicit `:::quote` block is also available. Horizon appearances display quotes in an inset panel with a **QUOTE:** header and divider. Wrap a quote in `:::center` to center its header and content; inline colors remain available inside quotes.

> Quote line 1
> Quote line 2
>
> Separate paragraph within the quote.
> > Nested quote.

**Lists:** use `-`, `*`, `+`, or numbered prefixes. Indent nested items and continuation lines. Explicit list numbers are retained.

- Dash item
  - Nested item
* Star item
+ Plus item

1. Numbered item
4. Explicit number 4
   - Nested bullet
     Continuation line
:::

:::collapse 05 / Line breaks, spacing & dividers
Ordinary source newlines produce visible line breaks. Blank lines and leading indentation are preserved. Markdown compilation converts leading and trailing spaces on each BBCode line to non-breaking space characters, including nested list indentation. Switching back to Markdown restores ordinary editable spaces.
Block markers, heading boundaries, and standalone dividers absorb their adjacent source newline. Add a blank line beside a boundary for a visible break.

**Join source lines:** end a line with a backslash to join the next line with one space.
```text

Source line 1\
continues on line 2.

```

**Explicit break:** `{br}` → before{br}after
**Inline divider:** `{hr}`
**Standalone divider:** `---` on its own line, or use the toolbar divider button.

```text

Text before the block.

:::center
Centered text.
:::

Text after the block.

```
:::

:::collapse 06 / Collapsible sections & nesting
**Syntax**
```text

:::collapse Section title
Section content
:::

```
Click the preview header to expand or collapse. Nested sections have independent states. Sections can contain formatting, lists, quotes, images, and additional blocks.

Use inline font macros in section titles: `:::collapse {font:smallcaps|Section title}`. You can combine fonts with plain title text. Font macros in the body work as usual.
In the source pane, only font macros in titles highlight their delimiters and font names separately. Other macros and Markdown syntax remain plain title text.
Wrapping a section in `:::font bold` applies that font to its title and body, including nested sections.

Wrap a section in `:::center` to center its title. Use `:::left` inside the section to explicitly left-align its body. A nested section inside that left-aligned body also uses left alignment. In F-List preview themes, the centered section body retains side margins inside the panel.

:::center
:::collapse {font:smallcaps|Centered title}
:::left
This content is left-aligned inside the section margins.

:::collapse Left-aligned nested title
This nested section follows the left-aligned body.
:::
:::
:::
:::

:::collapse Level 1
{color:cyan|**Formatted content**}

:::collapse Level 2
Nested section content.

:::collapse Level 3
{small|Third-level section content.}
:::
:::
:::

Source edits retain the preview's scroll position and expanded sections, including nested sections. Keep the preview scrolled to the section you are checking while editing the source. Each character and template has its own preview state during the session.
:::

:::collapse 07 / Links, character references & images
**Links**
`[Link label](https://www.f-list.net/)` → [Link label](https://www.f-list.net/)
`<https://www.f-list.net/>` → <https://www.f-list.net/>
`{link:https://www.f-list.net/|Link label}` → {link:https://www.f-list.net/|Link label}
The link toolbar button inserts a labeled link.

**Reference syntax and insertion controls**
- `{user:Character Name}` — **@ Character link**
- `{icon:Character Name}` — **Avatar icon**
- `{eicon:smile}` — **Eicon**
- `{img:12345|Image alias}` — **Insert inline**
- `{image:12345|Image alias}` — alternate image macro spelling
- `{img:12345}` — image without a label

**Insert inline:** choose a mapped thumbnail or enter a numeric image ID. Selected text becomes the image label; otherwise a saved alias is used when available. Cancel leaves the source unchanged.

**Image mappings**
1. Enter the numeric image ID.
2. Attach a local PNG, JPEG, GIF, or WebP file (up to 8 MB), or attach an HTTP(S) image URL.
3. Enter an optional alias; **Save alias** updates it separately.
4. Use the mappings table to review, replace, or remove attachments.

Click an image or image placeholder in the preview to edit its mapping. Keyboard: focus the image and press **Enter / Space**.
Mappings persist locally and are shared across characters and templates. Mapping edits preserve source text and image IDs. Local files are embedded in HTML exports.
:::

:::collapse 08 / Unicode fonts, symbols & references
**Font picker:** applies a Unicode alphabet to selected text. Multiline selections use font blocks.

{font:smallcaps|Small caps} — `smallcaps`
{font:bold|Bold 123} — `bold`
{font:doublestruck|Double struck 123} — `doublestruck`
{font:italic|Italic} — `italic`
{font:bolditalic|Bold italic} — `bolditalic`
{font:sans|Sans serif 123} — `sans`
{font:sansbold|Sans bold 123} — `sansbold`
{font:fraktur|Fraktur} — `fraktur`
{font:monospace|Monospace 123} — `monospace`
{font:fullwidth|Fullwidth 123} — `fullwidth`

**Inline:** `{font:smallcaps|Text}`
The `smallcaps` font converts lowercase letters and preserves uppercase letters. Use `{font:smallcaps|subject documentation}` for an entirely small-cap title; `{font:smallcaps|SUBJECT DOCUMENTATION}` retains ordinary capitals.
**Multiline:**
```text

:::font smallcaps
Text line 1
Text line 2
:::

```
Font blocks accept Markdown and formatting macros. Mode conversion recovers recognized styled text as editable font macros.

**Symbol picker (Ω):** search by name, then click a symbol to insert it at the cursor.
✦ ◆ ♡ ☾ ☀ → ∞ Ω ♫ ⚜

**Unicode text:** café · zażółć gęślą jaźń · 日本語
**Named references:** `&mdash;` → &mdash; / `&copy;` → &copy;
**Hexadecimal:** `&#x25C6;` → &#x25C6;
**Decimal:** `&#9670;` → &#9670;
**Supplementary-plane:** `&#x1F319;` → &#x1F319;
References can be formatted: {color:purple|**&#x2726;**}.

**Prefer literals:** checked displays Unicode glyphs; unchecked displays hexadecimal references. Toggling converts Markdown+ source, preserves preview and compiled output, and can be undone. Code and macro syntax stay intact. Convertible glyphs have an outline; entity codes have distinct syntax highlighting. The preference persists locally.
:::

:::collapse 09 / Literal text & escapes
**Inline code:** backticks preserve syntax as text.
`**Not bold** {color:cyan|Not processed} [b]Literal tags[/b]`

**Backticks inside code:** use double-backtick delimiters.
``code containing ` a backtick``

**Literal macro:** `{noparse|**Literal text**}` → {noparse|**Literal text**}
**Escapes:** `\*text\*` → \*text\* / `\{text\}` → \{text\}

**Fenced code:** preserves line breaks, blank lines, indentation, and formatting syntax.
```text

**Literal bold markers**
{color:cyan|Literal macro}
  Indented line

After a blank line

```

Use a longer fence to include shorter fences:
````text

```
Text inside triple backticks.
```

````
:::

:::collapse 10 / Editor controls, documents & export
**Editing and diagnostics**
- Preview updates as you type; the footer shows word/character counts and local save status.
- Syntax highlighting distinguishes Markdown, inline macros, block macros, native BBCode, and literal content.
- The typing cursor tracks the insertion position in the highlighted source, including at wrapped row boundaries. Wrapped line numbers track source scrolling. The caret highlights its enclosing section and matching boundaries; unmatched markers are marked.
- Warnings identify source lines. Both source modes check formatting and literal text nested inside large text for F-List compatibility. Red warnings flag invalid markup or macros; yellow warnings flag F-List compatibility issues. Hover an underline or press **Alt+Enter / Ctrl+.** at the caret to open guidance and available fixes. **Escape** dismisses the popup. Fixes can be undone.
- **Undo / Redo** covers typing, toolbar actions, source-mode conversion, and Unicode-reference conversion.

**Keyboard shortcuts**
- **Ctrl+D:** select a complete color macro (or its entire body) to remove its outer color wrapper while preserving the text and nested formatting. This also works with color blocks and BBCode color tags, and can be undone. Otherwise, open a color picker at the caret, then press a displayed letter to apply immediately: **R** red, **O** orange, **Y** yellow, **G** green, **C** cyan, **B** blue, **P** purple, **I** pink, **K** black, **N** brown, **W** white, **A** gray. No Enter is needed. Click a color to apply it, or press **Escape** to cancel. The selection is wrapped, or selected placeholder text is inserted. Multiline selections use a color block; BBCode mode inserts native color tags.
- **Ctrl+B / Ctrl+I / Ctrl+U:** bold / italic / underline
- **Ctrl+Z:** undo
- **Shift+Alt+Up / Shift+Alt+Down:** duplicate the selected source lines above / below and keep the copied text selected. With no selection, duplicate the caret's line. A selection ending at the start of a line excludes that line. Copies work at document boundaries and support undo/redo.
- **Alt+Up / Alt+Down:** move the selected source lines up / down by one line, keeping the selection. With no selection, move the caret's line. A selection ending at the start of a line excludes that line. Moves stop at the document boundaries and can be undone.
- **Ctrl+Y / Ctrl+Shift+Z:** redo

**Layout and appearance**
- Drag the source/preview divider. With divider focus: arrows resize; **Shift+arrows** use larger steps; **Home / End** set limits; double-click resets. Narrow windows stack the panes.
- **App appearance:** Folio, Graphite dark, Paper light, Verdant. This changes the controls and source editor together. Graphite, Paper, and Verdant use theme-specific source color highlights that stay readable when you change the profile appearance; exported color names remain unchanged.
- **Profile appearance:** groups ordered as F-List site schemes (Default Blue, Dark, Light), Horizon appearances (Default, Moon Prism, Light, Dark), then Folio appearances (Midnight, Parchment, Classified, Custom CSS).
- **Folio Midnight:** sci-fi display with a grid backdrop, illuminated rails, angular transmission quotes, instrument panels, and plus/minus controls. **Folio Parchment:** fantasy spellbook with a leather binding, gold double frames, jewel-green section headers, illuminated quotes, and diamond controls. **Folio Classified:** archival case file with a stamped cover, typewriter base font, dashed evidence quotes, square dossier sections, and checkbox indicators. Folio themes adapt all 12 named text colors for contrast, including gray, black, and white; light content areas use darker inks and dark section headers use lighter inks. Folio palettes use saturated accents: vivid inks on Parchment and Classified paper, and bright colors on dark panels and section headers. Midnight renders purple as magenta. BBCode exports keep the original color names. Folio themes preserve authored casing and Unicode font glyphs without applying small caps or extra letter spacing to profile headings and section titles.
- **Custom CSS dropdown:** hover or focus the label for a hint about standalone sheets and screenshot/interactive HTML exports. Open it for **Load CSS**, **Example CSS**, and **Clear CSS**. Press **Escape** or click outside to close. **Example CSS** downloads the selected Folio theme as a commented `.css` sheet; other selections download Midnight. Edit its palette, typography, header, quotes, links, and section rules, then choose **Load CSS** to apply it as **Custom CSS**. Files must end in `.css` and be at most 200 KB. Loading another sheet replaces the saved custom sheet. Switch appearances to compare; **Clear CSS** removes the saved sheet and returns an active custom appearance to Midnight.
- Custom CSS is scoped to the preview card. Use `.previewpage` for the root, `.char-header` for the header, and `.description` for rendered content. Flat selectors, `@media`, and `@supports` are supported; imports, font-face, keyframes, and nested selectors are omitted. Use absolute HTTPS or embedded data URLs for assets. CSS applies to screenshot and HTML exports; BBCode retains its formatting tags and color names. The custom sheet and filename persist locally and are included in full-app backups.
- **Text size:** 1–200 px, including decimals. Clear the field for **Site default**.
- Appearance, size, pane split, and preview-note dismissal persist locally. Preview settings do not alter exported BBCode.

**Characters**
- Type in **Search characters** to filter names as you type (case-insensitive). Clear the search or press **Escape** to show all characters again. Searching preserves the open editor and saved order; **Alt+Up / Alt+Down** reorders among matching entries.
- Drag entries in **My characters** above or below another entry to rearrange them. The order saves locally and is included in full-app backups. With a character entry focused, **Alt+Up / Alt+Down** moves it one position.
- **New character:** creates a blank document. Edit the header field to rename it. The number of saved characters is limited by available browser local storage.
- Click a sidebar entry to switch documents. Each retains its source, mode, cursor, session undo history, preview scroll, and section states.
- **Clone:** duplicates the current character or template, including current edits, and opens an independent copy with a unique name.
- **Delete:** removes the current character after confirmation.

**Templates**
- Built-in templates: Dossier, Narrative, Compact, Archive. Click one to open its template editor.
- **My templates / Manage templates:** open saved custom templates.
- **New blank:** starts an empty template. **New template from → Create template:** copies the selected character into a template.
- **Save template:** saves the template independently of characters. Custom templates can be renamed, cloned, and deleted.
- **New from this template:** creates a separate character from the displayed template contents and mode.
- **Apply template to → Apply:** replaces the selected character after confirmation, respecting its source mode. Uses displayed edits without implicitly saving the template.
- Unsaved template edits remain available while switching editors. Leaving the page prompts when template edits are unsaved.

**Copy and file export**
- **Copy BBCode:** copies compiled output to the clipboard.
- **Export .bbcode:** downloads profile code.
- **Export .md:** downloads editable Markdown+ from either mode, preserving the active document and mode.
- **Import:** opens `.md`, `.bbcode`, `.txt`, and single-profile JSON backups.
- **Export screenshot (.png):** downloads the full card, including its name, current appearance, and text size; all nested sections are expanded for capture.
- **Copy screenshot:** copies the expanded card as a PNG image to the clipboard. Allow clipboard access when your browser asks. If copying is blocked, a permission popup offers **Retry copy**, **Export screenshot (.png)**, and **Cancel**. Allow **Clipboard** in browser site permissions before retrying; retry copies the captured image.
- **Export .html:** downloads a responsive page with embedded styles, selectable text, and interactive sections. Sections start collapsed; click or press **Enter / Space** to toggle them.
- Screenshot capture preserves the current preview scroll and expansion state. PNG export and copy include the capture library in both the hosted app and standalone build.

**Local storage and backups**
- The sidebar’s **Local storage** progress bar shows used space and remaining space in KB (1 KB = 1,024 bytes; a measured UTF-16 estimate). The bar follows the app theme. Click it to remeasure. Images use separate storage. Creating or cloning a character requires a successful browser save; failed saves preserve existing saved data. Export your work if storage becomes full or unavailable.
- Character drafts save automatically in this browser. Template edits are saved with **Save template**.
- **Export all data:** downloads saved characters, custom templates, active character, and persisted settings as full-app JSON.
- **Import all data:** validates a full-app backup and confirms replacement of local data.
- Full-app backups contain saved document data and settings. Session undo history, cursors, preview state, unsaved template edits, and image attachments are separate; retain image files alongside backups.
- **Purge data:** confirms deletion of local characters, templates, settings, and image attachments, then resets the app.
:::
