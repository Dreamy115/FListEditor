# Horizon renderer source

Upstream: https://github.com/Fchat-Horizon/Horizon
Revision: `a832077900e5c5b4ef9a12af136e8af773be8302`.

The files in `bbcode/` are unmodified upstream sources. They are compiled into
`src/horizon-renderer.js` with TypeScript by `scripts/build-renderer.cjs`.
Run `npm ci` then `npm run build:renderer` after changing the adapter or sources.
The checked-in generated renderer lets normal Python builds run without npm.

Horizon is licensed under MPL-2.0; see LICENSE.md. The original F-Chat code's
MIT notice is retained in LICENSE.old (Copyright 2018–2026 Dragonfruit Ventures,
LLC). Horizon contributors include Sylvia Roselie and respective contributors.
The generated renderer and adapted `src/horizon-preview.css` are covered by
MPL-2.0. Source form is provided in this repository, including the adapter and
build script. This notice does not select a license for the rest of Folio.

Browser adaptation: Vue-backed link/avatar components are replaced with small
DOM components; client settings have local defaults; collapse scheduling uses
setTimeout. Numeric inline-image IDs retain placeholders when metadata is
unavailable. External URL images remain a Folio extension. Horizon's parser
and standard profile tag rules otherwise run directly, including nesting limits
and literal noparse behavior. CSS is scoped and adapted to Folio's preview;
this does not reproduce an entire Horizon theme or authenticated client state.

The non-site profile appearances adapt Horizon character-viewer styling from
`scss/_bbcode.scss`, `scss/_flist_overrides.scss`, `scss/_character_page.scss`,
`scss/_core.scss`, and `scss/themes/variables/*_{variables,derived}.scss` at the
same pinned revision, together with Bootstrap 5 card/reboot/type metrics.
Horizon Default, Light, and Dark map to the saved Folio appearance IDs `default`,
`classic`, and `noir`. The F-List site schemes use separate legacy-site rules.

Screenshot calibration additionally checks against the locally installed Horizon
2.4.5 compiled Default, Light, Dark and Moon Prism themes. The optional browser
reference check reads these CSS files without changing the application. Moon
Prism is an additional preview appearance, not an alias for Horizon Default.
Font Awesome Free 7.2.0 icon shapes are attributed in
`src/assets/horizon/LICENSE.txt` (SVG icons: CC BY 4.0).
