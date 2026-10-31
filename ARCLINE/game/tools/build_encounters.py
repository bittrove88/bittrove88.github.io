"""Compile combat/anchor definitions shared by the main thread and CPU worker."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
d=json.loads((ROOT/'visual/encounters.json').read_text())
assert [len(d[k]) for k in ['enemies','midbosses','bosses']]==[12,10,10]
payload=json.dumps(d,ensure_ascii=False,separators=(',',':'))
code="""(function(root){'use strict';
const data=PAYLOAD;
const all=[...data.enemies,...data.midbosses,...data.bosses];
const freeze=o=>{Object.freeze(o);for(const v of Object.values(o))if(v&&typeof v==='object'&&!Object.isFrozen(v))freeze(v);return o;};freeze(data);
const byId=new Map(all.map(x=>[x.id,x]));
function get(id){return byId.get(id)||null;}
function forSpec(spec){return get(spec.encounterId)|| (spec.midboss?data.midbosses[Math.floor((spec.id-1)/10)]:spec.boss?data.bosses[Math.floor((spec.id-1)/10)]:data.enemies[0]);}
const guardian=spec=>!!(spec.boss||spec.midboss);
const api=Object.freeze({revision:data.revision,all:Object.freeze(all),enemies:data.enemies,midbosses:data.midbosses,bosses:data.bosses,get,forSpec,guardian});
if(typeof module!=='undefined')module.exports=api;else root.ArcEncounters=api;
})(globalThis);
""".replace('PAYLOAD',payload)
(ROOT/'dist/encounters.js').write_text(code)
print('Compiled32 enemy combat/anchor definitions')
