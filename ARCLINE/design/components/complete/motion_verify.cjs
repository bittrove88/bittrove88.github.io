'use strict';
// Browser evidence and shareable recordings for the art study; no game files are written.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),cp=require('node:child_process'),crypto=require('node:crypto');
const {chromium}=require('../../../node_modules/playwright'),root=__dirname,out=process.env.ARCLINE_MOTION_EVIDENCE_DIR||'/tmp/arcline-field-motion';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function encode(args){const r=cp.spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y',...args],{encoding:'utf8',maxBuffer:1024*1024});if(r.status!==0)throw Error(r.stderr||String(r.error));}
async function main(){
 fs.mkdirSync(out,{recursive:true});
 const model=JSON.parse(fs.readFileSync(path.join(root,'motion-cases.json'))),E=require('../../../game/dist/engine.js'),pool=[];
 for(let stage=1;stage<=100;stage++){
  const s=E.campaign(stage,{matchSeed:1});for(const round of [1,2,3])for(const effects of [{},{broken:1},{broken:2},{thinCloud:true}])pool.push(...E.geometry.world(s.spec,round,0,effects).regions);
 }
 for(const c of model.cases)assert.ok(pool.some(r=>Object.entries(c.state).every(([k,v])=>r[k]===v)),c.id+' state missing from current geometry');
 const server=http.createServer((req,res)=>{const f=path.resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'gimmick-motion.html');if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.json':'application/json','.gif':'image/gif','.mp4':'video/mp4','.png':'image/png'})[path.extname(f)]||'text/plain');res.end(fs.readFileSync(f));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;const errors=[],external=[];
 try{
  browser=await chromium.launch({executablePath:process.env.ARCLINE_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:1280,height:900}}),origin=`http://127.0.0.1:${server.address().port}`;
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(origin))external.push(r.url());});
  await page.goto(origin+'/gimmick-motion.html');await page.evaluate(()=>{GimmickPreview.pause();return document.fonts.ready;});
  const integrity=await page.evaluate(()=>{const before=JSON.stringify(COLLECTION);const freeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.freeze(o);Object.values(o).forEach(freeze);}};freeze(COLLECTION);return before;});
  const drawing=await page.evaluate(()=>{
   const assert=(x,m)=>{if(!x)throw Error(m);},data=COLLECTION.motion,stats=[];let contextFrames=0;
   function pixels(c,t,reduced=false,context=data.contexts[0],motion=true){const graph={...context.graph,nodes:[...context.graph.nodes,...c.nodes]},canvas=document.createElement('canvas');canvas.width=1000;canvas.height=430;ArcComponentCollection.draw(canvas.getContext('2d'),1000,430,graph,{fieldMotion:motion,hideFields:!motion,time:t,reducedMotion:reduced});return canvas.getContext('2d').getImageData(0,0,1000,430).data;}
   function changed(a,b){let n=0;for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])n++;return n;}
   for(const c of data.cases){
    const active=c.state.on!==false&&(c.state.strength??1)>0,a=pixels(c,0),b=pixels(c,1.25),n=changed(a,b),ink=changed(a,pixels(c,0,false,data.contexts[0],false));assert(active?n>20:n===0,'motion state '+c.id);assert(changed(pixels(c,0,true),pixels(c,3,true))===0,'reduced motion '+c.id);
    for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2]){const x=i/4%1000,y=Math.floor(i/4/1000),r=c.nodes[0].motion;assert(r.kind==='M'?Math.hypot(x-r.x,y-r.y)<=r.radius+2:x>=r.x1-1&&x<=r.x2+1&&y>=r.y1-1&&y<=r.y2+1,'motion outside region '+c.id);}
    for(const context of data.contexts)for(const t of [0,1,3,7]){pixels(c,t,false,context);contextFrames++;}
    stats.push({id:c.id,active,movingPixels:n,cuePixels:ink});
   }
   const stat=id=>stats.find(s=>s.id===id);assert(changed(pixels(data.cases.find(c=>c.id==='wind-weak'),0),pixels(data.cases.find(c=>c.id==='wind-right'),0))===0,'wind appearance unchanged by strength');assert(changed(pixels(data.cases.find(c=>c.id==='wind-weak'),.75*.35/.18),pixels(data.cases.find(c=>c.id==='wind-right'),.75))<20,'wind strength encoded by speed');assert(stat('magnet-weak').cuePixels<stat('magnet-positive').cuePixels,'weak magnetic density');
   const probe=document.createElement('canvas').getContext('2d');probe.setTransform(2,0,0,2,9,13);probe.globalAlpha=.37;probe.filter='blur(1px)';probe.setLineDash([3,7]);
   const state=()=>JSON.stringify([Array.from(probe.getTransform().toFloat64Array()),probe.globalAlpha,probe.filter,probe.getLineDash()]);const before=state();ArcComponentCollection.draw(probe,1000,430,{...data.contexts[0].graph,nodes:[...data.contexts[0].graph.nodes,...data.cases[6].nodes]},{fieldMotion:true,time:2});assert(state()===before,'motion context state');
   const walk=a=>[a,...(a.children||[]).flatMap(walk)];let frames=0,badges=0;
   for(const g of Object.values(COLLECTION.maps)){
    const all=g.nodes.flatMap(walk),fieldNodes=new Set(all.filter(n=>n.role==='field').flatMap(walk));
    for(const n of all){if(n.role==='field'){const active=n.sourceState.on!==false&&(n.sourceState.strength??1)>0,paths=n.children.filter(c=>c.role==='fieldFrame');assert(paths.length===(active&&n.sourceState.kind==='M'?1:0),'magnet frame only');if(!active)assert(n.children.length===0,'inactive field hidden');frames+=paths.length;}if(n.role==='stateBadge')badges++;if(n.opacity!==undefined)assert(fieldNodes.has(n),'opacity limited to fields');}
   }assert(badges===0,'no routine ON/OFF labels');
   return {cases:stats,contextFrames,transparentFramePaths:frames,opaqueBadges:badges,reducedMotionCases:data.cases.length,motionContextRestored:true};
  });
  let controls=0;
  for(const effect of ['C','F','U','V','M']){await page.locator('#effect').selectOption(effect);const cases=await page.locator('#case option').evaluateAll(items=>items.map(o=>o.value));for(const id of cases){await page.locator('#case').selectOption(id);assert.equal(await page.evaluate(()=>motionPreviewState.caseId),id);controls++;}}
  await page.locator('#effect').selectOption('F');await page.locator('#cycle').check();
  const cycleStates=[];for(const t of [0,4,8,12]){await page.evaluate(t=>GimmickPreview.renderAt(t),t);cycleStates.push(await page.evaluate(()=>motionPreviewState.caseId));}assert.deepEqual(cycleStates,['wind-right','wind-left','wind-weak','wind-off']);
  await page.locator('#play').click();await page.waitForTimeout(180);assert.ok(await page.evaluate(()=>motionPreviewState.time>12));await page.locator('#play').click();
  const frozen=await page.evaluate(()=>motionPreviewState.time);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>motionPreviewState.time),frozen);
  await page.locator('#reduced').check();assert.equal(await page.evaluate(()=>motionPreviewState.playing),false);await page.locator('#reduced').uncheck();
  const layouts=[];for(const [width,height]of [[1280,900],[844,390],[568,240],[393,852]])for(const layout of ['focus','grid']){await page.setViewportSize({width,height});await page.locator('#layout').selectOption(layout);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));layouts.push({width,height,layout});await page.screenshot({path:path.join(out,`motion-${layout}-${width}.png`),fullPage:true});}
  // A deterministic renderer for export. Each frame uses the exact same vector and motion functions as the page.
  await page.evaluate(()=>{globalThis.exportFrame=(type,time,index=0)=>{const data=COLLECTION.motion,c=document.createElement('canvas'),ctx=c.getContext('2d');if(type==='grid'){c.width=1100;c.height=Math.round(780*1100/1600);ArcComponentCollection.draw(ctx,c.width,c.height,data.overview,{fieldMotion:true,time});}else{c.width=1000;c.height=530;const sample=data.cases[index],context=data.contexts[({F:0,U:0,V:1,M:1,C:2})[sample.effect]];ctx.fillStyle='#F3F0E8';ctx.fillRect(0,0,1000,530);ctx.font='600 24px "Noto Sans CJK JP",sans-serif';ctx.fillStyle='#304748';ctx.fillText(sample.title,24,33);ctx.font='15px "Noto Sans CJK JP",sans-serif';ctx.fillText(sample.note,24,61);ctx.save();ctx.translate(0,78);ArcComponentCollection.draw(ctx,1000,430,{...context.graph,nodes:[...context.graph.nodes,...sample.nodes]},{fieldMotion:true,time});ctx.restore();ctx.font='12px "Noto Sans CJK JP",sans-serif';ctx.fillStyle='#726B62';ctx.fillText('演出見本・ゲーム未統合 / 2秒ずつ状態を比較。ゲームの手番周期ではありません。',24,524);}return c.toDataURL('image/png').split(',')[1];};});
  for(let frame=0;frame<192;frame++){const data=await page.evaluate(t=>exportFrame('grid',t),frame/12);fs.writeFileSync(path.join(out,`grid-${String(frame).padStart(4,'0')}.png`),Buffer.from(data,'base64'));}
  encode(['-framerate','12','-i',path.join(out,'grid-%04d.png'),'-filter_complex','split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4','-loop','0',path.join(root,'gimmick-motion.gif')]);
  const order=['cloud','cloud-thin','wind-right','wind-left','wind-weak','wind-off','updraft','vent-on','vent-off','magnet-positive','magnet-negative','magnet-weak','magnet-off'];
  for(let frame=0;frame<520;frame++){const slot=Math.floor(frame/40),id=order[slot],index=model.cases.findIndex(c=>c.id===id);const data=await page.evaluate(({time,index})=>exportFrame('focus',time,index),{time:(frame%40)/20,index});fs.writeFileSync(path.join(out,`focus-${String(frame).padStart(4,'0')}.png`),Buffer.from(data,'base64'));}
  encode(['-framerate','20','-i',path.join(out,'focus-%04d.png'),'-c:v','libx264','-pix_fmt','yuv420p','-crf','23','-movflags','+faststart',path.join(root,'gimmick-motion.mp4')]);
  assert.equal(await page.evaluate(()=>JSON.stringify(COLLECTION)),integrity,'data mutated');assert.equal(await page.evaluate(()=>localStorage.length),0);assert.equal(errors.length,0);assert.equal(external.length,0);
  const reducedPage=await browser.newPage({reducedMotion:'reduce'});await reducedPage.goto(origin+'/gimmick-motion.html');assert.equal(await reducedPage.evaluate(()=>motionPreviewState.playing),false);assert.equal(await reducedPage.locator('#reduced').isChecked(),true);await reducedPage.close();
  const recordings=['gimmick-motion.gif','gimmick-motion.mp4'].map(file=>({file,bytes:fs.statSync(path.join(root,file)).size,sha256:hash(fs.readFileSync(path.join(root,file)))}));
  const report={scope:'Independent art motion study, not game integration or ballistic simulation.',gameStateExamples:13,...drawing,uiSelections:controls,cycleStates,layouts,frameOpacity:.25,frameWidth:1,framedKinds:['M'],inactiveHidden:true,fieldBadges:0,windStrengthEncoding:'speed-only',pauseResume:true,reducedMotionPreference:true,dataImmutable:true,saveWrites:0,javaScriptErrors:errors,externalHTTP:external,recordings,videoFrames:520,gifFrames:192};
  fs.writeFileSync(path.join(root,'motion-validation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,cases:report.cases.length},null,2));
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
