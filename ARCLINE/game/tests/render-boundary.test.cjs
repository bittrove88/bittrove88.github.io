'use strict';
// Inspect actual Chromium Canvas paths, not a second terrain implementation.
// Injected states isolate rendering/camera flows; they do not claim human wins.
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../dist'),output=process.env.ARCLINE_EVIDENCE_DIR||'/workspace/work/arcline-dual-stick/renderer';
const sizes=[[320,568],[360,640],[390,844],[568,320],[640,360],[844,390],[768,1024],[1024,768]];
fs.mkdirSync(output,{recursive:true});
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(data);});});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']}),errors=[],rows=[];let checks=0;
 try{
  for(const [width,height] of sizes){
   const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true});
   await context.route('https://www.youtube.com/**',r=>r.abort());
   await context.addInitScript(()=>{
    const proto=CanvasRenderingContext2D.prototype;
    globalThis.renderTrace={active:false,paths:[],strokes:[],arcs:[],current:null};
    for(const name of ['beginPath','moveTo','lineTo','closePath','fill','stroke','arc']){
     const original=proto[name];proto[name]=function(...args){
      const t=renderTrace;
      if(t.active){
       if(name==='beginPath')t.current={points:[],closed:false};
       else if(name==='moveTo'||name==='lineTo')t.current?.points.push({x:args[0],y:args[1]});
       else if(name==='closePath'&&t.current)t.current.closed=true;
       else if(name==='arc')t.arcs.push(args);
       else if(name==='fill'&&t.current?.closed&&t.current.points.length>=4)t.paths.push({points:t.current.points.map(p=>({...p})),matrix:{a:this.getTransform().a,d:this.getTransform().d,e:this.getTransform().e,f:this.getTransform().f}});
       else if(name==='stroke'&&t.current?.points.length)t.strokes.push({points:t.current.points.map(p=>({...p})),color:this.strokeStyle,width:this.lineWidth*Math.abs(this.getTransform().a)/devicePixelRatio,matrix:{a:this.getTransform().a,e:this.getTransform().e}});
      }
      return original.apply(this,args);
     };
    }
   });
   const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction('!document.getElementById("play").disabled');
   await page.evaluate(()=>{cancelAnimationFrame(raf);raf=0;save.data.seenPreviewIds=[...ArcSave.previewIds];selectedMap=0;start();encounter=null;endDemo();hud();draw();});
   const mapReport=await page.evaluate(()=>{
    const problems=[],counts={maps:0,scenes:0,floors:0,interiorEdges:0,visibleExteriorMargins:0};
    globalThis.captureRender=(state,options={})=>{
     renderTrace.paths=[];renderTrace.strokes=[];renderTrace.arcs=[];renderTrace.active=true;renderer.draw(state,options);renderTrace.active=false;
     const view={...renderer.view},canvas=document.getElementById('world'),w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2),shake=options.impact&&!options.reducedMotion?Math.max(0,1-options.impact.age*5)*5:0,shakeX=Math.sin((options.time||0)*80)*shake;
     const floorWorld=options.demo?.effectProgress>=.5?options.demo.after?.world||state.world:options.demo?.state?.world||state.world;
     const same=(a,b)=>Math.abs(a.x-b.x)<1e-7&&Math.abs(a.y-b.y)<1e-7;
     for(const floor of floorWorld.solids.filter(o=>o.kind==='floor')){
      const top=floor.poly.slice(0,-2),first=top[0],last=top.at(-1);
      const paths=renderTrace.paths.filter(p=>Math.abs(p.matrix.a-view.scale*dpr)<1e-4&&Math.abs(p.matrix.e-(view.x+shakeX)*dpr)<1e-4&&top.every(v=>p.points.some(q=>same(q,v)))&&p.points.at(-1).y>Math.max(...top.map(p=>p.y))&&p.points.at(-2).y===p.points.at(-1).y);
      if(paths.length!==1){problems.push({stage:state.stage,scene:options.label,floor:floor.id,issue:'ground-fill-count',count:paths.length});continue;}
      const actual=paths[0].points,surface=actual.slice(0,-2),a=surface[0],b=surface.at(-1),screenLeft=view.x+shakeX+a.x*view.scale,screenRight=view.x+shakeX+b.x*view.scale;
      counts.floors++;
      if(first.x<=.001){if(screenLeft>.01)problems.push({stage:state.stage,scene:options.label,issue:'left-soil-gap',screenLeft,view});if(view.x+shakeX>0)counts.visibleExteriorMargins++;}
      else{counts.interiorEdges++;if(!same(a,first))problems.push({stage:state.stage,scene:options.label,issue:'interior-left-edge-extended',a,first});}
      if(last.x>=999.999){if(screenRight<w-.01)problems.push({stage:state.stage,scene:options.label,issue:'right-soil-gap',screenRight,w,view});if(view.x+shakeX+1000*view.scale<w)counts.visibleExteriorMargins++;}
      else{counts.interiorEdges++;if(!same(b,last))problems.push({stage:state.stage,scene:options.label,issue:'interior-right-edge-extended',b,last});}
      if(actual.at(-1).y*view.scale+view.y<h)problems.push({stage:state.stage,scene:options.label,issue:'soil-bottom-gap'});
      const edge=renderTrace.strokes.find(p=>p.points.length===surface.length&&p.points.every((v,i)=>same(v,surface[i]))&&Math.abs(p.matrix.a-view.scale*dpr)<1e-4);
      if(!edge)problems.push({stage:state.stage,scene:options.label,issue:'missing-continuous-topline'});
     }
     counts.scenes++;return view;
    };
    for(let n=1;n<=100;n++){
     const state=E.campaign(n,save.data),before=JSON.stringify(state.world),high=E.trajectory(state,0,82,100);
     captureRender(state,{canAim:true,label:'aim'});
     captureRender(state,{shot:high,flight:high.duration,time:.02,impact:{age:.02},label:'flight-impact'});
     captureRender(state,{demo:{state,after:state,pose:{angle:state.angle,power:state.power,mode:state.mode},effectProgress:1,age:1},label:'preview'});
     captureRender(state,{ending:{winner:0,age:1,final:n===100},label:'result'});
     if(JSON.stringify(state.world)!==before)problems.push({stage:n,issue:'collision-world-mutated'});
     counts.maps++;
    }
    return {problems,counts,viewportScale:visualViewport?.scale||1};
   });
   if(mapReport.problems.length)fs.writeFileSync(path.join(output,`FAIL-${width}x${height}.json`),JSON.stringify(mapReport,null,2));
   assert.equal(mapReport.problems.length,0,`${width}x${height}: soil/path failures ${JSON.stringify(mapReport.problems.slice(0,3))}`);checks+=mapReport.counts.scenes+mapReport.counts.maps;assert(mapReport.counts.interiorEdges>0);assert(mapReport.counts.visibleExteriorMargins>0);checks+=2;
   const lifecycle=await page.evaluate(()=>{
    const failures=[],samples=[];let excursions=0;
    for(const n of [1,6,13,50,100]){
     selectedMap=n-1;start();encounter=null;document.getElementById('encounterBanner').hidden=true;endDemo();s.angle=8;hud();for(let i=0;i<90;i++)draw();
     const before={...renderer.view},geometry=JSON.stringify(s.world);startCharge('render-lock');const lock={...renderer.view};
     for(let i=0;i<16;i++){update(.2,.2);draw();if(Object.keys(lock).some(k=>renderer.view[k]!==lock[k]))failures.push({n,issue:'charge-camera-moved',lock,actual:{...renderer.view}});}
     renderTrace.active=true;renderTrace.strokes=[];renderTrace.arcs=[];s.power=75;draw();renderTrace.active=false;
     const plan=E.trajectory(s,0,s.angle,s.power),end=plan.impacts.at(-1)||plan.end,color=ArcWeapons.get(s.mode).appearance.color;
     if(!renderTrace.strokes.some(p=>p.color===color&&Math.abs(p.width-2)<.02))failures.push({n,issue:'charge-line-not-2px'});
     if(renderTrace.arcs.some(([x,y])=>Math.hypot(x-end.x,y-end.y)<1e-6))failures.push({n,issue:'charge-landing-marker'});
     cancelCharge();const shot=E.trajectory(s,0,82,100);
     for(let i=0;i<50;i++)renderer.draw(s,{shot,flight:shot.duration});const flightView={...renderer.view};
     if(Object.keys(before).some(k=>Math.abs(before[k]-flightView[k])>.01))excursions++;
     for(let i=0;i<110;i++)draw();const returned={...renderer.view},drift=Math.max(...Object.keys(before).map(k=>Math.abs(before[k]-returned[k])));
     if(drift>1e-7)failures.push({n,issue:'flight-camera-stuck',before,returned,drift});
     if(JSON.stringify(s.world)!==geometry)failures.push({n,issue:'charge-or-camera-mutated-terrain'});
     const canvas=document.getElementById('world'),r=canvas.getBoundingClientRect(),logical={x:before.x+s.units[0].x*before.scale,y:before.y+s.units[0].y*before.scale},mapped=renderer.toWorld(r.left+logical.x*r.width/canvas.clientWidth,r.top+logical.y*r.height/canvas.clientHeight);
     if(Math.hypot(mapped.x-s.units[0].x,mapped.y-s.units[0].y)>1e-5)failures.push({n,issue:'canvas-input-coordinate-drift',mapped});
     samples.push({n,before,flightView,returned,drift});
    }
    return {failures,samples,excursions};
   });
   assert.deepEqual(lifecycle.failures,[],`${width}x${height}: exact charge lock, thin guide, no landing marker, flight camera recovers`);assert(lifecycle.excursions>0,'a genuine camera excursion is exercised');checks+=lifecycle.samples.length*6;
   await page.evaluate(()=>{selectedMap=0;start();encounter=null;endDemo();s.angle=8;hud();for(let i=0;i<90;i++)draw();});
   const beforeResize=await page.evaluate('({...renderer.view})');await page.screenshot({path:path.join(output,`level01-${width}x${height}.png`)});
   await page.setViewportSize({width:height,height:width});await page.waitForFunction(({w,h})=>Math.abs(document.getElementById('app').clientWidth-w)<1&&Math.abs(document.getElementById('app').clientHeight-h)<1,{w:height,h:width});await page.evaluate(()=>{for(let i=0;i<30;i++)draw();captureRender(s,{canAim:true,label:'rotated'});});
   await page.setViewportSize({width,height});await page.waitForFunction(({w,h})=>Math.abs(document.getElementById('app').clientWidth-w)<1&&Math.abs(document.getElementById('app').clientHeight-h)<1,{w:width,h:height});const afterResize=await page.evaluate(()=>{for(let i=0;i<90;i++)draw();return {...renderer.view};});
   for(const k of Object.keys(beforeResize))assert(Math.abs(beforeResize[k]-afterResize[k])<1e-7,`${width}x${height}: camera restores after rotation (${k}): ${JSON.stringify({beforeResize,afterResize})}`);checks+=3;
   rows.push({width,height,...mapReport.counts,browserScale:mapReport.viewportScale,chargeCameraExact:true,flightRecovery:lifecycle.samples,resizeRecovery:true});await context.close();
  }
  assert.deepEqual(errors,[],'no production browser exceptions');checks++;
  const report={status:'PASS',checks,rows,errors,method:'Real Chromium Canvas polygon and topline capture for 100 production maps at eight sizes in aim, shaken flight, preview and result states. Interior floor endpoints and collision data remain unchanged. Actual charge freezes camera exactly; flight-to-aim and rotation restore the original camera. Browser scale recorded separately; Safari forced-zoom recovery belongs to viewport tests. Controlled states are not human campaign or physical-device certification.'};
  fs.writeFileSync(path.join(output,'RENDER_BOUNDARY.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks,viewports:rows.length,maps:rows.reduce((n,r)=>n+r.maps,0),scenes:rows.reduce((n,r)=>n+r.scenes,0),errors}));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
