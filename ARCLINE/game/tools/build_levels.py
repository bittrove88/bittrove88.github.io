"""Compile the explicitly authored 20-theme campaign, without changing provenance.

The 2026-10-27 player revision replaces water with solid reflective ground.
All 100 geometry records live in design/runtime_campaign_20x5.json; this tool
validates and serializes those records rather than inferring geometry from prose.
"""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
source = ROOT / 'design/runtime_campaign_20x5.json'
campaign = json.loads(source.read_text())
levels = campaign['levels']
assert len(campaign['themes']) == 20 and len(levels) == 100
assert [s['id'] for s in levels] == list(range(1, 101))
assert sum(s['boss'] for s in levels) == 10
for level in levels:
    index = level['id'] - 1
    assert level['theme'] == index // 5
    assert level['stageInTheme'] == index % 5 + 1
    assert level['themeName'] == campaign['themes'][index // 5]['name']
    assert len(level['skills']) <= 2
    assert all(len(floor) >= 2 for floor in level['floors'])
    assert all(all(a[0] < b[0] for a, b in zip(floor, floor[1:])) for floor in level['floors'])
    assert all(f['type'] in 'SRBWCKUFVMT' for f in level['features'])
    if any(p['id'].startswith('W') for p in level['pickups']):
        assert not level['skills'], 'New weapons get a stage without competing skill buttons'
weapon_ids = [p['id'] for s in levels for p in s['pickups'] if p['id'].startswith('W')]
cosmetic_ids = [p['id'] for s in levels for p in s['pickups'] if p['id'][0] in 'SB']
assert sorted(weapon_ids) == [f'W{i:02}' for i in range(2, 21)]
assert len(cosmetic_ids) == 37 and len(set(cosmetic_ids)) == 37
assert max(s['id'] for s in levels if any(p['id'] == 'W20' for p in s['pickups'])) <= 85
out = ROOT / 'game/dist/levels.js'
out.write_text("(function(root){'use strict';\nconst levels="
               + json.dumps(levels, ensure_ascii=False, separators=(',', ':'))
               + ";\nif(typeof module!=='undefined')module.exports=levels;else root.ArcLevels=levels;\n})(globalThis);\n")
print(f'Compiled {len(levels)} authored levels in 20 themes, 10 bosses, '
      f'{sum(len(s["pickups"]) for s in levels)} pickups; reflective ground revision')
