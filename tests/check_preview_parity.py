"""Run the preview CSS parity in headless Edge (Windows, no extra packages)."""
import html
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import urllib.request
from concurrent.futures import ThreadPoolExecutor

root = Path(__file__).resolve().parents[1]
browser = next((Path(os.environ.get(key, "")) / "Microsoft/Edge/Application/msedge.exe"
                for key in ("PROGRAMFILES(X86)", "PROGRAMFILES", "LOCALAPPDATA")
                if (Path(os.environ.get(key, "")) / "Microsoft/Edge/Application/msedge.exe").is_file()), None)
if browser is None:
    sys.exit("Microsoft Edge not found; this optional browser check requires Edge on Windows.")
subprocess.run([sys.executable, str(root / "build.py")], check=True)
page = (root / "dist/Folio-Profile-Studio.html").read_text(encoding="utf-8")
script = "<script>" + (root / "tests/preview-parity.browser.js").read_text(encoding="utf-8") + "</script>"
if '--site-reference' in sys.argv:
    def fetch(name):
        return name, urllib.request.urlopen('https://static.f-list.net/css/' + name, timeout=20).read().decode()
    with ThreadPoolExecutor() as pool:
        reference = dict(pool.map(fetch, ['common/default-0.0.10.css', 'default.css', 'dark.css', 'light.css']))
    script = '<script>window.siteReferenceCSS=' + json.dumps(reference).replace('</', '<\\/') + ';</script>' + script
with tempfile.TemporaryDirectory(prefix="folio-preview-check-") as folder:
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
        match = re.search(r'<pre id="preview-parity-result">(.*?)</pre>', result.stdout, re.S)
        assert match, f"Browser check returned no result at width {width}"
        data = json.loads(html.unescape(match.group(1)))
        assert data.get("passed"), data
        print(f"Preview CSS parity passed at {width}px")
    if '--gallery' in sys.argv:
        gallery = (root / 'tests/preview-gallery.browser.js').read_text(encoding='utf-8')
        for scheme in ('flist-blue', 'flist-dark', 'flist-light', 'default', 'classic', 'noir'):
            target.write_text(page.replace('</body>', '<script>window.previewGalleryTheme=' + json.dumps(scheme) + ';' + gallery + '</script></body>'), encoding='utf-8')
            output = root / 'dist' / ('preview-' + scheme + '.png')
            subprocess.run([str(browser), '--headless', '--disable-gpu', '--hide-scrollbars',
                            '--no-first-run', '--no-default-browser-check', '--window-size=1000,900',
                            f'--user-data-dir={Path(folder) / "gallery"}', '--virtual-time-budget=1000',
                            f'--screenshot={output}', target.as_uri()], capture_output=True, timeout=30,
                           creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0), check=True)
            print(output)
