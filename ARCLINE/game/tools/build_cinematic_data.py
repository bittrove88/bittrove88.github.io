"""Compile approved shot choreography and only independently verified character art."""
from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parents[2];folder=root/'design/cinematics_014';d=json.loads((folder/'shots.json').read_text());assets=json.loads((root/'assets/cinematics/manifest.json').read_text());art=json.loads((folder/'character_images.json').read_text())['characters']
n=json.loads((root/'design/narrative_0_13.json').read_text())
parents=n['prologue']['frames']+n['epilogue']['frames']+sum(n['movies'].values(),[])
all_cues=[c for p in parents for c in p['subtitleCues']]
assert len({c['textKey'] for c in all_cues})==len(all_cues)
d['narrativeRevision']=n['revision'];d['returnOrder']=n['presentation']['returnOrder']
assert [r['id'] for r in d['shots']]==[r['shot'] for r in assets['shots']]
for s,a in zip(d['shots'],assets['shots']):
 assert hashlib.sha256((root/a['src']).read_bytes()).hexdigest()==a['sha256']
 s.update(src=a['src'],sha256=a['sha256'],width=a['width'],height=a['height'])
 s['cues']=[c for c in all_cues if c['shotId']==s['id']]
 assert s['cues'] and all(c['sceneId']==s['scene'] and c['skippable'] and c['minHoldMs']>=1500 for c in s['cues'])
 s['title']=s['cues'][0]['title'];s['text']={l:'\n'.join(c['text'][l] for c in s['cues']) for l in ['ja','en']}
 s['leadIn']=s['cues'][0]['startAfterMs']/1000;s['hold']=s['cues'][-1]['minHoldMs']/1000
for r in art:
 if r['src']:
  assert r['verified'] and hashlib.sha256((root/r['src']).read_bytes()).hexdigest()==r['sha256']
d['characters']=art
code=r"""(function(root){'use strict';const data=PAYLOAD;
const pick=(v,lang='ja')=>v[lang==='en'?'en':'ja'];
function localize(s,lang='ja'){
 let end=0;const cues=s.cues.map(c=>{const text=pick(c.text,lang),startMs=Math.max(c.startAfterMs,end?end+250:0),typeMs=c.mode==='full'?0:Array.from(text).length/32*1000,readMs=lang==='en'?text.trim().split(/\s+/).length/3.5*1000:Array.from(text).length/12*1000;end=startMs+Math.max(typeMs+c.minHoldMs,readMs);return {...c,text,title:pick(c.title,lang),locale:lang,startMs,endMs:end,typeMs};});
 return {...s,title:pick(s.title,lang),text:pick(s.text,lang),cues,durationMs:Math.max(s.durationMs,end),locale:lang};
}
function pausedTime(ms,windows){let total=0,previous=0;for(const [a,b]of windows.filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0])){const start=Math.max(previous,a),end=Math.min(ms,b);if(end>start)total+=end-start;previous=Math.max(previous,b);}return Math.max(0,ms-total);}
function clock(shot,ms){
 const s=typeof shot.title==='string'?shot:localize(shot),h=s.homecoming,last=h?h.startAfterMs+9*h.intervalMs:0,quietStart=h?last+h.tenthHoldMs:Infinity,quietEnd=h?quietStart+h.silenceMs:Infinity,quiet=ms>=quietStart&&ms<quietEnd;
 let cueIndex=-1;for(let i=0;i<s.cues.length;i++)if(ms>=s.cues[i].startMs)cueIndex=i;
 const cue=quiet?null:s.cues[cueIndex]||null,pauses=field=>[...(h?[[quietStart,quietEnd]]:[]),...s.cues.filter(c=>c[field]).map(c=>[c.startMs,c.endMs])];
 return {cue,cueIndex,quiet,litCount:h?Math.max(0,Math.min(10,1+Math.floor((ms-h.startAfterMs)/h.intervalMs))):0,cameraMs:pausedTime(ms,pauses('pauseCamera')),effectsMs:pausedTime(ms,pauses('pauseEffects')),durationMs:s.durationMs,phase:quiet?'silence':h?'register':cue?.emphasis||'waiting',quietStart,quietEnd};
}
const canMovie=(id,cleared)=>id==='prologue'||id==='epilogue'&&cleared>=100||['30','60'].includes(String(id))&&cleared>=Number(id);
const api={...data,localize,clock,canMovie,movie:(id,lang='ja',access=null)=>access&&!access.spoilers&&!canMovie(String(id),access.cleared||0)?[]:data.shots.filter(s=>s.movie===String(id)).map(s=>localize(s,lang)),get:id=>data.shots.find(s=>s.id===id),character:id=>data.characters.find(c=>c.id===id)};
if(typeof module!=='undefined')module.exports=api;else root.ArcCinematicData=api;
})(globalThis);
""".replace('PAYLOAD',json.dumps(d,ensure_ascii=False,separators=(',',':')))
(root/'game/dist/cinematic-data.js').write_text(code)
print('Compiled23 camera/effect scripts; verified character JPEGs:',sum(bool(r['src']) for r in art))
