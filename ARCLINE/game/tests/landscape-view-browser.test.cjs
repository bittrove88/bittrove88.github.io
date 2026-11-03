'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),Save=require('../dist/save.js'),Run=require('../dist/campaign-run.js');
const root=path.resolve(__dirname,'../../..'),out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-map-camera';
fs.mkdirSync(out,{recursive:true});let checks=0;const rows=[],errors=[];const ok=(v,m)=>{checks++;assert(v,m);};
const server=http.createServer((req,res)=>{let name=new URL(req.url,'http://localhost').pathname;if(name.endsWith('/'))name+='index.html';const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(error,bytes)=>{if(error)return res.writeHead(404).end();res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.jpeg':'image/jpeg','.m4a':'audio/mp4','.wav':'audio/wav'})[path.extname(file)]||'application/octet-stream');res.end(bytes);});});
const profile=lang=>({schemaVersion:Save.schemaVersion,campaignResetVersion:Save.resetVersion,cleared:100,unlockedCharacterIds:Save.characterIds,joinedCharacterIds:Save.characterIds,difficultyConfirmed:true,journeyStarted:true,seenPreviewIds:Save.previewIds,preferences:{language:lang,controls:'left'},journal:{moviesSeen:['prologue','30','60','epilogue']},onboarding:{step:'done'},chapterRun:Run.checkpoint(7,{weapons:{W06:2},skills:{BURST:2}},[],'fixed-view-test',20261103)});
async function client(page,point){return page.evaluate(p=>{const app=document.getElementById('app'),r=app.getBoundingClientRect(),rotation=Number(app.dataset.viewRotation)||0;if(rotation===90)return{x:r.right-p.y*r.width/app.clientHeight,y:r.top+p.x*r.height/app.clientWidth};if(rotation===-90)return{x:r.left+p.y*r.width/app.clientHeight,y:r.bottom-p.x*r.height/app.clientWidth};if(rotation===180)return{x:r.right-p.x*r.width/app.clientWidth,y:r.bottom-p.y*r.height/app.clientHeight};return{x:r.left+p.x*r.width/app.clientWidth,y:r.top+p.y*r.height/app.clientHeight};},point);}
async function touch(cdp,type,points){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});}
async function drag(page,cdp,from,to){await touch(cdp,'touchStart',[{id:1,...await client(page,from)}]);for(let i=1;i<=8;i++)await touch(cdp,'touchMove',[{id:1,...await client(page,{x:from.x+(to.x-from.x)*i/8,y:from.y+(to.y-from.y)*i/8})}]);await touch(cdp,'touchEnd',[]);}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({executablePath:process.env.ARCLINE_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  for(const [width,height,lang]of[[390,844,'ja'],[360,780,'en'],[240,568,'ja']]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,deviceScaleFactor:2,reducedMotion:lang==='en'?'reduce':'no-preference'});
   await context.addInitScript(data=>{globalThis.testOrientation=0;Object.defineProperty(window,'orientation',{configurable:true,get:()=>testOrientation});localStorage.setItem('arcline-campaign-v1',JSON.stringify(data));localStorage.setItem('arcline-install-guide-v1',JSON.stringify({state:'closed'}));},profile(lang));
   const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));const cdp=await context.newCDPSession(page),tap=async selector=>{await page.locator(selector).tap();if(selector==='#mapCameraClose')try{await page.waitForFunction('!mapCamera.active',{},{timeout:5000});}catch(error){console.log(JSON.stringify({width,close:await page.locator(selector).boundingBox(),data:await page.evaluate('({active:mapCamera.active,events:pointerEvents,viewport:viewport.state})')}));throw error;}};
   await page.goto('http://127.0.0.1:'+server.address().port+'/ARCLINE/game/dist/');await page.waitForFunction('!document.getElementById("play").disabled');await page.evaluate(()=>{globalThis.pointerEvents=[];for(const type of ['pointerdown','pointerup','pointercancel','lostpointercapture','click'])document.addEventListener(type,e=>pointerEvents.push({type,target:e.target.id,x:e.clientX,y:e.clientY,id:e.pointerId,prevented:e.defaultPrevented}));});await tap('#play');await page.waitForFunction('!!s');
   await page.waitForFunction('!hostPaused()&&viewport.state.rotation===90');
   ok(await page.locator('[data-landscape-toggle],[data-landscape-flip]').count()===0,'landscape is mandatory without an off toggle');
   ok(await page.evaluate('viewport.state.width>viewport.state.height&&canAim()&&!document.getElementById("rotationGate")'),'portrait launch automatically stays landscape');
   ok(await page.evaluate('document.getElementById("world").clientWidth')===height,'logical canvas width follows landscape, not browser portrait');
   ok(await page.evaluate('getComputedStyle(document.getElementById("stick")).width')=== '84px','landscape CSS stays active in portrait browser');
   for(const id of ['stick','aimStick','fire','pause','mapCameraToggle']){
    const r=await page.locator('#'+id).boundingBox();ok(r.x>=-.1&&r.y>=-.1&&r.x+r.width<=width+.1&&r.y+r.height<=height+.1,'rotated control fits '+id+'/'+width);
    ok(await page.locator('#'+id).evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===e||e.contains(hit);}), 'rotated control receives touch '+id);
   }
   await page.evaluate(()=>{for(let i=0;i<20&&Math.abs(s.units[0].slope)<.05;i++)E.move(s,0,12);s.angle=50;hud();draw();});
   await page.screenshot({path:path.join(out,'fixed-battle-'+width+'.png')});
   const saved=await page.evaluate('JSON.stringify(save.data)'),before=await page.evaluate('JSON.stringify(E.trajectory(s,0,s.angle,65))');
   await tap('#mapCameraToggle');await page.screenshot({path:path.join(out,'fixed-overview-'+width+'.png')});await tap('#mapCameraIn');
   for(let i=0;i<6&&!await page.locator('#mapCameraIn').isDisabled();i++)await tap('#mapCameraIn');
   const r=await page.evaluate('ArcViewport.rect(document.getElementById("mapCameraPan"),document.getElementById("app"))'),v=await page.evaluate('renderer.view');
   await drag(page,cdp,{x:r.left+r.width*.5,y:r.top+r.height*.5},{x:r.left+r.width*.5-70,y:r.top+r.height*.5-20});
   ok(await page.evaluate('renderer.view.x')<v.x-20,'portrait touch pans in logical landscape direction');
   await page.screenshot({path:path.join(out,'fixed-landscape-'+width+'.png')});await tap('#mapCameraClose');
   ok(await page.evaluate('JSON.stringify(E.trajectory(s,0,s.angle,65))')===before,'fixed view camera does not change sloped trajectory');
   if(width===240)for(let attempt=0;attempt<6;attempt++){
    await tap('#mapCameraToggle');await tap('#mapCameraIn');await tap('#mapCameraIn');
    const f=await page.evaluate('ArcViewport.rect(document.getElementById("mapCameraPan"),document.getElementById("app"))');
    await drag(page,cdp,{x:f.left+f.width*.5,y:f.top+f.height*.5},{x:f.left+f.width*.5-25,y:f.top+f.height*.5-15});
    await tap('#mapCameraClose');ok(await page.evaluate('canAim()&&!mapCamera.active&&!charge&&!shot'),'rapid pan/close reliably restores combat '+attempt);
   }
   const inverse=await page.evaluate(()=>{const r=ArcViewport.rect(document.getElementById('fire'),document.getElementById('app')),native=document.getElementById('fire').getBoundingClientRect(),p=ArcViewport.point(native.x+native.width/2,native.y+native.height/2,document.getElementById('app'));return Math.hypot(p.x-(r.left+r.width/2),p.y-(r.top+r.height/2));});ok(inverse<1e-5,'rotated touch center matches logical control center');
   await page.evaluate(()=>{globalThis.aimEvents=[];for(const type of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture'])document.addEventListener(type,e=>aimEvents.push({type,id:e.pointerId,target:e.target.id,x:e.clientX,y:e.clientY,axis:input.aimAxis,angle:s.angle,allowed:canAim()}));});
   const aim=await page.evaluate('ArcViewport.rect(document.getElementById("aimStick"),document.getElementById("app"))'),center={x:aim.left+aim.width/2,y:aim.top+aim.height/2};
   await touch(cdp,'touchStart',[{id:1,...await client(page,center)}]);await touch(cdp,'touchMove',[{id:1,...await client(page,{x:center.x,y:center.y-22})}]);try{await page.waitForFunction('s.angle>52',{},{timeout:5000});}catch(error){console.log(JSON.stringify({width,diagnostic:await page.evaluate('({angle:s.angle,axis:input.aimAxis,active:input.active,host:hostPaused(),view:viewport.state,events:aimEvents,allEvents:pointerEvents,screen:ArcScreens.active,camera:mapCamera.active,wp:document.getElementById("weaponPicker").hidden,skill:document.getElementById("skillPicker").hidden,aim:ArcViewport.rect(document.getElementById("aimStick"),document.getElementById("app"))})')}));throw error;}await touch(cdp,'touchEnd',[]);
   ok(await page.evaluate('s.angle')>52,'aim joystick correctly raises angle in rotated view');
   const angle=await page.evaluate('s.angle');
   await page.evaluate(()=>testOrientation=90);await page.setViewportSize({width:height,height:width});await page.waitForFunction('viewport.state.rotation===0');
   ok(await page.evaluate('!hostPaused()&&canAim()&&s.angle')===angle,'native landscape transition keeps battle and angle');
   await page.evaluate(()=>{testOrientation=-90;dispatchEvent(new Event('orientationchange'));});await page.waitForFunction('viewport.state.rotation===180');
   ok(await page.evaluate('!hostPaused()&&s.angle')===angle,'opposite native landscape automatically retains the physical right edge at top');
   await page.evaluate(()=>testOrientation=180);await page.setViewportSize({width,height});await page.waitForFunction('viewport.state.rotation===-90');
   ok(await page.evaluate('!hostPaused()&&canAim()&&s.angle')===angle,'return to portrait does not pause');
   await tap('#mapCameraToggle');await tap('#mapCameraIn');await tap('#mapCameraClose');
   ok(await page.evaluate('JSON.stringify(save.data)')===saved,'view configuration and camera never mutate campaign save');
   // Always-on orientation must not depend on a saved opt-in preference.
   await page.reload();await page.waitForFunction('!document.getElementById("play").disabled');
   ok(await page.evaluate('viewport.state.width>viewport.state.height&&viewport.state.rotation===90'),'fresh reload always uses the right-edge-up landscape direction');await tap('#play');await page.waitForFunction('!!s&&canAim()');
   if(width===390){await page.evaluate(()=>playStoryMovie('prologue',()=>{},true));await page.waitForFunction('ArcStoryView.active');const time=await page.evaluate('ArcStoryView.state.age');await page.waitForTimeout(250);ok(await page.evaluate('!hostPaused()&&ArcStoryView.state.age')>time,'prologue plays on the fixed landscape surface');await page.evaluate(()=>ArcStoryView.close(true));}
   await page.evaluate(()=>{testOrientation=180;dispatchEvent(new Event('orientationchange'));});await page.waitForFunction('viewport.state.rotation===-90');
   const fire=await page.evaluate('ArcViewport.rect(document.getElementById("fire"),document.getElementById("app"))'),fp=await client(page,{x:fire.left+fire.width/2,y:fire.top+fire.height/2});
   await touch(cdp,'touchStart',[{id:3,...fp}]);await page.waitForFunction('!!charge');await page.waitForTimeout(140);await touch(cdp,'touchEnd',[]);await page.waitForFunction('!!shot');
   ok(await page.evaluate('s.shotCount===1'),'reverse-rotated fire control produces exactly one shot');
   rows.push({width,height,lang,rotations:[90,-90,180],status:'PASS'});await context.close();
  }
  ok(errors.length===0,errors.join('\n'));fs.writeFileSync(path.join(out,'LANDSCAPE_VIEW_BROWSER.json'),JSON.stringify({status:'PASS',checks,rows,errors,scope:'Chromium real touch in portrait, CSS/viewport rotation, hit targets, app-local aim and camera, fixed physical edge, native-angle changes, resize, always-on reload and real firing. Physical iPhone Safari remains unverified.'},null,2));console.log({status:'PASS',checks,rows});
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
