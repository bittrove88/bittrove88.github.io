(function(root){
'use strict';
const key='arcline-campaign-v1',revision='4.1.0';
const Run=typeof module!=='undefined'?require('./campaign-run.js'):root.ArcCampaignRun;
const weaponIds=Array.from({length:20},(_,i)=>'W'+String(i+1).padStart(2,'0'));
const cosmeticIds=[...Array.from({length:27},(_,i)=>'S'+String(i+1).padStart(2,'0')),...Array.from({length:10},(_,i)=>'B'+String(i+1).padStart(2,'0'))];
const characterIds=['gun','ban','hibari','hana','rin','mogu','koro','sora','rico','yui'];
const lessonIds=['controls','teleport','wall-fall','destruction','choices','touch-controls-v2','slope','move','aim','charge','pickup','reflection','roof','height','terminal','boss-swap','boss-core','ceiling-lift','gate-choices','bridge','cloud','crystal','updraft','wind','vent','magnet','W','B','C','K','U','F','V','M','BURST','BLINK','PUSH','BOUNCE','PULL','SPLIT','PHASE','SWAP'];
const specialIds=characterIds.map(id=>'S_'+id.toUpperCase());
const previewIds=[...weaponIds,...lessonIds,...specialIds,...['v2:','v3:','v4:'].flatMap(prefix=>[...weaponIds,...lessonIds,...specialIds].map(id=>prefix+id))];
const validIds=(xs,allowed)=>[...new Set((Array.isArray(xs)?xs:[]).filter(x=>allowed.includes(x)))];
function decode(raw){
 const p=raw?JSON.parse(raw):{};if(!p||typeof p!=='object'||Array.isArray(p))throw Error('Invalid save');
 if(p.schemaVersion!==undefined&&p.schemaVersion!==2&&p.schemaVersion!==3)throw Error('Unsupported save version');
 const unlocked=validIds(p.unlockedWeaponIds,weaponIds);if(!unlocked.includes('W01'))unlocked.unshift('W01');
 const roles=typeof module!=='undefined'?require('./weapons.js').coreUnlocks:root.ArcWeapons.coreUnlocks;for(const [id,level]of Object.entries(roles))if(Number.isInteger(p.cleared)&&p.cleared>=level&&!unlocked.includes(id))unlocked.push(id);
 const cosmetics=validIds(p.collectedCosmeticIds,cosmeticIds);
 const out={schemaVersion:3,contentRevision:revision,cleared:Number.isInteger(p.cleared)?Math.max(0,Math.min(100,p.cleared)):0,unlockedWeaponIds:unlocked,collectedCosmeticIds:cosmetics,equippedWeaponId:unlocked.includes(p.equippedWeaponId)?p.equippedWeaponId:'W01',equippedCosmeticId:cosmetics.includes(p.equippedCosmeticId)?p.equippedCosmeticId:null,seenPreviewIds:validIds(p.seenPreviewIds,previewIds)};
 if(p.legacyBackup&&typeof p.legacyBackup==='string')out.legacyBackup=p.legacyBackup;
 out.equippedCharacterId=characterIds.includes(p.equippedCharacterId)?p.equippedCharacterId:'gun';
 out.difficulty=['easy','normal','hard'].includes(p.difficulty)?p.difficulty:'normal';
 out.chapterRun=Run.decode(p.chapterRun,Math.min(100,out.cleared+1));
 if(p.chapterRun&&!out.chapterRun&&!out.legacyBackup)out.legacyBackup=raw;
 if(raw&&(p.schemaVersion!==3||p.contentRevision&&p.contentRevision!==revision&&!out.legacyBackup))out.legacyBackup=raw;
 return out;
}
function create(adapter,status=()=>{}){
 let data=decode(null),ready=false,chain=Promise.resolve(),dirty=false,generation=0;
 async function load(){try{const raw=await adapter.load();data=decode(raw);if(raw&&data.legacyBackup&&adapter.backup)await adapter.backup(raw);ready=true;status('saved');return data;}catch(e){ready=false;status('load-failed');return data;}}
 function save(){dirty=true;const ticket=++generation;if(!ready)return chain.then(()=>false);const snapshot=JSON.stringify(data);chain=chain.catch(()=>{}).then(async()=>{try{await adapter.save(snapshot);if(ticket===generation){dirty=false;status('saved');}return true;}catch(e){if(ticket===generation){dirty=true;status('save-failed');}return false;}});return chain;}
 return {load,save,get data(){return data;},get ready(){return ready;},get dirty(){return dirty;},get pending(){return chain;}};
}
const api={key,revision,weaponIds,cosmeticIds,characterIds,previewIds,decode,create};if(typeof module!=='undefined')module.exports=api;else root.ArcSave=api;
})(globalThis);
