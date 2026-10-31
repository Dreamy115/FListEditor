# Markdown-first conversion

Markdown+ accepts Markdown and macros only. Raw `[b]`, `[img=123]`, `[noparse]`,
and other bracket expressions are literal text here. Standard Markdown links and
image syntax are parsed as Markdown, although external images trigger a warning.
Use BBCode mode for native tags. Decompilation emits Markdown/macros for supported
formatting rather than relying on raw BBCode in Markdown source.

Decompilation tries standard Markdown before extensions. Each local fallback
rewrite must compile back to exactly the same BBCode and significant whitespace.
One tightly packed construct does not force unrelated constructs to use macros.

| BBCode | Preferred source | Fallback when needed |
| --- | --- | --- |
| `[b]`, `[i]` | `**bold**`, `*italic*` | Inline/block macros for ambiguous nesting or multiline formatting |
| `[s]` | `~~strike~~` (GFM) | Macro for ambiguous or multiline content |
| `[heading][big]…` | `# …` | `:::heading` with size macro |
| `[heading]` | `## …` | `:::heading` |
| `[big]` | `{big\|…}` | `:::big` for multiline content |
| `[hr]` | `---` | `{hr}` for packed layouts |
| Line-leading `•` bullets | `-` list items | Literal/code contexts are left intact |
| Plain numbered items (`1.`, `2.`, etc.) | The same numbered items | Numbers are retained, never renumbered |
| `[quote]` | `> …`, including consecutive lines and nested `> > …` | `:::quote` for packed layouts |
| `[url=https://…]label` | `[label](https://…)` | Link macro for supported label/layout; otherwise literal text |
| `[url]https://…` | `<https://…>` | Literal text for unsupported URL content |
| `[img]https://…` | `![](https://…)` | Image macro; external images produce a warning |
| `[noparse]` | Inline backticks or fenced code | Literal macro or fenced code for delimiter collisions or whitespace constraints |
| `[u]`, `[color]`, `[small]`, `[sup]`, `[sub]` | `++underline++`, `{color:cyan|…}`, `{small|…}`, `{sup|…}`, `{sub|…}` | No standard Markdown equivalent |
| Alignment, indent, collapse | `:::` blocks | No standard Markdown equivalent |
| Numeric images, users, icons, eicons | Inline macros | No standard Markdown equivalent; numeric image labels are retained |

Consecutive `>` lines form a single quote. Use `>` on its own for an intentional
blank line inside the quote. The quote contents accept Markdown, including nested
quotes. Ordinary prose line breaks remain significant. Macro markers and divider
lines absorb their syntax boundary newlines, as documented in the main README.

Hash headings also absorb their editing boundary newlines. `## Title` followed
by `abcd` on the next source line exports as `[heading]Title[/heading]abcd`.
Use a blank line (two newlines) for one intentional BBCode break, including at
the end of the source. Decompilation uses the same rule to prefer hash notation
even when prose immediately follows the closing heading tag. Multiline heading
contents still require a block macro.

A backslash at the end of a Markdown+ line joins it to the next line with one
space. Backtick code, fenced code and the `{noparse|...}` macro preserve literal
content. Raw `[noparse]` in Markdown+ does not disable Markdown parsing.

Lists preserve leading spaces and tabs, whitespace after the marker, blank lines,
and continuation-line indentation. Nested bullet/numbered combinations are
supported, including inside quotes and layout macros. F-List has no native list
tags: export uses plain text bullets and numbers. Structural `[indent]` wrappers
remain `:::indent` so their visual indent is not silently replaced with spaces.

The toolbar follows these mappings too: Quote prefixes selected lines with `>`,
H1 inserts `#` (heading + big), H2 inserts `##` (heading), and A+ inserts `{big|…}` for single-line text or
`:::big` for multiline selections. Literal text uses backticks or fenced code where
possible. BBCode-mode H1 inserts the equivalent heading + big tags. Multiline
headings and formatting that have no supported standard form retain block macros.


## Literal brackets

`and he was [there]` compiles to
`and he was [noparse][there][/noparse]` and decompiles back to the original prose.
This also applies to supported tag names: `[b]text[/b]` in Markdown+ displays the
brackets literally. Use `**text**` or `{b|text}` to format that text.

Generated noparse wrappers are removed when the resulting Markdown recompiles
exactly. Explicit literal code may retain backticks, fences, or a literal macro
to keep its contents inactive. Literal closing `[/noparse]` text is split safely
in the output so it cannot terminate its own protection.

## Unicode fonts

| Macro argument | Style |
| --- | --- |
| `smallcaps` | Small capitals; uppercase and unsupported `x` remain unchanged |
| `bold` | Mathematical bold |
| `doublestruck` | Double-struck |
| `italic` | Mathematical italic |
| `bolditalic` | Mathematical bold italic |
| `sans` | Sans serif |
| `sansbold` | Bold sans serif |
| `fraktur` | Fraktur |
| `monospace` | Monospace |
| `fullwidth` | Fullwidth |

Single-line syntax: `{font:smallcaps|your text}`. Multiline syntax:

```text
:::font bold
first line
second line
:::
```

The toolbar selects this block form for multiline selections. Blocks compile
their Markdown contents and apply Unicode styling without emitting `[font]` tags.
Inline font macros cannot span source lines. Nesting font macros or blocks
produces a warning.

Decompilation recognizes mapped Unicode characters and reconstructs their font
macros. It greedily includes adjacent spaces and unchanged characters on the same line,
including uppercase letters and ordinary `x` beside small caps, only when the
exported Unicode stays identical. Trailing spaces and Unicode symbols remain
outside inline font macros; they may still bridge styled characters inside a run.
Characters that the font would change, different
styles, literal code and line boundaries stop this expansion. Multiline runs of one recognizable font use `:::font` blocks. A font
choice that leaves all characters unchanged cannot be inferred from BBCode.

## HTML character references

Markdown+ accepts the full HTML5 named-reference set, plus hexadecimal and decimal
numeric references. Names are case-sensitive and require a semicolon. Examples:

| Markdown reference | Exported text |
| --- | --- |
| `&mdash;` | An em dash |
| `&eacute;` | An accented lowercase e |
| `&copy;` | A copyright symbol |
| `&#x25C6;` or `&#9670;` | A diamond |
| `&Aopf;` | A double-struck capital A |
| `&NotEqualTilde;` | The defined two-character mathematical sequence |

Decompilation prefers font macros for recognized styled letters, ordinary Unicode
literals for readable text and symbols, and Markdown escapes for syntax. It uses
HTML escapes when needed for round-trip preservation: literal `&mdash;` in BBCode
becomes `&#x26;mdash;` in Markdown+ so recompiling preserves the entity spelling
rather than turning it into a dash. It does not remember which reference spelling
produced a character.

References work in prose and formatting macro bodies. Decoding happens once after
syntax parsing: encoded braces, brackets or emphasis markers do not become active
formatting. Backticks, fenced code and `{noparse|...}` preserve references literally.
Unknown names, invalid numeric code points, numeric control references and malformed
references remain unchanged. The named-reference table is bundled for offline use;
refresh it with `python scripts/build-entities.py` using Python's standard-library
HTML5 entity data.

### Source display preference

**Prefer literals** above the editor converts the active Markdown+ source in place.
Checking it decodes references where the compiled output can be preserved;
unchecking encodes non-ASCII prose as hexadecimal references. Literal code, macro
headers and link syntax remain intact. References required to protect syntax may
remain in literal mode. Source conversion is undoable. The checkbox is disabled
in BBCode mode, and its saved preference is applied when returning to Markdown+.
Named and numeric references use a dedicated warm red syntax highlight; literal code keeps its normal code highlighting.
