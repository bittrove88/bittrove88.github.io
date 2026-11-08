'use strict';
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const Save = require('../dist/save.js'), Run = require('../dist/campaign-run.js');
const root = path.resolve(__dirname, '../../..');
const out = process.env.ARCLINE_EVIDENCE_DIR || '/tmp/arcline-pickup-stock';
fs.mkdirSync(out, { recursive: true });
let checks = 0;
const rows = [], errors = [];
function ok(value, message) { checks++; assert(value, message); }
const server = http.createServer((req, res) => {
  let name = new URL(req.url, 'http://localhost').pathname;
  if (name.endsWith('/')) name += 'index.html';
  const file = path.resolve(root, '.' + name);
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (error, bytes) => {
    if (error) return res.writeHead(404).end();
    res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.jpeg': 'image/jpeg', '.m4a': 'audio/mp4' })[path.extname(file)] || 'application/octet-stream');
    res.end(bytes);
  });
});
// Intersect every clipping ancestor. A button's DOM rectangle alone can be
// outside the actual scroll viewport, especially in the portrait roster.
async function point(page, selector) {
  return page.locator(selector).evaluate(e => {
    const r = e.getBoundingClientRect();
    let left = Math.max(0, r.left), right = Math.min(innerWidth, r.right);
    let top = Math.max(0, r.top), bottom = Math.min(innerHeight, r.bottom);
    for (let p = e.parentElement; p; p = p.parentElement) {
      const s = getComputedStyle(p), b = p.getBoundingClientRect();
      if (/auto|scroll|hidden|clip/.test(s.overflowX)) { left = Math.max(left, b.left); right = Math.min(right, b.right); }
      if (/auto|scroll|hidden|clip/.test(s.overflowY)) { top = Math.max(top, b.top); bottom = Math.min(bottom, b.bottom); }
    }
    if (right - left < 20 || bottom - top < 28) return null;
    const x = (left + right) / 2, y = (top + bottom) / 2;
    const hit = document.elementFromPoint(x, y);
    return hit && (hit === e || e.contains(hit)) ? { x, y } : null;
  });
}
async function scrollState(page, selector) {
  return page.locator(selector).evaluate(e => {
    const values = [];
    for (let p = e; p; p = p.parentElement) values.push(p.scrollTop);
    return values;
  });
}
async function swipe(page, cdp, selector, direction = -1, distance = 160) {
  const from = await page.locator(selector).evaluate((e, {direction, distance}) => {
    const app = document.getElementById('app'), viewport = ArcViewport;
    const logical = node => viewport.rect(node, app), r = logical(e);
    const native = app.getBoundingClientRect(), rotation = Number(app.dataset.viewRotation) || 0;
    const client = (x, y) => rotation === 90 ? { x: native.right-y*native.width/app.clientHeight, y: native.top+x*native.height/app.clientWidth }
      : rotation === -90 ? { x: native.left+y*native.width/app.clientHeight, y: native.bottom-x*native.height/app.clientWidth }
      : rotation === 180 ? { x: native.right-x*native.width/app.clientWidth, y: native.bottom-y*native.height/app.clientHeight }
      : { x: native.left+x*native.width/app.clientWidth, y: native.top+y*native.height/app.clientHeight };
    let top = Math.max(0, r.top), bottom = Math.min(app.clientHeight, r.bottom);
    for (let p = e.parentElement; p && p !== app; p = p.parentElement) {
      if (/auto|scroll|hidden|clip/.test(getComputedStyle(p).overflowY)) {
        const b = logical(p); top = Math.max(top, b.top); bottom = Math.min(bottom, b.bottom);
      }
    }
    const candidates = [...e.querySelectorAll('button,.inventory-skill,[data-hero-art],.ch-copy p')];
    if (direction < 0) candidates.reverse();
    let best = null;
    for (const child of candidates) {
      const b = logical(child), lo = Math.max(top + 4, b.top), hi = Math.min(bottom - 4, b.bottom);
      if (hi - lo < 24) continue;
      const x = b.x + b.width / 2, y = direction < 0 ? hi - 8 : lo + 8;
      const start = client(x, y), hit = document.elementFromPoint(start.x, start.y);
      if (!hit || !(child === hit || child.contains(hit))) continue;
      const end = direction < 0 ? Math.max(top + 8, y - distance) : Math.min(bottom - 8, y + distance);
      if (Math.abs(end - y) > 20 && (!best || Math.abs(end - y) > Math.abs(best.end - best.y))) best = { x, y, end, start, finish: client(x, end) };
    }
    return best;
  }, {direction, distance});
  assert(from && Math.abs(from.end - from.y) > 20, 'a real, visible surface is available to swipe: ' + selector);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, ...from.start }] });
  for (let i = 1; i <= 12; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: from.start.x+(from.finish.x-from.start.x)*i/12, y: from.start.y+(from.finish.y-from.start.y)*i/12 }] });
    await page.waitForTimeout(18);
  }
  if(distance<160)await page.waitForTimeout(140);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(200);
}
async function tap(page, selector) {
  const p = await point(page, selector);
  assert(p, 'tap target must already be visible without automatic scrolling: ' + selector);
  await page.touchscreen.tap(p.x, p.y);
}
async function reach(page, cdp, selector, scroller) {
 for(let i=0;i<32;i++){
  const target=await page.locator(selector).evaluate(e=>{const app=document.getElementById('app'),r=ArcViewport.rect(e,app),v=ArcViewport.rect(e.closest('.stock-scroll'),app);return {full:r.top>=v.top-1&&r.bottom<=v.bottom+1||r.height>v.height,direction:r.top<v.top?1:-1,distance:Math.min(100,Math.max(30,r.top<v.top?v.top-r.top+12:r.bottom-v.bottom+12))};});
  if(target.full&&await point(page,selector))return;
  await swipe(page,cdp,scroller,target.direction,target.distance);
 }
 await page.screenshot({path:path.join(out,'reach-failure.png')});throw Error('Cannot reach by native swipes: '+selector);
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.ARCLINE_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
 for(const [width,height,lang]of[[844,390,'ja'],[568,240,'ja'],[393,852,'ja'],[844,390,'en']].filter(r=>!process.env.ARCLINE_STOCK_CASE||r[0]===Number(process.env.ARCLINE_STOCK_CASE))){
  const c=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  await c.addInitScript(data=>{localStorage.setItem('arcline-campaign-v1',JSON.stringify(data));localStorage.setItem('arcline-install-guide-v1','{"state":"closed"}');},{schemaVersion:8,campaignResetVersion:2,cleared:99,journeyStarted:true,difficultyConfirmed:true,onboarding:{step:'done'},unlockedCharacterIds:Save.characterIds,seenPreviewIds:Save.previewIds,preferences:{language:lang},journal:{moviesSeen:['prologue','30','60']}});
  const page=await c.newPage(),cdp=await c.newCDPSession(page);page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:'+server.address().port+'/ARCLINE/game/dist/');await page.waitForFunction('save.ready&&!document.getElementById("play").disabled');
  await page.evaluate(()=>{save.data.campaignInventory={weapons:Object.fromEntries(ArcWeapons.weapons.filter(w=>w.id!=='W01').map(w=>[w.id,6])),skills:Object.fromEntries(ArcWeapons.skills.map(id=>[id,6]))};save.data.chapterRun=null;selectedMap=0;syncLobby();});
  await tap(page,'#openCollection');const stock=await page.evaluate('JSON.stringify([save.data.campaignInventory,save.data.chapterRun])');
  ok(await page.locator('#weaponChoices [data-choose-weapon]').count()===23,'normal and all22 auxiliary records '+width+'/'+lang);
  ok(await page.locator('#inventoryWeaponsTab').getAttribute('aria-selected')==='true','weapon inventory selected initially');
  const before=await scrollState(page,'#weaponStockScroll');await swipe(page,cdp,'#weaponChoices');const down=await scrollState(page,'#weaponStockScroll');ok(down[0]>before[0]+10,'swipe from weapon card moves list '+width+'/'+lang);ok(await page.locator('#weaponPicker').isVisible()&&await page.evaluate('JSON.stringify([save.data.campaignInventory,save.data.chapterRun])')===stock,'swipe does not select/spend inventory');
  await swipe(page,cdp,'#weaponChoices',1);ok((await scrollState(page,'#weaponStockScroll'))[0]<down[0]-10,'reverse weapon swipe works');
  await reach(page,cdp,'[data-choose-weapon="W23"]','#weaponChoices');ok(!!await point(page,'#closeWeapons')&&!!await point(page,'#inventorySkillsTab'),'close and tabs stay visible at end of weapon list');const weaponPosition=(await scrollState(page,'#weaponStockScroll'))[0];
  await tap(page,'#inventorySkillsTab');ok(await page.locator('[data-stock-skill]').count()===25,'all15 current and10 legacy skills in stock');ok(await page.locator('#weaponChoices').isHidden(),'skill tab isolates skill inventory');
  const firstSkill=await scrollState(page,'#weaponStockScroll');await swipe(page,cdp,'#chapterSkillStock');ok((await scrollState(page,'#weaponStockScroll'))[0]>firstSkill[0]+10,'swipe from skill row moves list');await reach(page,cdp,'[data-stock-skill="S_BREACH"]','#chapterSkillStock');ok(!!await point(page,'#closeWeapons'),'close stays visible at skill bottom');ok(await page.locator('[data-stock-skill="S_BREACH"] .inventory-count').textContent()==='×6','last legacy skill count readable');
  await page.screenshot({path:path.join(out,'stock-skills-'+width+'-'+lang+'.png')});await tap(page,'#inventoryWeaponsTab');ok(Math.abs((await scrollState(page,'#weaponStockScroll'))[0]-weaponPosition)<2,'tab switch remembers each list position');ok(await page.evaluate('JSON.stringify([save.data.campaignInventory,save.data.chapterRun])')===stock,'browsing all stock changes no quantities');await tap(page,'#closeWeapons');
  await page.evaluate(()=>{save.data.seenPreviewIds=ArcSave.previewIds;start({skipStory:true});endDemo();encounter=null;document.getElementById('encounterBanner').hidden=true;cancelAnimationFrame(raf);raf=0;s.phase='aim';s.skillUsed=false;hud();draw();});await page.waitForFunction('canAim()');
  const battle=await page.evaluate('JSON.stringify([s.skills,s.weaponStock,s.skillEffects,s.shotCount])');await tap(page,'#skillToggle');ok(await page.locator('#skillChoices [data-skill]').count()===25,'battle skill list includes all held types');const initialSkill=await scrollState(page,'#skillStockScroll');await swipe(page,cdp,'#skillChoices');ok((await scrollState(page,'#skillStockScroll'))[0]>initialSkill[0]+10,'battle skill cards support native swipes');await reach(page,cdp,'#skillChoices [data-skill="S_BREACH"]','#skillChoices');ok(await page.locator('#skillPicker').isVisible()&&!!await point(page,'#closeSkills'),'battle skill list reaches last item with header visible');ok(await page.evaluate('JSON.stringify([s.skills,s.weaponStock,s.skillEffects,s.shotCount])')===battle,'swiping never uses a skill or spends ammunition');await page.screenshot({path:path.join(out,'battle-skills-'+width+'-'+lang+'.png')});await tap(page,'#closeSkills');
  await tap(page,'#weaponToggle');const firstWeapon=await scrollState(page,'#weaponStockScroll');await swipe(page,cdp,'#weaponChoices');ok((await scrollState(page,'#weaponStockScroll'))[0]>firstWeapon[0]+10,'battle weapon cards support native swipes');await reach(page,cdp,'[data-choose-weapon="W23"]','#weaponChoices');ok(!!await point(page,'#closeWeapons'),'battle weapon close is always reachable');ok(await page.evaluate('JSON.stringify([s.skills,s.weaponStock,s.skillEffects,s.shotCount])')===battle,'weapon swipes do not select or spend');await tap(page,'#closeWeapons');
  // Exercise an actual last-row tap after swiping; scrolling must not eat taps.
  await tap(page,'#weaponToggle');await reach(page,cdp,'[data-choose-weapon="W23"]','#weaponChoices');await tap(page,'[data-choose-weapon="W23"]');ok(await page.evaluate('s.mode==="W23"&&s.weaponStock.W23===6'),'intentional weapon tap selects without spending');
  await page.evaluate(()=>{s.skillUsed=true;hud();});await tap(page,'#skillToggle');ok(await page.locator('#skillChoices button[data-unavailable="true"]').count()===25&&await page.locator('#battleSkillUse').isDisabled(),'used turn allows card inspection with confirmation disabled');ok((await page.locator('#skillInventorySummary').textContent()).includes(lang==='ja'?'使用済み':'used this turn'),'used-turn restriction explained');await swipe(page,cdp,'#skillChoices');ok(await page.evaluate('JSON.stringify([s.skills,s.weaponStock,s.skillEffects,s.shotCount])')===battle,'swiping disabled rows changes no stock');await tap(page,'#closeSkills');
  const audit=await page.evaluate(()=>{
   const trace=[],icons=[],proto=CanvasRenderingContext2D.prototype,fill=proto.fillText,drawWeapon=ArcWeapons.drawIcon,drawSkill=ArcSkills.draw;let currentStage=0;
   proto.fillText=function(text,x,y,...rest){const m=this.getTransform(),d=Math.min(2,devicePixelRatio||1),w=this.measureText(text).width*Math.hypot(m.a,m.b)/d;trace.push({stage:currentStage,text:String(text),x:(m.a*x+m.c*y+m.e)/d,y:(m.b*x+m.d*y+m.f)/d,width:w});return fill.call(this,text,x,y,...rest);};
   ArcWeapons.drawIcon=function(ctx,id,...args){icons.push({stage:currentStage,id});return drawWeapon.call(this,ctx,id,...args);};ArcSkills.draw=function(ctx,id,...args){icons.push({stage:currentStage,id});return drawSkill.call(this,ctx,id,...args);};
   const rows=[];try{for(const spec of E.levels){if(!spec.pickups.length)continue;currentStage=spec.id;s=E.campaign(spec.id,{equippedCharacterId:'gun',matchSeed:1});s.phase='aim';s.turn=0;const item=s.pickups[0],info=item.kind==='trial'?ArcWeapons.get(item.weaponId):ArcSkills.get(item.skill),name=ArcI18n.language==='en'?info.name:info.nameJa;renderer.resetCamera();hud();trace.length=0;icons.length=0;draw();const initiallyShown=trace.some(t=>t.text===name);const wasHidden=item.hidden;item.hidden=false;s.playerTurn=5;trace.length=0;icons.length=0;draw();const label=trace.find(t=>t.text===name),app=document.getElementById('app'),header=ArcViewport.rect(document.querySelector('.battle-top'),app),controls=ArcViewport.rect(document.getElementById('battleControls'),app);rows.push({stage:spec.id,id:item.weaponId||item.skill,wasHidden,initiallyShown,label,vector:icons.some(i=>i.id===(item.weaponId||item.skill)),headerBottom:header.bottom,controlsTop:controls.top,logicalWidth:app.clientWidth});}}finally{proto.fillText=fill;ArcWeapons.drawIcon=drawWeapon;ArcSkills.draw=drawSkill;}return rows;
  });
  ok(audit.length===46,'all46 authored capsules audited '+width+'/'+lang);for(const r of audit){ok(r.label&&r.vector,'capsule name and vector render '+r.stage+'/'+width+'/'+lang);ok(r.initiallyShown===!r.wasHidden,'capsule spawn visibility '+r.stage);ok(r.label.y>r.headerBottom&&r.label.y+14<r.controlsTop&&r.label.x-r.label.width/2>0&&r.label.x+r.label.width/2<r.logicalWidth,'capsule label fits visible field '+r.stage+'/'+width+'/'+lang);}
  const raster=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=40;const ctx=canvas.getContext('2d'),render=(kind,id)=>{ctx.clearRect(0,0,40,40);(kind==='weapon'?ArcWeapons.drawIcon:ArcSkills.draw)(ctx,id,20,20,30,'#74efff');return {kind,id,pixels:ctx.getImageData(0,0,40,40).data.filter((v,i)=>i%4===3&&v>0).length,bitmap:canvas.toDataURL()};};return [...ArcWeapons.weapons.map(w=>render('weapon',w.id)),...ArcWeapons.skills.map(id=>render('skill',id))];});ok(raster.length===48&&raster.every(r=>r.pixels>10),'all23 weapon and25 skill vector icons actually draw pixels');ok(new Set(raster.filter(r=>r.kind==='weapon'&&r.id!=='W01'&&require('../dist/weapons.js').activeIds.includes(r.id)).map(r=>r.bitmap)).size===12,'auxiliary symbols render distinctly');
  await page.evaluate(()=>{lobby();save.data.campaignInventory={weapons:{},skills:{}};save.data.chapterRun=null;selectedMap=0;syncLobby();});await tap(page,'#openCollection');await swipe(page,cdp,'#weaponChoices');ok(await page.locator('#weaponPicker').isVisible(),'swipe in short non-scrolling inventory does not select normal shot');await tap(page,'#inventorySkillsTab');ok(await page.locator('#chapterSkillStock .stock-empty').isVisible(),'empty skill stock explained');await tap(page,'#closeWeapons');
  rows.push({width,height,lang,capsules:audit});console.log('PASS stock touch and46 capsules',width,height,lang);await c.close();
 }
 ok(errors.length===0,errors.join('\n'));fs.writeFileSync(path.join(out,'PICKUP_STOCK_BROWSER.json'),JSON.stringify({status:'PASS',checks,rows,errors,method:'Real Chromium native CDP touches only for scrolling/tapping. Audits every46 capsule via current renderer,all23 weapons/25 skills in stock,scrolling both directions,tab positions,visible close controls,no accidental use,and actual selection after swiping. Includes568x240 and CSS-rotated393x852;Japanese/English. No physical phone claim.'},null,2));console.log('PASS pickup-stock browser '+checks);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
