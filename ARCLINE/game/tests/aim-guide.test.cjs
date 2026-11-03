'use strict';
const assert=require('node:assert/strict'),A=require('../dist/aim-guide.js'),E=require('../dist/engine.js'),S=require('../dist/save.js');
let checks=0;const eq=(a,b,m)=>{checks++;assert.deepEqual(a,b,m)},ok=(v,m)=>{checks++;assert(v,m)},near=(a,b,m)=>ok(Math.abs(a-b)<1e-6,m);
const p=(x,y,t)=>({x,y,t});
eq(A.ratios,{easy:1,normal:.5,hard:0},'restored distinct guide ratios');
const flat={bullets:[{id:0,path:[p(0,0,0),p(8,0,1),p(8,2,2)]}],events:[]},snapshot=JSON.stringify(flat);
eq(A.paths(flat,'easy')[0].path,flat.bullets[0].path,'Easy previews complete reflected path');
near(A.length(A.paths(flat,'normal')[0].path),5,'Normal previews half by arc length');
eq(A.paths(flat,'hard'),[],'Hard never previews future impact');
near(A.length(A.direction({x:100,y:100,dx:1,dy:0},2)[0].path)*2,48,'Hard direction remains 48 display pixels');
eq(JSON.stringify(flat),snapshot,'projection never mutates physics');
const split={bullets:[{id:0,path:[p(0,0,0),p(100,0,1)]},{id:1,path:[p(100,0,1),p(100,300,2)]}],events:[{type:'split',bullet:0,x:100,y:0,t:1}]};
const half=A.paths(split,'normal');
eq(half.map(b=>b.id),[0,1],'Normal split respects parent and child lineage');
near(A.length(half[0].path),100,'Normal includes entire split carrier');
near(A.length(half[1].path),100,'Normal includes only the first third of split child');
eq(A.paths(split,'hard'),[],'Hard hides all split-child paths');
const invalid={bullets:[{id:0,path:[p(0,0,0),p(NaN,1,1)]}],events:[]};
eq(A.paths(invalid,'easy'),[],'nonfinite plans do not reach Canvas');
for(const [stage,weapon] of [[20,'W01'],[60,'W06'],[90,'W10'],[100,'TELEPORT']]){
 const state=E.campaign(stage,{matchSeed:42});if(weapon==='TELEPORT')E.selectTeleport(state);else state.mode=weapon;
 const plan=E.trajectory(state,0,50,72),before=JSON.stringify(plan),full=A.paths(plan,'easy'),parts=A.paths(plan,'normal');
 ok(full.length>0,'Easy full live trajectory '+stage);
 ok(parts.every(b=>{const f=full.find(x=>x.id===b.id);return f&&A.length(b.path)<=A.length(f.path)+1e-6;}),'Normal never exceeds full live trajectory '+stage);
 eq(A.paths(plan,'hard'),[],'Hard hides the live future trajectory '+stage);
 eq(JSON.stringify(plan),before,'read-only trajectory '+stage);
}
for(const difficulty of A.modes){
 const saved=S.decode(JSON.stringify({schemaVersion:8,campaignResetVersion:2,difficulty}));
 eq(saved.difficulty,difficulty,'saved difficulty preserved '+difficulty);
}
console.log(JSON.stringify({status:'PASS',checks,scope:'Easy full; Normal half by distance including reflection/split; Hard direction only; immutable physics; saved mode compatibility.'}));
