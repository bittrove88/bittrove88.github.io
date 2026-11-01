'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const D=require('../dist/cinematic-data.js'),S=require('../dist/story.js'),Crew=require('../dist/crew.js'),Save=require('../dist/save.js');
const root=path.resolve(__dirname,'../../..'),out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-story-emotion-0141';fs.mkdirSync(out,{recursive:true});let checks=0;const ok=(v,m)=>{checks++;assert(v,m);};
const baseline=JSON.parse(cp.execFileSync('git',['show','3bdbf4f:ARCLINE/design/narrative_0_13.json'],{cwd:root,encoding:'utf8'}));
ok(S.revision==='0.14.1'&&S.presentation.saveNarrativeVersion==='0.13.0','editorial revision and existing save namespace are separate');
for(const key of ['chapters','relations','stageClears','foreshadow','world'])ok(JSON.stringify(S[key])===JSON.stringify(baseline[key]),'approved world/100-stage structure preserved '+key);
ok(JSON.stringify(S.presentation.returnOrder)===JSON.stringify(Crew.rows.map(r=>r.id)),'return lamps follow established meeting order');
ok(S.prologue.frames[0].text.ja===baseline.prologue.frames[0].text.ja&&S.prologue.frames[1].text.en===baseline.prologue.frames[1].text.en,'ordinary life and Divide parent prose kept');
ok(D.get('P03-02').symbolic&&D.get('P03-02').durationMs===5000&&!/昔|記録|left this harbour/.test(JSON.stringify(D.get('P03-02').text)),'gathering is a brief future image, not a newly invented historical event');
const timing=[];
for(const lang of ['ja','en']){
 const frames=D.movie('epilogue',lang,{cleared:100}),home=frames.find(s=>s.id==='E02-01'),welcome=frames.find(s=>s.id==='E02-02'),reply=frames.find(s=>s.id==='E02-03');
 let previous=0;
 for(let ms=0;ms<home.durationMs;ms+=50){const t=D.clock(home,ms);ok(t.litCount>=previous&&t.litCount<=10,'return lights only turn on '+lang+'/'+ms);previous=t.litCount;if(ms>=6000){ok(t.quiet&&t.cue===null,'silence has no queued caption '+lang+'/'+ms);ok(t.cameraMs===6000&&t.effectsMs===6000,'silence freezes camera and effects '+lang+'/'+ms);}}
 ok(D.clock(home,4949).litCount===9&&D.clock(home,4950).litCount===10,'the tenth lamp is distinct '+lang);
 ok(D.clock(home,5999).phase==='register'&&D.clock(home,6000).quiet&&D.clock(home,7199).quiet,'longer tenth hold then 1.2 seconds of silence '+lang);
 ok(welcome.cues.length===1&&welcome.cues[0].mode==='full'&&welcome.cues[0].emphasis==='greeting','welcome appears alone '+lang);
 ok(reply.cues.length===1&&reply.cues[0].minHoldMs>=2000&&reply.cues[0].minHoldMs<=3000,'reply has a dedicated afterglow '+lang);
 for(const movie of ['prologue','30','60','epilogue'])for(const s of D.movie(movie,lang)){
  let end=0;for(const c of s.cues){ok(c.sceneId===s.scene&&c.shotId===s.id&&c.locale===lang,'cue belongs to canonical parent/shot/locale '+c.textKey);ok(c.startMs>=end&&c.endMs-c.startMs>=c.minHoldMs,'separate readable phrases without overlap '+c.textKey);ok(c.skippable,'all authored moments allow skip '+c.textKey);end=c.endMs;}
  ok(s.durationMs>=end,'auto change waits for full caption and hold '+s.id+'/'+lang);timing.push({shot:s.id,locale:lang,durationMs:s.durationMs,cues:s.cues.map(c=>({key:c.textKey,startMs:c.startMs,endMs:c.endMs}))});
 }
 for(let n=0;n<=100;n++){
  for(const id of ['prologue','30','60','epilogue'])ok(D.movie(id,lang,{cleared:n}).length>0===(id==='prologue'||id==='epilogue'&&n===100||['30','60'].includes(id)&&n>=Number(id)),'movie text/preload access follows progress '+id+'/'+n);
  if(n<100)ok(!S.actBody(S.acts[4],n,lang).match(/アークハート|Archeart|heart of the world|世界の心臓/),'late act still withholds sender/core identity '+n+'/'+lang);
 }
 const e04=S.movie('epilogue',lang)[3].text;
 ok(lang==='ja'?e04.includes('描いた')&&e04.includes('書き添えた'):e04.includes('draws')&&e04.includes('adds a small note'),'drawing and writing are both in canonical ending '+lang);
 ok(!/おかえり|ただいま|Welcome home|We are home/.test(S.result(100,lang).aftermath+S.result(100,lang).response),'final clear does not pre-empt the homecoming dialogue '+lang);
}
for(const [id,stage]of [['koro',10],['hibari',25],['rin',60],['yui',80]]){const m=S.machines.find(m=>m.id===id),old=baseline.machines.find(m=>m.id===id);ok(m.joinStage===stage&&m.line.ja===old.line.ja,'joining line does not replace permanent character line '+id);ok(m.joinLine.ja.length>=20&&m.joinLine.ja.length<=35,'one short contextual joining line '+id);}
const old=Save.decode(JSON.stringify({schemaVersion:8,campaignResetVersion:1,cleared:100,equippedCharacterId:'rin',unlockedCharacterIds:Crew.ids,joinedCharacterIds:Crew.ids,journal:{narrativeVersion:'0.13.0',introSeen:true,moviesSeen:['prologue','30','60'],pendingMovie:'epilogue',readIds:['introduction','guardian:90','machine:rin:profile']}}));
ok(old.cleared===100&&old.equippedCharacterId==='rin'&&old.journal.pendingMovie==='epilogue'&&old.journal.moviesSeen.length===3&&old.journal.readIds.includes('guardian:90'),'existing progress, selection, seen/read and pending ending survive');
ok(S.result(70).discovery.kind==='blanks'&&S.result(90).discovery.kind==='names'&&S.result(90).discovery.textStartMs>600+9*220,'names match before explanatory subtitles begin');
ok(D.get('I30-02').answerBeatsMs[1]-D.get('I30-02').answerBeatsMs[0]===1200,'answers have a quiet interval');
fs.writeFileSync(path.join(out,'EMOTION_CONTENT.json'),JSON.stringify({status:'PASS',checks,revision:S.revision,timing,saveNamespace:S.presentation.saveNarrativeVersion,scope:'Canonical bilingual cue provenance and reading time; ten lamps then silence/welcome/reply; stage/movie reveal gates; short joining dialogue; unchanged world, chronology and schema8 persistence.'},null,2)+'\n');console.log(JSON.stringify({status:'PASS',checks}));
