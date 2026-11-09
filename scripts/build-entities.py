"""Refresh the offline HTML5 named-reference table from Python's standard library."""
import html.entities
import json
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "src/formatting/named-references.json"
entities = {key[:-1]: value for key, value in html.entities.html5.items() if key.endswith(";")}
path.write_text(json.dumps(entities, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
print(f"Updated {len(entities)} HTML5 named references")
