"""Collect individually reviewed artworks into the self-contained gallery."""
from pathlib import Path
import hashlib,json
from recipes import all_scenes
from author import export_scene

root=Path(__file__).resolve().parent
scenes=all_scenes()
assert len(scenes)==33 and len({s['id'] for s in scenes})==33
assert {s['themeIndex'] for s in scenes if s['kind']=='normal'}==set(range(20))
assert {s['stage'] for s in scenes if s['kind']=='boss'}==set(range(10,100,10))
assert {s['mapIndex'] for s in scenes if s['kind']=='final'}==set(range(4))
reviews={}
for s in scenes:
    assert len({x['id'] for x in s['shapes']})==len(s['shapes'])
    assert all(x['layer'] in s['layerOrder'] for x in s['shapes'])
    if s.get('revision')=='2.0':
        review=json.loads((root/'review'/f'{s["id"]}.json').read_text())
        assert len(review['renders'])>=2 and review['visualReview']['improvement']
        assert review['renders'][-1]['meanDifference']<.5
        reviews[s['id']]=review['visualReview']
    export_scene(s)
assert len(reviews)==30
manifest=dict(version='2.0',dateJst='2026-11-07',normalCount=20,bossCount=9,finalCount=4,
  individuallyRebuilt=30,inherited=3,runtimeIntegrated=False,newDesignsApproved=False,
  replaces='PR #104 rejected batch proposal; Mirror Cliffs approval reopened by user',
  method='one artwork -> render -> visual review -> improvement -> re-render -> next artwork',
  selectionPriority=['stage100 + explicit mapIndex','boss stage10..90','normal theme'],scenes=[])
for s in scenes:
    manifest['scenes'].append(dict(id=s['id'],title=s['title'],themeIndex=s['themeIndex'],kind=s['kind'],
      stageRange=s['stageRange'],stage=s.get('stage'),mapIndex=s.get('mapIndex'),approved=s['approved'],
      shapeCount=len(s['shapes']),paletteCount=len(s['palette']),revised=s.get('revision')=='2.0',
      json='data/'+s['id']+'.json',svg='svg/'+s['id']+'.svg'))
renderer=(root/'renderer.js').read_text()
serialized=json.dumps(scenes,ensure_ascii=False,separators=(',',':'))
assert '</script' not in serialized.lower() and '</script' not in renderer.lower()
(root/'index.html').write_text((root/'gallery.template.html').read_text().replace('__SCENES__',serialized).replace('__RENDERER__',renderer))
manifest['sourceHashes']={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((root/'sources').glob('*.json'))}
(root/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(root/'REVIEW_LOG.json').write_text(json.dumps(dict(rebuiltCount=30,reviewed=reviews),ensure_ascii=False,indent=2)+'\n')
print(f'Collected {len(scenes)} scenes / {sum(len(s["shapes"]) for s in scenes)} opaque shapes / 30 individual review cycles')
