"""Compile localized, optional story records. Does not add loading delays."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
d=json.loads((ROOT.parent/'design/narrative_0_11.json').read_text())
assert len(d['chapters'])==10 and len(d['guardians'])==20 and len(d['relations'])==5
assert [x['stage'] for x in d['guardians']]==list(range(5,101,5))
js="""(function(root){'use strict';
const data=PAYLOAD,pick=(value,language='ja')=>value?.[language==='en'?'en':'ja']||'';
const freeze=o=>{Object.freeze(o);for(const v of Object.values(o))if(v&&typeof v==='object'&&!Object.isFrozen(v))freeze(v);return o;};freeze(data);
const chapter=stage=>data.chapters[Math.max(0,Math.min(9,Math.floor((stage-1)/10)))];
const guardian=stage=>data.guardians.find(g=>g.stage===stage)||null;
function entry(stage,language){const g=guardian(stage),c=chapter(stage);return g?{kind:language==='en'?(g.kind==='boss'?'CHAPTER GUARDIAN':'MID-GUARDIAN'):(g.kind==='boss'?'章ボス':'中ボス'),name:pick(g.name,language),feature:pick(g.feature,language),line:pick(g.entrance,language)}:stage%10===1?{kind:language==='en'?'CHAPTER '+c.id:'第'+c.id+'章',name:pick(c.title,language),feature:pick(c.opening,language),line:''}:null;}
function result(stage,language){const g=guardian(stage);return g?{id:g.id,focus:chapter(stage).focus,aftermath:pick(g.aftermath,language),response:pick(g.response,language)}:null;}
const api=Object.freeze({revision:data.revision,pick,chapter,guardian,entry,result,chapters:data.chapters,guardians:data.guardians,relations:data.relations,premise:data.premise,presentation:data.presentation});
if(typeof module!=='undefined')module.exports=api;else root.ArcStory=api;
})(globalThis);
""".replace('PAYLOAD',json.dumps(d,ensure_ascii=False,separators=(',',':')))
(ROOT/'dist/story.js').write_text(js)
print('Compiled 10 chapters / 20 guardian stories / 5 machine relationships')
