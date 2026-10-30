"""Build the standalone editor using only Python's standard library."""
from pathlib import Path
root = Path(__file__).resolve().parent
page = (root / "index.html").read_text(encoding="utf-8")
css = (root / "src/styles.css").read_text(encoding="utf-8")
js = (root / "src/app.js").read_text(encoding="utf-8")
page = page.replace('<link rel="stylesheet" href="src/styles.css">', '<style>' + css + '</style>', 1)
page = page.replace('<script src="src/app.js"></script>', '<script>' + js + '</script>', 1)
output = root / "dist/Folio-Profile-Studio.html"
output.parent.mkdir(exist_ok=True)
output.write_text(page, encoding="utf-8")
print(output)
