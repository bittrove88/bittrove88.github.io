'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const E=require('../dist/engine.js');
const copy=value=>JSON.parse(JSON.stringify(value));
function state(stage,direction=0,difficulty='normal'){
 const s=E.campaign(stage,{difficulty,matchSeed:20261109});
 for(let round=1;round<=2&&!s.result;round++){
  s.turn=0;s.phase='aim';const player=E.launch(s,85,20);E.resolve(s,player);E.next(s);
  const enemy=E.cpuPlan(s,E.seeded((s.matchSeed+s.round*1009)>>>0));E.launch(s,enemy.angle,enemy.power,enemy);E.resolve(s,enemy);E.next(s);
 }
 if(s.result||s.round!==3)throw Error('Opening did not reach the first technique: '+stage);
 s.turn=0;s.phase='aim';const walked=E.move(s,0,direction*10000);E.telegraph(s);
 // This pose represents the start of the warning turn, with a fresh walk budget.
 s.walkUsed=0;s.turn=1;s.phase='cpu';
 return {s,walked};
}
function observe(stage,direction=0,difficulty='normal',count=128){
 const {s,walked}=state(stage,direction,difficulty),precise=E.cpuPlan(s,()=>.5),samples=[];
 for(let i=1;i<=count;i++){
  const seed=(Math.imul(i,2654435761)^0xa53c9e71)>>>0,p=E.cpuPlan(s,E.seeded(seed));
  samples.push({seed,damage:E.combat.points(p.damage[0])});
 }
 return {stage,direction,difficulty,walked,player:{x:s.units[0].x,y:s.units[0].y},precise:E.combat.points(precise.damage[0]),hits:samples.filter(p=>p.damage>0).length,total:count,samples};
}
if(require.main===module){
 const stages=process.argv.slice(2).map(Number);if(!stages.length)throw Error('Select boss stages, for example: node game/tools/probe_boss_ballistics.cjs 30 50 60');
 const rows=[];for(const stage of stages){if(stage<10||stage>90||stage%10)throw Error('Expected a boss stage10..90');for(const direction of [-1,0,1])rows.push(observe(stage,direction));console.log(JSON.stringify({stage,positions:rows.filter(r=>r.stage===stage).map(({samples,...r})=>r)}));}
 if(process.env.ARCLINE_EVIDENCE_DIR){
  const files=['design/attacks/definitions.json','game/dist/engine.js','game/dist/physics.js','game/dist/levels.js'],hashes=Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'../..',file))).digest('hex')]));
  fs.mkdirSync(process.env.ARCLINE_EVIDENCE_DIR,{recursive:true});fs.writeFileSync(path.join(process.env.ARCLINE_EVIDENCE_DIR,'OBSERVATIONS.json'),JSON.stringify({scope:'Local tuning observations, Normal, first unique turn, full legal walking before warning,128 held-out seeded aim errors. Not final acceptance.',hashes,rows},null,2)+'\n');
 }
}
module.exports={copy,state,observe};
