'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const E=require('../dist/engine.js'),S=require('../dist/save.js'),R=require('../dist/campaign-run.js'),G=E.geometry;
const root=path.resolve(__dirname,'../dist'),out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-chapter-stock';
let checks=0;const ok=(v,m)=>{checks++;assert(v,m);},equal=(a,b,m)=>{checks++;assert.deepEqual(a,b,m);};
const authored=JSON.parse(fs.readFileSync(path.resolve(root,'../../design/runtime_campaign_20x5.json'),'utf8'));
equal(E.levels,authored.levels,'runtime is exactly the compiled canonical campaign');
const edgeDistance=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,t=G.clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);};
const pickups=[];
for(const level of E.levels.filter(l=>l.pickups.length)){
 const state=E.campaign(level.id,{matchSeed:20261031,battleInventory:{weapons:{W02:2}},battleMode:'W01'});
 for(const item of state.pickups){
  ok(!state.world.solids.some(o=>G.inside(item,o.poly)||o.poly.some((a,i)=>edgeDistance(item,a,o.poly[(i+1)%o.poly.length])<28)),'pickup is outside rock with clearance '+level.id+' '+item.id);
  let route=null;
  for(let angle=-8;angle<=84&&!route;angle+=4)for(let power=20;power<=100&&!route;power+=5){
   const shot=E.trajectory(state,0,angle,power);
   if(shot.events.some(e=>e.type==='pickup'&&e.id===item.id))route={angle,power};
  }
  ok(route,'ordinary projectile can reach existing pickup '+level.id+' '+item.id);
  pickups.push({stage:level.id,id:item.id,x:item.x,y:item.y,ordinaryRoute:route});
 }
}
ok(pickups.length===16,'all sixteen existing supplies audited; no placements added');

function physical(shot){return {...shot,events:shot.events.filter(e=>e.type!=='pickup')};}
function withoutPosition(item){const {x,h,...rest}=item;return rest;}
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
(async()=>{
 const baseline=process.env.ARCLINE_PREVIOUS_DIST;let parity=null,legacyClient=null;
 if(baseline){
  const previous=require(path.resolve(baseline,'engine.js')),oldSave=require(path.resolve(baseline,'save.js')),shifted=[];
  for(let i=0;i<100;i++){
   const {pickups:oldItems,...oldLevel}=previous.levels[i],{pickups:newItems,...newLevel}=E.levels[i];
   equal(newLevel,oldLevel,'all non-pickup stage data unchanged '+(i+1));
   equal(newItems.map(withoutPosition),oldItems.map(withoutPosition),'supply identities/counts unchanged '+(i+1));
   newItems.forEach((item,j)=>{if(item.x!==oldItems[j].x||item.h!==oldItems[j].h)shifted.push({stage:i+1,id:item.id,before:{x:oldItems[j].x,h:oldItems[j].h},after:{x:item.x,h:item.h}});});
  }
  equal(shifted.map(r=>r.stage),[7,12,18,28,48,84,85,95],'only eight buried existing supplies were repositioned');
  const unchanged=['physics.js','geometry.js','weapons.js','characters.js','render.js','aim-guide.js','viewport.js','fullscreen.js'];
  for(const name of unchanged)equal(sha(path.join(root,name)),sha(path.join(baseline,name)),'unchanged production module '+name);
  let trajectories=0;
  for(let stage=1;stage<=100;stage++)for(const w of E.weapons){
   const options={matchSeed:20261031,equippedWeaponId:w.id,unlockedWeaponIds:E.weapons.map(w=>w.id)};
   const a=previous.campaign(stage,options),b=E.campaign(stage,options);
   equal(physical(E.trajectory(b,0,Math.max(48,w.minAngle||-12),65)),physical(previous.trajectory(a,0,Math.max(48,w.minAngle||-12),65)),'physical shot unchanged stage'+stage+' '+w.id);trajectories++;
  }
  parity={stages:100,weapons:20,trajectories,unchanged,shifted,excluded:'Pickup contact events only: those change intentionally when buried supplies are repositioned. Full projectile paths, velocities, contacts, impacts, damage, destruction and durations are compared.'};
  const p=S.decode(JSON.stringify({schemaVersion:2,cleared:6,equippedWeaponId:'W20',unlockedWeaponIds:E.weapons.map(w=>w.id)}));p.chapterRun=R.checkpoint(7,{weapons:{W02:2}});
  let writes=0;const oldClient=oldSave.create({load:async()=>JSON.stringify(p),save:async()=>writes++});await oldClient.load();await oldClient.save();ok(!oldClient.ready&&writes===0,'actual previous client refuses newer schema without overwriting stock');
  legacyClient={schema:3,previousClientReady:oldClient.ready,writes};
 }
 const report={status:'PASS',checks,pickups,parity,legacyClient,scope:'All authored pickups have clear ordinary-shot routes. Optional comparison against an immutable previous distribution verifies terrain/combat parity and old-client write protection; not exhaustive aiming or human balance.'};
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'CHAPTER_STOCK_CONTENT.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:'PASS',checks,pickups:pickups.length,physicalCases:parity?.trajectories||0,legacyClient},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
