'use strict';
// Regression coverage uses browser hit-testing and compositor-generated touches,
// rather than calling pointer handlers or bypassing the preview acknowledgement.
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../dist');
const output=process.env.ARCLINE_EVIDENCE_DIR||'/workspace/work/arcline-clarity/touch';fs.mkdirSync(output,{recursive:true});
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8'};
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(req.url.split('?')[0]),file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,data)=>{if(err)res.writeHead(404).end();else{res.setHeader('Content-Type',mime[path.extname(file)]||'text/plain');res.end(data);}});
});
const sizes=[[320,568],[360,640],[375,667],[390,844],[430,932],[568,320],[640,360],[667,375],[844,390],[932,430],[768,1024],[1024,768]];
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}/`;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const errors=[],rows=[];let checks=0;
 async function open(width,height){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true});
  await context.route('https://www.youtube.com/**',r=>r.abort());const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(url);await page.waitForFunction('!document.getElementById("play").disabled');const cdp=await context.newCDPSession(page);return {page,context,cdp};
 }
 async function drag(cdp,start,end,id=1){
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id,...start}]});
  for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id,x:start.x+(end.x-start.x)*i/8,y:start.y+(end.y-start.y)*i/8}]});await new Promise(r=>setTimeout(r,20));}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }
 async function tap(cdp,point,id=1){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id,...point}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 async function hold(cdp,point,ms=260,id=1){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id,...point}]});await new Promise(r=>setTimeout(r,ms));await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 async function center(page,id){return page.locator('#'+id).evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});}
 async function fieldDrag(page){return page.evaluate(()=>{
  const dy=Math.min(42,innerHeight*.07);
  for(const fy of [.42,.48,.36,.54,.30])for(const fx of [.4,.55,.25,.7]){
   const x=innerWidth*fx,y=innerHeight*fy;
   if([y-dy,y,y+dy].every(yy=>document.elementFromPoint(x,yy)?.id==='world'))return {start:{x,y:y+dy},end:{x,y:y-dy}};
  }
  return null;
 });}
 for(const [width,height] of sizes){
  const {page,context,cdp}=await open(width,height);
  // The level chooser remains a real scrolling surface while combat gestures cannot zoom.
  await page.locator('#chooseLevel').tap();const panel=await page.locator('.level-panel').evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.right-7,y:r.y,height:r.height,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight};});
  let scrolled=false;
  if(panel.scrollHeight>panel.clientHeight+10){
   await drag(cdp,{x:panel.x,y:panel.y+panel.height*.75},{x:panel.x,y:panel.y+panel.height*.3});await page.waitForTimeout(120);
   scrolled=await page.locator('.level-panel').evaluate(e=>e.scrollTop>0);assert(scrolled,`${width}x${height}: level panel must scroll by touch`);checks++;
  }
  await page.locator('#closeLevels').tap();await page.locator('#play').tap();assert(await page.locator('#previewOK').isVisible(),'preview needs explicit OK');
  assert.equal(await page.locator('#replayPreview').count(),0,'redundant demo button removed');assert.equal(await page.locator('#skipPreview').count(),0,'old skip button removed');assert(!await page.locator('#previewPractice').isVisible());assert(!await page.locator('#practiceHint').isVisible());assert.equal(await page.locator('#previewOK').textContent(),'OK');checks+=6;
  if(width===390){
   const previewId=await page.evaluate('demo.seenKey');assert(await page.evaluate(id=>!save.data.seenPreviewIds.includes(id),previewId),'preview is not acknowledged before OK');
   const before=await page.evaluate('JSON.stringify({units:s.units,skills:s.skills,shots:s.shotCount,round:s.round,angle:s.angle})');
   // A battlefield gesture cannot acknowledge the preview or consume a shot.
   const point={x:width*.3,y:height*.38};await drag(cdp,point,{x:point.x,y:point.y-50});
   await page.keyboard.press('Escape');assert(await page.evaluate('!!demo'),'Escape must not silently start combat');assert(!await page.locator('#fire').isVisible(),'live FIRE is hidden during a preview');assert(!await page.locator('#weaponToggle').isVisible(),'live weapon choice is hidden during a preview');assert(await page.locator('#previewCharge').isVisible(),'controls lesson has a separate readable charge example');assert.equal(await page.evaluate('s.shotCount'),0,'preview gestures cannot fire');assert(await page.evaluate(id=>!save.data.seenPreviewIds.includes(id),previewId),'blocked gestures do not mark preview seen');checks+=3;
   const duration=await page.evaluate('demo.duration');await page.waitForTimeout(Math.ceil(duration*2200)+200);
   assert(await page.evaluate('!!demo'),'preview continues after more than two cycles');assert(await page.locator('#previewOK').isVisible());
   assert.equal(await page.evaluate('JSON.stringify({units:s.units,skills:s.skills,shots:s.shotCount,round:s.round,angle:s.angle})'),before,'looping preview cannot advance gameplay');checks+=4;
   await page.screenshot({path:path.join(output,'preview-loop-390x844.png')});checks+=3;
  }
  await page.locator('#previewOK').tap();assert(await page.evaluate('!demo&&s.phase==="aim"'),'OK starts aiming');checks++;
  const geometry=await page.evaluate(()=>{
   const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
   const ids=['powerHUD','fire','stick','weaponToggle','aimStick'];const r=Object.fromEntries(ids.map(id=>[id,rect(document.getElementById(id))]));
   r.track=rect(document.getElementById('powerFill').parentElement);
   r.overflow=document.documentElement.scrollWidth>innerWidth;return r;
  });
  assert(!geometry.overflow,'page must not overflow horizontally');
  assert(geometry.powerHUD.w>=Math.min(280,width-24),`${width}x${height}: wide shot gauge`);assert(geometry.track.h>=26,'thick readable gauge');
  for(const id of ['powerHUD','fire','stick','weaponToggle','aimStick']){const r=geometry[id];assert(r.x>=-.5&&r.y>=-.5&&r.right<=width+.5&&r.bottom<=height+.5,`${width}x${height}/${id} stays inside viewport`);}
  for(const id of ['aimStick','stick','fire','weaponToggle']){const r=geometry[id];assert(r.w>=44&&r.h>=44,`${id} remains a usable touch target`);}
  const controls=['fire','stick','weaponToggle','aimStick'];for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++){const a=geometry[controls[i]],b=geometry[controls[j]];assert(!(Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1),`${width}x${height}: ${controls[i]} overlaps ${controls[j]}`);}
  for(const id of ['fire','stick','aimStick','weaponToggle']){const a=geometry.track,b=geometry[id];assert(!(Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1),`${width}x${height}: shot gauge track overlaps ${id}`);}
  checks+=12;
  const aim=await center(page,'aimStick'),initial=await page.evaluate('s.angle');
  await hold(cdp,{x:aim.x,y:aim.y-22});const raised=await page.evaluate('s.angle');assert(raised>initial+1,'holding right stick up continuously raises angle');
  await page.waitForTimeout(100);assert(Math.abs(await page.evaluate('s.angle')-raised)<.01,'aim release preserves selected angle');
  assert.equal(await page.locator('#aimStickKnob').evaluate(e=>e.style.transform.replace(/\s/g,'')),'translate(0px,0px)','aim stick recenters on release');
  await hold(cdp,{x:aim.x,y:aim.y+22});assert(await page.evaluate('s.angle')<raised-1,'holding right stick down continuously lowers angle');
  const centered=await page.evaluate('s.angle');await hold(cdp,{x:aim.x+2,y:aim.y-2},180);assert(Math.abs(await page.evaluate('s.angle')-centered)<.01,'aim stick dead zone prevents drift');checks+=5;
  const fineStart=await page.evaluate('s.angle');await hold(cdp,{x:aim.x,y:aim.y-10},300);const fineDelta=await page.evaluate('s.angle')-fineStart;
  assert(fineDelta>.02&&fineDelta<(raised-initial)*.6,'small deflections allow finer adjustments than a full push');checks++;
  for(const id of ['aimRange','aimUp','aimDown'])assert(!await page.locator('#'+id).isVisible(),'legacy angle controls stay hidden');
  assert.equal(await page.evaluate('s.shotCount'),0,'releasing aim stick cannot fire');assert.equal(await page.locator('#chargeValue').textContent(),'FIRE','power value lives only in the gauge');checks+=5;
  const field=await fieldDrag(page);assert(field,`${width}x${height}: visible battlefield receives pointer input`);
  const angle=await page.evaluate('s.angle');await drag(cdp,field.start,field.end);assert(await page.evaluate('s.angle')>=angle+4,'actual battlefield touch drag changes the barrel angle');assert.equal(await page.evaluate('s.shotCount'),0,'aiming does not fire');checks+=3;
  const scale=await page.evaluate('visualViewport.scale');
  const touchPoint={x:field.start.x,y:(field.start.y+field.end.y)/2};await tap(cdp,touchPoint);await page.waitForTimeout(80);await tap(cdp,touchPoint);await page.waitForTimeout(180);
  assert(Math.abs(await page.evaluate('visualViewport.scale')-scale)<.02,'double tap must not zoom the game');
  const x=touchPoint.x,y=touchPoint.y;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:11,x:x-18,y},{id:12,x:x+18,y}]});
  for(let i=1;i<=5;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:11,x:x-18-i*9,y},{id:12,x:x+18+i*9,y}]});await page.waitForTimeout(20);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(150);assert(Math.abs(await page.evaluate('visualViewport.scale')-scale)<.02,'pinch must not zoom the game');assert.equal(await page.evaluate('s.shotCount'),0);checks+=3;
  await page.screenshot({path:path.join(output,`touch-ux-${width}x${height}.png`)});
  rows.push({width,height,realFieldDrag:true,aimJoystick:true,aimReleasePreservesAngle:true,aimDeadZone:true,gaugeWidth:geometry.powerHUD.w,gaugeTrackHeight:geometry.track.h,zoomStable:true,levelPanelTouchScroll:scrolled});await context.close();
 }
 // Three independent pointers: movement, angle and charging can run together.
 {
  const {page,context,cdp}=await open(390,844);await page.locator('#play').tap();await page.locator('#previewOK').tap();
  const joystick=await center(page,'stick'),aim=await center(page,'aimStick'),fire=await center(page,'fire'),before=await page.evaluate('({x:s.units[0].x,angle:s.angle})');
  const a={id:1,x:joystick.x+23,y:joystick.y},b={id:2,x:aim.x,y:aim.y-22},c={id:3,...fire};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a,b]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a,b,c]});await page.waitForTimeout(260);
  assert(await page.evaluate('!!charge&&!!stick'),'movement and charge concurrently active');assert(await page.evaluate('s.units[0].x')>before.x,'left stick moves during charge');
  assert(await page.evaluate('s.angle')>before.angle+1,'right stick adjusts angle during charge');checks+=3;
  // CDP touchEnd lists the changed (ending) touches, not the remaining touches.
  // Ending the aim pointer must preserve the held charge and movement pointer.
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[b]});const heldAngle=await page.evaluate('s.angle');
  await page.waitForTimeout(100);assert(await page.evaluate('!!charge&&!!stick'),'aim release cannot release another pointer');assert.equal(await page.evaluate('s.shotCount'),0,'aim release while charging does not fire');
  assert(Math.abs(await page.evaluate('s.angle')-heldAngle)<.01,'released right stick stops changing angle');checks+=3;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[c]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await page.evaluate('s.shotCount'),1,'lifting only fire finger launches once');await page.waitForFunction('s.phase==="aim"||s.phase==="over"',{},{timeout:25000});assert.equal(await page.evaluate('platformStatus.errors.length'),0);checks+=2;await context.close();
 }
 // Native capture loss belongs to its own pointer; the other controls keep working.
 {
  const {page,context,cdp}=await open(390,844);await page.locator('#play').tap();await page.locator('#previewOK').tap();
  const joystick=await center(page,'stick'),aim=await center(page,'aimStick'),fire=await center(page,'fire');
  const points=[{id:41,x:joystick.x+16,y:joystick.y},{id:42,x:aim.x,y:aim.y-22},{id:43,...fire}];
  const moved=dx=>points.map(point=>({...point,x:point.x+dx}));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});
  // A first move promotes pending pointer capture before testing actual loss.
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:moved(9)});await page.waitForTimeout(50);
  await page.evaluate(()=>document.getElementById('aimStick').releasePointerCapture(aimStick.id));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:moved(12)});await page.waitForTimeout(50);
  assert(await page.evaluate('!aimStick&&!!stick&&!!charge'),'losing AIM capture releases AIM only');
  const angle=await page.evaluate('s.angle');await page.waitForTimeout(80);assert.equal(await page.evaluate('s.angle'),angle,'lost aim capture cannot drift');
  await page.evaluate(()=>document.getElementById('fire').releasePointerCapture(charge.id));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:moved(15)});await page.waitForTimeout(50);
  assert(await page.evaluate('!charge&&!!stick'),'losing FIRE capture cancels only the charge');assert.equal(await page.evaluate('s.shotCount'),0,'capture loss never fires');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});assert(await page.evaluate('!stick&&!aimStick&&!charge'),'remaining movement cancels normally');checks+=5;await context.close();
 }
 // Touch cancellation, resize and blur cannot leave either stick or a charge held.
 for(const action of ['touchCancel','resize','blur','pause']){
  const {page,context,cdp}=await open(390,844);await page.locator('#play').tap();await page.locator('#previewOK').tap();
  const joystick=await center(page,'stick'),aim=await center(page,'aimStick'),fire=await center(page,'fire');
  const points=[{id:21,x:joystick.x+22,y:joystick.y},{id:22,x:aim.x,y:aim.y-22},{id:23,...fire}];
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});await page.waitForTimeout(80);
  if(action==='touchCancel')await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  else if(action==='resize')await page.setViewportSize({width:430,height:932});
  else if(action==='pause')await page.keyboard.press('Escape');
  else await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await page.waitForTimeout(120);const stopped=await page.evaluate('({angle:s.angle,x:s.units[0].x,shots:s.shotCount,charge:!!charge,stick:!!stick,aim:!!aimStick})');
  assert(!stopped.charge&&!stopped.stick&&!stopped.aim,action+': both sticks and charge cleared');assert.equal(stopped.shots,0,action+': no accidental shot');
  assert.equal(await page.locator('#aimStickKnob').evaluate(e=>e.style.transform.replace(/\s/g,'')),'translate(0px,0px)',action+': right stick recenters');
  await page.waitForTimeout(120);assert(Math.abs(await page.evaluate('s.angle')-stopped.angle)<.01,action+': no stale aim input');assert(Math.abs(await page.evaluate('s.units[0].x')-stopped.x)<.01,action+': no stale movement');checks+=5;
  if(action!=='touchCancel')await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await page.evaluate('s.shotCount'),0,'late touch release after '+action+' cannot fire');checks++;await context.close();
 }
 // The right slider is also operable when keyboard focus lands on it.
 {
  const {page,context}=await open(390,844);await page.locator('#play').tap();await page.locator('#previewOK').tap();
  await page.locator('#aimStick').focus();const before=await page.evaluate('s.angle');await page.keyboard.press('ArrowUp');
  assert(await page.evaluate('s.angle')>before,'focused aim joystick accepts ArrowUp');const up=await page.evaluate('s.angle');await page.keyboard.press('ArrowDown');
  assert(await page.evaluate('s.angle')<up,'focused aim joystick accepts ArrowDown');assert.equal(await page.evaluate('s.shotCount'),0,'keyboard angle changes do not fire');checks+=3;await context.close();
 }
 // Opening a weapon menu cancels held inputs before the chooser takes focus.
 {
  const {page,context,cdp}=await open(390,844);
  await page.evaluate(()=>{save.data.unlockedWeaponIds=['W01','W02'];save.data.equippedWeaponId='W02';save.data.seenPreviewIds=['v2:controls','v2:W02','v3:controls','v3:W02'];syncLobby();});
  await page.locator('#play').tap();await page.waitForFunction('canAim()');
  const aim=await center(page,'aimStick'),fire=await center(page,'fire'),menu=await center(page,'weaponToggle');
  const a={id:31,x:aim.x,y:aim.y-22},b={id:32,...fire},c={id:33,...menu};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a,b]});await page.waitForTimeout(100);
  assert(await page.evaluate('!!aimStick&&!!charge'),'aim and fire held before opening weapon chooser');
  // A third touch opens the chooser while AIM and FIRE remain physically held.
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a,b,c]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[c]});
  await page.waitForFunction('!document.getElementById("weaponPicker").hidden');
  assert(await page.evaluate('!aimStick&&!charge&&!canAim()'),'weapon chooser cancels both held inputs and blocks aiming');
  const angle=await page.evaluate('s.angle');await page.waitForTimeout(120);assert.equal(await page.evaluate('s.angle'),angle,'aim cannot drift behind weapon chooser');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await page.evaluate('s.shotCount'),0,'releasing old fire pointer behind chooser cannot launch');
  await page.locator('#closeWeapons').tap();assert(await page.evaluate('canAim()'),'closing chooser restores aiming');checks+=5;await context.close();
 }
 // Weapon-specific elevation limits also apply to the continuous aim stick.
 {
  const {page,context,cdp}=await open(390,844);
  await page.evaluate(()=>{save.data.unlockedWeaponIds=['W01','W04'];save.data.equippedWeaponId='W04';save.data.seenPreviewIds=['v2:controls','v2:W04','v3:controls','v3:W04'];syncLobby();});
  await page.locator('#play').tap();await page.waitForFunction('canAim()');assert.equal(await page.evaluate('s.mode'),'W04','equipped Mortar opens the duel');
  await page.locator('#aimStick').focus();await page.keyboard.press('Home');assert.equal(await page.evaluate('s.angle'),55,'Home uses weapon-specific minimum');
  let aim=await center(page,'aimStick');await hold(cdp,{x:aim.x,y:aim.y+22},250);assert.equal(await page.evaluate('s.angle'),55,'downward aim cannot cross Mortar minimum');
  await page.locator('#aimStick').focus();await page.keyboard.press('End');assert.equal(await page.evaluate('s.angle'),85,'End uses upper elevation limit');
  aim=await center(page,'aimStick');await hold(cdp,{x:aim.x,y:aim.y-22},250);assert.equal(await page.evaluate('s.angle'),85,'upward aim cannot cross maximum');
  assert.equal(await page.evaluate('s.shotCount'),0,'clamped aim touches do not fire');checks+=6;await context.close();
 }
 assert.deepEqual(errors,[],'no browser exceptions');
 const report={status:'PASS',recordedAt:new Date().toISOString(),checks,viewports:rows,errors,method:'Real headless Chromium mobile emulation, CDP touch drag/three-finger independent movement-aim-charge/double-tap/pinch, pointer cancellation, resize, blur and focused aiming keyboard, separate preview/footer visibility, v3 preview acknowledgement and touch scrolling; no direct production-handler invocation. Physical iOS/Android zoom behavior remains a device QA item.'};
 fs.writeFileSync(path.join(output,'TOUCH_UX.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));await browser.close();server.close();
})().catch(e=>{console.error(e);server.close();process.exit(1);});
