'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),Save=require('../dist/save.js'),Run=require('../dist/campaign-run.js');
const root=path.resolve(__dirname,'../../..'),out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-map-camera';
fs.mkdirSync(out,{recursive:true});let checks=0;const rows=[],errors=[];
function ok(v,m){checks++;assert(v,m);}
const server=http.createServer((req,res)=>{
 let name=new URL(req.url,'http://localhost').pathname;if(name.endsWith('/'))name+='index.html';
 const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(error,bytes)=>{if(error)return res.writeHead(404).end();res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.jpeg':'image/jpeg','.m4a':'audio/mp4','.wav':'audio/wav'})[path.extname(file)]||'application/octet-stream');res.end(bytes);});
});
async function drag(page,cdp,touch,from,to,cancel=false){
 if(touch){
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,...from}]});
  for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:from.x+(to.x-from.x)*i/8,y:from.y+(to.y-from.y)*i/8}]});
  await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});
 }else{await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:8});await page.mouse.up();}
}
const profile=lang=>({schemaVersion:Save.schemaVersion,campaignResetVersion:Save.resetVersion,cleared:100,unlockedCharacterIds:Save.characterIds,joinedCharacterIds:Save.characterIds,difficulty:'hard',difficultyConfirmed:true,journeyStarted:true,seenPreviewIds:Save.previewIds,preferences:{language:lang,controls:'left'},journal:{moviesSeen:['prologue','30','60','epilogue']},onboarding:{step:'done'},chapterRun:Run.checkpoint(7,{weapons:{W06:2},skills:{BURST:2}},[],'camera-regression',20261103)});
const battleSnapshot=()=>JSON.stringify({angle:s.angle,power:s.power,units:s.units,shots:s.shotCount,phase:s.phase,skills:s.skills,weapon:s.mode,teleport:s.teleportMode,selectedSkill:s.selectedSkill,inventory:s.inventory,special:s.specialAmmo,world:s.world});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:process.env.ARCLINE_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  for(const [width,height,lang,touch]of[[844,390,'ja',true],[568,240,'ja',true],[1440,900,'en',false],[932,430,'en',true]]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,deviceScaleFactor:touch?2:1});
   await context.addInitScript(data=>{localStorage.setItem('arcline-campaign-v1',JSON.stringify(data));localStorage.setItem('arcline-install-guide-v1',JSON.stringify({state:'closed'}));},profile(lang));
   const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));const cdp=await context.newCDPSession(page);
   const activate=selector=>touch?page.locator(selector).tap():page.locator(selector).click();
   await page.goto('http://127.0.0.1:'+server.address().port+'/ARCLINE/game/dist/');await page.waitForFunction('!document.getElementById("play").disabled');
   await activate('#play');await page.waitForFunction('!!s&&!demo&&canAim()');
   await page.evaluate(()=>{for(let k=0;k<20&&Math.abs(s.units[0].slope)<.05;k++)E.move(s,0,12);s.angle=E.clamp(64,minimumAngle(),maximumAngle());hud();draw();});
   ok(await page.evaluate('Math.abs(s.units[0].slope)>.05'),'aim regression starts on an actual slope');
   const toggle=await page.locator('#mapCameraToggle').boundingBox();
   ok(toggle.width===52&&toggle.height===36&&toggle.x>=0&&toggle.y>=0&&toggle.x+toggle.width<=width+1,'camera toggle is visible touch target '+width);
   const initial=await page.evaluate(battleSnapshot),saveBefore=await page.evaluate('JSON.stringify(save.data)'),trajectory=await page.evaluate('JSON.stringify(E.trajectory(s,0,s.angle,65))');
   await activate('#mapCameraToggle');await page.waitForFunction('mapCamera.active');
   ok(await page.evaluate('!canAim()&&document.getElementById("battle").inert&&ArcScreens.active==="mapCamera"'),'inspection blocks combat and owns focus');
   const frozen=await page.evaluate('JSON.stringify(s)');await page.waitForTimeout(180);
   ok(await page.evaluate('JSON.stringify(s)')===frozen,'engine is frozen while inspecting');
   ok(await page.evaluate(battleSnapshot)===initial,'entry does not alter angle, position, stock or combat');
   ok(await page.evaluate(()=>{const a=ArcMapCamera.bounds(s),v=renderer.view,f=mapCamera.options.presentationFrame;return a.left*v.scale+v.x>=0&&a.right*v.scale+v.x<=innerWidth&&a.top*v.scale+v.y>=f.top-.01&&a.bottom*v.scale+v.y<=f.bottom+.01;}),'overview contains entire map and actors');
   for(const id of ['mapCameraIn','mapCameraOut','mapCameraFit','mapCameraClose']){
    const r=await page.locator('#'+id).boundingBox();ok(r.width>=44&&r.height>=44&&r.y>=0&&r.x>=0&&r.x+r.width<=width+1&&r.y+r.height<=height+1,'camera action fits '+id+'/'+width);
   }
   await page.screenshot({path:path.join(out,'overview-'+width+'.png')});
   for(let i=0;i<3;i++)await activate('#mapCameraIn');
   const v0=await page.evaluate('renderer.view'),r=await page.locator('#mapCameraPan').boundingBox();
   const from={x:r.x+r.width*.55,y:r.y+r.height*.5},to={x:from.x-95,y:from.y-25};
   await drag(page,cdp,touch,from,to);
   const v1=await page.evaluate('renderer.view');ok(Math.hypot(v0.x-v1.x,v0.y-v1.y)>20,'real drag pans '+width);
   if(touch){
    const second={id:2,x:from.x+35,y:from.y+10};
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,...from},second]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:from.x+20,y:from.y}, {...second,x:second.x+40}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    ok(await page.evaluate('!charge&&!shot&&viewport.state.scale===1'),'two camera fingers cannot fire or zoom the browser');
   }
   await page.locator('#mapCameraPan').focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowRight');await page.keyboard.press('Space');
   ok(await page.evaluate(battleSnapshot)===initial&&await page.evaluate('!charge&&!shot'),'camera arrows/Space never aim, move or fire');
   await page.keyboard.press('0');ok(await page.locator('#mapCameraOut').isDisabled(),'0 restores full map');
   // Cancelled/out-of-surface drag cannot remain latched after returning.
   await activate('#mapCameraIn');await drag(page,cdp,touch,from,to,true);
   await activate('#mapCameraClose');
   ok(await page.evaluate('!mapCamera.active&&!document.getElementById("battle").inert&&canAim()'),'closing restores playable battle');
   ok(await page.evaluate('document.activeElement.id==="mapCameraToggle"'),'closing returns focus to camera toggle');
   ok(await page.evaluate(battleSnapshot)===initial&&await page.evaluate('JSON.stringify(save.data)')===saveBefore,'inspection never changes battle or persistent progress');
   ok(await page.evaluate('JSON.stringify(E.trajectory(s,0,s.angle,65))')===trajectory,'same trajectory after manual zoom/pan');
   const inverse=await page.evaluate(()=>{const m=G.muzzle(s,0,s.angle),v=renderer.view,r=document.getElementById('world').getBoundingClientRect(),p=renderer.toWorld(r.left+(m.x*v.scale+v.x)*r.width/document.getElementById('world').clientWidth,r.top+(m.y*v.scale+v.y)*r.height/document.getElementById('world').clientHeight);return Math.hypot(p.x-m.x,p.y-m.y);});
   ok(inverse<1e-6,'screen/world transform remains invertible at DPR '+width);
   // Actual world gesture still adjusts aim after leaving inspection.
   const canvas=await page.locator('#world').boundingBox();
   await drag(page,cdp,touch,{x:canvas.x+canvas.width*.65,y:canvas.y+canvas.height*.45},{x:canvas.x+canvas.width*.65,y:canvas.y+canvas.height*.45+25});
   ok(await page.evaluate('s.angle')<JSON.parse(initial).angle-2,'normal drag aims again after inspection');
   await activate('#mapCameraToggle');
   const angle=await page.evaluate('s.angle');
   await page.setViewportSize({width:height,height:width});await page.waitForTimeout(100);
   ok(await page.locator('#rotationGate').isHidden()&&await page.evaluate('!hostPaused()&&viewport.state.width>viewport.state.height'),'portrait browser automatically keeps camera landscape');
   await page.setViewportSize({width,height});await page.waitForFunction('!hostPaused()');
   ok(await page.evaluate('mapCamera.active&&s.angle')===angle,'rotation preserves camera mode and aim');
   await activate('#mapCameraClose');
   // Teleport selection and its trajectory survive a separate inspection session.
   await activate('#warpToggle');
   ok(await page.evaluate('s.teleportMode'),'teleport remains available on sloped terrain');
   const teleport=await page.evaluate('JSON.stringify(E.trajectory(s,0,s.angle,65))');
   await activate('#mapCameraToggle');await activate('#mapCameraIn');
   await page.evaluate(()=>pauseHost('sdk'));
   ok(await page.evaluate('mapCamera.active&&hostPaused()&&!charge'),'host pause safely suspends inspection');
   await page.evaluate(()=>resumeHost('sdk'));
   await activate('#mapCameraClose');
   ok(await page.evaluate('s.teleportMode&&JSON.stringify(E.trajectory(s,0,s.angle,65))')===teleport,'teleport trajectory and selection unchanged after camera and host pause');
   await activate('#warpToggle');
   // CSS viewport scaling uses the same app-local coordinate conversion.
   await page.evaluate(()=>{document.getElementById('app').style.transform='scale(.85)';draw();});
   await activate('#mapCameraToggle');for(let i=0;i<7&&!await page.locator('#mapCameraIn').isDisabled();i++)await activate('#mapCameraIn');
   const scaled=await page.locator('#mapCameraPan').boundingBox(),sv=await page.evaluate('renderer.view');
   await drag(page,cdp,touch,{x:scaled.x+scaled.width*.6,y:scaled.y+scaled.height*.5},{x:scaled.x+scaled.width*.6-50,y:scaled.y+scaled.height*.5});
   ok(await page.evaluate('renderer.view.x')<sv.x-30,'drag uses app-local units under page scaling '+JSON.stringify({width,scaled,sv,next:await page.evaluate('renderer.view'),frame:await page.evaluate('mapCamera.options')}));
   await page.keyboard.press('Escape');
   ok(await page.evaluate('!mapCamera.active&&canAim()'),'Escape closes through screen manager');
   await page.evaluate(()=>{document.getElementById('app').style.transform='';viewport.fit();draw();});
   // Hold/release remains a single real shot, with inspection unavailable while held.
   const fire=await page.locator('#fire').boundingBox();
   const p={x:fire.x+fire.width/2,y:fire.y+fire.height/2};
   if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:4,...p}]});else{await page.mouse.move(p.x,p.y);await page.mouse.down();}
   await page.waitForFunction('!!charge');ok(await page.locator('#mapCameraToggle').isDisabled(),'camera unavailable while charging');
   await page.waitForTimeout(120);
   if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();
   await page.waitForFunction('!!shot');ok(await page.evaluate('!mapCamera.active&&s.shotCount===1'),'one release produces one shot after camera use');
   rows.push({width,height,lang,touch,status:'PASS'});await context.close();
  }
  ok(errors.length===0,errors.join('\n'));fs.writeFileSync(path.join(out,'MAP_CAMERA_BROWSER.json'),JSON.stringify({status:'PASS',checks,rows,errors,scope:'Real Chromium mouse/touch, viewport scaling, rotation, camera bounds, frozen battle/save/trajectory, aim restoration and hold/release. Physical devices not tested.'},null,2));console.log({status:'PASS',checks,rows});
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
