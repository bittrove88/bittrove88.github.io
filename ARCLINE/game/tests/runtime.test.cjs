'use strict';
// Real Chromium QA. Uses the session's Playwright and Chromium, no production dependency.
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../dist'),output=process.env.ARCLINE_EVIDENCE_DIR||'/workspace/work/arcline-browser';fs.mkdirSync(output,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
const server=http.createServer((req,res)=>{const name=decodeURIComponent(req.url.split('?')[0]);const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err)res.writeHead(404).end();else{res.setHeader('Content-Type',mime[path.extname(file)]||'text/plain');res.end(data);}});});
const sdkMock=`globalThis.sdkCalls=[];globalThis.sdkCallbacks={};globalThis.ytgame={IN_PLAYABLES_ENV:true,game:{firstFrameReady(){sdkCalls.push('first')},gameReady(){sdkCalls.push('ready')},async loadData(){sdkCalls.push('load');if(globalThis.loadFail)throw Error('load failed');return JSON.stringify({version:1,cleared:99})},async saveData(raw){sdkCalls.push({save:JSON.parse(raw)})}},system:{isAudioEnabled(){return true},onPause(f){sdkCallbacks.pause=f},onResume(f){sdkCallbacks.resume=f},onAudioEnabledChange(f){sdkCallbacks.audio=f}}};`;
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}/`;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const errors=[],rows=[];let flows=0;
 async function pageFor(size,sdk=false,loadFail=false){const context=await browser.newContext({viewport:size,hasTouch:true});await context.route('https://www.youtube.com/**',r=>sdk?r.fulfill({contentType:'text/javascript',body:sdkMock}):r.abort());if(loadFail)await context.addInitScript(()=>globalThis.loadFail=true);const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));await page.goto(url);await page.waitForFunction('!document.getElementById("play").disabled');return {context,page};}
 for(const [width,height] of [[320,568],[360,640],[390,844],[844,390],[768,1024],[1024,768]]){
  const {page,context}=await pageFor({width,height});await page.locator('#play').click();await page.evaluate('endDemo()');
  const geometry=await page.evaluate(()=>{const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};return {fire:rect('fire'),gauge:rect('powerHUD'),stick:rect('stick'),weapon:rect('weaponToggle'),budget:rect('shotBudget'),overflow:document.documentElement.scrollWidth>innerWidth};});
  assert(!geometry.overflow);assert(geometry.gauge.w>=Math.min(280,width-24),'wide gauge');
  for(const id of ['fire','gauge','stick','weapon']){const r=geometry[id];assert(r.x>=0&&r.y>=0&&r.right<=width+.1&&r.bottom<=height+.1,`${width}/${height}/${id} inside viewport`);}
  assert(geometry.fire.w>=44&&geometry.stick.w>=44&&geometry.weapon.h>=44,'touch targets');
  await page.screenshot({path:path.join(output,`battle-${width}x${height}.png`)});
  // Independent pointer IDs: cancel, out-of-bounds release and lost capture never consume a shot.
  await page.evaluate(()=>{const fire=document.getElementById('fire'),r=fire.getBoundingClientRect();fire.onpointerdown({preventDefault(){},button:0,pointerId:11,clientX:r.x+20,clientY:r.y+20});fire.onpointerup({pointerId:12});if(!charge)throw Error('wrong pointer released charge');fire.onpointercancel({pointerId:11});});
  assert.equal(await page.evaluate('s.shotCount'),0);
  await page.evaluate(()=>{const f=document.getElementById('fire');f.onpointerdown({preventDefault(){},button:0,pointerId:13});f.onpointermove({pointerId:13,clientX:0,clientY:0});f.onpointerup({pointerId:13});});assert.equal(await page.evaluate('s.shotCount'),0);
  await page.keyboard.down('Space');await page.waitForTimeout(100);await page.locator('#pause').click();await page.locator('#resume').click();await page.keyboard.up('Space');assert.equal(await page.evaluate('s.shotCount'),0);
  // Resize cancels active input without firing or spending resources.
  await page.keyboard.down('Space');await page.setViewportSize({width:height,height:width});await page.waitForTimeout(100);await page.keyboard.up('Space');assert.equal(await page.evaluate('s.shotCount'),0);await page.setViewportSize({width,height});
  rows.push({width,height,gaugeGap:geometry.fire.y-geometry.gauge.bottom,touchTargets:true,inputSafety:true});flows+=5;await context.close();
 }
 // Every authored level must actually initialize and render in the production browser bundle.
 {
  const {page,context}=await pageFor({width:390,height:844});await page.locator('#play').click();await page.evaluate('endDemo()');
  const count=await page.evaluate(()=>{let count=0;for(let n=1;n<=100;n++){selectedMap=n-1;start();endDemo();draw();if(s.stage!==n||s.phase!=='aim')throw Error('Level '+n+' failed initialization');count++;}return count;});assert.equal(count,100);
  for(const [n,id] of [[11,'B'],[42,'ceiling-lift'],[96,'gate-choices']]){const unchanged=await page.evaluate(({n,id})=>{selectedMap=n-1;start();endDemo();const before=JSON.stringify({world:s.world,units:s.units,skills:s.skills,round:s.round,shots:s.shotCount});runDemo(id);update(.5,.5);draw();update(.5,.5);draw();const after=JSON.stringify({world:s.world,units:s.units,skills:s.skills,round:s.round,shots:s.shotCount});endDemo();return before===after;},{n,id});assert(unchanged,'local variants cannot advance combat or consume supplies');flows++;}
  for(const n of [10,40,60,80,100]){await page.evaluate(`selectedMap=${n-1};start();endDemo();draw()`);await page.screenshot({path:path.join(output,`boss-${n}.png`)});}
  await page.setViewportSize({width:844,height:390});await page.waitForTimeout(100);await page.screenshot({path:path.join(output,'boss-100-landscape.png')});
  await page.evaluate(`selectedMap=13;start();endDemo();s.weaponId='W04';s.angle=20;document.getElementById('weaponToggle').click()`);assert.equal(await page.evaluate('s.angle'),55,'Mortar legal angle is shown by the barrel');await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate('s.angle'),55);assert(await page.evaluate('(()=>{const m=G.muzzle(s,0,s.angle),p=E.trajectory(s,0,s.angle,70).path[0];return Math.hypot(m.x-p.x,m.y-p.y)<1e-6})()'),'barrel and physics muzzle agree');
  flows+=101;await context.close();
 }
 // Actual browser touch dispatch with two simultaneous fingers; no handler-only simulation.
 {
  const {page,context}=await pageFor({width:390,height:844});await page.locator('#play').click();await page.evaluate('endDemo()');const cdp=await context.newCDPSession(page);
  const points=await page.evaluate(()=>{const point=id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};};return {stick:point('stick'),fire:point('fire')};});
  const sx=await page.evaluate('s.units[0].x');
  const a={id:1,x:points.stick.x+23,y:points.stick.y},b={id:2,...points.fire};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a,b]});await page.waitForTimeout(240);
  assert(await page.evaluate('!!charge&&!!stick'),'two fingers concurrently held');assert(await page.evaluate('s.units[0].x')>sx,'movement while charging');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[a]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await page.evaluate('s.shotCount'),1,'touch release fires exactly once');
  await page.waitForFunction("s.phase==='aim'",{},{timeout:20000});assert(await page.evaluate('platformStatus.cpuJobs.some(j=>j.worker)'),'CPU uses worker');assert.equal(await page.evaluate('platformStatus.errors.length'),0);
  flows+=3;await context.close();
 }
 // Host SDK lifecycle, audio and paused-flight state, migration and failed load.
 for(const loadFail of [false,true]){
  const {page,context}=await pageFor({width:390,height:844},true,loadFail);
  assert.deepEqual(await page.evaluate('sdkCalls.filter(x=>typeof x==="string")'),['first','load','ready']);
  await page.locator('#play').click();await page.evaluate('endDemo()');
  if(!loadFail)assert.equal(await page.evaluate('s.stage'),100);
  await page.keyboard.down('Space');await page.waitForTimeout(120);await page.evaluate('sdkCallbacks.pause()');assert.equal(await page.evaluate('charge'),null);assert(await page.evaluate('document.getElementById("app").inert'));await page.evaluate('sdkCallbacks.resume()');await page.keyboard.up('Space');assert.equal(await page.evaluate('s.shotCount'),0);
  await page.evaluate('sdkCallbacks.audio(false)');await page.keyboard.down('Space');await page.waitForTimeout(80);assert.equal(await page.evaluate('master.gain.value'),0);await page.keyboard.up('Space');
  await page.evaluate('sdkCallbacks.pause()');const f=await page.evaluate('flight');await page.waitForTimeout(150);assert.equal(await page.evaluate('flight'),f);await page.evaluate('sdkCallbacks.resume()');
  await page.evaluate('save.data.collectedCosmeticIds.push("S01");save.save()');await page.evaluate('save.pending');
  const saved=await page.evaluate('sdkCalls.filter(x=>x.save)');if(loadFail)assert.equal(saved.length,0,'failed SDK load never overwritten');else{assert(saved.at(-1).save.collectedCosmeticIds.includes('S01'));assert(saved.at(-1).save.legacyBackup);}
  flows+=5;await context.close();
 }
 assert.deepEqual(errors,[],'no page exceptions');
 const report={status:'PASS',flows,viewports:rows,errors,method:'Real headless Chromium; six emulated viewport sizes, CDP two-finger touch, offline fallback and mocked YouTube SDK. No physical-device or actual YouTube certification claim.'};fs.writeFileSync(path.join(output,'BROWSER.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 await browser.close();server.close();
})().catch(e=>{console.error(e);server.close();process.exit(1);});
