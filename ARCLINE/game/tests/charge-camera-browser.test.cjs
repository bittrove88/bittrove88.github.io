'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright'),S=require('../dist/save.js');
const root=path.resolve(__dirname,'../../..'),out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-charge-camera';fs.mkdirSync(out,{recursive:true});let checks=0;const errors=[],rows=[],ok=(v,m)=>{checks++;assert(v,m);};
const server=http.createServer((q,r)=>{let name=decodeURIComponent(new URL(q.url,'http://local').pathname);if(name.endsWith('/'))name+='index.html';const f=path.resolve(root,'.'+name);if(!f.startsWith(root+path.sep))return r.writeHead(403).end();fs.readFile(f,(e,b)=>{if(e)return r.writeHead(404).end();r.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.m4a':'audio/mp4','.wav':'audio/wav'})[path.extname(f)]||'application/octet-stream');r.end(b);});});
const near=(a,b)=>Math.abs(a-b)<1e-6;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.ARCLINE_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox']});
 try{for(const [width,height,motion]of[[844,390,'no-preference'],[568,240,'no-preference'],[393,852,'no-preference'],[844,390,'reduce']]){
  const c=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,reducedMotion:motion});await c.addInitScript(data=>{localStorage.setItem('arcline-campaign-v1',JSON.stringify(data));localStorage.setItem('arcline-install-guide-v1','{"state":"closed"}');},{schemaVersion:8,campaignResetVersion:2,cleared:99,journeyStarted:true,difficultyConfirmed:true,onboarding:{step:'done'},unlockedCharacterIds:S.characterIds,seenPreviewIds:S.previewIds,journal:{moviesSeen:['prologue','30','60']},preferences:{language:'ja'}});
  const p=await c.newPage(),cdp=await c.newCDPSession(p);p.on('pageerror',e=>errors.push(String(e)));await p.goto('http://127.0.0.1:'+server.address().port+'/ARCLINE/game/dist/');await p.waitForFunction('save.ready&&!document.getElementById("play").disabled');await p.evaluate(()=>{selectedMap=0;start({skipStory:true});endDemo();encounter=null;document.getElementById('encounterBanner').hidden=true;cancelAnimationFrame(raf);raf=0;
   globalThis.zoomFixture=(difficulty,angle,distance=700)=>{clearInput();shot=null;tail=null;impact=null;transition=null;ending=null;s=E.campaign(1,{difficulty,matchSeed:7});s.spec={...s.spec,floors:[[[0,10],[100,10]]],components:[],features:[],staticFeatures:[],phaseFeatures:null};s.world=G.world(s.spec);Object.assign(s.units[0],{x:150,y:400,slope:0,range:[35,965]});Object.assign(s.units[1],{x:150+distance,y:400,slope:0});s.angle=angle;s.power=20;clock=0;renderer.resetCamera();hud();draw();};
   globalThis.zoomFrames=n=>{const samples=[];for(let i=0;i<n;i++){update(1/60,1/60);draw();samples.push({power:s.power,ratio:renderer.view.scale/renderer.normalView.scale,engaged:!!charge?.cameraState?.engaged,view:{...renderer.view},normalView:{...renderer.normalView}});}return samples;};
   globalThis.zoomSnapshot=()=>JSON.stringify([s.world,s.units,s.weaponStock,s.skills,s.shotCount,s.round,save.data]);
   globalThis.zoomControls=()=>JSON.stringify(['battleControls','powerHUD','stick','aimStick'].map(id=>ArcViewport.rect(document.getElementById(id),document.getElementById('app'))));
  });
  const touch=width<400,begin=async()=>{if(touch){const r=await p.locator('#fire').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:r.x+r.width/2,y:r.y+r.height/2}]});}else{await p.locator('#world').focus();await p.keyboard.down('Space');}await p.waitForFunction('!!charge');},end=async cancel=>{if(cancel)await p.keyboard.press('Escape');if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await p.keyboard.up('Space');};
  let moveKey=null,movePoint=null;
  const pressMove=async direction=>{
   moveKey=direction>0?'ArrowRight':'ArrowLeft';
   if(!touch){await p.keyboard.down(moveKey);return;}
   const points=await p.evaluate(direction=>{
    const app=document.getElementById('app'),r=app.getBoundingClientRect(),stick=ArcViewport.rect(document.getElementById('stick'),app),x=stick.left+stick.width/2+direction*23,y=stick.top+stick.height/2,rotation=Number(app.dataset.viewRotation)||0;
    const move=rotation===90?{x:r.right-y*r.width/app.clientHeight,y:r.top+x*r.height/app.clientWidth}:rotation===-90?{x:r.left+y*r.width/app.clientHeight,y:r.bottom-x*r.height/app.clientWidth}:rotation===180?{x:r.right-x*r.width/app.clientWidth,y:r.bottom-y*r.height/app.clientHeight}:{x:r.left+x*r.width/app.clientWidth,y:r.top+y*r.height/app.clientHeight};
    const f=document.getElementById('fire').getBoundingClientRect();return [{id:1,x:f.x+f.width/2,y:f.y+f.height/2},{id:2,...move}];
   },direction);
   movePoint=points[1];await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});await p.waitForFunction('!!charge&&Math.abs(input.movementAxis)>.5');
  };
  const releaseMove=async()=>{
   if(!touch){await p.keyboard.up(moveKey);return;}
   // CDP ends the listed contact, so release movement id2 while FIRE id1 stays down.
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[movePoint]});await p.waitForFunction('!!charge&&!input.movementAxis');
  };
  const modeRows=[];
  for(const mode of['easy','normal','hard']){
   await p.evaluate(mode=>zoomFixture(mode,5,200),mode);await begin();const low=await p.evaluate(()=>zoomFrames(340));ok(low.every(r=>nearRatio(r.ratio,1)&&!r.engaged),'near/flat charge stays unzoomed '+mode+'/'+width);await end(true);ok(await p.evaluate('!shot&&s.shotCount===0'),'cancel is not a shot '+mode+'/'+width);
   await p.evaluate(mode=>zoomFixture(mode,80),mode);const before=await p.evaluate('zoomSnapshot()'),controls=await p.evaluate('zoomControls()'),trajectory=await p.evaluate('JSON.stringify(E.trajectory(s,0,80,65))');await begin();const high=await p.evaluate(()=>zoomFrames(340));ok(high.some(r=>r.engaged)&&near(high.at(-1).ratio,.9),'high charge settles at90 percent '+mode+'/'+width);ok(high.every(r=>r.ratio>=.9-1e-6&&r.ratio<=1+1e-6),'only one bounded zoom range');const falling=high.filter(r=>r.engaged&&r.power<25);ok(falling.length>0&&falling.every(r=>near(r.ratio,.9)),'low power after peak does not zoom back in');if(motion==='no-preference')ok(high.some(r=>r.ratio<1-1e-6&&r.ratio>.9+1e-6),'normal motion eases smoothly');else ok(high.every(r=>near(r.ratio,1)||near(r.ratio,.9)),'reduced motion uses two immediate states');
   const firstZoom=high.findIndex(r=>r.engaged),settled=high.findIndex(r=>near(r.ratio,.9));
   if(motion==='no-preference')ok((settled-firstZoom)/60>=.55&&(settled-firstZoom)/60<=.65,'actual charge view takes about0.6s to shrink '+mode+'/'+width);
   ok(await p.evaluate('zoomSnapshot()')===before,'zoom changes no world,units,stock,round or save');ok(await p.evaluate('zoomControls()')===controls,'gauge and controls never shrink');ok(await p.evaluate('JSON.stringify(E.trajectory(s,0,80,65))')===trajectory,'real trajectory unchanged by camera');ok(await p.evaluate(()=>ArcAimGuide.paths(E.trajectory(s,0,80,65),s.difficulty).length===0)===(mode==='hard'),'difficulty guide rules retained');
   const held=await p.evaluate('renderer.view.scale');await p.evaluate(()=>{for(let i=0;i<8;i++)draw();});ok(near(await p.evaluate('renderer.view.scale'),held),'redraw without elapsed game time holds zoom');await p.screenshot({path:path.join(out,'charge-'+mode+'-'+width+'-'+motion+'.png')});
   modeRows.push({mode,firstZoomPower:high.find(r=>r.engaged).power,settledRatio:high.at(-1).ratio});await end(true);await p.evaluate(()=>zoomFrames(18));ok(near(await p.evaluate('renderer.view.scale/renderer.normalView.scale'),1),'cancel returns smoothly to normal');
   // Re-enter before recovery finishes. The normal baseline must never shrink.
   const normal=await p.evaluate('renderer.normalView.scale');for(let attempt=0;attempt<3;attempt++){await begin();await p.evaluate(()=>zoomFrames(140));ok(near(await p.evaluate('charge.cameraLock.scale'),normal)&&near(await p.evaluate('renderer.view.scale/renderer.normalView.scale'),.9),'rapid recharges never accumulate '+attempt);await end(true);await p.evaluate(()=>zoomFrames(3));}
   await begin();await p.evaluate(()=>zoomFrames(120));const expected=await p.evaluate('JSON.stringify(E.trajectory(s,0,s.angle,s.power).path)');await end(false);await p.waitForFunction('!!shot');ok(await p.evaluate('s.shotCount===1&&s.phase==="flight"'),'actual release fires one shot');ok(await p.evaluate('JSON.stringify(shot.path)')===expected,'actual release uses original world-space path');
  }
  await p.evaluate(()=>zoomFixture('normal',80));await begin();await p.evaluate(()=>zoomFrames(140));const startX=await p.evaluate('s.units[0].x');await pressMove(1);await p.evaluate(()=>zoomFrames(20));await releaseMove();ok(await p.evaluate('s.units[0].x')>startX&&await p.evaluate('s.walkUsed')<=140,'walking while holding keeps real movement budget');ok(near(await p.evaluate('renderer.view.scale/renderer.normalView.scale'),.9),'walking retains the same90 percent display factor');
  // Once movement is exhausted, changing the movement input must not move the
  // camera between its original charge lock and its post-walk position.
  await pressMove(1);await p.evaluate(()=>zoomFrames(100));await releaseMove();await p.evaluate(()=>zoomFrames(1));
  const stopped=await p.evaluate('JSON.stringify(s.units)'),stationary=[];
  for(let attempt=0;attempt<6;attempt++){
   await pressMove(attempt%2?-1:1);stationary.push(...await p.evaluate(()=>zoomFrames(1)));
   await releaseMove();stationary.push(...await p.evaluate(()=>zoomFrames(1)));
  }
  ok(await p.evaluate('s.walkUsed')>=139.99&&await p.evaluate('JSON.stringify(s.units)')===stopped,'movement input cannot move exhausted units');
  const span=key=>Math.max(...stationary.map(row=>row.view[key]))-Math.min(...stationary.map(row=>row.view[key]));
  ok(span('x')<1e-6&&span('y')<1e-6&&span('scale')<1e-6,'held camera stays fixed when exhausted movement input starts/stops '+width+' '+JSON.stringify({x:span('x'),y:span('y'),scale:span('scale')}));
  await end(true);
  ok(modeRows.every(r=>near(r.firstZoomPower,modeRows[0].firstZoomPower)&&near(r.settledRatio,.9)),'all three modes share the same trigger and factor');rows.push({width,height,motion,modes:modeRows,stationaryCameraSpan:{x:span('x'),y:span('y'),scale:span('scale')}});console.log('PASS charge camera',width,height,motion);await c.close();
 }
 ok(!errors.length,errors.join('\n'));fs.writeFileSync(path.join(out,'CHARGE_CAMERA_BROWSER.json'),JSON.stringify({status:'PASS',checks,rows,errors,scope:'Controlled-timestep Chromium with native keyboard hold/release and portrait CDP touch hold/release. Near low arcs stay normal;high arcs share90 percent in all modes;falling charge stays fixed;UI,world,save and real paths are preserved;0.6s shrink, original0.2s recovery, cancel,rapid recharges, exhausted movement input on/off and reduced motion checked. Movement uses native keyboard or two simultaneous CDP touch contacts. Synthetic flat fixtures;no physical phone claim.'},null,2));console.log('PASS charge-camera browser '+checks);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
function nearRatio(a,b){return Math.abs(a-b)<1e-6;}
