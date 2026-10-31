'use strict';
const E=ArcEngine,G=E.geometry,I=ArcInventory,R=ArcCampaignRun,$=id=>document.getElementById(id),sdk=globalThis.ytgame,inYT=!!sdk?.IN_PLAYABLES_ENV;
const renderer=ArcRender.create($('world')),pauseSources=new Set();
let selectedMap=0,s=null,preview=E.campaign(1),manualPaused=false,raf=0,previous=0,clock=0,shot=null,flight=0,tail=null,impact=null,charge=null,stick=null,aimStick=null,gesture=null,keyMove=0,dialog='pause',feedback='',cpuJob=null,cpuReady=null,gameToken=0,demo=null,lastDemoId='controls',worker=null,jobId=0,previewPress=null,resizeFrame=0,transition=null,pickupEffects=[];
let audio=null,master=null,chargeTone=null,userInteracted=false,hostAudio=inYT?sdk.system.isAudioEnabled():true;
let encounter=null,ending=null,reward=null,lastSkill=null,runContext=null,lootContinuation=null,pendingAdvance=false,resultSaving=false,chapterConfirm=null;
const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const platformStatus={cpuJobs:[],workerSupported:typeof Worker!=='undefined',sdk:inYT,errors:[]};
const save=ArcSave.create({
 load:()=>inYT?Promise.race([sdk.game.loadData(),new Promise((_,reject)=>setTimeout(()=>reject(Error('timeout')),4000))]):localStorage.getItem(ArcSave.key),
 backup:raw=>{if(!inYT)localStorage.setItem(ArcSave.key+'-backup',raw);},
 save:raw=>inYT?sdk.game.saveData(raw):localStorage.setItem(ArcSave.key,raw)
},state=>{$('saveStatus').dataset.error=['load-failed','save-failed'].includes(state);$('saveStatus').textContent=state==='saved'?(inYT?'Progress synced':'Progress saved on this device'):state==='load-failed'?'Progress unavailable · Session play':'Progress not saved · Retry on resume';});
const hostPaused=()=>pauseSources.size>0;
function minimumAngle(){if(s?.teleportMode)return -12;return s?ArcWeapons.get(s.mode).minAngle||-12:-12;}
function canAim(){return !!s&&s.phase==='aim'&&!hostPaused()&&!manualPaused&&!encounter&&!demo&&!s.pendingLoot.length&&$('lootPicker').hidden&&$('weaponPicker').hidden&&$('skillPicker').hidden;}
function audioSync(){if(!audio)return;const on=userInteracted&&hostAudio&&!hostPaused()&&!manualPaused;master.gain.value=on?.5:0;(on?audio.resume():audio.suspend()).catch(()=>{});}
function unlockAudio(){userInteracted=true;if(!audio)try{audio=new(window.AudioContext||window.webkitAudioContext)();master=audio.createGain();master.connect(audio.destination);}catch{}audioSync();}
function tone(freq=440,duration=.12,type='sine',volume=.08){if(!audio||!hostAudio||hostPaused()||manualPaused)return;const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(40,freq*.5),audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g).connect(master);o.start();o.stop(audio.currentTime+duration);}
function stopChargeTone(){if(chargeTone){try{chargeTone.stop();}catch{}chargeTone=null;}}
function resetStick(){stick=null;keyMove=0;$('stickKnob').style.transform='translate(0px,0px)';$('stick').setAttribute('aria-valuenow',0);}
function resetAimStick(){aimStick=null;$('aimStickKnob').style.transform='translate(0px,0px)';}
function cancelCharge(notify=false){if(charge&&s){s.power=charge.previous;if(notify)feedback='Shot canceled';}charge=null;stopChargeTone();}
function clearInput(){gesture=null;resetStick();resetAimStick();cancelCharge();clearTimeout(previewPress);previewPress=null;}
function acquired(item){
 pickupEffects.push({x:item.x,y:item.y,id:item.id,age:0});
 if(item.pending)return;
 const data=save.data;
 if(item.kind==='trial'){reward={id:item.weaponId,kind:'weapon',age:0};feedback='';tone(850,.25,'sine');return;}if(item.kind==='ammo'){feedback=ArcWeapons.get(item.weaponId).name+' +1';tone(850,.2,'sine');return;}
 if(item.id[0]==='W'&&!data.unlockedWeaponIds.includes(item.id)){data.unlockedWeaponIds.push(item.id);reward={id:item.id,kind:'weapon',age:0};feedback='';}
 if(['S','B'].includes(item.id[0])&&!data.collectedCosmeticIds.includes(item.id)){data.collectedCosmeticIds.push(item.id);reward={id:item.id,kind:'cosmetic',age:0};feedback='';}
 if(item.skill){feedback=item.skill+' +'+(item.taken||1);buildSkills();}
 save.save();tone(item.id[0]==='W'?850:1046,.25,'sine');
}
function syncLobby(){
 const context=R.inspect(save.data,selectedMap+1),entry=context.entry;
 preview=E.campaign(selectedMap+1,{...save.data,battleInventory:entry.inventory,battleMode:entry.mode||'W01',matchSeed:entry.seed});const spec=preview.spec;
 syncDifficultyChoice();
 $('arenaTitle').textContent=spec.name;$('arenaTag').textContent=E.biomes[spec.theme].name;
 $('stageCaption').textContent=`LEVEL ${spec.id} · ${spec.boss?'BOSS · ':''}${Object.entries(spec.skills).map(([k,n])=>k+' ×'+n).join(' / ')||'STANDARD ONLY'}`;
 $('progressText').textContent=`${save.data.cleared} / 100 CLEARED`;$('play').innerHTML=`PLAY LEVEL ${spec.id} <span aria-hidden="true">→</span>`;
 $('collectionCount').textContent=`${save.data.unlockedWeaponIds.length}/20 · ${save.data.collectedCosmeticIds.length}/37`;
 $('prevMap').disabled=selectedMap===0;$('nextMap').disabled=selectedMap>=Math.min(99,save.data.cleared);
 $('weaponLoadout').innerHTML=save.data.unlockedWeaponIds.map(id=>`<option value="${id}">${ArcWeapons.get(id).name}</option>`).join('');$('weaponLoadout').value=save.data.equippedWeaponId;
 $('cosmeticLoadout').innerHTML='<option value="">Original</option>'+save.data.collectedCosmeticIds.map(id=>`<option value="${id}">${id} · ${id[0]==='B'?'Boss armor':'Collection'}</option>`).join('');$('cosmeticLoadout').value=save.data.equippedCosmeticId||'';
 ArcPresentation.syncLobby(save.data,selectedMap,context);
 $('resumeRun').hidden=!save.data.chapterRun||save.data.chapterRun.stage===selectedMap+1;
}
function syncDifficultyChoice(){for(const input of document.querySelectorAll('input[name="difficulty"]'))input.checked=input.value===save.data.difficulty;}
for(const input of document.querySelectorAll('input[name="difficulty"]'))input.onchange=()=>{
 if(s||hostPaused()){syncDifficultyChoice();return;}
 save.data.difficulty=ArcAimGuide.normalize(input.value);save.save();syncDifficultyChoice();
};
function switchMap(delta){if(s||hostPaused())return;selectedMap=E.clamp(selectedMap+delta,0,Math.min(99,save.data.cleared));syncLobby();tone(440,.08);}
function showLevels(){
 if(hostPaused())return;
 ArcPresentation.renderJourney(save.data,selectedMap,i=>{selectedMap=i;$('levelPicker').hidden=true;syncLobby();},confirmChapter);$('levelPicker').hidden=false;$('closeLevels').focus();
}
function confirmChapter(stage){
 clearInput();chapterConfirm=stage;$('levelPicker').hidden=true;dialog='chapter';$('overlay').dataset.kind='chapter';$('resultIcon').textContent='↻';$('modalEyebrow').textContent='CHAPTER';$('modalTitle').textContent=`Restart chapter ${R.chapter(stage)}?`;$('modalDetail').textContent='Chapter stock resets. Progress and collection stay saved.';$('resume').textContent='START CHAPTER';$('resume').disabled=false;$('returnLobby').textContent='CANCEL';$('resultJourney').hidden=true;$('endingCollection').hidden=true;$('overlay').hidden=false;$('returnLobby').focus();
}
function openChapterInventory(){
 if(hostPaused())return;const context=R.inspect(save.data,selectedMap+1);
 if(context.practice){openEquipment('weapons');return;}
 const choices=[{id:'W01',ammo:Infinity},...Object.entries(context.entry.inventory.weapons).map(([id,ammo])=>({id,ammo,source:'Carried until boss'}))];
 ArcPresentation.showWeapons(choices,context.entry.mode||'W01',id=>{if(R.chooseWeapon(save.data,selectedMap+1,id))save.save();syncLobby();},{title:'Chapter inventory',note:'Weapons and skills carry until the chapter boss.',library:true,skills:context.entry.inventory.skills});
}
function openLoot(continuation){
 if(!s?.pendingLoot.length)return false;clearInput();lootContinuation=continuation;$('lootPicker').hidden=false;paintLoot();hud();return true;
}
function paintLoot(){
 const item=s.pendingLoot[0];if(!item){$('lootPicker').hidden=true;const next=lootContinuation;lootContinuation=null;next?.();return;}
 const current=item.kind==='weapons'?s.weaponStock:s.skills;
 const attempt=I.add(I.fromState(s),item.kind,item.id,item.amount,item.fill);
 if(attempt.status!=='pending'){finishLoot(null,false);return;}
 $('lootTitle').textContent=item.kind==='weapons'?'Weapon slots full':'Skill slots full';$('lootName').textContent=item.kind==='weapons'?ArcWeapons.get(item.id).name:item.id;$('lootAmount').textContent='×'+(item.fill?3:item.amount);
 $('lootChoices').replaceChildren();
 for(const [id,n] of Object.entries(current).filter(([,n])=>n>0)){
  const b=document.createElement('button'),name=document.createElement('strong'),count=document.createElement('span'),action=document.createElement('small');b.type='button';b.dataset.replaceLoot=id;name.textContent=item.kind==='weapons'?ArcWeapons.get(id).name:id;count.textContent='×'+n;action.textContent='Replace';b.append(name,count,action);b.onclick=()=>finishLoot(id,false);$('lootChoices').append(b);
 }
 $('lootSkip').textContent='Skip pickup';$('lootSkip').focus({preventScroll:true});
}
function finishLoot(removeId,skip){
 const origin=s?.pendingLoot[0]?.origin,result=s&&E.resolveLoot(s,removeId,skip);if(!result)return;
 if(!result.skipped&&!result.full&&origin!=='supply')acquired(result);
 if(origin==='supply'&&!runContext?.practice&&R.updatePreparation(save.data,runContext,s))save.save();
 else if(origin==='supply'&&runContext?.practice){runContext.entry.inventory=I.fromState(s);runContext.entry.pending=s.pendingLoot.filter(p=>p.origin==='supply').map(p=>({...p}));}
 buildSkills();paintLoot();hud();
}
const icons={BURST:'◉',BLINK:'◇',PUSH:'→',BOUNCE:'⌁',PULL:'←',SPLIT:'⋔',PHASE:'⇥',SWAP:'⇄'};
function buildSkills(){
 $('skillChoices').innerHTML=Object.keys(s.skills).map(id=>`<button type="button" class="skill" data-skill="${id}" aria-label="${id}, hold for preview"><b class="skill-icon" aria-hidden="true">${icons[id]}</b><span class="skill-name">${id}</span><small class="skill-count">×${s.skills[id]}</small><span class="skill-state"></span></button>`).join('');
 document.querySelectorAll('[data-skill]').forEach(b=>{
  b.onpointerdown=e=>{e.stopPropagation();delete b.dataset.long;if(!canAim()||b.disabled)return;
   if(e.pointerType==='touch'&&(stick||aimStick||charge)){e.preventDefault();b.click();return;}
   previewPress=setTimeout(()=>{previewPress=null;if(runDemo(b.dataset.skill))b.dataset.long='1';},450);
  };
  b.onpointerup=()=>{clearTimeout(previewPress);previewPress=null;};b.onpointercancel=b.onpointerleave=b.onpointerup;
  b.onclick=()=>{if(!$('skillPicker').hidden)$('skillPicker').hidden=true;if(b.dataset.long){delete b.dataset.long;return;}if(!canAim())return;clearInput();
   const id=b.dataset.skill,ok=E.selectSkill(s,id);feedback=ok?'':s.skillUsed?'NEXT TURN':'EMPTY';tone(560,.08);hud();
   if(ok&&s.selectedSkill===id&&!hasSeen(id)&&ArcLessons.forSkill(s,id,save.data))runDemo(id,true);
  };
 });
}
function battleWeaponChoices(){
 return E.availableWeapons(s).map(c=>({...c,source:runContext?.practice?'Practice weapon':'Carried until boss'}));
}
function hud(){
 if(!s)return;const shown=activePreview(),displayState=shown?(shown.effectProgress>=.5?shown.after:shown.before)||shown.state:s,[p,e]=displayState.units,enabled=canAim();
 $('playerName').textContent=ArcCharacters.get(save.data.equippedCharacterId).name;
 $('php').textContent=Number(p.hp.toFixed(2));$('ehp').textContent=Number(e.hp.toFixed(2));$('pbar').style.width=p.hp/5*100+'%';$('ebar').style.width=e.hp/e.maxHp*100+'%';$('pbar').parentElement.style.setProperty('--segments',20);$('ebar').parentElement.style.setProperty('--segments',100/e.maxHp);
 $('ename').textContent=s.spec.boss?s.spec.name:'RIVAL';$('round').textContent=(runContext?.practice?'PRACTICE · ':'')+'LV '+s.stage;
 $('turnLabel').textContent=demo?'':encounter?'BOSS':s.phase==='over'?'COMPLETE':s.turn?'RIVAL':'YOUR TURN';
 const left=s.shotLimit-s.shotCount;$('shotBudget').textContent=(runContext?.practice?'PRACTICE · ':'')+(left===1?'LAST ACTION':left+' ACTIONS');$('shotBudget').classList.toggle('low',left<=3);$('shotBudget').classList.toggle('last',left===1);
 const held=shown?.id==='controls'&&shown.phase==='WATCH';
 const displayPower=shown?.displayPower??shown?.pose?.power??s.power;
 $('powerNumber').textContent=Math.round(displayPower)+'%';$('powerFill').style.width=displayPower+'%';$('powerHUD').classList.toggle('active',!!charge);
 const aimState=shown?.state||s,aimAngle=shown?.pose?.angle??s.angle;
 $('angleText').textContent=Math.round(G.muzzle(aimState,0,aimAngle).worldAngle)+'°';$('aimRange').value=s.angle;$('aimRange').min=minimumAngle();for(const id of ['aimRange','aimUp','aimDown'])$(id).disabled=!enabled;$('fire').disabled=!enabled||s.selectedSkill==='BLINK';$('fire').classList.toggle('charging',!!charge||held);$('fire').classList.toggle('canceling',!!charge?.cancel);$('chargeValue').textContent=charge?.cancel?'CANCEL':s.teleportMode?'TELEPORT':'FIRE';$('chargeRing').style.strokeDashoffset=345.58*(1-((charge||held)?(displayPower-20)/80:0));
 $('fireHint').hidden=!charge;$('fireHint').textContent=charge?.cancel?'Release to cancel':charge?.id==='keyboard'?'Esc to cancel':'Slide away to cancel';
 $('fire').setAttribute('aria-label',s.teleportMode?'Hold to charge teleport; slide away to cancel':'Hold to charge; release to fire; slide away to cancel');
 $('shotFeedback').textContent=feedback||(!demo&&s.selectedSkill==='BLINK'?'Tap a landing spot, then tap again.':'');
 const mode=shown?.pose?.mode||(s.teleportMode?'TELEPORT':s.mode),weapon=ArcWeapons.get(mode),look=weapon.appearance,entry=E.availableWeapons(displayState).find(w=>w.id===mode),ammo=entry?.ammo||0;
 $('weaponGlyph').textContent=look.glyph;$('weaponName').textContent=weapon.name;
 $('weaponStock').textContent=mode==='W01'||mode==='TELEPORT'?'Unlimited':ammo+(ammo===1?' shot':' shots');
 $('weaponState').textContent='WEAPON';$('weaponToggle').style.borderColor=look.color;$('weaponToggle').style.color=look.color;
 $('weaponToggle').setAttribute('aria-label',weapon.name+', '+$('weaponStock').textContent+', choose weapon');$('weaponToggle').classList.toggle('special',mode!=='W01');$('weaponToggle').classList.toggle('new',!!s.weaponStock[s.lastPickupWeaponId]);$('weaponToggle').disabled=!enabled;$('weaponToggle').dataset.switchable=String(battleWeaponChoices().length>1);
 for(const b of document.querySelectorAll('[data-skill]')){
  const id=b.dataset.skill,count=demo?(displayState.skills[id]??s.skills[id]):s.skills[id],used=!demo&&s.skillUsed,selected=demo?shown.pose?.selectedSkill===id:!used&&s.selectedSkill===id;
  const blocked=id==='SWAP'&&s.spec.boss;
  b.querySelector('.skill-count').textContent='×'+count;b.querySelector('.skill-state').textContent=blocked?'Unavailable on bosses':selected?'Selected':used?(lastSkill===id?'Used':'Next turn'):count<=0?'Empty':'';
  b.disabled=(!enabled&&$('skillPicker').hidden)||used||count<=0||blocked;b.classList.toggle('spent',used||count<=0||blocked);b.setAttribute('aria-disabled',b.disabled);b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',selected);b.setAttribute('aria-label',id+', '+count+' uses'+(blocked?', Unavailable on bosses':selected?', selected':used?', used this turn':count<=0?', empty':''));
 }
 if(shown){
  $('tutorialContext').textContent=/WEAPON/.test(shown.context)?'WEAPON PREVIEW':/SKILL/.test(shown.context)?'SKILL PREVIEW':/BOSS/.test(shown.context)?'BOSS PREVIEW':/CONTROL/.test(shown.context)?'CONTROL PREVIEW':shown.source==='vignette'?'PRACTICE PREVIEW':'LEVEL PREVIEW';$('tutorialStep').textContent=shown.step;$('tutorialInstruction').textContent=shown.instruction;$('tutorialOutcome').textContent=shown.outcome;
  $('tutorialInstruction').hidden=shown.phase==='RESULT';$('tutorialOutcome').hidden=shown.phase!=='RESULT';
  $('previewPowerFill').style.width=displayPower+'%';$('previewPowerNumber').textContent=Math.round(displayPower)+'%';$('previewAction').textContent=shown.controlAction||shown.step;
 }
 for(const id of ['stick','aimStick']){$(id).setAttribute('aria-disabled',!enabled);$(id).style.opacity=enabled?'1':'.4';}
 $('aimStick').setAttribute('aria-valuemin',minimumAngle());$('aimStick').setAttribute('aria-valuenow',Math.round(s.angle));$('aimStick').setAttribute('aria-valuetext',Math.round(s.angle)+' degrees');
 $('warpToggle').hidden=!s.spec.teleport;$('warpToggle').disabled=!enabled;$('warpToggle').setAttribute('aria-pressed',s.teleportMode);$('fire').classList.toggle('teleport',s.teleportMode);
 const selected=s.selectedSkill;const skillCount=Object.keys(s.skills).filter(k=>s.skills[k]>0).length;$('skills').hidden=!Object.keys(s.skills).length;$('skillName').textContent=selected||'Skill';$('skillStock').textContent=selected?'×'+s.skills[selected]:String(skillCount);$('skillToggle').setAttribute('aria-pressed',!!selected);$('skillToggle').disabled=!enabled||s.skillUsed||skillCount===0;
 const rs=s.world.regions.map(r=>r.kind==='F'?(r.direction>0?'WIND →':'WIND ←'):r.kind==='V'?(r.on?'VENT ↑':'VENT · NEXT ↑'):r.kind==='M'?'FIELD '+(r.direction>0?'↻':'↺'):r.kind==='C'?'CLOUD':'UPDRAFT ↑');
 $('environment').textContent=[...new Set([...rs,...(s.world.solids.some(o=>o.kind==='bridge')?['BRIDGE · NEXT ⋯']:[])])].join('　');
 $('rewardNotice').hidden=!reward||!!demo;$('trialWeapon').hidden=true;
 if(reward){const id=reward.id,isWeapon=id[0]==='W',look=isWeapon?ArcWeapons.get(id).appearance:null;
  $('rewardName').textContent=isWeapon?ArcWeapons.get(id).name:ArcPresentation.cosmetic(id).name;
  $('rewardGlyph').textContent=look?.glyph||'◆';$('rewardNotice').style.setProperty('--reward-color',look?.color||ArcPresentation.cosmetic(id).color);
 }
}
function lessonDescriptor(id){return ArcLessons.describe(id);}
function hasSeen(id){const lesson=lessonDescriptor(id);return save.data.seenPreviewIds.includes(lesson?.key||'v3:'+id);}
function activePreview(){return demo?ArcPreview.at(demo,demo.age):null;}
function runDemo(id,automatic=false){
 if(!s||s.phase!=='aim'||hostPaused()||manualPaused||shot||encounter||demo)return false;
 clearInput();const lesson=lessonDescriptor(id),preview=ArcPreview.create(s,id);
 if(!preview?.proof?.valid){platformStatus.previewErrors=platformStatus.previewErrors||[];platformStatus.previewErrors.push({stage:s.stage,id});return false;}
 demo={...preview,seenId:lesson?.id||preview.id,seenKey:lesson?.key||'v3:'+preview.id,age:0,loops:0,automatic};lastDemoId=demo.seenId;
 $('tutorialName').textContent=lesson?.title||preview.title;$('tutorial').hidden=false;$('tutorial').dataset.mode='preview';$('battle').dataset.lesson=preview.id;$('battle').dataset.preview='true';hud();$('previewOK').focus({preventScroll:true});return true;
}
function endDemo(){
 if(!demo)return;const ids=[demo.seenKey,'v2:'+(demo.seenId||demo.id)];demo=null;$('tutorial').hidden=true;delete $('battle').dataset.lesson;delete $('battle').dataset.preview;
 for(const b of document.querySelectorAll('[data-skill]'))delete b.dataset.long;
 for(const id of ids)if(!save.data.seenPreviewIds.includes(id))save.data.seenPreviewIds.push(id);
 save.save();hud();draw();$('world').focus({preventScroll:true});
}
function firstDemo(){
 const lessons=ArcLessons.forStage(s,save.data);
 for(const lesson of lessons)if(!hasSeen(lesson.id)&&runDemo(lesson.id,true))return;
 const weapon=ArcLessons.forWeapon(s,s.mode,save.data);if(weapon&&!hasSeen(weapon.id))runDemo(weapon.id,true);
}
function start(retryContext=null){
 if(hostPaused()||!save.ready&&$('play').disabled)return;unlockAudio();gameToken++;cpuJob=null;cpuReady=null;
 if(pendingAdvance&&!save.dirty)pendingAdvance=false;
 if(pendingAdvance&&save.ready&&!R.inspect(save.data,selectedMap+1).practice){const token=gameToken,n=selectedMap;persistAdvance().then(ok=>{if(ok&&token===gameToken&&n===selectedMap)start(retryContext);});return;}
 runContext=retryContext?.practice&&retryContext.entry?.stage===selectedMap+1?{practice:true,entry:R.decode(retryContext.entry)}:R.begin(save.data,selectedMap+1);
 const entry=runContext.entry;clearInput();s=E.campaign(selectedMap+1,{...save.data,battleInventory:entry.inventory,battleMode:entry.mode,matchSeed:entry.seed,pickupLedger:entry.pickupLedger,pendingLoot:entry.pending});s.difficulty=ArcAimGuide.normalize(save.data.difficulty);s.power=20;transition=null;shot=null;tail=null;impact=null;demo=null;ending=null;reward=null;lastSkill=null;pickupEffects=[];feedback='';manualPaused=false;lootContinuation=null;$('lootPicker').hidden=true;delete $('battle').dataset.preview;delete $('battle').dataset.lesson;buildSkills();
 if(!runContext.practice)save.save();
 encounter=s.spec.boss?{age:0,duration:1.1,name:s.spec.name,boss:true}:null;
 $('encounterBanner').hidden=!encounter;$('encounterName').textContent=s.spec.name;
 $('lobby').hidden=true;$('battle').hidden=false;$('battle').classList.remove('resolved');$('overlay').hidden=true;$('levelPicker').hidden=true;$('collectionPanel').hidden=true;$('weaponPicker').hidden=true;$('tutorial').hidden=true;$('skillPicker').hidden=true;audioSync();hud();if(!encounter&&!openLoot(firstDemo))firstDemo();if(!demo&&$('lootPicker').hidden)$('world').focus({preventScroll:true});tone(s.spec.boss?130:520,s.spec.boss?.4:.15,'triangle');
}
function startCharge(id){
 if(!canAim()||charge||s.selectedSkill==='BLINK')return;
 unlockAudio();gesture=null;charge={id,elapsed:0,previous:s.power,cancel:false,cameraLock:{...renderer.view}};s.power=20;
 if(audio&&hostAudio){chargeTone=audio.createOscillator();const g=audio.createGain();g.gain.value=.025;chargeTone.type='triangle';chargeTone.frequency.value=150;chargeTone.connect(g).connect(master);chargeTone.start();}hud();
}
function releaseCharge(id){
 if(!charge||charge.id!==id)return;const valid=canAim()&&s.selectedSkill!=='BLINK'&&!charge.cancel,power=s.power,previousPower=charge.previous,canceled=charge.cancel;charge=null;stopChargeTone();if(valid){s.power=power;launch();}else{s.power=previousPower;if(canceled)feedback='Shot canceled';hud();}
}
function launch(plan=null){
 if(hostPaused()||manualPaused||demo)return;clearInput();shot=E.launch(s,s.angle,s.power,plan);
 if(!shot)return;if(!shot.side&&shot.skill)lastSkill=shot.skill;s.units[shot.side].recoil={age:0};flight=0;tail=null;impact=null;feedback='';const voice=ArcWeapons.get(shot.weaponId);tone(voice.teleport?620:voice.needle||voice.gravity<.5?540:voice.twin?260:voice.damage>1.1?85:155,voice.damage>1.1?.32:.19,voice.teleport||voice.needle?'sine':'sawtooth');hud();
}
function finishResult(){
 if(s.result==='win'&&openLoot(finishResult))return;
 if(s.result!=='win'){s.pendingLoot=[];$('lootPicker').hidden=true;lootContinuation=null;}
 clearInput();dialog='result';const final=s.result==='win'&&s.stage===100;
 ending=ending||{age:0,winner:s.result==='win'?0:s.result==='lose'?1:-1,final};
 $('overlay').dataset.kind=final?'final':s.result==='win'?'win':'lose';$('resultIcon').textContent=s.result==='win'?'✦':s.result==='draw'?'◇':'↗';$('modalEyebrow').textContent=`LEVEL ${s.stage} · ${s.result==='win'?'CLEARED':s.reason==='shots'?'OUT OF ACTIONS':s.reason==='durability'?'ROVER DISABLED':'DRAW'}`;
 let advanced=false;
 if(s.result==='win'&&!s.resultHandled){s.resultHandled=true;const result=R.finish(save.data,runContext,s);s.chapterReset=!!result.reset;advanced=result.advanced;
  if(advanced){for(const [id,level]of Object.entries(ArcWeapons.coreUnlocks))if(s.stage>=level&&!save.data.unlockedWeaponIds.includes(id))save.data.unlockedWeaponIds.push(id);pendingAdvance=save.ready;}
 }
 $('modalTitle').textContent=final?'Every arc led here.':s.result==='win'?'Cleared.':s.reason==='shots'?'Out of actions.':s.result==='draw'?'A draw.':'Rover disabled.';
 const inventory=I.fromState(s);
 $('modalDetail').textContent=runContext?.practice?'Practice stock does not change your chapter.':s.result==='win'?(s.chapterReset?'Chapter clear. Weapon and skill stock resets.':`Carry forward: ${Object.keys(inventory.weapons).length} weapons, ${Object.keys(inventory.skills).length} skills`):'Retry restores the stock from the start of this level.';
 $('resume').disabled=false;$('resume').textContent=runContext?.practice?'PLAY AGAIN':final?'JOURNEY':s.result==='win'?'NEXT LEVEL':'TRY AGAIN';$('returnLobby').textContent=final&&!runContext?.practice?'COLLECTION':'JOURNEY';$('resultJourney').hidden=true;
 $('endingCollection').hidden=!final;$('endingCollection').textContent=final?save.data.unlockedWeaponIds.map(id=>ArcWeapons.get(id).appearance.glyph).join('　'):'';
 $('battle').classList.add('resolved');$('overlay').hidden=false;$('resume').focus();tone(s.result==='win'?660:220,.4,'triangle');
 if(advanced)persistAdvance();
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
 const beforeWorld=s.world,beforeUnits=s.units.map(u=>({...u}));E.next(s);if(s.phase==='transition')transition={world:beforeWorld,units:beforeUnits,age:0,duration:.6};if(s.phase==='over'){finishResult();return;}
 if(s.turn){s.time=0;if(!cpuJob&&!cpuReady)requestCPU();}else{shot=null;}
 hud();
}
function requestCPU(){
 const token=gameToken,id=++jobId,state={...s,random:undefined};cpuJob={id,token};cpuReady=null;
 if(worker){worker.postMessage({id,state,seed:(s.matchSeed+s.round*1009)>>>0});return;}
 setTimeout(()=>{if(cpuJob?.id!==id||gameToken!==token)return;const start=performance.now(),target=E.enemyMoveTarget(s),u={...s.units[1]};G.move(s,1,target-s.units[1].x);const plan=E.cpuPlan(s,E.seeded((s.matchSeed+s.round*1009)>>>0));Object.assign(s.units[1],u);cpuReady={target,plan};platformStatus.cpuJobs.push({worker:false,elapsed:performance.now()-start});},0);
}
if(typeof Worker!=='undefined')try{worker=new Worker('cpu-worker.js?v=0.7.3');worker.onmessage=event=>{const r=event.data;if(!cpuJob||r.id!==cpuJob.id||cpuJob.token!==gameToken)return;if(r.error){platformStatus.errors.push(r.error);worker.terminate();worker=null;requestCPU();return;}cpuReady=r;platformStatus.cpuJobs.push({worker:true,elapsed:r.elapsed});};worker.onerror=e=>{platformStatus.errors.push(e.message);worker.terminate();worker=null;if(s&&(s.turn||cpuJob))requestCPU();};}catch(e){platformStatus.errors.push(String(e));}
function update(dt,realDt=dt){
 if(!$('lootPicker').hidden)return;
 clock+=dt;if(!s||manualPaused||hostPaused())return;
 if(encounter){encounter.age+=dt;if(encounter.age>=encounter.duration){encounter=null;$('encounterBanner').hidden=true;if(!openLoot(firstDemo))firstDemo();}hud();return;}
 if(demo){const elapsed=demo.age+dt;demo.loops+=Math.floor(elapsed/demo.duration);demo.age=elapsed%demo.duration;hud();return;}
 if(s.phase==='aim'){
  if(charge){charge.elapsed+=realDt;s.power=E.chargePower(charge.elapsed);if(chargeTone)chargeTone.frequency.value=150+s.power*5;}
  const axis=stick?stick.axis:keyMove;if(axis)E.move(s,0,axis*160*dt);
  if(aimStick?.axis)s.angle=E.clamp(s.angle+50*aimStick.axis*Math.abs(aimStick.axis)*dt,minimumAngle(),85);
 }else if(s.phase==='cpu'){
  s.time-=dt;if(s.time<=0&&cpuReady){s.cpuTarget=cpuReady.target;s.cpuStart=s.units[1].x;s.cpuMoveTime=0;
   if(Math.abs(s.cpuTarget-s.cpuStart)<1){const plan=cpuReady.plan;cpuJob=null;cpuReady=null;launch(plan);}
   else{s.cpuMoveDuration=E.clamp(Math.abs(s.cpuTarget-s.cpuStart)/200,.2,.45);s.phase='cpuMove';}
  }
 }else if(s.phase==='cpuMove'){
  s.cpuMoveTime+=dt;const ratio=Math.min(1,s.cpuMoveTime/s.cpuMoveDuration),x=s.cpuStart+(s.cpuTarget-s.cpuStart)*ratio;G.move(s,1,x-s.units[1].x);
  if(ratio>=1){const plan=cpuReady.plan;cpuJob=null;cpuReady=null;launch(plan);}
 }else if(s.phase==='flight'){
  flight+=dt;const before=shot.appliedEvents;E.applyEvents(s,shot,flight,acquired);
  for(const e of shot.events.slice(before,shot.appliedEvents)){if(e.type==='bounce'||e.type==='skip')tone(e.type==='skip'?720:930,.06,'sine',.05);if(e.type==='cloud')tone(180,.09,'triangle',.03);if(e.type==='phase')tone(1400,.08,'sine',.04);}
  if(flight>=shot.duration){
   const last=shot,parts=s.units.map(u=>u.parts.map(p=>p.hp));E.resolve(s,last,acquired);tail={shot:last,age:0};impact={...last.end,age:0,weaponId:last.weaponId,shot:last,damage:last.damage};shot=null;
   s.units.forEach((u,i)=>{const broken=u.parts.flatMap((p,j)=>p.hp<=0&&parts[i][j]>0?[j]:[]);if(last.damage[i]>0||broken.length)u.reaction={age:0,damage:last.damage[i],side:last.side,broken};});
   if(!last.events.some(e=>e.type==='pickup'))feedback=last.teleport&&!last.teleportSuccess?'No landing':'';tone(last.teleport?580:last.damage[1-s.turn]>0?110:75,.3,last.teleport?'sine':'triangle',.15);
   if(s.phase==='over'){ending={age:0,winner:s.result==='win'?0:s.result==='lose'?1:-1,final:s.stage===100&&s.result==='win'};s.phase='finish';}else{s.phase='impact';if(s.turn===0)requestCPU();}s.time=1.4;
  }
 }else if(s.phase==='impact'||s.phase==='finish'){
  s.time-=dt;if(tail)tail.age+=dt;
  if(s.phase==='impact'&&s.turn===1&&s.time<=.6){advanceTurn();}
  else if(s.time<=0){tail=null;if(s.phase==='finish'){s.phase='over';finishResult();}else advanceTurn();}
 }else if(s.phase==='transition'){
  s.time-=dt;if(tail)tail.age+=dt;if(transition)transition.age+=dt;if(s.time<=0){transition=null;s.phase='aim';s.power=20;feedback='';shot=null;tail=null;openLoot(()=>{$('world').focus({preventScroll:true});});hud();}
 }
 for(const p of pickupEffects)p.age+=dt;pickupEffects=pickupEffects.filter(p=>p.age<.8);
 for(const u of s.units)if(u.teleportFlash&&(u.teleportFlash.age+=dt)>.8)delete u.teleportFlash;
 for(const u of s.units)if(u.animation){u.animation.age+=dt;if(u.animation.age>=u.animation.duration)delete u.animation;}
 for(const u of s.units){if(u.recoil&&(u.recoil.age+=dt)>.22)delete u.recoil;if(u.reaction&&(u.reaction.age+=dt)>.7)delete u.reaction;}
 if(reward){reward.age+=dt;if(reward.age>3)reward=null;}
 if(ending)ending.age+=dt;
 if(impact){impact.age+=dt;if(impact.age>1)impact=null;}hud();
}
function draw(){renderer.draw(s||preview,{time:clock,lobby:!s,canAim:canAim(),difficulty:s?.difficulty||save.data.difficulty,characterId:save.data.equippedCharacterId,cosmetic:save.data.equippedCosmeticId,shot,flight,tail,impact,demo:activePreview(),reducedMotion,transition,pickupEffects,charging:!!charge,cameraLock:charge?.cameraLock,chargeWalking:!!charge&&(!!stick?.axis||!!keyMove),encounter,ending,collection:{weapons:save.data.unlockedWeaponIds,cosmetics:save.data.collectedCosmeticIds}});}
function schedule(){if(!hostPaused()&&!raf)raf=requestAnimationFrame(loop);}
function loop(t){raf=0;if(hostPaused())return;const realDt=previous?Math.max(0,(t-previous)/1000):0;previous=t;if(!manualPaused){update(Math.min(realDt,.05),realDt);draw();}schedule();}
function syncInert(){$('app').inert=[...pauseSources].some(x=>x!=='orientation');$('gameSurface').inert=pauseSources.has('orientation');}
function pauseHost(source='sdk'){pauseSources.add(source);clearInput();syncInert();cancelAnimationFrame(raf);raf=0;previous=0;audioSync();}
function resumeHost(source='sdk'){pauseSources.delete(source);syncInert();if(hostPaused())return;previous=0;audioSync();schedule();if(save.dirty)save.save();}
function pause(){if(!s||s.result||hostPaused()||!$('lootPicker').hidden)return;clearInput();manualPaused=true;dialog='pause';$('overlay').dataset.kind='pause';$('resultIcon').textContent='Ⅱ';$('modalEyebrow').textContent='LEVEL '+s.stage;$('modalTitle').textContent='Paused';$('modalDetail').textContent='';$('resume').textContent='Resume game';$('resume').disabled=false;$('returnLobby').textContent='Return to title';$('resultJourney').hidden=true;$('endingCollection').hidden=true;$('overlay').hidden=false;audioSync();hud();$('resume').focus();}
function confirmPauseAction(kind){
 if(!s||!manualPaused||s.result)return;dialog=kind;$('overlay').dataset.kind=kind;$('modalTitle').textContent=kind==='retry'?'Retry this level?':'Return to title?';$('modalDetail').textContent=kind==='retry'?'Retry restores the stock from the start of this level.':'This level restarts from its entry stock.';$('resume').textContent=kind==='retry'?'Retry level':'Return to title';$('returnLobby').textContent='CANCEL';$('resume').focus();
}
function lobby(){clearInput();gameToken++;s=null;runContext=null;shot=null;tail=null;impact=null;demo=null;encounter=null;ending=null;reward=null;transition=null;lootContinuation=null;pickupEffects=[];cpuReady=null;cpuJob=null;manualPaused=false;$('encounterBanner').hidden=true;$('tutorial').hidden=true;$('rewardNotice').hidden=true;$('weaponPicker').hidden=true;$('lootPicker').hidden=true;$('lobby').hidden=false;$('battle').hidden=true;$('overlay').hidden=true;selectedMap=Math.min(selectedMap,Math.min(99,save.data.cleared));syncLobby();audioSync();save.save();}
$('play').onclick=start;$('prevMap').onclick=()=>switchMap(-1);$('nextMap').onclick=()=>switchMap(1);$('chooseLevel').onclick=showLevels;$('closeLevels').onclick=()=>{$('levelPicker').hidden=true;$('chooseLevel').focus();};
$('weaponLoadout').onchange=e=>{unlockAudio();save.data.equippedWeaponId=e.target.value;save.save();syncLobby();};$('cosmeticLoadout').onchange=e=>{unlockAudio();save.data.equippedCosmeticId=e.target.value||null;save.save();syncLobby();};
function openEquipment(view){if(hostPaused())return;ArcPresentation.showCollection(save.data,change=>{if('weaponId' in change)save.data.equippedWeaponId=change.weaponId;if('cosmeticId' in change)save.data.equippedCosmeticId=change.cosmeticId;if('characterId' in change)save.data.equippedCharacterId=change.characterId;save.save();syncLobby();draw();},view);}
$('openCollection').onclick=openChapterInventory;$('openCharacters').onclick=()=>openEquipment('characters');
$('resumeRun').onclick=()=>{if(save.data.chapterRun){selectedMap=save.data.chapterRun.stage-1;syncLobby();}};
$('openLibrary').onclick=()=>{ArcPresentation.closeWeapons();openEquipment('weapons');};
$('lootSkip').onclick=()=>finishLoot(null,true);
$('closeCollection').onclick=()=>{ArcPresentation.closeCollection();$('openCollection').focus();};
$('pause').onclick=pause;$('resume').onclick=async()=>{if(hostPaused())return;
 if(dialog==='retry'){selectedMap=s.stage-1;start(runContext);return;}
 if(dialog==='confirm'){lobby();return;}
 if(dialog==='chapter'){const token=gameToken;if(!(await persistAdvance())||token!==gameToken)return;const stage=chapterConfirm;if(R.restart(save.data,stage)){chapterConfirm=null;selectedMap=stage-1;start();}return;}
 if(dialog==='result'){const token=gameToken;if(!runContext?.practice&&s.result==='win'&&(!(await persistAdvance())||token!==gameToken))return;if(runContext?.practice){selectedMap=s.stage-1;start(runContext);return;}if(s.result==='win'&&s.stage===100){lobby();showLevels();return;}selectedMap=s.result==='win'?Math.min(99,s.stage):s.stage-1;start();}
 else{manualPaused=false;previous=0;$('overlay').hidden=true;audioSync();hud();$('world').focus({preventScroll:true});}};
$('returnLobby').onclick=()=>{if(dialog==='chapter'){chapterConfirm=null;$('overlay').hidden=true;showLevels();return;}if(dialog==='result'){const final=s.result==='win'&&s.stage===100&&!runContext?.practice;lobby();if(final)openEquipment();else showLevels();return;}if(dialog==='confirm'||dialog==='retry'){pause();return;}confirmPauseAction('confirm');};
$('retryLevel').onclick=()=>confirmPauseAction('retry');
$('resultJourney').onclick=()=>{lobby();showLevels();};
$('weaponToggle').onclick=()=>{if(!canAim())return;const choices=battleWeaponChoices();clearInput();ArcPresentation.showWeapons(choices,s.mode,id=>{if(E.selectWeapon(s,id)){s.angle=Math.max(minimumAngle(),s.angle);tone(620,.08);hud();if(!hasSeen(id)&&ArcLessons.forWeapon(s,id,save.data))runDemo(id,true);}}, {note:runContext?.practice?'Practice: three shots of your selected weapon.':'Weapons and skills carry until the chapter boss.'});};
// Secondary touch contacts do not receive native compatibility clicks on every browser.
$('weaponToggle').onpointerdown=e=>{if(e.pointerType==='touch'&&(stick||aimStick||charge)&&canAim()){e.preventDefault();$('weaponToggle').click();}};
$('closeWeapons').onclick=()=>ArcPresentation.closeWeapons();
$('warpToggle').onclick=()=>{if(!canAim())return;clearInput();if(E.selectTeleport(s)){tone(700,.08);hud();if(s.teleportMode&&!hasSeen('teleport'))runDemo('teleport',true);}};
$('warpToggle').onpointerdown=e=>{if(e.pointerType==='touch'&&charge){e.preventDefault();$('warpToggle').click();}};
$('skillToggle').onclick=()=>{if(!canAim())return;clearInput();$('skillPicker').hidden=false;hud();$('closeSkills').focus();};
$('closeSkills').onclick=()=>{$('skillPicker').hidden=true;hud();$('skillToggle').focus();};
let controlLayout='left';try{if(localStorage.getItem('arcline-control-layout')==='right')controlLayout='right';}catch{}
function applyControlLayout(){$('app').dataset.controls=controlLayout;$('mirrorControls').textContent=controlLayout==='left'?'Move / aim → Right':'Move / aim → Left';$('mirrorControls').setAttribute('aria-label',controlLayout==='left'?'Move and aim on left; switch to right':'Move and aim on right; switch to left');}
$('mirrorControls').onclick=()=>{clearInput();controlLayout=controlLayout==='left'?'right':'left';try{localStorage.setItem('arcline-control-layout',controlLayout);}catch{}applyControlLayout();draw();};applyControlLayout();

$('previewOK').onclick=()=>{unlockAudio();endDemo();};


$('environment').onpointerdown=()=>{if(canAim())previewPress=setTimeout(()=>{const kind=s.spec.features.find(f=>'WBCKUFVM'.includes(f.type))?.type;if(kind)runDemo(kind);},450);};$('environment').onpointerup=$('environment').onpointercancel=()=>clearTimeout(previewPress);
function setAngle(angle){if(!canAim())return;s.angle=E.clamp(angle,minimumAngle(),85);hud();}
$('aimRange').oninput=e=>setAngle(Number(e.target.value));$('aimUp').onclick=()=>setAngle(s.angle+3);$('aimDown').onclick=()=>setAngle(s.angle-3);
function pointer(e){e.preventDefault();unlockAudio();}
$('fire').onpointerdown=e=>{pointer(e);if(charge)return;if(e.button!==0&&e.pointerType!=='touch')return;startCharge(e.pointerId);try{$('fire').setPointerCapture(e.pointerId);}catch{}};
function chargePointer(e){
 if(charge?.id!==e.pointerId)return;e.preventDefault();const {dx,dy}=controlVector('fire',e),r=ArcViewport.rect($('fire'),$('app')),radius=Math.min(r.width,r.height)/2;
 charge.cancel=Math.hypot(dx,dy)>radius+(charge.cancel?4:14);hud();
}
$('fire').onpointermove=chargePointer;
$('fire').onpointerup=e=>{chargePointer(e);releaseCharge(e.pointerId);};$('fire').onpointercancel=$('fire').onlostpointercapture=e=>{if(charge?.id===e.pointerId)clearInput();hud();};
function controlVector(id,e){const r=ArcViewport.rect($(id),$('app')),p=ArcViewport.point(e.clientX,e.clientY,$('app'));return {dx:p.x-r.left-r.width/2,dy:p.y-r.top-r.height/2};}
function stickMove(e){if(stick?.id!==e.pointerId)return;const {dx,dy}=controlVector('stick',e),mag=Math.hypot(dx,dy),dist=Math.min(mag,27),scale=mag?dist/mag:0;stick.axis=Math.abs(dx)<8?0:E.clamp(dx/27,-1,1);$('stickKnob').style.transform=`translate(${dx*scale}px,${dy*scale}px)`;$('stick').setAttribute('aria-valuenow',Math.round(stick.axis*100));}
$('stick').onpointerdown=e=>{pointer(e);if(!canAim()||stick)return;stick={id:e.pointerId,axis:0};try{$('stick').setPointerCapture(e.pointerId);}catch{}stickMove(e);};$('stick').onpointermove=stickMove;$('stick').onpointerup=$('stick').onpointercancel=$('stick').onlostpointercapture=e=>{if(stick?.id===e.pointerId)resetStick();};
// Both sticks sit on the left; releasing either never releases the right FIRE pointer.
// A small neutral zone and curved response allow fine corrections without extra buttons.
function aimStickMove(e){if(aimStick?.id!==e.pointerId)return;const {dx,dy}=controlVector('aimStick',e),mag=Math.hypot(dx,dy),scale=mag?Math.min(mag,27)/mag:0;aimStick.axis=Math.abs(dy)<=6?0:E.clamp(-Math.sign(dy)*(Math.abs(dy)-6)/21,-1,1);$('aimStickKnob').style.transform=`translate(${dx*scale}px,${dy*scale}px)`;}
$('aimStick').onpointerdown=e=>{pointer(e);if(!canAim()||aimStick||e.button!==0&&e.pointerType!=='touch')return;aimStick={id:e.pointerId,axis:0};gesture=null;try{$('aimStick').setPointerCapture(e.pointerId);}catch{}aimStickMove(e);};
$('aimStick').onpointermove=aimStickMove;$('aimStick').onpointerup=$('aimStick').onpointercancel=$('aimStick').onlostpointercapture=e=>{if(aimStick?.id===e.pointerId)resetAimStick();};
$('world').onpointerdown=e=>{pointer(e);if(demo)return;
 if(s?.selectedSkill==='BLINK'&&canAim()){
  const p=renderer.toWorld(e.clientX,e.clientY),i=s.blink.findIndex(b=>Math.hypot(p.x-b.x,p.y-(b.y-22))<60);
  if(i>=0){if(s.blinkCandidate===i){if(E.blink(s,i)){lastSkill='BLINK';feedback='';}s.blinkCandidate=null;}else{s.blinkCandidate=i;feedback='TAP AGAIN TO BLINK';}}else{s.selectedSkill=null;s.blinkCandidate=null;feedback='';}hud();return;
 }
 if(gesture||charge)return;const p=ArcViewport.point(e.clientX,e.clientY,$('app'));gesture={id:e.pointerId,x:p.x,y:p.y,angle:s?.angle??48,lobby:!s};try{$('world').setPointerCapture(e.pointerId);}catch{}};
$('world').onpointermove=e=>{if(gesture?.id!==e.pointerId||!canAim())return;const p=ArcViewport.point(e.clientX,e.clientY,$('app'));setAngle(gesture.angle+(gesture.y-p.y)*.4);};
$('world').onpointerup=e=>{if(gesture?.id!==e.pointerId)return;const g=gesture,p=ArcViewport.point(e.clientX,e.clientY,$('app'));gesture=null;if(g.lobby&&Math.abs(p.x-g.x)>40)switchMap(p.x<g.x?1:-1);};$('world').onpointercancel=$('world').onlostpointercapture=e=>{if(gesture?.id===e.pointerId)gesture=null;};
for(const id of ['world','stick','aimStick','fire'])$(id).oncontextmenu=e=>e.preventDefault();
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&charge){e.preventDefault();cancelCharge(true);hud();return;}
 if(e.key==='Escape'&&(document.fullscreenElement||document.webkitFullscreenElement))return;
 if(!$('screenHelp').hidden){if(e.key==='Escape')$('closeScreenHelp').click();else if(e.key==='Tab'){e.preventDefault();$('closeScreenHelp').focus();}return;}
 if(hostPaused())return;
 if(!$('lootPicker').hidden){if(e.key==='Escape'){e.preventDefault();return;}if(e.key==='Tab'){const buttons=[...$('lootPicker').querySelectorAll('button:not(:disabled)')],first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}return;}
 if(!$('overlay').hidden&&e.key==='Tab'){const buttons=[...$('overlay').querySelectorAll('button:not(:disabled)')].filter(b=>b.getClientRects().length),first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}return;}
 if(e.key==='Escape'){if(!$('skillPicker').hidden){$('closeSkills').click();return;}if(!$('weaponPicker').hidden){$('closeWeapons').click();return;}if(!$('collectionPanel').hidden){$('closeCollection').click();return;}if(!$('levelPicker').hidden){$('levelPicker').hidden=true;return;}if(demo&&$('overlay').hidden)return;if(!$('overlay').hidden){if(dialog==='chapter')$('returnLobby').click();else if(dialog==='result')lobby();else if(dialog==='confirm'||dialog==='retry')pause();else $('resume').click();}else pause();return;}
 if(demo)return;if(e.target?.matches?.('input,select,button')&&e.target.id!=='fire')return;if(!canAim())return;
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))e.preventDefault();if(e.key===' '&&!e.repeat)startCharge('keyboard');if(e.key==='ArrowLeft')keyMove=-1;if(e.key==='ArrowRight')keyMove=1;if(e.key==='ArrowUp')s.angle=E.clamp(s.angle+1,minimumAngle(),85);if(e.key==='ArrowDown')s.angle=E.clamp(s.angle-1,minimumAngle(),85);if(e.target?.id==='aimStick'&&['Home','End'].includes(e.key)){e.preventDefault();s.angle=e.key==='Home'?minimumAngle():85;}hud();
});
document.addEventListener('keyup',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key))keyMove=0;if(e.key===' '){if(!e.target?.matches?.('input,select,button')||e.target.id==='fire'||charge?.id==='keyboard')e.preventDefault();releaseCharge('keyboard');}});
// Safari can retain an existing page zoom. Keep the whole game inside its visible viewport.
const viewport=ArcViewport.install($('app'),()=>{clearInput();previous=0;draw();});
window.addEventListener('blur',clearInput);window.addEventListener('resize',()=>{clearInput();previous=0;viewport.fit();draw();});
document.addEventListener('visibilitychange',()=>document.hidden?pauseHost('visibility'):resumeHost('visibility'));
if(sdk){sdk.system.onPause(()=>pauseHost('sdk'));sdk.system.onResume(()=>resumeHost('sdk'));sdk.system.onAudioEnabledChange(v=>{hostAudio=v;audioSync();});}
function fitOrientation(){
 const v=viewport.state,phone=matchMedia('(pointer: coarse)').matches&&Math.min(v.width,v.height)<600,blocked=phone&&v.width<v.height;
 $('rotationGate').hidden=!blocked;
 if(blocked&&!pauseSources.has('orientation'))pauseHost('orientation');
 else if(!blocked&&pauseSources.has('orientation'))resumeHost('orientation');
}
window.addEventListener('arcline-fullscreen',()=>{clearInput();previous=0;viewport.fit();fitOrientation();draw();});
window.addEventListener('resize',fitOrientation);window.visualViewport?.addEventListener('resize',fitOrientation);
window.addEventListener('arcline-language',()=>{clearInput();if(s)hud();else syncLobby();draw();});
ArcI18n.install();fitOrientation();
// firstFrameReady is sent after a real frame; saveData is gated by successful loadData.
syncLobby();$('loading').hidden=true;$('app').hidden=false;draw();sdk?.game.firstFrameReady();$('play').disabled=true;
save.load().then(()=>{selectedMap=save.data.chapterRun?save.data.chapterRun.stage-1:Math.min(99,save.data.cleared);syncLobby();$('play').disabled=false;$('difficultyChoice').disabled=false;sdk?.game.gameReady();});schedule();
