# Official F-List BBCode support audit

Implementation follow-up: URL, name, argument and nesting diagnostics are now implemented, with nesting rules read from the preview renderer. Failed remote avatars use a local placeholder. Blank collapse titles remain valid for legacy compatibility. `tests/bbcode-audit.cjs` covers the official tag set and these fixes. The findings below describe the pre-fix baseline.

Audited 2026-11-01 against the [official List of BBCode tags](https://wiki.f-list.net/index.php/List_of_BBCode_tags), revision 2494 (page last edited 2016-06-23). The page describes verified tags, not an exhaustive current specification. Its F-Chat and Quick-Click columns describe F-List, not Folio requirements. This audit covers profile editing.

## Result

All **23 documented tag names** are present in Folio's native BBCode allowlist, conversion support, and preview renderer. For one representative valid example per tag, BBCode → Markdown+ → BBCode preserved the exact input, generated no editor warnings, and produced the expected DOM element. Both labelled and bare HTTP(S) links are supported. No missing tag from this reference was found.

| Official group | Tags | Basic conversion / preview |
| --- | --- | --- |
| Text formatting | `b`, `i`, `u`, `s`, `big`, `small`, `sup`, `sub`, `color`, `url` | Pass |
| Layout control | `heading`, `indent`, `justify`, `collapse`, `quote`, `hr`, `left`, `center`, `right` | Pass |
| Other | `icon`, `eicon`, `user`, `noparse` | Pass; remote image availability not checked |

The 12 documented colors match the renderer and editor presets. The F-List preview themes explicitly place `sub` on the baseline and `sup` at the top, matching the wiki's unusual description rather than ordinary HTML subscript behavior (`src/flist-themes.css:85`). Quote headers, block alignment, headings, indentation, and interactive collapsibles are implemented.

Markdown+ deliberately treats native bracket tags as literal text; native tags belong in BBCode mode. This is an intentional source-mode rule, not missing tag support. Equivalent Markdown/macros exist for every listed tag (`docs/conversion-maps.md`).

## Findings

### 1. Invalid URLs have no editor diagnostic — medium

`countWarnings('[url]example.com[/url]')` returns no warnings, although the official reference requires a scheme. The preview shows `[BAD URL] example.com` plus the original markup. `[url=javascript:alert(1)]X[/url]` likewise gets no diagnostic, though it does not create a clickable unsafe link.

The editor checks tag names, balance, colors and external images but never validates URL arguments/content (`src/app.js:708`). The renderer validates separately (`vendor/horizon/bbcode/core.ts:37`), and the adapter also restricts clickable links to HTTP(S) (`src/horizon-adapter.js:16`).

Recommendation: surface malformed/missing URL errors at the source span using the preview's effective URL policy.

### 2. Renderer nesting restrictions are absent from diagnostics — medium

Examples with no editor warning:

| Input | Actual preview DOM content |
| --- | --- |
| `[big][big]X[/big][/big]` | One large span containing literal `[big]X[/big]` |
| `[sup][color=red]X[/color][/sup]` | A superscript containing literal `[color=red]X[/color]` |

The wiki says big/small cannot be applied repeatedly. Folio does prevent cumulative sizing in these examples, but exposes nested tags as literal text. The renderer uses per-tag child restrictions, including a particularly narrow set for `sup`/`sub` (`vendor/horizon/bbcode/standard.ts:82`); the editor's stack check only validates balanced nesting (`src/app.js:708`). Exact F-List handling of the second example is not specified by this wiki page and was not verified against a live profile.

Recommendation: warn when balanced source contains a child tag that the preview will leave literal. Reuse renderer rules rather than introducing another independent tag table.

### 3. Argument/content validation is incomplete — low

`[b=ignored]Text[/b]`, `[collapse]Body[/collapse]`, and `[user]Bad!Name[/user]` all produce no editor warning. The last remains literal in preview; the first ignores the parameter; the second renders a blank collapse header. The renderer has additional validation/warnings, but `FolioHorizon.render` only returns its DOM and does not expose those warnings to the editor (`scripts/build-renderer.cjs`).

A missing collapse title is not necessarily a compatibility error: the vendored renderer explicitly allows blank titles for old-site compatibility. Diagnose these cases according to their actual effect rather than declaring every undocumented form invalid.

### 4. Avatar fallback is not guaranteed locally — low, unverified remote behavior

The reference promises a default avatar for nonexistent characters or characters without an avatar. Folio constructs the remote avatar URL and has no image-error fallback (`src/horizon-adapter.js:22`). The server may supply the default itself; this audit did not test that response. A failed request can therefore produce a broken preview image unless the server handles it.

## Scope and existing differences

- `img` is an extra supported tag absent from this old wiki list. Its absence is not evidence that profile inlines are unsupported. Numeric ID placeholders/local mappings remain intentional preview limitations.
- The vendored renderer also knows `spoiler`, `row`, and `col`, while the editor flags them as unsupported and does not offer conversion macros. They are outside the supplied reference; current official profile support needs separate evidence before changing the allowlist.
- Horizon/Folio appearances intentionally differ from legacy F-List styling. In particular, baseline subscript parity is applied in the F-List themes; native HTML behavior remains in other appearances. Use the F-List themes to assess site fidelity.
- Channel restrictions and chat-specific decorations are outside this profile editor's scope.

## Verification and limits

`npm test` passed all existing suites. An additional read-only Node VM / linkedom probe exercised all 23 tags through the current converter, warning checker, and checked-in renderer, plus the malformed/nested examples above. No application behavior was changed.

This was a source and DOM audit, not a browser pixel comparison or a live F-List submission. Remote icon existence/fallback, every possible nesting combination, theme pixel fidelity, and newer undocumented tags were not verified. The official page was retrieved directly over HTTPS after the browsing tool could not open it.
