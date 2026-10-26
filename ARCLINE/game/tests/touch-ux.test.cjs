'use strict';
// Regression coverage uses browser hit-testing and compositor-generated touches,
// rather than calling pointer handlers or bypassing the preview acknowledgement.
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../dist');
const output=process.env.ARCLINE_EVIDENCE_DIR||'/workspace/work/arcline-ux';fs.mkdirSync(output,{recursive:true});
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8'};
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(req.url.split('?')[0]),file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,data)=>{if(err)res.writeHead(404).end();else{res.setHeader('Content-Type',mime[path.extname(file)]||'text/plain');res.end(data);}});
});
const sizes=[[320,568],[360,640],[390,844],[568,320],[640,360],[844,390],[768,1024],[1024,768]];
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
  assert.equal(await page.locator('#replayPreview').count(),0,'redundant demo button removed');assert.equal(await page.locator('#skipPreview').count(),0,'old skip button removed');checks+=3;
  if(width===390){
   const previewId=await page.evaluate('demo.id');assert(await page.evaluate(id=>!save.data.seenPreviewIds.includes(id),previewId),'preview is not acknowledged before OK');
   const before=await page.evaluate('JSON.stringify({units:s.units,skills:s.skills,shots:s.shotCount,round:s.round,angle:s.angle})');
   // A battlefield gesture cannot acknowledge the preview or consume a shot.
   const point={x:width*.3,y:height*.38};await drag(cdp,point,{x:point.x,y:point.y-50});
   await page.keyboard.press('Escape');assert(await page.evaluate('!!demo'),'Escape must not silently start combat');await tap(cdp,await center(page,'fire'));assert(await page.evaluate('!!demo'),'Fire cannot acknowledge the preview');assert(await page.evaluate(id=>!save.data.seenPreviewIds.includes(id),previewId),'blocked gestures do not mark preview seen');
   const duration=await page.evaluate('demo.duration');await page.waitForTimeout(Math.ceil(duration*2200)+200);
   assert(await page.evaluate('!!demo'),'preview continues after more than two cycles');assert(await page.locator('#previewOK').isVisible());
   assert.equal(await page.evaluate('JSON.stringify({units:s.units,skills:s.skills,shots:s.shotCount,round:s.round,angle:s.angle})'),before,'looping preview cannot advance gameplay');checks+=4;
   await page.screenshot({path:path.join(output,'preview-loop-390x844.png')});checks+=3;
  }
  await page.locator('#previewOK').tap();assert(await page.evaluate('!demo&&s.phase==="aim"'),'OK starts aiming');checks++;
  const geometry=await page.evaluate(()=>{
   const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
   const ids=['powerHUD','fire','stick','weaponToggle','aimControl'];const r=Object.fromEntries(ids.map(id=>[id,rect(document.getElementById(id))]));
   r.track=rect(document.getElementById('powerFill').parentElement);r.aimUp=rect(document.getElementById('aimUp'));r.aimDown=rect(document.getElementById('aimDown'));
   r.overflow=document.documentElement.scrollWidth>innerWidth;return r;
  });
  assert(!geometry.overflow,'page must not overflow horizontally');
  assert(geometry.powerHUD.w>=Math.min(280,width-24),`${width}x${height}: wide shot gauge`);assert(geometry.track.h>=26,'thick readable gauge');
  for(const id of ['powerHUD','fire','stick','weaponToggle','aimControl']){const r=geometry[id];assert(r.x>=-.5&&r.y>=-.5&&r.right<=width+.5&&r.bottom<=height+.5,`${width}x${height}/${id} stays inside viewport`);}
  for(const id of ['aimUp','aimDown','fire','weaponToggle']){const r=geometry[id];assert(r.w>=44&&r.h>=44,`${id} remains a usable touch target`);}
  const controls=['fire','stick','weaponToggle','aimControl'];for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++){const a=geometry[controls[i]],b=geometry[controls[j]];assert(!(Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1),`${width}x${height}: ${controls[i]} overlaps ${controls[j]}`);}
  checks+=8;
  const initial=await page.evaluate('s.angle');await page.locator('#aimUp').tap();const raised=await page.evaluate('s.angle');assert(raised>initial,'visible aim up works');await page.locator('#aimDown').tap();assert(await page.evaluate('s.angle')<raised,'visible aim down works');checks+=2;
  const range=await page.locator('#aimRange').evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}),rangeBefore=await page.evaluate('s.angle');await drag(cdp,{x:range.x+range.w*.8,y:range.y+range.h/2},{x:range.x+range.w*.35,y:range.y+range.h/2});assert(Math.abs(await page.evaluate('s.angle')-rangeBefore)>=4,'real range dragging updates barrel angle');assert.equal(await page.evaluate('s.shotCount'),0);checks+=2;
  const field=await fieldDrag(page);assert(field,`${width}x${height}: visible battlefield receives pointer input`);
  const angle=await page.evaluate('s.angle');await drag(cdp,field.start,field.end);assert(await page.evaluate('s.angle')>=angle+4,'actual battlefield touch drag changes the barrel angle');assert.equal(await page.evaluate('s.shotCount'),0,'aiming does not fire');checks+=3;
  const scale=await page.evaluate('visualViewport.scale');
  const touchPoint={x:field.start.x,y:(field.start.y+field.end.y)/2};await tap(cdp,touchPoint);await page.waitForTimeout(80);await tap(cdp,touchPoint);await page.waitForTimeout(180);
  assert(Math.abs(await page.evaluate('visualViewport.scale')-scale)<.02,'double tap must not zoom the game');
  const x=touchPoint.x,y=touchPoint.y;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:11,x:x-18,y},{id:12,x:x+18,y}]});
  for(let i=1;i<=5;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:11,x:x-18-i*9,y},{id:12,x:x+18+i*9,y}]});await page.waitForTimeout(20);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(150);assert(Math.abs(await page.evaluate('visualViewport.scale')-scale)<.02,'pinch must not zoom the game');assert.equal(await page.evaluate('s.shotCount'),0);checks+=3;
  await page.screenshot({path:path.join(output,`touch-ux-${width}x${height}.png`)});
  rows.push({width,height,realFieldDrag:true,aimButtons:true,gaugeWidth:geometry.powerHUD.w,gaugeTrackHeight:geometry.track.h,zoomStable:true,levelPanelTouchScroll:scrolled});await context.close();
 }
 // Real two-finger joystick + charging must still work after making the HUD transparent.
 {
  const {page,context,cdp}=await open(390,844);await page.locator('#play').tap();await page.locator('#previewOK').tap();
  const joystick=await center(page,'stick'),fire=await center(page,'fire'),before=await page.evaluate('s.units[0].x');const a={id:1,x:joystick.x+23,y:joystick.y},b={id:2,...fire};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a,b]});await page.waitForTimeout(260);
  assert(await page.evaluate('!!charge&&!!stick'),'joystick and charge concurrently active');assert(await page.evaluate('s.units[0].x')>before,'joystick moves during charge');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[a]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await page.evaluate('s.shotCount'),1,'lifting fire finger launches once');await page.waitForFunction('s.phase==="aim"||s.phase==="over"',{},{timeout:25000});assert.equal(await page.evaluate('platformStatus.errors.length'),0);checks+=4;await context.close();
 }
 assert.deepEqual(errors,[],'no browser exceptions');
 const report={status:'PASS',checks,viewports:rows,errors,method:'Real headless Chromium mobile emulation, CDP touch drag/two-finger/double-tap/pinch, explicit preview acknowledgement and touch scrolling; no direct production-handler invocation. Physical iOS/Android zoom behavior remains a device QA item.'};
 fs.writeFileSync(path.join(output,'TOUCH_UX.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));await browser.close();server.close();
})().catch(e=>{console.error(e);server.close();process.exit(1);});
