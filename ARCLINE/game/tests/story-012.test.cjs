'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process'),crypto=require('node:crypto');
const S=require('../dist/story.js'),J=require('../dist/journal.js'),Save=require('../dist/save.js'),Run=require('../dist/campaign-run.js'),E=require('../dist/engine.js');
const source=require('../../design/story_0_12/content_pack_ja.json'),out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-story-012';fs.mkdirSync(out,{recursive:true});let checks=0;const ok=(v,m)=>{checks++;assert(v,m);};
(async()=>{
const slots=[];
for(let n=1;n<=100;n++){
 const g=S.guardian(n),c=source.chapters[Math.floor((n-1)/10)],original=n%10===0?c.boss:n%10===5?c.mid:null;
 for(const language of ['ja','en']){const r=S.result(n,language);ok(r.aftermath.length>8&&r.title.length>2,'visible localized aftermath '+n+'/'+language);ok(r.kind===(n===100?'final':n%10===0?'boss':n%10===5?'midboss':'normal'),'distinct result tier '+n);if(original){if(language==='ja'){ok(r.aftermath===original.event&&r.response===original.reply,'supplied canonical dialogue '+n);ok(S.pick(g.entrance,language)===original.line,'supplied entrance '+n);}ok(r.response.length>4,'guardian reply '+n);}ok(!!r.area===(n%10===0),'area restoration only at chapter end '+n);}
 slots.push({stage:n,kind:S.result(n).kind,source:original?'supplied manuscript':'new connecting prose'});
}
for(const [i,p]of source.prologue.panels.entries())ok(S.movie('prologue')[i].text===p.text,'canonical prologue '+p.id);
for(const [i,p]of source.epilogue.panels.entries())ok(S.movie('epilogue')[i].text===p.text,'complete canonical epilogue '+p.id);
ok(S.movie('30').length===1&&S.movie('60').length===1,'two spoiler-safe interludes');
ok(!JSON.stringify([S.movie('prologue'),S.movie('30'),S.movie('60')]).includes('アークハート'),'early films do not reveal core name');
ok(S.result(70).aftermath.includes('十の空欄')&&S.result(80).aftermath.includes('返事')&&S.result(90).aftermath.includes('10機全員')&&S.result(95).aftermath.includes('宛先'),'70/80/90/95 clues remain in order');
for(let n=0;n<=100;n++){
 const available=J.availableIds({cleared:n});for(const g of S.guardians)ok(available.includes('guardian:'+g.stage)===(n>=g.stage),'guardian journal gate '+n+'/'+g.stage);
 ok(available.includes('epilogue')===(n===100),'ending journal unlock '+n);
 const normalized=J.normalize({moviesSeen:['prologue','30','60','epilogue','other','prologue'],pendingMovie:'epilogue'},{cleared:n});ok(normalized.moviesSeen.length===1+Number(n>=30)+Number(n>=60)+Number(n===100),'movie unlock normalization '+n);ok((normalized.pendingMovie==='epilogue')===(n===100),'pending ending requires actual clear '+n);
 ok(S.stageName(E.levels[99],'ja',false,n).includes('アークハート')===(n===100),'stage picker core name gate '+n);
}
for(const id of ['gun','ban']){const m=S.machines.find(x=>x.id===id);ok(!S.past(m,89).ja.includes('帰還')&&S.past(m,90).ja.includes('帰還'),'return identity withheld '+id);}
ok(!S.actBody(S.acts[3],69,'ja').includes('十個')&&!S.actBody(S.acts[3],79,'ja').includes('緊急停止は正しかった')&&S.actBody(S.acts[3],80,'ja').includes('十個'),'act4 records wait for80');
ok(!S.actBody(S.acts[4],89,'ja').includes('10機')&&S.actBody(S.acts[4],90,'ja').includes('10機'),'act5 identity reveal');
const raw=JSON.stringify({schemaVersion:6,contentRevision:'4.2.0',cleared:54,equippedCharacterId:'rin',difficulty:'hard',preferences:{language:'en',controls:'left'},chapterRun:Run.checkpoint(55,{weapons:{W06:2},skills:{S_GUARD:1}},[],'story-migration',123),journal:{introSeen:true,readIds:['introduction']},legacyBackup:'the-original-backup'}),m=Save.decode(raw);
ok(m.schemaVersion===7&&m.contentRevision==='4.2.1','schema6 to7');ok(m.legacyBackup==='the-original-backup','first backup retained');ok(m.chapterRun.inventory.weapons.W06===2&&m.chapterRun.inventory.skills.S_GUARD===1&&m.chapterRun.stage===55,'stock and checkpoint retained');ok(m.preferences.language==='en'&&m.difficulty==='hard'&&m.equippedCharacterId==='rin','preferences retained');ok(m.journal.readIds.length===0&&m.journal.moviesSeen.length===0,'revised text is unread and new opening is offered');
const invalid=J.normalize({moviesSeen:'epilogue',readIds:7,pendingMovie:'bad'},{cleared:0});ok(!invalid.moviesSeen.length&&!invalid.readIds.length&&!invalid.pendingMovie,'malformed metadata is harmless');
let persisted=null,fail=false;const store=Save.create({load:async()=>raw,save:async value=>{if(fail)throw Error('offline');persisted=value;}});await store.load();store.data.cleared=100;store.data.journal.pendingMovie='epilogue';await store.save();const reload=Save.decode(persisted);ok(reload.journal.pendingMovie==='epilogue','interrupted ending resumes from saved pending flag');fail=true;store.data.journal.pendingMovie=null;ok(!await store.save()&&store.dirty,'failed story save remains dirty');fail=false;ok(await store.save()&&!store.dirty,'story save can retry');
const oldSaveSource=cp.execFileSync('git',['show','431922d98265a390337eb5acff1fbe8ba7782618:ARCLINE/game/dist/save.js'],{cwd:path.resolve(__dirname,'../../..'),encoding:'utf8'});let oldModule={exports:{}};new Function('module','require',oldSaveSource)(oldModule,require('node:module').createRequire(path.resolve(__dirname,'../dist/save.js')));assert.throws(()=>oldModule.exports.decode(JSON.stringify(m)),/Unsupported save version/);checks++;
const protectedFiles=['levels.js','skills.js','weapons.js','inventory.js','campaign-run.js','geometry.js','encounters.js','engine.js','characters.js','actor-bodies.js','visual-art.js','visual-style.js','visual-registry.js','viewport.js','fullscreen.js','lessons.js'];
const preserved=protectedFiles.map(file=>{const current=fs.readFileSync(path.resolve(__dirname,'../dist',file)),before=cp.execFileSync('git',['show','431922d98265a390337eb5acff1fbe8ba7782618:ARCLINE/game/dist/'+file],{cwd:path.resolve(__dirname,'../../..')});ok(current.equals(before),'unchanged 0.12 core module byte preservation '+file);return {file,sha256:crypto.createHash('sha256').update(current).digest('hex')};});
const report={status:'PASS',checks,clearSlots:slots,migration:{from:6,to:7,stockPreserved:true,oldBuildWriteBlocked:true,pendingEndingResumes:true},preserved,scope:'100 bilingual result slots; exact supplied20 guardian dialogues and7 prologue/epilogue panels; all101 progression gates; save/retry/stock migration;16 unaffected core modules byte-identical to published0.11; combat/FX/aim/preview changed only by reviewed PR #26 and tested separately. These are content/persistence checks, not100 native combat completions.'};fs.writeFileSync(path.join(out,'STORY_CONTENT.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:'PASS',checks,slots:100,preserved:preserved.length}));
})().catch(e=>{console.error(e);process.exitCode=1;});
