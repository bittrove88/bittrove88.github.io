'use strict';
// 0.24.3 explicitly moves capsules into the entry view. Historical map hashes
// still protect every other field, including IDs, stock and appearance turns.
const {execFileSync}=require('node:child_process');
const previous=JSON.parse(execFileSync('git',['show','fee9c40:ARCLINE/design/pickup_placements.json'],{encoding:'utf8'}));
const byId=new Map(previous.placements.map(p=>[p.placementId,p]));
module.exports=level=>({...level,pickups:level.pickups.map(p=>{const old=byId.get(p.placementId);if(!old)return p;return {...p,x:old.x,h:old.h,verification:old.verification};})});
module.exports.previous=previous;
