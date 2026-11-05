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
    // Candidate is injected into the *real game state* for comparison. No shipped level is modified.
    const candidate=require('./stage_057_design_candidate_20261106.json').stageData;
    await page.locator('#mapCameraClose').click();
    const designState=await page.evaluate(data=>{
      const G=ArcEngine.geometry;
      const components=data.parts.map((p,i)=>({
        id:'057-C'+String(i+1).padStart(2,'0'),
        poly:p.poly||[[p.x,p.top],[p.x+p.width,p.top],[p.x+p.width,p.bottom],[p.x,p.bottom]],
        destructible:p.breakable??p.kind==='wall'
      }));
      s.spec={...s.spec,floors:[data.floor],components,features:data.features,spawn:data.spawnPoints,terrainRevision:data.terrainRevision};
      s.effects={...s.effects,destroyed:[],broken:0};
      s.world=G.world(s.spec,s.round,s.bossPhase,s.effects);
      s.units.forEach((u,i)=>{
        const [x,h]=data.spawnPoints[i],pos=G.safePosition(s.world,x*10,500-h*10);
        if(!pos)throw Error('Unsafe candidate spawn '+i);
        Object.assign(u,pos,{range:[35,965],facing:i?-1:1});
      });
      renderer.resetCamera(); hud();draw();
      return {spawn:s.units.map(u=>({x:u.x,y:u.y,surface:u.surface})),solids:s.world.solids.map(o=>({id:o.id,kind:o.kind,poly:o.poly})),regions:s.world.regions};
    },candidate);
    await page.locator('#mapCameraToggle').click();
    await page.waitForFunction('mapCamera.active && renderer.view.scale>0');
    await page.screenshot({path:path.join(out,'stage_057_candidate_engine_full_view.png'),fullPage:true});
    designState.view=await page.evaluate(()=>({...renderer.view}));
    const overlay=await page.evaluate(()=>{
      const canvas=document.getElementById('world'),ctx=canvas.getContext('2d'),v=renderer.view,dpr=Math.min(devicePixelRatio||1,2);
      ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.translate(v.x,v.y);ctx.scale(v.scale,v.scale);
      for(const o of s.world.solids){
        ctx.beginPath();o.poly.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();
        ctx.strokeStyle=o.kind==='reflector'?'#00ddbb':o.destructible?'#ff629d':o.kind==='floor'?'#fbe7ac':'#b299ff';ctx.lineWidth=2/v.scale;ctx.stroke();
      }
      for(let i=0;i<2;i++){const u=s.units[i];ctx.beginPath();ctx.arc(u.x,u.y,24,0,Math.PI*2);ctx.strokeStyle=i?'#ffb36b':'#caff89';ctx.lineWidth=3/v.scale;ctx.stroke();}
      ctx.restore();
      return {view:v,solids:s.world.solids.map(o=>({id:o.id,kind:o.kind,destructible:!!o.destructible,poly:o.poly})),regions:s.world.regions,units:s.units.map(u=>({x:u.x,y:u.y,hp:u.hp,surface:u.surface}))};
    });
    await page.screenshot({path:path.join(out,'stage_057_candidate_collision_overlay.png'),fullPage:true});
    await page.evaluate(()=>{s.effects.destroyed=['057-C01@0'];s.world=ArcEngine.geometry.world(s.spec,s.round,s.bossPhase,s.effects);draw();});
    await page.screenshot({path:path.join(out,'stage_057_candidate_window_open.png'),fullPage:true});
    fs.writeFileSync(path.join(out,'stage_057_candidate_engine_snapshot.json'),JSON.stringify({...designState,overlay,comparison:{beforeScale:before.camera.scale,afterScale:overlay.view.scale,source:'real game renderer and collider; candidate only'}},null,2)+'\\n');
    assert.equal(designState.spawn.length,2);
    assert(Math.abs(before.camera.scale-overlay.view.scale)<.02,'Before and after must share virtually same scale');
        assert.equal(errors.length,0,'Uncaught page errors: '+errors.join('; '));
    console.log('STAGE_057_ENGINE_CAPTURE PASS',JSON.stringify({stage:before.stage,worldWidth:before.worldWidth,solids:before.solids.length,surfaces:before.surfaces.length,regions:before.regions.length,camera:before.camera,errors:errors.length}));
    await context.close();
  }finally{await b.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});