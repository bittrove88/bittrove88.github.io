'use strict';
// Real compositor page scaling exercises the retained-zoom recovery separately
// from synthetic Safari gesture cancellation. This is not physical iOS QA.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../dist'),output=process.env.ARCLINE_EVIDENCE_DIR||'/workspace/work/arcline-dual-stick';fs.mkdirSync(output,{recursive:true});
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err)res.writeHead(404).end();else{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(file.endsWith('index.html')?data.toString().replace('maximum-scale=1,user-scalable=no','maximum-scale=5,user-scalable=yes'):data);}});});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 let checks=0;const rows=[],errors=[];const ok=(a,m)=>{assert(a,m);checks++;};
 ok(fs.readFileSync(path.join(root,'index.html'),'utf8').includes('maximum-scale=1,user-scalable=no'),'production viewport retains zoom restriction');
 async function verifyFit(page,label){
  const data=await page.evaluate(()=>{const a=document.getElementById('app'),r=a.getBoundingClientRect(),v=visualViewport,c=document.getElementById('world'),cr=c.getBoundingClientRect(),u=s.units[0],view=renderer.view,x=cr.left+(view.x+u.x*view.scale)*cr.width/c.clientWidth,y=cr.top+(view.y+u.y*view.scale)*cr.height/c.clientHeight,p=renderer.toWorld(x,y);return {scale:v.scale,left:v.offsetLeft,top:v.offsetTop,width:v.width,height:v.height,app:{left:r.left,top:r.top,width:r.width,height:r.height},canvas:{width:c.width,height:c.height,logicalWidth:c.clientWidth,logicalHeight:c.clientHeight},mapped:{x:p.x,y:p.y,expectedX:u.x,expectedY:u.y},controls:['pause','fire','stick','aimStick'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,left:r.left,top:r.top,right:r.right,bottom:r.bottom,hit:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('#'+id)?.id};})};});
  ok(Math.abs(data.app.left-data.left)<1&&Math.abs(data.app.top-data.top)<1&&Math.abs(data.app.width-data.width)<1&&Math.abs(data.app.height-data.height)<1,label+': full game follows visual viewport');
  ok(Math.abs(data.mapped.x-data.mapped.expectedX)<.01&&Math.abs(data.mapped.y-data.mapped.expectedY)<.01,label+': rendered rover maps back to world coordinates');
  const dpr=await page.evaluate('Math.min(devicePixelRatio||1,2)');ok(data.canvas.width===Math.round(data.canvas.logicalWidth*dpr)&&data.canvas.height===Math.round(data.canvas.logicalHeight*dpr),label+': canvas backing remains logical size');
  for(const r of data.controls){ok(r.left>=data.left-1&&r.top>=data.top-1&&r.right<=data.left+data.width+1&&r.bottom<=data.top+data.height+1,label+': '+r.id+' visible');ok(r.hit===r.id,label+': '+r.id+' hit test');}
  return data;
 }
 for(const [width,height] of [[390,844],[568,320]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true});await context.route('https://www.youtube.com/**',r=>r.abort());const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction('!document.getElementById("play").disabled&&document.getElementById("app").style.position==="fixed"');const cdp=await context.newCDPSession(page);
  await page.locator('#play').tap();await page.locator('#previewOK').tap();
  const before=await page.evaluate('({hp:s.units[0].hp,shots:s.shotCount,phase:s.phase,stage:s.stage})');
  // The test server relaxes only the viewport meta limits to emulate Safari
  // retaining zoom despite those production limits; gesture guards stay intact.
  for(const scale of [1.5,2,1]){
   await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:scale});await page.waitForTimeout(120);
   const fitted=await page.evaluate(()=>{
    const vv=visualViewport,a=document.getElementById('app'),r=a.getBoundingClientRect(),ids=['pause','fire','stick','aimStick','powerHUD'];
    return {scale:vv.scale,app:{left:r.left,top:r.top,width:r.width,height:r.height},viewport:{left:vv.offsetLeft,top:vv.offsetTop,width:vv.width,height:vv.height},logical:{width:a.clientWidth,height:a.clientHeight},controls:ids.map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect(),p=ArcViewport.point(r.left+r.width/2,r.top+r.height/2,a);return {id,x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height,local:p,hit:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('#'+id)?.id};}),world:{width:document.getElementById('world').clientWidth,height:document.getElementById('world').clientHeight},state:{hp:s.units[0].hp,shots:s.shotCount,phase:s.phase,stage:s.stage}};
   });
   ok(Math.abs(fitted.scale-scale)<.02,'CDP injected actual visual scale');
   ok(Math.abs(fitted.app.left-fitted.viewport.left)<1&&Math.abs(fitted.app.top-fitted.viewport.top)<1,'app follows visual viewport offset');
   ok(Math.abs(fitted.app.width-fitted.viewport.width)<1&&Math.abs(fitted.app.height-fitted.viewport.height)<1,'app fits visible rectangle after retained browser zoom');
   ok(Math.abs(fitted.logical.width-width)<1&&Math.abs(fitted.logical.height-height)<1,'logical layout stays stable under inverse scaling');
   ok(fitted.world.width===fitted.logical.width&&fitted.world.height===fitted.logical.height,'canvas logical size matches recovered UI');
   for(const r of fitted.controls){ok(r.x>=fitted.viewport.left-1&&r.y>=fitted.viewport.top-1&&r.right<=fitted.viewport.left+fitted.viewport.width+1&&r.bottom<=fitted.viewport.top+fitted.viewport.height+1,`${r.id} remains visible at ${scale}`);if(r.id!=='powerHUD')ok(r.hit===r.id,`${r.id} hit-tests at its recovered position`);}
   assert.deepEqual(fitted.state,before,'fitting cannot reload or advance the duel');checks++;
   rows.push({width,height,requestedScale:scale,...fitted});
   if(scale===2){
    await page.screenshot({path:path.join(output,`retained-zoom-${width}x${height}.png`)});
    await cdp.send('Input.synthesizeScrollGesture',{x:60,y:60,xDistance:-20,yDistance:-40,gestureSourceType:'mouse'});await page.waitForTimeout(100);
    const panned=await verifyFit(page,'scale 2 panned');ok(panned.left>0&&panned.top>0,'CDP created actual visual viewport pan');rows.at(-1).panned=panned;
    await page.locator('#pause').tap();ok(await page.locator('#overlay').isVisible(),'recovered pause button accepts a real tap at scale 2');await page.locator('#resume').tap();ok(await page.locator('#overlay').isHidden(),'recovered resume button accepts a real tap at scale 2');
    const aim=await page.locator('#aimStick').boundingBox(),angle=await page.evaluate('s.angle');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:7,x:aim.x+aim.width/2,y:aim.y+aim.height/2-11}]});await page.waitForTimeout(300);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    ok(await page.evaluate('s.angle')>angle+2,'recovered aiming stick uses logical deflection at scale 2');ok(await page.evaluate('!aimStick&&s.shotCount===0'),'recovered aim release recenters without firing');
    await page.setViewportSize({width:height,height:width});await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:2});await page.waitForFunction(({w,h})=>{const a=document.getElementById('app');return Math.abs(a.clientWidth-w)<1&&Math.abs(a.clientHeight-h)<1&&Math.abs(visualViewport.scale-2)<.01;},{w:height,h:width});await page.waitForTimeout(70);rows.at(-1).rotated=await verifyFit(page,'rotated while scale 2');
    await page.setViewportSize({width,height});await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:2});await page.waitForFunction(({w,h})=>{const a=document.getElementById('app');return Math.abs(a.clientWidth-w)<1&&Math.abs(a.clientHeight-h)<1&&Math.abs(visualViewport.scale-2)<.01;},{w:width,h:height});await page.waitForTimeout(70);rows.at(-1).restored=await verifyFit(page,'returned orientation while scale 2');
   }
  }
  // Safari's proprietary gesture path is canceled, while buttons retain taps.
  const canceled=await page.evaluate(()=>['gesturestart','gesturechange','gestureend'].map(type=>{const e=new Event(type,{bubbles:true,cancelable:true});document.getElementById('world').dispatchEvent(e);return e.defaultPrevented;}));ok(canceled.every(Boolean),'Safari gesture events canceled on game');
  await page.locator('#pause').tap();ok(await page.locator('#overlay').isVisible(),'native button tap still opens pause');await page.locator('#resume').tap();ok(await page.locator('#overlay').isHidden(),'native button tap still resumes');
  // A repeated tap and real two-finger pinch on the world cannot magnify it.
  const field={x:width*.45,y:height*.39};
  const tap=async()=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,...field}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};await tap();await page.waitForTimeout(70);await tap();await page.waitForTimeout(100);ok(Math.abs(await page.evaluate('visualViewport.scale')-1)<.02,'real world double tap cannot magnify');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:field.x-16,y:field.y},{id:2,x:field.x+16,y:field.y}]});for(let i=1;i<=5;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:field.x-16-i*9,y:field.y},{id:2,x:field.x+16+i*9,y:field.y}]});await page.waitForTimeout(20);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});ok(Math.abs(await page.evaluate('visualViewport.scale')-1)<.02,'real pinch cannot magnify');
  // One-finger scrolling in Journey must survive the game gesture guard.
  await page.evaluate('lobby()');await page.locator('#chooseLevel').tap();const panel=await page.locator('.level-panel').evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.right-8,y:r.y,height:r.height,overflow:e.scrollHeight>e.clientHeight+10};});
  if(panel.overflow){const start={x:panel.x,y:panel.y+panel.height*.8},end={x:panel.x,y:panel.y+panel.height*.25};await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:3,...start}]});for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:3,x:start.x,y:start.y+(end.y-start.y)*i/8}]});await page.waitForTimeout(20);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(100);ok(await page.locator('.level-panel').evaluate(e=>e.scrollTop>0),'Journey one-finger scrolling preserved');}
  await context.close();
 }
 assert.deepEqual(errors,[]);checks++;const report={status:'PASS',recordedAt:new Date().toISOString(),checks,rows,errors,testViewportMeta:'Only test-server HTML response relaxes meta zoom limits to emulate Safari ignoring production maximum-scale=1; production source remains restricted.',method:'Chromium CDP forced visual viewport scales 1.5/2/1, recovered UI bounds and hit testing, actual double-tap/pinch, native button taps, and one-finger panel scrolling; synthetic proprietary Safari gesture cancellation only. Browser scale remains present but game is inverse-fitted; physical iOS Safari unverified.'};fs.writeFileSync(path.join(output,'VIEWPORT.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks,rows:rows.length,errors},null,2));await browser.close();server.close();
})().catch(e=>{console.error(e);server.close();process.exit(1);});
