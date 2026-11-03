'use strict';
// The former half/direction-only contract is superseded by the 2026-11-04 request.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const A=require('../dist/aim-guide.js'),E=require('../dist/engine.js'),S=require('../dist/save.js');
let checks=0;const eq=(a,b,m)=>{checks++;assert.deepEqual(a,b,m);};
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.freeze(x);Object.values(x).forEach(freeze);}return x;};
eq(A.normalize('invalid'),'normal','unknown mode');eq(A.ratios,{easy:1,normal:1,hard:1},'all guides full');
let plans=0;
for(const [stage,weapon]of [[20,'W01'],[60,'W06'],[90,'W10'],[100,'TELEPORT']]){
 const s=E.campaign(stage,{matchSeed:42});if(weapon==='TELEPORT')E.selectTeleport(s);else s.mode=weapon;
 const plan=E.trajectory(s,0,50,72),before=JSON.stringify(plan);freeze(plan);
 const expected=plan.bullets.filter(b=>b.path.length>1).map(b=>({id:b.id,path:b.path}));
 for(const mode of A.modes)eq(A.paths(plan,mode),expected,'full simulated branches '+stage+'/'+mode);
 eq(JSON.stringify(plan),before,'read-only rendering');plans++;
}
eq(A.paths({bullets:[{id:0,path:[{x:0,y:0},{x:NaN,y:1}]}]},'hard'),[],'reject nonfinite');eq(A.paths(null,'easy'),[],'empty plan');
for(const difficulty of A.modes){const data=S.decode(JSON.stringify({schemaVersion:8,campaignResetVersion:2,difficulty}));eq(data.difficulty,difficulty,'existing selected mode preserved');}
const report={status:'PASS',checks,plans,scope:'Full immutable guide in all three modes,including reflection,split and teleport;existing difficulty values.'};
const out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-difficulty';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'AIM_GUIDE.json'),JSON.stringify(report,null,2)+'\n');console.log(report);
