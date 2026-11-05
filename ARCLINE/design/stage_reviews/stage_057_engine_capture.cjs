'use strict';
// Stage 057 actual-engine capture. Uses the shipped game HTML, render.js and geometry.js.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const save=require('../../game/dist/save.js');
const root=path.resolve(__dirname,'../../..');
const out=process.env.ARCLINE_STAGE_057_EVIDENCE_DIR||'/tmp/stage-057-evidence';
fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const full=path.resolve(root,'.'+(name.endsWith('/')?name+'index.html':name));
  if(!full.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(full,(err,data)=>{
    if(err){res.writeHead(404);return res.end();}
    res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.jpg':'image/jpeg','.wav':'audio/wav'})[path.extname(full)]||'application/octet-stream');
    res.end(data);
  });
});
(async()=>{
  await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
  const b=await chromium.launch({executablePath:process.env.ARCLINE_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox']});
  const errors=[],requests=[];
  try{
    const context=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
    await context.addInitScript(state=>{
      localStorage.setItem('arcline-campaign-v1',JSON.stringify(state));
      localStorage.setItem('arcline-install-guide-v1',JSON.stringify({state:'closed'}));
    },{schemaVersion:8,campaignResetVersion:2,cleared:99,difficulty:'normal',journeyStarted:true,difficultyConfirmed:true,onboarding:{step:'done'},unlockedCharacterIds:save.characterIds,seenPreviewIds:save.previewIds,journal:{moviesSeen:['prologue','30','60']}});
    const page=await context.newPage();
    page.on('pageerror',e=>errors.push(String(e)));
    page.on('requestfailed',r=>requests.push({url:r.url(),reason:r.failure()?.errorText}));
    await page.goto('http://127.0.0.1:'+server.address().port+'/ARCLINE/game/dist/');
    await page.waitForFunction('save.ready&&!document.getElementById("play").disabled',{timeout:20000});
    await page.evaluate(()=>{
      lobby(); selectedMap=56; start(); endDemo();
      encounter=null; document.getElementById('encounterBanner').hidden=true;
      cancelAnimationFrame(raf); raf=0; hud(); draw();
    });
    const before=await page.evaluate(()=>({
      stage:s.stage,revision:s.spec.terrainRevision,worldWidth:s.spec.worldWidth||1000,
      spec:{...s.spec},units:s.units.map(u=>({x:u.x,y:u.y,hp:u.hp,surface:u.surface,facing:u.facing})),
      solids:s.world.solids.map(o=>({id:o.id,kind:o.kind,destructible:!!o.destructible,poly:o.poly})),
      surfaces:s.world.surfaces.map(o=>({id:o.id,points:o.points})),
      regions:s.world.regions,actionLimit:s.shotLimit
    }));
    assert.equal(before.stage,57,'Actual loaded stage must be 57');
    assert.equal(before.actionLimit,16,'Do not alter existing action limit');
    await page.screenshot({path:path.join(out,'stage_057_engine_normal.png'),fullPage:true});
    await page.locator('#mapCameraToggle').click();
    await page.waitForFunction('mapCamera.active && Number.isFinite(renderer.view.scale) && renderer.view.scale>0');
    await page.screenshot({path:path.join(out,'stage_057_engine_full_view.png'),fullPage:true});
    before.camera=await page.evaluate(()=>({...renderer.view}));
    before.browser={viewport:{width:1440,height:900},url:'ARCLINE/game/dist/',capture:'Actual game canvas via render.js, full-map camera',errors,requests};
    fs.writeFileSync(path.join(out,'stage_057_engine_snapshot.json'),JSON.stringify(before,null,2)+'\n');
    assert.equal(errors.length,0,'Uncaught page errors: '+errors.join('; '));
    console.log('STAGE_057_ENGINE_CAPTURE PASS',JSON.stringify({stage:before.stage,worldWidth:before.worldWidth,solids:before.solids.length,surfaces:before.surfaces.length,regions:before.regions.length,camera:before.camera,errors:errors.length}));
    await context.close();
  }finally{await b.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});