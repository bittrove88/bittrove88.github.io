const completeFinalTeam=require('./final-team-fixture.cjs');
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const I=require('../dist/inventory.js'),R=require('../dist/campaign-run.js'),S=require('../dist/save.js'),E=require('../dist/engine.js');
let checks=0;const ok=(v,m)=>{checks++;assert(v,m);},equal=(a,b,m)=>{checks++;assert.deepEqual(a,b,m);};
const profile=cleared=>S.decode(JSON.stringify({schemaVersion:8,campaignResetVersion:S.resetVersion,contentRevision:S.revision,unlockedCharacterIds:S.characterIds,cleared,unlockedWeaponIds:E.weapons.map(w=>w.id),equippedWeaponId:'W20',equippedCharacterId:'yui',difficulty:'hard'}));
const battle=context=>E.campaign(context.entry.stage,{battleInventory:context.entry.inventory,battleMode:context.entry.mode,matchSeed:context.entry.seed,pickupLedger:context.entry.pickupLedger,pendingLoot:context.entry.pending});
const victory=(s,stock)=>Object.assign(completeFinalTeam(s),{result:'win',...(stock?{weaponStock:stock.weapons,skills:stock.skills}:{}),pendingLoot:[]});
const pickup=(s,id,kind,extras={})=>{const item={id,kind,x:200,y:250,placementId:`L${String(s.stage).padStart(3,'0')}:${id}`,collected:false,...extras};s.pickups.push(item);return item;};

equal(I.normalize({weapons:{W01:3,W02:999,W06:2,W13:1,W14:3,BAD:1},skills:{BURST:2,PULL:3,SWAP:1,BAD:2}}),{weapons:{W02:6,W06:2,W13:1,W14:3},skills:{BURST:2,PULL:3,SWAP:1}},'sanitize ids, counts, and type limits');
const p=profile(0),c=R.begin(p,1,{seed:77}),s=battle(c);
equal(s.weaponStock,{},'chapter starts with no finite weapon despite permanent ownership');equal(s.skills,{},'first chapter has no invented skill');ok(s.mode==='W01','campaign starts on ordinary shot');
const item=pickup(s,'trial-W02','trial',{weaponId:'W02'}),beforeEntry=JSON.stringify(p.chapterRun);
const got=E.collect(s,null,{id:item.id});ok(got.taken===2&&!got.pending,'actual engine acquisition grants three');ok(s.mode==='W01','pickup never auto-equips');equal(s.weaponStock,{W02:2},'three rounds in finite pool');
equal(JSON.stringify(p.chapterRun),beforeEntry,'live acquisition does not alias the saved entry');
ok(E.selectWeapon(s,'W02'),'select acquired type');const shot=E.launch(s,48,60);ok(shot&&s.weaponStock.W02===1,'launch spends exactly one');ok(s.shotCount===1,'finite shot consumes one action');
const restored=battle(R.begin(p,1));equal(restored.weaponStock,{},'retry rolls back a pickup made after entry');ok(restored.matchSeed===77,'retry keeps the entry seed');
victory(s);const advanced=R.finish(p,c,s,{seed:78});ok(advanced.advanced&&!advanced.reset,'ordinary win advances');equal(p.chapterRun.inventory.weapons,{W02:1},'unspent rounds carry forward');
ok(p.chapterRun.stage===2&&p.cleared===1,'stage and clear commit together');
const idempotent=JSON.stringify(p);ok(!R.finish(p,c,s).advanced,'duplicate result cannot advance twice');equal(JSON.stringify(p),idempotent,'duplicate result leaves save unchanged');
const next=R.begin(p,2),second=battle(next);equal(second.weaponStock,{W02:1},'next stage uses exact remainder');
E.selectWeapon(second,'W02');E.launch(second,45,55);equal(battle(R.begin(p,2)).weaponStock,{W02:1},'loss or interruption restores entry quantity');

const all=profile(100);
for(let chapter=1;chapter<=10;chapter++){
 const n=chapter*10;all.chapterRun=R.checkpoint(n,{weapons:{W06:2},skills:{BURST:1}},[],`test-${chapter}`,chapter);
 const ctx=R.begin(all,n),state=battle(ctx);victory(state,{weapons:{W06:2},skills:{BURST:1}});const r=R.finish(all,ctx,state,{seed:99});
 ok(r.advanced&&!r.reset,'chapter victory preserves stock '+n);
 if(n<100){equal(all.chapterRun.inventory,{weapons:{W06:2},skills:{BURST:1}},'next chapter retains stock '+n);ok(all.chapterRun.stage===n+1,'next chapter stage '+n);}else ok(all.chapterRun===null,'final victory ends run');
}
for(const n of[5,15,25,35,45,55,65,75,85,95]){
 all.chapterRun=R.checkpoint(n,{weapons:{W02:2},skills:{BURST:1}},[],`half-${n}`,123);
 const ctx=R.begin(all,n),state=battle(ctx);victory(state,{weapons:{W02:2},skills:{BURST:1}});const r=R.finish(all,ctx,state);
 ok(r.advanced&&!r.reset,'stage5 boundary is not a reset '+n);equal(all.chapterRun.inventory.weapons,{W02:2},'weapon survives midpoint '+n);equal(all.chapterRun.inventory.skills,{BURST:1},'skill survives midpoint and authored next-stage supplies '+n);
}

const supplies=profile(31);supplies.chapterRun=R.checkpoint(32,{skills:{BURST:2}},[],'supply-fixture',32);const entry32=R.begin(supplies,32,{seed:32}),sk=battle(entry32);equal(sk.skills,{BURST:2},'explicit chapter supply is applied once');E.selectSkill(sk,'BURST');E.launch(sk,45,50);ok(sk.skills.BURST===1,'selected skill consumed once');equal(battle(R.begin(supplies,32)).skills,{BURST:2},'retry does not resupply twice');victory(sk);R.finish(supplies,entry32,sk);equal(supplies.chapterRun.inventory.skills,{BURST:1},'remaining skill carries to next stage');

const full=E.campaign(4,{battleInventory:{weapons:{W02:6,W06:2,W07:1},skills:{BURST:3,PULL:2}},battleMode:'W01'});
const newWeapon=pickup(full,'new-drill','trial',{weaponId:'W13'}),taken=E.collect(full,null,{id:newWeapon.id});ok(taken.taken===2&&!taken.pending,'fourth weapon type acquired directly');equal(full.weaponStock,{W02:6,W06:2,W07:1,W13:2},'types are not truncated');ok(!E.collect(full,null,{id:newWeapon.id}),'cannot claim twice');
const same=pickup(full,'same-heavy','trial',{weaponId:'W02'});ok(E.collect(full,null,{id:same.id}).full&&same.collected,'full capsule is recorded once');
const addSkill=pickup(full,'R-extra','skill',{skill:'SWAP',amount:1});ok(E.collect(full,null,{id:addSkill.id}).taken===1&&full.skills.SWAP===1,'third skill type acquired without replacement');

const ammo=E.campaign(4,{battleInventory:{weapons:{W02:2},skills:{BURST:2}},battleMode:'W02'});const box=pickup(ammo,'ammo-test','ammo');const refill=E.collect(ammo,null,{id:box.id});ok(refill.kind==='ammo'&&ammo.weaponStock.W02===3,'ammo adds one with same cap');
const trip=E.campaign(4,{battleInventory:{weapons:{W02:2},skills:{BURST:2}},battleMode:'W02'});E.selectSkill(trip,'BURST');E.selectTeleport(trip);const prior=I.fromState(trip),tele=E.launch(trip,55,70);ok(tele.teleport,'real teleport fired');equal(I.fromState(trip),prior,'teleport does not consume finite stock or skill');

const previousInventory=JSON.stringify(p.chapterRun.inventory),replayed=R.begin(p,1,{seed:11}),replayState=battle(replayed);ok(!replayed.practice,'selected cleared level continues the campaign');equal(JSON.stringify(replayState.weaponStock),JSON.stringify(p.chapterRun.inventory.weapons),'selected level uses carried stock without library ammunition');victory(replayState,{weapons:{W02:3},skills:{BURST:3}});ok(R.finish(p,replayed,replayState).advanced&&p.chapterRun.stage===2,'selected cleared level advances to the next stage');
const progressBefore=p.cleared,ownedBefore=JSON.stringify(p.unlockedWeaponIds);R.restart(p,1,{seed:9});equal(p.chapterRun.inventory.weapons,{W02:3},'explicit chapter restart retains unused stock');ok(p.cleared===progressBefore&&JSON.stringify(p.unlockedWeaponIds)===ownedBefore,'restart retains progress and ownership');ok(!R.restart(p,91),'locked chapter cannot be started');

const overflow=profile(99);overflow.chapterRun=R.checkpoint(99,{skills:{BURST:1,SWAP:1}},[],'overflow',100);const e99=R.begin(overflow,99),b99=battle(e99);victory(b99);R.finish(overflow,e99,b99);const e100=R.begin(overflow,100),b100=battle(e100);equal(b100.skills,{BURST:1,SWAP:1},'no invented final-stage refill displaces carried skills');

for(const bad of [null,[],{version:2},{version:1,stage:300},{version:1,stage:1,seed:-1,runId:'x',inventory:{}}])ok(R.decode(bad)===null,'invalid run rejected');
const migrated=S.decode(JSON.stringify({version:1,cleared:73}));ok(migrated.cleared===73&&migrated.chapterRun===null&&!migrated.legacyBackup&&migrated.unlockedCharacterIds.includes('gun'),'explicit full reset removes old machine rights and backups');
const decoded=S.decode(JSON.stringify(p));equal(decoded.chapterRun.inventory,p.chapterRun.inventory,'run inventory roundtrips');ok(decoded.unlockedWeaponIds.length===23&&!('collectedCosmeticIds'in decoded)&&decoded.equippedCharacterId==='yui'&&decoded.difficulty==='hard','all profile selections retained');
ok(decoded.schemaVersion===S.schemaVersion,'checkpoint data uses a schema that old clients will not overwrite');assert.throws(()=>S.decode(JSON.stringify({schemaVersion:9,campaignResetVersion:S.resetVersion})));checks++;

(async()=>{
 let text=JSON.stringify(p);const store=S.create({load:async()=>text,save:async raw=>{text=raw;}});await store.load();store.data.chapterRun.inventory.weapons={W02:2};await store.save();equal(S.decode(text).chapterRun.inventory.weapons,{W02:2},'checkpoint saved through real adapter');
 let writes=0;const failed=S.create({load:async()=>{throw Error('offline');},save:async()=>writes++});await failed.load();failed.data.chapterRun=p.chapterRun;ok(await failed.save()===false&&writes===0,'failed load never overwrites previous data');
 const pending=[];const queue=S.create({load:async()=>null,save:raw=>new Promise((resolve,reject)=>pending.push({raw,resolve,reject}))});await queue.load();queue.data.difficulty='easy';const first=queue.save();await new Promise(setImmediate);queue.data.difficulty='hard';const last=queue.save();pending[0].resolve();await first;ok(queue.dirty,'older completed save cannot clear newer dirty checkpoint');await new Promise(setImmediate);pending[1].reject(Error('full'));ok(await last===false&&queue.dirty,'failed newest write stays dirty');const retry=queue.save();await new Promise(setImmediate);pending[2].resolve();ok(await retry===true&&!queue.dirty,'explicit save retry can commit same checkpoint');
 const report={status:'PASS',checks,scope:'Actual inventory consumption and pickup limits; all10 boss/midpoint boundaries; entry snapshots, supplies, selected-stage continuation, idempotent progression, explicit full reset and save-failure ordering. Not human balance or physical-device validation.'};
 if(process.env.ARCLINE_EVIDENCE_DIR){fs.mkdirSync(process.env.ARCLINE_EVIDENCE_DIR,{recursive:true});fs.writeFileSync(path.join(process.env.ARCLINE_EVIDENCE_DIR,'CHAPTER_STOCK.json'),JSON.stringify(report,null,2)+'\n');}console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
