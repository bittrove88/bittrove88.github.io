"""Build 33 scene JSON/SVG files and a self-contained review gallery."""
from pathlib import Path
import html
import json
import hashlib
from recipes import all_scenes

root=Path(__file__).resolve().parent
scenes=all_scenes()
assert len(scenes)==33
assert len({s['id'] for s in scenes})==33
assert {s['themeIndex'] for s in scenes if s['kind']=='normal'}==set(range(20))
assert {s['stage'] for s in scenes if s['kind']=='boss'}==set(range(10,100,10))
assert {s['mapIndex'] for s in scenes if s['kind']=='final'}==set(range(4))
for directory in ['data','svg']:(root/directory).mkdir(exist_ok=True)
manifest=dict(version='1.0',dateJst='2026-11-07',normalCount=20,bossCount=9,finalCount=4,
              runtimeIntegrated=False,selectionPriority=['stage100 + explicit mapIndex','boss stage10..90','normal theme'],scenes=[])
for s in scenes:
    ids=[x['id'] for x in s['shapes']]
    assert len(ids)==len(set(ids))
    assert all(x['layer'] in s['layerOrder'] for x in s['shapes'])
    assert len(set(s['layerOrder']))==len(s['layerOrder'])
    (root/'data'/f'{s["id"]}.json').write_text(json.dumps(s,ensure_ascii=False,indent=2)+'\n')
    w,h=s['size']
    svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-labelledby="title desc">',
         '<title id="title">'+html.escape(s['title'])+'</title>',
         '<desc id="desc">'+html.escape(s['concept'])+' 不透明な単色色面のみ。背景デザイン資料。</desc>']
    for layer in s['layerOrder']:
        svg.append(f'<g id="{html.escape(layer,quote=True)}">')
        for x in s['shapes']:
            if x['layer']!=layer:continue
            attrs=f'id="{html.escape(x["id"],quote=True)}" fill="{s["palette"][x["fill"]]}"'
            if x['kind']=='path':svg.append(f'<path {attrs} d="{html.escape(x["d"],quote=True)}"/>')
            elif x['kind']=='ellipse':svg.append(f'<ellipse {attrs} cx="{x["cx"]}" cy="{x["cy"]}" rx="{x["rx"]}" ry="{x["ry"]}"/>')
            else:raise ValueError(x['kind'])
        svg.append('</g>')
    svg.append('</svg>')
    (root/'svg'/f'{s["id"]}.svg').write_text('\n'.join(svg)+'\n')
    manifest['scenes'].append(dict(id=s['id'],title=s['title'],themeIndex=s['themeIndex'],kind=s['kind'],
          stageRange=s['stageRange'],stage=s.get('stage'),mapIndex=s.get('mapIndex'),approved=s['approved'],
          shapeCount=len(s['shapes']),paletteCount=len(s['palette']),
          json='data/'+s['id']+'.json',svg='svg/'+s['id']+'.svg'))
renderer=(root/'renderer.js').read_text()
template=(root/'gallery.template.html').read_text()
serialized=json.dumps(scenes,ensure_ascii=False,separators=(',',':'))
assert '</script' not in serialized.lower() and '</script' not in renderer.lower()
(root/'index.html').write_text(template.replace('__SCENES__',serialized).replace('__RENDERER__',renderer))
manifest['sourceHashes']={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((root/'sources').glob('*.json'))}
(root/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(f'Built {len(scenes)} scenes / {sum(len(s["shapes"]) for s in scenes)} opaque vector shapes')
