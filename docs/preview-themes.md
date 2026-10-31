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
