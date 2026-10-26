'use strict';
const E=ArcEngine,G=E.geometry,$=id=>document.getElementById(id),sdk=globalThis.ytgame,inYT=!!sdk?.IN_PLAYABLES_ENV;
const renderer=ArcRender.create($('world')),pauseSources=new Set();
let selectedMap=0,s=null,preview=E.campaign(1),manualPaused=false,raf=0,previous=0,clock=0,shot=null,flight=0,tail=null,impact=null,charge=null,stick=null,gesture=null,keyMove=0,dialog='pause',feedback='',cpuJob=null,cpuReady=null,gameToken=0,demo=null,lastDemoId='controls',worker=null,jobId=0,previewPress=null,resizeFrame=0,transition=null,pickupEffects=[];
let audio=null,master=null,chargeTone=null,userInteracted=false,hostAudio=inYT?sdk.system.isAudioEnabled():true;
const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const platformStatus={cpuJobs:[],workerSupported:typeof Worker!=='undefined',sdk:inYT,errors:[]};
const save=ArcSave.create({
 load:()=>inYT?Promise.race([sdk.game.loadData(),new Promise((_,reject)=>setTimeout(()=>reject(Error('timeout')),4000))]):localStorage.getItem(ArcSave.key),
 backup:raw=>{if(!inYT)localStorage.setItem(ArcSave.key+'-backup',raw);},
 save:raw=>inYT?sdk.game.saveData(raw):localStorage.setItem(ArcSave.key,raw)
},state=>{$('saveStatus').textContent=state==='saved'?(inYT?'Progress synced':'Progress saved on this device'):state==='load-failed'?'Progress unavailable · Session play':'Progress not saved · Retry on resume';});
const hostPaused=()=>pauseSources.size>0;
function minimumAngle(){return s?ArcWeapons.get(s.mode).minAngle||-12:-12;}
function canAim(){return !!s&&s.phase==='aim'&&!hostPaused()&&!manualPaused&&!demo;}
function audioSync(){if(!audio)return;const on=userInteracted&&hostAudio&&!hostPaused()&&!manualPaused;master.gain.value=on?.5:0;(on?audio.resume():audio.suspend()).catch(()=>{});}
function unlockAudio(){userInteracted=true;if(!audio)try{audio=new(window.AudioContext||window.webkitAudioContext)();master=audio.createGain();master.connect(audio.destination);}catch{}audioSync();}
function tone(freq=440,duration=.12,type='sine',volume=.08){if(!audio||!hostAudio||hostPaused()||manualPaused)return;const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(40,freq*.5),audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g).connect(master);o.start();o.stop(audio.currentTime+duration);}
function stopChargeTone(){if(chargeTone){try{chargeTone.stop();}catch{}chargeTone=null;}}
function resetStick(){stick=null;keyMove=0;$('stickKnob').style.transform='translate(0px,0px)';$('stick').setAttribute('aria-valuenow',0);}
function cancelCharge(){if(charge&&s)s.power=charge.previous;charge=null;stopChargeTone();}
function clearInput(){gesture=null;resetStick();cancelCharge();clearTimeout(previewPress);previewPress=null;}
function acquired(item){
 pickupEffects.push({x:item.x,y:item.y,id:item.id,age:0});
 const data=save.data;
 if(item.id[0]==='W'&&!data.unlockedWeaponIds.includes(item.id)){data.unlockedWeaponIds.push(item.id);s.trial={id:item.id,ammo:1};feedback='NEW WEAPON · TAP TO TRY';s.pendingWeaponDemo=item.id;}
 if(['S','B'].includes(item.id[0])&&!data.collectedCosmeticIds.includes(item.id)){data.collectedCosmeticIds.push(item.id);feedback='APPEARANCE COLLECTED';}
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
}
function switchMap(delta){if(s||hostPaused())return;selectedMap=E.clamp(selectedMap+delta,0,Math.min(99,save.data.cleared));syncLobby();tone(440,.08);}
function miniature(spec){
 let svg=spec.floors.map(f=>`<polyline points="${f.map(([x,h])=>x+','+(52-h)).join(' ')}" fill="none" stroke="#d3edb7" stroke-width="1.7"/>`).join('');
 svg+=spec.features.filter(f=>'BRKS'.includes(f.type)).map(f=>{const v=f.v;if(f.type==='K')return `<circle cx="${v[0]}" cy="${52-v[1]}" r="3" fill="#abfff2"/>`;return `<path d="M${v[0]},${52-v[1]} l${f.type==='B'?v[2]:10},-3" stroke="#d4bfe4" stroke-width="2"/>`;}).join('');return `<svg viewBox="0 0 100 55" aria-hidden="true">${svg}</svg>`;
}
function showLevels(){
 if(hostPaused())return;
 $('levelGrid').innerHTML=E.levels.map((spec,i)=>{const count=spec.pickups.filter(p=>p.id[0]!=='R'&&!save.data.unlockedWeaponIds.includes(p.id)&&!save.data.collectedCosmeticIds.includes(p.id)).length;
 return `<button data-stage="${i}" ${i>save.data.cleared?'disabled':''} class="${i<save.data.cleared?'cleared':''} ${i===selectedMap?'current':''}" aria-label="Level ${spec.id}, ${spec.name}${i>save.data.cleared?', locked':''}${count?', uncollected capsule':''}"><strong>${i<save.data.cleared?'✓ ':''}${spec.id}${spec.boss?' ◈':''}</strong>${count?'<span class="capsule">◆</span>':''}${miniature(spec)}<small>${spec.name}</small><small>${Object.keys(spec.skills).join(' · ')||'STANDARD'}</small></button>`;}).join('');
 document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>{selectedMap=+b.dataset.stage;$('levelPicker').hidden=true;syncLobby();});$('levelPicker').hidden=false;$('closeLevels').focus();
}
const icons={BURST:'◉',BLINK:'◇',PUSH:'→',BOUNCE:'⌁',PULL:'←',SPLIT:'⋔',PHASE:'⇥',SWAP:'⇄'};
function buildSkills(){
 $('skills').innerHTML=Object.keys(s.skills).map(id=>`<button class="skill" data-skill="${id}" aria-label="${id}, hold for demonstration"><small>${s.skills[id]}</small><b>${icons[id]}</b>${id}</button>`).join('');
 document.querySelectorAll('[data-skill]').forEach(b=>{
  b.onpointerdown=e=>{e.stopPropagation();if(!canAim())return;previewPress=setTimeout(()=>{previewPress=null;runDemo(b.dataset.skill);b.dataset.long='1';},450);};
  b.onpointerup=()=>{clearTimeout(previewPress);previewPress=null;};b.onpointercancel=b.onpointerleave=b.onpointerup;
  b.onclick=()=>{if(b.dataset.long){delete b.dataset.long;return;}if(demo)return;if(canAim()){const ok=E.selectSkill(s,b.dataset.skill);feedback=ok?'':s.skillUsed?'ONE SKILL PER TURN':'EMPTY';tone(560,.08);hud();}};
 });
}
function hud(){
 if(!s)return;const [p,e]=s.units,enabled=canAim();
 $('php').textContent=Number(p.hp.toFixed(2));$('ehp').textContent=Number(e.hp.toFixed(2));$('pbar').style.width=p.hp/5*100+'%';$('ebar').style.width=e.hp/e.maxHp*100+'%';$('pbar').parentElement.style.setProperty('--segments',20);$('ebar').parentElement.style.setProperty('--segments',100/e.maxHp);
 $('ename').textContent=s.spec.boss?s.spec.name:'RIVAL';$('round').textContent='LV '+s.stage;
 $('turnLabel').textContent=demo?'':s.phase==='over'?'COMPLETE':s.turn?'RIVAL':'YOUR TURN';
 const left=s.shotLimit-s.shotCount;$('shotBudget').textContent=left===1?'LAST SHOT':left+' SHOTS';$('shotBudget').classList.toggle('low',left<=3);$('shotBudget').classList.toggle('last',left===1);
 const displayPower=demo?.id==='controls'?20+80*Math.min(demo.age,demo.releaseAt||.95)/.95:s.power;
 $('powerNumber').textContent=Math.round(displayPower)+'%';$('powerFill').style.width=displayPower+'%';$('powerHUD').classList.toggle('active',!!charge);
 $('angleText').textContent=Math.round(G.muzzle(s,0,s.angle).worldAngle)+'°';$('aimRange').value=s.angle;$('aimRange').min=minimumAngle();for(const id of ['aimRange','aimUp','aimDown'])$(id).disabled=!enabled;$('fire').disabled=!enabled;$('fire').classList.toggle('charging',!!charge);$('fire').classList.toggle('canceling',!!charge?.cancel);$('chargeValue').textContent=charge?(charge.cancel?'CANCEL':Math.round(s.power)+'%'):'FIRE';$('chargeRing').style.strokeDashoffset=345.58*(1-(charge?(s.power-20)/80:0));
 $('shotFeedback').textContent=feedback;
 const look=ArcWeapons.get(s.mode).appearance;const ammo=s.trial?.id===s.mode?s.trial.ammo:s.ammo;$('weaponToggle').textContent=look.glyph+' '+look.label+' '+(s.mode==='W01'?'∞':ammo);$('weaponToggle').style.borderColor=look.color;$('weaponToggle').style.color=look.color;$('weaponToggle').setAttribute('aria-label',ArcWeapons.get(s.mode).name+', switch weapon');$('weaponToggle').classList.toggle('special',s.mode!=='W01');$('weaponToggle').disabled=!enabled;
 for(const b of document.querySelectorAll('[data-skill]')){const id=b.dataset.skill;b.querySelector('small').textContent=s.skills[id];b.disabled=!enabled;b.classList.toggle('spent',s.skillUsed||s.skills[id]<=0);b.setAttribute('aria-disabled',s.skillUsed||s.skills[id]<=0);b.classList.toggle('selected',s.selectedSkill===id);b.setAttribute('aria-pressed',s.selectedSkill===id);}
 $('stick').setAttribute('aria-disabled',!enabled);$('stick').style.opacity=enabled?'1':'.4';
 const rs=s.world.regions.map(r=>r.kind==='F'?(r.direction>0?'WIND →':'WIND ←'):r.kind==='V'?(r.on?'VENT ↑':'VENT · NEXT ↑'):r.kind==='M'?'FIELD '+(r.direction>0?'↻':'↺'):r.kind==='C'?'CLOUD':'UPDRAFT ↑');
 $('environment').textContent=[...new Set([...rs,...(s.world.solids.some(o=>o.kind==='bridge')?['BRIDGE · NEXT ⋯']:[])])].join('　');
}
function demoPlan(id){
 if(id==='controls'){const plan=E.trajectory(s,0,s.angle,65,{weaponId:'W01',skill:null});const hit=plan.impacts.find(i=>i.hit);if(hit)for(const bullet of plan.bullets){bullet.path=bullet.path.filter(p=>p.t<hit.t-.12);bullet.t=Math.min(bullet.t,hit.t-.12);}plan.duration=Math.max(.1,...plan.bullets.map(b=>b.t));return plan;}
 const skill=id==='gate-choices'?'PHASE':E.skills.includes(id)&&id!=='BLINK'?id:null;
 const demoId=id==='ceiling-lift'?'U':id==='gate-choices'?'PHASE':id;
 const eventFor={W:'skip',B:'impact',C:'cloud',K:'bounce',PHASE:'phase',BOUNCE:'bounce',SPLIT:'split',BURST:'impact',pickup:'pickup',U:'updraft',F:'wind',V:'vent',M:'magnet'}[demoId];
 let best=null;
 outer:for(const a of [20,40,60,75])for(const p of [45,65,85]){
  const plan=E.trajectory(s,0,a,p,{weaponId:id.startsWith('W')&&id.length===3?id:'W01',skill});
  let event=plan.events.find(e=>e.type===eventFor);
  if(['U','F','V','M'].includes(id)){
   const region=s.world.regions.find(r=>r.kind===id);if(region){const q=plan.path.find(p=>ArcPhysics.inRegion(p,region));if(q)event={t:q.t};}
  }
  if(event){best=plan;const end=event.t+.35;for(const b of best.bullets){b.path=b.path.filter(p=>p.t<=end);b.t=Math.min(b.t,end);}best.duration=Math.min(best.duration,end);break outer;}
  if(!best)best=plan;
 }
 // Stop local demonstration before opponent impact so it cannot supply a complete solution.
 if(best)for(const b of best.bullets){const hit=best.impacts.find(i=>i.bullet===b.id&&i.hit);if(hit)b.path=b.path.filter(p=>p.t<hit.t-.15);}
 return best;
}
function runDemo(id,automatic=false){
 if(!s||s.phase!=='aim'||hostPaused()||manualPaused||shot)return;clearInput();lastDemoId=id;
 const seenId=id;if(id==='touch-controls-v2')id='controls';
 demo={id,seenId,age:0,loops:0,duration:2.2,plan:demoPlan(id),automatic};if(id==='controls'){demo.power=65;demo.releaseAt=.95*(65-20)/80;}
 if(id==='ceiling-lift'){
  let low=null,roof=null;
  for(const angle of [0,10,20,30,40,50,60,70])for(const power of [35,50,65,80,95]){
   const plan=E.trajectory(s,0,angle,power,{weaponId:'W01',skill:null});if(!plan.events.some(e=>e.type==='updraft'))continue;
   const ceiling=s.world.solids.some(o=>o.kind==='roof'&&plan.end.x>=o.poly[0].x-3&&plan.end.x<=o.poly[1].x+3&&Math.abs(plan.end.y-o.poly[2].y)<8);
   if(ceiling&&!roof)roof=plan;else if(!ceiling&&!low)low=plan;
  }
  demo.duration=2.8;demo.variants=[{id:'U',plan:roof||demo.plan},{id:'U',plan:low||demo.plan}];
 }
 if(id==='gate-choices'){demo.duration=2.8;demo.variants=[{id:'PHASE',plan:demoPlan('PHASE')},{id:'SWAP',plan:null}];}
 if(id==='B'){
  const current=s.world.solids.find(o=>o.kind==='bridge');
  for(let r=s.round+1;r<=s.round+3;r++){const world=G.world(s.spec,r,s.bossPhase,s.effects),next=world.solids.find(o=>o.kind==='bridge');if(next&&next.open!==current?.open){const local={...s,world};const nextPlan=E.trajectory(local,0,48,60,{weaponId:'W01',skill:null});demo.duration=2.8;demo.variants=[{id:'B',plan:demo.plan,world:s.world},{id:'B',plan:nextPlan,world}];break;}}
 }
 // Every shown shot ends near the demonstrated interaction, before a solved opponent impact.
 for(const variant of demo.variants||[]){if(!variant.plan)continue;const event=variant.plan.events.find(e=>['phase','updraft','impact'].includes(e.type));const end=event?event.t+.2:1.1;for(const bullet of variant.plan.bullets){bullet.path=bullet.path.filter(p=>p.t<=end);bullet.t=Math.min(bullet.t,end);}variant.plan.duration=Math.min(variant.plan.duration,end);}
 $('tutorialName').textContent=id==='controls'?'HOLD → RELEASE':id==='slope'?'MOVE · KEEP YOUR ANGLE':id==='pickup'?'SHOOT THROUGH':id==='boss-swap'?'SWAP · ROTATE CORE':id==='ceiling-lift'?'LIFT · LOW / HIGH':id==='gate-choices'?'TWO ENTRANCES':id;
 $('tutorial').hidden=false;hud();$('previewOK').focus({preventScroll:true});
}
function endDemo(){if(!demo)return;const ids=[demo.seenId||demo.id,demo.id];demo=null;$('tutorial').hidden=true;for(const id of ids)if(!save.data.seenPreviewIds.includes(id))save.data.seenPreviewIds.push(id);save.save();hud();$('world').focus({preventScroll:true});}
function firstDemo(){
 const priorities=s.stage===1?['controls']:s.stage===2?['slope']:s.stage===3?['pickup']:s.stage===80?['boss-swap']:s.stage===42?['ceiling-lift']:s.stage===96?['gate-choices']:[];
 priorities.unshift('touch-controls-v2');
 priorities.push(...s.spec.features.map(f=>f.type).filter(t=>'WBCKUFVM'.includes(t)),...Object.keys(s.skills));
 const id=priorities.find(id=>!save.data.seenPreviewIds.includes(id));if(id)runDemo(id,true);
}
function start(){
 if(hostPaused()||!save.ready&&$('play').disabled)return;unlockAudio();gameToken++;cpuJob=null;cpuReady=null;
 s=E.campaign(selectedMap+1,save.data);s.power=65;transition=null;shot=null;tail=null;impact=null;demo=null;pickupEffects=[];feedback='';manualPaused=false;clearInput();buildSkills();
 $('lobby').hidden=true;$('battle').hidden=false;$('overlay').hidden=true;$('levelPicker').hidden=true;$('tutorial').hidden=true;audioSync();hud();firstDemo();if(!demo)$('world').focus({preventScroll:true});tone(520,.15,'triangle');
}
function startCharge(id){
 if(demo)return;if(!canAim()||charge||s.selectedSkill==='BLINK')return;
 unlockAudio();gesture=null;charge={id,elapsed:0,previous:s.power,cancel:false};s.power=20;
 if(audio&&hostAudio){chargeTone=audio.createOscillator();const g=audio.createGain();g.gain.value=.025;chargeTone.type='triangle';chargeTone.frequency.value=150;chargeTone.connect(g).connect(master);chargeTone.start();}hud();
}
function releaseCharge(id){
 if(!charge||charge.id!==id)return;const valid=canAim()&&!charge.cancel,power=s.power,previousPower=charge.previous;charge=null;stopChargeTone();if(valid){s.power=power;launch();}else{s.power=previousPower;hud();}
}
function launch(plan=null){
 if(hostPaused()||manualPaused||demo)return;clearInput();shot=E.launch(s,s.angle,s.power,plan);if(!shot)return;flight=0;tail=null;impact=null;feedback='';const voice=ArcWeapons.get(shot.weaponId);tone(voice.needle||voice.gravity<.5?540:voice.twin?260:voice.damage>1.1?85:155,voice.damage>1.1?.32:.19,voice.needle?'sine':'sawtooth');hud();
}
function finishResult(){
 clearInput();dialog='result';$('resultIcon').textContent=s.result==='win'?'✦':s.result==='draw'?'◇':'↗';$('modalEyebrow').textContent=`LEVEL ${s.stage} · ${s.result==='win'?'CLEARED':s.reason==='shots'?'OUT OF SHOTS':s.reason==='durability'?'ROVER DISABLED':'DRAW'}`;
 if(s.result==='win'){save.data.cleared=Math.max(save.data.cleared,s.stage);save.save();}
 $('modalTitle').textContent=s.result==='win'?(s.stage===100?'A hundred ways.':'Beautiful shot.'):'One more arc?';
 $('modalDetail').textContent=`${s.shotCount} / ${s.shotLimit} shots · ${Number(s.units[0].hp.toFixed(2))} durability left${s.stage===100&&s.result==='win'?' · Your collection is ready in Loadout.':''}`;
 $('resume').textContent=s.result==='win'&&s.stage<100?'NEXT LEVEL':'TRY AGAIN';$('returnLobby').textContent='LOADOUT';$('overlay').hidden=false;$('resume').focus();tone(s.result==='win'?660:220,.4,'triangle');
}
function advanceTurn(){
 const beforeWorld=s.world,beforeUnits=s.units.map(u=>({...u}));E.next(s);if(s.phase==='transition')transition={world:beforeWorld,units:beforeUnits,age:0,duration:.6};if(s.phase==='over'){finishResult();return;}
 if(s.turn){requestCPU();}else{shot=null;tail=null;}
 hud();
}
function requestCPU(){
 const token=gameToken,id=++jobId,state={...s,random:undefined};cpuJob={id,token};cpuReady=null;
 if(worker){worker.postMessage({id,state,seed:s.stage*1000+s.round});return;}
 setTimeout(()=>{if(cpuJob?.id!==id||gameToken!==token)return;const start=performance.now(),target=E.enemyMoveTarget(s),u={...s.units[1]};G.move(s,1,target-s.units[1].x);const plan=E.cpuPlan(s,E.seeded(s.stage*1000+s.round));Object.assign(s.units[1],u);cpuReady={target,plan};platformStatus.cpuJobs.push({worker:false,elapsed:performance.now()-start});},0);
}
if(typeof Worker!=='undefined')try{worker=new Worker('cpu-worker.js?v=0.4.1');worker.onmessage=event=>{const r=event.data;if(!cpuJob||r.id!==cpuJob.id||cpuJob.token!==gameToken)return;if(r.error){platformStatus.errors.push(r.error);worker.terminate();worker=null;requestCPU();return;}cpuReady=r;platformStatus.cpuJobs.push({worker:true,elapsed:r.elapsed});};worker.onerror=e=>{platformStatus.errors.push(e.message);worker.terminate();worker=null;if(s?.turn)requestCPU();};}catch(e){platformStatus.errors.push(String(e));}
function update(dt,realDt=dt){
 clock+=dt;if(!s||manualPaused||hostPaused())return;
 if(demo){const elapsed=demo.age+dt;demo.loops+=Math.floor(elapsed/demo.duration);demo.age=elapsed%demo.duration;hud();return;}
 if(s.phase==='aim'){
  if(s.pendingWeaponDemo){const id=s.pendingWeaponDemo;s.pendingWeaponDemo=null;if(!save.data.seenPreviewIds.includes(id)){runDemo(id);return;}}
  if(charge){charge.elapsed+=realDt;s.power=E.chargePower(charge.elapsed);if(chargeTone)chargeTone.frequency.value=150+s.power*5;}
  const axis=stick?stick.axis:keyMove;if(axis)E.move(s,0,axis*160*dt);
 }else if(s.phase==='cpu'){
  s.time-=dt;if(s.time<=0&&cpuReady){s.cpuTarget=cpuReady.target;s.cpuStart=s.units[1].x;s.cpuMoveTime=0;s.phase='cpuMove';}
 }else if(s.phase==='cpuMove'){
  s.cpuMoveTime+=dt;const ratio=Math.min(1,s.cpuMoveTime/.6),x=s.cpuStart+(s.cpuTarget-s.cpuStart)*ratio;G.move(s,1,x-s.units[1].x);
  if(ratio>=1){const plan=cpuReady.plan;cpuJob=null;cpuReady=null;launch(plan);}
 }else if(s.phase==='flight'){
  flight+=dt;const before=shot.appliedEvents;E.applyEvents(s,shot,flight,acquired);
  for(const e of shot.events.slice(before,shot.appliedEvents)){if(e.type==='bounce'||e.type==='skip')tone(e.type==='skip'?720:930,.06,'sine',.05);if(e.type==='cloud')tone(180,.09,'triangle',.03);if(e.type==='phase')tone(1400,.08,'sine',.04);}
  if(flight>=shot.duration){
   const last=shot;E.resolve(s,last,acquired);tail={shot:last,age:0};impact={...last.end,age:0,weaponId:last.weaponId,shot:last,damage:last.damage};shot=null;
   if(!last.events.some(e=>e.type==='pickup'))feedback='';tone(last.damage[1-s.turn]>0?110:75,.3,'triangle',.15);
   if(s.phase==='over')s.phase='finish';else s.phase='impact';s.time=1.4;
  }
 }else if(s.phase==='impact'||s.phase==='finish'){
  s.time-=dt;if(tail)tail.age+=dt;
  if(s.time<=0){tail=null;if(s.phase==='finish'){s.phase='over';finishResult();}else advanceTurn();}
 }else if(s.phase==='transition'){
  s.time-=dt;if(transition)transition.age+=dt;if(s.time<=0){transition=null;s.phase='aim';s.power=65;feedback='';shot=null;tail=null;hud();}
 }
 for(const p of pickupEffects)p.age+=dt;pickupEffects=pickupEffects.filter(p=>p.age<.8);
 for(const u of s.units)if(u.animation){u.animation.age+=dt;if(u.animation.age>=u.animation.duration)delete u.animation;}
 if(impact){impact.age+=dt;if(impact.age>1)impact=null;}hud();
}
function draw(){renderer.draw(s||preview,{time:clock,lobby:!s,canAim:canAim(),cosmetic:save.data.equippedCosmeticId,shot,flight,tail,impact,demo,reducedMotion,transition,pickupEffects,charging:!!charge});}
function schedule(){if(!hostPaused()&&!raf)raf=requestAnimationFrame(loop);}
function loop(t){raf=0;if(hostPaused())return;const realDt=previous?Math.max(0,(t-previous)/1000):0;previous=t;if(!manualPaused){update(Math.min(realDt,.05),realDt);draw();}schedule();}
function pauseHost(source='sdk'){pauseSources.add(source);clearInput();$('app').inert=true;cancelAnimationFrame(raf);raf=0;previous=0;audioSync();}
function resumeHost(source='sdk'){pauseSources.delete(source);if(hostPaused())return;$('app').inert=false;previous=0;audioSync();schedule();if(save.dirty)save.save();}
function pause(){if(!s||s.result||hostPaused())return;clearInput();manualPaused=true;dialog='pause';$('resultIcon').textContent='Ⅱ';$('modalEyebrow').textContent='DUEL PAUSED';$('modalTitle').textContent='Take a breath.';$('modalDetail').textContent='Your angle and current flight are waiting.';$('resume').textContent='RESUME';$('returnLobby').textContent='LOADOUT';$('overlay').hidden=false;audioSync();$('resume').focus();}
function lobby(){clearInput();gameToken++;s=null;shot=null;tail=null;demo=null;cpuReady=null;cpuJob=null;manualPaused=false;$('lobby').hidden=false;$('battle').hidden=true;$('overlay').hidden=true;selectedMap=Math.min(selectedMap,Math.min(99,save.data.cleared));syncLobby();audioSync();save.save();}
$('play').onclick=start;$('prevMap').onclick=()=>switchMap(-1);$('nextMap').onclick=()=>switchMap(1);$('chooseLevel').onclick=showLevels;$('closeLevels').onclick=()=>{$('levelPicker').hidden=true;$('chooseLevel').focus();};
$('weaponLoadout').onchange=e=>{unlockAudio();save.data.equippedWeaponId=e.target.value;save.save();syncLobby();};$('cosmeticLoadout').onchange=e=>{unlockAudio();save.data.equippedCosmeticId=e.target.value||null;save.save();syncLobby();};
$('pause').onclick=pause;$('resume').onclick=()=>{if(hostPaused())return;if(dialog==='result'){selectedMap=s.result==='win'?Math.min(99,s.stage):s.stage-1;start();}else{manualPaused=false;previous=0;$('overlay').hidden=true;audioSync();hud();$('world').focus({preventScroll:true});}};
$('returnLobby').onclick=()=>{if(dialog==='result'||dialog==='confirm'){lobby();return;}dialog='confirm';$('modalTitle').textContent='Leave this duel?';$('modalDetail').textContent='Collected items are saved. This duel will restart.';$('returnLobby').textContent='LEAVE DUEL';};
$('weaponToggle').onclick=()=>{if(!canAim())return;const id=s.trial?.ammo>0?s.trial.id:s.weaponId;s.mode=s.mode==='W01'&&id!=='W01'&&(s.ammo>0||s.trial?.ammo>0)?id:'W01';s.angle=Math.max(minimumAngle(),s.angle);tone(620,.08);hud();};
$('previewOK').onclick=()=>{unlockAudio();endDemo();};
$('environment').onpointerdown=()=>{if(canAim())previewPress=setTimeout(()=>{const kind=s.spec.features.find(f=>'WBCKUFVM'.includes(f.type))?.type;if(kind)runDemo(kind);},450);};$('environment').onpointerup=$('environment').onpointercancel=()=>clearTimeout(previewPress);
function setAngle(angle){if(!canAim())return;s.angle=E.clamp(angle,minimumAngle(),85);hud();}
$('aimRange').oninput=e=>setAngle(Number(e.target.value));$('aimUp').onclick=()=>setAngle(s.angle+3);$('aimDown').onclick=()=>setAngle(s.angle-3);
function pointer(e){e.preventDefault();unlockAudio();}
$('fire').onpointerdown=e=>{pointer(e);if(e.button!==0&&e.pointerType!=='touch')return;startCharge(e.pointerId);try{$('fire').setPointerCapture(e.pointerId);}catch{}};
$('fire').onpointermove=e=>{if(charge?.id!==e.pointerId)return;const r=$('fire').getBoundingClientRect();charge.cancel=Math.hypot(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2)>r.width*.9;hud();};
$('fire').onpointerup=e=>releaseCharge(e.pointerId);$('fire').onpointercancel=$('fire').onlostpointercapture=e=>{if(charge?.id===e.pointerId)cancelCharge();hud();};
function stickMove(e){if(stick?.id!==e.pointerId)return;const r=$('stick').getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),mag=Math.hypot(dx,dy),dist=Math.min(mag,27),scale=mag?dist/mag:0;stick.axis=Math.abs(dx)<8?0:E.clamp(dx/27,-1,1);$('stickKnob').style.transform=`translate(${dx*scale}px,${dy*scale}px)`;$('stick').setAttribute('aria-valuenow',Math.round(stick.axis*100));}
$('stick').onpointerdown=e=>{pointer(e);if(demo)return;if(!canAim()||stick)return;stick={id:e.pointerId,axis:0};try{$('stick').setPointerCapture(e.pointerId);}catch{}stickMove(e);};$('stick').onpointermove=stickMove;$('stick').onpointerup=$('stick').onpointercancel=$('stick').onlostpointercapture=e=>{if(stick?.id===e.pointerId)resetStick();};
$('world').onpointerdown=e=>{pointer(e);if(demo)return;
 if(s?.selectedSkill==='BLINK'&&canAim()){
  const p=renderer.toWorld(e.clientX,e.clientY),i=s.blink.findIndex(b=>Math.hypot(p.x-b.x,p.y-(b.y-22))<60);
  if(i>=0){if(s.blinkCandidate===i){E.blink(s,i);s.blinkCandidate=null;}else{s.blinkCandidate=i;feedback='TAP AGAIN TO BLINK';}}else{s.selectedSkill=null;s.blinkCandidate=null;feedback='';}hud();return;
 }
 if(gesture||charge)return;gesture={id:e.pointerId,x:e.clientX,y:e.clientY,angle:s?.angle||48,lobby:!s};try{$('world').setPointerCapture(e.pointerId);}catch{}};
$('world').onpointermove=e=>{if(gesture?.id!==e.pointerId||!canAim())return;setAngle(gesture.angle+(gesture.y-e.clientY)*.4);};
$('world').onpointerup=e=>{if(gesture?.id!==e.pointerId)return;const g=gesture;gesture=null;if(g.lobby&&Math.abs(e.clientX-g.x)>40)switchMap(e.clientX<g.x?1:-1);};$('world').onpointercancel=$('world').onlostpointercapture=e=>{if(gesture?.id===e.pointerId)gesture=null;};
for(const id of ['world','stick','fire'])$(id).oncontextmenu=e=>e.preventDefault();
document.addEventListener('keydown',e=>{
 if(hostPaused())return;if(e.key==='Escape'){if(!$('levelPicker').hidden){$('levelPicker').hidden=true;return;}if(demo)return;if(!$('overlay').hidden){if(dialog==='result')lobby();else $('resume').click();}else pause();return;}
 if(demo)return;if(e.target?.matches?.('input,select,button')&&e.target.id!=='fire')return;if(!canAim())return;
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))e.preventDefault();if(e.key===' '&&!e.repeat)startCharge('keyboard');if(e.key==='ArrowLeft')keyMove=-1;if(e.key==='ArrowRight')keyMove=1;if(!charge&&e.key==='ArrowUp')s.angle=E.clamp(s.angle+1,minimumAngle(),85);if(!charge&&e.key==='ArrowDown')s.angle=E.clamp(s.angle-1,minimumAngle(),85);hud();
});
document.addEventListener('keyup',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key))keyMove=0;if(e.key===' '){e.preventDefault();releaseCharge('keyboard');}});
// Gameplay owns multi-touch; browser page zoom must not compete with aim/charge.
$('app').addEventListener('dblclick',e=>e.preventDefault());
for(const event of ['gesturestart','gesturechange','gestureend'])document.addEventListener(event,e=>e.preventDefault(),{passive:false});
document.addEventListener('touchmove',e=>{if(e.touches.length>1)e.preventDefault();},{passive:false});
window.addEventListener('blur',clearInput);window.addEventListener('resize',()=>{clearInput();previous=0;draw();});
document.addEventListener('visibilitychange',()=>document.hidden?pauseHost('visibility'):resumeHost('visibility'));
if(sdk){sdk.system.onPause(()=>pauseHost('sdk'));sdk.system.onResume(()=>resumeHost('sdk'));sdk.system.onAudioEnabledChange(v=>{hostAudio=v;audioSync();});}
// firstFrameReady is sent after a real frame; saveData is gated by successful loadData.
syncLobby();$('loading').hidden=true;$('app').hidden=false;draw();sdk?.game.firstFrameReady();$('play').disabled=true;
save.load().then(()=>{selectedMap=Math.min(99,save.data.cleared);syncLobby();$('play').disabled=false;sdk?.game.gameReady();});schedule();
