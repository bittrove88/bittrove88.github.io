'use strict';
// These three marketing demonstrations are regenerated from the production simulator.
const E=require('../dist/engine.js'),P=require('../dist/preview.js'),fs=require('node:fs'),path=require('node:path'),rows={};
for(const [id,stage]of [['reflection',1],['destruction',13],['teleport',4]]){
 const d=P.create(E.campaign(stage,{equippedCharacterId:'gun',matchSeed:77}),id);if(!d?.proof.valid)throw Error('No truthful demonstration '+id);
 rows[id]={id,stage,source:d.source,proof:d.proof,before:{...d.before,solids:d.before.world.solids},after:{...d.after,solids:d.after.world.solids},angle:d.plan.angle,power:d.plan.power,weaponId:d.plan.weaponId,path:d.plan.path,events:d.plan.events,impact:d.plan.end,duration:d.plan.duration,plan:d.plan};
}
fs.writeFileSync(path.resolve(__dirname,'../../site/scenes.js'),'/* Generated from ARCLINE0.11 production physics. */\nglobalThis.ArcSiteScenes='+JSON.stringify(rows)+';\n');console.log('Three service-site demonstrations synchronized');
