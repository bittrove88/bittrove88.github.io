'use strict';
// A small replay of the recorded design examples, not an AI/combat/clear suite.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),E=require(root+'/game/dist/engine.js'),G=E.geometry;
const ids=[17,33,36,39,47],read=n=>JSON.parse(fs.readFileSync(path.join(__dirname,`stage_${String(n).padStart(3,'0')}_proposal.json`),'utf8'));
function compile(p){const c=p.blueprintCandidate;return {...E.levels[p.stage-1],name:c.name,nameEn:c.nameEn,floors:c.floorSegments,components:c.parts.map(q=>({id:q.id,poly:q.poly,destructible:!!q.breakable,...(q.reflectiveUnderside?{reflectiveUnderside:q.reflectiveUnderside}:{})})),features:c.features,spawn:c.spawnPoints,worldWidth:c.worldWidth,pickups:p.after.pickups,terrainRevision:'proposal-idea-refinement-20261107'};}
function state(p,round=1){const old=E.levels[p.stage-1];let s;E.levels[p.stage-1]=compile(p);try{s=E.campaign(p.stage,{matchSeed:4697,battleInventory:{}});}finally{E.levels[p.stage-1]=old;}while(s.round<round){E.boundary(s);s.phase='aim';}return s;}
function teleport(s,q){assert(E.selectTeleport(s));const z=E.launch(s,q.angle,q.power);assert(z);E.resolve(s,z);assert(z.teleportSuccess,'Recorded teleport no longer lands');s.phase='aim';}
function shot(s,example,{prefix=null,one=false,noBounce=false}={}){assert(example);const accepts=z=>z.damage[1]>=.5&&z.damage[0]<=.1&&(!prefix||z.events.some(e=>e.type==='bounce'&&e.solidId?.startsWith(prefix)))&&(!one||z.events.filter(e=>e.type==='bounce').length===1)&&(!noBounce||!z.events.some(e=>e.type==='bounce'));
 assert(example.angle>=E.minimumAngle(s)&&example.angle<=E.maximumAngle(s));
 const z=E.trajectory(s,0,example.angle,example.power,{weaponId:'W01'});assert(accepts(z),'Recorded shot no longer has its stated role');let neighbors=0;
 for(const da of[-3,0,3])for(const dp of[-5,0,5]){assert(example.angle+da>=E.minimumAngle(s)&&example.angle+da<=E.maximumAngle(s));assert(example.power+dp>=20&&example.power+dp<=100);if(accepts(E.trajectory(s,0,example.angle+da,example.power+dp,{weaponId:'W01'})))neighbors++;}
 // Recorded neighbor counts used the same damage threshold; role-specific
 // checks here may be stricter than an unconstrained optional example.
 return {angle:example.angle,power:example.power,damage:z.damage,neighbors,bounces:z.events.filter(e=>e.type==='bounce').map(e=>({solidId:e.solidId,surface:e.surface}))};}
const report={base:'74aed2be47e429cea3f502416a5d0b768adb3318',scope:'Design examples only. Round-3 fixtures advance boundaries without enemy turns. No AI, victory, balance, inventory campaign or device validation.',stages:[]};
for(const n of ids){const p=read(n),s=state(p),base=E.levels[n-1],c=p.blueprintCandidate;
 assert.deepEqual(p.after.floors,c.floorSegments);assert.deepEqual(p.after.parts,c.parts);assert.deepEqual(p.after.features,c.features);assert.deepEqual(c.spawn,c.spawnPoints.map(q=>q[0]));
 for(const k of Object.keys(p.rules))assert.deepEqual(p.rules[k],base[k],`Changed rule: ${n} ${k}`);
 assert.deepEqual(c.features.map(q=>q.type).sort(),base.features.map(q=>q.type).sort(),'Feature types/counts changed');
 assert(s.units.every(u=>G.clearBody(s.world,u)),'Embedded spawn');
 const a={x:s.units[0].x,y:s.units[0].y-22},b={x:s.units[1].x,y:s.units[1].y-22};assert(!G.lineClear(s.world,a,b),'Open initial centerline');
 assert(G.lineClear(s.world,{x:a.x,y:s.units[0].y-50},{x:a.x,y:s.units[0].y-220}),'Covered launch position');
 for(const pickup of p.after.pickups){const q=G.point(pickup.x,pickup.h);assert(!s.world.solids.some(o=>G.inside(q,o.poly)),`Embedded pickup ${pickup.id}`);}
 const row={stage:n,character:s.characterId,spawnsClear:true,initialCenterlineBlocked:true,headSpaceOpen:true,pickupsClear:true,examples:[]};
 const add=(label,s,ex,opts)=>row.examples.push({label,position:[s.units[0].x/10,(500-s.units[0].y)/10],...shot(s,ex,opts)});
 if(n===17){const ex=p.qualityEvidence.oneBounceExamples[1];E.move(s,0,ex.input);add('A: one W bounce',s,ex,{prefix:'W',one:true});}
 if(n===33)for(const ex of p.qualityEvidence.examples.slice(1)){const t=state(p);E.move(t,0,ex.requestedWalkInput);add(ex.id,t,ex,{prefix:ex.id==='B-right'?'W1':'W0',one:true});}
 if(n===36){E.move(s,0,175);add('A: K',s,p.qualityEvidence.crystalExamples[1],{prefix:'K',one:true});const t=state(p);teleport(t,p.qualityEvidence.crest.teleport);const blocked=E.trajectory(t,0,p.qualityEvidence.gateAlternative.afterBoundaryShot.angle,p.qualityEvidence.gateAlternative.afterBoundaryShot.power,{weaponId:'W01'});assert(blocked.damage[1]<.5&&blocked.events.some(e=>e.type==='break'&&e.solidId.startsWith('036-LOW-GATE@')));const gate=p.qualityEvidence.gateAlternative.breakShot;const z=E.launch(t,gate.angle,gate.power);assert(z.events.some(e=>e.type==='break'));E.resolve(t,z);E.boundary(t);t.phase='aim';add('B: opened gate, no K',t,p.qualityEvidence.gateAlternative.afterBoundaryShot,{noBounce:true});}
 if(n===39){const ex=p.qualityEvidence.poseComparison;add('A: K pose A',s,ex[0].shot,{prefix:'K',one:true});const t=state(p,3);teleport(t,ex[5].movement);add('B: K pose B',t,ex[5].shot,{prefix:'K',one:true});const w=state(p);E.move(w,0,175);add('W-only alternative',w,p.qualityEvidence.optionalOneBounceW,{prefix:'W',one:true});}
 if(n===47)for(const ex of p.qualityEvidence.routes){const t=state(p,ex.round);teleport(t,ex.tp);if(ex.walk)E.move(t,0,ex.walk/E.combat.get(t.characterId).walk);add(`${ex.route}, pose ${ex.round===1?'A':'B'}`,t,ex.shot,ex.route==='lower'?{prefix:'W',one:true}:{noBounce:true});}
 row.reflectiveSurfaces=s.world.solids.filter(q=>q.kind==='reflector').map(q=>q.id);assert(row.reflectiveSurfaces.every(q=>/floor\d/.test(q)),'Reflector unintentionally coats a roof or bridge');report.stages.push(row);
}
report.status='PASS';const data=JSON.stringify(report,null,2)+'\n';if(process.argv.includes('--report'))fs.writeFileSync(path.join(__dirname,'minimum_checks.json'),data);console.log(data);
