'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const E=require('../dist/engine.js'),Save=require('../dist/save.js'),{copy,state}=require('../tools/probe_boss_ballistics.cjs');
const root=path.resolve(__dirname,'../../..'),out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-boss-movement-browser';fs.mkdirSync(out,{recursive:true});
const selection=process.argv.find(arg=>arg.startsWith('--stages='));
const transfers=[[10,70,80],[20,60,80],[30,50,90],[40,10,90],[50,30,100],[60,50,100],[70,60,100],[80,70,70],[90,60,100]];
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file+='/index.html';fs.readFile(file,(error,body)=>{if(error)return res.writeHead(404).end();res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.jpeg':'image/jpeg','.wav':'audio/wav','.m4a':'audio/mp4'})[path.extname(file)]||'text/html');res.end(body);});});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({executablePath:process.env.ARCLINE_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox']}),rows=[],errors=[];
 try{
  const context=await browser.newContext({viewport:{width:1200,height:720},reducedMotion:'reduce'});
  await context.addInitScript(profile=>{localStorage.setItem('arcline-campaign-v1',JSON.stringify(profile));localStorage.setItem('arcline-install-guide-v1','{"state":"closed"}');},{schemaVersion:8,campaignResetVersion:2,cleared:99,difficulty:'normal',difficultyConfirmed:true,journeyStarted:true,unlockedCharacterIds:Save.characterIds,joinedCharacterIds:Save.characterIds,seenPreviewIds:Save.previewIds,onboarding:{step:'done'},journal:{introSeen:true,moviesSeen:['prologue','30','60']}});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(String(error)));await page.goto('http://127.0.0.1:'+server.address().port+'/ARCLINE/game/dist/');await page.waitForFunction('save.ready&&!document.getElementById("play").disabled');
  async function run(stage,angle,power,fps,lowHp=false,fallback=false){
   const fixture=copy(state(stage).s);let seed=77;
   if(lowHp){fixture.units[0].hp=.05;for(let i=1;i<=128;i++)if(E.cpuPlan(copy(fixture),E.seeded(i)).damage[0]>0){seed=i;break;}}
   await page.setViewportSize(fps===120?{width:844,height:390}:{width:1200,height:720});
   const before=await page.evaluate(({stage,fixture,seed,angle,power,lowHp,fallback})=>{
    cancelAnimationFrame(raf);raf=0;selectedMap=stage-1;start({skipStory:true});endDemo();encounter=null;demo=null;transition=null;document.getElementById('encounterBanner').hidden=true;hostAudio=false;audioSync();
    s=structuredClone(fixture);s.enemyTactics={...s.enemyTactics,teleports:2,cooldown:2};s.enemyWalkRound=s.round;s.enemyWalkUsed=140;s.random=E.seeded(s.matchSeed);s.matchSeed=(seed-s.round*1009)>>>0;s.turn=0;s.phase='aim';shot=null;shotMotion=null;tail=null;cpuJob=null;cpuReady=null;manualPaused=false;
    if(fallback){worker.terminate();worker=null;}
    const ctx=document.getElementById('world').getContext('2d');if(!window.movementLabelTap){const native=ctx.fillText;ctx.fillText=function(text,...args){if(/^\d+(?:\.\d+)?$/.test(String(text)))movementLabels.push(String(text));return native.call(this,text,...args);};window.movementLabelTap=true;}window.movementLabels=[];
    window.movementCase={warning:structuredClone(s.telegraph),pose:{x:s.units[0].x,y:s.units[0].y,slope:s.units[0].slope},hp:s.units[0].hp};
    if(lowHp){s.turn=1;s.phase='cpu';s.time=0;requestCPU();}
    else{if(!E.selectTeleport(s))throw Error('Cannot select teleport');s.angle=angle;s.power=power;launch();}
    hud();draw();return {warning:movementCase.warning,pose:movementCase.pose,hp:E.combat.points(movementCase.hp)};
   },{stage,fixture,seed,angle,power,lowHp,fallback});
   if(!lowHp){const player=await page.evaluate(({fps})=>{let frames=0;while(!cpuJob&&!cpuReady&&!s.result&&frames++<1800){update(1/fps);draw();}return {success:s.last[0]?.teleportSuccess,weapon:s.last[0]?.weaponId,pose:{x:s.units[0].x,y:s.units[0].y,slope:s.units[0].slope},warning:s.telegraph};},{fps});assert(player.success&&player.weapon==='TELEPORT','actual controller commits a real teleport '+stage);assert.deepEqual(player.warning,before.warning,'player teleport does not replace warning '+stage);}
   await page.waitForFunction('!!cpuReady',null,{timeout:20000});
   const planning=await page.evaluate(({seed})=>{
    const p=cpuReady.plan,expected=E.planEnemyAction(s,E.seeded(seed)).plan,reference=structuredClone({...s,random:undefined});Object.assign(reference.units[0],movementCase.pose);if(E.bossActions.active(reference))Object.assign(reference.units[1],cpuReady.action?.to,{slope:0});reference.units[1].facing=E.bossActions.facing(reference);E.bossActions.refresh(reference);const originalAim=E.cpuPlan(reference,E.seeded(seed));
    window.movementPlan=p;return {worker:platformStatus.cpuJobs.at(-1)?.worker,damage:E.combat.points(p.damage[0]),aim:[p.angle,p.power,p.facing,originalAim.angle,originalAim.power,originalAim.facing],sameAim:p.angle===originalAim.angle&&p.power===originalAim.power&&p.facing===originalAim.facing,parity:JSON.stringify([p.damage,p.events,p.bullets])===JSON.stringify([expected.damage,expected.events,expected.bullets]),pose:{x:s.units[0].x,y:s.units[0].y,slope:s.units[0].slope}};
   },{seed});
   assert.equal(planning.worker,!fallback);assert(planning.sameAim&&planning.parity,'frozen aim and Worker parity '+stage+' '+JSON.stringify(planning));
   const after=await page.evaluate(({fps,lowHp})=>{let frames=0;while(!(lowHp?s.result:canAim())&&frames++<2200){update(1/fps);draw();}return {aim:canAim(),result:s.result,hp:E.combat.points(s.units[0].hp),hpLost:E.combat.points(movementCase.hp-s.units[0].hp),round:s.round,labels:[...new Set(movementLabels)],errors:platformStatus.errors,finite:s.units.every(u=>Number.isFinite(u.x+u.y+u.slope+u.hp))};},{fps,lowHp});
   assert(after.finite);assert.deepEqual(after.errors,[]);assert(Math.abs(after.hpLost-planning.damage)<1e-7,'actual contact HP '+stage);
   if(lowHp){assert.equal(after.result,'lose');assert.equal(after.hp,0);assert.equal(planning.damage,1);assert(after.labels.includes('1'),'Canvas shows actual remaining1HP '+stage);}
   else assert(after.aim&&after.round===4,'next real player turn '+stage);
   rows.push({stage,fps,lowHp,fallback,seed,before,planning,after});
   if(fps===30&&[20,50].includes(stage))await page.screenshot({path:path.join(out,(lowHp?'low-hp-':'teleport-')+stage+'.png')});
   fs.writeFileSync(path.join(out,'MOVEMENT_BROWSER.json'),JSON.stringify({scope:'Actual player teleport flight and landing, frozen warning, Worker/cooperative CPU, next input, exact low-HP Canvas label; PC30fps/mobile120fps.',rows,errors},null,2)+'\n');
  }
  for(const [stage,angle,power]of transfers.filter(([stage])=>!selection||selection.slice(9).split(',').map(Number).includes(stage))){for(const fps of [30,120]){await run(stage,angle,power,fps);await run(stage,angle,power,fps,true);}console.log('PASS actual controller movement/lowHP L'+stage);}
  await run(20,60,80,60,false,true);assert.deepEqual(errors,[]);console.log('PASS boss movement browser '+rows.length+' controller cases');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
