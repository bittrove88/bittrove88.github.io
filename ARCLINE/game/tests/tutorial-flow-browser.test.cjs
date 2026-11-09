'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../../..'),out=process.env.ARCLINE_EVIDENCE_DIR||path.resolve(__dirname,'../../evidence/tutorial-flow-0320');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.m4a':'audio/mp4'};
const server=http.createServer((req,res)=>{let file=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
let checks=0;const rows=[],errors=[];
const ok=(v,m)=>{assert(v,m);checks++;},same=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};
const profile=language=>({schemaVersion:8,campaignResetVersion:2,cleared:99,journeyStarted:true,difficultyConfirmed:true,onboarding:{step:'done'},journal:{moviesSeen:['prologue','30','60']},preferences:{language}});
const resources=p=>p.evaluate(()=>JSON.stringify({units:s.units.map(u=>({x:u.x,y:u.y,hp:u.hp,parts:u.parts.map(p=>p.hp)})),stock:I.fromState(s),special:s.specialAmmo,shots:s.shotCount,round:s.round,playerTurn:s.playerTurn}));
const readExcept=(p,ids=[])=>p.evaluate(ids=>ArcSave.previewIds.filter(key=>!ids.some(id=>key==='v5:'+id||id==='reflection'&&key==='v5:W')),ids);
async function enter(p,stage,seen,inventory={}){
 await p.evaluate(({stage,seen,inventory})=>{
  if(ArcScreens.isOpen('battleCoach'))document.querySelector('#battleCoach .coach-close').click();
  lobby();save.data.seenPreviewIds=seen;save.data.chapterRun=null;save.data.pendingRecruit=null;save.data.journal.pendingMovie=null;save.data.campaignInventory=I.normalize(inventory);selectedMap=stage-1;start();encounter=null;paintEncounter();hud();draw();
 },{stage,seen,inventory});
 await p.waitForFunction(n=>s?.stage===n,stage);
}
async function reachable(p,selector){const r=await p.locator(selector).evaluate(e=>{const b=e.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return{x:b.x,y:b.y,w:b.width,h:b.height,right:b.right,bottom:b.bottom,vw:innerWidth,vh:innerHeight,hit:hit===e||e.contains(hit)};});ok(r.w>=44&&r.h>=44&&r.x>=-1&&r.y>=-1&&r.right<=r.vw+1&&r.bottom<=r.vh+1&&r.hit,'reachable '+selector+' '+JSON.stringify(r));}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/ARCLINE/game/dist/';
 const browser=await chromium.launch({executablePath:process.env.ARCLINE_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--mute-audio']});
 try{
  for(const [width,height,language] of [[844,390,'ja'],[568,240,'ja'],[568,240,'en'],[1280,800,'en']]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:true,reducedMotion:'reduce'});
   await context.addInitScript(data=>{localStorage.setItem('arcline-install-guide-v1',JSON.stringify({state:'closed'}));if(!localStorage.getItem('arcline-campaign-v1'))localStorage.setItem('arcline-campaign-v1',JSON.stringify(data));},profile(language));
   const p=await context.newPage();p.on('pageerror',e=>errors.push(String(e)));await p.goto(url);await p.waitForFunction('save.ready&&!document.getElementById("play").disabled');
   await enter(p,1,[]);same(await p.evaluate('demo.seenId'),'controls','first level still teaches firing');
   await p.evaluate(()=>globalThis.firstTutorialPanel=document.getElementById('tutorial'));
   const before=await resources(p);await reachable(p,'#previewOK');await p.locator('#previewOK').click();
   same(await p.evaluate('demo.guide.kind'),'special','special rules follow inside the same flow');
   ok(await p.evaluate('document.getElementById("tutorial")===firstTutorialPanel'),'the tutorial panel is retained');
   same(await p.locator('#specialLesson').count(),0,'the independent special modal was removed');
   ok(await p.evaluate('save.data.seenPreviewIds.includes("v5:controls")&&!save.data.seenPreviewIds.includes("v6:special-charge")'),'only the completed step is acknowledged');
   same(await resources(p),before,'special explanation spends no battle resources');await reachable(p,'#previewOK');
   await p.screenshot({path:path.join(out,`level1-special-${width}-${language}.png`)});
   await p.locator('#previewOK').click();ok(await p.evaluate('!demo&&canAim()'),'level1 returns to live aiming');
   const read=['v5:controls','v6:special-charge'];await enter(p,2,read);same(await p.evaluate('demo.seenId'),'aim','aim stays on level2');
   await p.locator('#previewOK').click();same(await p.evaluate('demo.guide.kind'),'map','map follows aim in the same flow');
   ok(await p.locator('#battleCoach').isHidden(),'no second controls modal');
   ok(await p.evaluate('!save.data.seenPreviewIds.includes("v7:touch-controls")'),'opening the map guide does not mark it read');
   await p.evaluate('save.pending');await p.reload();await p.waitForFunction('save.ready&&!document.getElementById("play").disabled');await p.locator('#play').click();
   same(await p.evaluate('demo.guide.kind'),'map','an interrupted map guide resumes after a real save/reload');
   same(await p.evaluate('demo.seenId'),'guide','the completed aiming example is not replayed on resume');
   const mapBefore=await resources(p);await reachable(p,'#previewOK');
   await p.evaluate(()=>{pauseHost('tutorial-precheck');mapCamera.open();});ok(await p.evaluate('!mapCamera.active'),'host pause also blocks opening a map from the guide');await p.evaluate(()=>resumeHost('tutorial-precheck'));
   // The guide may scroll at 240px height; its action remains keyboard/touch accessible.
   await p.locator('#tutorialOpenMap').scrollIntoViewIfNeeded();await reachable(p,'#tutorialOpenMap');await p.locator('#tutorialOpenMap').click();
   ok(await p.evaluate('mapCamera.active&&!canAim()'),'the actual map opens from the guide while battle input stays blocked');
   await p.locator('#mapCameraIn').click();await p.locator('#mapCameraFit').click();await p.locator('#mapCameraClose').click();
   same(await p.evaluate('demo.guide.kind'),'map','closing the map returns to the same guide step');same(await resources(p),mapBefore,'map inspection does not spend a turn or stock');
   await p.screenshot({path:path.join(out,`level2-map-${width}-${language}.png`)});await p.locator('#previewOK').click();
   ok(await p.evaluate('!demo&&canAim()&&save.data.seenPreviewIds.includes("v7:touch-controls")'),'closing the completed guide persists its read key');
   await enter(p,4,await readExcept(p,['teleport','W02','S_GUARD']),{weapons:{W02:3},skills:{S_REPAIR:2,S_GUARD:2}});
   same(await p.evaluate('demo.seenId'),'teleport','level4 keeps its teleport lesson');await p.locator('#previewOK').click();
   ok(await p.evaluate('!demo&&canAim()'),'carried equipment does not interrupt after the stage lesson');
   await p.locator('#weaponToggle').click();await p.locator('[data-choose-weapon="W02"]').click();same(await p.evaluate('demo.seenId'),'W02','actual weapon selection still opens the existing first-use preview');await p.locator('#previewOK').click();
   await p.evaluate(()=>{s.units[0].hp=s.units[0].maxHp*.5;hud();});
   await p.locator('#skillToggle').click();await p.locator('[data-skill="S_REPAIR"]').click();await p.locator('#battleSkillUse').click();
   ok(await p.evaluate('!demo&&!document.getElementById("repairConfirm").hidden&&s.skills.S_REPAIR===2'),'repair goes directly to its cost/amount confirmation before spending');
   await p.locator('#repairCancel').click();await p.locator('#closeSkills').click();
   await enter(p,5,await readExcept(p,['boss-core']));ok(await p.evaluate('!demo'),'midboss no longer requests a major-boss core demo');
   ok(await p.evaluate('ArcStory.entry(5,"ja").feature.includes("破壊すると攻撃ダメージが半減")'),'midboss keeps a truthful existing introduction');
   await enter(p,9,(await readExcept(p)).filter(k=>k!=='v7:character-change'));await p.waitForFunction('!document.getElementById("battleCoach").hidden');
   ok(await p.evaluate('!save.data.seenPreviewIds.includes("v7:character-change")'),'character guide is not read merely by opening it');await p.locator('#battleCoach .coach-close').click();
   ok(await p.evaluate('save.data.seenPreviewIds.includes("v7:character-change")'),'character guide is read on close');
   await enter(p,10,await readExcept(p,['boss-core']));same(await p.evaluate('demo.seenId'),'boss-core','armor and core still have their required level10 example');await p.locator('#previewOK').click();
   await enter(p,21,(await readExcept(p,['controls','C'])).filter(k=>k!=='v7:touch-controls'));
   same(await p.evaluate('demo.seenId'),'controls','returning players first recover controls');await p.locator('#previewOK').click();same(await p.evaluate('demo.guide.kind'),'map','missing map guidance is retained');await p.locator('#previewOK').click();
   same(await p.evaluate('demo.seenId'),'C','cloud explanation is not lost behind controls');await p.locator('#previewOK').click();ok(await p.evaluate('!demo&&canAim()'),'the required queue ends without carried-tool previews');
   if(width===844){
    for(const [stage,id] of [[3,'move'],[6,'reflection'],[7,'destruction'],[8,'roof'],[31,'K'],[37,'B'],[41,'U'],[49,'F'],[65,'V'],[71,'M'],[73,'terminal']]){
     await enter(p,stage,await readExcept(p,[id]));same(await p.evaluate('demo?.seenId'),id,'required first-use feature '+stage);await p.locator('#previewOK').click();ok(await p.evaluate('!demo&&canAim()'),'feature returns to battle '+stage);
    }
    const read=await readExcept(p,['C']);await p.evaluate(()=>{globalThis.originalPreviewCreate=ArcPreview.create;ArcPreview.create=(s,id)=>id==='C'?null:originalPreviewCreate(s,id);});
    await enter(p,21,read);same(await p.evaluate('demo.guide.kind'),'fallback','a failed required preview has a text fallback');
    const held=await resources(p);ok((await p.locator('#tutorialDetails').innerText()).length>10,'fallback contains the actual lesson');await p.locator('#previewOK').click();same(await resources(p),held,'fallback is non-consuming');
    await p.evaluate(()=>ArcPreview.create=originalPreviewCreate);
    // Real pickup/turn processing: no acquired-skill demo appears at the next aim phase.
    await enter(p,4,await readExcept(p),{});
    const pickup=await p.evaluate(()=>{for(let a=-12;a<=85;a+=2)for(let power=20;power<=100;power+=2){const plan=E.trajectory(s,0,a,power);if(plan.events.some(e=>e.type==='pickup'&&e.id===s.pickups[0].id)){s.angle=a;s.power=power;launch();return true;}}return false;});ok(pickup,'the actual skill capsule has a reachable shared-physics route');
    await p.waitForFunction('s.skills.S_REPAIR>0',{},{timeout:15000});
    await p.waitForFunction('s.phase==="aim"&&s.playerTurn>=2&&!shot',{},{timeout:15000});ok(await p.evaluate('!demo&&canAim()'),'a real acquired skill does not interrupt the next player turn');
   }
   ok(await p.evaluate(()=>!platformStatus.errors.length),'no platform/worker errors');
   rows.push({width,height,language,status:'PASS'});await context.close();
  }
  // Preserve the authorized beginning: install -> begin -> prologue -> Gun -> optional trial -> level1.
  const fresh=await browser.newContext({viewport:{width:844,height:390},reducedMotion:'reduce'}),p=await fresh.newPage();p.on('pageerror',e=>errors.push(String(e)));await p.goto(url);
  await p.locator('#installLater').click();await p.locator('#beginJourney').click();await p.locator('#filmSkip').click();
  await p.locator('#gunIntroContinue').click();ok(await p.locator('#difficultyIntro').isVisible(),'the original difficulty screen still follows Gun');
  await p.locator('#confirmDifficulty').click();await p.waitForFunction('s?.stage===1&&demo?.seenId==="controls"');ok(true,'the original beginning reaches the firing lesson without moving stage2 lessons forward');await fresh.close();
  same(errors,[],'no uncaught browser errors');
  const report={phase:process.env.ARCLINE_PRECHECK?'precheck':'verification',status:'PASS',checks,viewports:rows,errors,method:'Local Chromium production UI; controlled progress, stock, injury and preview-failure fixtures. Required examples use the real physics engine. A real capsule shot and enemy response check acquisition flow. No human-comprehension or physical-device claim.'};
  fs.writeFileSync(path.join(out,'PRECHECK.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
