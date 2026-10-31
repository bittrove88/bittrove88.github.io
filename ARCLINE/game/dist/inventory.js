(function(root){
'use strict';
const W=typeof module!=='undefined'?require('./weapons.js'):root.ArcWeapons;
const weaponIds=W.weapons.filter(w=>w.id!=='W01').map(w=>w.id),skillIds=W.skills;
const limits={weapons:3,skills:2,count:3};
function counts(raw,ids,slots){
 const out={};if(!raw||typeof raw!=='object'||Array.isArray(raw))return out;
 for(const [id,n] of Object.entries(raw))if(ids.includes(id)&&Number.isInteger(n)&&n>0&&Object.keys(out).length<slots)out[id]=Math.min(limits.count,n);
 return out;
}
function normalize(raw){return {weapons:counts(raw?.weapons,weaponIds,limits.weapons),skills:counts(raw?.skills,skillIds,limits.skills)};}
function fromState(s){return normalize({weapons:s.weaponStock,skills:s.skills});}
function add(raw,kind,id,amount=1,fill=false){
 const inventory=normalize(raw),ids=kind==='weapons'?weaponIds:kind==='skills'?skillIds:[];
 if(!ids.includes(id)||!Number.isInteger(amount)||amount<1)return {status:'invalid',inventory,taken:0};
 const pool=inventory[kind],before=pool[id]||0;
 if(!before&&Object.keys(pool).length>=limits[kind])return {status:'pending',inventory,taken:0};
 const next=fill?limits.count:Math.min(limits.count,before+amount),taken=next-before;
 if(taken<=0)return {status:'full',inventory,taken:0};
 pool[id]=next;return {status:'accepted',inventory,taken};
}
function replace(raw,kind,id,amount,fill,removeId){
 const inventory=normalize(raw);
 if(!inventory[kind]||!Object.hasOwn(inventory[kind],removeId)||removeId===id)return {status:'invalid',inventory,taken:0};
 delete inventory[kind][removeId];return add(inventory,kind,id,amount,fill);
}
function supply(raw,skills,stage){
 let inventory=normalize(raw);const pending=[];
 for(const [id,n] of Object.entries(skills||{})){
  const result=add(inventory,'skills',id,n);inventory=result.inventory;
  if(result.status==='pending')pending.push({kind:'skills',id,amount:Math.min(3,n),fill:false,origin:'supply',placementId:`L${String(stage).padStart(3,'0')}:supply:${id}`});
 }
 return {inventory,pending};
}
function apply(s,inventory){const safe=normalize(inventory);s.weaponStock=safe.weapons;s.skills=safe.skills;return safe;}
const api={weaponIds,skillIds,limits,normalize,fromState,add,replace,supply,apply};
if(typeof module!=='undefined')module.exports=api;else root.ArcInventory=api;
})(globalThis);
