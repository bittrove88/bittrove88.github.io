'use strict';
const E=ArcEngine,G=E.geometry,I=ArcInventory,R=ArcCampaignRun,$=id=>document.getElementById(id),sdk=globalThis.ytgame,inYT=!!sdk?.IN_PLAYABLES_ENV;
const K=ArcSkills;
// Temporary, opt-in ending review. Its synthetic progress never reaches storage.
const endingPreview=new URLSearchParams(location.search).get('preview')==='ending';
let victoryToken=-1;
let finalRetryEntry=null;
const bgm=ArcAudio.create(),specialLesson=ArcSpecialUi.createLesson(),specialNotice=ArcSpecialUi.createNotice($('battle'));
let movieOpening=false,mapCamera=null,viewport=null;
bgm.request('TITLE');
for(const event of ['pointerdown','keydown'])document.addEventListener(event,e=>{if(e.isTrusted)bgm.unlock();},{capture:true});
const renderer=ArcRender.create($('world')),pauseSources=new Set();
let selectedMap=0,s=null,preview=E.campaign(1),manualPaused=false,raf=0,previous=0,clock=0,shot=null,flight=0,tail=null,impact=null,charge=null,input=null,dialog='pause',feedback='',cpuJob=null,cpuReady=null,gameToken=0,demo=null,lastDemoId='controls',worker=null,jobId=0,previewPress=null,resizeFrame=0,transition=null,pickupEffects=[];
let audio=null,master=null,chargeTone=null,userInteracted=false,hostAudio=inYT?sdk.system.isAudioEnabled():true;
const sfx=ArcSFX.create({context:()=>audio});
bgm.sync({paused:false,muted:!hostAudio});
let skillLessonQueue=[],preferencesHydrating=true;
let lastChargeSerial=0;
let encounter=null,ending=null,reward=null,lastSkill=null,runContext=null,lootContinuation=null,pendingAdvance=false,resultSaving=false,chapterConfirm=null;
const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const platformStatus={cpuJobs:[],workerSupported:typeof Worker!=='undefined',sdk:inYT,errors:[]};
const save=ArcSave.create({
 load:()=>endingPreview?JSON.stringify({schemaVersion:ArcSave.schemaVersion,campaignResetVersion:ArcSave.resetVersion,cleared:100,journeyStarted:true,difficultyConfirmed:true,preferences:{language:ArcI18n.language,controls:controlLayout}}):inYT?Promise.race([sdk.game.loadData(),new Promise((_,reject)=>setTimeout(()=>reject(Error('timeout')),4000))]):localStorage.getItem(ArcSave.key),
 resetLocal:()=>{if(!endingPreview&&!inYT)for(const key of Object.keys(localStorage))if(key.startsWith('arcline-')&&key!==ArcSave.key&&key!==ArcDevice.key)localStorage.removeItem(key);},
 save:raw=>endingPreview?undefined:inYT?sdk.game.saveData(raw):localStorage.setItem(ArcSave.key,raw)
},state=>{$('saveStatus').dataset.error=['load-failed','save-failed'].includes(state);$('saveStatus').textContent=state==='saved'?(inYT?'Progress synced':'Progress saved on this device'):state==='load-failed'?'Progress unavailable · Session play':'Progress not saved · Retry on resume';});
const hostPaused=()=>pauseSources.size>0;
function minimumAngle(){return s?E.minimumAngle(s):-12;}
function maximumAngle(){return s?E.maximumAngle(s):85;}
function canAim(){return !!s&&s.phase==='aim'&&!s.units[0].animation?.path&&!(encounter?.boss&&!reducedMotion)&&!mapCamera?.active&&!hostPaused()&&!manualPaused&&!demo&&!ArcStoryView.active&&!ArcExpeditionUi.active&&!ArcScreens.controlsBlocked()&&!s.pendingLoot.length;}
function updateSpecialNotice(){specialNotice.update({paused:hostPaused()||manualPaused,suppressed:!s||!!demo||ArcStoryView.active||ArcExpeditionUi.active||ArcScreens.controlsBlocked(),aim:canAim(),enemy:s?.turn===1,result:!!s?.result,token:gameToken});}
function sfxSync(){sfx.sync({token:gameToken,muted:!hostAudio,paused:hostPaused()||manualPaused||document.hidden||!s||!!demo||ArcStoryView.active||ArcExpeditionUi.active||ArcScreens.controlsBlocked()});}
function audioSync(){sfxSync();bgm.sync({paused:hostPaused()||manualPaused,muted:!hostAudio});updateSpecialNotice();if(!audio)return;const on=userInteracted&&hostAudio&&!hostPaused()&&!manualPaused;master.gain.value=on?.5:0;(on?audio.resume():audio.suspend()).catch(()=>{});}
function unlockAudio(){userInteracted=true;if(!audio)try{audio=new(window.AudioContext||window.webkitAudioContext)();master=audio.createGain();master.connect(audio.destination);}catch{}audioSync();}
function tone(freq=440,duration=.12,type='sine',volume=.08){if(!audio||!hostAudio||hostPaused()||manualPaused)return;const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(40,freq*.5),audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g).connect(master);o.start();o.stop(audio.currentTime+duration);}
function stopChargeTone(){if(chargeTone){try{chargeTone.stop();}catch{}chargeTone=null;}}
function cancelCharge(notify=false){if(charge&&s){s.power=charge.previous;if(notify)feedback='Shot canceled';}charge=null;stopChargeTone();}
function clearInput(){input?.clear();mapCamera?.cancelGesture();viewport?.cancelGesture();cancelCharge();clearTimeout(previewPress);previewPress=null;}
function acquired(item){
 if(Number.isFinite(item.x+item.y))pickupEffects.push({x:item.x,y:item.y,id:item.id,age:0});
 if(item.pending)return;
 if(item.full){persistStock();feedback=ArcI18n.language==='en'?'Stock full · capsule recorded':'所持数が上限のため補充なし（取得記録済み）';hud();return;}
 const data=save.data;
 if(item.kind==='trial'){if(!data.unlockedWeaponIds.includes(item.weaponId))data.unlockedWeaponIds.push(item.weaponId);persistStock();save.save();reward={id:item.weaponId,kind:'weapon',age:0};feedback='';tone(850,.25,'sine');return;}if(item.kind==='ammo'){feedback=ArcWeapons.get(item.weaponId).name+' +1';tone(850,.2,'sine');return;}
 if(item.id[0]==='W'&&!data.unlockedWeaponIds.includes(item.id)){data.unlockedWeaponIds.push(item.id);reward={id:item.id,kind:'weapon',age:0};feedback='';}
 if(item.skill){feedback=(K.get(item.skill)?.name||item.skill)+' +'+(item.taken||1);if(K.get(item.skill)&&!hasSeen(item.skill)&&!skillLessonQueue.includes(item.skill))skillLessonQueue.push(item.skill);buildSkills();}
 persistStock();save.save();tone(item.id[0]==='W'?850:1046,.25,'sine');
}
function syncLobby(){
 const context=R.inspect(save.data,selectedMap+1),entry=context.entry;
 preview=E.campaign(selectedMap+1,{...save.data,battleInventory:entry.inventory,battleMode:entry.mode||'W01',matchSeed:entry.seed});const spec=preview.spec;
 syncDifficultyChoice();
 $('arenaTitle').textContent=ArcStory.stageName(spec,ArcI18n.language,false,save.data.cleared);$('arenaTag').textContent=E.biomes[spec.theme].name;
 $('stageCaption').textContent=`LEVEL ${spec.id} · ${spec.boss?'BOSS · ':''}${Object.entries(spec.skills).map(([k,n])=>k+' ×'+n).join(' / ')||'STANDARD ONLY'}`;
 $('progressText').textContent=`${save.data.cleared} / 100 CLEARED`;$('play').innerHTML=`PLAY LEVEL ${spec.id} <span aria-hidden="true">→</span>`;
 $('collectionCount').textContent=selectedMap!==99&&ArcCrewUsage.blocked(save.data,save.data.equippedCharacterId)?(ArcI18n.language==='en'?'Resupply '+ArcCrewUsage.remaining(save.data,save.data.equippedCharacterId):'補充あと'+ArcCrewUsage.remaining(save.data,save.data.equippedCharacterId)+'面'):`${save.data.unlockedCharacterIds.length}/10`;
 $('prevMap').disabled=selectedMap===0;$('nextMap').disabled=selectedMap>=Math.min(99,save.data.cleared);
 $('weaponLoadout').innerHTML=save.data.unlockedWeaponIds.map(id=>`<option value="${id}">${ArcWeapons.get(id).name}</option>`).join('');$('weaponLoadout').value=save.data.equippedWeaponId;
 ArcPresentation.syncLobby(save.data,selectedMap,context);
 ArcOnboarding.syncDelete();syncJournalSummary();
}
function syncJournalSummary(){const journal=ArcJournal.normalize(save.data.journal,save.data);$('journalUnread').hidden=ArcJournal.unread(save.data)===0;$('openJournal').disabled=!save.data.journeyStarted;$('journeyOpening').hidden=journal.introSeen;$('journeyOpening').textContent=ArcI18n.language==='en'?'Restore the routes. Move the world.':'止まった世界を、もう一度動かす。';}
const difficultyUi=ArcDifficultyUi.create({data:()=>save.data,persist:()=>save.ready?save.save():Promise.resolve(true),change:async(mode,initial)=>{if(!save.ready||s||hostPaused())return false;const next=ArcSave.prepareDifficulty(save.data,mode);if(initial){next.onboarding.step='done';if(save.data.journal.moviesSeen.includes('prologue')&&!next.journal.moviesSeen.includes('prologue'))next.journal.moviesSeen.push('prologue');}if(!await save.replace(next))return false;selectedMap=save.data.chapterRun?save.data.chapterRun.stage-1:Math.min(99,save.data.cleared);runContext=null;syncLobby();draw();return true;},clearInput,allowed:()=>!s&&!hostPaused()});
const machinePicker=ArcMachinePicker.create({data:()=>save.data,state:()=>s,clearInput,allowed:()=>!!s&&s.phase==='aim'&&!s.result&&!hostPaused()&&!demo&&!ArcStoryView.active&&!ArcExpeditionUi.active&&!s.pendingLoot.length&&(!manualPaused||dialog==='pause'),changed:()=>{sfx.prepare(s.characterId);hud();draw();},change:id=>{if(!E.changeCharacter(s,id,save.data.unlockedCharacterIds))return false;save.data.equippedCharacterId=id;save.save();return true;}});
const crewSupply=ArcCrewSupply.create({data:()=>save.data,replace:data=>save.replace(data),changed:()=>{syncLobby();draw();},cancel:()=>lobby()});
const masterMode=ArcMasterMode.create({data:()=>save.data,allowed:()=>save.ready&&!endingPreview&&!s&&!hostPaused()&&!ArcStoryView.active&&!ArcChapterPlayback.active&&(ArcScreens.isOpen('journeyStart')||!ArcOnboarding.active&&!$('lobby').hidden),replace:data=>save.replace(data),changed:()=>{ArcOnboarding.dismiss();ArcScreens.close('journeyStart',false);selectedMap=Math.min(99,save.data.cleared);lobby();}});
const finalTeamUi=ArcFinalTeamUi.create({allowed:canAim,open:()=>machinePicker.open(),hidden:()=>!!demo||ArcStoryView.active||ArcExpeditionUi.active||manualPaused});
function syncDifficultyChoice(){difficultyUi.sync();}
function requestDifficulty(done){difficultyUi.request(done);}
function openBattleMachines(){machinePicker.open();}
function switchMap(delta){if(s||hostPaused())return;selectedMap=E.clamp(selectedMap+delta,0,Math.min(99,save.data.cleared));syncLobby();tone(440,.08);}
function showLevels(){
 if(hostPaused())return;
 ArcPresentation.renderJourney(save.data,selectedMap,i=>{selectedMap=i;$('levelPicker').hidden=true;syncLobby();},confirmChapter);$('levelPicker').hidden=false;$('closeLevels').focus();
}
function confirmChapter(stage){
 clearInput();chapterConfirm=stage;$('levelPicker').hidden=true;dialog='chapter';$('overlay').dataset.kind='chapter';$('resultIcon').textContent='↻';$('modalEyebrow').textContent='CHAPTER';$('modalTitle').textContent=`Restart chapter ${R.chapter(stage)}?`;$('modalDetail').textContent='Stock and pickup history are carried forward.';$('resume').textContent='START CHAPTER';$('resume').disabled=false;$('returnLobby').textContent='CANCEL';$('resultJourney').hidden=true;$('endingCollection').hidden=true;$('overlay').hidden=false;$('returnLobby').focus();
}
function openChapterInventory(){
 if(hostPaused())return;const context=R.inspect(save.data,selectedMap+1);
 const choices=[{id:'W01',ammo:Infinity},...Object.entries(context.entry.inventory.weapons).map(([id,ammo])=>({id,ammo,source:'Carries across chapters'}))];
 ArcPresentation.showWeapons(choices,context.entry.mode||'W01',id=>{if(R.chooseWeapon(save.data,selectedMap+1,id))save.save();syncLobby();},{title:'Chapter inventory',note:'Unused ammunition and skills carry across chapters. Each map capsule can be claimed once per difficulty.',library:true,skills:context.entry.inventory.skills});
}
function openLoot(continuation){
 if(!s?.pendingLoot.length)return false;clearInput();lootContinuation=continuation;$('lootPicker').hidden=false;paintLoot();hud();return true;
}
function paintLoot(){
 const item=s.pendingLoot[0];if(!item){$('lootPicker').hidden=true;const next=lootContinuation;lootContinuation=null;next?.();return;}
 const current=item.kind==='weapons'?s.weaponStock:s.skills;
 const attempt=I.add(I.fromState(s),item.kind,item.id,item.amount,item.fill);
 if(attempt.status!=='pending'){finishLoot(null,false);return;}
 $('lootTitle').textContent=item.kind==='weapons'?'Weapon slots full':'Skill slots full';$('lootName').textContent=item.kind==='weapons'?ArcWeapons.get(item.id).name:K.get(item.id)?.name||item.id;$('lootAmount').textContent='×'+(item.fill?3:item.amount);
 $('lootChoices').replaceChildren();
 for(const [id,n] of Object.entries(current).filter(([,n])=>n>0)){
  const b=document.createElement('button'),name=document.createElement('strong'),count=document.createElement('span'),action=document.createElement('small');b.type='button';b.dataset.replaceLoot=id;name.textContent=item.kind==='weapons'?ArcWeapons.get(id).name:K.get(id)?.name||id;count.textContent='×'+n;action.textContent='Replace';b.append(name,count,action);b.onclick=()=>finishLoot(id,false);$('lootChoices').append(b);
 }
 $('lootSkip').textContent='Skip pickup';$('lootSkip').focus({preventScroll:true});
}
function finishLoot(removeId,skip){
 const origin=s?.pendingLoot[0]?.origin,result=s&&E.resolveLoot(s,removeId,skip);if(!result)return;
 if(!result.skipped&&!result.full&&origin!=='supply')acquired(result);
 if(origin==='supply'&&R.updatePreparation(save.data,runContext,s))save.save();
 buildSkills();paintLoot();hud();
}
const icons={BURST:'◉',BLINK:'◇',PUSH:'→',BOUNCE:'⌁',PULL:'←',SPLIT:'⋔',PHASE:'⇥',SWAP:'⇄'};
function persistStock(){if(s&&R.updateBattle(save.data,runContext,s))save.save();}
function syncSkillSummary(){const owned=Object.entries(s.skills).filter(([,n])=>n>0),total=owned.reduce((n,[,count])=>n+count,0),english=ArcI18n.language==='en';$('skillInventorySummary').textContent=(english?`${owned.length} types · ${total} uses`:`${owned.length}種類 · 残数${total}回`)+(s.skillUsed?(english?' · used this turn':' · 今ターン使用済み'):'');}
function buildSkills(){
 syncSkillSummary();$('skillStockScroll').scrollTop=0;
 $('skillPickerTitle').textContent='Choose combat skill';$('repairConfirm').hidden=true;$('skillChoices').hidden=false;
 $('skillChoices').innerHTML=Object.keys(s.skills).filter(id=>s.skills[id]>0).map(id=>{const info=K.get(id);return `<button type="button" class="skill${info?.rare?' rare':''}" data-skill="${id}"><b class="skill-icon" aria-hidden="true">${K.markup(id)}</b><span class="skill-name">${info?.name||id}</span><small class="skill-count">×${s.skills[id]}</small>${info?`<span class="skill-note">${info.note}</span>`:''}<span class="skill-state"></span></button>`;}).join('');
 document.querySelectorAll('[data-skill]').forEach(b=>{
  b.onclick=()=>{const id=b.dataset.skill;$('skillPicker').hidden=true;if(!canAim())return;clearInput();
   if(id==='S_REPAIR'){if(E.skillReason(s,id))return;if(!hasSeen(id)&&runDemo(id,true,openRepair))return;openRepair();return;}
   const ok=E.selectSkill(s,id);if(ok){persistStock();if(s.result){s.phase='finish';s.time=.65;}}feedback=ok?'':E.skillReason(s,id)||'';tone(560,.08);hud();
   if(ok&&s.selectedSkill===id&&!hasSeen(id)&&ArcLessons.forSkill(s,id,save.data))runDemo(id,true);
  };
 });
}
function openRepair(){if(!s||E.skillReason(s,'S_REPAIR')||hostPaused()||manualPaused)return;clearInput();$('skillPickerTitle').textContent='Field Repair';$('skillPicker').hidden=false;$('skillChoices').hidden=true;$('repairConfirm').hidden=false;$('skillInventorySummary').textContent='';$('skillStockScroll').scrollTop=0;$('repairAmount').textContent='Restore '+E.combat.points(Math.min(s.units[0].maxHp*.3,s.units[0].maxHp-s.units[0].hp))+' HP · 1 action';hud();$('repairCommit').focus({preventScroll:true});}
function commitRepair(){if(hostPaused()||manualPaused||$('repairConfirm').hidden)return;const result=E.repair(s);if(!result)return;persistStock();clearInput();$('skillPicker').hidden=true;$('repairConfirm').hidden=true;lastSkill='S_REPAIR';feedback='REPAIR +'+E.combat.points(result.healed);tone(640,.25,'sine');if(s.result){s.phase='finish';s.time=.65;}hud();draw();}
function afterLootAim(){const id=skillLessonQueue.find(id=>(s.skills[id]||0)>0&&!hasSeen(id));skillLessonQueue=[];if(id&&runDemo(id,true))return;$('world').focus({preventScroll:true});}
function battleWeaponChoices(){
 return E.availableWeapons(s).map(c=>({...c,weapon:E.weapon(s,0,c.id),source:c.category==='machine'?(c.id==='W01'?'Normal · Unlimited':'Special · Shared charge'):'Carries across chapters'}));
}
function hud(){
 finalTeamUi.sync(s);
 mapCamera?.sync();
 if(!s)return;if(!$('skillPicker').hidden&&$('repairConfirm').hidden)syncSkillSummary();$('pauseMachineChange').disabled=!s||s.phase!=='aim'||!!s.result||!!demo;$('pauseMachineChange').hidden=!manualPaused||dialog!=='pause';$('pauseMachineChange').textContent=ArcFinalTeam.active(s)?(ArcI18n.language==='en'?'View fixed order':'出撃順を確認'):(ArcI18n.language==='en'?'Switch machine':'機体を変更');const nextSpecial=E.nextSpecialTurn(s),english=ArcI18n.language==='en';const specialCopy=english?'SPECIAL '+s.specialAmmo+'/3'+(nextSpecial?' · turn '+nextSpecial:''):'必殺 '+s.specialAmmo+'/3'+(nextSpecial?' · 次は第'+nextSpecial+'ターン':s.specialAmmo===3?' · 準備完了':'');if($('specialHUD').textContent!==specialCopy)$('specialHUD').textContent=specialCopy;if(s.specialChargeSerial!==lastChargeSerial){lastChargeSerial=s.specialChargeSerial;$('specialHUD').classList.remove('charged');void $('specialHUD').offsetWidth;$('specialHUD').classList.add('charged');tone(740,.12,'sine',.04);}
 const walkRemaining=E.movementRemaining(s),walkLeft=Number.isFinite(walkRemaining)?Math.round(walkRemaining/E.movementLimit*100):'∞';$('moveBudget').textContent=(english?'MOVE ':'移動 ')+walkLeft+(Number.isFinite(walkRemaining)?'%':'');$('stick').setAttribute('aria-valuetext',(english?'Movement remaining ':'移動残量 ')+walkLeft+(Number.isFinite(walkRemaining)?'%':''));
 const shown=activePreview(),displayState=shown?(shown.effectProgress>=.5?shown.after:shown.before)||shown.state:s,[p,e]=displayState.units,enabled=canAim();
 $('playerName').textContent=ArcCharacters.get(s.characterId||save.data.equippedCharacterId).name;
 $('php').textContent=E.combat.points(p.hp);$('ehp').textContent=E.combat.points(e.hp);$('pbar').style.width=p.hp/p.maxHp*100+'%';$('ebar').style.width=e.hp/e.maxHp*100+'%';$('pbar').parentElement.style.setProperty('--segments',100/p.maxHp);$('ebar').parentElement.style.setProperty('--segments',100/e.maxHp);
 const foe=E.encounters.forSpec(s.spec);$('ename').textContent=ArcI18n.language==='en'?foe.nameEn:foe.name;$('round').textContent='LV '+s.stage;
 const turnCopy=demo?'':s.phase==='over'?'COMPLETE':s.turn?(english?'RIVAL TURN':'相手のターン'):(english?'YOUR TURN '+s.playerTurn:'第'+s.playerTurn+'ターン');if($('turnLabel').textContent!==turnCopy)$('turnLabel').textContent=turnCopy;
 const left=s.shotLimit-s.shotCount;$('shotBudget').textContent=(left===1?'LAST ACTION':left+' ACTIONS');$('shotBudget').classList.toggle('low',left<=3);$('shotBudget').classList.toggle('last',left===1);
 const held=shown?.id==='controls'&&shown.phase==='WATCH';
 const displayPower=shown?.displayPower??shown?.pose?.power??s.power;
 $('powerNumber').textContent=Math.round(displayPower)+'%';$('powerFill').style.width=displayPower+'%';$('powerHUD').classList.toggle('active',!!charge);
 const aimState=shown?.state||s,aimAngle=shown?.pose?.angle??s.angle;
 const aimMuzzle=G.muzzle(aimState,0,aimAngle);$('angleText').textContent=(aimMuzzle.dx<0?'←':'→')+Math.round(aimMuzzle.worldAngle)+'°';$('aimRange').value=s.angle;$('aimRange').min=minimumAngle();$('aimRange').max=maximumAngle();for(const id of ['aimRange','aimUp','aimDown'])$(id).disabled=!enabled;$('fire').disabled=!enabled||s.selectedSkill==='BLINK';$('fire').classList.toggle('charging',!!charge||held);$('fire').classList.toggle('canceling',!!charge?.cancel);$('chargeValue').textContent=charge?.cancel?'CANCEL':s.teleportMode?'TELEPORT':'FIRE';$('chargeRing').style.strokeDashoffset=345.58*(1-((charge||held)?(displayPower-20)/80:0));
 $('fireHint').hidden=!charge;$('fireHint').textContent=charge?.cancel?'Release to cancel':charge?.id==='keyboard'?'Esc to cancel':'Slide away to cancel';
 $('fire').setAttribute('aria-label',s.teleportMode?'Hold to charge teleport; slide away to cancel':'Hold to charge; release to fire; slide away to cancel');
 $('shotFeedback').textContent=feedback||(!demo&&s.selectedSkill==='BLINK'?'Tap a landing spot, then tap again.':'');
 const mode=shown?.pose?.mode||(s.teleportMode?'TELEPORT':s.mode),weapon=E.weapon(displayState,0,mode),look=weapon.appearance,entry=E.availableWeapons(displayState).find(w=>w.id===mode),ammo=entry?.ammo||0;
 $('weaponGlyph').textContent=look.glyph;$('weaponName').textContent=weapon.name;
 $('weaponStock').textContent=mode==='W01'||mode==='TELEPORT'?'Unlimited':weapon.special?'Special '+ammo+'/3':'Aux '+ammo+' shots';
 $('weaponState').textContent='WEAPON';$('weaponToggle').style.borderColor=look.color;$('weaponToggle').style.color=look.color;
 $('weaponToggle').setAttribute('aria-label',weapon.name+', '+$('weaponStock').textContent+', choose weapon');$('weaponToggle').classList.toggle('special',mode!=='W01');$('weaponToggle').classList.toggle('new',!!s.weaponStock[s.lastPickupWeaponId]);$('weaponToggle').disabled=!enabled;$('weaponToggle').dataset.switchable=String(battleWeaponChoices().length>1);
 for(const b of document.querySelectorAll('[data-skill]')){
  const id=b.dataset.skill,count=demo?(displayState.skills[id]??s.skills[id]):s.skills[id],used=!demo&&s.skillUsed,selected=demo?shown.pose?.selectedSkill===id:!used&&s.selectedSkill===id;
  const reason=E.skillReason(s,id),blocked=!!E.skillReason(s,id);
  b.querySelector('.skill-count').textContent='×'+count;b.querySelector('.skill-state').textContent=selected?'Reserved':reason||'';
  b.disabled=(!enabled&&$('skillPicker').hidden)||used||count<=0||blocked;b.classList.toggle('spent',used||count<=0||blocked);b.setAttribute('aria-disabled',b.disabled);b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',selected);b.setAttribute('aria-label',(K.get(id)?.name||id)+', '+count+' uses'+(reason?', '+reason:selected?', reserved':''));
 }
 if(shown){
  $('tutorialContext').textContent=/MACHINE SPECIAL/.test(shown.context)?'SPECIAL PREVIEW':/WEAPON/.test(shown.context)?'WEAPON PREVIEW':/SKILL/.test(shown.context)?'SKILL PREVIEW':/BOSS/.test(shown.context)?'BOSS PREVIEW':/CONTROL/.test(shown.context)?'CONTROL PREVIEW':shown.source==='vignette'?'PRACTICE PREVIEW':'LEVEL PREVIEW';$('tutorialStep').textContent=shown.step;$('tutorialInstruction').textContent=shown.instruction;$('tutorialOutcome').textContent=shown.outcome;
  $('tutorialInstruction').hidden=shown.phase==='RESULT';$('tutorialOutcome').hidden=shown.phase!=='RESULT';
  $('previewPowerFill').style.width=displayPower+'%';$('previewPowerNumber').textContent=Math.round(displayPower)+'%';$('previewAction').textContent=shown.controlAction||shown.step;
 }
 for(const id of ['stick','aimStick']){$(id).setAttribute('aria-disabled',!enabled);$(id).style.opacity=enabled?'1':'.4';}
 $('aimStick').setAttribute('aria-valuemin',minimumAngle());$('aimStick').setAttribute('aria-valuemax',maximumAngle());$('aimStick').setAttribute('aria-valuenow',Math.round(s.angle));$('aimStick').setAttribute('aria-valuetext',Math.round(s.angle)+' degrees');
 $('warpToggle').hidden=!s.spec.teleport;$('warpToggle').disabled=!enabled;$('warpToggle').setAttribute('aria-pressed',s.teleportMode);$('fire').classList.toggle('teleport',s.teleportMode);
 const ownedSkills=Object.keys(s.skills).filter(k=>s.skills[k]>0),selected=s.guardActive?'S_GUARD':s.selectedSkill,displaySkill=selected||(ownedSkills.length===1?ownedSkills[0]:null);const skillCount=ownedSkills.length;$('skills').hidden=!Object.keys(s.skills).length;$('skillName').textContent=K.get(displaySkill)?.shortName||K.get(displaySkill)?.name||displaySkill||'Skill';$('skillStock').textContent=s.guardActive?'Active':displaySkill?'×'+s.skills[displaySkill]:String(skillCount);$('skillToggle').classList.toggle('guard-active',!!s.guardActive);$('skillToggle').setAttribute('aria-pressed',!!selected);$('skillToggle').disabled=!enabled||skillCount===0;
 const rs=s.world.regions.map(r=>r.kind==='F'?(r.direction>0?'WIND →':'WIND ←'):r.kind==='V'?(r.on?'VENT ↑':'VENT · NEXT ↑'):r.kind==='M'?'FIELD '+(r.direction>0?'↻':'↺'):r.kind==='C'?'CLOUD':'UPDRAFT ↑');
 $('environment').textContent=[...new Set([...rs,...(s.world.solids.some(o=>o.kind==='bridge')?['BRIDGE · NEXT ⋯']:[])])].join('　');
 $('rewardNotice').hidden=!reward||!!demo;$('trialWeapon').hidden=true;
 if(reward){const id=reward.id,isWeapon=id[0]==='W',look=isWeapon?ArcWeapons.get(id).appearance:null;
  $('rewardName').textContent=isWeapon?ArcI18n.t(ArcWeapons.get(id).name)+(' · '+(ArcI18n.language==='en'?'Carries across chapters':'次の章へ持ち越し可能')):'';
  $('rewardGlyph').textContent=look?.glyph||'◆';$('rewardNotice').style.setProperty('--reward-color',look?.color||'#cce5b2');
 }
}
function lessonDescriptor(id){return ArcLessons.describe(id);}
function hasSeen(id){const lesson=lessonDescriptor(id);return save.data.seenPreviewIds.includes(lesson?.key||'v3:'+id);}
function activePreview(){return demo?ArcPreview.at(demo,demo.age):null;}
function runDemo(id,automatic=false,onComplete=null){
 if(!s||s.phase!=='aim'||hostPaused()||manualPaused||shot||demo)return false;
 clearInput();const lesson=lessonDescriptor(id),preview=ArcPreview.create(s,id);
 if(!preview?.proof?.valid){platformStatus.previewErrors=platformStatus.previewErrors||[];platformStatus.previewErrors.push({stage:s.stage,id});return false;}
 demo={...preview,seenId:lesson?.id||preview.id,seenKey:lesson?.key||'v3:'+preview.id,age:0,loops:0,automatic,onComplete};lastDemoId=demo.seenId;
 $('tutorialName').textContent=lesson?.title||preview.title;$('tutorial').hidden=false;$('tutorial').dataset.mode='preview';$('battle').dataset.lesson=preview.id;$('battle').dataset.preview='true';hud();$('previewOK').focus({preventScroll:true});return true;
}
function endDemo(){
 if(!demo)return;const onComplete=demo.onComplete;const ids=[demo.seenKey,'v2:'+(demo.seenId||demo.id)];demo=null;$('tutorial').hidden=true;delete $('battle').dataset.lesson;delete $('battle').dataset.preview;
 for(const b of document.querySelectorAll('[data-skill]'))delete b.dataset.long;
 for(const id of ids)if(!save.data.seenPreviewIds.includes(id))save.data.seenPreviewIds.push(id);
 save.save();hud();draw();$('world').focus({preventScroll:true});onComplete?.();
}
function showSpecialLesson(){if(!s)return false;clearInput();return specialLesson.show(save.data,()=>save.save(),()=>{hud();draw();$('world').focus({preventScroll:true});},s);}
function firstDemo(){
 const lessons=ArcLessons.forStage(s,save.data);
 for(const lesson of lessons)if(!hasSeen(lesson.id)&&runDemo(lesson.id,true,showSpecialLesson))return;
 const weapon=ArcLessons.forWeapon(s,s.mode,save.data);if(weapon&&!hasSeen(weapon.id)&&runDemo(weapon.id,true,showSpecialLesson))return;
 for(const id of K.ids)if(s.skills[id]>0&&!hasSeen(id)&&runDemo(id,true,showSpecialLesson))return;
 showSpecialLesson();
}
function paintEncounter(){
 const data=s&&encounter&&ArcStory.entry(s.stage,ArcI18n.language);$('bossIntroSkip').hidden=!encounter?.boss||!!demo||!!s?.result||manualPaused||reducedMotion;$('bossIntroSkip').textContent=ArcI18n.language==='en'?'Skip intro':'登場演出をスキップ';$('encounterBanner').dataset.phase=encounter?.boss?ArcExperience.introPhase(encounter.age):'name';$('encounterBanner').hidden=!data||!!demo||!!s?.result||manualPaused;
 if(!data)return;for(const [id,key]of [['encounterKind','kind'],['encounterName','name'],['encounterFeature','feature'],['encounterLine','line']]){const e=$(id),value=key==='feature'&&ArcFinalTeam.active(s)?(ArcI18n.language==='en'?'Each machine:70 HP and100 body damage. The ground collapses after every three.':'各機HP70・本体へ100ダメージ。3機ごとに地形が崩壊し次の戦場へ。'):data[key];if(e.textContent!==value)e.textContent=value;e.hidden=!value;}
}
$('bossIntroSkip').onclick=()=>{if(encounter?.boss){encounter=null;clearInput();renderer.resetCamera();paintEncounter();hud();draw();$('world').focus({preventScroll:true});}};
function paintResultStory(){if(s?.result==='win')ArcStoryView.showResult(s.stage);else ArcStoryView.hideResult();}
function start(retryContext=null){
 mapCamera?.close(false);
 if(difficultyUi.busy||hostPaused()||!save.ready&&$('play').disabled)return;unlockAudio();
 if(ArcStoryView.active||ArcExpeditionUi.active)return;
 if(save.data.onboarding.step!=='done'){ArcOnboarding.begin(()=>start(retryContext));return;}
 if(!save.data.journeyStarted){save.data.journeyStarted=true;save.save();syncJournalSummary();}
 if(save.data.updateNoticePending||save.data.pendingRecruit){ArcExpeditionUi.open(()=>start(retryContext));return;}
 if(!save.data.journal.moviesSeen.includes('prologue')&&!retryContext?.skipStory){playStoryMovie('prologue',()=>start({...retryContext,skipStory:true}));return;}
 ArcStoryView.hideResult();gameToken++;cpuJob=null;cpuReady=null;
 if(pendingAdvance&&!save.dirty)pendingAdvance=false;
 if(pendingAdvance&&save.ready){const token=gameToken,n=selectedMap;persistAdvance().then(ok=>{if(ok&&token===gameToken&&n===selectedMap)start(retryContext);});return;}
 if(crewSupply.request(selectedMap+1,()=>start(retryContext)))return;
 runContext=R.begin(save.data,selectedMap+1);
 ArcMenus.close(false);const entry=runContext.entry;save.data.journal.introSeen=true;ArcJournal.markRead(save.data,['introduction']);$('chapterMessage').hidden=true;skillLessonQueue=[];$('clearRewardLine').hidden=true;clearInput();s=E.campaign(selectedMap+1,{...save.data,battleInventory:entry.inventory,battleMode:entry.mode,matchSeed:entry.seed,pickupLedger:entry.pickupLedger,pendingLoot:entry.pending});lastChargeSerial=0;s.difficulty=ArcAimGuide.normalize(save.data.difficulty);s.power=20;transition=null;shot=null;tail=null;impact=null;demo=null;ending=null;reward=null;lastSkill=null;pickupEffects=[];feedback='';manualPaused=false;lootContinuation=null;$('lootPicker').hidden=true;delete $('battle').dataset.preview;delete $('battle').dataset.lesson;buildSkills();
 if(retryContext?.finalRetry)ArcFinalTeam.restore(s,retryContext.finalRetry);
 finalRetryEntry=ArcFinalTeam.snapshot(s);$('retryFinalCharacter').hidden=true;delete $('overlay').dataset.finalRetry;
 save.save();
 encounter=ArcStory.entry(s.stage,ArcI18n.language)?{age:0,duration:E.guardian(s)?3.2:2.8,boss:E.guardian(s)}:null;paintEncounter();
 sfx.prepare(s.characterId);specialNotice.reset(gameToken);bgm.request(ArcAudio.forStage(s.stage,s.spec),{restart:ArcAudio.restartForStage(s.stage,s.spec)});$('lobby').hidden=true;$('battle').hidden=false;$('battle').classList.remove('resolved');$('overlay').hidden=true;$('levelPicker').hidden=true;$('collectionPanel').hidden=true;$('weaponPicker').hidden=true;$('tutorial').hidden=true;$('skillPicker').hidden=true;audioSync();hud();if(!openLoot(firstDemo))firstDemo();if(!demo&&$('lootPicker').hidden)$('world').focus({preventScroll:true});tone(s.spec.boss?130:520,s.spec.boss?.4:.15,'triangle');
 if(s.spec.boss&&s.stage<100&&!s.spec.midboss)bgm.prepare('VICTORY');
}
function startCharge(id){
 if(!canAim()||charge||s.selectedSkill==='BLINK')return;
 unlockAudio();input?.cancelGesture();charge={id,elapsed:0,previous:s.power,cancel:false,cameraLock:{...(renderer.normalView||renderer.view)},cameraState:{engaged:false}};s.power=20;
 if(audio&&hostAudio){chargeTone=audio.createOscillator();const g=audio.createGain();g.gain.value=.025;chargeTone.type='triangle';chargeTone.frequency.value=150;chargeTone.connect(g).connect(master);chargeTone.start();}hud();
}
function releaseCharge(id){
 if(!charge||charge.id!==id)return;const valid=canAim()&&s.selectedSkill!=='BLINK'&&!charge.cancel,power=s.power,previousPower=charge.previous,canceled=charge.cancel;charge=null;stopChargeTone();if(valid){s.power=power;launch();}else{s.power=previousPower;if(canceled)feedback='Shot canceled';hud();}
}
function launch(plan=null){
 if(hostPaused()||manualPaused||demo||ArcStoryView.active)return;clearInput();shot=E.launch(s,s.angle,s.power,plan);
 if(!shot)return;persistStock();if(!shot.side&&shot.skill)lastSkill=shot.skill;s.units[shot.side].recoil={age:0};flight=0;tail=null;impact=null;feedback='';sfxSync();sfx.begin(shot);if(shot.teleport)tone(620,.19,'sine');hud();
}
function beginVictory(){if(victoryToken===gameToken||!ArcAudio.victoryFor(s,runContext||{}))return;victoryToken=gameToken;bgm.request('VICTORY',{restart:true});audioSync();}
function finishResult(){
 if(s.result==='win'&&s.stage===100&&!ArcFinalTeam.complete(s)){ArcFinalTeam.guard(s);return;}
 beginVictory();
 if(s.result==='win'){for(const item of E.claimClearRewards(s))acquired(item);persistStock();buildSkills();if(openLoot(finishResult))return;}
 if(s.result!=='win'){s.pendingLoot=[];$('lootPicker').hidden=true;lootContinuation=null;}
 clearInput();dialog='result';const final=s.result==='win'&&s.stage===100;
 ending=ending||{age:0,winner:s.result==='win'?0:s.result==='lose'?1:-1,final};
 $('overlay').dataset.kind=final?'final':s.result==='win'?'win':'lose';$('resultIcon').textContent=s.result==='win'?'✦':s.result==='draw'?'◇':'↗';$('modalEyebrow').textContent=`LEVEL ${s.stage} · ${s.result==='win'?'CLEARED':s.reason==='shots'?'OUT OF ACTIONS':s.reason==='durability'?'ROVER DISABLED':'DRAW'}`;
 let advanced=false;
 if(s.result==='win'&&!s.resultHandled){s.resultHandled=true;const result=R.finish(save.data,runContext,s);s.chapterReset=!!result.reset;advanced=result.advanced;
  if(advanced){for(const [id,level]of Object.entries(ArcWeapons.coreUnlocks))if(s.stage>=level&&!save.data.unlockedWeaponIds.includes(id))save.data.unlockedWeaponIds.push(id);pendingAdvance=save.ready;}
 }
 paintResultStory();if(final)$('replayClearMovie').hidden=true;if(advanced&&s.stage%10===0)ArcJournal.markRead(save.data,['chapter:'+Math.ceil(s.stage/10)+':cleared']);
 $('clearRewardLine').hidden=!(s.result==='win'&&s.clearRewardSkills?.length);$('clearRewardLine').replaceChildren();for(const id of s.clearRewardSkills||[]){const span=document.createElement('span');span.textContent=(K.get(id)?.name||id)+' +1';$('clearRewardLine').append(span);}
 $('modalTitle').textContent=final?'The last gate opens.':s.result==='win'?'Cleared.':s.reason==='shots'?'Out of actions.':s.result==='draw'?'A draw.':'Rover disabled.';
 const inventory=I.fromState(s);
 $('modalDetail').textContent=s.result==='win'?(s.chapterReset?'Chapter clear. Weapon and skill stock resets.':(ArcI18n.language==='en'?`Carries across chapters: ${Object.keys(inventory.weapons).length} weapons, ${Object.keys(inventory.skills).length} skills`:`次の章へ持ち越し可能：武器${Object.keys(inventory.weapons).length}種・スキル${Object.keys(inventory.skills).length}種`)):'Remaining stock and claimed pickups stay saved when retrying.';
 $('resume').disabled=false;$('resume').textContent=final?(ArcI18n.language==='en'?'Watch the epilogue':'エピローグへ'):[30,60].includes(s.stage)&&s.result==='win'?(ArcI18n.language==='en'?'See what follows':'その後を見る'):s.result==='win'?'NEXT LEVEL':'TRY AGAIN';$('returnLobby').textContent=final?'COLLECTION':'JOURNEY';$('resultJourney').hidden=true;
 const finalRetry=ArcFinalTeam.active(s)&&s.result!=='win'&&!!finalRetryEntry;
 $('overlay').dataset.finalRetry=String(finalRetry);$('retryFinalCharacter').hidden=!finalRetry;
 if(finalRetry){const english=ArcI18n.language==='en';$('retryFinalCharacter').textContent=english?'Retry this machine':'このキャラから再挑戦';$('resume').textContent=english?'Restart all ten':'先頭から再挑戦';$('modalDetail').textContent=english?'Retry this machine with full HP, 3 special charges and 28 actions. Its damage and stock return to its relay entry. Completed machines stay complete.':'このキャラの出撃時点に戻します。HP・必殺技3チャージ・28行動を回復し、このキャラの与ダメージと持ち物を出撃時へ戻します。達成済みキャラは維持します。';}
 $('endingCollection').hidden=!final;$('endingCollection').textContent=final?save.data.unlockedWeaponIds.map(id=>ArcWeapons.get(id).appearance.glyph).join('　'):'';
 $('battle').classList.add('resolved');$('overlay').hidden=false;$('resume').focus();if(!(s.result==='win'&&victoryToken===gameToken))tone(s.result==='win'?660:220,.4,'triangle');
 if(advanced){if([30,60,100].includes(s.stage))save.data.journal.pendingMovie=s.stage===100?'epilogue':String(s.stage);persistAdvance();}
}
async function persistAdvance(){
 if(!pendingAdvance||!save.ready){pendingAdvance=false;return true;}
 if(resultSaving){await save.pending;pendingAdvance=save.dirty;return !pendingAdvance;}
 resultSaving=true;const token=gameToken;$('resume').disabled=true;
 const ok=await save.save();pendingAdvance=!ok||save.dirty;resultSaving=false;
 if(token===gameToken){$('resume').disabled=false;if(dialog==='result'&&pendingAdvance){$('resume').textContent='RETRY SAVE';$('modalDetail').textContent='Could not save progress. Retry before continuing.';}}
 return !pendingAdvance;
}
function advanceTurn(){
 const beforeWorld=s.world,beforeUnits=s.units.map(u=>({...u})),beforeSpecial=s.specialAmmo,beforeSpecialSerial=s.specialChargeSerial,beforeTeam=s.finalTeam?.serial,beforeState={...s,units:beforeUnits,world:beforeWorld};E.next(s);specialNotice.gain(beforeSpecial,s,gameToken,beforeSpecialSerial);if(s.phase==='transition')transition={world:beforeWorld,units:beforeUnits,age:0,duration:.6};if(beforeTeam!==s.finalTeam?.serial){cpuJob=null;cpuReady=null;jobId++;transition=s.finalTeam?.travel?ArcFinalTravel.create(beforeState,renderer.view,s.finalTeam.travel,reducedMotion):null;s.time=transition?.duration||s.time;clearInput();renderer.resetCamera();sfx.prepare(s.characterId);}if(s.phase==='over'){finishResult();return;}
 if(beforeTeam!==s.finalTeam?.serial)finalRetryEntry=ArcFinalTeam.snapshot(s);
 if(s.turn){s.time=0;if(!cpuJob&&!cpuReady)requestCPU();}else{shot=null;}
 hud();
}
function requestCPU(){
 const token=gameToken,id=++jobId,state={...s,random:undefined};cpuJob={id,token};cpuReady=null;
 if(worker){worker.postMessage({id,state,seed:(s.matchSeed+s.round*1009)>>>0});return;}
 setTimeout(()=>{if(cpuJob?.id!==id||gameToken!==token)return;const start=performance.now(),target=E.enemyMoveTarget(s),u={...s.units[1]};G.move(s,1,target-s.units[1].x);const plan=E.cpuPlan(s,E.seeded((s.matchSeed+s.round*1009)>>>0));Object.assign(s.units[1],u);cpuReady={target,plan};platformStatus.cpuJobs.push({worker:false,elapsed:performance.now()-start});},0);
}
if(typeof Worker!=='undefined')try{worker=new Worker('cpu-worker.js?v='+ArcRelease.cacheVersion);worker.onmessage=event=>{const r=event.data;if(!cpuJob||r.id!==cpuJob.id||cpuJob.token!==gameToken)return;if(r.error){platformStatus.errors.push(r.error);worker.terminate();worker=null;requestCPU();return;}cpuReady=r;platformStatus.cpuJobs.push({worker:true,elapsed:r.elapsed});};worker.onerror=e=>{platformStatus.errors.push(e.message);worker.terminate();worker=null;if(s&&(s.turn||cpuJob))requestCPU();};}catch(e){platformStatus.errors.push(String(e));}
function update(dt,realDt=dt){
 sfxSync();updateSpecialNotice();
 if(mapCamera?.active)return;
 if(!hostPaused()&&!manualPaused)ArcCharacterHero.updateAll(dt);
 if(!$('lootPicker').hidden||!$('collectionPanel').hidden||ArcExpeditionUi.active)return;
 clock+=dt;if(manualPaused||hostPaused())return;ArcStoryView.update(dt);ArcMenus.update(dt);ArcChapterPlayback.update(dt);if(!$('battleMachinePicker').hidden)return;if(ArcStoryView.active||ArcExpeditionUi.active)return;if(!s||specialLesson.active)return;
 if(encounter&&!demo){encounter.age+=dt;if(encounter.age>=encounter.duration){const boss=encounter.boss;encounter=null;if(boss)renderer.resetCamera();}}paintEncounter();
 if(encounter?.boss&&!demo&&!reducedMotion){clearInput();hud();return;}
 if(demo){const elapsed=demo.age+dt;demo.loops+=Math.floor(elapsed/demo.duration);demo.age=elapsed%demo.duration;hud();return;}
 if(s.phase==='aim'&&!s.units[0].animation?.path){
  if(charge){charge.elapsed+=realDt;s.power=E.chargePower(charge.elapsed,s);if(chargeTone)chargeTone.frequency.value=150+s.power*5;}
  const axis=input.movementAxis;if(axis)E.move(s,0,axis*160*dt,!!charge);
  if(input.aimAxis)s.angle=E.clamp(s.angle+50*input.aimAxis*Math.abs(input.aimAxis)*dt,minimumAngle(),maximumAngle());
 }else if(s.phase==='cpu'){
  s.time-=dt;if(s.time<=0&&cpuReady){s.cpuTarget=cpuReady.target;s.cpuStart=s.units[1].x;s.cpuMoveTime=0;
   if(Math.abs(s.cpuTarget-s.cpuStart)<1){const plan=cpuReady.plan;cpuJob=null;cpuReady=null;launch(plan);}
   else{s.cpuMoveDuration=E.clamp(Math.abs(s.cpuTarget-s.cpuStart)/200,.2,.45);s.phase='cpuMove';}
  }
 }else if(s.phase==='cpuMove'){
  s.cpuMoveTime+=dt;const ratio=Math.min(1,s.cpuMoveTime/s.cpuMoveDuration),x=s.cpuStart+(s.cpuTarget-s.cpuStart)*ratio;G.move(s,1,x-s.units[1].x);
  if(ratio>=1){const plan=cpuReady.plan;cpuJob=null;cpuReady=null;launch(plan);}
 }else if(s.phase==='flight'){
  flight+=dt;sfx.update(Math.min(flight,shot.duration));const before=shot.appliedEvents;E.applyEvents(s,shot,flight,acquired);
  for(const e of shot.events.slice(before,shot.appliedEvents)){if(e.type==='cloud')tone(180,.09,'triangle',.03);if(e.type==='phase')tone(1400,.08,'sine',.04);}
  if(flight>=shot.duration){
   const last=shot,parts=s.units.map(u=>u.parts.map(p=>p.hp));E.resolve(s,last,acquired);tail={shot:last,age:0};impact={...last.end,age:0,weaponId:last.weaponId,shot:last,damage:last.damage};shot=null;
   s.units.forEach((u,i)=>{const broken=u.parts.flatMap((p,j)=>p.hp<=0&&parts[i][j]>0?[j]:[]);if(last.damage[i]>0||broken.length)u.reaction={age:0,damage:last.damage[i],side:last.side,broken};});
   if(!last.events.some(e=>e.type==='pickup'))feedback=last.teleport&&!last.teleportSuccess?'No landing':'';sfx.finish();if(last.teleport)tone(580,.3,'sine',.15);
   if(s.phase==='over'){beginVictory();ending={age:0,winner:s.result==='win'?0:s.result==='lose'?1:-1,final:s.stage===100&&s.result==='win'};s.phase='finish';}else{s.phase='impact';if(s.turn===0&&!s.finalTeam?.pending)requestCPU();}s.time=s.phase==='finish'?.8:1.4;
  }
 }else if(s.phase==='impact'||s.phase==='finish'){
  s.time-=dt;if(tail)tail.age+=dt;
  if(s.phase==='impact'&&s.turn===1&&s.time<=.6){advanceTurn();}
  else if(s.time<=0){tail=null;if(s.phase==='finish'){s.phase='over';finishResult();}else advanceTurn();}
 }else if(s.phase==='repair'){s.time-=dt;if(s.repair)s.repair.age+=dt;if(s.time<=0)advanceTurn();
 }else if(s.phase==='transition'){
  s.time-=dt;if(tail)tail.age+=dt;if(transition){transition.age+=dt;if(transition.kind==='final-travel'&&!transition.reframed&&transition.age>=transition.duration*.55){transition.reframed=true;renderer.resetCamera();}}if(s.time<=0){transition=null;s.phase='aim';s.power=20;feedback='';shot=null;tail=null;if(!openLoot(afterLootAim))afterLootAim();hud();}
 }
 for(const p of pickupEffects)p.age+=dt;pickupEffects=pickupEffects.filter(p=>p.age<.8);
 for(const u of s.units)if(u.teleportFlash&&(u.teleportFlash.age+=dt)>.8)delete u.teleportFlash;
 for(const u of s.units)if(u.animation){u.animation.age+=dt;if(u.animation.age>=u.animation.duration)delete u.animation;}
 for(const u of s.units){if(u.recoil&&(u.recoil.age+=dt)>.22)delete u.recoil;if(u.reaction&&(u.reaction.age+=dt)>.7)delete u.reaction;}
 if(reward){reward.age+=dt;if(reward.age>3)reward=null;}
 if(ending)ending.age+=dt;
 if(impact){impact.age+=dt;if(impact.age>1)impact=null;}hud();
}
function draw(){if(ArcStoryView.active){ArcStoryView.drawFilm();return;}renderer.draw(s||preview,{...mapCamera?.options,time:clock,lobby:!s,canAim:canAim(),difficulty:s?.difficulty||save.data.difficulty,characterId:s?.characterId||save.data.equippedCharacterId,shot,flight,tail,impact,demo:activePreview(),reducedMotion,transition,pickupEffects,charging:!!charge,cameraLock:charge?.cameraLock,chargeCamera:charge?.cameraState,chargeWalking:!!charge&&!!input?.movementAxis,encounter,ending,collection:{weapons:save.data.unlockedWeaponIds}});}
function schedule(){if(!hostPaused()&&!raf)raf=requestAnimationFrame(loop);}
function loop(t){raf=0;if(hostPaused())return;const realDt=previous?Math.max(0,(t-previous)/1000):0;previous=t;if(!manualPaused){update(Math.min(realDt,.05),realDt);draw();}schedule();}
function syncInert(){$('app').inert=hostPaused();}
function pauseHost(source='sdk'){pauseSources.add(source);clearInput();syncInert();cancelAnimationFrame(raf);raf=0;previous=0;audioSync();}
function resumeHost(source='sdk'){pauseSources.delete(source);syncInert();if(hostPaused())return;previous=0;audioSync();schedule();if(save.dirty)save.save();}
function pause(){mapCamera?.close(false);if(ArcStoryView.active||ArcExpeditionUi.active||specialLesson.active)return;if(!s||s.result||hostPaused()||!$('lootPicker').hidden)return;clearInput();manualPaused=true;$('chapterMessage').hidden=true;$('clearRewardLine').hidden=true;dialog='pause';$('overlay').dataset.kind='pause';$('resultIcon').textContent='Ⅱ';$('modalEyebrow').textContent='LEVEL '+s.stage;$('modalTitle').textContent='Paused';$('modalDetail').textContent='';$('resume').textContent='Resume game';$('resume').disabled=false;$('returnLobby').textContent='Return to title';$('resultJourney').hidden=true;$('endingCollection').hidden=true;$('overlay').hidden=false;audioSync();hud();$('resume').focus();}
function confirmPauseAction(kind){
 if(!s||!manualPaused||s.result)return;dialog=kind;$('overlay').dataset.kind=kind;$('modalTitle').textContent=kind==='retry'?'Retry this level?':'Return to title?';$('modalDetail').textContent=ArcFinalTeam.active(s)?'This level restarts from its entry stock.':'Remaining stock and claimed pickups stay saved when retrying.';$('resume').textContent=kind==='retry'?'Retry level':'Return to title';$('returnLobby').textContent='CANCEL';$('resume').focus();
}
function lobby(){if(ArcStoryView.state?.ending)return;mapCamera?.close(false);ArcScreens.close('specialLesson',false);bgm.request('TITLE');specialNotice.reset(-1);ArcStoryView.hideResult();ArcMenus.close(false);$('chapterMessage').hidden=true;clearInput();gameToken++;s=null;runContext=null;shot=null;tail=null;impact=null;demo=null;encounter=null;ending=null;reward=null;transition=null;lootContinuation=null;pickupEffects=[];cpuReady=null;cpuJob=null;manualPaused=false;$('encounterBanner').hidden=true;$('tutorial').hidden=true;$('rewardNotice').hidden=true;$('weaponPicker').hidden=true;$('lootPicker').hidden=true;$('lobby').hidden=false;$('battle').hidden=true;$('overlay').hidden=true;selectedMap=save.data.chapterRun?save.data.chapterRun.stage-1:Math.min(selectedMap,Math.min(99,save.data.cleared));syncLobby();audioSync();save.save();}
async function playStoryMovie(id,onDone=()=>{},replay=false,trigger=null){
 if(movieOpening||ArcStoryView.active)return false;
 movieOpening=true;
 try{
  if(id==='epilogue'&&!replay){
   if(!save.ready||!(await persistAdvance())||save.dirty&&!(await save.save()))return false;
   if(save.data.pendingRecruit||save.data.updateNoticePending){ArcExpeditionUi.open(()=>playStoryMovie(id,onDone,replay,trigger));return false;}
  }
  unlockAudio();
  const prior=replay?bgm.snapshot():null;
  const opened=ArcStoryView.open(String(id),()=>{previous=0;if(prior)bgm.restore(prior);else if(id==='epilogue')bgm.request('TITLE');onDone();draw();},replay,trigger);
  if(opened&&id!=='epilogue'&&!(!replay&&['30','60'].includes(String(id))&&victoryToken===gameToken&&bgm.state().id==='VICTORY'))bgm.request(id==='30'?'BATTLE_A':id==='60'?'BATTLE_B':'TITLE');
  return opened;
 }finally{movieOpening=false;}
}
ArcChapterPlayback.install({data:()=>save.data,movie:(id,done)=>playStoryMovie(id,done,true),track:stage=>bgm.request(ArcAudio.forStage(stage,ArcLevels[stage-1]),{restart:ArcAudio.restartForStage(stage,ArcLevels[stage-1])}),snapshot:()=>bgm.snapshot(),restore:snapshot=>bgm.restore(snapshot)});
ArcExpeditionUi.install({data:()=>save.data,persist:()=>save.save(),clearInput,changed:()=>{if(!s)syncLobby();draw();}});
ArcStoryView.install({clearInput,playbackBlocked:hostPaused,progress:()=>save.data.cleared,beginEnding:()=>{bgm.request('ENDING',{restart:true});audioSync();},endingClock:()=>bgm.state(),cue:(index,id,shot)=>{if(id!=='epilogue')tone(196+index*35,.25,'triangle',.025);},finished:(id,meta)=>{if(meta.replay)return;const j=save.data.journal;if(!j.moviesSeen.includes(id))j.moviesSeen.push(id);if(j.pendingMovie===id)j.pendingMovie=null;if(id==='prologue'){j.introSeen=true;ArcJournal.markRead(save.data,['introduction']);}save.save();}});
$('replayClearMovie').onclick=()=>{if(ArcStoryView.active||save.data.journal.pendingMovie==='epilogue')return;if(s?.result==='win'&&[30,60,100].includes(s.stage))playStoryMovie(s.stage===100?'epilogue':String(s.stage),()=>{},true);};
$('play').onclick=start;$('prevMap').onclick=()=>switchMap(-1);$('nextMap').onclick=()=>switchMap(1);$('chooseLevel').onclick=showLevels;$('closeLevels').onclick=()=>{$('levelPicker').hidden=true;$('chooseLevel').focus();};
$('retryFinalCharacter').onclick=()=>{if(dialog!=='result'||!s?.result||s.result==='win'||!ArcFinalTeam.active(s)||!finalRetryEntry)return;selectedMap=99;start({finalRetry:finalRetryEntry});};
$('weaponLoadout').onchange=e=>{unlockAudio();save.data.equippedWeaponId=e.target.value;save.save();syncLobby();};
function openEquipment(view='characters'){if(hostPaused()||ArcStoryView.active||ArcExpeditionUi.active)return;clearInput();ArcPresentation.showCollection(save.data,change=>{if(change.characterId&&!ArcCrew.owned(save.data,change.characterId))return false;if(change.weaponId)save.data.equippedWeaponId=change.weaponId;if(change.characterId)save.data.equippedCharacterId=change.characterId;save.save();syncLobby();draw();return true;},view,{trigger:view==='characters'?$('openCharacters'):$('openCollection')});}
$('openCollection').onclick=openChapterInventory;$('openCharacters').onclick=()=>openEquipment('characters');
$('openLibrary').onclick=()=>{ArcPresentation.closeWeapons();openEquipment('weapons');};
$('lootSkip').onclick=()=>finishLoot(null,true);
$('closeCollection').onclick=()=>ArcPresentation.closeCollection();$('pauseMachineChange').onclick=openBattleMachines;
$('pause').onclick=pause;$('resume').onclick=async()=>{if(hostPaused()||ArcStoryView.active||movieOpening)return;
 if(dialog==='retry'){selectedMap=s.stage-1;start(runContext);return;}
 if(dialog==='confirm'){lobby();return;}
 if(dialog==='chapter'){const token=gameToken;if(!(await persistAdvance())||token!==gameToken)return;const stage=chapterConfirm;if(R.restart(save.data,stage)){chapterConfirm=null;selectedMap=stage-1;start();}return;}
 if(dialog==='result'){
  if(s.result==='win'&&!ArcStoryView.finishResultText())return;
  const token=gameToken;if(s.result==='win'&&(!(await persistAdvance())||token!==gameToken))return;
  const moveOn=()=>{if(s.result==='win'&&s.stage===100){lobby();return;}selectedMap=s.result==='win'?Math.min(99,s.stage):s.stage-1;start();};
  const id=s.result==='win'&&([30,60,100].includes(s.stage))?(s.stage===100?'epilogue':String(s.stage)):null;
  ArcExpeditionUi.open(()=>{if(id)playStoryMovie(id,moveOn);else moveOn();});
 }
 else{manualPaused=false;previous=0;$('overlay').hidden=true;audioSync();hud();$('world').focus({preventScroll:true});}};
$('returnLobby').onclick=async()=>{if(ArcStoryView.active||movieOpening)return;if(dialog==='chapter'){chapterConfirm=null;$('overlay').hidden=true;showLevels();return;}if(dialog==='result'){const token=gameToken;if(s.result==='win'&&(!(await persistAdvance())||token!==gameToken))return;const final=s.result==='win'&&s.stage===100,depart=()=>{lobby();if(!final)showLevels();};ArcExpeditionUi.open(()=>{if(save.data.journal.pendingMovie)playStoryMovie(save.data.journal.pendingMovie,depart);else depart();});return;}if(dialog==='confirm'||dialog==='retry'){pause();return;}confirmPauseAction('confirm');};
$('retryLevel').onclick=()=>confirmPauseAction('retry');
$('resultJourney').onclick=()=>{if(ArcStoryView.active)return;$('returnLobby').click();};
function specialWeaponNote(){return (s?.specialAmmo>0?(ArcI18n.language==='en'?'Special ready! Open the weapon selector to use it.':'チャージ完了！ 武器切り替えから必殺技を選べます。')+'\n':'')+ArcI18n.t('Special unlocks on your turns 2, 4 and 6. Guardians start with three. Unused stock carries across chapters.');}
$('weaponToggle').onclick=()=>{if(!canAim())return;const choices=battleWeaponChoices();clearInput();ArcPresentation.showWeapons(choices,s.mode,id=>{if(E.selectWeapon(s,id)){s.angle=Math.max(minimumAngle(),s.angle);tone(620,.08);hud();if(!hasSeen(id)&&ArcLessons.forWeapon(s,id,save.data))runDemo(id,true);}}, {title:'Choose attack',grouped:true,note:specialWeaponNote()});};
// Secondary touch contacts do not receive native compatibility clicks on every browser.
$('weaponToggle').onpointerdown=e=>{if(e.pointerType==='touch'&&(input.active||charge)&&canAim()){e.preventDefault();$('weaponToggle').click();}};
$('closeWeapons').onclick=()=>ArcPresentation.closeWeapons();
$('warpToggle').onclick=()=>{if(!canAim())return;clearInput();if(E.selectTeleport(s)){tone(700,.08);hud();if(s.teleportMode&&!hasSeen('teleport'))runDemo('teleport',true);}};
$('warpToggle').onpointerdown=e=>{if(e.pointerType==='touch'&&charge){e.preventDefault();$('warpToggle').click();}};
$('skillToggle').onclick=()=>{if(!canAim())return;clearInput();buildSkills();$('skillPicker').hidden=false;hud();$('closeSkills').focus();};
$('repairCommit').onclick=commitRepair;$('repairCancel').onclick=()=>{buildSkills();hud();$('closeSkills').focus();};
$('skillToggle').onpointerdown=e=>{if(e.pointerType==='touch'&&(charge||input.active)&&canAim()){e.preventDefault();$('skillToggle').click();}};
$('closeSkills').onclick=()=>{$('skillPicker').hidden=true;hud();$('skillToggle').focus();};
let controlLayout='left';try{if(localStorage.getItem('arcline-control-layout')==='right')controlLayout='right';}catch{}
function applyControlLayout(){$('app').dataset.controls=controlLayout;$('mirrorControls').textContent=controlLayout==='left'?'Move / aim → Right':'Move / aim → Left';$('mirrorControls').setAttribute('aria-label',controlLayout==='left'?'Move and aim on left; switch to right':'Move and aim on right; switch to left');}
function toggleControlLayout(){clearInput();controlLayout=controlLayout==='left'?'right':'left';try{localStorage.setItem('arcline-control-layout',controlLayout);}catch{}if(save.ready&&!preferencesHydrating){save.data.preferences.controls=controlLayout;save.save();}applyControlLayout();draw();}
$('mirrorControls').onclick=toggleControlLayout;applyControlLayout();
ArcMenus.install({data:()=>save.data,persist:()=>save.save(),controls:()=>controlLayout,toggleControls:toggleControlLayout,allowed:()=>!s&&!hostPaused()&&!resultSaving&&!$('openSettings').disabled&&$('difficultyIntro').hidden,clearInput,summary:syncJournalSummary,playChapter:(chapter,trigger,done)=>ArcChapterPlayback.open(chapter,trigger,done),playMovie:(id,trigger,done)=>playStoryMovie(id,done||(()=>{}),true,trigger),replayRecruit:(id,done)=>ArcExpeditionUi.replay(id,done)});

$('previewOK').onclick=()=>{unlockAudio();endDemo();};


$('environment').onpointerdown=()=>{if(canAim())previewPress=setTimeout(()=>{const kind=s.spec.features.find(f=>'WBCKUFVM'.includes(f.type))?.type;if(kind)runDemo(kind);},450);};$('environment').onpointerup=$('environment').onpointercancel=()=>clearTimeout(previewPress);
function setAngle(angle){if(!canAim())return;s.angle=E.clamp(angle,minimumAngle(),maximumAngle());hud();}
$('aimRange').oninput=e=>setAngle(Number(e.target.value));$('aimUp').onclick=()=>setAngle(s.angle+3);$('aimDown').onclick=()=>setAngle(s.angle-3);
input=ArcBattleInput.create({state:()=>s,charge:()=>charge,allowed:canAim,activate:unlockAudio,startCharge,releaseCharge,clearInput,changed:hud,previewing:()=>!!demo,setAngle,switchMap,minimumAngle,maximumAngle,worldAction:e=>{
 if(s?.selectedSkill!=='BLINK'||!canAim())return false;
 const p=renderer.toWorld(e.clientX,e.clientY),i=s.blink.findIndex(b=>Math.hypot(p.x-b.x,p.y-(b.y-22))<60);
 if(i>=0){if(s.blinkCandidate===i){if(E.blink(s,i)){persistStock();lastSkill='BLINK';feedback='';}s.blinkCandidate=null;}else{s.blinkCandidate=i;feedback='TAP AGAIN TO BLINK';}}else{s.selectedSkill=null;s.blinkCandidate=null;feedback='';}hud();return true;
}});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&charge){e.preventDefault();cancelCharge(true);hud();return;}
 if(e.key==='Escape'&&(document.fullscreenElement||document.webkitFullscreenElement))return;
 if(!$('screenHelp').hidden){if(e.key==='Escape')$('closeScreenHelp').click();else if(e.key==='Tab'){e.preventDefault();$('closeScreenHelp').focus();}return;}
 if(hostPaused())return;
 if(!$('lootPicker').hidden){if(e.key==='Escape'){e.preventDefault();return;}if(e.key==='Tab'){const buttons=[...$('lootPicker').querySelectorAll('button:not(:disabled)')],first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}return;}
 if(!$('overlay').hidden&&e.key==='Tab'){const buttons=[...$('overlay').querySelectorAll('button:not(:disabled)')].filter(b=>b.getClientRects().length),first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}return;}
 if(e.key==='Escape'){if(!$('skillPicker').hidden){$('closeSkills').click();return;}if(!$('weaponPicker').hidden){$('closeWeapons').click();return;}if(!$('collectionPanel').hidden){$('closeCollection').click();return;}if(!$('levelPicker').hidden){$('levelPicker').hidden=true;return;}if(demo&&$('overlay').hidden)return;if(!$('overlay').hidden){if(dialog==='chapter')$('returnLobby').click();else if(dialog==='result')$('returnLobby').click();else if(dialog==='confirm'||dialog==='retry')pause();else $('resume').click();}else pause();return;}
 input.keydown(e);
});
mapCamera=ArcMapCamera.create({state:()=>s,allowed:()=>canAim()&&!charge&&!specialLesson.active,available:()=>!hostPaused()&&!manualPaused,clearInput,changed:()=>{previous=0;hud();},draw,resetCamera:()=>renderer.resetCamera()});
// Safari can retain an existing page zoom. Keep the whole game inside its visible viewport.
viewport=ArcViewport.install($('app'),()=>{clearInput();mapCamera?.resize();previous=0;draw();});
window.addEventListener('blur',clearInput);window.addEventListener('resize',()=>{clearInput();previous=0;viewport.fit();mapCamera?.resize();draw();});
document.addEventListener('visibilitychange',()=>document.hidden?pauseHost('visibility'):resumeHost('visibility'));
if(sdk){sdk.system.onPause(()=>pauseHost('sdk'));sdk.system.onResume(()=>resumeHost('sdk'));sdk.system.onAudioEnabledChange(v=>{hostAudio=v;audioSync();});}
window.addEventListener('arcline-fullscreen',()=>{clearInput();previous=0;viewport.fit();mapCamera?.resize();draw();});
window.addEventListener('arcline-language',()=>{clearInput();if(save.ready&&!preferencesHydrating){save.data.preferences.language=ArcI18n.language;save.save();}difficultyUi.refresh();if(s&&!$('weaponPicker').hidden)document.querySelector('.weapon-picker-note').textContent=specialWeaponNote();if(s){hud();if(s.result)paintResultStory();paintEncounter();}else syncLobby();draw();});
ArcI18n.install();
// firstFrameReady is sent after a real frame; saveData is gated by successful loadData.
syncLobby();$('loading').hidden=true;$('app').hidden=false;draw();sdk?.game.firstFrameReady();$('play').disabled=true;
ArcOnboarding.install({data:()=>save.data,persist:()=>save.ready?save.save():Promise.resolve(true),playMovie:done=>playStoryMovie('prologue',done),trial:done=>difficultyUi.request(done),deleteAvailable:()=>save.ready,canDelete:()=>save.ready&&!s&&!hostPaused()&&!ArcStoryView.active&&!ArcChapterPlayback.active&&(ArcScreens.isOpen('journeyStart')||!ArcOnboarding.active&&!$('lobby').hidden),deleteSave:()=>save.reset(),deleted:()=>{selectedMap=0;lobby();ArcOnboarding.prepare(()=>start());}});
function openEndingPreview(){
 $('deleteStartSave').hidden=true;
 $('beginJourney').textContent=ArcI18n.language==='en'?'Play ending':'エンディングを再生';
 ArcScreens.open('journeyStart',{block:['lobby','battle'],onEscape(){},cycleFocus:true});
 $('beginJourney').onclick=()=>{globalThis.ArcFullscreen?.enter?.();ArcScreens.close('journeyStart',false);playStoryMovie('epilogue',openEndingPreview,true,$('beginJourney'));};
 $('beginJourney').focus({preventScroll:true});
}
save.load().then(()=>{const preferences=save.data.preferences;controlLayout=preferences.controls||'left';applyControlLayout();ArcI18n.setLanguage(preferences.language||'ja');save.data.preferences={language:ArcI18n.language,controls:controlLayout};preferencesHydrating=false;ArcOnboarding.syncDelete();selectedMap=save.data.chapterRun?save.data.chapterRun.stage-1:Math.min(99,save.data.cleared);syncLobby();$('play').disabled=false;$('difficultyChoice').disabled=false;$('lobbyDifficulty').disabled=false;$('openSettings').disabled=false;$('openJournal').disabled=!save.data.journeyStarted;if(save.ready)save.save();sdk?.game.gameReady();if(endingPreview){openEndingPreview();return;}const proceed=()=>ArcExpeditionUi.open(()=>{if(save.data.journal.pendingMovie)playStoryMovie(save.data.journal.pendingMovie);});if(save.data.onboarding.step!=='done')ArcOnboarding.prepare(()=>start());else proceed();});schedule();
