"""Run the template editor lifecycle in headless Edge (Windows, no extra packages)."""
import html
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parents[1]
browser = next((Path(os.environ.get(key, "")) / "Microsoft/Edge/Application/msedge.exe"
                for key in ("PROGRAMFILES(X86)", "PROGRAMFILES", "LOCALAPPDATA")
                if (Path(os.environ.get(key, "")) / "Microsoft/Edge/Application/msedge.exe").is_file()), None)
if browser is None:
    sys.exit("Microsoft Edge not found; this optional browser check requires Edge on Windows.")
subprocess.run([sys.executable, str(root / "build.py")], check=True)
page = (root / "dist/Folio-Profile-Studio.html").read_text(encoding="utf-8")
script = "<script>" + (root / "tests/template-editor.browser.js").read_text(encoding="utf-8") + "</script>"
with tempfile.TemporaryDirectory(prefix="folio-template-check-") as folder:
    target = Path(folder) / "check.html"
    target.write_text(page.replace("</body>", script + "</body>"), encoding="utf-8")
    for width in (1440, 800, 600):
        result = subprocess.run([
            str(browser), "--headless", "--disable-gpu", "--no-first-run",
            "--no-default-browser-check", f"--window-size={width},1000",
            f"--user-data-dir={Path(folder) / str(width)}", "--dump-dom",
            "--virtual-time-budget=1000", target.as_uri()
        ], capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=30,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        match = re.search(r'<pre id="template-main-result">(.*?)</pre>', result.stdout, re.S)
        assert match, f"Browser check returned no result at width {width}"
        data = json.loads(html.unescape(match.group(1)))
        assert data.get("passed"), data
        print(f"Template editor lifecycle passed at {width}px")
