(function(root){
'use strict';
const key='arcline-campaign-v1',revision='1.1.0';
const weaponIds=Array.from({length:20},(_,i)=>'W'+String(i+1).padStart(2,'0'));
const cosmeticIds=[...Array.from({length:27},(_,i)=>'S'+String(i+1).padStart(2,'0')),...Array.from({length:10},(_,i)=>'B'+String(i+1).padStart(2,'0'))];
const validIds=(xs,allowed)=>[...new Set((Array.isArray(xs)?xs:[]).filter(x=>allowed.includes(x)))];
function decode(raw){
 const p=raw?JSON.parse(raw):{};if(!p||typeof p!=='object'||Array.isArray(p))throw Error('Invalid save');
 if(p.schemaVersion!==undefined&&p.schemaVersion!==2)throw Error('Unsupported save version');
 const unlocked=validIds(p.unlockedWeaponIds,weaponIds);if(!unlocked.includes('W01'))unlocked.unshift('W01');
 const cosmetics=validIds(p.collectedCosmeticIds,cosmeticIds);
 const out={schemaVersion:2,contentRevision:revision,cleared:Number.isInteger(p.cleared)?Math.max(0,Math.min(100,p.cleared)):0,unlockedWeaponIds:unlocked,collectedCosmeticIds:cosmetics,equippedWeaponId:unlocked.includes(p.equippedWeaponId)?p.equippedWeaponId:'W01',equippedCosmeticId:cosmetics.includes(p.equippedCosmeticId)?p.equippedCosmeticId:null,seenPreviewIds:validIds(p.seenPreviewIds,[...weaponIds,...['controls','touch-controls-v2','slope','pickup','boss-swap','ceiling-lift','gate-choices','W','B','C','K','U','F','V','M','BURST','BLINK','PUSH','BOUNCE','PULL','SPLIT','PHASE','SWAP']])};
 if(p.legacyBackup&&typeof p.legacyBackup==='string')out.legacyBackup=p.legacyBackup;
 if(raw&&p.schemaVersion!==2)out.legacyBackup=raw;
 return out;
}
function create(adapter,status=()=>{}){
 let data=decode(null),ready=false,chain=Promise.resolve(),dirty=false;
 async function load(){try{const raw=await adapter.load();data=decode(raw);if(raw&&data.legacyBackup&&adapter.backup)await adapter.backup(raw);ready=true;status('saved');return data;}catch(e){ready=false;status('load-failed');return data;}}
 function save(){dirty=true;if(!ready)return chain;const snapshot=JSON.stringify(data);chain=chain.catch(()=>{}).then(async()=>{try{await adapter.save(snapshot);dirty=false;status('saved');}catch(e){dirty=true;status('save-failed');}});return chain;}
 return {load,save,get data(){return data;},get ready(){return ready;},get dirty(){return dirty;},get pending(){return chain;}};
}
const api={key,revision,weaponIds,cosmeticIds,decode,create};if(typeof module!=='undefined')module.exports=api;else root.ArcSave=api;
})(globalThis);
