'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright'),Save=require('../dist/save.js'),Run=require('../dist/campaign-run.js');
const root=path.resolve(__dirname,'../../..'),out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-hp-action-browser';fs.mkdirSync(out,{recursive:true});let checks=0;const errors=[],rows=[];
const ok=(v,m)=>{checks++;assert(v,m);};
const server=http.createServer((q,r)=>{let f=path.join(root,new URL(q.url,'http://local').pathname);if(f.endsWith('/'))f+='index.html';fs.readFile(f,(e,b)=>{if(e)return r.writeHead(404).end();r.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.png':'image/png','.jpeg':'image/jpeg','.m4a':'audio/mp4'})[path.extname(f)]||'text/html');r.end(b);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const b=await chromium.launch({executablePath:process.env.ARCLINE_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const mode of ['easy','normal','hard'])for(const [width,height,lang,motion]of[[568,240,'ja','no-preference'],[844,390,'en','no-preference']]){
  const c=await b.newContext({viewport:{width,height},hasTouch:true,isMobile:true,reducedMotion:motion});
  await c.addInitScript(({profile,lang})=>{localStorage.setItem('arcline-campaign-v1',JSON.stringify(profile));localStorage.setItem('arcline-language',lang);localStorage.setItem('arcline-install-guide-v1',JSON.stringify({state:'closed'}));},{lang,profile:{schemaVersion:8,campaignResetVersion:2,cleared:99,preferences:{language:lang,controls:'left'},difficulty:mode,difficultyConfirmed:true,journeyStarted:true,unlockedCharacterIds:Save.characterIds,joinedCharacterIds:Save.characterIds,seenPreviewIds:Save.previewIds,onboarding:{step:'done'},journal:{introSeen:true,moviesSeen:['prologue','30','60']},chapterRun:Run.checkpoint(100,{weapons:{W14:2},skills:{S_GUARD:1}},[],'final-retry-browser',4697)}});
  const p=await c.newPage();p.on('pageerror',e=>errors.push(String(e)));await p.goto('http://127.0.0.1:'+server.address().port+'/ARCLINE/game/dist/');await p.waitForFunction('!document.getElementById("play").disabled');await p.locator('#play').tap();await p.waitForFunction('s?.stage===100');
  async function ready(){if(await p.locator('#bossIntroSkip').isVisible())await p.locator('#bossIntroSkip').tap();await p.waitForFunction('canAim()');await p.evaluate(()=>{cancelAnimationFrame(raf);raf=0;});}
  await ready();await p.evaluate(lang=>ArcI18n.setLanguage(lang),lang);ok(await p.evaluate(lang=>ArcI18n.language===lang&&document.documentElement.lang===lang,lang),'requested UI language '+lang);
  ok(await p.evaluate('s.specialAmmo===3&&s.shotCount===0&&s.shotLimit===20'),'initial full charges and character budget '+width);
  const hpState=await p.evaluate(()=>({player:s.units[0].hp*20,enemy:s.units[1].hp*20,quota:s.spec.finalBattle.requiredDamage*20,mode:s.difficulty}));
  ok(hpState.player===100&&hpState.enemy===(mode==='easy'?800:1500)&&hpState.quota===(mode==='easy'?80:150)&&hpState.mode===mode,'effective difficulty HP and quota '+mode);

  await p.locator('#finalTeamHUD').tap();const note=await p.locator('#battleMachineNote').textContent();ok(note.includes(lang==='en'?'3 specials':'各3発')&&note.includes('20'),'sortie order explains current charges and actions '+lang);await p.locator('#closeBattleMachines').tap();
  ok(note.includes('100')&&note.includes(String(mode==='easy'?80:150)),'effective HP and quota in sortie text');
  if(mode==='normal'&&lang==='ja'){
   const fired=await p.evaluate(()=>{s.angle=72;s.power=95;launch();let frames=0;while(s.phase==='flight'&&frames++<1200){update(1/60);draw();}return {phase:s.phase,shots:s.shotCount};});
   ok(fired.phase==='impact'&&fired.shots===1,'real final player shot');await p.waitForFunction('!!cpuReady',null,{timeout:15000});
   const next=await p.evaluate(()=>{let frames=0,enemyFired=false;while(!canAim()&&frames++<1800){update(1/60);draw();if(shot?.side===1)enemyFired=true;}return {aim:canAim(),enemyFired,worker:platformStatus.cpuJobs.at(-1)?.worker,hp:s.units[0].maxHp*20,quota:s.spec.finalBattle.requiredDamage*20};});
   ok(next.aim&&next.enemyFired&&next.worker&&next.hp===100&&next.quota===150,'worker retains balanced state through next turn');
  }

  for(const index of [3,9]){
   await p.evaluate(index=>{while(s.finalTeam.index<index){if(s.finalTeam.index===0)s.weaponStock.W14=1;const credited=ArcFinalTeam.credit(s,s.characterId,s.spec.finalBattle.requiredDamage);s.units[1].hp-=credited;E.check(s);advanceTurn();transition=null;s.phase='aim';}hud();draw();},index);
   const expected=await p.evaluate(()=>({id:s.characterId,index:s.finalTeam.index,map:s.finalTeam.map,damage:JSON.stringify(s.finalTeam.damage),stock:JSON.stringify(I.fromState(s)),world:JSON.stringify(s.world),effects:JSON.stringify(s.effects),boss:JSON.stringify({hp:s.units[1].hp,parts:s.units[1].parts.map(p=>p.hp)}),save:JSON.stringify(save.data)}));
   await p.evaluate(()=>{s.specialAmmo=0;s.shotCount=12;s.weaponStock.W14=0;s.skills.S_GUARD=0;ArcFinalTeam.credit(s,s.characterId,2);s.units[1].hp-=2;const wall=s.world.solids.find(o=>o.destructible);if(wall){s.effects.destroyed.push(wall.id);E.rebuildWorld(s);}s.units[0].hp=0;E.check(s);finishResult();});
   ok(await p.locator('#retryFinalCharacter').isVisible()&&await p.locator('#resume').isVisible(),'both retry choices visible '+width+'/'+index);
   const rects=await p.evaluate(()=>['retryFinalCharacter','resume','returnLobby'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};}));
   ok(rects.every(r=>r.left>=-1&&r.right<=width+1&&r.top>=-1&&r.bottom<=height+1&&Math.min(r.width,r.height)>=43),'all retry actions fit and retain touch targets '+width+'/'+index+' '+JSON.stringify(rects));
   if(index===9)await p.screenshot({path:path.join(out,'hp-action-'+mode+'-'+lang+'.png')});
   await p.locator('#retryFinalCharacter').tap();await p.waitForFunction(id=>s?.characterId===id&&s.units[0].hp===5,expected.id);await ready();
   const actual=await p.evaluate(()=>({id:s.characterId,index:s.finalTeam.index,map:s.finalTeam.map,damage:JSON.stringify(s.finalTeam.damage),stock:JSON.stringify(I.fromState(s)),world:JSON.stringify(s.world),effects:JSON.stringify(s.effects),boss:JSON.stringify({hp:s.units[1].hp,parts:s.units[1].parts.map(p=>p.hp)}),save:JSON.stringify(save.data)}));
   ok(JSON.stringify(actual)===JSON.stringify(expected),'retry restores exact machine entry,prior progress,stock,boss,terrain and campaign record '+width+'/'+index);
   ok(await p.evaluate('s.specialAmmo===3&&s.shotCount===0&&s.shotLimit===20&&!cpuJob&&!cpuReady&&!charge'),'retry resets charges,actions and old CPU/input '+width+'/'+index);
   rows.push({mode,width,height,lang,motion,index,character:actual.id,map:actual.map});
  }
  await p.evaluate(()=>{s.units[0].hp=0;E.check(s);finishResult();});await p.locator('#resume').tap();await p.waitForFunction('s.characterId==="hana"&&s.finalTeam.index===0');await ready();
  ok(await p.evaluate('s.specialAmmo===3&&s.shotCount===0&&s.shotLimit===20&&Object.values(s.finalTeam.damage).every(v=>v===0)&&s.weaponStock.W14===2'),'restart all ten restores full level entry '+width);
  await p.evaluate(()=>{selectedMap=89;start({skipStory:true});});await ready();await p.evaluate(()=>{s.units[0].hp=0;E.check(s);finishResult();});
  ok(await p.locator('#retryFinalCharacter').isHidden()&&await p.evaluate('s.shotLimit===28'),'ordinary stage90 retains its existing retry and budget '+width);
  await c.close();
 }
 ok(!errors.length,errors.join('\n'));fs.writeFileSync(path.join(out,'HP_ACTION_BROWSER.json'),JSON.stringify({status:'PASS',checks,rows,errors,scope:'Difficulty HP/quota and dynamic sortie/retry text in Japanese/English, six viewport-mode conditions; real final shot through Worker and next turn; boundary/retry fixtures at indices3/9, full restart and stage90 noninterference. Synthetic progress fixtures are not native win evidence. Physical devices unverified.'},null,2));console.log('PASS HP/action browser '+checks+' checks');
}finally{await b.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
