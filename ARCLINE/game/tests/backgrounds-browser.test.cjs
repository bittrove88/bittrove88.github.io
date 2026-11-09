'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright'),Save=require('../dist/save.js');
const root=path.resolve(__dirname,'../../..'),out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-backgrounds';fs.mkdirSync(out,{recursive:true});
let checks=0;const errors=[],requests=[],rows=[],ok=(v,m)=>{checks++;assert(v,m);};
const server=http.createServer((q,r)=>{let name=decodeURIComponent(new URL(q.url,'http://local').pathname);if(name.endsWith('/'))name+='index.html';const f=path.resolve(root,'.'+name);if(!f.startsWith(root+path.sep))return r.writeHead(403).end();fs.readFile(f,(e,b)=>{if(e)return r.writeHead(404).end();r.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.jpg':'image/jpeg','.m4a':'audio/mp4','.wav':'audio/wav'})[path.extname(f)]||'application/octet-stream');r.end(b);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.ARCLINE_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox']});
 try{for(const [width,height,motion]of[[1120,604,'no-preference'],[844,390,'no-preference'],[568,240,'no-preference'],[393,852,'reduce']]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:width===1120?1:2,hasTouch:width!==1120,isMobile:width!==1120,reducedMotion:motion});
  await context.addInitScript(profile=>{localStorage.setItem('arcline-campaign-v1',JSON.stringify(profile));localStorage.setItem('arcline-install-guide-v1','{"state":"closed"}');},{schemaVersion:8,campaignResetVersion:2,cleared:99,journeyStarted:true,difficultyConfirmed:true,onboarding:{step:'done'},unlockedCharacterIds:Save.characterIds,seenPreviewIds:Save.previewIds,journal:{moviesSeen:['prologue','30','60']},preferences:{language:'ja'}});
  const p=await context.newPage();p.on('pageerror',e=>errors.push(String(e)));p.on('response',r=>{if(r.status()>=400&&r.url().includes('/ARCLINE/'))requests.push({url:r.url(),status:r.status()});});
  await p.goto('http://127.0.0.1:'+server.address().port+'/ARCLINE/game/dist/');await p.waitForFunction('save.ready&&!document.getElementById("play").disabled');
  await p.evaluate(()=>{
   selectedMap=0;start({skipStory:true});endDemo();encounter=null;document.getElementById('encounterBanner').hidden=true;cancelAnimationFrame(raf);raf=0;
   const proto=CanvasRenderingContext2D.prototype,fill=proto.fill,restore=proto.restore,begin=proto.beginPath,move=proto.moveTo,line=proto.lineTo,stroke=proto.stroke;
   globalThis.bgTrace=null;
   proto.fill=function(...args){const t=bgTrace;if(t?.active&&this.canvas.id==='world'&&args[0] instanceof Path2D)t.fills++;return fill.apply(this,args);};
   proto.restore=function(...args){const result=restore.apply(this,args),t=bgTrace;if(t?.active&&this.canvas.id==='world'&&!t.pixels&&t.fills===t.expected)t.pixels=this.getImageData(0,0,this.canvas.width,this.canvas.height).data;return result;};
   proto.beginPath=function(...args){if(bgTrace?.active)bgTrace.points=[];return begin.apply(this,args);};
   proto.moveTo=function(x,y){if(bgTrace?.active)bgTrace.points.push({x,y});return move.call(this,x,y);};
   proto.lineTo=function(x,y){if(bgTrace?.active)bgTrace.points.push({x,y});return line.call(this,x,y);};
   proto.stroke=function(...args){if(bgTrace?.active&&this.canvas.id==='world'&&Math.abs(this.globalAlpha-.8)<.001&&Math.abs(this.lineWidth*renderer.view.scale-2)<.001&&this.strokeStyle===bgTrace.guideColor)bgTrace.guides.push(bgTrace.points.map(p=>({...p})));return stroke.apply(this,args);};
   globalThis.bgFixture=(stage,map,mode)=>{
    clearInput();shot=null;tail=null;impact=null;transition=null;ending=null;s=E.campaign(stage,{difficulty:mode,matchSeed:17});
    if(stage===100)while(ArcFinalTeam.mapIndex(s)<map){ArcFinalTeam.credit(s,s.characterId,s.spec.finalBattle.requiredDamage);E.next(s);s.phase='aim';}
    selectedMap=stage-1;s.phase='aim';s.angle=55;s.power=72;clock=0;renderer.resetCamera();hud();
   };
   globalThis.bgCapture=(options={})=>{
    const state=options.transition?ArcFinalTravel.frame(s,options.transition).state:s,scene=ArcBackgrounds.sceneFor(state),canvas=document.getElementById('world'),w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2),before=JSON.stringify(s),saved=localStorage.getItem(ArcSave.key);
    bgTrace={active:true,expected:scene.shapes.length,fills:0,pixels:null,points:[],guides:[],guideColor:ArcWeapons.get(E.weapon(state).id).appearance.color};
    renderer.draw(s,{canAim:true,difficulty:s.difficulty,time:clock,reducedMotion,...options});bgTrace.active=false;
    const actual=bgTrace.pixels,ref=document.createElement('canvas');ref.width=canvas.width;ref.height=canvas.height;const ctx=ref.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ArcBackgrounds.draw(ctx,w,h,state);const expected=ctx.getImageData(0,0,ref.width,ref.height).data;
    let different=0,transparent=0,hash=2166136261;
    if(actual)for(let i=0;i<actual.length;i+=388){for(let k=0;k<4;k++){if(actual[i+k]!==expected[i+k])different++;hash=Math.imul(hash^actual[i+k],16777619);}if(actual[i+3]!==255)transparent++;}
    const plan=E.trajectory(state,0,state.angle,state.power),guide=s.difficulty==='hard'?ArcAimGuide.direction(G.muzzle(state,0,state.angle),renderer.view.scale):ArcAimGuide.paths(plan,s.difficulty),guidesEqual=JSON.stringify(bgTrace.guides)===JSON.stringify(guide.map(b=>b.path.map(({x,y})=>({x,y}))));
    return {id:scene.id,backgroundCaptured:!!actual,different,transparent,hash:hash>>>0,guidesEqual,guideCount:bgTrace.guides.length,unchanged:JSON.stringify(s)===before&&localStorage.getItem(ArcSave.key)===saved,view:{...renderer.view},canvas:{width:w,height:h,dpr},worldPainted:canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.some((v,i)=>i%388===0&&v!==expected[i])};
   };
  });
  const cases=width===1120?[...Array.from({length:99},(_,i)=>({stage:i+1,map:0})),...Array.from({length:4},(_,map)=>({stage:100,map}))]:[...Array.from({length:20},(_,i)=>({stage:i*5+1,map:0})),...Array.from({length:9},(_,i)=>({stage:(i+1)*10,map:0})),...Array.from({length:4},(_,map)=>({stage:100,map}))];
  for(const mode of['easy','normal','hard'])for(const c of cases){
   await p.evaluate(({stage,map,mode})=>bgFixture(stage,map,mode),{...c,mode});const r=await p.evaluate(()=>bgCapture());
   ok(r.backgroundCaptured&&r.different===0&&r.transparent===0,'reviewed art fills screen before world '+mode+'/'+width+'/'+c.stage+'/'+c.map);
   ok(r.unchanged&&r.worldPainted,'foreground drawn and campaign/save unchanged '+r.id);
   ok(r.guidesEqual&&r.guideCount>0,'actual difficulty guide geometry retained '+mode+'/'+r.id);
   rows.push({width,height,motion,mode,stage:c.stage,map:c.map,...r});
   if(mode==='normal'&&(c.stage===100||c.stage%10===0||c.stage%5===1))await p.screenshot({path:path.join(out,r.id+'-'+width+'.jpg'),type:'jpeg',quality:78});
  }
  // Screen-space art stays pixel-identical under camera, charge, flight and impact.
  await p.evaluate(()=>bgFixture(80,0,'normal'));const base=await p.evaluate(()=>bgCapture()),camera=await p.evaluate(()=>bgCapture({cameraView:{x:-500,y:-90,scale:1.4},planning:false})),flight=await p.evaluate(()=>{const shot=E.trajectory(s,0,80,100);return bgCapture({shot,flight:shot.duration*.45,impact:{age:.03},time:.02});});
  ok(base.hash===camera.hash&&base.hash===flight.hash,'camera/flight/impact never move backdrop '+width);ok(camera.unchanged&&flight.unchanged,'display leaves simulation intact');
  for(const reduced of[false,true])for(const to of[1,2,3]){
   const transitionRows=await p.evaluate(({to,reduced})=>{
    bgFixture(100,to-1,'normal');while(s.finalTeam.index<to*3-1){ArcFinalTeam.credit(s,s.characterId,s.spec.finalBattle.requiredDamage);E.next(s);s.phase='aim';}
    const before=JSON.parse(JSON.stringify(s));ArcFinalTeam.credit(s,s.characterId,s.spec.finalBattle.requiredDamage);advanceTurn();const travel=ArcFinalTravel.create(before,renderer.view,{from:to-1,to,duration:2.2},reduced),saved=JSON.stringify(s),results=[];
    for(const t of[0,.35,.549,.55,.83,1]){travel.age=travel.duration*t;const r=bgCapture({transition:travel,canAim:false});results.push({t,id:r.id,captured:r.backgroundCaptured,different:r.different,unchanged:JSON.stringify(s)===saved});}
    return {duration:travel.duration,results};
   },{to,reduced});
   ok(transitionRows.duration===(reduced?.7:2.2),'existing travel duration retained');
   for(const r of transitionRows.results)ok(r.id==='final-100-'+(r.t<.55?to-1:to)&&r.captured&&r.different===0&&r.unchanged,'collapse selects correct old/new art '+width+'/'+reduced+'/'+to+'/'+r.t);
  }
  // Native map-camera and pause controls over actual final-map state.
  await p.evaluate(()=>{transition=null;bgFixture(100,3,'normal');draw();});await p.locator('#mapCameraToggle').click();ok(await p.evaluate('mapCamera.active&&!canAim()'),'inspection owns input');await p.locator('#mapCameraIn').click();await p.locator('#mapCameraClose').click();await p.locator('#pause').click();await p.locator('#resume').click();ok(await p.evaluate('!mapCamera.active&&canAim()'),'pause and inspection return to battle');
  const timing=await p.evaluate(()=>{const canvas=document.getElementById('world'),ctx=canvas.getContext('2d'),values=[];for(const scene of ArcBackgrounds.scenes){ArcBackgroundCollection.draw(ctx,canvas.clientWidth,canvas.clientHeight,scene);const start=performance.now();for(let i=0;i<12;i++)ArcBackgroundCollection.draw(ctx,canvas.clientWidth,canvas.clientHeight,scene);values.push((performance.now()-start)/12);}values.sort((a,b)=>a-b);return {medianMs:values[16],p95Ms:values[31],scope:'headless Chromium background vector submission only; no physical-device frame-rate claim'};});
  console.log('PASS backgrounds viewport',width,height,motion,JSON.stringify(timing));rows.push({width,height,motion,timing});await context.close();
 }
 ok(!errors.length,errors.join('\n'));ok(!requests.length,JSON.stringify(requests));
 fs.writeFileSync(path.join(out,'BACKGROUNDS_BROWSER.json'),JSON.stringify({status:'PASS',checks,renderCases:rows.filter(r=>r.id).length,artworks:33,viewports:4,rows,errors,requests,scope:'Production HTML and renderer. All103 stage/map conditions in3 difficulties at1120x604;all33 scenes in3 difficulties at844x390,568x240 and portrait393x852 rotated by app. DPR1/2; sampled RGBA comparison before foreground,actual guide geometry,unchanged state/storage,camera/flight/impact,three travel boundaries in both motion modes,native inspect/pause. No physical-device/public deployment claim.'},null,2));console.log('PASS backgrounds browser '+checks);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
