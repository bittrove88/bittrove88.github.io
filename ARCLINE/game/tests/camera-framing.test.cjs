'use strict';
// Real Chromium frames the production renderer, including the exact Tideclaw
// part-break sequence and a stale out-of-arena reward capsule regression.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../dist'),output=process.env.ARCLINE_EVIDENCE_DIR||'/workspace/work/arcline-clarity/camera';fs.mkdirSync(output,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
const server=http.createServer((req,res)=>{const name=req.url.split('?')[0],file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}const source=file.endsWith('/render.js')&&process.env.ARCLINE_RENDER_SOURCE?process.env.ARCLINE_RENDER_SOURCE:file;fs.readFile(source,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'text/plain');res.end(data);});});
const sizes=[[1614,892],[1366,768],[390,844],[320,568],[568,320],[844,390],[768,1024],[1024,768]];
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});const errors=[],rows=[];let checks=0;
 try{
  for(const [width,height] of sizes){
   const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:width<900});await context.route('https://www.youtube.com/**',r=>r.abort());const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction('!document.getElementById("play").disabled');
   await page.evaluate(()=>{cancelAnimationFrame(raf);raf=0;selectedMap=0;start();encounter=null;endDemo();hud();});
   const sample=await page.evaluate(()=>{
    const failures=[],samples=[];let rendered=0,checks=0;
    const check=(v,d)=>{checks++;if(!v)failures.push(d);};
    function frame(state,options){renderer.draw(state,{...options,reducedMotion:true});rendered++;return {...renderer.view};}
    for(let n=1;n<=100;n++){
     const state=E.campaign(n),geometry=JSON.stringify(state.world),clean=frame(state,{canAim:true}),corrupt={...state,pickups:[...state.pickups,{id:'R-stale',skill:'BURST',x:6500,y:220,radius:22,collected:false}]};
     const actual=frame(corrupt,{canAim:true});
     const drift=Math.max(...Object.keys(clean).map(k=>Math.abs(clean[k]-actual[k])));
     check(drift<1e-7,{stage:n,issue:'offboard-reward-collapses-view',clean,actual,drift});
     const malformed={...state,pickups:[...state.pickups,{id:'R-malformed',x:NaN,y:220,collected:false},{id:'R-invalid-y',x:500,y:Infinity,collected:false},{id:'R-left',x:-1200,y:220,collected:false}]};
     const finite=frame(malformed,{canAim:true});check(Object.keys(clean).every(k=>Number.isFinite(finite[k])&&Math.abs(clean[k]-finite[k])<1e-7),{stage:n,issue:'malformed-pickup-poisons-camera',clean,actual:finite});
     const options={demo:{state,after:state,pose:{angle:state.angle,power:state.power,mode:state.mode},effectProgress:1,age:1}},beforePreview=frame(state,options),afterPreview=frame(corrupt,{demo:{...options.demo,state:corrupt,after:corrupt,focus:{x:6500,y:220}}});
     check(Object.keys(beforePreview).every(k=>Math.abs(beforePreview[k]-afterPreview[k])<1e-7),{stage:n,issue:'offboard-preview-focus-collapses-view',clean:beforePreview,actual:afterPreview});
     const focus={x:state.units[1].x,y:state.units[1].y-40,radius:170},result=frame(state,{demo:{...options.demo,phase:'RESULT',focus,annotation:{...focus,label:'HIT'}}});
     const target={x:result.x+focus.x*result.scale,y:result.y+focus.y*result.scale},canvas=document.getElementById('world');
     check(Object.values(result).every(Number.isFinite)&&result.scale>0&&target.x>=0&&target.x<=canvas.clientWidth&&target.y>=0&&target.y<=canvas.clientHeight,{stage:n,issue:'result-focus-outside-frame',result,target});
     check(JSON.stringify(state.world)===geometry,{stage:n,issue:'framing-mutates-world'});
     check(clean.scale>0&&Object.values(clean).every(Number.isFinite),{stage:n,issue:'invalid-clean-camera',clean});
     const w=document.getElementById('world').clientWidth;
     check(state.units.every((u,i)=>{const extent=i&&state.spec.boss?105:43;return clean.x+(u.x-extent)*clean.scale>=11.9&&clean.x+(u.x+extent)*clean.scale<=w-11.9;}),{stage:n,issue:'actor-outside-horizontal-frame',clean});
     samples.push({stage:n,scale:clean.scale,actorSeparationPx:Math.abs(state.units[1].x-state.units[0].x)*clean.scale});
    }
    const boss=E.campaign(10),before=frame(boss,{canAim:true}),shot=E.launch(boss,10,50);E.resolve(boss,shot);boss.phase='aim';const reward=boss.pickups.find(p=>p.id==='R-boss'),after=frame(boss,{canAim:true});
    check(boss.shotCount===1&&boss.units[1].hp===9&&boss.effects.broken===1,{issue:'exact-Tideclaw-sequence-changed',shots:boss.shotCount,hp:boss.units[1].hp,broken:boss.effects.broken});
    check(!!reward&&reward.x>=0&&reward.x<=1000,{issue:'boss-reward-outside-arena',reward});
    check(after.scale>=before.scale*.6,{issue:'actual-boss-reward-collapses-view',before,after,reward});
    if(reward)check(after.x+reward.x*after.scale>=0&&after.x+reward.x*after.scale<=document.getElementById('world').clientWidth,{issue:'valid-reward-hidden',reward,after});
    return {failures,checks,rendered,samples,boss:{before,after,reward,shots:boss.shotCount,hp:boss.units[1].hp,broken:boss.effects.broken}};
   });
   if(sample.failures.length){fs.writeFileSync(path.join(output,`FAIL-${width}x${height}.json`),JSON.stringify(sample,null,2));throw Error(`${width}x${height}: ${JSON.stringify(sample.failures.slice(0,3))}`);}
   checks+=sample.checks;rows.push({width,height,...sample});
   if([[1614,892],[390,844]].some(([w,h])=>w===width&&h===height)){
    await page.evaluate(()=>{selectedMap=9;start();encounter=null;document.getElementById('encounterBanner').hidden=true;endDemo();s.angle=10;s.power=50;const hit=E.launch(s,10,50);E.resolve(s,hit);s.phase='aim';shot=null;impact=null;tail=null;hud();for(let i=0;i<120;i++)draw();});
    await page.screenshot({path:path.join(output,`tideclaw-reward-${width}x${height}.png`)});
   }
   await context.close();
  }
  assert.deepEqual(errors,[]);checks++;const report={status:'PASS',recordedAt:new Date().toISOString(),checks,rows,errors,method:'Actual production Chromium renderer across100maps and8sizes. The Tideclaw angle10 power50 shared-physics shot breaks LEG, leaveshp9 andcreates an in-arena reward. Injected stale6500x/malformed capsule/focus states exercise camera recovery independently. No physical-device claim.'};fs.writeFileSync(path.join(output,'CAMERA_FRAMING.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:'PASS',checks,viewports:rows.length,rendered:rows.reduce((n,r)=>n+r.rendered,0)},null,2));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exit(1);});
