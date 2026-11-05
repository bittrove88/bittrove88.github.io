'use strict';
// Design-gate probe only: native geometry, physics and teleport, no enemy-AI victory assertion.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const G=require('../../game/dist/geometry.js'),E=require('../../game/dist/engine.js'),P=require('../../game/dist/physics.js'),L=require('../../game/dist/levels.js');
const candidatePath=path.join(__dirname,'stage_057_design_candidate_20261106.json'),candidate=JSON.parse(fs.readFileSync(candidatePath,'utf8'));
const data=candidate.stageData,oldSpec=L[56],spec={...oldSpec,floors:[data.floor],features:data.features,spawn:data.spawnPoints,terrainRevision:data.terrainRevision,
  components:data.parts.map((p,i)=>({id:'057-C'+String(i+1).padStart(2,'0'),poly:p.poly||[[p.x,p.top],[p.x+p.width,p.top],[p.x+p.width,p.bottom],[p.x,p.bottom]],destructible:p.breakable??p.kind==='wall'}))};
assert.equal(oldSpec.id,57);assert.equal(oldSpec.actionLimit,16);assert.equal(oldSpec.enemyHp,5);assert.equal(oldSpec.enemyProfile,2);
assert.deepEqual({id:spec.id,actionLimit:spec.actionLimit,enemyHp:spec.enemyHp,enemyProfile:spec.enemyProfile,encounterId:spec.encounterId},
 {id:oldSpec.id,actionLimit:oldSpec.actionLimit,enemyHp:oldSpec.enemyHp,enemyProfile:oldSpec.enemyProfile,encounterId:oldSpec.encounterId});
assert.equal(spec.components.length,2);
for(const c of spec.components)for(let i=0;i<c.poly.length;i++)for(let j=i+2;j<c.poly.length;j++){
  if(i===0&&j===c.poly.length-1)continue;
  const [a,b]=[c.poly[i],c.poly[(i+1)%c.poly.length]].map(p=>G.point(...p));
  const [d,e]=[c.poly[j],c.poly[(j+1)%c.poly.length]].map(p=>G.point(...p));
  assert(!G.segment(a,b,d,e),'Self-intersecting component '+c.id);
}
L[56]=spec;
const make=()=>E.campaign(57,{matchSeed:1,equippedCharacterId:'rico'});
const s0=make(),clear=G.clearBody(s0.world,s0.units[0]),clearEnemy=G.clearBody(s0.world,s0.units[1]);
assert(clear&&clearEnemy,'Both spawn positions have physical headroom');
const broken=s0.world.solids.filter(o=>o.destructible).map(o=>o.id);
assert.deepEqual(broken,['057-C01@0']);
const opened=G.without(s0.world,broken);
assert(opened.solids.every(o=>!broken.includes(o.id))&&opened.solids.some(o=>o.id==='057-C02'),'Window removal must preserve the anchored roof');
function scan(s){
  const hits=[],samples={reflected:null,direct:null,windReflected:null};
  for(let angle=-12;angle<=120;angle++)for(let power=20;power<=100;power+=2){
    const muzzle=G.muzzle(s,0,angle);
    if(!G.lineClear(s.world,muzzle.pivot,muzzle)||s.world.solids.some(o=>G.inside(muzzle,o.poly)))continue;
    const shot=P.simulate(s,0,angle,power,{weaponId:'W01'});
    if(shot.damage[1]<=0)continue;
    const events=shot.events.map(e=>({type:e.type,bullet:e.bullet,solidId:e.solidId||undefined}));
    const groundBounce=events.some(e=>e.type==='bounce'&&e.solidId?.startsWith('W0:floor0'));
    const wind=events.some(e=>e.type==='wind');
    const row={angle,power,damage:shot.damage[1],groundBounce,wind,events};
    hits.push(row);
    if(groundBounce&&!samples.reflected)samples.reflected=row;
    if(!groundBounce&&!samples.direct)samples.direct=row;
    if(wind&&groundBounce&&!samples.windReflected)samples.windReflected=row;
  }
  return {position:{x:s.units[0].x,y:s.units[0].y},hitCount:hits.length,distinctAngles:[...new Set(hits.map(h=>h.angle))],reflectedCount:hits.filter(h=>h.groundBounce).length,directCount:hits.filter(h=>!h.groundBounce).length,samples};
}
const upper=scan(s0);
assert(upper.reflectedCount>0,'Elevated route must bounce on actual ground W');assert(upper.samples.windReflected,'At least one winning reflected shot passes wind field');
let via=null;
for(const [angle,power] of [[72,70],[66,65],[75,75],[81,85]]){
  const s=make();s.teleportMode=true;const shot=E.launch(s,angle,power);
  if(!shot)continue;E.resolve(s,shot);
  if(shot.teleportSuccess&&s.units[0].x>740&&s.units[0].x<790&&s.units[0].y>350){via={angle,power,landing:{x:s.units[0].x,y:s.units[0].y,surface:s.units[0].surface},events:shot.events.map(e=>({type:e.type,solidId:e.solidId})),s};break;}
}
assert(via,'Low mouth landing must be reached with native TELEPORT projectile');
assert(G.clearBody(via.s.world,via.s.units[0]),'Teleport landing must have clear body');
const low=scan(via.s);
assert(low.directCount>upper.directCount,'Low route should offer a larger set of unobstructed shots');
const report={stage:57,scope:'DESIGN_ONLY: actual game physics, reflective-surface event and native teleport landing; static enemy. No enemy counterattacks/AI/victory certification.',designSourceSha256:createHash('sha256').update(fs.readFileSync(candidatePath)).digest('hex'),runtimeOriginalRevision:oldSpec.terrainRevision,candidateRevision:spec.terrainRevision,actionLimit:spec.actionLimit,enemyHp:spec.enemyHp,enemyProfile:spec.enemyProfile,parts:spec.components.map(c=>({id:c.id,destructible:c.destructible,poly:c.poly})),destroyedIndependent:broken,spawn:s0.units.map(u=>({x:u.x,y:u.y,surface:u.surface})),upper,teleport:{angle:via.angle,power:via.power,landing:via.landing,events:via.events},low};
const dir=process.env.ARCLINE_STAGE_057_EVIDENCE_DIR||'/tmp/stage-057-evidence';fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'stage_057_design_ballistics.json'),JSON.stringify(report,null,2)+'\n');
console.log('STAGE_057_DESIGN_PASS',JSON.stringify({upperHits:upper.hitCount,reflectedHits:upper.reflectedCount,upperAngles:upper.distinctAngles.length,lowHits:low.hitCount,lowDirect:low.directCount,lowAngles:low.distinctAngles.length,teleport:report.teleport}));
