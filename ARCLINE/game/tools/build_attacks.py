"""Generate the shared, immutable attack definitions used by runtime and review."""
import json
from release import ROOT
data=json.loads((ROOT/'design/attacks/definitions.json').read_text())
for category in ['weapons','specials','enemyTechniques']:
    for key,row in data[category].items():
        assert all(row.get(k) for k in ['name','nameJa','trajectory','impact','effect']), (category,key)
        assert row['appearance']['color'].startswith('#')
code='/* Generated from design/attacks/definitions.json. */\n(function(root){"use strict";const data='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';function freeze(o){Object.freeze(o);for(const v of Object.values(o))if(v&&typeof v==="object"&&!Object.isFrozen(v))freeze(v);return o;}freeze(data);if(typeof module!=="undefined")module.exports=data;else root.ArcAttackCatalog=data;})(globalThis);\n'
(ROOT/'game/dist/attack-catalog.js').write_text(code)
