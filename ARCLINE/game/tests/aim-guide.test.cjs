'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const A=require('../dist/aim-guide.js'),E=require('../dist/engine.js'),S=require('../dist/save.js');
let checks=0;const ok=(condition,message)=>{checks++;assert(condition,message);},near=(a,b,message)=>ok(Math.abs(a-b)<1e-6,message);
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.freeze(x);for(const value of Object.values(x))freeze(value);}return x;};
const p=(x,y,t)=>({x,y,t});
const simple=points=>({bullets:[{id:0,start:0,path:points}],events:[]});
ok(A.normalize('other')==='normal','unknown mode uses normal');ok(A.paths(simple([p(0,0,0),p(10,0,1)]),'hard').length===0,'hard removes forecast');
const uneven=simple([p(0,0,0),p(8,0,100),p(8,2,101)]),normal=A.paths(uneven,'normal')[0].path;
near(A.length(normal),5,'half arc length, not half flight time');near(normal.at(-1).x,5,'interpolated endpoint between samples');near(normal.at(-1).y,0,'endpoint stays on segment');
const bounce=A.paths(simple([p(0,0,0),p(4,0,1),p(4,6,2)]),'normal')[0].path;
near(bounce.at(-1).x,4,'reflection prefix includes contact');near(bounce.at(-1).y,1,'reflection continues until half total arc length');
const duplicate=A.paths(simple([p(0,0,0),p(0,0,0),p(10,0,1)]),'normal')[0].path;
near(A.length(duplicate),5,'zero distance contacts do not shift boundary');
const split=freeze({bullets:[{id:0,start:0,path:[p(0,0,0),p(300,0,1)]},{id:1,start:1,path:[p(300,0,1),p(300,300,2)]}],events:[{type:'split',bullet:0,x:300,y:0,t:1}]});
const splitHalf=A.paths(split,'normal');ok(splitHalf.length===1&&splitHalf[0].id===0,'child does not float beyond hidden parent path');near(A.length(splitHalf[0].path),300,'parent plus child supplies total distance');
const longChild={bullets:[split.bullets[0],{id:1,start:1,path:[p(300,0,1),p(300,600,2)]}],events:split.events};
const longHalf=A.paths(longChild,'normal');near(A.length(longHalf[0].path),300,'visible parent prefix');near(A.length(longHalf[1].path),150,'child inherits parent distance');
const twin=freeze({bullets:[{id:0,start:0,primary:true,path:[p(0,0,0),p(100,0,1)]},{id:1,start:.25,primary:false,path:[p(0,0,.25),p(0,80,1.25)]}],events:[]});
const halves=A.paths(twin,'normal');near(A.length(halves[0].path),50,'first delayed volley path');near(A.length(halves[1].path),40,'secondary volley is its own root');
const resampled=simple(Array.from({length:101},(_,i)=>p(i/10,0,i*i)));
near(A.paths(resampled,'normal')[0].path.at(-1).x,5,'sampling density and nonuniform time do not change boundary');
ok(A.paths({bullets:[{id:0,path:[p(0,0,0),p(NaN,1,1)]}],events:[]},'normal').length===0,'nonfinite paths never reach Canvas');
ok(A.paths({bullets:[],events:[]},'easy').length===0,'empty simulation is safe');
for(const scale of [.4,.52,1,1.8,3])for(const [dx,dy] of [[1,0],[0,-1],[-.6,-.8]]){
 const muzzle={x:320,y:220,dx,dy},before=JSON.stringify(muzzle),guide=A.direction(muzzle,scale)[0].path;
 near(A.length(guide)*scale,48,'hard direction stays forty-eight logical pixels at camera scale '+scale);
 near((guide[1].x-guide[0].x)*dy-(guide[1].y-guide[0].y)*dx,0,'hard direction follows barrel orientation');
 ok(guide.length===2&&JSON.stringify(muzzle)===before,'hard has no curved forecast and never mutates muzzle');
}
ok(!A.direction({x:1,y:2,dx:NaN,dy:1}).length&&!A.direction({x:1,y:2,dx:0,dy:0}).length,'invalid directions never reach Canvas');

let plans=0,splitPlans=0;
for(const stage of[1,6,13,32,62,80])for(const weapon of E.weapons){
 const state=E.campaign(stage,{matchSeed:20261031,unlockedWeaponIds:E.weapons.map(w=>w.id),equippedWeaponId:weapon.id});
 const plan=E.trajectory(state,0,Math.max(50,weapon.minAngle||0),76),before=JSON.stringify(plan);freeze(plan);
 const easy=A.paths(plan,'easy'),half=A.paths(plan,'normal'),hard=A.paths(plan,'hard');
 ok(JSON.stringify(plan)===before,'projection cannot mutate actual simulation '+stage+' '+weapon.id);
 ok(hard.length===0,'no prediction in hard '+stage+' '+weapon.id);
 ok(easy.every(b=>b.path.every(q=>Number.isFinite(q.x+q.y))),'finite full paths '+weapon.id);
 const byId=new Map(easy.map(b=>[b.id,b]));
 ok(half.every(b=>byId.has(b.id)&&A.length(b.path)<=A.length(byId.get(b.id).path)+1e-6),'partial paths remain prefixes '+weapon.id);
 if(!plan.events.some(e=>e.type==='split')){
  for(const b of half)near(A.length(b.path),A.length(byId.get(b.id).path)*.5,'actual nonsplit trajectory is exactly half '+stage+' '+weapon.id);
 }else splitPlans++;
 plans++;
}
ok(splitPlans>0,'actual physics split paths exercised');
for(const stage of[4,13,62,100]){
 const state=E.campaign(stage,{matchSeed:19});E.selectTeleport(state);const plan=E.trajectory(state,0,52,75),before=JSON.stringify(plan);freeze(plan);
 const full=A.paths(plan,'easy'),half=A.paths(plan,'normal');ok(plan.teleport,'actual teleport simulation');
 for(const b of half)near(A.length(b.path),A.length(full.find(x=>x.id===b.id).path)*.5,'teleport uses the same distance rule');
 ok(!A.paths(plan,'hard').length&&JSON.stringify(plan)===before,'teleport forecast does not reveal landing in hard or mutate action');
}
for(let stage=1;stage<=100;stage++){
 const states=A.modes.map(difficulty=>E.campaign(stage,{matchSeed:42,difficulty}));
 ok(states.every(state=>JSON.stringify(state)===JSON.stringify(states[0])),'difficulty cannot change combat state '+stage);
 const direction=A.direction(E.geometry.muzzle(states[0],0,48));states[0].power=100;
 ok(JSON.stringify(A.direction(E.geometry.muzzle(states[0],0,48)))===JSON.stringify(direction),'hard direction never reveals power or landing '+stage);
 // Compare fresh streams, since reading a random value advances the generator.
 const values=A.modes.map(difficulty=>E.campaign(stage,{matchSeed:42,difficulty}).random());
 ok(values.every(value=>value===values[0]),'difficulty cannot change enemy randomness '+stage);
}

for(const difficulty of A.modes){
 const current=S.decode(JSON.stringify({schemaVersion:S.schemaVersion,campaignResetVersion:S.resetVersion,difficulty}));ok(current.difficulty===difficulty,'current mode roundtrips '+difficulty);
 const decoded=S.decode(JSON.stringify({schemaVersion:2,difficulty,cleared:87,equippedCharacterId:'rin'}));ok(decoded.difficulty==='normal'&&!decoded.difficultyConfirmed,'explicit reset requests a fresh difficulty choice '+difficulty);
 ok(decoded.cleared===0&&decoded.unlockedWeaponIds.join()==='W01'&&decoded.equippedCharacterId==='gun'&&decoded.unlockedCharacterIds.join()==='gun','explicit reset removes prior selections '+difficulty);
}
ok(S.decode(JSON.stringify({version:1,cleared:40})).difficulty==='normal','legacy save defaults to normal');
ok(S.decode(JSON.stringify({schemaVersion:2,difficulty:'invalid'})).difficulty==='normal','invalid saved mode is normalized');
ok(S.decode(null).difficulty==='normal','new game defaults to normal');
(async()=>{
 let raw=JSON.stringify({version:1,cleared:27});const store=S.create({load:async()=>raw,save:async value=>{raw=value;}});await store.load();store.data.difficulty='hard';await store.save();
 const reloaded=S.decode(raw);ok(reloaded.difficulty==='hard'&&reloaded.cleared===0,'setting persists through save adapter');
 let writes=0;const failed=S.create({load:async()=>{throw Error('unavailable');},save:async()=>writes++});await failed.load();failed.data.difficulty='easy';await failed.save();ok(writes===0,'difficulty does not overwrite failed save load');
 const report={status:'PASS',checks,actualWeaponPlans:plans,actualSplitPlans:splitPlans,scope:'Forecast geometry, lineage, constant48px hard direction independent of power, immutable simulation, three-mode state/random parity across100 stages, and save migration. Not a difficulty or physical-device playtest.'};
 if(process.env.ARCLINE_EVIDENCE_DIR){fs.mkdirSync(process.env.ARCLINE_EVIDENCE_DIR,{recursive:true});fs.writeFileSync(path.join(process.env.ARCLINE_EVIDENCE_DIR,'AIM_GUIDE.json'),JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify(report,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
