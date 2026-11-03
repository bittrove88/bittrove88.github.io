'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const A=require('../dist/aim-guide.js'),E=require('../dist/engine.js'),S=require('../dist/save.js');
let checks=0,plans=0,splitPlans=0;
const ok=(v,m)=>{checks++;assert(v,m);},eq=(a,b,m)=>{checks++;assert.deepEqual(a,b,m);},near=(a,b,m)=>ok(Math.abs(a-b)<1e-6,m);
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.freeze(x);Object.values(x).forEach(freeze);}return x;};
const p=(x,y,t)=>({x,y,t}),simple=points=>({bullets:[{id:0,start:0,path:points}],events:[]});
eq(A.modes,['easy','normal','hard'],'mode names');eq(A.ratios,{easy:1,normal:.5,hard:0},'historical guide ratios');
eq(A.normalize('unknown'),'normal','unknown mode defaults to Normal');
const basic=simple([p(0,0,0),p(10,0,1)]);
near(A.length(A.paths(basic,'easy')[0].path),10,'Easy full forecast');
near(A.length(A.paths(basic,'normal')[0].path),5,'Normal half forecast');
eq(A.paths(basic,'hard'),[],'Hard does not disclose forecast');
const uneven=simple([p(0,0,0),p(8,0,100),p(8,2,101)]);
const normal=A.paths(uneven,'normal')[0].path;
near(A.length(normal),5,'half distance rather than half simulation time');
near(normal.at(-1).x,5,'interpolated endpoint');
const bounce=A.paths(simple([p(0,0,0),p(4,0,1),p(4,6,2)]),'normal')[0].path;
near(bounce.at(-1).x,4,'half guide crosses reflection');near(bounce.at(-1).y,1,'half guide ends along reflected path');
const duplicate=A.paths(simple([p(0,0,0),p(0,0,0),p(10,0,1)]),'normal')[0].path;
near(A.length(duplicate),5,'duplicate simulation samples do not shift prefix');
const split=freeze({bullets:[{id:0,start:0,path:[p(0,0,0),p(300,0,1)]},{id:1,start:1,path:[p(300,0,1),p(300,300,2)]}],events:[{type:'split',bullet:0,x:300,y:0,t:1}]});
const halfSplit=A.paths(split,'normal');eq(halfSplit.map(x=>x.id),[0],'hidden child is not drawn without its parent');
near(A.length(halfSplit[0].path),300,'split parent and child share the half distance budget');
const longChild={bullets:[split.bullets[0],{id:1,start:1,path:[p(300,0,1),p(300,600,2)]}],events:split.events};
const longHalf=A.paths(longChild,'normal');near(A.length(longHalf[0].path),300,'split parent is visible');near(A.length(longHalf[1].path),150,'split child uses remaining half distance budget');
const twin=freeze({bullets:[{id:0,start:0,primary:true,path:[p(0,0,0),p(100,0,1)]},{id:1,start:.25,primary:false,path:[p(0,0,.25),p(0,80,1.25)]}],events:[]});
const halves=A.paths(twin,'normal');near(A.length(halves[0].path),50,'first twin half');near(A.length(halves[1].path),40,'delayed twin half is independent');
ok(A.paths({bullets:[{id:0,path:[p(0,0,0),p(NaN,1,1)]}]},'easy').length===0,'reject invalid coordinates');
ok(A.paths(null,'normal').length===0,'empty guide safe');
for(const scale of [.4,1,1.8,3])for(const [dx,dy] of [[1,0],[0,-1],[-.6,-.8]]){
 const muzzle={x:320,y:220,dx,dy},snapshot=JSON.stringify(muzzle),direction=A.direction(muzzle,scale);
 eq(direction.length,1,'Hard has one direction segment');
 const guide=direction[0].path;near(A.length(guide)*scale,48,'Hard arrow screen-space size');
 near((guide[1].x-guide[0].x)*dy-(guide[1].y-guide[0].y)*dx,0,'Hard arrow follows barrel');
 eq(JSON.stringify(muzzle),snapshot,'Hard does not change muzzle');
}
eq(A.direction({x:1,y:2,dx:NaN,dy:0}),[],'invalid direction safe');
for(const stage of [1,6,13,32,62,80,100])for(const weapon of E.weapons){
 const state=E.campaign(stage,{matchSeed:20261031,unlockedWeaponIds:E.weapons.map(w=>w.id),equippedWeaponId:weapon.id});
 const plan=E.trajectory(state,0,Math.max(50,weapon.minAngle||0),76),snapshot=JSON.stringify(plan);freeze(plan);
 const easy=A.paths(plan,'easy'),half=A.paths(plan,'normal'),hard=A.paths(plan,'hard');
 eq(JSON.stringify(plan),snapshot,'projected guide never alters physics');
 eq(hard,[],'Hard never reveals predicted landing');
 const byId=new Map(easy.map(x=>[x.id,x]));
 ok(half.every(x=>byId.has(x.id)&&A.length(x.path)<=A.length(byId.get(x.id).path)+1e-6),'Normal is only a visible prefix');
 if(!plan.events.some(x=>x.type==='split')){
  for(const b of half)near(A.length(b.path),A.length(byId.get(b.id).path)*.5,'Normal exactly half for non-split bullets');
 }else splitPlans++;
 plans++;
}
ok(splitPlans>0,'real split weapons tested');
for(const difficulty of A.modes){
 const saved=S.decode(JSON.stringify({schemaVersion:S.schemaVersion,campaignResetVersion:S.resetVersion,difficulty,cleared:16,difficultyConfirmed:true}));
 eq(saved.difficulty,difficulty,'profile mode remains saved');
 eq(saved.cleared,16,'profile progress remains saved');
}
const render=fs.readFileSync(path.join(__dirname,'../dist/render.js'),'utf8');
const trial=fs.readFileSync(path.join(__dirname,'../ui/difficulty-ui.js'),'utf8');
ok(render.includes("difficulty==='hard'?root.ArcAimGuide.direction("),'actual renderer switches to Hard direction');
ok(render.includes("if(full&&difficulty!=='hard')"),'Hard has no predicted flight edge marks');
ok(trial.includes('choice === "hard"')&&trial.includes('ArcAimGuide.direction('),'trial matches the real Hard guide');
const report={status:'PASS',checks,plans,splitPlans,scope:'Easy full, Normal half arc-distance (including split and independent volleys), Hard barrel direction; immutable simulation; existing difficulty-specific saves.'};
const out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-difficulty';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'AIM_GUIDE.json'),JSON.stringify(report,null,2)+'\n');console.log(report);
