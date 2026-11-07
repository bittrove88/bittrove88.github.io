'use strict';
const assert=require('node:assert/strict'),E=require('../dist/engine.js'),Save=require('../dist/save.js');
const before=require('./pickup-placement-preservation.cjs').previous,after=require('../../design/pickup_placements.json');
const fixed=p=>Object.fromEntries(Object.entries(p).filter(([k])=>!['x','h','verification'].includes(k)));
assert.deepEqual(after.placements.map(fixed),before.placements.map(fixed),'all46 kinds, quantities, stable placement IDs and spawn turns retained');
const moved=after.placements.filter((p,i)=>p.x!==before.placements[i].x||p.h!==before.placements[i].h);assert.equal(moved.length,32);
for(const p of moved){const state=E.campaign(p.stage,{equippedCharacterId:'gun',matchSeed:1}),item=state.pickups[0];item.hidden=false;const w=p.verification;assert.equal(E.move(state,0,w.walkInput||0),w.moved||0);let hits=0;for(const da of [-2,0,2])for(const dp of [-3,0,3]){const shot=E.trajectory(state,0,w.angle+da,Math.max(20,Math.min(100,w.power+dp)));if(shot.events.some(e=>e.type==='pickup'&&e.id===item.id))hits++;}assert(hits>=3,'reachable moved capsule '+p.stage);assert.equal(hits,w.neighborHits);assert.equal(E.campaign(p.stage,{pickupLedger:[p.placementId]}).pickups[0].collected,true,'saved ledger still prevents duplicates');}
assert.deepEqual([Save.schemaVersion,Save.resetVersion],[8,2]);
const snapshot=Save.decode(JSON.stringify({schemaVersion:8,campaignResetVersion:2,cleared:72,difficulty:'hard',campaignInventory:{weapons:{W07:2},skills:{S_REPAIR:3}},pickupLedger:['L007:weapon:W07']}));assert.equal(snapshot.cleared,72);assert.equal(snapshot.difficulty,'hard');assert.equal(snapshot.campaignInventory.weapons.W07,2);assert(snapshot.pickupLedger.includes('L007:weapon:W07'));
console.log('PASS four-fixes placements/save:32 moved (including the authorized map-specific adjustments),288 native neighboring shots;46 metadata records preserved');
