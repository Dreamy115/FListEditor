# Source audit and TypeScript refactor

Baseline: `284731a2decd915b8c47d1d2fa6035a0016229de`.

## Findings and changes

The application controller was `src/app.js` (1,890 lines, approximately 173 KB), not `index/app.js`. Many lines combined declarations, branches, rendering and event registration. Its one closure mixed independent conversion logic with shared mutable editor state, DOM construction, persistence and application startup.

| Finding | Change |
| --- | --- |
| Conversion, diagnostic location logic and UI all shared one scope | Extracted named TypeScript modules with explicit imports/exports; formatting does not import application state or DOM controls |
| Shared draft/template/history state was implicit | Introduced documented record, snapshot, session and history interfaces; centralized mutable application state and typed DOM ID lookup |
| Event registration and declaration order were intertwined | `src/main.ts` explicitly runs initialization in the original order; modules define functions before controls are bound |
| Tests sliced source using exact whitespace and neighboring declarations | Formatting tests run the real module graph; isolated UI tests select AST declarations/event bindings and supply existing collaborator stubs |
| `npm ci` was documented but the lockfile was ignored | Committed the lockfile and pinned build dependencies |
| Pages copied source assets directly without building or testing | PRs validate the application; main builds and deploys the standalone HTML after successful checks |
| No automated check that the deliverable remained self-contained | Added artifact checks for embedded scripts/styles/images and the current TypeScript bundle |

## Module map

| Location | Responsibility |
| --- | --- |
| `src/main.ts` | Ordered application startup |
| `src/app/dom.ts` | Typed lookup of controls in the HTML shell |
| `src/app/state.ts`, `types.ts`, `active.ts` | Saved data, transient sessions, shared contracts, active record |
| `src/app/notifications.ts` | Save scheduling, status/toasts, confirmation controls |
| `src/app/backups.ts`, `exports.ts` | Profile import/export, full backups, purge, screenshot and clipboard controls |
| `src/app/layout.ts` | Pane sizing, dismissible note and diagnostic attachment |
| `src/characters/` | Naming, draft lists, reorder/clone, character switching and controls |
| `src/editor/history.ts`, `editing.ts`, `mode.ts`, `sync.ts` | Undo/redo, text changes, source mode conversion and synchronization |
| `src/editor/toolbar.ts`, `insertions.ts`, `guide.ts`, `shortcuts.ts` | Formatting tools, palettes, insertions, reference examples and keyboard routing |
| `src/editor/view.ts` | Caret, highlight scrolling, gutter measurement and source events |
| `src/formatting/` | Macro names, Unicode fonts, colors, HTML entities, inline/block compilation, BBCode parsing/decompilation and source diagnostics |
| `src/preview/` | Preview refresh, warning navigation, appearance controls, font-size parsing and renderer adapter |
| `src/templates/` | Reusable template sessions, save/clone/delete, target selection and application |
| `src/browser-globals.d.ts` | Contracts for the existing companion scripts |

The existing renderer, syntax painter, diagnostic popup, image mapping, screenshot and preview companion scripts keep their established browser APIs. Vendored code is unchanged. The HTML still loads these scripts before the app bundle.

UI feature modules coordinate through imported functions and shared state. Some function-only import cycles remain because character/template switching, preview refresh and undo interact; cross-feature UI calls run after ordered initialization begins. DOM lookups and pure preference parsing are independent modules to avoid initialization cycles. TypeScript checks the public conversion functions, shared state and browser contracts; `strict` remains disabled for this incremental migration, so some parser internals and JSON validation paths retain inferred `any` types. Tightening these types is follow-up work, not a claim of runtime JSON safety.

## Behavior retained and follow-up findings

No profile syntax, storage keys, defaults, source transformations, controls or persistence formats were intentionally changed. In particular, this refactor preserves existing behavior even where old assertions or documentation were stale:

- Public compilation converts physical line-edge spaces to nonbreaking spaces. Old whitespace tests asserted source-level spaces against that encoded boundary; those checks now target `markdownToBBSource`, while `bbcode-whitespace.cjs` covers the public encoding.
- Dash bullets currently compile to literal hyphens. A stale assertion expected an en dash. The expectation now records current output; the compiler is unchanged.
- The template sidebar test lacked a drag-handler stub and already failed on the baseline. Its test host now supplies that collaborator.
- Stored-draft loading and full-backup validation are separate code paths with different validation rules. A null draft in saved storage can throw during the initial filter and fall back to defaults through the existing catch. That behavior is preserved and should receive a separate data-recovery change.
- Source diagnostics can repeatedly compile candidate inputs to locate issues. Large nested documents may be expensive on every edit. Optimization should be measured separately to avoid changing diagnostic locations.
- Heading rewrites use iterator helpers, including `Iterator.map`. This is an existing browser requirement; transpilation does not polyfill it or widen browser compatibility.

## Validation

`tests/fixtures/refactor-baseline.json` records results captured from the unmodified baseline. It contains a digest of exact compilation, decompilation and diagnostic records for 752 deterministic inputs, including the showcase, plus preview hashes and editor-state snapshots for 17 complete-app scenarios. The scenarios cover startup, edit, both mode switches, undo/redo, app and preview themes, character creation/rename/clone/delete, and template edit/save/clone/new-character workflows. Saved-state reopening is checked separately.

The whole-app tests execute the actual application bundle with the real companion scripts in LinkeDOM. Layout APIs are stubbed, so they validate DOM content and state transitions, not pixel layout, caret geometry, native clipboard permission or image capture. Existing browser-specific checks remain available for those areas.

Run from a clean checkout:

```sh
npm ci
npm run format:check
npm run build
npm test
```

The build runs TypeScript checking, bundles ES modules with esbuild into readable `build/app.js`, and then embeds the bundle and existing assets into `dist/Folio-Profile-Studio.html`. Generated build directories are ignored. Python and VS Code entry points continue to use `build.py`, which invokes the same TypeScript pipeline.
