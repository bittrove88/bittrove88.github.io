'use strict';
// Browser regressions for the playable preview, collection and journey. Controlled
// battle states below exercise presentation; they are not recorded as player wins.
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../dist');
const output=process.env.ARCLINE_EVIDENCE_DIR||'/workspace/work/arcline-immersion';fs.mkdirSync(output,{recursive:true});
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8'};
const server=http.createServer((req,res)=>{const name=decodeURIComponent(req.url.split('?')[0]),file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err)res.writeHead(404).end();else{res.setHeader('Content-Type',mime[path.extname(file)]||'text/plain');res.end(data);}});});
const sizes=[[320,568],[360,640],[390,844],[568,320],[640,360],[844,390],[768,1024],[1024,768]];
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}/`;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const errors=[],rows=[];let checks=0;
 async function open(width=390,height=844){const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true});await context.route('https://www.youtube.com/**',r=>r.abort());const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));await page.goto(url);await page.waitForFunction('!document.getElementById("play").disabled');return {page,context};}
 async function stopFrames(page){await page.evaluate(()=>{cancelAnimationFrame(raf);raf=0;});}
 async function newBattle(page,n=1){await page.evaluate(n=>{selectedMap=n-1;start();endDemo();encounter=null;document.getElementById('encounterBanner').hidden=true;hud();draw();},n);}
 // Initial equipment is an explicit, visual choice; no native one-option form
 // competes with PLAY. Every journey area still exposes replay and locked levels.
 for(const [width,height] of sizes){
  const {page,context}=await open(width,height);
  assert(await page.locator('#play').isVisible());assert(await page.locator('#openCollection').isVisible());assert(!await page.locator('#weaponLoadout').isVisible());assert(!await page.locator('#cosmeticLoadout').isVisible());checks+=4;
  await page.locator('#chooseLevel').tap();assert.equal(await page.locator('#journeyAreas [role="tab"]').count(),10,'ten distinct places in the journey');checks++;
  const seen=new Set();
  for(let area=0;area<10;area++){
   await page.locator('#journeyAreas [role="tab"]').nth(area).tap();
   const stages=await page.locator('#levelGrid [data-stage]').evaluateAll(nodes=>nodes.map(n=>({stage:+n.dataset.stage,disabled:n.disabled})));
   assert.equal(stages.length,10,'each area exposes ten authored levels');assert(stages.every(n=>n.stage>=area*10&&n.stage<area*10+10),'area contains its own levels');for(const n of stages){seen.add(n.stage);assert.equal(n.disabled,n.stage>0,'new player unlocks only the first level');}checks+=3;
  }
  assert.equal(seen.size,100,'the map retains all 100 levels');checks++;
  await page.locator('#closeLevels').tap();await page.locator('#openCollection').tap();
  assert(await page.locator('#collectionPanel').isVisible());assert.equal(await page.evaluate('save.data.equippedWeaponId'),'W01');checks+=2;
  const geometry=await page.locator('.collection-panel').evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,overflow:document.documentElement.scrollWidth>innerWidth};});
  assert(!geometry.overflow&&geometry.x>=-.5&&geometry.y>=-.5&&geometry.right<=width+.5&&geometry.bottom<=height+.5,'collection stays inside viewport');checks++;
  await page.locator('#closeCollection').tap();rows.push({width,height,journeyLevels:seen.size,collectionContained:true});
  if(width===390)await page.screenshot({path:path.join(output,'lobby-390x844.png')});await context.close();
 }
 // The demonstration keeps looping until OK. TRY is a genuine sandbox: a
 // real press/release can fly, but no permanent or live-battle resource changes.
 {
  const {page,context}=await open();await page.locator('#play').tap();await stopFrames(page);
  assert(await page.evaluate('!!demo'));const before=await page.evaluate('JSON.stringify({units:s.units,skills:s.skills,shots:s.shotCount,ammo:s.ammo,trial:s.trial,pickups:s.pickups,round:s.round,save:save.data})');
  await page.evaluate('update(demo.duration*3+.1,demo.duration*3+.1);draw()');assert(await page.evaluate('demo.loops>=3'));assert(await page.locator('#previewOK').isVisible());checks+=3;
  await page.locator('#previewPractice').tap();assert(await page.evaluate('demo.practicing&&!!practiceReturn'),'TRY enters isolated practice');checks++;
  const practiceBefore=await page.evaluate('JSON.stringify({units:s.units,skills:s.skills,shots:s.shotCount,ammo:s.ammo,trial:s.trial,pickups:s.pickups,round:s.round})');
  const angle=await page.evaluate('s.angle');await page.locator('#aimUp').tap();assert(await page.evaluate('s.angle')>angle,'practice accepts the same aim controls');
  const fire=await page.locator('#fire').boundingBox();await page.mouse.move(fire.x+fire.width/2,fire.y+fire.height/2);await page.mouse.down();await page.evaluate('update(.5,.5);draw()');assert(await page.evaluate('!!charge'),'practice accepts hold');await page.mouse.up();assert(await page.evaluate('s.phase==="flight"'),'practice release launches a visible shot');
  await page.evaluate('for(let i=0;i<300;i++)update(.05,.05);draw()');assert.equal(await page.evaluate('s.phase'),'aim');
  assert.equal(await page.evaluate('JSON.stringify({units:s.units,skills:s.skills,shots:s.shotCount,ammo:s.ammo,trial:s.trial,pickups:s.pickups,round:s.round})'),practiceBefore,'practice never consumes or damages');
  assert.equal(await page.evaluate('JSON.stringify({units:practiceReturn.units,skills:practiceReturn.skills,shots:practiceReturn.shotCount,ammo:practiceReturn.ammo,trial:practiceReturn.trial,pickups:practiceReturn.pickups,round:practiceReturn.round,save:save.data})'),before,'actual duel and save stay untouched');checks+=6;
  await page.screenshot({path:path.join(output,'practice-390x844.png')});await page.locator('#previewPractice').tap();assert(await page.evaluate('!!demo&&!demo.practicing&&!practiceReturn'),'REPLAY returns to the loop without starting combat');await page.locator('#previewOK').tap();assert(await page.evaluate('!demo&&!practiceReturn&&s.phase==="aim"'));assert.equal(await page.evaluate('s.shotCount'),0);checks+=3;
  await page.evaluate('runDemo("W03")');await page.locator('#previewPractice').tap();assert.equal(await page.evaluate('s.mode'),'W03','weapon preview lets the player try that weapon');await page.mouse.move(fire.x+fire.width/2,fire.y+fire.height/2);await page.mouse.down();await page.evaluate('update(.4,.4)');await page.mouse.up();await page.evaluate('for(let i=0;i<300;i++)update(.05,.05)');await page.locator('#previewOK').tap();assert.equal(await page.evaluate('s.mode'),'W01','practice never auto-equips the real rover');assert.equal(await page.evaluate('s.ammo'),2);assert.equal(await page.evaluate('s.shotCount'),0);assert(!await page.evaluate('save.data.unlockedWeaponIds.includes("W03")'),'preview is not a free unlock');checks+=5;await context.close();
 }
 // A changing trajectory must not move the camera beneath a charging finger.
 // Lv80 is included because its old high-power camera shrank the field ~17%.
 {
  const {page,context}=await open();await stopFrames(page);
  for(const n of [1,42,80,100]){
   await newBattle(page,n);assert.equal(await page.evaluate('s.power'),20,'idle and first held power agree');
   const views=await page.evaluate(()=>{for(let i=0;i<50;i++)draw();startCharge('camera-test');const lock={...renderer.view},views=[];for(let i=0;i<12;i++){update(.08,.08);draw();views.push({...renderer.view});}cancelCharge();return {lock,views};});
   assert(views.views.every(v=>Math.abs(v.scale-views.lock.scale)<1e-8&&Math.abs(v.x-views.lock.x)<1e-8&&Math.abs(v.y-views.lock.y)<1e-8),`Lv${n}: charge camera stays exactly fixed through the power cycle`);assert.equal(await page.evaluate('s.shotCount'),0);checks+=3;
  }
  await context.close();
 }
 // Pickups name the actual weapon, save immediately and require an explicit
 // own-turn TRY 1. Their collection remains available after a defeat.
 {
  const {page,context}=await open();await stopFrames(page);await newBattle(page,3);
  await page.evaluate(()=>{s.phase='flight';acquired(s.pickups.find(p=>p.id==='W02'));hud();});
  assert.equal(await page.locator('#rewardName').textContent(),'Heavy Shell');assert(await page.evaluate('save.data.unlockedWeaponIds.includes("W02")'));assert.equal(await page.evaluate('s.mode'),'W01','pickup does not auto equip');assert(await page.locator('#trialWeapon').isDisabled(),'trial waits for own turn');checks+=4;
  await page.evaluate(()=>{s.phase='aim';hud();});assert(await page.locator('#trialWeapon').isEnabled());await page.locator('#trialWeapon').tap();assert.equal(await page.evaluate('s.mode'),'W02');assert.equal(await page.evaluate('s.trial.ammo'),1);assert.equal(await page.evaluate('s.shotCount'),0);checks+=4;
  await page.evaluate(()=>{s.result='lose';s.reason='durability';s.phase='over';finishResult();});assert.equal(await page.locator('#overlay').getAttribute('data-kind'),'lose');await page.locator('#returnLobby').tap();await page.locator('#openCollection').tap();assert((await page.locator('#collectionGrid').textContent()).includes('Heavy Shell'));await page.locator('[data-equip-weapon="W02"]').tap();assert.equal(await page.evaluate('save.data.equippedWeaponId'),'W02','visual weapon card explicitly equips');await page.locator('#closeCollection').tap();
  const durability=await page.evaluate('E.campaign(3,save.data).units.map(u=>u.maxHp)');await page.evaluate(()=>{save.data.collectedCosmeticIds.push('S01');});await page.locator('#openCollection').tap();await page.locator('[data-collection-tab="finishes"]').tap();await page.locator('[data-equip-cosmetic="S01"]').tap();assert.equal(await page.evaluate('save.data.equippedCosmeticId'),'S01');assert.deepEqual(await page.evaluate('E.campaign(3,save.data).units.map(u=>u.maxHp)'),durability,'appearance adds no durability buff');await page.locator('#closeCollection').tap();
  await page.reload();await page.waitForFunction('!document.getElementById("play").disabled');assert(await page.evaluate('save.data.unlockedWeaponIds.includes("W02")'),'defeat/reload retains pickup');assert.equal(await page.evaluate('save.data.equippedWeaponId'),'W02');assert.equal(await page.evaluate('save.data.equippedCosmeticId'),'S01');checks+=8;await context.close();
 }
 // Result presentation retains the battlefield, distinguishes the two loss
 // causes and sends the final win to the journey rather than replaying Lv100.
 {
  const {page,context}=await open();await stopFrames(page);await newBattle(page,1);
  await page.locator('#pause').tap();assert.equal(await page.locator('#overlay').getAttribute('data-kind'),'pause');await page.locator('#returnLobby').tap();assert.equal(await page.locator('#overlay').getAttribute('data-kind'),'confirm');await page.locator('#resume').tap();checks+=2;
  for(const reason of ['shots','durability']){
   await newBattle(page,1);await page.evaluate(reason=>{s.result='lose';s.reason=reason;s.phase='over';finishResult();},reason);const eyebrow=await page.locator('#modalEyebrow').textContent();assert(reason==='shots'?/SHOTS/.test(eyebrow):/DISABLED|DURABILITY/.test(eyebrow),'loss explains the actual constraint');assert.equal(await page.locator('#overlay').getAttribute('data-kind'),'lose');assert(await page.locator('#resume').isVisible());assert.equal(await page.locator('#resume').textContent(),'TRY AGAIN');assert(!await page.locator('#battleControls').isVisible(),'battle controls do not ghost through results');assert(!await page.locator('#shotBudget').isVisible());await page.locator('#resume').tap();assert(await page.locator('#battleControls').isVisible(),'retry restores playable controls');assert(await page.evaluate('!s.result&&s.stage===1'));checks+=8;
  }
  await newBattle(page,100);await page.evaluate(()=>{s.units[1].hp=0;s.result='win';s.reason='defeated';s.phase='over';hud();finishResult();draw();});assert.equal(await page.locator('#overlay').getAttribute('data-kind'),'final');assert(/JOURNEY/.test(await page.locator('#resume').textContent()));assert(await page.locator('#endingCollection').isVisible());assert(!await page.locator('#battleControls').isVisible());assert(!await page.locator('#shotBudget').isVisible());await page.screenshot({path:path.join(output,'ending-390x844.png'),animations:'disabled'});await page.locator('#resume').tap();assert(await page.locator('#levelPicker').isVisible());assert(await page.evaluate('!s'),'final journey leaves the completed duel');checks+=7;await context.close();
 }
 // The guardian's entrance owns a bounded pause. Neither held input nor its
 // staging can consume a shot, move a rover or advance the first round.
 {
  const {page,context}=await open();await stopFrames(page);await page.evaluate(()=>{selectedMap=9;start();draw();});
  assert(await page.locator('#encounterBanner').isVisible());assert(await page.locator('#fire').isDisabled());assert(await page.locator('#aimUp').isDisabled());assert(!await page.evaluate('canAim()'));checks+=4;
  const before=await page.evaluate('JSON.stringify({units:s.units,round:s.round,shots:s.shotCount,power:s.power})');
  await page.keyboard.down('ArrowRight');await page.keyboard.down('Space');await page.evaluate('startCharge("entry-guard");update(.55,.55);draw()');await page.keyboard.up('Space');await page.keyboard.up('ArrowRight');
  assert.equal(await page.evaluate('charge'),null);assert.equal(await page.evaluate('JSON.stringify({units:s.units,round:s.round,shots:s.shotCount,power:s.power})'),before);checks+=2;
  await page.evaluate('update(.54,.54);draw()');assert(await page.evaluate('!!encounter&&!demo'),'entrance remains distinct until 1.1 seconds');await page.evaluate('update(.02,.02);draw()');assert(await page.evaluate('!encounter&&!!demo'),'first local preview follows the entrance');assert(!await page.locator('#encounterBanner').isVisible());assert(await page.locator('#fire').isDisabled(),'preview still awaits explicit OK');checks+=4;
  await page.locator('#previewOK').tap();assert(await page.locator('#fire').isEnabled());assert(await page.evaluate('canAim()&&s.round===1&&s.shotCount===0'),'OK begins the unchanged first round');checks+=2;await context.close();
 }
 // Real shared-physics shots exercise the new overlap: CPU planning starts
 // during player aftermath; enemy aftermath shares its last .6s with the next
 // world transition. Only the worker-ready timing is controlled, not damage.
 {
  const {page,context}=await open();await stopFrames(page);await newBattle(page,1);
  const player=await page.evaluate(()=>{const best=E.solve(s,0);s.angle=best.angle;s.power=best.power;launch();const angle=s.angle,damage=shot.damage[1];for(let i=0;i<1000&&s.phase==='flight';i++)update(.05,.05);return {angle,damage,phase:s.phase,turn:s.turn,planning:!!cpuJob,tail:!!tail,time:s.time,shots:s.shotCount};});
  assert(player.damage>0,'solver supplies an actual effective player trajectory');assert.equal(player.phase,'impact');assert.equal(player.turn,0);assert(player.planning,'CPU planning overlaps the player impact while the player still owns the turn');assert(player.tail);assert.equal(player.time,1.4);assert.equal(player.shots,1);checks+=7;
  const playerTail=await page.evaluate(()=>{update(.79,.79);update(.6,.6);return {phase:s.phase,turn:s.turn,tail:!!tail,age:tail?.age};});assert.equal(playerTail.phase,'impact');assert.equal(playerTail.turn,0);assert(playerTail.tail&&Math.abs(playerTail.age-1.39)<1e-8,'the full 1.4-second player trajectory aftermath is retained');checks+=3;
  const enemy=await page.evaluate(()=>{update(.02,.02);const nextPhase=s.phase;cpuReady={target:s.units[1].x,plan:E.trajectory(s,1,48,50)};update(.01,.01);const launched={nextPhase,phase:s.phase,side:shot?.side,shots:s.shotCount};for(let i=0;i<1000&&s.phase==='flight';i++)update(.05,.05);return {...launched,impactPhase:s.phase,turn:s.turn,time:s.time,tail:!!tail};});
  assert.equal(enemy.nextPhase,'cpu');assert.equal(enemy.phase,'flight','stationary enemy has no fake movement wait');assert.equal(enemy.side,1);assert.equal(enemy.shots,1,'enemy fire never spends a player shot');assert.equal(enemy.impactPhase,'impact');assert.equal(enemy.turn,1);assert.equal(enemy.time,1.4);assert(enemy.tail);checks+=8;
  const transitionState=await page.evaluate(()=>{update(.79,.79);const before={phase:s.phase,turn:s.turn,tail:!!tail};update(.02,.02);return {before,phase:s.phase,turn:s.turn,time:s.time,tail:!!tail,age:transition?.age,round:s.round};});assert.equal(transitionState.before.phase,'impact');assert.equal(transitionState.before.turn,1);assert(transitionState.before.tail);assert.equal(transitionState.phase,'transition','transition starts inside the last .6 seconds of enemy aftermath');assert.equal(transitionState.turn,0);assert.equal(transitionState.time,.6);assert(transitionState.tail);assert.equal(transitionState.age,0);assert.equal(transitionState.round,2);checks+=9;
  const ready=await page.evaluate(()=>{update(.59,.59);const prior={phase:s.phase,tail:!!tail};update(.02,.02);draw();return {prior,phase:s.phase,tail:!!tail,angle:s.angle,power:s.power,shots:s.shotCount,round:s.round};});assert.equal(ready.prior.phase,'transition');assert(ready.prior.tail);assert.equal(ready.phase,'aim');assert(!ready.tail,'no previous trajectory remains when player aiming resumes');assert.equal(ready.angle,player.angle,'relative barrel angle survives the entire turn cycle');assert.equal(ready.power,20,'fresh aim starts at the same power as a new hold');assert.equal(ready.shots,1);assert.equal(ready.round,2);checks+=8;await context.close();
 }
 assert.deepEqual(errors,[],'no browser exceptions');
 const report={status:'PASS',checks,viewports:rows,errors,method:'Real headless Chromium. Actual touch/click equipment, preview/practice/fire and journey controls; deterministic injected states for camera, rewards, results and enemy timing. Existing runtime/touch tests cover full campaign initialization, host lifecycle and multitouch. Physical devices and human completion remain separate QA.'};fs.writeFileSync(path.join(output,'IMMERSION.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));await browser.close();server.close();
})().catch(e=>{console.error(e);server.close();process.exit(1);});
