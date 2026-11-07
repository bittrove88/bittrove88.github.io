'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-expedition-013';fs.mkdirSync(out,{recursive:true});let checks=0;const ok=(v,m)=>{checks++;assert(v,m);};
const release=require('../game/runtime.json');
const active=['ARCLINE/index.html','ARCLINE/game/dist/index.html','ARCLINE/game/dist/app.webmanifest','ARCLINE/characters/index.html','ARCLINE/characters/ARCLINE_Characters_Preview.html','ARCLINE/updates/'+release.version+'/index.html','ARCLINE/cinematics/index.html','ARCLINE/design/expedition_013/index.html','ARCLINE/design/expedition_013/arcline_100_maps_atlas.html','catalog/index.html'];
for(const name of active){const text=fs.readFileSync(path.join(root,name),'utf8');for(const m of text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').matchAll(/(?:src|href)="([^"]+)"/g)){if(/^(data:|https?:|mailto:|javascript:)/.test(m[1]))continue;const u=new URL(m[1],'http://local/'+name);let f=path.join(root,decodeURIComponent(u.pathname));if(u.pathname.endsWith('/'))f+='index.html';ok(fs.existsSync(f),'active local reference '+name+' -> '+m[1]);}if(!name.includes('catalog/')&&!name.includes('/design/'))ok(!text.includes('v=0.12.0'),'all active cache keys are0.14 '+name);}
const entries=fs.readFileSync(path.join(root,'catalog/index.html'),'utf8').match(/id="ARCLINE"/g)||[];ok(entries.length===1,'exactly one ARCLINE catalog card');ok(fs.existsSync(path.join(root,'.nojekyll'))&&!fs.existsSync(path.join(root,'CNAME')),'Pages root hosting metadata');ok(!/<a\b|refresh|location\./i.test(fs.readFileSync(path.join(root,'index.html'),'utf8')),'root remains blank without redirects');
const allowed=['ARCLINE','catalog'],violations=[],scanned=[];
function walk(dir){for(const d of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,d.name);if(d.isDirectory()&&['node_modules','__pycache__','.git'].includes(d.name))continue;if(d.isDirectory())walk(f);else if(/\.(html|js)$/.test(f)){const rel=path.relative(root,f);scanned.push(rel);const text=fs.readFileSync(f,'utf8');for(const m of text.matchAll(/(?:href\s*=|location(?:\.href)?\s*=|location\.(?:assign|replace)\(|window\.open\()\s*["'](\/[^\/"'\s]+)["']/g)){const u=new URL(m[1],'http://local'),segment=u.pathname.split('/')[1];if(segment&&!allowed.includes(segment))violations.push({file:rel,target:m[1]});}}}}
walk(path.join(root,'ARCLINE'));ok(!violations.length,'all ARCLINE HTML/JS cross-content transitions use catalog '+JSON.stringify(violations));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'ARCLINE/game/dist/app.webmanifest')));ok(manifest.id==='/ARCLINE/game/dist/'&&manifest.start_url==='./?v='+release.version&&manifest.display==='standalone','stable install identity and new start URL');
const types={'.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json'},server=http.createServer((q,r)=>{let f=path.join(root,new URL(q.url,'http://local').pathname);if(f.endsWith('/'))f+='index.html';fs.readFile(f,(e,b)=>{if(e)return r.writeHead(404).end();r.setHeader('Content-Type',types[path.extname(f)]||'text/html');r.end(b);});});
async function nativeAtlas(p,base,width){
 const stored=await p.evaluate(()=>{
  localStorage.setItem('arcline-campaign-v1','{"cleared":37,"sentinel":"atlas-view-only"}');
  localStorage.setItem('arcline-language','ja');
  return JSON.stringify(Object.entries(localStorage).sort());
 });
 await p.goto(base+'/ARCLINE/design/expedition_013/arcline_100_maps_atlas.html');
 await p.waitForFunction(()=>!!window.ArcMapAtlas);
 await p.evaluate(()=>ArcMapAtlas.renderAll());
 const metrics=await p.evaluate(()=>ArcMapAtlas.metrics);
 ok(metrics.tiles===104&&metrics.rendered===104&&metrics.uniqueMaps===103,'all100 stages and4 final arenas rendered '+width);
 ok(metrics.scenes.length===33&&!metrics.errors.length,'all33 current backgrounds without rendering errors '+width);
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'native atlas width '+width);
 if(width===1440){
  for(let n=2;n<=6;n++){
   await p.locator('#atlasTurn').selectOption(String(n));
   await p.evaluate(()=>ArcMapAtlas.renderAll());
   ok((await p.evaluate(()=>ArcMapAtlas.metrics)).rendered===104,'all maps render environment turn '+n);
  }
  await p.locator('#atlasTurn').selectOption('1');await p.evaluate(()=>ArcMapAtlas.renderAll());
  await p.screenshot({path:path.join(out,'native-atlas-desktop.png')});
 }
 await p.locator('#atlasMode').selectOption('geometry');
 ok(await p.locator('.tile>svg').first().isVisible(),'geometry view remains available '+width);
 await p.locator('#atlasMode').selectOption('native');await p.locator('#filter').selectOption('7');
 ok(await p.locator('.atlas-open').count()===5,'theme filter '+width);
 await p.locator('.atlas-open').first().click();
 ok((await p.evaluate(()=>ArcMapAtlas.current)).round===1,'initial environment is turn1 '+width);
 const scale=await p.evaluate(()=>ArcMapAtlas.current.view.scale);
 await p.locator('#atlasIn').click();ok(await p.evaluate(s=>ArcMapAtlas.current.view.scale>s,scale),'native zoom '+width);
 await p.locator('#atlasFit').click();await p.locator('#atlasModalTurn').selectOption('2');
 ok((await p.evaluate(()=>ArcMapAtlas.current)).round===2,'selected environment is turn2 '+width);
 ok(await p.locator('#atlasDialog').evaluate(e=>e.scrollWidth<=e.clientWidth),'modal has no horizontal clipping '+width);
 await p.screenshot({path:path.join(out,'native-stage31-'+width+'.png')});
 if(width===1440){
  const downloaded=p.waitForEvent('download');await p.locator('#atlasPng').click();
  const image=await downloaded;await image.saveAs(path.join(out,'native-stage31-turn2.png'));
  ok(fs.readFileSync(path.join(out,'native-stage31-turn2.png')).subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'PNG export');
 }
 await p.locator('#atlasClose').click();await p.locator('#filter').selectOption('20');
 await p.locator('#finalMapGrid .atlas-open').nth(3).click();await p.locator('#atlasModalTurn').selectOption('2');
 const final=await p.evaluate(()=>ArcMapAtlas.current);
 ok(final.stage===100&&final.arena===3&&final.round===2&&final.scene==='final-100-3','final fourth arena and selected turn '+width);
 if(width===1440)await p.screenshot({path:path.join(out,'native-final4-desktop.png')});
 await p.keyboard.press('Escape');ok(!await p.locator('#atlasDialog').isVisible(),'Escape closes enlarged view '+width);
 ok(await p.evaluate(before=>JSON.stringify(Object.entries(localStorage).sort())===before,stored),'viewer leaves all stored game data/settings intact '+width);
 if(width===1440){
  const downloaded=p.waitForEvent('download');await p.locator('#atlasDownload').click();
  const html=await downloaded,file=path.join(out,'ARCLINE_100_MAP_ATLAS_v'+release.version+'.html');await html.saveAs(file);
  const requests=[],exported=await p.context().newPage();
  await exported.route(base+'/atlas-export.html',route=>route.fulfill({contentType:'text/html',body:fs.readFileSync(file)}));
  exported.on('request',r=>requests.push(r.url()));
  await exported.goto(base+'/atlas-export.html');await exported.waitForFunction(()=>!!window.ArcMapAtlas);
  await exported.evaluate(()=>ArcMapAtlas.renderAll());
  ok((await exported.evaluate(()=>ArcMapAtlas.metrics)).uniqueMaps===103,'exported HTML reloads all maps');
  ok(await exported.locator('#atlasMode').count()===1&&await exported.locator('#filter option').count()===21,'export reload does not duplicate controls');
  ok(requests.length===1,'standalone export needs no external scripts,images or styles');
  await exported.close();
 }
}
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.ARCLINE_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox']}),errors=[],bad=[],sizes=[];try{for(const [width,height]of[[360,780],[844,390],[768,1024],[1440,900]]){const c=await browser.newContext({viewport:{width,height},hasTouch:width<1000}),p=await c.newPage();p.on('pageerror',e=>errors.push(String(e)));p.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))bad.push(r.url());});const base='http://127.0.0.1:'+server.address().port;
 await p.goto(base+'/ARCLINE/design/expedition_013/');ok(await p.locator('.maps article').count()===100,'100 maps in atlas '+width);ok(await p.locator('.theme').count()===20,'20 themes '+width);ok(await p.locator('.maps svg').count()===100,'100 actual geometry diagrams '+width);ok(await p.evaluate('document.documentElement.scrollWidth<=innerWidth'),'atlas width '+width);await p.locator('#stage-61 summary').click();ok((await p.locator('#stage-61 details').innerText()).includes('精密'),'precision route expands '+width);ok((await p.locator('#stage-61 details').innerText()).includes('実戦成立'),'measured route visible '+width);
 if(width===1440)await p.screenshot({path:path.join(out,'stage-atlas-desktop.png')});
 await nativeAtlas(p,base,width);
 await p.goto(base+'/ARCLINE/updates/'+release.version+'/');ok((await p.locator('main').innerText()).includes('現在の攻略記録を引き継ぎます'),'release explains preservation '+width);ok(await p.evaluate('document.documentElement.scrollWidth<=innerWidth'),'release width '+width);
 await p.goto(base+'/catalog/');const columns=await p.locator('.grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);ok(columns===(width<=600?1:width<=900?2:3),'catalog responsive grid '+width);ok(await p.locator('a#ARCLINE').count()===1,'catalog card preserved '+width);await p.locator('a#ARCLINE').click();ok(await p.locator('h1').count()===1,'catalog opens current site '+width);sizes.push({width,height,atlas:true,nativeAtlas:true,release:true,catalogColumns:columns});await c.close();}
 ok(!errors.length,errors.join('\n'));ok(!bad.length,bad.join('\n'));const report={status:'PASS',checks,activePages:active,scannedArclinePagesAndScripts:scanned.length,crossContentViolations:violations,viewports:sizes,errors,badRequests:bad,scope:'Active local references/cache keys, stable manifest ID, blank root/.nojekyll/no CNAME, every ARCLINE HTML/JS literal cross-content transition,100 geometry diagrams and disclosures; native atlas104 cards/103 maps/33 backgrounds at4 sizes,all6 environment turns on desktop,zoom/filters/final4,PNG and standalone HTML reload with no subrequests; stored sentinel preserved;release notice and catalog layout.'};fs.writeFileSync(path.join(out,'RELEASE_WEB.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:'PASS',checks,viewports:sizes.length}));
 }finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
