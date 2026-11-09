(function(root){'use strict';
const node=typeof module!=='undefined',G=node?require('./geometry.js'):root.ArcGeometry,C=node?require('./combat.js'):root.ArcCombat;
const active=s=>s?.stage===100&&!!s.spec?.finalBattle;
const config=s=>s.spec.finalBattle;
function complete(s){return s?.stage!==100||active(s)&&s.finalTeam?.index===9&&s.characterId==='gun'&&config(s).order.every(id=>(s.finalTeam?.damage[id]||0)>=config(s).requiredDamage-1e-7);}
function mapIndex(s){return Math.min(3,Math.floor((s.finalTeam?.index||0)/3));}
function place(s,initial=false){
 for(const key of ['bossEcho','bossEchoEffect','bossEchoContinuation','bossEchoFiredRound','deferredBossTelegraph'])delete s[key];
 delete s.effects.gravityField;
 const c=config(s),t=s.finalTeam,id=c.order[t.index],index=mapIndex(s),map=c.maps[index],changed=t.map!==index;
 if(initial||changed){s.spec={...s.spec,floors:map.floors,components:map.components,features:map.features,spawn:[map.spawns[id],map.bossSpawn]};delete s.spec.phaseFeatures;s.effects.destroyed=[];s.world=G.world(s.spec,s.round,s.bossPhase,s.effects);}
 s.spec={...s.spec,spawn:[map.spawns[id],map.bossSpawn],finalBackdrop:map.backdrop||null};
 const range=[35,(s.spec.worldWidth||1000)-35],enemy=s.units[1],bp=G.point(...map.bossSpawn),enemyPad=G.safePosition(s.world,bp.x,bp.y,null,range);
 if(!enemyPad)throw Error('Unsafe final boss spawn '+index);Object.assign(enemy,enemyPad,{range,slope:0});
 const raw=G.point(...map.spawns[id]),pad=G.safePosition(s.world,raw.x,raw.y,enemy,range);if(!pad)throw Error('Unsafe final team spawn '+id);if(Math.abs(pad.x-enemy.x)<c.minSpawnDistance)throw Error('Final team spawn too close '+id);
 for(const unit of s.units)for(const key of ['recoil','reaction','animation','teleportFlash'])delete unit[key];
 const hp=c.fixedHp/C.pointsPerUnit;
 Object.assign(s.units[0],pad,{range,hp,maxHp:hp,floating:false,facing:enemy.x>=pad.x?1:-1});enemy.facing=-s.units[0].facing;
 t.totalActions=(t.totalActions||0)+(initial?0:s.shotCount);s.shotCount=0;s.shotLimit=c.actionLimits?.[id]||s.spec.actionLimit;
 s.characterId=id;s.mode='W01';s.weaponId='W01';s.angle=48;s.power=20;s.teleportMode=false;s.selectedSkill=null;s.specialAmmo=c.specialAmmo;t.travel=!initial&&changed?{from:t.map,to:index,duration:c.transitionSeconds}:null;t.map=index;t.pending=false;t.serial++;
 return {mapChanged:changed,characterId:id,map:index};
}
function init(s){if(!active(s))return;s.finalTeam={index:0,map:-1,serial:-1,pending:false,damage:Object.fromEntries(config(s).order.map(id=>[id,0]))};s.units[1].hp=s.units[1].maxHp=config(s).order.length*config(s).requiredDamage;place(s,true);}
function credit(s,id,raw){if(!active(s))return raw;const t=s.finalTeam,c=config(s);if(id!==c.order[t.index])return 0;const amount=Math.min(Math.max(0,raw||0),Math.max(0,c.requiredDamage-t.damage[id]));t.damage[id]=Math.min(c.requiredDamage,Math.round((t.damage[id]+amount)*1e8)/1e8);t.pending=t.damage[id]>=c.requiredDamage-1e-7&&!complete(s);return amount;}
function guard(s){
 if(!active(s))return;
 // Each machine's credited damage is authoritative for the final clear.
 // Repeated fractional hits can leave a tiny positive HP value that displays as 0.
 if(complete(s)){s.units[1].hp=0;return;}
 if(s.units[1].hp<=0){
  s.units[1].hp=Math.max(.1,config(s).order.reduce((n,id)=>n+Math.max(0,config(s).requiredDamage-(s.finalTeam?.damage[id]||0)),0));
  if(s.result==='win'){s.result=null;s.reason=null;}
 }
}
function advance(s){if(!active(s)||!s.finalTeam.pending||s.result)return false;s.finalTeam.index++;return place(s);}
function canChange(s){return !active(s);}
// Battle-local entry snapshots never change the durable campaign save.
function snapshot(s){
 if(!active(s)||s.result||s.finalTeam.pending)return null;
 const entry=JSON.parse(JSON.stringify({...s,random:undefined}));
 entry.phase='aim';entry.time=0;entry.last=[null,null];entry.activeShot=null;entry.walkUsed=0;entry.skillUsed=false;entry.selectedSkill=null;
 for(const unit of entry.units)for(const key of ['recoil','reaction','animation','teleportFlash'])delete unit[key];
 return entry;
}
function restore(s,entry){
 if(!active(s)||!active(entry)||entry.result||entry.finalTeam?.pending)return false;
 const index=entry.finalTeam?.index,c=config(s);
 if(!Number.isInteger(index)||index<0||index>=c.order.length||entry.characterId!==c.order[index]||entry.matchSeed!==s.matchSeed)return false;
 if(c.order.some((id,i)=>entry.finalTeam.damage[id]!== (i<index?c.requiredDamage:0)))return false;
 const random=s.random;Object.assign(s,JSON.parse(JSON.stringify(entry)),{random,result:null,reason:null,phase:'aim'});
 delete s.effects.gravityField;
 if(!entry.finalBeamCharge)delete s.finalBeamCharge;
 return true;
}
const duration=(s,change)=>change?.mapChanged?config(s).transitionSeconds:.6;
const api={duration,active,complete,init,credit,guard,advance,canChange,mapIndex,snapshot,restore};if(node)module.exports=api;else root.ArcFinalTeam=api;
})(globalThis);
