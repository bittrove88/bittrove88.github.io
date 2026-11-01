"""Compile the shared ownership and story-joining schedule."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[2]
rows=json.loads((root/'design/expedition_013/crew.json').read_text())
assert [r['stage'] for r in rows]==[0,5,10,15,20,25,30,40,60,80]
code="""(function(root){'use strict';
const rows=PAYLOAD,ids=rows.map(r=>r.id),get=id=>rows.find(r=>r.id===id)||null;
const normalize=value=>['gun',...new Set((Array.isArray(value)?value:[]).filter(id=>ids.includes(id)&&id!=='gun'))];
const at=stage=>rows.find(r=>r.stage===stage&&stage>0)||null;
function join(data,stage){data.joinedCharacterIds=normalize(data.joinedCharacterIds);data.unlockedCharacterIds=normalize(data.unlockedCharacterIds);const r=at(stage);if(!r||data.joinedCharacterIds.includes(r.id))return null;const alreadyOwned=data.unlockedCharacterIds.includes(r.id);data.joinedCharacterIds.push(r.id);if(!alreadyOwned)data.unlockedCharacterIds.push(r.id);data.pendingRecruit={id:r.id,stage,alreadyOwned};return data.pendingRecruit;}
const api={rows,ids,get,normalize,at,join,owned:(data,id)=>normalize(data?.unlockedCharacterIds).includes(id),joinedAt:cleared=>rows.filter(r=>r.stage<=cleared).map(r=>r.id)};
if(typeof module!=='undefined')module.exports=api;else root.ArcCrew=api;
})(globalThis);
""".replace('PAYLOAD',json.dumps(rows,ensure_ascii=False,separators=(',',':')))
(root/'game/dist/crew.js').write_text(code)
print('Compiled10 machines and9 recruitment milestones')
