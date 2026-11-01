"""Compile 0.13 story slots; handoff prose never overwrites gameplay data."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
d=json.loads((ROOT.parent/'design/narrative_0_13.json').read_text())
assert len(d['chapters'])==10 and len(d['guardians'])==20 and len(d['machines'])==10
assert len(d['stageClears'])==80 and sorted([x['stage'] for x in d['stageClears']]+[g['stage'] for g in d['guardians']])==list(range(1,101))
js="""(function(root){'use strict';
const data=PAYLOAD,pick=(v,l='ja')=>v?.[l==='en'?'en':'ja']||'';
const freeze=o=>{Object.freeze(o);for(const v of Object.values(o))if(v&&typeof v==='object'&&!Object.isFrozen(v))freeze(v);return o;};freeze(data);
const chapter=stage=>data.chapters[Math.max(0,Math.min(9,Math.floor((stage-1)/10)))];
const guardian=stage=>data.guardians.find(g=>g.stage===stage)||null;
function stageName(spec,language='ja',entered=false,cleared=0){return spec.id===100&&!entered&&cleared<100?(language==='en'?'The Dawn Core':'夜明けの核'):language==='en'?spec.nameEn:spec.name;}
function entry(stage,l){const g=guardian(stage),c=chapter(stage);return g?{kind:l==='en'?(g.kind==='boss'?'AREA GUARDIAN':'MID-GUARDIAN'):(g.kind==='boss'?'大ボス':'中ボス'),name:pick(g.name,l),feature:pick(g.feature,l),line:pick(g.entrance,l)}:stage%10===1?{kind:l==='en'?'CHAPTER '+c.id:'第'+c.id+'章',name:pick(c.title,l),feature:pick(c.opening,l),line:''}:null;}
function result(stage,l='ja'){const g=guardian(stage),c=chapter(stage),normal=data.stageClears.find(r=>r.stage===stage);return {id:g?.id||'stage:'+stage,kind:stage===100?'final':g?.kind||'normal',focus:c.focus,title:l==='en'?(stage===100?'ARCLINE RESTORED':g?.kind==='boss'?'AREA RESTORED':g?'MECHANISM STOPPED':'ROUTE SECURED'):(stage===100?'アークライン 全線復旧':g?.kind==='boss'?'第'+c.id+'区間 復旧':g?'閉鎖機構を停止':'経路を確保'),area:stage%10===0?(l==='en'?c.themesEn:c.themes):'',aftermath:pick(g?.aftermath||normal.event,l),response:g?pick(g.response,l):'',stage};}
function movie(id,l='ja'){const frames=id==='prologue'?data.prologue.frames:id==='epilogue'?data.epilogue.frames:data.movies[id]||[];return frames.map(f=>({...f,title:pick(f.title,l),text:pick(f.text,l)}));}
function past(machine,cleared){return machine.publicPast&&cleared<90?machine.publicPast:machine.past;}
function actBody(act,cleared,l){return pick(act.revealAt&&cleared<act.revealAt?act.publicBody:act.body,l);}
const api=Object.freeze({...data,pick,chapter,guardian,entry,result,movie,past,actBody,stageName});if(typeof module!=='undefined')module.exports=api;else root.ArcStory=api;
})(globalThis);
""".replace('PAYLOAD',json.dumps(d,ensure_ascii=False,separators=(',',':')))
(ROOT/'dist/story.js').write_text(js)
print('Compiled0.13:100 clear slots /20 guardians /3 opening+4 ending frames /30,60 interludes')
