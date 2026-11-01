"""Compile approved shot choreography and only independently verified character art."""
from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parents[2];folder=root/'design/cinematics_014';d=json.loads((folder/'shots.json').read_text());assets=json.loads((root/'assets/cinematics/manifest.json').read_text());art=json.loads((folder/'character_images.json').read_text())['characters']
assert [r['id'] for r in d['shots']]==[r['shot'] for r in assets['shots']]
for s,a in zip(d['shots'],assets['shots']):
 assert hashlib.sha256((root/a['src']).read_bytes()).hexdigest()==a['sha256']
 s.update(src=a['src'],sha256=a['sha256'],width=a['width'],height=a['height'])
for r in art:
 if r['src']:
  assert r['verified'] and hashlib.sha256((root/r['src']).read_bytes()).hexdigest()==r['sha256']
d['characters']=art
code="""(function(root){'use strict';const data=PAYLOAD;
const pick=(v,lang='ja')=>v[lang==='en'?'en':'ja'];
const api={...data,movie:(id,lang='ja')=>data.shots.filter(s=>s.movie===String(id)).map(s=>({...s,title:pick(s.title,lang),text:pick(s.text,lang)})),get:id=>data.shots.find(s=>s.id===id),character:id=>data.characters.find(c=>c.id===id)};
if(typeof module!=='undefined')module.exports=api;else root.ArcCinematicData=api;
})(globalThis);\n""".replace('PAYLOAD',json.dumps(d,ensure_ascii=False,separators=(',',':')))
(root/'game/dist/cinematic-data.js').write_text(code)
print('Compiled23 camera/effect scripts; verified character JPEGs:',sum(bool(r['src']) for r in art))
