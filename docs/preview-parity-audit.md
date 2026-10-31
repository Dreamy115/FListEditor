# Character-profile CSS parity audit

Implementation follow-up: the findings below describe the pre-fix baseline.
The site themes now correct their palettes, default size, quote/collapse metrics,
icons, rules, inline typography, panel padding and decorative header. Site image
assets are bundled offline. Saved explicit text sizes are preserved. See
`preview-themes.md` and `tests/check_preview_parity.py` for current validation.

Audited 2026-10-31 against freshly downloaded public F-List CSS:

- https://static.f-list.net/css/common/default-0.0.10.css
- https://static.f-list.net/css/default.css
- https://static.f-list.net/css/dark.css
- https://static.f-list.net/css/light.css

Compared with `src/styles.css`, `src/horizon-preview.css`,
`src/flist-themes.css`, the Horizon parser/adapter, and preview settings in
`src/app.js`. This is a stylesheet and DOM audit, not a screenshot comparison
against an authenticated character page. Additional page-specific styles and
user settings require live-page verification. No rendering code changed.

## Findings, in priority order

1. **Dark and Light have incorrect red and blue BBCode colors.** The shared
   Folio root supplies red `#f00` and blue `#06f`; neither theme overrides them.
   Both site themes specify red `#f44` and blue `#1e90ff`. Dark additionally
   inherits incorrect green (`#0f0` vs `#4f4`), pink (`#f9c` vs `#ffcbdb`), gray
   (`#ccc` vs `#d3d3d3`), orange (`#f60` vs `#ffa500`), and brown
   (`#8a6d3b` vs `#aa840c`). Blue's twelve named colors match. Fix the theme
   inheritance rather than changing the legacy Folio palette globally.

2. **The initial preview is 16px, while the site uses 12px.** The F-List theme
   CSS correctly declares 12px and normal line height, but `src/app.js` applies
   an inline 16px default to `#preview`. This changes wrapping, heading sizes,
   and profile height. Selecting Site default removes the inline override.
   Prefer Site default for new users if parity is the intended default.

3. **Quote geometry and typography differ substantially.** Site `blockquote`
   uses 10px padding, 2px margin, italic text, a full 1px border, and a small
   shadow. Folio retains 7px/13px asymmetric padding, 10px vertical margins,
   a 3px left border, no other borders, and upright text. Theme overrides only
   change colors/backgrounds. Dark's quote border should be `#3e3838`, but
   Folio uses the panel border `#4c4646`. Horizon emits `.quoteHeader`, while
   site `.QuoteHeader` has bold text and a 5px bottom margin; Folio has no
   corresponding rule. Blue/Light also omit the site's 5px quote rounding.

4. **Collapse geometry is still Horizon/Folio geometry.** Site headers use
   1.2em bold text, padding `3px 0 4px 25px`, and image chevrons positioned at
   5px/5px. Folio uses inherited-size text, `.4em .75em` padding and Unicode
   chevrons. Its enclosing wrapper has a 1px border, 8px radius and clipping.
   Site Blue instead styles the header with a `#2369af` border and shadow;
   Blue/Light headers have 5px rounding. Expanded site bodies use margin
   `10px 10px 10px 0`, normal weight, and fixed 12px text; Folio uses a .5rem
   left margin plus .75em card padding and inherits the preview font size.
   Blue expanded text is `#eee` on site versus `#fff` in Folio. Zero wrapper
   margin alone does not establish collapse parity.

5. **Correction: character icons render at 50x50px on the site.** The shared
   `.ParsedAvatar` rule and 100x100 source image do not establish the final
   rendered dimensions. The user confirmed a 50x50 display size; Folio retains
   that size, with a separate icon rule so eicons remain independent.

6. **Rules preserve Folio spacing and border shape.** Theme colors match, but
   Folio explicitly uses only a 1px top border and `18px 0` margins. Site theme
   rules set solid borders without these spacing overrides. The final site
   dimensions depend on browser defaults and any page-specific CSS; verify
   computed styles before choosing exact replacement dimensions.

7. **Links and inline typography have smaller residual differences.** Folio
   adds a 3px underline offset. Site colored-link selectors explicitly apply
   text shadows to both spans and anchors; Folio applies them only to spans
   and relies on inheritance. Site's reset sets inline vertical alignment to
   baseline and then `sup` to top; Folio leaves browser sub/sup defaults.

8. **Available width is not a site-profile simulation.** Folio retains its
   responsive editor pane, 24px/26px card padding (less at narrow widths),
   decorative character header, 11px card rounding, and large shadow. Site
   shared panels use 10px padding and a different page/sidebar layout.
   Matching colors and font sizes cannot guarantee matching line wraps.

## What already matches

- Blue's twelve named colors, and the explicit Dark/Light color overrides
  other than the inheritance omissions above.
- Verdana/Helvetica family and normal line height in the site themes.
- Big/small factors (1.4em/.8em), left/center/right alignment, heading 1.5em
  sizing and 5px top margin, and Blue heading color/shadow.
- Theme link/hover colors and rule colors.
- Panel base colors and intended gradient endpoints. Light intentionally
  omits the site's `toplight.png` overlay. Legacy gradient syntax means exact
  site appearance still needs a target-browser computed-style check.
- Dark black/purple overrides and Light's removal of text shadows.

## Validation gaps and recommended order

`tests/flist-colors.cjs` asserts the legacy root palette and mapping strings;
it does not resolve each site's theme variables against downloaded expected
values. It therefore misses the Dark/Light palette errors. Existing DOM tests
do not establish computed-style or visual parity.

First correct and independently check each theme's twelve resolved colors.
Then choose the default font-size policy and match quote/collapse metrics.
Finally compare a fixture containing nested quotes/collapses, headings,
colored links, icons, sup/sub, and rules at equal content widths in a browser.
Use separate checks for collapsed/expanded states and all three site themes.

Inline-image placeholders, absent profile metadata, page chrome and custom
user CSS remain documented scope limits rather than CSS fixes. The three
Folio appearances intentionally use their own styling.
