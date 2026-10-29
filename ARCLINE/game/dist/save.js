(function(root){
'use strict';
const key='arcline-campaign-v1',revision='4.1.0';
const weaponIds=Array.from({length:20},(_,i)=>'W'+String(i+1).padStart(2,'0'));
const cosmeticIds=[...Array.from({length:27},(_,i)=>'S'+String(i+1).padStart(2,'0')),...Array.from({length:10},(_,i)=>'B'+String(i+1).padStart(2,'0'))];
const lessonIds=['controls','teleport','wall-fall','destruction','choices','touch-controls-v2','slope','move','aim','charge','pickup','reflection','roof','height','terminal','boss-swap','boss-core','ceiling-lift','gate-choices','bridge','cloud','crystal','updraft','wind','vent','magnet','W','B','C','K','U','F','V','M','BURST','BLINK','PUSH','BOUNCE','PULL','SPLIT','PHASE','SWAP'];
const previewIds=[...weaponIds,...lessonIds,...['v2:','v3:','v4:'].flatMap(prefix=>[...weaponIds,...lessonIds].map(id=>prefix+id))];
const validIds=(xs,allowed)=>[...new Set((Array.isArray(xs)?xs:[]).filter(x=>allowed.includes(x)))];
function decode(raw){
 const p=raw?JSON.parse(raw):{};if(!p||typeof p!=='object'||Array.isArray(p))throw Error('Invalid save');
 if(p.schemaVersion!==undefined&&p.schemaVersion!==2)throw Error('Unsupported save version');
 const unlocked=validIds(p.unlockedWeaponIds,weaponIds);if(!unlocked.includes('W01'))unlocked.unshift('W01');
 const roles=typeof module!=='undefined'?require('./weapons.js').coreUnlocks:root.ArcWeapons.coreUnlocks;for(const [id,level]of Object.entries(roles))if(Number.isInteger(p.cleared)&&p.cleared>=level&&!unlocked.includes(id))unlocked.push(id);
 const cosmetics=validIds(p.collectedCosmeticIds,cosmeticIds);
 const out={schemaVersion:2,contentRevision:revision,cleared:Number.isInteger(p.cleared)?Math.max(0,Math.min(100,p.cleared)):0,unlockedWeaponIds:unlocked,collectedCosmeticIds:cosmetics,equippedWeaponId:unlocked.includes(p.equippedWeaponId)?p.equippedWeaponId:'W01',equippedCosmeticId:cosmetics.includes(p.equippedCosmeticId)?p.equippedCosmeticId:null,seenPreviewIds:validIds(p.seenPreviewIds,previewIds)};
 if(p.legacyBackup&&typeof p.legacyBackup==='string')out.legacyBackup=p.legacyBackup;
 if(raw&&(p.schemaVersion!==2||p.contentRevision&&p.contentRevision!==revision&&!out.legacyBackup))out.legacyBackup=raw;
 return out;
}
function create(adapter,status=()=>{}){
 let data=decode(null),ready=false,chain=Promise.resolve(),dirty=false;
 async function load(){try{const raw=await adapter.load();data=decode(raw);if(raw&&data.legacyBackup&&adapter.backup)await adapter.backup(raw);ready=true;status('saved');return data;}catch(e){ready=false;status('load-failed');return data;}}
 function save(){dirty=true;if(!ready)return chain;const snapshot=JSON.stringify(data);chain=chain.catch(()=>{}).then(async()=>{try{await adapter.save(snapshot);dirty=false;status('saved');}catch(e){dirty=true;status('save-failed');}});return chain;}
 return {load,save,get data(){return data;},get ready(){return ready;},get dirty(){return dirty;},get pending(){return chain;}};
}
const api={key,revision,weaponIds,cosmeticIds,previewIds,decode,create};if(typeof module!=='undefined')module.exports=api;else root.ArcSave=api;
})(globalThis);
