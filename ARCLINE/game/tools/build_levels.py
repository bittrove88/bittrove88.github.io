"""Validate and compile the explicitly authored4.2 campaign.

Finite polygon components, per-piece destructibility, device features and action
budgets are runtime data. Original transfer documents remain historical sources.
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
    assert level['contentRevision'] == '4.2'
    assert level['teleport'] == (level['id'] >= 4)
    assert all(p['kind'] in ('trial','ammo','skill') for p in level['pickups'])
    assert all(c['poly'] and len(c['poly']) >= 3 for c in level['components'])
    assert len({c['id'] for c in level['components']}) == len(level['components'])
    assert not level['boss'] or 'SWAP' not in level['skills']
assert sum(len(s['pickups']) for s in levels[:20]) == 16
assert sum(bool(s.get('midboss')) for s in levels) == 10
assert all(bool(s.get('midboss')) == (s['id']%10==5) for s in levels)
assert sum(len(s.get('clearRewards',[])) for s in levels) == 10
assert all(r.get('skillId') in ('S_GUARD','S_REPAIR','S_BREACH') and r.get('amount')==1 and isinstance(r.get('placementId'),str) for s in levels for r in s.get('clearRewards',[]))
assert all(p.get('skillId') in ('S_GUARD','S_REPAIR','S_BREACH') for s in levels for p in s['pickups'] if p['kind']=='skill')
assert len({json.dumps(s['components']) for s in levels}) == 100
assert sum(len(s['pickups']) for s in levels) == 29
out = ROOT / 'game/dist/levels.js'
out.write_text("(function(root){'use strict';\nconst levels="
               + json.dumps(levels, ensure_ascii=False, separators=(',', ':'))
               + ";\nif(typeof module!=='undefined')module.exports=levels;else root.ArcLevels=levels;\n})(globalThis);\n")
print(f'Compiled {len(levels)} authored levels in 20 themes, 10 bosses, '
      f'{sum(len(s["pickups"]) for s in levels)} pickups; finite terrain and destructible geometry revision4.2')
