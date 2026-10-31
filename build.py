"""Build the standalone editor using only Python's standard library."""
from pathlib import Path
import base64
root = Path(__file__).resolve().parent
page = (root / "index.html").read_text(encoding="utf-8")
css = (root / "src/styles.css").read_text(encoding="utf-8")
templates = (root / "src/templates.js").read_text(encoding="utf-8")
js = (root / "src/app.js").read_text(encoding="utf-8")
renderer = (root / "src/horizon-renderer.js").read_text(encoding="utf-8")
syntax = (root / "src/syntax.js").read_text(encoding="utf-8")
diagnostics = (root / "src/diagnostics.js").read_text(encoding="utf-8")
preview_state = (root / "src/preview-state.js").read_text(encoding="utf-8")
renderer_css = (root / "src/horizon-preview.css").read_text(encoding="utf-8")
page = page.replace('<link rel="stylesheet" href="src/styles.css">', '<style>' + css + '</style>', 1)
page = page.replace('<script src="src/templates.js"></script>', '<script>' + templates + '</script>', 1)
page = page.replace('<script src="src/app.js"></script>', '<script>' + js + '</script>', 1)
page = page.replace('<script src="src/horizon-renderer.js"></script>', '<script>' + renderer + '</script>', 1)
page = page.replace('<script src="src/syntax.js"></script>', '<script>' + syntax + '</script>', 1)
page = page.replace('<script src="src/diagnostics.js"></script>', '<script>' + diagnostics + '</script>', 1)
page = page.replace('<script src="src/preview-state.js"></script>', '<script>' + preview_state + '</script>', 1)
page = page.replace('<link rel="stylesheet" href="src/horizon-preview.css">', '<style>' + renderer_css + '</style>', 1)
theme_css = (root / "src/flist-themes.css").read_text(encoding="utf-8")
for asset in (root / "src/assets/flist").glob("*.png"):
    theme_css = theme_css.replace("assets/flist/" + asset.name, "data:image/png;base64," + base64.b64encode(asset.read_bytes()).decode("ascii"))
page = page.replace('<link rel="stylesheet" href="src/flist-themes.css">', '<style>' + theme_css + '</style>', 1)
editor_css = (root / "src/editor-themes.css").read_text(encoding="utf-8")
page = page.replace('<link rel="stylesheet" href="src/editor-themes.css">', '<style>' + editor_css + '</style>', 1)
app_css = (root / "src/app-themes.css").read_text(encoding="utf-8")
page = page.replace('<link rel="stylesheet" href="src/app-themes.css">', '<style>' + app_css + '</style>', 1)
output = root / "dist/Folio-Profile-Studio.html"
output.parent.mkdir(exist_ok=True)
output.write_text(page, encoding="utf-8")
print(output)
