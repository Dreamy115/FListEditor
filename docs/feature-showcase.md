:::center
# {color:cyan|Folio Feature Showcase}

{big|The Observatory of Small Wonders}
{small|A Markdown+ specimen and hands-on editor acceptance checklist.}
:::

Import this .md file or paste its contents into a blank character in Markdown+ mode. This document uses Folio's Markdown+ dialect; a generic Markdown viewer will not render the macros. The main specimen should report No obvious issues. Error samples near the end are literal until you copy them out of their code fences.

---

## 1. Headings and inline typography

# Level 1: heading plus large text

## Level 2: standard profile heading

### Level 3: same exported heading size

#### Level 4: same exported heading size

##### Level 5: same exported heading size

###### Level 6: same exported heading size

**Bold**, __alternate bold__, *italic*, _alternate italic_, ***bold italic***, ++underline++, and ~~strikethrough~~.
{b|Explicit bold}, {i|explicit italic}, {u|explicit underline}, {underline|underline alias}, and {s|explicit strike}.
{big|Large inline text}, {small|small inline text}, H{sub|2}O, and x{sup|2}.
{heading|An explicit inline heading}

Nested formatting: {color:purple|{b|Bright {i|ideas} with {u|depth}}}.
Bracket text stays literal in Markdown+: [b]not a bold tag[/b], [i]not an italic tag[/i], and [there]. Use **Markdown bold** or {color:cyan|a color macro} for formatting.

## 2. All twelve profile colors

{color:red|Red} / {color:orange|Orange} / {color:yellow|Yellow} / {color:green|Green}
{color:cyan|Cyan} / {color:purple|Purple} / {color:blue|Blue} / {color:pink|Pink}
{color:black|Black} / {color:brown|Brown} / {color:white|White} / {color:gray|Gray}
Switch profile appearances to inspect contrast, including black and white. Color names should survive BBCode export.

:::color cyan
Block color, first line.
Block color, second line with **bold emphasis**.
:::

## 3. Alignment, indentation, and block formatting

:::left
Left aligned: the western telescope.
:::

:::center
Centered: the central observatory.
:::

:::right
Right aligned: the eastern telescope.
:::

:::justify
Justified text needs enough words to wrap across several lines. Narrow the preview pane and watch this paragraph spread across the available width while the final line follows the renderer's normal justification behavior.
:::

:::indent
One structural indent.
:::indent
Two structural indents, with {small|a small annotation}.
:::
:::

:::big
Large multiline text.
Its second line stays large.
:::

:::small
Small multiline text.
Its second line stays small.
:::

:::b
Bold across two lines.
Still bold here.
:::

:::i
Italic across two lines.
Still italic here.
:::

:::u
Underline across two lines.
Still underlined here.
:::

:::s
Strike across two lines.
Still struck here.
:::

:::heading
A multiline heading
with {color:purple|a colored second line}
:::

## 4. Quotes and lists

> The first line of one quote.
> The second line stays in that quote.
>
> A blank line separates these thoughts.
> > A nested quote with **emphasis**.
> Back in the outer quote.

:::quote
An explicit quote block for layouts that need macro boundaries.
:::

- A dash bullet
* A star bullet
+ A plus bullet
  - A nested bullet
    3. A nested numbered item
    7. A deliberately nonconsecutive number
       A continuation line with preserved indentation.

1. The first numbered item
4. The fourth numbered item: numbers must not be rewritten.
   - A bullet inside a numbered item

> - A quoted bullet
>   - A nested quoted bullet

:::indent
- A list inside a structural indent
  2. A nested numbered observation
:::

## 5. Collapsible sections and deep nesting

:::collapse Field notes
Open this section, then edit an unrelated sentence. It should remain open and the preview should retain its scroll position.

:::center
:::color purple
{b|Nested {i|inline {u|formatting}}} inside nested blocks.
Place the source caret here to inspect the active section tint and matching markers.
:::
:::

:::collapse Instruments
- Brass telescope
- Weather notebook
:::collapse Calibration details
The innermost section has an independent open state.
:::
:::
:::

:::collapse Field notes
A second section with the same title tests occurrence-based view-state matching. Open only one of the two Field notes sections, edit elsewhere, and check that each keeps its own state.
:::

## 6. Links, images, characters, and icons

[A labeled HTTPS link](https://example.com)
[A formatted **link label**](https://example.com/observatory)
<https://example.com/autolink>
{link:https://example.com/macro|A macro link with {i|an italic label}}

Numeric images intentionally show placeholders without profile image metadata:
{img:12345|Labeled observatory portrait}
{image:12346|Image alias label}
{img:12347}

Character link: {user:Example Character}
Character avatar: {icon:Example Character}
Eicon: {eicon:smile}
These are sample names and URLs; remote assets may be unavailable or require a connection. A missing remote image does not indicate a conversion failure.

## 7. Literal content, escapes, and whitespace

Inline literal: `**not bold** {color:teal|not interpreted} [table]not a tag here[/table]`.
Explicit literal macro: {noparse|**also literal** {typo|not a warning here}}.

```text
**Literal bold markers**
{unknown|literal macro}
:::unknown
[table]literal unsupported BBCode[/table]
  Two leading spaces remain.

A blank line remains, too.
```

```text
Literal block: **literal** {unknown|literal}.
[noparse] is ordinary bracket text in Markdown+ mode.
```

Escaped syntax: \*asterisks\*, \_underscores\_, \{b|literal braces\}, \[b\]literal brackets\[/b\].

This is ordinary line one.
This is ordinary line two: it should start a new visible line.

This follows one blank source line.
This sentence is joined\
to its next source line with one space.
Before explicit break.{br}After explicit break.
Before inline divider.{hr}After inline divider.

Before a packed block boundary.
:::center
The block markers add no line breaks of their own.
:::
After the packed block boundary.

Before a spaced block boundary.

:::center

This has an intentional break inside each boundary.

:::

After the spaced block boundary.

Unicode: café, zażółć gęślą jaźń, 日本語, ★, →, 🌙.
A deliberately long line for wrapping and gutter alignment: the astronomer records every star, checks every instrument, labels every notebook, and leaves a careful trail of observations so the next reader can retrace the entire night without losing the source line number when the editor pane becomes narrow.

---

## 8. Editor and workflow acceptance checklist

These are manual checks; importing source cannot exercise application controls automatically. Use a disposable character and template for replacement checks.

1. Live preview: edit a word and verify the preview, word/character counts, and local save status update.
2. Formatting: select disposable text and try every toolbar formatting, H1/H2, center/right/justify alignment, Sup/Sub, quote, color, font, link, numeric image, collapse, and divider action. Test Ctrl+B, Ctrl+I, and Ctrl+U. Undo each insertion.
3. History: type, format, and switch modes; use Undo/Redo and Ctrl+Z, Ctrl+Y, or Ctrl+Shift+Z. Verify each action restores the expected source and mode.
4. Conversion: switch Markdown+ to BBCode and back. Compare rendered content, significant whitespace, nested blocks, literal text, numeric image labels, and list numbers. Equivalent source spelling may change.
5. Export: compare Copy BBCode with Export .bbcode. Export .md from both modes; exporting from BBCode should leave the current draft and mode unchanged. Import the downloaded Markdown into a disposable character.
6. Backup: export a backup, edit the disposable draft, and import the backup. Verify its name, source, and mode are restored. Reload to check local draft persistence.
7. Characters: create and rename a disposable character, switch between characters, and verify independent source, mode, cursor, and session undo history. Clone a character and edit the clone; verify the original stays unchanged. Exercise deletion with the disposable copy.
8. Templates: open a built-in template, then a custom template. Create New blank, save, rename, and resume through My templates or Manage templates. Create a template from a character. Verify saving the template does not modify that character.
9. Template application: apply displayed unsaved template edits to a disposable target and confirm replacement, including an empty target and targets in both source modes. Verify applying does not implicitly save the template. Use New from this template and verify it creates a separate character. Clone both a built-in and custom template and verify independent copies.
10. Editor isolation: switch between a character and an unsaved template; verify separate source, mode, cursor, history, preview scroll, and collapse states. Check the unsaved-template leave-page prompt using a disposable edit.
11. Cookbook: open Examples & macros, search for a feature, switch categories, and insert an example into disposable source. Undo the insertion.
12. Syntax: inspect Markdown, literal bracket text, nested inline macros, and block colors in Markdown+; inspect native tags in BBCode mode. Move the caret between nested sections; check the active full-width tint. Scroll and resize to check wrapped-line gutter alignment. Temporarily remove a closing marker to inspect unmatched-marker highlighting, then undo.
13. App appearance: try Folio, Graphite dark, Paper light, and Verdant in character and template editors. Check editor text, caret, gutter, syntax, and warnings; reload to verify the choice persists.
14. Profile appearance: try F-List Blue, Dark, Light, Midnight lilac, Light parchment, and Obsidian. Inspect all twelve colors, links, quotes, and collapses. Changing appearance should not change exported BBCode.
15. Preview size: try 1, 16, 16.5, and 200 pixels, then clear the field for Site default. Verify persistence after reload and unchanged exported BBCode.
16. Layout: drag the source/preview divider, focus it and use arrows, Shift+arrows, Home, and End; double-click to reset. Reload to check the saved split. Narrow the window to inspect stacked panes, toolbar access, and warning popup placement.
17. Preview state: open nested and duplicate-title sections above, edit elsewhere, rename a collapse title, and switch editors. Check open states and scroll retention. Make a source-only change that preserves compiled BBCode and check that preview state remains stable.
18. Preview note: dismiss the note and reload to verify its dismissal persists.

## 9. Opt-in diagnostic specimens

Copy ONE fenced specimen into active source, outside any literal block. Check the footer warning, its source line, wavy underline, and warning navigation. Hover the underline or place the caret there and press Alt+Enter or Ctrl+. Inspect guidance, apply a suggested fix when offered, and undo it. Escape should dismiss the popup. Remove the specimen before trying another. Some fixes require a manual edit.

Misspelled macro: expect a suggestion for bold.
```text
{bb|Fix this typo}
```

Invalid color: expect a supported-color suggestion; hex red should normalize to red on export.
```text
{color:#ff0000|Legacy red}
{color:teal|Unsupported named color}
{color:|Missing color value}
```

Malformed nested opener: expect the error at the malformed opener without a cascade of unmatched closers.
```text
:::center
:::right unexpected
Nested content
:::
:::
```

Malformed closing marker: expect a replacement with exactly three colons.
```text
:::center
Centered text
::::
```

Extra closing marker: expect a removal suggestion.
```text
:::
```

Unclosed constructs: test each line or block independently.
```text
{b|Missing closing brace
```
```text
:::center
Missing closing marker
```
In BBCode mode only:
```text
[b]Missing closing tag
```

Unsupported and misnested BBCode: paste these into **BBCode mode** to check supported formatting and tag order. In Markdown+ they are literal text.
```text
[table]Unsupported profile tag[/table]
[b][i]Wrong closing order[/b][/i]
[/u]
```

Invalid link and image arguments: expect inline macro warnings.
```text
{link:invalid|Missing HTTP URL}
{img:invalid}
{user:Example Character|Unexpected body}
```

Repeat the same bad macro on two separate lines and verify both warning locations are available. Repeat raw BBCode errors in BBCode mode to check native-mode diagnostics. Literal examples in this saved showcase should remain warning-free.

## 10. Unicode font verification

{font:smallcaps|ABCDabcd your text}
{font:bold|Bold 123}
{font:doublestruck|Lucas CHNPQRZ 123}
{font:italic|Italic h}
{font:bolditalic|Bold italic}
{font:sans|Sans serif 123}
{font:sansbold|Sans serif bold 123}
{font:fraktur|Fraktur CHIRZ}
{font:monospace|Monospace 123}
{font:fullwidth|Fullwidth 123}

:::font bold
first line
second line
:::

:::font smallcaps
your text
extra examples
:::

Plain boundaries: prefix{font:smallcaps|a}suffix and x{font:smallcaps|a}x.
Preserved middle characters: {font:smallcaps|aXXXb} and {font:italic|a 123 b}.
Different styles: {font:bold|First} {font:italic|Second}.
Literal Unicode: `ʏᴏᴜʀ ᴛᴇxᴛ` and `{font:bold|literal macro}`.

Switch to BBCode and back. The visible characters and whitespace should remain
identical. Only recognizable styled runs become font macros; unchanged interior
characters may join matching font runs. Multiline styled text should use font
blocks. Font choices that do not change the text cannot be recovered.

Intentional nested-font warning: copy this out of its fence to activate it.
```text
:::font bold
{font:italic|Nested font}
:::
```

External image warning: activate this specimen in Markdown+.
```text
![Portrait](https://example.com/portrait.png)
{img:https://example.com/portrait.png}
```

## 11. Full-app backup and purge checks

Use disposable local data for these checks. Save template edits first. Export all
data using the footer, change characters/templates and appearance settings, then
import the full-app JSON and confirm replacement. Verify all saved characters,
templates and settings return. The action-bar Backup is a single-profile backup
and is not a full-app import file.

Cancel Purge data first and verify nothing changes. After retaining a full-app
backup, confirm Purge data and verify characters/templates are cleared and
settings reset. Import the saved full-app backup to restore them. Undo history,
cursor positions, unsaved template edits and preview expansion state are not
included in a full-app backup.

## 12. HTML Unicode references

Named references: &mdash; &copy; &eacute; &NotEqualTilde;
Named styled letter: &Aopf;
Hexadecimal diamond: &#x25C6;
Decimal diamond: &#9670;
Star and arrow: &#x2605; &#x2192;
Supplementary-plane symbol: &#x1F600;
Formatted symbol: {color:purple|**&#x25C6;**}
Literal reference text: `&#x25C6;`.

Switch to BBCode to inspect the actual Unicode characters, then back to Markdown+
to check readable Unicode symbols and recovered font macros. The literal example must remain literal.

Toggle **Prefer literals** above the source editor. The references in this section
should switch to readable Unicode; uncheck it to show hexadecimal codes. Preview
and compiled BBCode should stay identical. Undo the source conversion. Code
examples and macro syntax must remain intact. Check entity highlighting against
each app appearance, including Paper, and reload to verify preference persistence.
