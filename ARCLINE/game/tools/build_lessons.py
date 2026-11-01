"""Synchronize curriculum with the authored campaign and compile its runtime."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[2]
campaign=json.loads((root/'design/runtime_campaign_20x5.json').read_text())
p=root/'design/preview_curriculum.json';d=json.loads(p.read_text());d['revision']='5'
d['stages']=[{'stage':s['id'],'name':s['name'],'theme':s['themeName'],'entry':s['lesson'],'skillChoices':[p['skillId'] for p in s['pickups'] if p['kind']=='skill'],'weaponCapsules':[p['weaponId'] for p in s['pickups'] if p['kind']=='trial']} for s in campaign['levels']]
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
header="(function(root){'use strict';\nconst E=typeof module!=='undefined'?require('./engine.js'):root.ArcEngine;\nconst curriculum="+json.dumps(d,ensure_ascii=False,separators=(',',':'))+';\n'
(root/'game/dist/lessons.js').write_text(header+(root/'game/src/lessons-runtime.js').read_text())
print('Compiled5.0 curriculum from100 actual stage lessons')
