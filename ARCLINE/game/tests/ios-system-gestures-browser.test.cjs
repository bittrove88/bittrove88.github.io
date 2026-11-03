'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),Save=require('../dist/save.js'),Run=require('../dist/campaign-run.js');
const root=path.resolve(__dirname,'../../..'),out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-ios-edges';fs.mkdirSync(out,{recursive:true});let checks=0;const rows=[],errors=[];const ok=(v,m)=>{checks++;assert(v,m);};
const server=http.createServer((req,res)=>{let name=new URL(req.url,'http://localhost').pathname;if(name.endsWith('/'))name+='index.html';const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(error,data)=>{if(error)return res.writeHead(404).end();res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.jpeg':'image/jpeg','.m4a':'audio/mp4','.wav':'audio/wav'})[path.extname(file)]||'application/octet-stream');res.end(data);});});
const seed={schemaVersion:Save.schemaVersion,campaignResetVersion:Save.resetVersion,cleared:6,journeyStarted:true,difficultyConfirmed:true,seenPreviewIds:Save.previewIds,preferences:{language:'ja',controls:'left'},journal:{moviesSeen:['prologue']},onboarding:{step:'done'},chapterRun:Run.checkpoint(7,{weapons:{W06:2},skills:{BURST:2}},[],'ios-edge-test',20261103)};
async function swipe(cdp,from,to){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:5,...from}]});for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:5,x:from.x+(to.x-from.x)*i/8,y:from.y+(to.y-from.y)*i/8}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({executablePath:process.env.ARCLINE_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const [width,height,recoverFullscreen]of[[393,852,false],[844,390,true],[568,320,false]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,deviceScaleFactor:2,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'});
  await context.addInitScript(({seed,recoverFullscreen})=>{localStorage.setItem('arcline-campaign-v1',JSON.stringify(seed));localStorage.setItem('arcline-install-guide-v1',JSON.stringify({state:'closed'}));globalThis.nativeRequests=0;globalThis.nativeExits=0;globalThis.nativeActive=recoverFullscreen;
   Object.defineProperty(document,'fullscreenElement',{configurable:true,get:()=>nativeActive?document.documentElement:null});
   Element.prototype.requestFullscreen=async()=>{nativeRequests++;};Element.prototype.webkitRequestFullscreen=async()=>{nativeRequests++;};
   document.exitFullscreen=async()=>{nativeExits++;nativeActive=false;document.dispatchEvent(new Event('fullscreenchange'));};
   globalThis.edgeEvents=[];for(const type of ['touchstart','touchmove','touchend','gesturestart','gesturechange','gestureend'])document.addEventListener(type,e=>edgeEvents.push({type,prevented:e.defaultPrevented,target:e.target.id||e.target.tagName}));
  },{seed,recoverFullscreen});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));const cdp=await context.newCDPSession(page);
  await page.goto('http://127.0.0.1:'+server.address().port+'/ARCLINE/game/dist/');await page.waitForFunction('!document.getElementById("play").disabled');
  ok(await page.evaluate('ArcViewport.isIOS()'),'iPhone is detected');ok(await page.evaluate('!ArcFullscreen.active()'),'native immersive mode is exited');
  if(recoverFullscreen)ok(await page.evaluate('nativeExits')===1,'already active fullscreen exits exactly once');
  ok(await page.locator('[data-fullscreen]:visible').count()===0,'iPhone fullscreen actions are hidden');await page.evaluate(()=>ArcFullscreen.enter());ok(await page.evaluate('nativeRequests')===0,'automatic enter never requests iPhone fullscreen');
  const area=await page.locator('#app').boundingBox();ok(area.x>=23.9&&area.y>=23.9&&area.x+area.width<=width-23.9&&area.y+area.height<=height-23.9,'physical edges stay outside the transformed app '+width);
  const edges=await page.evaluate(()=>[[2,2],[innerWidth-2,2],[2,innerHeight-2],[innerWidth/2,innerHeight-2]].map(([x,y])=>!document.getElementById('app').contains(document.elementFromPoint(x,y))));ok(edges.every(Boolean),'all physical OS edge starts hit outside game');
  ok(await page.evaluate('getComputedStyle(document.body).touchAction==="auto"&&getComputedStyle(document.body).overscrollBehavior==="auto"'),'outer document leaves browser gestures native');
  await page.locator('#play').tap();await page.waitForFunction('!!s&&canAim()&&!demo');
  const before=await page.evaluate('JSON.stringify({angle:s.angle,units:s.units,stock:I.fromState(s),shots:s.shotCount})'),saved=await page.evaluate('JSON.stringify(save.data)');
  await swipe(cdp,{x:width/2,y:height-2},{x:width/2,y:height-90});await swipe(cdp,{x:width-2,y:2},{x:width-2,y:95});
  ok(await page.evaluate('JSON.stringify({angle:s.angle,units:s.units,stock:I.fromState(s),shots:s.shotCount})')===before,'home/control-center gesture starts never aim, move or fire');
  ok(await page.evaluate('edgeEvents.some(e=>e.type==="touchstart")&&edgeEvents.every(e=>!e.prevented)'),'physical edge touch stream is not cancelled by game');
  const gestures=await page.evaluate(()=>['gesturestart','gesturechange','gestureend'].map(type=>{const e=new Event(type,{bubbles:true,cancelable:true});document.body.dispatchEvent(e);return e.defaultPrevented;}));ok(gestures.every(x=>!x),'outer WebKit gestures remain uncancelled');
  await page.locator('#mapCameraToggle').tap();await page.waitForFunction('mapCamera.active');await page.locator('#mapCameraIn').tap();await page.locator('#mapCameraClose').tap();await page.waitForFunction('!mapCamera.active&&canAim()');
  ok(await page.evaluate('JSON.stringify(save.data)')===saved,'edge handling and camera preserve campaign save');
  const fire=await page.locator('#fire').boundingBox();ok(fire.x>=23&&fire.y>=23&&fire.x+fire.width<=width-23&&fire.y+fire.height<=height-23,'fire stays away from OS edges');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:7,x:fire.x+fire.width/2,y:fire.y+fire.height/2}]});await page.waitForFunction('!!charge');await page.waitForTimeout(140);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForFunction('!!shot');ok(await page.evaluate('s.shotCount===1'),'interior charge and single-shot release still work');
  await page.screenshot({path:path.join(out,'ios-system-edges-'+width+'.png')});rows.push({width,height,recoverFullscreen,status:'PASS'});await context.close();
 }
 ok(!errors.length,errors.join('\n'));fs.writeFileSync(path.join(out,'IOS_SYSTEM_EDGES.json'),JSON.stringify({status:'PASS',checks,rows,errors,scope:'Real Chromium with iPhone UA: physical edge hit targets and uncancelled web touch/gesture events, no immersive requests, recovery, interior camera/fire/save. Native iOS Home/Control Center cannot be exercised by this browser; physical iPhone remains unverified.'},null,2));console.log({status:'PASS',checks,rows});
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
