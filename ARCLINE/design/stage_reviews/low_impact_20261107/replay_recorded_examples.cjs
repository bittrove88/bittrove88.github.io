'use strict';
// Design evidence only. Replays three fixed examples; does not join npm test,
// search for routes, or run complete matches.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const E=require('../../../game/dist/engine.js'),G=E.geometry;
const Q=require('../../../game/tools/approved-map-qa.cjs');
const copy=x=>JSON.parse(JSON.stringify(x));
function state(p,kind){const old=E.levels[p.stage-1];let s;try{E.levels[p.stage-1]=copy(p[kind].runtime);s=E.campaign(p.stage,{equippedCharacterId:'gun',difficulty:'normal',matchSeed:4697,battleInventory:{}});}finally{E.levels[p.stage-1]=old;}return s;}
function teleport(s,angle,power){assert(E.selectTeleport(s));const z=E.launch(s,angle,power);assert(z);E.resolve(s,z);assert(z.teleportSuccess,'native teleport');while(s.pendingLoot.length)E.resolveLoot(s,null,true);E.next(s);assert.equal(s.turn,1);const retaliation=Q.enemy(s);assert(!s.result,'survive the recorded response');E.next(s);assert.equal(s.turn,0);assert.equal(s.phase,'transition');s.phase='aim';// Finish the ordinary visual transition; no turn is skipped.
 return {position:[s.units[0].x/10,(500-s.units[0].y)/10],slopeDeg:s.units[0].slope*180/Math.PI,retaliationDamage:retaliation.damage};}
function geometry(p){const before=copy(p.before.runtime),after=copy(p.after.runtime);let a,b;
 if(p.changedPart==='floor0'){a=before.floors[0];b=after.floors[0];before.floors[0]=[];after.floors[0]=[];assert.deepEqual(p.after.blueprint.floor,b);if(p.after.blueprint.floorSegments)assert.deepEqual(p.after.blueprint.floorSegments[0],b);}
 else{a=before.components.find(c=>c.id===p.changedPart).poly;b=after.components.find(c=>c.id===p.changedPart).poly;before.components.find(c=>c.id===p.changedPart).poly=[];after.components.find(c=>c.id===p.changedPart).poly=[];assert.deepEqual(p.after.blueprint.parts.find(c=>c.id===p.changedPart).poly,b);}
 assert.deepEqual(before,after,'all other runtime fields remain identical');assert.equal(a.length,b.length);const changed=[];
 for(let i=0;i<a.length;i++){assert.equal(a[i][1],b[i][1],'height unchanged');if(a[i][0]!==b[i][0])changed.push({vertex:i,before:a[i],after:b[i],shiftPx:Math.abs(a[i][0]-b[i][0])*10});}
 assert.equal(changed.length,2);assert(changed.every(v=>v.shiftPx<=100));
 if(p.changedPart==='floor0')assert(b.every((v,i)=>!i||v[0]>b[i-1][0]));
 else for(let i=0;i<b.length;i++)for(let j=i+1;j<b.length;j++){if(j===i+1||i===0&&j===b.length-1)continue;const z=G.segment(G.point(...b[i]),G.point(...b[(i+1)%b.length]),G.point(...b[j]),G.point(...b[(j+1)%b.length]));assert(!z,'polygon self-intersection');}
 return changed;}
function samePoint(actual,expected){assert(Math.hypot(actual[0]-expected[0],actual[1]-expected[1])<.001);}
function run(p){assert.deepEqual(copy(E.levels[p.stage-1]),p.before.runtime,'review baseline must still match the runtime');const changed=geometry(p),initial=state(p,'after');assert(initial.units.every(u=>G.clearBody(initial.world,u)));const results={};
 for(const kind of['before','after']){const s=state(p,kind),input=p.stage===58?p.qualityEvidence.preservedEntry:p.qualityEvidence.runs[kind].teleport;const entry=teleport(s,input.angle,input.power);const expected=p.stage===58?input[kind]:{position:input.position||input.landing,retaliation:input.retaliation};samePoint(entry.position,expected.position);assert.deepEqual(entry.retaliationDamage,expected.retaliation.damage);
  let moved=0;if(p.stage===64){moved=E.move(s,0,p.qualityEvidence.runs[kind].walk.input);samePoint([s.units[0].x/10,(500-s.units[0].y)/10],p.qualityEvidence.runs[kind].walk.position);}
  assert(G.clearBody(s.world,s.units[0]));const pose={position:[s.units[0].x/10,(500-s.units[0].y)/10],slopeDeg:s.units[0].slope*180/Math.PI};
  const record=p.stage===58?p.qualityEvidence.postEntryShot:p.qualityEvidence.runs[kind].shot,z=E.launch(s,record.angle,record.power);assert(z);E.resolve(s,z);assert(z.damage[1]>=.5&&z.damage[0]<=.1);assert.deepEqual(z.damage,record.damage);if(p.stage===92)assert(z.events.some(e=>e.type==='magnet')&&z.events.some(e=>e.type==='wind'));
  results[kind]={entry,walkedPixels:moved,pose,shot:{angle:record.angle,power:record.power,damage:z.damage,events:z.events.filter(e=>!['impact','expired'].includes(e.type))},playerActions:s.shotCount};
 }
 if(p.stage===58){samePoint(results.before.entry.position,results.after.entry.position);assert.deepEqual(results.before.shot.damage,results.after.shot.damage);}
 if(p.stage===64){assert(Math.abs(results.after.pose.slopeDeg)<.001);for(const kind of['before','after']){const s=state(p,kind);assert.deepEqual(E.trajectory(s,0,3,50,{weaponId:'W01'}).damage,[0,1.5]);assert(E.trajectory(s,0,36,40,{weaponId:'W01'}).events.some(e=>e.type==='pickup'&&e.id==='SK064'));}}
 if(p.stage===92){assert(Math.abs(results.after.pose.slopeDeg)<.001);for(const kind of['before','after'])assert(E.trajectory(state(p,kind),0,116,50,{weaponId:'W01'}).events.some(e=>e.type==='pickup'&&e.id==='W14'));}
 return {stage:p.stage,changedVertices:changed,onlyOneShapeChanged:true,initialBodiesClear:true,results};}
const rows=[58,64,92].map(n=>run(JSON.parse(fs.readFileSync(path.join(__dirname,'stage_'+String(n).padStart(3,'0')+'_proposal.json')))));
const report={status:'PASS',baseline:'0.24.1',scope:'Three fixed Gun/Normal/seed4697 examples, before and after: one teleport, one autonomous enemy response, optional short walk, one W01 shot. Not complete matches, all branches, human win rates, or production integration.',rows};
fs.writeFileSync(path.join(__dirname,'minimum_checks.json'),JSON.stringify(report,null,2)+'\n');
console.log('PASS: 58,64,92 — two horizontal vertex edits each, native entry/response/W01, initial support, retained pickup contacts.');
