'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright'),Save=require('../dist/save.js');
const root=path.resolve(__dirname,'../../..'),out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-final-attacks-browser';fs.mkdirSync(out,{recursive:true});
const server=http.createServer((q,r)=>{let f=path.resolve(root,'.'+new URL(q.url,'http://local').pathname);if(!f.startsWith(root+path.sep))return r.writeHead(403).end();if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f+='/index.html';fs.readFile(f,(e,b)=>{if(e)return r.writeHead(404).end();r.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.png':'image/png','.jpeg':'image/jpeg','.m4a':'audio/mp4','.wav':'audio/wav'})[path.extname(f)]||'text/html');r.end(b);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.ARCLINE_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox']});const rows=[],errors=[];try{
 for(const [width,height,fps]of [[1200,720,30],[844,390,120]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
  const profile={schemaVersion:8,campaignResetVersion:2,cleared:99,difficulty:'normal',difficultyConfirmed:true,journeyStarted:true,unlockedCharacterIds:Save.characterIds,joinedCharacterIds:Save.characterIds,seenPreviewIds:Save.previewIds,onboarding:{step:'done'},journal:{introSeen:true,moviesSeen:['prologue','30','60']}};
  await context.addInitScript(profile=>{localStorage.setItem('arcline-campaign-v1',JSON.stringify(profile));localStorage.setItem('arcline-install-guide-v1','{"state":"closed"}');},profile);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:'+server.address().port+'/ARCLINE/game/dist/');await page.waitForFunction('save.ready&&!document.getElementById("play").disabled');
  for(const index of [3,4,5])for(const dodge of [false,true]){
   const setup=await page.evaluate(({index,dodge})=>{
    cancelAnimationFrame(raf);raf=0;selectedMap=99;start({skipStory:true});endDemo();encounter=null;demo=null;transition=null;document.getElementById('encounterBanner').hidden=true;hostAudio=false;audioSync();
    while(s.finalTeam.index<index){const credit=ArcFinalTeam.credit(s,s.characterId,s.spec.finalBattle.requiredDamage);s.units[1].hp-=credit;ArcFinalTeam.advance(s);}
    s.finalAttackPattern={phase:1,step:2};E.telegraph(s);const warning=JSON.parse(JSON.stringify(s.telegraph));
    const walked=dodge?E.move(s,0,s.characterId==='rico'?-140:140):0;
    s.turn=1;s.phase='cpu';s.time=0;shot=null;shotMotion=null;tail=null;cpuJob=null;cpuReady=null;requestCPU();hud();draw();
    const c=document.getElementById('world').getContext('2d');if(!window.finalLabelTap){const native=c.fillText;window.finalLabels=[];c.fillText=function(t,...a){if(/^\d+(?:\.\d+)?$/.test(String(t)))finalLabels.push(String(t));return native.call(this,t,...a);};window.finalLabelTap=true;}finalLabels.length=0;
    return {character:s.characterId,hp:E.combat.points(s.units[0].hp),quota:E.combat.points(s.spec.finalBattle.requiredDamage),limit:s.shotLimit,warning,walked};
   },{index,dodge});
   assert.equal(setup.hp,100);assert.equal(setup.quota,150);assert.equal(setup.limit,20);if(dodge)assert(Math.abs(setup.walked)>=130,'real legal walking before the attack');
   await page.waitForFunction('!!cpuReady',null,{timeout:15000});
   const turn=await page.evaluate(({fps})=>{
    const plan=cpuReady.plan,events=plan.events.filter(e=>e.type==='redirect');let frames=0;
    while(s.phase!=='flight'&&frames++<300)update(1/fps);
    while(s.phase==='flight'&&flight<events[0].t+.035&&frames++<1600){update(1/fps);draw();}
    const body=plan.events.filter(e=>e.type==='damage'&&e.unit===0);
    return {damage:E.combat.points(plan.damage[0]),turns:events.map(e=>({x:e.x,y:e.y,t:e.t})),body:body.map(e=>E.combat.points(e.value)),worker:platformStatus.cpuJobs.at(-1)?.worker,phase:s.phase};
   },{fps});
   assert.equal(turn.damage,dodge?0:34);assert.equal(turn.turns.length,3);assert.equal(turn.worker,true);assert(turn.turns.every(e=>e.y<setup.warning.targetY-300),'visible turn comes from above frozen target');
   if(!dodge)await page.screenshot({path:path.join(out,'transfer-'+setup.character+'-'+width+'.png')});
   const after=await page.evaluate(({fps})=>{let frames=0;while(!canAim()&&frames++<1800){update(1/fps);draw();}return {aim:canAim(),hp:E.combat.points(s.units[0].hp),step:s.finalAttackPattern.step,next:s.telegraph.kind,errors:[...platformStatus.errors,...(globalThis.battleErrors||[])],labels:[...new Set(finalLabels)],serializable:!!structuredClone({...s,random:undefined})};},{fps});
   assert(after.aim&&after.serializable,'actual controller returns to input');assert.equal(after.hp,dodge?100:66);assert.equal(after.step,3);assert.equal(after.next,'TWIN');assert.deepEqual(after.errors,[]);if(!dodge)assert(after.labels.includes('34'),'actual Canvas cumulative damage34');
   rows.push({width,height,fps,index,dodge,...setup,...turn,after});
  }
  // The cooperative path uses exactly the same high arc without a Worker.
  const fallback=await page.evaluate(async()=>{worker.terminate();worker=null;selectedMap=99;start({skipStory:true});endDemo();encounter=null;demo=null;transition=null;while(s.finalTeam.index<4){const v=ArcFinalTeam.credit(s,s.characterId,s.spec.finalBattle.requiredDamage);s.units[1].hp-=v;ArcFinalTeam.advance(s);}s.finalAttackPattern={phase:1,step:2};E.telegraph(s);s.turn=1;s.phase='cpu';s.time=0;cpuJob=null;cpuReady=null;requestCPU();return s.characterId;});
  await page.waitForFunction('!!cpuReady',null,{timeout:15000});const fallbackResult=await page.evaluate(()=>{let frames=0;while(!canAim()&&frames++<1800){update(1/60);draw();}return {aim:canAim(),hp:E.combat.points(s.units[0].hp),worker:platformStatus.cpuJobs.at(-1)?.worker,errors:platformStatus.errors};});assert.equal(fallback,'rico');assert(fallbackResult.aim);assert.equal(fallbackResult.hp,66);assert.equal(fallbackResult.worker,false);assert.deepEqual(fallbackResult.errors,[]);rows.push({width,height,fallback:true,...fallbackResult});
  await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'FINAL_ATTACKS_BROWSER.json'),JSON.stringify({status:'PASS',rows,errors,scope:'Actual native phase-two platforms, frozen warning/legal walking, CPU Worker/cooperative plans, visible high turn, contact damage and next input on PC/mobile and30/120fps.'},null,2));console.log('PASS final attacks browser '+rows.length+' controller cases');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
