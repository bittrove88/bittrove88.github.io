(function(root){
'use strict';
const key='arcline-campaign-v1',revision='5.0.0';
const Run=typeof module!=='undefined'?require('./campaign-run.js'):root.ArcCampaignRun;
const Journal=typeof module!=='undefined'?require('./journal.js'):root.ArcJournal;
const schemaVersion=8,resetVersion=2;
const Usage=typeof module!=='undefined'?require('./crew-usage.js'):root.ArcCrewUsage;
const Crew=typeof module!=='undefined'?require('./crew.js'):root.ArcCrew;
const weaponIds=Array.from({length:23},(_,i)=>'W'+String(i+1).padStart(2,'0'));
const characterIds=Crew.ids;
const lessonIds=['controls','teleport','wall-fall','destruction','choices','touch-controls-v2','slope','move','aim','charge','pickup','reflection','roof','height','terminal','boss-swap','boss-core','ceiling-lift','gate-choices','bridge','cloud','crystal','updraft','wind','vent','magnet','W','B','C','K','U','F','V','M','BURST','BLINK','PUSH','BOUNCE','PULL','SPLIT','PHASE','SWAP','S_GUARD','S_BREACH','S_REPAIR'];
const specialIds=characterIds.map(id=>'S_'+id.toUpperCase());
const previewIds=['v6:special-charge',...weaponIds,...lessonIds,...specialIds,...['v2:','v3:','v4:','v5:'].flatMap(prefix=>[...weaponIds,...lessonIds,...specialIds].map(id=>prefix+id))];
const validIds=(xs,allowed)=>[...new Set((Array.isArray(xs)?xs:[]).filter(x=>allowed.includes(x)))];
function decodeBase(raw){
 let p={};try{p=raw?JSON.parse(raw):{};}catch{}if(!p||typeof p!=='object'||Array.isArray(p))p={};
 if(p.campaignResetVersion>resetVersion)throw Error('Unsupported campaign revision');
 if(p.schemaVersion!==undefined&&![1,2,3,4,5,6,7,8].includes(p.schemaVersion))throw Error('Unsupported save version');
 if(p.schemaVersion===8&&p.campaignResetVersion>resetVersion)throw Error('Unsupported campaign revision');
 const unlocked=validIds(p.unlockedWeaponIds,weaponIds);if(!unlocked.includes('W01'))unlocked.unshift('W01');
 const roles=typeof module!=='undefined'?require('./weapons.js').coreUnlocks:root.ArcWeapons.coreUnlocks;for(const [id,level]of Object.entries(roles))if(Number.isInteger(p.cleared)&&p.cleared>=level&&!unlocked.includes(id))unlocked.push(id);
 const owned=Crew.normalize(p.unlockedCharacterIds);
 const out={schemaVersion,contentRevision:revision,campaignResetVersion:resetVersion,cleared:Number.isInteger(p.cleared)?Math.max(0,Math.min(100,p.cleared)):0,unlockedCharacterIds:owned,unlockedWeaponIds:unlocked,equippedWeaponId:unlocked.includes(p.equippedWeaponId)?p.equippedWeaponId:'W01',seenPreviewIds:validIds(p.seenPreviewIds,previewIds)};
 out.equippedCharacterId=owned.includes(p.equippedCharacterId)?p.equippedCharacterId:'gun';
 out.difficulty=['easy','normal','hard'].includes(p.difficulty)?p.difficulty:'normal';
 out.difficultyConfirmed=p.difficultyConfirmed===true;
 out.journeyStarted=p.journeyStarted===true||out.cleared>0||!!p.chapterRun;
 out.preferences={language:['ja','en'].includes(p.preferences?.language)?p.preferences.language:null,controls:['left','right'].includes(p.preferences?.controls)?p.preferences.controls:null};
 out.chapterRun=Run.decode(p.chapterRun,Math.min(100,out.cleared+1));
 const Inventory=typeof module!=='undefined'?require('./inventory.js'):root.ArcInventory;
 out.campaignInventory=Inventory.normalize(p.campaignInventory||out.chapterRun?.inventory);
 out.pickupLedger=Run.checkpoint(1,{},p.pickupLedger||out.chapterRun?.pickupLedger||[],'ledger',0).pickupLedger;
 out.joinedCharacterIds=Crew.normalize([...Crew.joinedAt(out.cleared),...(Array.isArray(p.joinedCharacterIds)?p.joinedCharacterIds:[]).filter(id=>owned.includes(id))]);out.unlockedCharacterIds=Crew.normalize([...owned,...out.joinedCharacterIds]);
 const pending=p.pendingRecruit,r=Crew.get(pending?.id),legacyPair=r&&(r.id==='hibari'&&pending.stage===25||r.id==='rico'&&pending.stage===30),validPending=r&&Number.isInteger(pending.stage)&&pending.stage>0&&pending.stage<=out.cleared&&(r.stage===pending.stage||legacyPair);
 out.pendingRecruit=validPending?{id:r.id,stage:pending.stage,alreadyOwned:!!pending.alreadyOwned}:null;
 // Additive first-journey state. Established records never repeat onboarding.
 const steps=['prologue','gun','trial','done'],o=p.onboarding;
 const established=out.cleared>0||out.difficultyConfirmed||out.journeyStarted;
 out.onboarding={version:1,step:o&&steps.includes(o.step)?o.step:established?'done':'prologue',tried:validIds(o?.tried,['easy','normal','hard'])};
 const usage=Usage.normalize(p.machineUsage);if(usage)out.machineUsage=usage;
 out.updateNoticePending=false;out.journal=Journal.normalize(p.journal,out);
 return out;
}
const modes=['easy','normal','hard'];
// Preferences and the first-use controls lesson remain device-wide. Everything
// earned/consumed in a campaign (including its journal and supply clock) is local.
const progressFields=['campaignInventory','pickupLedger','cleared','unlockedCharacterIds','joinedCharacterIds','equippedCharacterId','unlockedWeaponIds','equippedWeaponId','chapterRun','pendingRecruit','machineUsage','journal'];
const copy=value=>JSON.parse(JSON.stringify(value));
function progress(data){return Object.fromEntries(progressFields.filter(k=>data[k]!==undefined).map(k=>[k,copy(data[k])]));}
function decode(raw){
 const out=decodeBase(raw);let p;try{p=JSON.parse(raw);}catch{}
 const slots=p?.difficultyProgress;
 out.difficultyProgress={};
 for(const mode of modes){
  if(mode===out.difficulty)continue;
  const stored=slots?.[mode],valid=stored&&typeof stored==='object'&&!Array.isArray(stored);
  out.difficultyProgress[mode]=progress(decodeBase(valid?JSON.stringify({...stored,schemaVersion,campaignResetVersion:resetVersion,difficulty:mode,journeyStarted:out.journeyStarted,difficultyConfirmed:out.difficultyConfirmed}):null));
 }
 // The active campaign lives only at top level; archive the other two modes.
 // This prevents a stale duplicate checkpoint after ordinary in-place updates.
 return out;
}
function prepareDifficulty(data,mode){
 if(!modes.includes(mode))throw Error('Invalid difficulty');
 const next=decode(JSON.stringify(data)),target=mode===next.difficulty?progress(next):copy(next.difficultyProgress[mode]);
 next.difficultyProgress[next.difficulty]=progress(next);delete next.difficultyProgress[mode];
 for(const key of progressFields)delete next[key];
 Object.assign(next,target);next.difficulty=mode;next.difficultyConfirmed=true;
 return decode(JSON.stringify(next));
}
function create(adapter,status=()=>{}){
 let data=decode(null),ready=false,chain=Promise.resolve(),dirty=false,generation=0,migrationPending=false,resetCleanupPending=false,resetting=false;
 async function load(){try{const raw=await adapter.load();let previous={};try{previous=JSON.parse(raw)||{};}catch{}data=decode(raw);const legacyMigration=!!raw&&(previous.schemaVersion!==schemaVersion||previous.campaignResetVersion!==resetVersion);migrationPending=legacyMigration||!!raw&&!previous.difficultyProgress;ready=true;resetCleanupPending=!raw||legacyMigration;
  if(migrationPending)await save();else status('saved');return data;
 }catch(e){ready=false;status('load-failed');return data;}}

 function save(){if(resetting)return chain.then(()=>false);dirty=true;const ticket=++generation;if(!ready)return chain.then(()=>false);const snapshot=JSON.stringify(data);chain=chain.catch(()=>{}).then(async()=>{try{await adapter.save(snapshot);if(resetCleanupPending){await adapter.resetLocal?.();resetCleanupPending=false;}if(ticket===generation){dirty=false;migrationPending=false;status('saved');}return true;}catch(e){if(ticket===generation){dirty=true;status('save-failed');}return false;}});return chain;}
 // Replace only this game's canonical record, after older writes have finished.
 // Keep the live record until persistence succeeds; never erase an unread cloud save.
 function reset(){if(!ready||resetting)return Promise.resolve(false);resetting=true;dirty=true;++generation;chain=chain.catch(()=>{}).then(async()=>{const fresh=decode(null);fresh.preferences={...data.preferences};try{await adapter.save(JSON.stringify(fresh));data=fresh;dirty=false;migrationPending=false;resetCleanupPending=false;status('saved');return true;}catch{dirty=true;status('save-failed');return false;}finally{resetting=false;}});return chain;}
 // Commit a user-requested progress edit atomically after queued writes.
 function replace(candidate){if(!ready||resetting)return Promise.resolve(false);let next;try{next=decode(JSON.stringify(candidate));}catch{return Promise.resolve(false);}resetting=true;const wasDirty=dirty;++generation;chain=chain.catch(()=>{}).then(async()=>{try{await adapter.save(JSON.stringify(next));data=next;dirty=false;migrationPending=false;resetCleanupPending=false;status('saved');return true;}catch{dirty=wasDirty;status('save-failed');return false;}finally{resetting=false;}});return chain;}
 return {load,save,reset,replace,get data(){return data;},get ready(){return ready;},get dirty(){return dirty;},get pending(){return chain;},get needsMigrationSave(){return migrationPending;}};
}
const api={key,revision,schemaVersion,resetVersion,weaponIds,characterIds,previewIds,progressFields,prepareDifficulty,decode,create};if(typeof module!=='undefined')module.exports=api;else root.ArcSave=api;
})(globalThis);
