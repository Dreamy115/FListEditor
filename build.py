"""Type-check and bundle TypeScript, then embed assets in one standalone HTML."""
from pathlib import Path
import base64
import subprocess
import re
root = Path(__file__).resolve().parent
subprocess.run(["node", "--import", "tsx", str(root / "scripts/build-app.ts")], cwd=root, check=True)
page = (root / "index.html").read_text(encoding="utf-8")
css = (root / "src/styles.css").read_text(encoding="utf-8")
renderer_css = (root / "src/horizon-preview.css").read_text(encoding="utf-8")
page = page.replace('<link rel="stylesheet" href="src/styles.css">', '<style>' + css + '</style>', 1)
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
def inline_script(match):
    script = (root / match.group(1)).read_text(encoding="utf-8")
    return '<script>' + script + '</script>'
page = re.sub(r'<script src="([^"]+)"></script>', inline_script, page)
output.parent.mkdir(exist_ok=True)
output.write_text(page, encoding="utf-8")
print(output)
