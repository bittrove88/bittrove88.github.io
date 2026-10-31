'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const J=require('../dist/journal.js'),S=require('../dist/save.js'),R=require('../dist/campaign-run.js'),E=require('../dist/engine.js');
const out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-journey';fs.mkdirSync(out,{recursive:true});let checks=0;
const ok=(v,m)=>{checks++;assert(v,m);},equal=(a,b,m)=>{checks++;assert.deepEqual(a,b,m);};
equal([J.machines.length,J.chapters.length,J.acts.length,J.ids.length],[10,10,5,57],'complete player and journey records');
equal(new Set(J.ids).size,J.ids.length,'unique persistent record IDs');
for(const m of J.machines){
 ok(S.characterIds.includes(m.id),'known player machine '+m.id);
 for(const field of ['name','desire','past','flaw','choice','ending','line'])for(const lang of ['ja','en'])ok(J.pick(m[field],lang).length>(field==='name'?1:5),'complete bilingual player record '+m.id+' '+field+' '+lang);
 const first=S.decode(null);J.markRead(first,['machine:'+m.id+':profile']);ok(first.journal.readIds.includes('machine:'+m.id+':profile'),'all player backgrounds readable initially');
 ok(!J.markRead(first,['machine:'+m.id+':choice','machine:'+m.id+':ending']),'future growth cannot be marked read');
}
const progression=[];
for(let cleared=0;cleared<=100;cleared++){
 const data=S.decode(JSON.stringify({schemaVersion:5,cleared})),available=J.availableIds(data);
 equal(new Set(available).size,available.length,'no duplicated unlocked records '+cleared);
 for(const c of J.chapters){equal(available.includes('chapter:'+c.id+':opening'),cleared>=c.start-1,'chapter entry gate '+cleared+' '+c.id);equal(available.includes('chapter:'+c.id+':cleared'),cleared>=c.end,'chapter completion gate '+cleared+' '+c.id);}
 for(const a of J.acts)equal(available.includes('act:'+a.id),cleared>=a.start-1,'act entry gate '+cleared+' '+a.id);
 for(const m of J.machines){equal(available.includes('machine:'+m.id+':choice'),cleared>=m.chapter*10,'personal growth gate '+cleared+' '+m.id);equal(available.includes('machine:'+m.id+':ending'),cleared===100,'afterword gate '+cleared+' '+m.id);}
 equal(available.includes('epilogue'),cleared===100,'epilogue gate '+cleared);ok(J.markRead(data,available),'first read updates records '+cleared);equal(J.unread(data),0,'read all available '+cleared);ok(!J.markRead(data,available),'rereading is idempotent '+cleared);
 const roundtrip=S.decode(JSON.stringify(data));equal(roundtrip.journal,data.journal,'reading survives save roundtrip '+cleared);progression.push({cleared,available:available.length});
}
const fresh=S.decode(null);ok(!fresh.journal.introSeen,'fresh lobby can show its short opening');J.markRead(fresh,['introduction']);ok(fresh.journal.introSeen,'reading introduction suppresses lobby repeat');
const malicious=S.decode(JSON.stringify({schemaVersion:5,cleared:0,preferences:{language:'xx',controls:'up'},journal:{readIds:['introduction','machine:gun:ending','unknown','<script>','introduction']}}));equal(malicious.preferences,{language:null,controls:null},'invalid preferences fall back safely');equal(malicious.journal.readIds,['introduction'],'future and unknown records cannot unlock themselves');
for(const stage of [1,5,9,11,15,99])equal(J.chapterMessage(stage),'','ordinary wins do not add chapter text');for(let stage=10;stage<=100;stage+=10)for(const lang of ['ja','en'])ok(J.chapterMessage(stage,lang).length>5,'bilingual chapter line '+stage+' '+lang);
const practiceData=S.decode(JSON.stringify({cleared:10})),practice=R.begin(practiceData,5),before=JSON.stringify(practiceData);R.finish(practiceData,practice,{stage:5,result:'win',pendingLoot:[]});equal(JSON.stringify(practiceData),before,'practice never changes narrative progress');
const prior=process.env.ARCLINE_PREVIOUS_DIST,preserved=[];
(async()=>{
 let migration=null;
 if(prior){
  const old=require(path.resolve(prior,'save.js')),raw=JSON.stringify({...old.decode(null),cleared:16,equippedCharacterId:'rin',unlockedWeaponIds:S.weaponIds,collectedCosmeticIds:S.cosmeticIds,chapterRun:R.checkpoint(17,{weapons:{W13:2,W20:1},skills:{S_GUARD:2,BURST:1}},[],'journal-migration',20261031)}),decoded=S.decode(raw);
  equal(decoded.legacyBackup,raw,'original0.9 save retained exactly');equal(decoded.chapterRun,JSON.parse(raw).chapterRun,'all entry stock and seed preserved');ok(decoded.equippedCharacterId==='rin'&&decoded.unlockedWeaponIds.length===20&&decoded.collectedCosmeticIds.length===37,'ownership and selection retained');ok(decoded.journal.introSeen,'existing journey does not show a new introduction');equal(decoded.journal.readIds,[],'migration does not invent reading history');
  assert.throws(()=>old.decode(JSON.stringify(decoded)));checks++;let oldWrites=0;const oldClient=old.create({load:async()=>JSON.stringify(decoded),save:async()=>oldWrites++});await oldClient.load();await oldClient.save();ok(!oldClient.ready&&oldWrites===0,'actual0.9 client cannot overwrite schema5');
  const backups=[],store={raw};let fail=false;const adapter={load:async()=>store.raw,backup:async value=>backups.push(value),save:async value=>{if(fail)throw Error('full');store.raw=value;}};
  const current=S.create(adapter);await current.load();J.markRead(current.data,['machine:rin:profile']);current.data.preferences={language:'en',controls:'right'};fail=true;ok(!await current.save()&&current.dirty,'failed journal save stays dirty');equal(store.raw,raw,'failed save leaves old inventory intact');fail=false;ok(await current.save()&&!current.dirty,'retry saves records and settings together');const loaded=S.create(adapter);await loaded.load();equal(loaded.data.journal,current.data.journal,'new records survive reload');equal(loaded.data.preferences,{language:'en',controls:'right'},'settings survive reload');equal(backups,[raw],'reload never overwrites original backup');equal(loaded.data.chapterRun,decoded.chapterRun,'record writes leave inventory untouched');
  for(const file of ['engine.js','physics.js','geometry.js','levels.js','weapons.js','combat.js','characters.js','render.js','preview.js','lessons.js','cpu-worker.js','inventory.js','campaign-run.js','aim-guide.js','viewport.js','fullscreen.js']){const oldBytes=fs.readFileSync(path.join(prior,file)),currentBytes=fs.readFileSync(path.resolve(__dirname,'../dist',file));equal(currentBytes,oldBytes,'sheet-dependent battle module unchanged '+file);preserved.push({file,sha256:crypto.createHash('sha256').update(currentBytes).digest('hex')});}
  migration={from:'0.9.0',schema:S.schemaVersion,oldWriteBlocked:true,rawBackupPreserved:true};
 }
 const report={status:'PASS',checks,records:J.ids.length,progression,migration,preserved,scope:'Bilingual player biographies,chapter/act/progression gates across all101 clear counts,spoiler-safe read IDs,idempotent reading,optional actual0.9 save migration/back-write/failure/reload and byte preservation of16 battle/map/art/effect modules. Browser reading,input and publication are checked separately.'};
 fs.writeFileSync(path.join(out,'JOURNAL.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:'PASS',checks,records:J.ids.length,preserved:preserved.length,migration},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
