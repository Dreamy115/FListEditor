# F-List preview schemes

Palette checked against the public site stylesheets on 2026-10-31:

- [Shared BBCode colors and typography](https://static.f-list.net/css/common/default-0.0.10.css)
- [Blue (default)](https://static.f-list.net/css/default.css)
- [Dark](https://static.f-list.net/css/dark.css)
- [Light](https://static.f-list.net/css/light.css)

`src/flist-themes.css` maps the site's named color classes (`redfont`, etc.) to
Horizon renderer classes (`redText`, etc.). All twelve colors, including colored
links and text shadows, use the site's values. Dark overrides black and purple;
Light overrides ten colors and disables text shadows.

Preview backgrounds use the site's MediumPanel colors and gradients. Links,
rules, quote panels, collapse headers, and Verdana/Helvetica typography also use
site values. Blue is the default for new installations. Existing saved Folio
appearance selections are retained, and all six options remain available.

These are bundled palette snapshots, so previewing works offline. They do not
load third-party stylesheets or change the surrounding editor. The Horizon DOM
and Folio layout still differ from the website: full page chrome, legacy panel
background images, custom user CSS, and authenticated inline-image metadata are
not reproduced. The themes improve site color accuracy without claiming pixel
identity. Update this snapshot if the linked stylesheets change.
