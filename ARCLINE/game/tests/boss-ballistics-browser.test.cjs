'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const E=require('../dist/engine.js'),Save=require('../dist/save.js'),{copy,state}=require('../tools/probe_boss_ballistics.cjs');
const root=path.resolve(__dirname,'../../..'),out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-boss-ballistics-browser';fs.mkdirSync(out,{recursive:true});
const preview=process.argv.includes('--preview'),selection=process.argv.find(arg=>arg.startsWith('--stages='));
const stages=selection?selection.slice(9).split(',').map(Number):preview?[20,30,60,80]:[10,20,30,40,50,60,80];
if(stages.some(stage=>![10,20,30,40,50,60,80].includes(stage)))throw Error('Unknown boss stage');
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file+='/index.html';fs.readFile(file,(error,body)=>{if(error)return res.writeHead(404).end();res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.jpeg':'image/jpeg','.wav':'audio/wav','.m4a':'audio/mp4'})[path.extname(file)]||'text/html');res.end(body);});});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({executablePath:process.env.ARCLINE_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox']}),rows=[],errors=[];
 try{
  const context=await browser.newContext({viewport:{width:1200,height:720},reducedMotion:'reduce'});
  await context.addInitScript(profile=>{localStorage.setItem('arcline-campaign-v1',JSON.stringify(profile));localStorage.setItem('arcline-install-guide-v1','{"state":"closed"}');},{schemaVersion:8,campaignResetVersion:2,cleared:99,difficulty:'normal',difficultyConfirmed:true,journeyStarted:true,unlockedCharacterIds:Save.characterIds,joinedCharacterIds:Save.characterIds,seenPreviewIds:Save.previewIds,onboarding:{step:'done'},journal:{introSeen:true,moviesSeen:['prologue','30','60']}});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(String(error)));await page.goto('http://127.0.0.1:'+server.address().port+'/ARCLINE/game/dist/');await page.waitForFunction('save.ready&&!document.getElementById("play").disabled');
  for(const stage of stages){
   const direction=({10:1,20:-1,30:1,40:1,50:-1,60:-1,80:-1})[stage],dodgeDirection=({10:-1,20:1,30:1,40:-1,50:1,60:1,80:-1})[stage],fixture=copy(state(stage,direction).s);let seed;
   for(let i=1;i<=128;i++){const candidate=(Math.imul(i,2654435761)^0xa53c9e71)>>>0;if(E.cpuPlan(fixture,E.seeded(candidate)).damage[0]>0){seed=candidate;break;}}
   assert(seed!==undefined,'native stationary hit exists '+stage);
   for(const fps of preview?[60]:[30,120])for(const dodge of [false,true]){
    await page.setViewportSize(fps===120?{width:844,height:390}:{width:1200,height:720});
    const before=await page.evaluate(({stage,fixture,seed,dodge,dodgeDirection})=>{
     cancelAnimationFrame(raf);raf=0;selectedMap=stage-1;start({skipStory:true});endDemo();encounter=null;demo=null;transition=null;document.getElementById('encounterBanner').hidden=true;hostAudio=false;audioSync();
     s=structuredClone(fixture);s.enemyTactics={...s.enemyTactics,teleports:2,cooldown:2};s.enemyWalkRound=s.round;s.enemyWalkUsed=140;s.random=E.seeded(s.matchSeed);s.matchSeed=(seed-s.round*1009)>>>0;s.turn=0;s.phase='aim';const warning=structuredClone(s.telegraph),hp=s.units[0].hp,walked=dodge?E.move(s,0,dodgeDirection*10000):0;
     s.turn=1;s.phase='cpu';s.time=0;shot=null;shotMotion=null;tail=null;cpuJob=null;cpuReady=null;manualPaused=false;
     window.ballisticCase={hp,warning,expected:E.planEnemyAction(s,E.seeded(seed)).plan};requestCPU();hud();draw();return {hp:E.combat.points(hp),walked,warning};
    },{stage,fixture,seed,dodge,dodgeDirection});
    await page.waitForFunction('!!cpuReady',null,{timeout:20000});
    const result=await page.evaluate(({fps})=>{
     const p=cpuReady.plan,expected=ballisticCase.expected,workerUsed=platformStatus.cpuJobs.at(-1)?.worker,parity=JSON.stringify([p.damage,p.events,p.bullets])===JSON.stringify([expected.damage,expected.events,expected.bullets]);
     window.ballisticPlan=structuredClone(p);window.ballisticBefore=structuredClone({...s,random:undefined});let frames=0;while(!canAim()&&frames++<2200){update(1/fps);draw();}
     return {damage:E.combat.points(p.damage[0]),hpLoss:E.combat.points(ballisticCase.hp-s.units[0].hp),worker:workerUsed,parity,aim:canAim(),round:s.round,errors:platformStatus.errors};
    },{fps});
    assert(result.worker&&result.parity&&result.aim&&result.round===4,'Worker and next input '+stage);assert(Math.abs(result.damage-result.hpLoss)<1e-7,'actual HP follows contacts '+stage);assert.deepEqual(result.errors,[]);if(!dodge)assert(result.damage>0,'stationary real hit '+stage);
    if(dodge){const still=rows.find(row=>row.stage===stage&&row.fps===fps&&!row.dodge);assert(Math.abs(before.walked)>100&&result.damage<still.damage,'a legal walk can avoid the warning '+stage);}
    if(!dodge&&fps===(preview?60:30)){
     await page.evaluate(()=>{const last=ballisticPlan.events.filter(event=>event.type==='damage'&&event.unit===0).at(-1),time=last.t+.05;renderer.resetCamera();renderer.draw(ballisticBefore,{shot:ballisticPlan,flight:time,time,characterId:s.characterId,presentationFrame:{top:18,bottom:700}});});
     await page.screenshot({path:path.join(out,'boss-'+stage+'.png')});
    }
    rows.push({stage,direction,seed,fps,dodge,...before,...result});
   }
   console.log(JSON.stringify({stage,rows:rows.filter(row=>row.stage===stage).map(({before,warning,...r})=>r)}));
   fs.writeFileSync(path.join(out,'BROWSER.json'),JSON.stringify({scope:preview?'Limited production preview, not final acceptance':'Native difficult poses, frozen warning/legal dodge, Worker/main parity, contact HP and next input on PC/mobile and30/120fps',rows,errors},null,2)+'\n');
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
