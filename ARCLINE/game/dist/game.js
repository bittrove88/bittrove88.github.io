'use strict';
const E=ArcEngine,G=E.geometry,$=id=>document.getElementById(id),sdk=globalThis.ytgame,inYT=!!sdk?.IN_PLAYABLES_ENV;
const renderer=ArcRender.create($('world')),pauseSources=new Set();
let selectedMap=0,s=null,preview=E.campaign(1),manualPaused=false,raf=0,previous=0,clock=0,shot=null,flight=0,tail=null,impact=null,charge=null,stick=null,aimStick=null,gesture=null,keyMove=0,dialog='pause',feedback='',cpuJob=null,cpuReady=null,gameToken=0,demo=null,lastDemoId='controls',worker=null,jobId=0,previewPress=null,resizeFrame=0,transition=null,pickupEffects=[];
let audio=null,master=null,chargeTone=null,userInteracted=false,hostAudio=inYT?sdk.system.isAudioEnabled():true;
let encounter=null,ending=null,reward=null,lastSkill=null;
const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const platformStatus={cpuJobs:[],workerSupported:typeof Worker!=='undefined',sdk:inYT,errors:[]};
const save=ArcSave.create({
 load:()=>inYT?Promise.race([sdk.game.loadData(),new Promise((_,reject)=>setTimeout(()=>reject(Error('timeout')),4000))]):localStorage.getItem(ArcSave.key),
 backup:raw=>{if(!inYT)localStorage.setItem(ArcSave.key+'-backup',raw);},
 save:raw=>inYT?sdk.game.saveData(raw):localStorage.setItem(ArcSave.key,raw)
},state=>{$('saveStatus').dataset.error=['load-failed','save-failed'].includes(state);$('saveStatus').textContent=state==='saved'?(inYT?'Progress synced':'Progress saved on this device'):state==='load-failed'?'Progress unavailable · Session play':'Progress not saved · Retry on resume';});
const hostPaused=()=>pauseSources.size>0;
function minimumAngle(){return s?ArcWeapons.get(s.mode).minAngle||-12:-12;}
function canAim(){return !!s&&s.phase==='aim'&&!hostPaused()&&!manualPaused&&!encounter&&!demo&&$('weaponPicker').hidden;}
function audioSync(){if(!audio)return;const on=userInteracted&&hostAudio&&!hostPaused()&&!manualPaused;master.gain.value=on?.5:0;(on?audio.resume():audio.suspend()).catch(()=>{});}
function unlockAudio(){userInteracted=true;if(!audio)try{audio=new(window.AudioContext||window.webkitAudioContext)();master=audio.createGain();master.connect(audio.destination);}catch{}audioSync();}
function tone(freq=440,duration=.12,type='sine',volume=.08){if(!audio||!hostAudio||hostPaused()||manualPaused)return;const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(40,freq*.5),audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g).connect(master);o.start();o.stop(audio.currentTime+duration);}
function stopChargeTone(){if(chargeTone){try{chargeTone.stop();}catch{}chargeTone=null;}}
function resetStick(){stick=null;keyMove=0;$('stickKnob').style.transform='translate(0px,0px)';$('stick').setAttribute('aria-valuenow',0);}
function resetAimStick(){aimStick=null;$('aimStickKnob').style.transform='translate(0px,0px)';}
function cancelCharge(){if(charge&&s)s.power=charge.previous;charge=null;stopChargeTone();}
function clearInput(){gesture=null;resetStick();resetAimStick();cancelCharge();clearTimeout(previewPress);previewPress=null;}
function acquired(item){
 pickupEffects.push({x:item.x,y:item.y,id:item.id,age:0});
 const data=save.data;
 if(item.id[0]==='W'&&!data.unlockedWeaponIds.includes(item.id)){data.unlockedWeaponIds.push(item.id);s.trial={id:item.id,ammo:1};reward={id:item.id,kind:'weapon',age:0};feedback='';}
 if(['S','B'].includes(item.id[0])&&!data.collectedCosmeticIds.includes(item.id)){data.collectedCosmeticIds.push(item.id);reward={id:item.id,kind:'cosmetic',age:0};feedback='';}
 if(item.id[0]==='R')feedback=item.skill+' +'+(item.taken||1);
 save.save();tone(item.id[0]==='W'?850:1046,.25,'sine');
}
function syncLobby(){
 preview=E.campaign(selectedMap+1,save.data);const spec=preview.spec;
 $('arenaTitle').textContent=spec.name;$('arenaTag').textContent=E.biomes[spec.theme].name;
 $('stageCaption').textContent=`LEVEL ${spec.id} · ${spec.boss?'BOSS · ':''}${Object.entries(spec.skills).map(([k,n])=>k+' ×'+n).join(' / ')||'STANDARD ONLY'}`;
 $('progressText').textContent=`${save.data.cleared} / 100 CLEARED`;$('play').innerHTML=`PLAY LEVEL ${spec.id} <span aria-hidden="true">→</span>`;
 $('collectionCount').textContent=`${save.data.unlockedWeaponIds.length}/20 · ${save.data.collectedCosmeticIds.length}/37`;
 $('prevMap').disabled=selectedMap===0;$('nextMap').disabled=selectedMap>=Math.min(99,save.data.cleared);
 $('weaponLoadout').innerHTML=save.data.unlockedWeaponIds.map(id=>`<option value="${id}">${ArcWeapons.get(id).name}</option>`).join('');$('weaponLoadout').value=save.data.equippedWeaponId;
 $('cosmeticLoadout').innerHTML='<option value="">Original</option>'+save.data.collectedCosmeticIds.map(id=>`<option value="${id}">${id} · ${id[0]==='B'?'Boss armor':'Collection'}</option>`).join('');$('cosmeticLoadout').value=save.data.equippedCosmeticId||'';
 ArcPresentation.syncLobby(save.data,selectedMap);
}
function switchMap(delta){if(s||hostPaused())return;selectedMap=E.clamp(selectedMap+delta,0,Math.min(99,save.data.cleared));syncLobby();tone(440,.08);}
function showLevels(){
 if(hostPaused())return;
 ArcPresentation.renderJourney(save.data,selectedMap,i=>{selectedMap=i;$('levelPicker').hidden=true;syncLobby();});$('levelPicker').hidden=false;$('closeLevels').focus();
}
const icons={BURST:'◉',BLINK:'◇',PUSH:'→',BOUNCE:'⌁',PULL:'←',SPLIT:'⋔',PHASE:'⇥',SWAP:'⇄'};
function buildSkills(){
 $('skills').innerHTML=Object.keys(s.skills).map(id=>`<button type="button" class="skill" data-skill="${id}" aria-label="${id}, hold for preview"><b class="skill-icon" aria-hidden="true">${icons[id]}</b><span class="skill-name">${id}</span><small class="skill-count">×${s.skills[id]}</small><span class="skill-state"></span></button>`).join('');
 document.querySelectorAll('[data-skill]').forEach(b=>{
  b.onpointerdown=e=>{e.stopPropagation();delete b.dataset.long;if(!canAim()||b.disabled)return;
   if(e.pointerType==='touch'&&(stick||aimStick||charge)){e.preventDefault();b.click();return;}
   previewPress=setTimeout(()=>{previewPress=null;if(runDemo(b.dataset.skill))b.dataset.long='1';},450);
  };
  b.onpointerup=()=>{clearTimeout(previewPress);previewPress=null;};b.onpointercancel=b.onpointerleave=b.onpointerup;
  b.onclick=()=>{if(b.dataset.long){delete b.dataset.long;return;}if(!canAim())return;clearInput();
   const id=b.dataset.skill,ok=E.selectSkill(s,id);feedback=ok?'':s.skillUsed?'NEXT TURN':'EMPTY';tone(560,.08);hud();
   if(ok&&s.selectedSkill===id&&!hasSeen(id)&&ArcLessons.forSkill(s,id,save.data))runDemo(id,true);
  };
 });
}
function battleWeaponChoices(){
 const choices=E.availableWeapons(s).map(c=>({...c,equipped:c.id===s.weaponId}));
 if(s.weaponId!=='W01'&&!choices.some(c=>c.id===s.weaponId))choices.push({id:s.weaponId,ammo:0,trial:false,equipped:true,disabled:true});
 if(s.trial?.id&&s.trial.id!=='W01'&&!choices.some(c=>c.id===s.trial.id))choices.push({id:s.trial.id,ammo:0,trial:true,equipped:false,disabled:true});
 return choices;
}
function hud(){
 if(!s)return;const shown=activePreview(),displayState=shown?(shown.effectProgress>=.5?shown.after:shown.before)||shown.state:s,[p,e]=displayState.units,enabled=canAim();
 $('php').textContent=Number(p.hp.toFixed(2));$('ehp').textContent=Number(e.hp.toFixed(2));$('pbar').style.width=p.hp/5*100+'%';$('ebar').style.width=e.hp/e.maxHp*100+'%';$('pbar').parentElement.style.setProperty('--segments',20);$('ebar').parentElement.style.setProperty('--segments',100/e.maxHp);
 $('ename').textContent=s.spec.boss?s.spec.name:'RIVAL';$('round').textContent='LV '+s.stage;
 $('turnLabel').textContent=demo?'':encounter?'BOSS':s.phase==='over'?'COMPLETE':s.turn?'RIVAL':'YOUR TURN';
 const left=s.shotLimit-s.shotCount;$('shotBudget').textContent=left===1?'LAST SHOT':left+' SHOTS';$('shotBudget').classList.toggle('low',left<=3);$('shotBudget').classList.toggle('last',left===1);
 const held=shown?.id==='controls'&&shown.phase==='WATCH';
 const displayPower=shown?.displayPower??shown?.pose?.power??s.power;
 $('powerNumber').textContent=Math.round(displayPower)+'%';$('powerFill').style.width=displayPower+'%';$('powerHUD').classList.toggle('active',!!charge);
 const aimState=shown?.state||s,aimAngle=shown?.pose?.angle??s.angle;
 $('angleText').textContent=Math.round(G.muzzle(aimState,0,aimAngle).worldAngle)+'°';$('aimRange').value=s.angle;$('aimRange').min=minimumAngle();for(const id of ['aimRange','aimUp','aimDown'])$(id).disabled=!enabled;$('fire').disabled=!enabled||s.selectedSkill==='BLINK';$('fire').classList.toggle('charging',!!charge||held);$('fire').classList.toggle('canceling',!!charge?.cancel);$('chargeValue').textContent=charge?.cancel?'CANCEL':s.selectedSkill==='BLINK'?'CHOOSE SPOT':'FIRE';$('fire').setAttribute('aria-label',s.selectedSkill==='BLINK'?'Choose a landing spot on the battlefield':'Hold to charge; release to fire');$('chargeRing').style.strokeDashoffset=345.58*(1-((charge||held)?(displayPower-20)/80:0));
 $('shotFeedback').textContent=feedback||(!demo&&s.selectedSkill==='BLINK'?'Tap a landing spot, then tap again.':'');
 const mode=shown?.pose?.mode||s.mode,weapon=ArcWeapons.get(mode),look=weapon.appearance,entry=E.availableWeapons(s).find(w=>w.id===mode),ammo=entry?.ammo||0;
 $('weaponGlyph').textContent=look.glyph;$('weaponName').textContent=weapon.name;
 $('weaponStock').textContent=mode==='W01'?'Unlimited':(entry?.trial&&mode!==s.weaponId?'Trial · ':'')+ammo+(ammo===1?' shot':' shots');
 $('weaponState').textContent='WEAPON';$('weaponToggle').style.borderColor=look.color;$('weaponToggle').style.color=look.color;
 $('weaponToggle').setAttribute('aria-label',weapon.name+', '+$('weaponStock').textContent+', choose weapon');$('weaponToggle').classList.toggle('special',mode!=='W01');$('weaponToggle').classList.toggle('new',!!s.trial?.ammo&&s.mode!==s.trial.id);$('weaponToggle').disabled=!enabled;$('weaponToggle').dataset.switchable=String(battleWeaponChoices().length>1);
 for(const b of document.querySelectorAll('[data-skill]')){
  const id=b.dataset.skill,count=demo?(displayState.skills[id]??s.skills[id]):s.skills[id],used=!demo&&s.skillUsed,selected=demo?shown.pose?.selectedSkill===id:!used&&s.selectedSkill===id;
  b.querySelector('.skill-count').textContent='×'+count;b.querySelector('.skill-state').textContent=selected?'Selected':used?(lastSkill===id?'Used':'Next turn'):count<=0?'Empty':'';
  b.disabled=!enabled||used||count<=0;b.classList.toggle('spent',used||count<=0);b.setAttribute('aria-disabled',b.disabled);b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',selected);b.setAttribute('aria-label',id+', '+count+' uses'+(selected?', selected':used?', used this turn':count<=0?', empty':''));
 }
 if(shown){
  $('tutorialContext').textContent=/WEAPON/.test(shown.context)?'WEAPON PREVIEW':/SKILL/.test(shown.context)?'SKILL PREVIEW':/BOSS/.test(shown.context)?'BOSS PREVIEW':/CONTROL/.test(shown.context)?'CONTROL PREVIEW':shown.source==='vignette'?'PRACTICE PREVIEW':'LEVEL PREVIEW';$('tutorialStep').textContent=shown.step;$('tutorialInstruction').textContent=shown.instruction;$('tutorialOutcome').textContent=shown.outcome;
  $('tutorialInstruction').hidden=shown.phase==='RESULT';$('tutorialOutcome').hidden=shown.phase!=='RESULT';
  $('previewPowerFill').style.width=displayPower+'%';$('previewPowerNumber').textContent=Math.round(displayPower)+'%';$('previewAction').textContent=shown.controlAction||shown.step;
 }
 for(const id of ['stick','aimStick']){$(id).setAttribute('aria-disabled',!enabled);$(id).style.opacity=enabled?'1':'.4';}
 $('aimStick').setAttribute('aria-valuemin',minimumAngle());$('aimStick').setAttribute('aria-valuenow',Math.round(s.angle));$('aimStick').setAttribute('aria-valuetext',Math.round(s.angle)+' degrees');
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
function start(){
 if(hostPaused()||!save.ready&&$('play').disabled)return;unlockAudio();gameToken++;cpuJob=null;cpuReady=null;
 clearInput();s=E.campaign(selectedMap+1,save.data);s.power=20;transition=null;shot=null;tail=null;impact=null;demo=null;ending=null;reward=null;lastSkill=null;pickupEffects=[];feedback='';manualPaused=false;delete $('battle').dataset.preview;delete $('battle').dataset.lesson;buildSkills();
 encounter=s.spec.boss?{age:0,duration:1.1,name:s.spec.name,boss:true}:null;
 $('encounterBanner').hidden=!encounter;$('encounterName').textContent=s.spec.name;
 $('lobby').hidden=true;$('battle').hidden=false;$('battle').classList.remove('resolved');$('overlay').hidden=true;$('levelPicker').hidden=true;$('collectionPanel').hidden=true;$('weaponPicker').hidden=true;$('tutorial').hidden=true;audioSync();hud();if(!encounter)firstDemo();if(!demo)$('world').focus({preventScroll:true});tone(s.spec.boss?130:520,s.spec.boss?.4:.15,'triangle');
}
function startCharge(id){
 if(!canAim()||charge||s.selectedSkill==='BLINK')return;
 unlockAudio();gesture=null;charge={id,elapsed:0,previous:s.power,cancel:false,cameraLock:{...renderer.view}};s.power=20;
 if(audio&&hostAudio){chargeTone=audio.createOscillator();const g=audio.createGain();g.gain.value=.025;chargeTone.type='triangle';chargeTone.frequency.value=150;chargeTone.connect(g).connect(master);chargeTone.start();}hud();
}
function releaseCharge(id){
 if(!charge||charge.id!==id)return;const valid=canAim()&&s.selectedSkill!=='BLINK'&&!charge.cancel,power=s.power,previousPower=charge.previous;charge=null;stopChargeTone();if(valid){s.power=power;launch();}else{s.power=previousPower;hud();}
}
function launch(plan=null){
 if(hostPaused()||manualPaused||demo)return;clearInput();shot=E.launch(s,s.angle,s.power,plan);
 if(!shot)return;if(!shot.side&&shot.skill)lastSkill=shot.skill;s.units[shot.side].recoil={age:0};flight=0;tail=null;impact=null;feedback='';const voice=ArcWeapons.get(shot.weaponId);tone(voice.needle||voice.gravity<.5?540:voice.twin?260:voice.damage>1.1?85:155,voice.damage>1.1?.32:.19,voice.needle?'sine':'sawtooth');hud();
}
function finishResult(){
 clearInput();dialog='result';const final=s.result==='win'&&s.stage===100;
 ending=ending||{age:0,winner:s.result==='win'?0:s.result==='lose'?1:-1,final};
 $('overlay').dataset.kind=final?'final':s.result==='win'?'win':'lose';$('resultIcon').textContent=s.result==='win'?'✦':s.result==='draw'?'◇':'↗';$('modalEyebrow').textContent=`LEVEL ${s.stage} · ${s.result==='win'?'CLEARED':s.reason==='shots'?'OUT OF SHOTS':s.reason==='durability'?'ROVER DISABLED':'DRAW'}`;
 if(s.result==='win'){save.data.cleared=Math.max(save.data.cleared,s.stage);save.save();}
 $('modalTitle').textContent=final?'Every arc led here.':s.result==='win'?'Cleared.':s.reason==='shots'?'Out of shots.':s.result==='draw'?'A draw.':'Rover disabled.';
 $('modalDetail').textContent=final?`${save.data.unlockedWeaponIds.length} weapons · ${save.data.collectedCosmeticIds.length} finishes`:s.result==='win'?`${s.shotCount} shots`:s.pickups.some(p=>p.collected)?'Collected items saved.':'';
 $('resume').textContent=final?'JOURNEY':s.result==='win'?'NEXT LEVEL':'TRY AGAIN';$('returnLobby').textContent=final?'COLLECTION':'JOURNEY';$('resultJourney').hidden=true;
 $('endingCollection').hidden=!final;$('endingCollection').textContent=final?save.data.unlockedWeaponIds.map(id=>ArcWeapons.get(id).appearance.glyph).join('　'):'';
 $('battle').classList.add('resolved');$('overlay').hidden=false;$('resume').focus();tone(s.result==='win'?660:220,.4,'triangle');
}
function advanceTurn(){
 const beforeWorld=s.world,beforeUnits=s.units.map(u=>({...u}));E.next(s);if(s.phase==='transition')transition={world:beforeWorld,units:beforeUnits,age:0,duration:.6};if(s.phase==='over'){finishResult();return;}
 if(s.turn){s.time=0;if(!cpuJob&&!cpuReady)requestCPU();}else{shot=null;}
 hud();
}
function requestCPU(){
 const token=gameToken,id=++jobId,state={...s,random:undefined};cpuJob={id,token};cpuReady=null;
 if(worker){worker.postMessage({id,state,seed:s.stage*1000+s.round});return;}
 setTimeout(()=>{if(cpuJob?.id!==id||gameToken!==token)return;const start=performance.now(),target=E.enemyMoveTarget(s),u={...s.units[1]};G.move(s,1,target-s.units[1].x);const plan=E.cpuPlan(s,E.seeded(s.stage*1000+s.round));Object.assign(s.units[1],u);cpuReady={target,plan};platformStatus.cpuJobs.push({worker:false,elapsed:performance.now()-start});},0);
}
if(typeof Worker!=='undefined')try{worker=new Worker('cpu-worker.js?v=0.6.2');worker.onmessage=event=>{const r=event.data;if(!cpuJob||r.id!==cpuJob.id||cpuJob.token!==gameToken)return;if(r.error){platformStatus.errors.push(r.error);worker.terminate();worker=null;requestCPU();return;}cpuReady=r;platformStatus.cpuJobs.push({worker:true,elapsed:r.elapsed});};worker.onerror=e=>{platformStatus.errors.push(e.message);worker.terminate();worker=null;if(s&&(s.turn||cpuJob))requestCPU();};}catch(e){platformStatus.errors.push(String(e));}
function update(dt,realDt=dt){
 clock+=dt;if(!s||manualPaused||hostPaused())return;
 if(encounter){encounter.age+=dt;if(encounter.age>=encounter.duration){encounter=null;$('encounterBanner').hidden=true;firstDemo();}hud();return;}
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
   if(!last.events.some(e=>e.type==='pickup'))feedback='';tone(last.damage[1-s.turn]>0?110:75,.3,'triangle',.15);
   if(s.phase==='over'){ending={age:0,winner:s.result==='win'?0:s.result==='lose'?1:-1,final:s.stage===100&&s.result==='win'};s.phase='finish';}else{s.phase='impact';if(s.turn===0)requestCPU();}s.time=1.4;
  }
 }else if(s.phase==='impact'||s.phase==='finish'){
  s.time-=dt;if(tail)tail.age+=dt;
  if(s.phase==='impact'&&s.turn===1&&s.time<=.6){advanceTurn();}
  else if(s.time<=0){tail=null;if(s.phase==='finish'){s.phase='over';finishResult();}else advanceTurn();}
 }else if(s.phase==='transition'){
  s.time-=dt;if(tail)tail.age+=dt;if(transition)transition.age+=dt;if(s.time<=0){transition=null;s.phase='aim';s.power=20;feedback='';shot=null;tail=null;hud();}
 }
 for(const p of pickupEffects)p.age+=dt;pickupEffects=pickupEffects.filter(p=>p.age<.8);
 for(const u of s.units)if(u.animation){u.animation.age+=dt;if(u.animation.age>=u.animation.duration)delete u.animation;}
 for(const u of s.units){if(u.recoil&&(u.recoil.age+=dt)>.22)delete u.recoil;if(u.reaction&&(u.reaction.age+=dt)>.7)delete u.reaction;}
 if(reward){reward.age+=dt;if(reward.age>3)reward=null;}
 if(ending)ending.age+=dt;
 if(impact){impact.age+=dt;if(impact.age>1)impact=null;}hud();
}
function draw(){renderer.draw(s||preview,{time:clock,lobby:!s,canAim:canAim(),cosmetic:save.data.equippedCosmeticId,shot,flight,tail,impact,demo:activePreview(),reducedMotion,transition,pickupEffects,charging:!!charge,cameraLock:charge?.cameraLock,encounter,ending,collection:{weapons:save.data.unlockedWeaponIds,cosmetics:save.data.collectedCosmeticIds}});}
function schedule(){if(!hostPaused()&&!raf)raf=requestAnimationFrame(loop);}
function loop(t){raf=0;if(hostPaused())return;const realDt=previous?Math.max(0,(t-previous)/1000):0;previous=t;if(!manualPaused){update(Math.min(realDt,.05),realDt);draw();}schedule();}
function pauseHost(source='sdk'){pauseSources.add(source);clearInput();$('app').inert=true;cancelAnimationFrame(raf);raf=0;previous=0;audioSync();}
function resumeHost(source='sdk'){pauseSources.delete(source);if(hostPaused())return;$('app').inert=false;previous=0;audioSync();schedule();if(save.dirty)save.save();}
function pause(){if(!s||s.result||hostPaused())return;clearInput();manualPaused=true;dialog='pause';$('overlay').dataset.kind='pause';$('resultIcon').textContent='Ⅱ';$('modalEyebrow').textContent='DUEL PAUSED';$('modalTitle').textContent='Take a breath.';$('modalDetail').textContent='';$('resume').textContent='RESUME';$('returnLobby').textContent='EQUIPMENT';$('resultJourney').hidden=true;$('endingCollection').hidden=true;$('overlay').hidden=false;audioSync();$('resume').focus();}
function lobby(){clearInput();gameToken++;s=null;shot=null;tail=null;impact=null;demo=null;encounter=null;ending=null;reward=null;transition=null;pickupEffects=[];cpuReady=null;cpuJob=null;manualPaused=false;$('encounterBanner').hidden=true;$('tutorial').hidden=true;$('rewardNotice').hidden=true;$('weaponPicker').hidden=true;$('lobby').hidden=false;$('battle').hidden=true;$('overlay').hidden=true;selectedMap=Math.min(selectedMap,Math.min(99,save.data.cleared));syncLobby();audioSync();save.save();}
$('play').onclick=start;$('prevMap').onclick=()=>switchMap(-1);$('nextMap').onclick=()=>switchMap(1);$('chooseLevel').onclick=showLevels;$('closeLevels').onclick=()=>{$('levelPicker').hidden=true;$('chooseLevel').focus();};
$('weaponLoadout').onchange=e=>{unlockAudio();save.data.equippedWeaponId=e.target.value;save.save();syncLobby();};$('cosmeticLoadout').onchange=e=>{unlockAudio();save.data.equippedCosmeticId=e.target.value||null;save.save();syncLobby();};
$('openCollection').onclick=()=>{if(hostPaused())return;ArcPresentation.showCollection(save.data,change=>{if('weaponId' in change)save.data.equippedWeaponId=change.weaponId;if('cosmeticId' in change)save.data.equippedCosmeticId=change.cosmeticId;save.save();syncLobby();});};
$('closeCollection').onclick=()=>{ArcPresentation.closeCollection();$('openCollection').focus();};
$('pause').onclick=pause;$('resume').onclick=()=>{if(hostPaused())return;if(dialog==='result'){if(s.result==='win'&&s.stage===100){lobby();showLevels();return;}selectedMap=s.result==='win'?Math.min(99,s.stage):s.stage-1;start();}else{manualPaused=false;previous=0;$('overlay').hidden=true;audioSync();hud();$('world').focus({preventScroll:true});}};
$('returnLobby').onclick=()=>{if(dialog==='result'){const final=s.result==='win'&&s.stage===100;lobby();if(final)$('openCollection').click();else showLevels();return;}if(dialog==='confirm'){lobby();return;}dialog='confirm';$('overlay').dataset.kind='confirm';$('modalTitle').textContent='Leave this duel?';$('modalDetail').textContent='Collected items saved.';$('returnLobby').textContent='LEAVE';};
$('resultJourney').onclick=()=>{lobby();showLevels();};
$('weaponToggle').onclick=()=>{if(!canAim())return;const choices=battleWeaponChoices();clearInput();ArcPresentation.showWeapons(choices,s.mode,id=>{if(E.selectWeapon(s,id)){s.angle=Math.max(minimumAngle(),s.angle);tone(620,.08);hud();if(!hasSeen(id)&&ArcLessons.forWeapon(s,id,save.data))runDemo(id,true);}});};
// Secondary touch contacts do not receive native compatibility clicks on every browser.
$('weaponToggle').onpointerdown=e=>{if(e.pointerType==='touch'&&(stick||aimStick||charge)&&canAim()){e.preventDefault();$('weaponToggle').click();}};
$('closeWeapons').onclick=()=>ArcPresentation.closeWeapons();
$('previewOK').onclick=()=>{unlockAudio();endDemo();};


$('environment').onpointerdown=()=>{if(canAim())previewPress=setTimeout(()=>{const kind=s.spec.features.find(f=>'WBCKUFVM'.includes(f.type))?.type;if(kind)runDemo(kind);},450);};$('environment').onpointerup=$('environment').onpointercancel=()=>clearTimeout(previewPress);
function setAngle(angle){if(!canAim())return;s.angle=E.clamp(angle,minimumAngle(),85);hud();}
$('aimRange').oninput=e=>setAngle(Number(e.target.value));$('aimUp').onclick=()=>setAngle(s.angle+3);$('aimDown').onclick=()=>setAngle(s.angle-3);
function pointer(e){e.preventDefault();unlockAudio();}
$('fire').onpointerdown=e=>{pointer(e);if(e.button!==0&&e.pointerType!=='touch')return;startCharge(e.pointerId);try{$('fire').setPointerCapture(e.pointerId);}catch{}};
$('fire').onpointermove=e=>{if(charge?.id!==e.pointerId)return;const r=$('fire').getBoundingClientRect();charge.cancel=Math.hypot(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2)>r.width*.9;hud();};
$('fire').onpointerup=e=>releaseCharge(e.pointerId);$('fire').onpointercancel=$('fire').onlostpointercapture=e=>{if(charge?.id===e.pointerId)cancelCharge();hud();};
function controlVector(id,e){const r=ArcViewport.rect($(id),$('app')),p=ArcViewport.point(e.clientX,e.clientY,$('app'));return {dx:p.x-r.left-r.width/2,dy:p.y-r.top-r.height/2};}
function stickMove(e){if(stick?.id!==e.pointerId)return;const {dx,dy}=controlVector('stick',e),mag=Math.hypot(dx,dy),dist=Math.min(mag,27),scale=mag?dist/mag:0;stick.axis=Math.abs(dx)<8?0:E.clamp(dx/27,-1,1);$('stickKnob').style.transform=`translate(${dx*scale}px,${dy*scale}px)`;$('stick').setAttribute('aria-valuenow',Math.round(stick.axis*100));}
$('stick').onpointerdown=e=>{pointer(e);if(!canAim()||stick)return;stick={id:e.pointerId,axis:0};try{$('stick').setPointerCapture(e.pointerId);}catch{}stickMove(e);};$('stick').onpointermove=stickMove;$('stick').onpointerup=$('stick').onpointercancel=$('stick').onlostpointercapture=e=>{if(stick?.id===e.pointerId)resetStick();};
// The right stick changes angle continuously, just as the left stick moves continuously.
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
 if(hostPaused())return;if(e.key==='Escape'){if(!$('weaponPicker').hidden){$('closeWeapons').click();return;}if(!$('collectionPanel').hidden){$('closeCollection').click();return;}if(!$('levelPicker').hidden){$('levelPicker').hidden=true;return;}if(demo)return;if(!$('overlay').hidden){if(dialog==='result')lobby();else $('resume').click();}else pause();return;}
 if(demo)return;if(e.target?.matches?.('input,select,button')&&e.target.id!=='fire')return;if(!canAim())return;
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))e.preventDefault();if(e.key===' '&&!e.repeat)startCharge('keyboard');if(e.key==='ArrowLeft')keyMove=-1;if(e.key==='ArrowRight')keyMove=1;if(e.key==='ArrowUp')s.angle=E.clamp(s.angle+1,minimumAngle(),85);if(e.key==='ArrowDown')s.angle=E.clamp(s.angle-1,minimumAngle(),85);if(e.target?.id==='aimStick'&&['Home','End'].includes(e.key)){e.preventDefault();s.angle=e.key==='Home'?minimumAngle():85;}hud();
});
document.addEventListener('keyup',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key))keyMove=0;if(e.key===' '){e.preventDefault();releaseCharge('keyboard');}});
// Safari can retain an existing page zoom. Keep the whole game inside its visible viewport.
const viewport=ArcViewport.install($('app'),()=>{clearInput();previous=0;draw();});
window.addEventListener('blur',clearInput);window.addEventListener('resize',()=>{clearInput();previous=0;viewport.fit();draw();});
document.addEventListener('visibilitychange',()=>document.hidden?pauseHost('visibility'):resumeHost('visibility'));
if(sdk){sdk.system.onPause(()=>pauseHost('sdk'));sdk.system.onResume(()=>resumeHost('sdk'));sdk.system.onAudioEnabledChange(v=>{hostAudio=v;audioSync();});}
// firstFrameReady is sent after a real frame; saveData is gated by successful loadData.
syncLobby();$('loading').hidden=true;$('app').hidden=false;draw();sdk?.game.firstFrameReady();$('play').disabled=true;
save.load().then(()=>{selectedMap=Math.min(99,save.data.cleared);syncLobby();$('play').disabled=false;sdk?.game.gameReady();});schedule();
