# F-List preview schemes

Palette checked against the public site stylesheets on 2026-10-31:

- [Shared BBCode colors and typography](https://static.f-list.net/css/common/default-0.0.10.css)
- [Blue (default)](https://static.f-list.net/css/default.css)
- [Dark](https://static.f-list.net/css/dark.css)
- [Light](https://static.f-list.net/css/light.css)

`src/flist-themes.css` maps the site's named color classes (`redfont`, etc.) to
Horizon renderer classes (`redText`, etc.). A shared set of variables supplies
all twelve site colors to both the preview and the color-name syntax highlights.
Each site scheme defines its own palette overrides, including the shared site
red and blue. Light disables text shadows.

New installations use Site default text sizing (12px in the site schemes);
saved explicit size preferences remain available. Site schemes hide the decorative
Folio character header and use 10px panel padding. Quotes, collapse headers and
bodies, character icons, rules, and inline typography follow the shared site CSS.

Preview backgrounds use the site's MediumPanel colors and gradients. Links,
rules, quote panels, collapse headers, and Verdana/Helvetica typography also use
site values. Blue is the default for new installations. Existing saved Folio
appearance selections are retained, and all six options remain available.

Collapsible wrappers have zero outer margin: adjacent BBCode collapse tags touch,
as on F-List. Only actual source newlines add space between them, whether closed
or expanded. No decorative preview spacing is inserted between sections.

These are bundled palette snapshots, so previewing works offline. The selected
F-List scheme also sets the color used for named color words in the source editor
and its color picker; the rest of the editor appearance remains independently
selectable. No third-party stylesheets are loaded. The Horizon DOM and Folio
layout still differ from the website: full page chrome, custom user CSS, and authenticated inline-image metadata are
not reproduced. The themes improve site color accuracy without claiming pixel
identity. Update this snapshot if the linked stylesheets change.

The site chevrons and Light panel overlay are bundled under `src/assets/flist`
from https://static.f-list.net/images/icons/chevron-expand.png,
https://static.f-list.net/images/icons/chevron.png, and
https://static.f-list.net/images/toplight.png. These are F-List site assets,
retained for preview fidelity; Folio does not claim authorship or relicense them.
The standalone builder embeds them as data URLs for offline use.

Run `python tests/check_preview_parity.py` for headless Edge computed-style
checks at desktop, tablet, and mobile widths. It checks all twelve colors and
colored links in every site scheme, initial text size, quote metrics, collapse
sizes and expanded state, icon dimensions, and Light link shadows. Exact profile
width and authenticated inline-image rendering still require a live-page check.

Screenshot follow-up: the legacy site's renderer at
https://static.f-list.net/js/f-list.js maps `[heading]` to `h3`, not Horizon's
`h2`. Site themes therefore style Horizon headings with h3 metrics (1.17em,
10px vertical margins). Collapse padding, border, icon and background belong to
the shared wrapper, not only its title; this keeps the body inside the painted
panel and gives nested sections the site's inset. Blue nested titles inherit
`#eee` from an expanded ancestor. Indentation uses the site's 3em.

## Appearance families

Profile appearance now has two distinct rendering families. F-List Default
(Blue), Dark and Light follow the public legacy site CSS. In particular Dark
headings are green (`#78c624`), Light headings teal (`#478`), and Blue headings
white with no heading shadow. All three site schemes use rounded collapse
wrappers. Blue nested titles inherit the expanded ancestor's light text.

The Folio appearances are now **Horizon Default**, **Horizon Light** and
**Horizon Dark**. Their saved IDs remain `default`, `classic` and `noir`, so
existing selections and backups keep working. They use the pinned Horizon
revision documented in `vendor/horizon/README.md`: system fonts at 16px/1.5,
1.17rem headings, plain quotes, rounded bordered cards with separate header and
body padding, down/up chevrons, theme-specific BBCode palettes, and responsive
indentation and columns. They do not use F-List panel images or expanded panel
colors. Folio's independent **App appearance** choices are unchanged.

`python tests/check_preview_parity.py --site-reference` additionally downloads
current site CSS into memory and compares browser-computed styles against a
legacy-site DOM fixture for each scheme, including open, nested and closed
collapses and headings. `--gallery` saves all six rendered fixture screenshots
under `dist/preview-*.png`. The regular command checks all six appearances at
1440px, 800px and 600px without network access.

Labelled URL links now include the site's chain icon and a non-clickable
hostname suffix at 0.8em (with `www.` removed); bare site URLs omit the suffix.
The chain sprite is bundled from
https://static.f-list.net/images/common_icons2.png under the same F-List asset
attribution above. Horizon appearances show their own chain glyph and muted
hostname, including on bare URLs, following upstream `bbcode/UrlTagView.vue`.

## Horizon screenshot calibration

The supplied reference matches **Horizon Moon Prism**, rather than Horizon
Default. That appearance is now selectable separately (`horizon-moon-prism`),
with colors from the locally installed Horizon 2.4.5 compiled `moon-prism.css`.
Default, Light and Dark retain their own palettes. Moon Prism uses panel
`#2c3059`, orange `#ffb785`, blue `#4c4cff`, black `#b8c2e0` and hostname
`#5a61b8`. Choose this appearance when comparing with the supplied screenshot.

The installed CSS also supplies independent comparison fixtures for Horizon
card flex layout, translucent header backgrounds and borders, Light card/body
colors, headings and quotes. `--horizon-reference` on the browser check reads
only the installed compiled theme CSS from `C:/Program Files/Horizon/resources/
app.asar.unpacked/themes`; it does not change or depend on Horizon settings.
This option requires that installation. The normal browser check stays portable.

A focused excerpt of the supplied profile is kept in
`tests/fixtures/horizon-profile.bbcode`, including the exact Fortunate Souls
section and its six indent wrappers. It is tested at 16, 20 and 24px. The
Horizon heading and card spacing scale with the selected text size rather than
remaining tied to the editor page's 16px root. Automatic hyphenation is disabled.
The profile surface has no decorative outer border and adds 16px of preview padding on all sides.

The chevron and link SVG shapes are Font Awesome Free 7.2.0 icons, attributed
to Fonticons, Inc., under CC BY 4.0. Source assets and their license are in
`src/assets/horizon`; the CSS embeds the SVG shapes for offline use.
