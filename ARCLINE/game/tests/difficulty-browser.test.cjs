'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../dist'),out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-difficulty';
fs.mkdirSync(out,{recursive:true});let checks=0;
const ok=(value,message)=>{checks++;assert(value,message);};
const server=http.createServer((req,res)=>{
 const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(b);});
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const errors=[],bad=[],rows=[],drawCases=[];
 try{
  for(const [width,height,touch] of[[568,240,true],[667,280,true],[844,390,true],[932,430,true],[1024,768,false],[1440,900,false],[390,844,false]]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,deviceScaleFactor:2});
   await context.addInitScript(()=>{
    const key='arcline-campaign-v1';
    if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({schemaVersion:2,contentRevision:'4.1.0',cleared:73,unlockedWeaponIds:Array.from({length:20},(_,i)=>'W'+String(i+1).padStart(2,'0')),equippedWeaponId:'W20',collectedCosmeticIds:['S01','B10'],equippedCharacterId:'gun',seenPreviewIds:['v4:controls']}));
    const proto=CanvasRenderingContext2D.prototype;globalThis.forecastTrace={active:false,current:[],strokes:[]};
    for(const name of ['beginPath','moveTo','lineTo','stroke']){
     const original=proto[name];proto[name]=function(...args){const trace=forecastTrace;if(trace.active){if(name==='beginPath')trace.current=[];if(name==='moveTo'||name==='lineTo')trace.current.push({x:args[0],y:args[1]});if(name==='stroke'){const scale=Math.abs(this.getTransform().a)/devicePixelRatio;trace.strokes.push({points:trace.current.map(p=>({...p})),color:this.strokeStyle,width:this.lineWidth*scale,dash:this.getLineDash().map(n=>n*scale),cap:this.lineCap});}}return original.apply(this,args);};
    }
   });
   const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)bad.push(r.url());});
   await page.goto(url);await page.waitForFunction('!document.getElementById("play").disabled');
   ok(await page.locator('input[name="difficulty"]:checked').inputValue()==='normal','legacy default normal '+width);
   for(const language of['ja','en']){
    await page.evaluate(lang=>ArcI18n.setLanguage(lang),language);
    ok(await page.locator('#difficultyChoice legend').innerText()===(language==='ja'?'難易度':'Difficulty'),'translated difficulty legend '+width+' '+language);
    const labels=await page.locator('.difficulty-options strong').allTextContents();
    ok(labels.join('|')===(language==='ja'?'イージー|ノーマル|ハード':'Easy|Normal|Hard'),'all mode names translate '+width+' '+language);
    const geometry=await page.evaluate(()=>{
     const play=document.getElementById('play'),targets=[...document.querySelectorAll('.difficulty-options label'),...['openCollection','openCharacters','chooseLevel'].map(id=>document.getElementById(id)),play];
     return {doc:document.documentElement.scrollWidth,viewport:innerWidth,targets:targets.map(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {width:r.width,height:r.height,left:r.left,top:r.top,right:r.right,bottom:r.bottom,reachable:!!hit&&(e===hit||e.contains(hit)),hit:hit?.outerHTML.slice(0,200)};})};
    });
    ok(geometry.doc<=width+1,'lobby no horizontal overflow '+width+' '+language);
    ok(geometry.targets.every(r=>r.width>=44&&r.height>=44&&r.left>=0&&r.right<=width+1&&r.top>=0&&r.bottom<=height+1&&r.reachable),'difficulty and PLAY fit and are unobscured '+width+' '+language+' '+JSON.stringify(geometry));
   }
   await page.evaluate(()=>ArcI18n.setLanguage('ja'));
   for(const [index,mode] of ['easy','normal','hard'].entries()){
    await page.locator('.difficulty-options label').nth(index).click();
    ok(await page.evaluate(mode=>save.data.difficulty===mode,mode),'native choice updates profile '+width+' '+mode);
    await page.evaluate(()=>save.pending);await page.reload();await page.waitForFunction('!document.getElementById("play").disabled');
    ok(await page.locator('input[name="difficulty"]:checked').inputValue()===mode,'mode survives reload '+width+' '+mode);
    ok(await page.evaluate(()=>save.data.cleared===73&&save.data.unlockedWeaponIds.length===20&&save.data.equippedWeaponId==='W20'&&save.data.collectedCosmeticIds.length===2),'difficulty preserves legacy ownership '+width+' '+mode);
   }
   const hardRadio=page.locator('input[value="hard"][name="difficulty"]');await hardRadio.focus();await page.keyboard.press('ArrowLeft');
   ok(await page.locator('input[name="difficulty"]:checked').inputValue()==='normal','native keyboard selection '+width);
   ok(await page.evaluate('s===null&&!charge'),'menu arrows never charge or start a battle '+width);
   await page.locator('input[value="easy"][name="difficulty"]').focus();await page.keyboard.press('Space');
   ok(await page.locator('input[name="difficulty"]:checked').inputValue()==='easy','native Space selects focused mode '+width);
   if(width===568||width===844||width===1440)await page.screenshot({path:path.join(out,'difficulty-lobby-'+width+'.png')});
   if(width===844){
    const result=await page.evaluate(()=>{
     cancelAnimationFrame(raf);raf=0;save.data.seenPreviewIds=[...ArcSave.previewIds];save.data.equippedCosmeticId=null;
     const faults=[],samples=[];
     const cases=[{stage:1,weapon:'W01',angle:48,power:72},{stage:6,weapon:'W06',angle:20,power:55},{stage:1,weapon:'W10',angle:60,power:70},{stage:1,weapon:'W09',angle:48,power:72},{stage:1,weapon:'W11',angle:48,power:72},{stage:4,weapon:'TELEPORT',angle:50,power:68},{stage:21,weapon:'W07',angle:12,power:52}];
     function capture(){forecastTrace.current=[];forecastTrace.strokes=[];forecastTrace.active=true;draw();forecastTrace.active=false;return forecastTrace.strokes;}
     for(const test of cases)for(const mode of ['easy','normal','hard']){
      save.data.difficulty=mode;save.data.equippedWeaponId=test.weapon==='TELEPORT'?'W01':test.weapon;selectedMap=test.stage-1;start();endDemo();encounter=null;document.getElementById('encounterBanner').hidden=true;
      if(test.weapon==='TELEPORT')E.selectTeleport(s);else E.selectWeapon(s,test.weapon);
      s.angle=test.angle;s.power=test.power;const plan=E.trajectory(s,0,s.angle,s.power),before=JSON.stringify(s),color=ArcWeapons.get(test.weapon).appearance.color;
      draw();const expected=mode==='hard'?ArcAimGuide.direction(G.muzzle(s,0,s.angle),renderer.view.scale):ArcAimGuide.paths(plan,mode);
      function verify(actual,phase){for(const segment of expected){const matched=actual.find(a=>a.points.length===segment.path.length&&a.points.every((p,i)=>Math.hypot(p.x-segment.path[i].x,p.y-segment.path[i].y)<1e-6));if(!matched)faults.push({test,mode,issue:phase+'-forecast-differs-from-projected-path',id:segment.id});else if(matched.cap!=='round'||matched.dash.length!==2||Math.abs(matched.dash[0]-1)>.01||Math.abs(matched.dash[1]-7)>.01)faults.push({test,mode,issue:phase+'-guide-is-not-dotted'});}if(mode==='hard'&&(actual.length!==1||actual[0].points.length!==2||Math.abs(ArcAimGuide.length(actual[0].points)*renderer.view.scale-48)>.01))faults.push({test,mode,issue:phase+'-hard-is-not-a-short-direction'});}
      const idle=capture().filter(p=>p.color===color&&Math.abs(p.width-2)<.02&&p.points.length>1);
      verify(idle,'idle');
      if(JSON.stringify(s)!==before)faults.push({test,mode,issue:'render-mutated-combat'});
      startCharge('difficulty-test');s.power=test.power;const charging=capture().filter(p=>p.color===color&&Math.abs(p.width-2)<.02&&p.points.length>1);
      verify(charging,'charge');
      samples.push({...test,mode,visibleBranches:expected.length,split:plan.events.some(e=>e.type==='split'),bounce:plan.events.some(e=>e.type==='bounce')});cancelCharge();
     }
     save.data.difficulty='easy';save.data.equippedWeaponId='W01';selectedMap=0;start();endDemo();save.data.difficulty='hard';
     if(s.difficulty!=='easy')faults.push({issue:'mode-changed-during-active-duel'});
     lobby();save.data.difficulty='hard';selectedMap=0;start();endDemo();s.angle=48;startCharge('hard-shot');s.power=70;releaseCharge('hard-shot');
     if(s.shotCount!==1||s.phase!=='flight')faults.push({issue:'hard-real-release-not-one-shot'});
     flight=Math.min(.25,shot.duration/2);const live=capture(),look=ArcWeapons.get(shot.weaponId).appearance;
     if(!live.some(p=>p.color===look.color&&p.width>4))faults.push({issue:'hard-real-projectile-trail-hidden'});
     selectedMap=5;start();endDemo();encounter=null;const shown=runDemo('reflection');
     if(!shown||!demo)faults.push({issue:'hard-preview-unavailable'});else{demo.age=demo.flightStart+demo.plan.duration*.6;hud();if(capture().length===0)faults.push({issue:'hard-preview-blank'});}
     return {faults,samples};
    });
    ok(result.faults.length===0,JSON.stringify(result.faults));ok(result.samples.some(s=>s.split),'actual split forecast rendered');ok(result.samples.some(s=>s.bounce),'actual reflected forecast rendered');drawCases.push(...result.samples);
    await page.evaluate(()=>{lobby();save.data.difficulty='hard';save.data.equippedWeaponId='W01';selectedMap=0;start();endDemo();cancelAnimationFrame(raf);raf=0;draw();});
    await page.locator('#world').focus();await page.keyboard.down('Space');
    ok(await page.evaluate('charge?.id==="keyboard"'),'Space still starts keyboard fire from the battlefield');
    await page.evaluate(()=>update(.3,.3));await page.keyboard.up('Space');
    ok(await page.evaluate('s.shotCount===1&&s.phase==="flight"&&!charge'),'keyboard release fires once after native form fix');
    for(const mode of['easy','normal','hard']){
     await page.evaluate(mode=>{cancelAnimationFrame(raf);raf=0;lobby();save.data.difficulty=mode;save.data.equippedWeaponId='W01';selectedMap=0;start();endDemo();encounter=null;document.getElementById('encounterBanner').hidden=true;s.angle=48;startCharge('screen');s.power=68;hud();draw();},mode);
     await page.screenshot({path:path.join(out,'forecast-'+mode+'.png')});
    }
   }
   rows.push({width,height,touch,languages:2,persistence:true});await context.close();
  }
  ok(!errors.length,errors.join('\n'));ok(!bad.length,'no failed local asset requests '+bad.join(','));
  const report={status:'PASS',checks,viewports:rows,drawCases,errors,badRequests:bad,scope:'Actual Chromium native difficulty choices, legacy save preservation, language and keyboard, short landscape reachability, real Canvas dotted forecasts in idle/charge, hard-mode 48px direction only, immutable battle snapshot, actual hard-mode shot, and preview availability. Emulation, not physical devices or human difficulty validation.'};
  fs.writeFileSync(path.join(out,'DIFFICULTY_BROWSER.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks,viewports:rows.length,drawCases:drawCases.length,errors},null,2));
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
