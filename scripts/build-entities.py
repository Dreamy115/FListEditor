"""Refresh the offline HTML5 named-reference table using Python's standard library."""
import html.entities
import json
import re
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "src" / "app.js"
source = path.read_text(encoding="utf-8")
entities = {key[:-1]: value for key, value in html.entities.html5.items() if key.endswith(";")}
table = "const namedCharacterReferences=" + json.dumps(entities, ensure_ascii=True, separators=(",", ":"), sort_keys=True) + ";"
updated, count = re.subn(r"^const namedCharacterReferences=.*;$", lambda _: table, source, count=1, flags=re.MULTILINE)
if count != 1:
    raise SystemExit("Could not locate the named-reference table")
path.write_text(updated, encoding="utf-8")
print(f"Updated {len(entities)} HTML5 named references")
