'use strict';
const machineIds=['gun','ban','hibari','hana','rin','mogu','koro','sora','rico','yui'];
const cases=[];
for(const characterId of machineIds)for(let stage=1;stage<=100;stage++)cases.push({characterId,stage,seed:104729+stage*37,angle:[18,48,76][stage%3],power:[42,70,94][stage%3],special:stage%2===0,round:1});
for(const characterId of ['gun','rin','sora','yui'])for(const stage of [13,23,33,39,53,62,74,79,80,90,98,100])for(const round of [2,3])cases.push({characterId,stage,seed:104729+stage*37,angle:62,power:81,special:round===3,round,broken:stage%10===0?1:0,phase:stage===100?round-1:0});
function stateFor(E,c){
 const s=E.campaign(c.stage,{equippedCharacterId:c.characterId,matchSeed:c.seed,battleInventory:{weapons:{},skills:{}}});
 if(c.round>1){s.round=c.round;E.rebuildWorld(s);}
 if(c.phase){s.pendingChanges.push({type:'phase',value:c.phase});E.boundary(s);}
 if(c.broken){s.units[1].parts.slice(0,c.broken).forEach(p=>p.hp=0);s.effects.broken=c.broken;E.rebuildWorld(s);}
 return s;
}
function sample(E,c){
 const s=stateFor(E,c),before=JSON.stringify(s),id=c.special?E.combat.get(c.characterId).special.id:'W01';
 const shot=E.trajectory(s,0,c.angle,c.power,{weaponId:id,skill:null});
 return {before,after:JSON.stringify(s),world:JSON.stringify(s.world),shot:JSON.stringify(shot),muzzle:E.geometry.muzzle(s,0,c.angle)};
}
module.exports={machineIds,cases,stateFor,sample};
