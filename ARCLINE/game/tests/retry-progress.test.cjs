'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
const S=require('../dist/save.js'),R=require('../dist/campaign-run.js'),I=require('../dist/inventory.js'),E=require('../dist/engine.js'),M=require('../dist/master-progress.js'),complete=require('./final-team-fixture.cjs');
let checks=0;const eq=(a,b,m)=>{checks++;assert.deepEqual(a,b,m);},ok=(v,m)=>{checks++;assert(v,m);},copy=v=>JSON.parse(JSON.stringify(v));
const profile=(mode='normal',cleared=1)=>S.decode(JSON.stringify({schemaVersion:8,campaignResetVersion:2,difficulty:mode,cleared,difficultyConfirmed:true,journeyStarted:true}));
function setup(mode='normal',inventory={weapons:{W06:2},skills:{S_REPAIR:2,S_GUARD:2}}){const data=profile(mode);data.chapterRun=R.checkpoint(2,inventory,[],'retry-0304',123);data.campaignInventory=copy(inventory);const ctx=R.begin(data,2),s=E.campaign(2,{battleInventory:ctx.entry.inventory,matchSeed:ctx.entry.seed,pickupLedger:ctx.entry.pickupLedger});return {data,ctx,s};}
function spend(s){s.units[0].hp=s.units[0].maxHp/2;ok(E.repair(s),'actual repair consumes a skill');s.phase='aim';s.turn=0;s.skillUsed=false;ok(E.selectWeapon(s,'W06'),'select finite auxiliary');ok(E.launch(s,45,50),'actual shot consumes one auxiliary');}
function prior(name){const module={exports:{}};vm.runInNewContext(cp.execFileSync('git',['show','f3bce10:ARCLINE/game/dist/'+name+'.js'],{encoding:'utf8'}),{module,require:id=>require(path.resolve(__dirname,'../dist',id))});return module.exports;}
// Reproduce the two old behaviors using the same real engine consumption.
const old=setup();spend(old.s);prior('campaign-run').updateBattle(old.data,old.ctx,old.s);eq(copy(old.data.campaignInventory),{weapons:{W06:1},skills:{S_REPAIR:1,S_GUARD:2}},'baseline permanently saved consumption');
eq(prior('save').decode(JSON.stringify({schemaVersion:8,campaignResetVersion:2,difficulty:'hard',cleared:20})).difficultyProgress.easy.cleared,0,'baseline Hard clear did not flow downward');
for(const mode of ['easy','normal','hard'])for(const result of ['lose','draw']){
 const {data,ctx,s}=setup(mode);spend(s);const live=copy(I.fromState(s));R.updateBattle(data,ctx,s);eq(I.fromState(s),live,'saving never refunds live battle '+mode+result);eq(data.campaignInventory,{weapons:{W06:2},skills:{S_REPAIR:2,S_GUARD:2}},'retry stock restores both categories '+mode+result);
 const saved=JSON.stringify(data);R.updateBattle(data,ctx,s);eq(JSON.stringify(data),saved,'duplicate persistence is idempotent');s.result=result;ok(!R.finish(data,ctx,s).advanced,'failure does not progress');
 const reload=S.decode(JSON.stringify(data)),again=R.begin(reload,2),battle=E.campaign(2,{battleInventory:again.entry.inventory,matchSeed:again.entry.seed});eq(I.fromState(battle),{weapons:{W06:2},skills:{S_REPAIR:2,S_GUARD:2}},'restored after reload '+mode+result);eq(again.entry.seed,123,'retry seed preserved');eq(reload.cleared,1,'failure never clears');
}
// Collection is durable, restoration includes acquired-and-used stock, and the
// capsule ledger prevents duplication across failed attempts and reloads.
{
 const {data,ctx,s}=setup('hard',{weapons:{W06:1},skills:{S_REPAIR:1}});
 spend(s);R.updateBattle(data,ctx,s);
 const item=s.pickups[0];ok(E.collect(s,null,{id:item.id}),'real acquisition');R.updateBattle(data,ctx,s);const gained=s.weaponStock.W02;
 s.phase='aim';s.turn=0;s.result=null;E.selectWeapon(s,'W02');E.launch(s,45,40);R.updateBattle(data,ctx,s);
 eq(data.campaignInventory.weapons,{W06:1,W02:gained},'acquired stock and consumed amounts restored');eq(data.pickupLedger,[item.placementId],'capsule ledger saved together');
 const reload=S.decode(JSON.stringify(data)),again=R.begin(reload,2),battle=E.campaign(2,{battleInventory:again.entry.inventory,pickupLedger:again.entry.pickupLedger});ok(!E.collect(battle,null,{id:item.id}),'claimed capsule cannot be collected again');
 const count=copy(reload.campaignInventory);R.updateBattle(reload,again,battle);eq(reload.campaignInventory,count,'new attempt does not refund a second time');
}
{
 const {data,ctx,s}=setup('normal',{weapons:{W06:6},skills:{S_REPAIR:6}});spend(s);R.updateBattle(data,ctx,s);s.weaponStock.W06=6;s.skills.S_REPAIR=6;R.updateBattle(data,ctx,s);eq(data.campaignInventory,{weapons:{W06:6},skills:{S_REPAIR:6}},'refund plus acquired stock respects six-use cap');
 s.result='win';s.pendingLoot=[];const live=copy(I.fromState(s));ok(R.finish(data,ctx,s).advanced,'victory advances');eq(data.campaignInventory,live,'victory commits actual stock');const after=JSON.stringify(data);ok(!R.finish(data,ctx,s).advanced,'duplicate victory rejected');eq(JSON.stringify(data),after,'duplicate victory no extra refund');
}
{
 const {data,ctx,s}=setup();spend(s);R.updateBattle(data,ctx,s);s.result='win';s.pendingLoot=[];const live=copy(I.fromState(s));R.finish(data,ctx,s);eq(data.campaignInventory,live,'successful use stays spent');eq(data.chapterRun.inventory,live,'next stage receives exact remainder');
}
{
 const {data,ctx,s}=setup('normal',{weapons:{W06:2},skills:{S_GUARD:2,BLINK:1}});E.selectSkill(s,'S_GUARD');E.launch(s,45,40);R.updateBattle(data,ctx,s);eq(data.campaignInventory.skills.S_GUARD,2,'shot-attached guard refunded');
 const wrong=copy(ctx);wrong.entry.runId='wrong';const before=JSON.stringify(data);ok(!R.updateBattle(data,wrong,s),'stale context rejected');eq(JSON.stringify(data),before,'stale context cannot change stock');
 const other=setup('normal',{weapons:{W06:2},skills:{BURST:1}});E.selectSkill(other.s,'BURST');E.selectTeleport(other.s);const inventory=I.fromState(other.s);E.launch(other.s,55,70);R.updateBattle(other.data,other.ctx,other.s);eq(other.data.campaignInventory,inventory,'free teleport invents no refund');
}
// Downward sharing: existing records, current victories, ceilings, no reverse
// leakage, and preservation of every independent campaign field.
for(const mode of ['easy','normal','hard']){
 const data=profile(mode,20);eq(data.cleared,20,'active clear unchanged');for(const [other,p]of Object.entries(data.difficultyProgress))eq(p.cleared,['easy','normal','hard'].indexOf(other)<['easy','normal','hard'].indexOf(mode)?20:0,'legacy inheritance '+mode+' -> '+other);
}
{
 const data=profile('hard',1);data.difficultyProgress.easy={...data.difficultyProgress.easy,cleared:9,campaignInventory:{weapons:{W07:3},skills:{S_REPAIR:4}},pickupLedger:['L001:existing'],chapterRun:R.checkpoint(2,{weapons:{W07:3}},[],'easy-local',9),machineUsage:{id:'gun',count:2,cooldowns:{}},journal:{...data.difficultyProgress.easy.journal,readIds:['introduction']}};
 const easy=copy(data.difficultyProgress.easy),normal=copy(data.difficultyProgress.normal),ctx=R.begin(data,2),s=E.campaign(2,{battleInventory:ctx.entry.inventory});s.result='win';s.pendingLoot=[];R.finish(data,ctx,s);
 eq(data.difficultyProgress.easy,easy,'lower advanced progress and all fields untouched');eq(data.difficultyProgress.normal.cleared,2,'Hard win clears Normal');for(const key of ['campaignInventory','pickupLedger','chapterRun','machineUsage','journal','equippedCharacterId'])eq(data.difficultyProgress.normal[key],normal[key],'clear-only propagation preserves '+key);
 const reloaded=S.decode(JSON.stringify(data));eq(reloaded.difficultyProgress.easy.chapterRun,easy.chapterRun,'lower active checkpoint survives reload');
}
{
 const data=profile('normal',4),ctx=R.begin(data,5),s=E.campaign(5);s.result='win';s.pendingLoot=[];R.finish(data,ctx,s);eq(data.difficultyProgress.easy.cleared,5,'Normal win clears Easy');eq(data.difficultyProgress.hard.cleared,0,'Normal never clears Hard');ok(data.difficultyProgress.easy.unlockedCharacterIds.includes('hana'),'standard unlock matches inherited clear');eq(data.difficultyProgress.easy.campaignInventory,{weapons:{},skills:{}},'no upper inventory copied');
 const master=M.prepare(data,99);eq(master.difficultyProgress,data.difficultyProgress,'explicit master edit remains local');
}
{
 const data=profile('hard',99),ctx=R.begin(data,100),s=E.campaign(100,{unlockedCharacterIds:S.characterIds});const before=JSON.stringify(data);ok(!R.updateBattle(data,ctx,s),'final relay retains local snapshot contract');eq(JSON.stringify(data),before,'final relay storage unchanged while fighting');s.result='win';s.pendingLoot=[];complete(s);ok(R.finish(data,ctx,s).advanced,'completed relay wins');eq([data.cleared,data.difficultyProgress.normal.cleared,data.difficultyProgress.easy.cleared],[100,100,100],'final100 shares downward');
}
(async()=>{
 let raw=JSON.stringify({schemaVersion:8,campaignResetVersion:2,difficulty:'easy',cleared:3,difficultyProgress:{hard:{cleared:40},normal:{cleared:20}}}),writes=0,cleanups=0,fail=false;
 const adapter={load:async()=>raw,save:async x=>{writes++;if(fail)throw Error('full');raw=x;},resetLocal:async()=>cleanups++},store=S.create(adapter);await store.load();eq(store.data.cleared,40,'archived Hard backfills active Easy');eq([store.data.journeyStarted,store.data.onboarding.step],[true,'done'],'inherited established progress skips first-use onboarding');eq(store.data.difficultyProgress.normal.cleared,40,'archived Hard backfills Normal');eq(cleanups,0,'migration never clears other saves');eq(writes,1,'additive migration persisted once');eq(JSON.parse(raw).clearInheritanceVersion,1,'migration marker persists');
 const second=S.create(adapter);await second.load();eq(writes,1,'migration does not run again');
 const old=JSON.stringify(store.data);fail=true;ok(!await store.replace(S.prepareDifficulty(store.data,'hard')),'failed switch rejected');eq(JSON.stringify(store.data),old,'failed switch preserves complete live record');fail=false;ok(await store.replace(S.prepareDifficulty(store.data,'normal')),'mode switch commits');eq(store.data.cleared,40,'inherited progress after mode switch');
 ok(await store.reset(),'explicit reset');eq(store.data.cleared,0,'reset active clears');for(const p of Object.values(store.data.difficultyProgress))eq(p.cleared,0,'reset archived clears');eq([store.data.schemaVersion,store.data.campaignResetVersion],[8,2],'schema and reset retained');
 const out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-retry-progress';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'RETRY_PROGRESS.json'),JSON.stringify({status:'PASS',checks,baseline:'f3bce10',scope:'Actual engine consumption, provisional save/refund, acquired-and-used stock/capsule ledger, reload, cap/idempotency, win/failure, final relay, lower-only progression/legacy migration, independent fields, master, failed writes and reset.'},null,2)+'\n');console.log('PASS retry-progress '+checks+' checks');
})().catch(e=>{console.error(e);process.exitCode=1;});
