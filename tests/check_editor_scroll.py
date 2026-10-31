"""Check long-file gutter sizing and scroll alignment in headless Edge."""
import html
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parents[1]
browser = next((Path(os.environ.get(key, '')) / 'Microsoft/Edge/Application/msedge.exe'
                for key in ('PROGRAMFILES(X86)', 'PROGRAMFILES', 'LOCALAPPDATA')
                if (Path(os.environ.get(key, '')) / 'Microsoft/Edge/Application/msedge.exe').is_file()), None)
if browser is None:
    sys.exit('Microsoft Edge is required for this browser check.')
subprocess.run([sys.executable, str(root / 'build.py')], check=True)
page = (root / 'dist/Folio-Profile-Studio.html').read_text(encoding='utf-8')
script = '<script>' + (root / 'tests/editor-scroll.browser.js').read_text(encoding='utf-8') + '</script>'
with tempfile.TemporaryDirectory(prefix='folio-editor-scroll-') as folder:
    target = Path(folder) / 'check.html'
    target.write_text(page.replace('</body>', script + '</body>'), encoding='utf-8')
    for width in (1440, 600):
        run = subprocess.run([str(browser), '--headless', '--disable-gpu', '--no-first-run',
                              '--no-default-browser-check', f'--window-size={width},1000',
                              f'--user-data-dir={Path(folder) / str(width)}', '--dump-dom',
                              '--virtual-time-budget=2000', target.as_uri()], capture_output=True,
                             text=True, encoding='utf-8', errors='replace', timeout=30,
                             creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        match = re.search(r'<pre id="editor-scroll-result">(.*?)</pre>', run.stdout, re.S)
        assert match, f'No browser test result at {width}px'
        result = json.loads(html.unescape(match.group(1)))
        assert result.get('passed'), result
        print(f'Editor gutter baseline and EOF scroll checks passed at {width}px')
