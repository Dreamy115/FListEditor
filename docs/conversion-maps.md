# Markdown-first conversion

Decompilation tries standard Markdown before extensions. Each local fallback
rewrite must compile back to exactly the same BBCode and significant whitespace.
One tightly packed construct does not force unrelated constructs to use macros.

| BBCode | Preferred source | Fallback when needed |
| --- | --- | --- |
| `[b]`, `[i]` | `**bold**`, `*italic*` | Inline/block macros for ambiguous nesting or multiline formatting |
| `[s]` | `~~strike~~` (GFM) | Macro for ambiguous or multiline content |
| `[heading][big]…` | `# …` | `:::heading` with size macro |
| `[heading]` | `## …` | `:::heading` |
| `[big]` | `### …` on its own line | `{big\|…}` or `:::big` |
| `[hr]` | `---` | Raw tag only for layouts that cannot be preserved |
| `[quote]` | `> …`, including consecutive lines and nested `> > …` | `:::quote` for packed layouts |
| `[url=https://…]label` | `[label](https://…)` | Link macro or raw BBCode for unsupported label/layout |
| `[url]https://…` | `<https://…>` | Raw BBCode for unsupported URL content |
| `[img]https://…` | `![](https://…)` | Image macro/raw BBCode for URLs not representable by the supported Markdown syntax |
| `[noparse]` | Inline backticks or fenced code | Literal macro/raw BBCode for delimiter collisions or whitespace constraints |
| `[u]`, `[color]`, `[small]`, `[sup]`, `[sub]` | Markdown+ macros | No standard Markdown equivalent |
| Alignment, indent, collapse | `:::` blocks | No standard Markdown equivalent |
| Numeric images, users, icons, eicons | Inline macros | No standard Markdown equivalent; numeric image labels are retained |

Consecutive `>` lines form a single quote. Use `>` on its own for an intentional
blank line inside the quote. The quote contents accept Markdown, including nested
quotes. Ordinary prose line breaks remain significant. Macro markers and divider
lines absorb their syntax boundary newlines, as documented in the main README.
