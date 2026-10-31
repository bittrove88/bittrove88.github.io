(function(root){
'use strict';
const node=typeof module!=='undefined',I=node?require('./inventory.js'):root.ArcInventory,L=node?require('./levels.js'):root.ArcLevels;
const chapter=stage=>Math.floor((stage-1)/10)+1;
const randomSeed=()=>Math.floor(Math.random()*4294967296)>>>0;
const newId=()=>Date.now().toString(36)+'-'+randomSeed().toString(36);
function ledger(raw,stage){
 return [...new Set((Array.isArray(raw)?raw:[]).filter(id=>{
  if(typeof id!=='string'||id.length>100||!/^L\d{3}:[\w:-]+$/.test(id))return false;
  const n=Number(id.slice(1,4));return n>=1&&n<=stage&&chapter(n)===chapter(stage);
 }))].slice(0,200);
}
function decode(raw,maxStage=100){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.version!==1)return null;
 if(!Number.isInteger(raw.stage)||raw.stage<1||raw.stage>Math.min(100,maxStage)||!Number.isInteger(raw.seed)||raw.seed<0||raw.seed>4294967295)return null;
 if(typeof raw.runId!=='string'||!/^[-\w]{1,80}$/.test(raw.runId)||!raw.inventory||typeof raw.inventory!=='object')return null;
 const pending=(Array.isArray(raw.pending)?raw.pending:[]).filter(p=>p?.kind==='skills'&&I.skillIds.includes(p.id)&&Number.isInteger(p.amount)&&p.amount>0&&p.origin==='supply').slice(0,8).map(p=>({kind:'skills',id:p.id,amount:Math.min(3,p.amount),fill:false,origin:'supply',placementId:`L${String(raw.stage).padStart(3,'0')}:supply:${p.id}`}));
 const inventory=I.normalize(raw.inventory),mode=typeof raw.mode==='string'&&(raw.mode==='W01'||inventory.weapons[raw.mode]>0)?raw.mode:'W01';
 return {version:1,runId:raw.runId,stage:raw.stage,chapter:chapter(raw.stage),seed:raw.seed,inventory,mode,pickupLedger:ledger(raw.pickupLedger,raw.stage),pending};
}
function checkpoint(stage,inventory={},pickupLedger=[],runId=newId(),seed=randomSeed()){
 const supplied=I.supply(inventory,L[stage-1].skills,stage);
 return {version:1,runId,stage,chapter:chapter(stage),seed:seed>>>0,inventory:supplied.inventory,mode:'W01',pickupLedger:ledger(pickupLedger,stage),pending:supplied.pending};
}
function practice(data,stage,seed=randomSeed()){
 const weapon=I.weaponIds.includes(data.equippedWeaponId)&&(data.unlockedWeaponIds||[]).includes(data.equippedWeaponId)?data.equippedWeaponId:null;
 const entry=checkpoint(stage,{weapons:weapon?{[weapon]:3}:{},skills:{}},[],newId(),seed);entry.mode=weapon||'W01';return {practice:true,entry};
}
function inspect(data,stage){
 if(data.chapterRun?.stage===stage)return {practice:false,entry:decode(data.chapterRun)};
 if(!data.chapterRun&&data.cleared<100&&stage===data.cleared+1)return {practice:false,entry:{stage,chapter:chapter(stage),...I.supply({},L[stage-1].skills,stage)}};
 return practice(data,stage,0);
}
function begin(data,stage,options={}){
 const active=decode(data.chapterRun,Math.min(100,data.cleared+1));
 if(active?.stage===stage){data.chapterRun=active;return {practice:false,entry:decode(active)};}
 if(!active&&data.cleared<100&&stage===data.cleared+1){data.chapterRun=checkpoint(stage,{},[],newId(),options.seed??randomSeed());return {practice:false,entry:decode(data.chapterRun)};}
 return practice(data,stage,options.seed??randomSeed());
}
function restart(data,stage,options={}){
 if(!Number.isInteger(stage)||stage<1||stage>100)return null;
 const first=(chapter(stage)-1)*10+1;
 if(first>data.cleared+1||first>100||first<1)return null;
 data.chapterRun=checkpoint(first,{},[],newId(),options.seed??randomSeed());return {practice:false,entry:decode(data.chapterRun)};
}
function matches(data,context){const a=data.chapterRun,b=context?.entry;return !context?.practice&&a&&b&&a.runId===b.runId&&a.stage===b.stage&&a.seed===b.seed;}
function updatePreparation(data,context,state){
 if(!matches(data,context)||state.shotCount!==0||state.round!==1)return false;
 const active=data.chapterRun;active.inventory=I.fromState(state);active.mode=state.mode==='W01'||active.inventory.weapons[state.mode]>0?state.mode:'W01';active.pending=(state.pendingLoot||[]).filter(p=>p.origin==='supply').map(p=>({...p}));
 context.entry=decode(active);return true;
}
function chooseWeapon(data,stage,id){
 const active=data.chapterRun;if(active?.stage!==stage||id!=='W01'&&!active.inventory.weapons[id])return false;
 // The selected opening shot is a preference, never a source of ammunition.
 active.mode=id;return true;
}
function finish(data,context,state,options={}){
 if(!matches(data,context)||state.stage!==context.entry.stage||state.result!=='win')return {advanced:false};
 if(state.pendingLoot?.length)return {advanced:false,pending:true};
 const reset=state.stage%10===0;data.cleared=Math.max(data.cleared,state.stage);
 const inventory=reset?I.normalize({}):I.fromState(state),pickupLedger=reset?[]:ledger(state.collectedPickupIds,state.stage);
 data.chapterRun=state.stage===100?null:checkpoint(state.stage+1,inventory,pickupLedger,reset?newId():context.entry.runId,options.seed??randomSeed());
 if(data.chapterRun&&!reset&&data.chapterRun.inventory.weapons[state.mode]>0)data.chapterRun.mode=state.mode;
 return {advanced:true,reset,nextStage:state.stage===100?null:state.stage+1};
}
const api={chapter,decode,begin,inspect,restart,finish,updatePreparation,chooseWeapon,checkpoint};
if(typeof module!=='undefined')module.exports=api;else root.ArcCampaignRun=api;
})(globalThis);
