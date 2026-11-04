#!/usr/bin/env python3
"""Build/check the self-contained ARCLINE map-review HTML from the single JSON source.

Usage:
    python3 ARCLINE/design/stage_reviews/build_gallery_html.py
    python3 ARCLINE/design/stage_reviews/build_gallery_html.py --check

The published HTML has the map data embedded. It makes no network requests at
view time, so the comparison works on GitHub Pages and even from file://.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
JSON_PATH = HERE / "map_review_gallery_data.json"
HTML_PATH = HERE / "map_review_gallery.html"
START = "<!-- ARCLINE_GALLERY_DATA_BEGIN -->"
END = "<!-- ARCLINE_GALLERY_DATA_END -->"


def build_html(original: str, data: dict) -> str:
    if original.count(START) != 1 or original.count(END) != 1:
        raise ValueError("Embedded gallery markers must appear exactly once")
    entries = data.get("stages")
    if not isinstance(entries, list) or not entries:
        raise ValueError("No stages found")
    ids = [stage.get("stage") for stage in entries]
    if any(not isinstance(i, int) for i in ids) or len(set(ids)) != len(ids):
        raise ValueError("Duplicate or invalid stage numbers")
    for entry in entries:
        if entry.get("state") not in ("approved", "pending"):
            raise ValueError(f"Invalid approval state on stage {entry['stage']}")
        for key in ("before", "after"):
            if not isinstance(entry.get(key), dict):
                raise ValueError(f"Missing {key} map for stage {entry['stage']}")
    # Escape angle brackets so no data string can close the script tag.
    serialized = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    serialized = serialized.replace("<", r"\u003c").replace("&", r"\u0026")
    payload = (
        START + "\n"
        '<script type="application/json" id="embedded-gallery-data" '
        'data-source="map_review_gallery_data.json">\n'
        + serialized + "\n</script>\n" + END
    )
    before, remaining = original.split(START, 1)
    _, after = remaining.split(END, 1)
    final = before + payload + after
    if "fetch('./map_review_gallery_data.json'" in final:
        raise ValueError("HTML should not fetch JSON at runtime")
    return final


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify without changing the HTML")
    args = parser.parse_args()
    data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    existing = HTML_PATH.read_text(encoding="utf-8")
    output = build_html(existing, data)
    if args.check:
        if existing != output:
            print("ERROR: Gallery HTML is out of sync. Run build_gallery_html.py", file=sys.stderr)
            sys.exit(1)
        print(f"OK: {len(data['stages'])} stages embedded and HTML is in sync")
    else:
        if existing == output:
            print(f"Up to date: {len(data['stages'])} stages")
        else:
            HTML_PATH.write_text(output, encoding="utf-8")
            print(f"Updated HTML: {len(data['stages'])} stages, no runtime network requests")


if __name__ == "__main__":
    main()
