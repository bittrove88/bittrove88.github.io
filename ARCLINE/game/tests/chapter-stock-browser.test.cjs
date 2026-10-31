'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),E=require('../dist/engine.js'),S=require('../dist/save.js'),R=require('../dist/campaign-run.js');
const root=path.resolve(__dirname,'../dist'),out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-chapter-stock';fs.mkdirSync(out,{recursive:true});let checks=0;
const ok=(v,m)=>{checks++;assert(v,m);},equal=(a,b,m)=>{checks++;assert.deepEqual(a,b,m);};
const seed=20261031;
function initial(){const p=S.decode(JSON.stringify({schemaVersion:2,contentRevision:S.revision,cleared:6,unlockedWeaponIds:E.weapons.map(w=>w.id),equippedWeaponId:'W20',equippedCharacterId:'hana',collectedCosmeticIds:['S01','B10'],difficulty:'normal',seenPreviewIds:S.previewIds}));p.chapterRun=R.checkpoint(7,{weapons:{W06:2},skills:{BURST:2}},[],'browser-run',seed);return p;}
// Pickup aim must use the same selected machine as the browser, not a legacy
// no-character fixture. HANA has the straightforward normal arc for this test.
const arena=E.campaign(7,{equippedCharacterId:'hana',matchSeed:seed,battleInventory:{},battleMode:'W01'});let pickupAim=null;
for(let angle=-8;angle<=84;angle+=2)for(let power=20;power<=100;power+=2){const p=E.trajectory(arena,0,angle,power);if(p.events.some(e=>e.type==='pickup')&&(!pickupAim||p.duration<pickupAim.duration))pickupAim={angle,power,duration:p.duration};}
ok(pickupAim,'existing stage7 capsule has an actual shared-physics pickup path');
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(b);});});
async function boot(page){await page.waitForFunction('!document.getElementById("play").disabled');}
async function stop(page){await page.evaluate(()=>{cancelAnimationFrame(raf);raf=0;});}
async function drive(page,kind){return page.evaluate(async kind=>{
 for(let i=0;i<2400;i++){
  update(.05,.05);draw();
  if(kind==='choice'&&!document.getElementById('lootPicker').hidden)return {phase:s.phase,round:s.round};
  if(kind==='aim'&&s.phase==='aim'&&s.shotCount>0)return {phase:s.phase,round:s.round};
  if(kind==='result'&&!document.getElementById('overlay').hidden&&dialog==='result'){await save.pending;return {phase:s.phase,result:s.result,round:s.round};}
  if(i%12===0)await new Promise(r=>setTimeout(r,0));
 }throw Error('State did not reach '+kind+'; '+s.phase+', turn '+s.turn+', pending '+s.pendingLoot.length);
},kind);}
async function begin(page){await page.locator('#play').click();await stop(page);await page.evaluate(()=>{endDemo();encounter=null;document.getElementById('encounterBanner').hidden=true;hud();draw();});}
async function win(page){
 await page.evaluate(()=>{s.units[1].hp=.25;const aim=E.solve(s,0,{weaponId:s.mode,skill:s.selectedSkill});s.angle=aim.angle;s.power=aim.power;launch();});
 const result=await drive(page,'result');ok(result.result==='win','actual projectile resolves the controlled win fixture');
 await page.waitForFunction('!document.getElementById("resume").disabled');
}
async function reset(page,stage,inventory,cleared=99){await page.evaluate(({stage,inventory,cleared})=>{lobby();save.data.cleared=cleared;save.data.chapterRun=R.checkpoint(stage,inventory,[],'fixture-'+stage,20261031);selectedMap=stage-1;save.data.seenPreviewIds=[...ArcSave.previewIds];syncLobby();save.save();},{stage,inventory,cleared});await page.evaluate(()=>save.pending);await begin(page);}
async function geometry(page,selectors){return page.evaluate(selectors=>selectors.map(selector=>{const e=document.querySelector(selector),r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {selector,width:r.width,height:r.height,left:r.left,top:r.top,right:r.right,bottom:r.bottom,visible:!e.closest('[hidden]'),reachable:!!hit&&(hit===e||e.contains(hit)),maxWidth:innerWidth,maxHeight:innerHeight};}),selectors);}
function reachable(rows,label){ok(rows.every(r=>r.width>=44&&r.height>=44&&r.left>=0&&r.top>=0&&r.right<=r.maxWidth+1&&r.bottom<=r.maxHeight+1&&r.visible&&r.reachable),label+' '+JSON.stringify(rows));}

(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}),errors=[],bad=[],rows=[];
 try{for(const [width,height,touch] of[[568,240,true],[667,280,true],[844,390,true],[932,430,true],[1440,900,false]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,deviceScaleFactor:2});await context.addInitScript(payload=>{if(!localStorage.getItem('arcline-campaign-v1'))localStorage.setItem('arcline-campaign-v1',JSON.stringify(payload));},initial());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)bad.push(r.url());});await page.goto(url);await boot(page);await stop(page);
  equal(await page.evaluate('save.data.chapterRun.inventory'),{weapons:{W06:2},skills:{BURST:2}},'entry loaded '+width);
  reachable(await geometry(page,['#openCollection','#openCharacters','#chooseLevel','#play']), 'lobby stock controls '+width);
  await page.locator('#openCollection').click();ok(await page.locator('#weaponPickerTitle').innerText()==='章の持ち物','inventory title '+width);ok(await page.locator('[data-choose-weapon=W06] .weapon-choice-stock span').innerText()==='残り2発','exact carried quantity '+width);
  ok((await page.locator('#chapterSkillStock').innerText()).includes('爆発強化'),'carried skill named '+width);await page.locator('[data-choose-weapon=W06]').click();await page.evaluate(()=>save.pending);
  ok(await page.evaluate('save.data.chapterRun.mode')==='W06','opening selection saves without adding stock '+width);
  await page.locator('#openCollection').click();await page.locator('#openLibrary').scrollIntoViewIfNeeded();await page.locator('#openLibrary').click();ok(await page.locator('[data-equip-weapon]').count()===20,'all legacy weapon records remain '+width);await page.locator('[data-equip-weapon=W20]').click();await page.locator('#closeCollection').click();equal(await page.evaluate('save.data.chapterRun.inventory.weapons'),{W06:2},'practice weapon selection cannot grant chapter ammo '+width);
  if(width===844){
   await begin(page);ok(await page.evaluate('!runContext.practice&&s.mode==="W06"&&s.weaponStock.W06===2'),'actual chapter uses carried weapon, not library choice');
   await page.locator('#weaponToggle').click();await page.locator('[data-choose-weapon=W01]').click();
   await page.evaluate(aim=>{s.angle=aim.angle;s.power=aim.power;launch();},pickupAim);await drive(page,'aim');equal(await page.evaluate('s.weaponStock'),{W06:2,W02:3},'real capsule crossing grants three without losing held type');
   ok(await page.evaluate('s.mode')==='W01','real pickup does not auto-equip');equal(await page.evaluate('JSON.parse(localStorage.getItem(ArcSave.key)).chapterRun.inventory.weapons'),{W06:2},'uncommitted pickup does not overwrite entry snapshot');
   await page.reload();await boot(page);await stop(page);await begin(page);equal(await page.evaluate('s.weaponStock'),{W06:2},'reload restores entry instead of keeping an uncommitted pickup');ok(await page.evaluate('s.matchSeed')===seed,'reload keeps match seed');
   await page.locator('#weaponToggle').click();await page.locator('[data-choose-weapon=W01]').click();
   await page.evaluate(aim=>{s.angle=aim.angle;s.power=aim.power;launch();},pickupAim);await drive(page,'aim');
   await page.locator('#weaponToggle').click();await page.locator('[data-choose-weapon=W02]').click();await page.locator('#skillToggle').click();await page.locator('[data-skill=BURST]').click();await win(page);
   equal(await page.evaluate('save.data.chapterRun.inventory'),{weapons:{W06:2,W02:2},skills:{BURST:1}},'victory atomically carries actual unspent weapon and skill');ok(await page.evaluate('save.data.chapterRun.stage')===8,'next entry is stage8');
   await page.locator('#resume').click();await stop(page);equal(await page.evaluate('s.weaponStock'),{W06:2,W02:2},'next stage restores remainder');ok(await page.evaluate('s.skills.BURST')===1,'skill visible in next unsupplied stage');
   await page.evaluate(()=>{E.selectWeapon(s,'W02');E.selectSkill(s,'BURST');launch();});ok(await page.evaluate('s.weaponStock.W02===1&&s.skills.BURST===0'),'live action spends the remaining resources');
   await page.evaluate(()=>{s.result='lose';s.reason='durability';s.phase='over';shot=null;finishResult();});await page.locator('#resume').click();await stop(page);equal(await page.evaluate('s.weaponStock'),{W06:2,W02:2},'loss retry restores entry quantities');ok(await page.evaluate('s.skills.BURST')===1,'loss retry restores skill');
   await page.evaluate(()=>lobby());await page.locator('#chooseLevel').click();await page.locator('[data-area="1"]').click();await page.locator('[data-stage="6"]').click();await begin(page);
   ok(await page.evaluate('runContext.practice&&s.weaponStock.W20===3'),'cleared map uses isolated practice weapon');const campaignBefore=await page.evaluate('JSON.stringify(save.data.chapterRun)');await page.evaluate(()=>E.selectWeapon(s,'W01'));await win(page);equal(await page.evaluate('JSON.stringify(save.data.chapterRun)'),campaignBefore,'practice win leaves chapter inventory intact');ok(await page.locator('#resume').innerText()==='もう一度練習','practice result is labelled');
   await page.evaluate(()=>lobby());await page.locator('#resumeRun').click();ok(await page.evaluate('selectedMap')===7,'return to live chapter is one click');
   for(const stage of[5,10]){await reset(page,stage,{weapons:{W02:2},skills:{BURST:1}});await win(page);const result=await page.evaluate('save.data.chapterRun');ok(result.stage===stage+1,'boundary advances '+stage);equal(result.inventory,stage===10?{weapons:{},skills:{}}:{weapons:{W02:2},skills:{BURST:1}},'midpoint carries and boss clears '+stage);}
   await page.evaluate(()=>{lobby();save.data.cleared=100;save.data.chapterRun=null;selectedMap=0;syncLobby();});await page.locator('#chooseLevel').click();await page.locator('[data-area="0"]').click();await page.locator('#restartChapter').scrollIntoViewIfNeeded();await page.locator('#restartChapter').click();ok(await page.locator('#modalTitle').innerText()==='第1章をはじめから？','explicit restart names chapter');await page.keyboard.press('Escape');ok(await page.evaluate('save.data.chapterRun===null'),'cancel restart preserves old record');
   await page.locator('#restartChapter').click();await page.locator('#resume').click();await stop(page);ok(await page.evaluate('!runContext.practice&&s.stage===1&&save.data.cleared===100'),'completed player can start a fresh chapter without losing progress');equal(await page.evaluate('s.weaponStock'),{},'fresh chapter starts empty');
   await reset(page,5,{weapons:{W02:2},skills:{BURST:1}});await page.evaluate(()=>{globalThis.failChapterWrites=true;const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===ArcSave.key&&failChapterWrites)throw new DOMException('Full','QuotaExceededError');return original.call(this,k,v);};});await win(page);ok(await page.locator('#resume').innerText()==='保存を再試行','failed checkpoint offers retry');ok(await page.evaluate('JSON.parse(localStorage.getItem(ArcSave.key)).chapterRun.stage')===5,'failed save retains persisted entry');await page.locator('#resume').click();await page.waitForFunction('!resultSaving');ok(await page.evaluate('s.stage')===5,'failed save cannot advance');await page.evaluate(()=>failChapterWrites=false);await page.locator('#resume').click();await page.waitForFunction('s.stage===6');await stop(page);ok(await page.evaluate('JSON.parse(localStorage.getItem(ArcSave.key)).chapterRun.stage')===6,'retry commits and advances once');
  }
  await reset(page,7,{weapons:{W06:2,W07:1,W13:3},skills:{BURST:2,PULL:1}},99);await page.evaluate(()=>E.selectWeapon(s,'W01'));
  await page.evaluate(aim=>{s.angle=aim.angle;s.power=aim.power;launch();},pickupAim);
  const choice=await drive(page,'choice');ok(choice.round>=2,'slot selection waits until enemy response '+width);ok(await page.evaluate('s.mode')==='W01','pending pickup does not equip '+width);
  for(const lang of['ja','en']){
   await page.evaluate(lang=>ArcI18n.setLanguage(lang),lang);reachable(await geometry(page,['#lootChoices button:nth-child(1)','#lootChoices button:nth-child(2)','#lootChoices button:nth-child(3)','#lootSkip']),'slot dialog fits '+width+' '+lang);
   ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow '+width+' '+lang);
  }
  await page.evaluate(()=>ArcI18n.setLanguage('ja'));const frozen=await page.evaluate(()=>{const before=JSON.stringify({clock,round:s.round,shotCount:s.shotCount,inventory:I.fromState(s)});update(5,5);return before===JSON.stringify({clock,round:s.round,shotCount:s.shotCount,inventory:I.fromState(s)});});ok(frozen,'choice freezes time and resources '+width);
  await page.keyboard.press('Tab');ok(await page.evaluate('!!document.activeElement.closest("#lootPicker")'),'focus stays inside choice '+width);
  if(width===568||width===844)await page.screenshot({path:path.join(out,'stock-choice-'+width+'.png')});
  await page.locator('[data-replace-loot=W07]').click();equal(await page.evaluate('s.weaponStock'),{W06:2,W13:3,W02:3},'UI replacement keeps other quantities '+width);ok(await page.evaluate('canAim()&&s.shotCount===1'),'choice does not fire another shot '+width);
  await reset(page,100,{skills:{BURST:1,SWAP:1}},99);await page.evaluate(()=>{encounter=null;document.getElementById('encounterBanner').hidden=true;openLoot(firstDemo);});ok(await page.locator('#lootName').innerText()==='牽引','overflow supply names incoming skill '+width);reachable(await geometry(page,['#lootChoices button:nth-child(1)','#lootChoices button:nth-child(2)','#lootSkip']),'skill replacement fits '+width);
  await page.locator('[data-replace-loot=SWAP]').click();await page.evaluate(()=>save.pending);ok(await page.evaluate('save.data.chapterRun.inventory.skills.PULL===2&&!save.data.chapterRun.inventory.skills.SWAP'),'supply decision stored in entry '+width);await page.reload();await boot(page);await stop(page);await begin(page);ok(await page.evaluate('s.skills.PULL===2&&!s.pendingLoot.length'),'supply decision survives reload '+width);
  await page.evaluate(()=>lobby());if(width===844)await page.screenshot({path:path.join(out,'chapter-lobby.png')});rows.push({width,height,touch,inventory:true,choice:true,language:true});await context.close();
 }
 ok(errors.length===0,errors.join('\n'));ok(bad.length===0,bad.join('\n'));const report={status:'PASS',checks,viewports:rows,pickupAim,errors,badRequests:bad,scope:'Actual Chromium: shared-physics capsule pickup and controlled projectile wins, stock carry/reload/retry, practice isolation, stage5/10 boundaries, old-completion chapter restart, save-failure gating, slot dialogs after real enemy response, and five responsive sizes. Controlled HP/result fixtures test progression; not human balance or physical phones.'};fs.writeFileSync(path.join(out,'CHAPTER_STOCK_BROWSER.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:'PASS',checks,viewports:rows.length,errors},null,2));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
