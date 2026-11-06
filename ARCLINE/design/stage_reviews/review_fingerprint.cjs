'use strict';
const {createHash}=require('node:crypto');
module.exports=(e,p)=>createHash('sha256').update(JSON.stringify({
 stage:e.stage,source:p.sourceMainCommit,
 geometry:{width:e.after.width,floors:e.after.floors,parts:e.after.parts.map(x=>({id:x.id,kind:x.kind,poly:x.poly,breakable:x.breakable,reflectiveUnderside:x.reflectiveUnderside})),features:e.after.features,player:e.after.player,enemy:e.after.enemy,pickups:e.after.pickups.map(x=>({placementId:x.placementId,id:x.id,amount:x.amount,spawnTurn:x.spawnTurn,x:x.x,h:x.h}))},
 anchors:p.routeDesign.anchors,destructionPlans:p.destructionPlans,currentRules:p.difficulty.currentRules,
})).digest('hex');
