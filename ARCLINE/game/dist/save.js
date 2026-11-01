(function(root){
'use strict';
const key='arcline-campaign-v1',revision='5.0.0';
const Run=typeof module!=='undefined'?require('./campaign-run.js'):root.ArcCampaignRun;
const Journal=typeof module!=='undefined'?require('./journal.js'):root.ArcJournal;
const schemaVersion=8,resetVersion=1;
const Crew=typeof module!=='undefined'?require('./crew.js'):root.ArcCrew;
const weaponIds=Array.from({length:20},(_,i)=>'W'+String(i+1).padStart(2,'0'));
const characterIds=Crew.ids;
const lessonIds=['controls','teleport','wall-fall','destruction','choices','touch-controls-v2','slope','move','aim','charge','pickup','reflection','roof','height','terminal','boss-swap','boss-core','ceiling-lift','gate-choices','bridge','cloud','crystal','updraft','wind','vent','magnet','W','B','C','K','U','F','V','M','BURST','BLINK','PUSH','BOUNCE','PULL','SPLIT','PHASE','SWAP','S_GUARD','S_BREACH','S_REPAIR'];
const specialIds=characterIds.map(id=>'S_'+id.toUpperCase());
const previewIds=[...weaponIds,...lessonIds,...specialIds,...['v2:','v3:','v4:','v5:'].flatMap(prefix=>[...weaponIds,...lessonIds,...specialIds].map(id=>prefix+id))];
const validIds=(xs,allowed)=>[...new Set((Array.isArray(xs)?xs:[]).filter(x=>allowed.includes(x)))];
function decode(raw){
 const p=raw?JSON.parse(raw):{};if(!p||typeof p!=='object'||Array.isArray(p))throw Error('Invalid save');
 if(p.schemaVersion!==undefined&&![2,3,4,5,6,7,8].includes(p.schemaVersion))throw Error('Unsupported save version');
 if(p.schemaVersion===8&&p.campaignResetVersion>resetVersion)throw Error('Unsupported campaign revision');
 const unlocked=validIds(p.unlockedWeaponIds,weaponIds);if(!unlocked.includes('W01'))unlocked.unshift('W01');
 const roles=typeof module!=='undefined'?require('./weapons.js').coreUnlocks:root.ArcWeapons.coreUnlocks;for(const [id,level]of Object.entries(roles))if(Number.isInteger(p.cleared)&&p.cleared>=level&&!unlocked.includes(id))unlocked.push(id);
 const isLegacy=!!raw&&(p.schemaVersion!==schemaVersion||p.campaignResetVersion!==resetVersion);
 const history=[p.unlockedCharacterIds,p.ownedCharacterIds,p.acquiredCharacterIds].filter(Array.isArray);
 const owned=isLegacy?(history.length?Crew.normalize([...history.flat(),p.equippedCharacterId]):[...characterIds]):Crew.normalize(p.unlockedCharacterIds);
 const out={schemaVersion,contentRevision:revision,campaignResetVersion:resetVersion,cleared:Number.isInteger(p.cleared)?Math.max(0,Math.min(100,p.cleared)):0,unlockedCharacterIds:owned,unlockedWeaponIds:unlocked,equippedWeaponId:unlocked.includes(p.equippedWeaponId)?p.equippedWeaponId:'W01',seenPreviewIds:validIds(p.seenPreviewIds,previewIds)};
 if(p.legacyBackup&&typeof p.legacyBackup==='string')out.legacyBackup=p.legacyBackup;
 out.equippedCharacterId=owned.includes(p.equippedCharacterId)?p.equippedCharacterId:'gun';
 out.difficulty=['easy','normal','hard'].includes(p.difficulty)?p.difficulty:'normal';
 out.preferences={language:['ja','en'].includes(p.preferences?.language)?p.preferences.language:null,controls:['left','right'].includes(p.preferences?.controls)?p.preferences.controls:null};
 if(isLegacy){
  out.cleared=0;out.equippedCharacterId='gun';out.unlockedWeaponIds=['W01'];out.equippedWeaponId='W01';out.seenPreviewIds=[];out.chapterRun=null;out.joinedCharacterIds=['gun'];out.pendingRecruit=null;out.updateNoticePending=true;out.journal=Journal.normalize(null,out);
  out.migrationBackup=typeof p.migrationBackup==='string'?p.migrationBackup:raw;
 }else{
  out.chapterRun=Run.decode(p.chapterRun,Math.min(100,out.cleared+1));
  out.joinedCharacterIds=Crew.joinedAt(out.cleared);out.unlockedCharacterIds=Crew.normalize([...owned,...out.joinedCharacterIds]);
  const pending=p.pendingRecruit,r=Crew.at(pending?.stage);
  out.pendingRecruit=r&&r.id===pending.id&&r.stage<=out.cleared?{id:r.id,stage:r.stage,alreadyOwned:!!pending.alreadyOwned}:null;
  out.updateNoticePending=!!p.updateNoticePending;out.journal=Journal.normalize(p.journal,out);
  if(typeof p.migrationBackup==='string')out.migrationBackup=p.migrationBackup;
 }
 if(raw&&!out.legacyBackup&&isLegacy)out.legacyBackup=raw;
 return out;
}
function create(adapter,status=()=>{}){
 let data=decode(null),ready=false,chain=Promise.resolve(),dirty=false,generation=0,migrationPending=false;
 async function load(){try{const raw=await adapter.load();data=decode(raw);migrationPending=!!raw&&(JSON.parse(raw).schemaVersion!==schemaVersion||JSON.parse(raw).campaignResetVersion!==resetVersion);ready=true;if(migrationPending&&adapter.backup)try{await adapter.backup(raw);}catch{ /* The new snapshot also embeds the original raw backup. */ }if(migrationPending)await save();else status('saved');return data;}catch(e){ready=false;status('load-failed');return data;}}
 function save(){dirty=true;const ticket=++generation;if(!ready)return chain.then(()=>false);const snapshot=JSON.stringify(data);chain=chain.catch(()=>{}).then(async()=>{try{await adapter.save(snapshot);if(ticket===generation){dirty=false;migrationPending=false;status('saved');}return true;}catch(e){if(ticket===generation){dirty=true;status('save-failed');}return false;}});return chain;}
 return {load,save,get data(){return data;},get ready(){return ready;},get dirty(){return dirty;},get pending(){return chain;},get needsMigrationSave(){return migrationPending;}};
}
const api={key,revision,schemaVersion,resetVersion,weaponIds,characterIds,previewIds,decode,create};if(typeof module!=='undefined')module.exports=api;else root.ArcSave=api;
})(globalThis);
