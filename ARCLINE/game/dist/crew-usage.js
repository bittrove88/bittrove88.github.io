(function(root){'use strict';const node=typeof module!=='undefined',Crew=node?require('./crew.js'):root.ArcCrew;
const limit=5,restStages=5;
function normalize(raw){if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;const cooldowns={};for(const id of Crew.ids){const n=raw.cooldowns?.[id];if(Number.isInteger(n)&&n>0)cooldowns[id]=Math.min(restStages,n);}const id=Crew.ids.includes(raw.id)?raw.id:null,count=id&&Number.isInteger(raw.count)?Math.max(0,Math.min(limit,raw.count)):0;return count||Object.keys(cooldowns).length?{id,count,cooldowns}:null;}
function remaining(data,id){return normalize(data?.machineUsage)?.cooldowns[id]||0;}
function blocked(data,id){return Crew.normalize(data?.unlockedCharacterIds).length>1&&remaining(data,id)>0;}
function record(data,state){if(state.stage===100||!Crew.ids.includes(state.characterId))return;const old=normalize(data.machineUsage)||{id:null,count:0,cooldowns:{}};
 // Before the first companion joins, replaying an already-cleared map must not create a one-machine deadlock.
 if(Crew.normalize(data.unlockedCharacterIds).length===1&&state.stage<=data.cleared)return;
 const cooldowns={};for(const [id,n]of Object.entries(old.cooldowns))if(n>1)cooldowns[id]=n-1;
 const count=old.id===state.characterId&&!old.cooldowns[state.characterId]?Math.min(limit,old.count+1):1;if(count===limit)cooldowns[state.characterId]=restStages;
 data.machineUsage={id:state.characterId,count,cooldowns};}
const api={limit,restStages,normalize,remaining,blocked,record};if(node)module.exports=api;else root.ArcCrewUsage=api;
})(globalThis);
