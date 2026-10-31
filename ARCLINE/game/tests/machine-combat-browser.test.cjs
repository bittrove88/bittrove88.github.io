'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),E=require('../dist/engine.js'),S=require('../dist/save.js'),R=require('../dist/campaign-run.js');
const root=path.resolve(__dirname,'../dist'),out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-machine-combat';fs.mkdirSync(out,{recursive:true});
let checks=0;const ok=(v,m)=>{checks++;assert(v,m);},equal=(a,b,m)=>{checks++;assert.deepEqual(a,b,m);};
function initial(){const p=S.decode(JSON.stringify({schemaVersion:3,cleared:3,equippedCharacterId:'gun',unlockedWeaponIds:S.weaponIds,collectedCosmeticIds:S.cosmeticIds,seenPreviewIds:S.previewIds}));p.chapterRun=R.checkpoint(4,{weapons:{W06:2},skills:{BURST:2}},[],'machine-browser',20261031);return p;}
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(b);});});
async function boot(p){await p.waitForFunction('!document.getElementById("play").disabled');await stop(p);}
async function stop(p){await p.evaluate(()=>{cancelAnimationFrame(raf);raf=0;});}
async function begin(p){await p.locator('#play').click();await stop(p);await p.waitForFunction('canAim()');}
async function drive(p){return p.evaluate(async()=>{for(let i=0;i<2400;i++){update(.05,.05);draw();if(s.phase==='aim'&&s.shotCount>0&&!shot)return {phase:s.phase,shots:s.shotCount,round:s.round};if(s.result)throw Error('Unexpected result '+s.result);if(i%12===0)await new Promise(r=>setTimeout(r,0));}throw Error('Enemy turn did not finish: '+s.phase);});}
async function center(p,id){const r=await p.locator('#'+id).boundingBox();return {x:r.x+r.width/2,y:r.y+r.height/2};}
async function boxes(p,selectors){return p.evaluate(selectors=>selectors.map(selector=>{const e=document.querySelector(selector),r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {selector,left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height,visible:!!e.getClientRects().length,reachable:hit===e||e.contains(hit),vw:innerWidth,vh:innerHeight};}),selectors);}
function fit(rows,label,min=44){ok(rows.every(r=>r.visible&&r.reachable&&r.width>=min&&r.height>=min&&r.left>=0&&r.top>=0&&r.right<=r.vw+1&&r.bottom<=r.vh+1),label+' '+JSON.stringify(rows));}
const snapshot=p=>p.evaluate(()=>JSON.stringify({shots:s.shotCount,ammo:s.specialAmmo,stock:I.fromState(s),entry:save.data.chapterRun}));
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}),errors=[],bad=[],rows=[];
 try{for(const [width,height,touch] of [[568,240,true],[667,280,true],[844,390,true],[932,430,true],[1024,768,false],[1440,900,false]]){
  const c=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,deviceScaleFactor:2});await c.addInitScript(payload=>{if(!localStorage.getItem('arcline-campaign-v1'))localStorage.setItem('arcline-campaign-v1',JSON.stringify(payload));},initial());
  const p=await c.newPage();p.on('pageerror',e=>errors.push(String(e)));p.on('response',r=>{if(r.status()>=400)bad.push(r.url());});await p.goto('http://127.0.0.1:'+server.address().port);await boot(p);const cdp=touch?await c.newCDPSession(p):null;
  const down=async point=>{if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,...point}]});else{await p.mouse.move(point.x,point.y);await p.mouse.down();}};
  const move=async point=>{if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,...point}]});else await p.mouse.move(point.x,point.y);};
  const up=async()=>{if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await p.mouse.up();};
  for(const profile of E.combat.profiles){
   console.log('CHECK',width,height,profile.id);
   await p.evaluate(()=>{if(s)lobby();ArcI18n.setLanguage('ja');save.data.seenPreviewIds=[...ArcSave.previewIds];selectedMap=3;syncLobby();});
   await p.locator('#openCharacters').click();await p.locator('[data-equip-character='+profile.id+']').click();
   for(const lang of['ja','en']){
    await p.evaluate(lang=>ArcI18n.setLanguage(lang),lang);
    const detail=await p.locator('.combat-summary').innerText();ok(detail.includes(String(profile.hp))&&detail.includes(await p.evaluate(text=>ArcI18n.t(text),profile.charge.rise+'s'))&&detail.includes('3'),'HP, timing and special count in picker '+width+' '+profile.id+' '+lang);
    ok(detail.includes(await p.evaluate(name=>ArcI18n.t(name),profile.special.name)),'named special translates separately '+width+' '+profile.id+' '+lang);
    ok(await p.evaluate(()=>{const e=document.querySelector('.collection-panel');return e.scrollWidth<=e.clientWidth+1;}),'no machine picker overflow '+width+' '+profile.id+' '+lang);
   }
   await p.evaluate(()=>ArcI18n.setLanguage('ja'));if(width===844&&profile.id==='rin')await p.screenshot({path:path.join(out,'machine-details-phone.png')});await p.locator('#closeCollection').click();await p.evaluate(()=>save.pending);await begin(p);
   equal(await p.evaluate('({id:s.characterId,hp:E.combat.points(s.units[0].maxHp),special:s.specialAmmo})'),{id:profile.id,hp:profile.hp,special:3},'selected machine reaches actual battle '+width+' '+profile.id);
   ok(await p.locator('#php').innerText()===String(profile.hp),'displayed durability uses points '+width+' '+profile.id);equal(await p.evaluate('I.fromState(s)'),{weapons:{W06:2},skills:{BURST:2}},'machine entry preserves chapter stock '+width+' '+profile.id);
   fit(await boxes(p,['#stick','#aimStick','#fire']),'primary controls '+width+' '+profile.id,84);
   await p.locator('#skillToggle').click();await p.locator('[data-skill=BURST]').click();
   await p.locator('#weaponToggle').click();fit(await boxes(p,['[data-choose-weapon=W01]','[data-choose-weapon='+profile.special.id+']']),'normal and special visible together '+width+' '+profile.id);
   equal(await p.locator('.weapon-group-heading').allTextContents(),['機体の武器','拾った補助弾'],'chapter and machine groups '+width+' '+profile.id);
   if(width===844){await p.evaluate(id=>{save.data.seenPreviewIds=save.data.seenPreviewIds.filter(v=>!v.endsWith(':'+id));},profile.special.id);if(profile.id==='rin')await p.screenshot({path:path.join(out,'attack-picker-phone.png')});}
   await p.locator('[data-choose-weapon='+profile.special.id+']').click();
   if(width===844){
    ok(await p.evaluate('!!demo?.proof.valid'),'first special opens a physics-proven preview '+profile.id);equal(await p.evaluate('({before:demo.before.specialAmmo,after:demo.after.specialAmmo,live:s.specialAmmo})'),{before:3,after:2,live:3},'preview teaches resource use without spending it '+profile.id);
    fit(await boxes(p,['#previewOK']),'preview OK is reachable '+profile.id);
    await p.evaluate(()=>{demo.age=demo.duration*.75;hud();for(let i=0;i<45;i++){clock+=.05;draw();}});
    const scene=await p.evaluate(()=>{const v=renderer.view,copy=document.getElementById('tutorial').getBoundingClientRect(),p=activePreview();return {units:p.before.units.map(u=>({x:v.x+u.x*v.scale,head:v.y+(u.y-65)*v.scale,foot:v.y+(u.y+12)*v.scale})),effect:{x:v.x+p.focus.x*v.scale,y:v.y+p.focus.y*v.scale},bottom:copy.top,width:innerWidth};});
    ok(scene.units.every(u=>u.x>=35&&u.x<=scene.width-35&&u.head>=0&&u.foot<scene.bottom)&&scene.effect.y>=0&&scene.effect.y<scene.bottom,'special result retains shooter, target and effect above copy '+profile.id+' '+JSON.stringify(scene));
    if(['rin','sora','yui'].includes(profile.id))await p.screenshot({path:path.join(out,'special-preview-'+profile.id+'.png')});await p.locator('#previewOK').click();await p.evaluate(()=>save.pending);ok(await p.evaluate(id=>hasSeen(id),profile.special.id),'OK remembers special preview '+profile.id);
   }
   ok(await p.evaluate('!s.selectedSkill'),'special clears incompatible legacy skill '+width+' '+profile.id);ok((await p.locator('#weaponStock').innerText()).includes('3/3'),'HUD distinguishes three per level '+width+' '+profile.id);
   await p.evaluate(()=>{s.angle=80;s.power=37;hud();draw();});const fire=await center(p,'fire'),before=await snapshot(p);
   await down(fire);await p.evaluate(()=>{update(.2,.2);draw();});ok(await p.evaluate('!!charge&&s.power>20'),'physical pointer charges special '+width+' '+profile.id);await move({x:fire.x,y:fire.y-100});ok(await p.evaluate('charge?.cancel'),'drag outside arms special cancel '+width+' '+profile.id);await up();equal(await snapshot(p),before,'cancel spends no special, action or chapter supply '+width+' '+profile.id);
   await down(fire);await p.evaluate(()=>{update(.2,.2);draw();});await up();ok(await p.evaluate('s.specialAmmo===2&&s.shotCount===1'),'actual release spends one special and one action '+width+' '+profile.id);await drive(p);equal(await p.evaluate('I.fromState(s)'),{weapons:{W06:2},skills:{BURST:2}},'real special and enemy response leave chapter stock '+width+' '+profile.id);
   await p.locator('#weaponToggle').click();await p.locator('[data-choose-weapon=W06]').click();ok(await p.evaluate('s.specialAmmo===2&&s.mode==="W06"'),'aux switch cannot refill special '+width+' '+profile.id);await p.locator('#weaponToggle').click();await p.locator('[data-choose-weapon=W01]').click();equal(await p.evaluate('[minimumAngle(),maximumAngle()]'),[-15,80],'normal elevation usable for every machine '+width+' '+profile.id);
   await p.locator('#warpToggle').click();await down(fire);await p.evaluate(()=>{update(1.3,1.3);draw();});ok(await p.evaluate('Math.abs(s.power-60)<1e-6'),'common teleport charge timing '+width+' '+profile.id);await move({x:fire.x,y:fire.y-100});await up();ok(await p.evaluate('s.specialAmmo===2&&s.shotCount===1'),'teleport cancel leaves special and actions '+width+' '+profile.id);await p.locator('#warpToggle').click();
   await p.locator('#pause').click();await p.locator('#retryLevel').click();await p.locator('#resume').click();await stop(p);await p.waitForFunction('canAim()');ok(await p.evaluate('s.specialAmmo===3&&s.units[0].hp===s.units[0].maxHp&&s.matchSeed===20261031'),'native retry restores full machine and stable entry '+width+' '+profile.id);equal(await p.evaluate('I.fromState(s)'),{weapons:{W06:2},skills:{BURST:2}},'retry restores independent chapter entry '+width+' '+profile.id);
   await p.evaluate(id=>{s.specialAmmo=0;hud();},profile.special.id);await p.locator('#weaponToggle').click();ok(await p.locator('[data-choose-weapon='+profile.special.id+']').isDisabled(),'empty special stays visible and disabled '+width+' '+profile.id);await p.locator('#closeWeapons').click();
   ok(await p.evaluate(()=>!platformStatus.previewErrors?.length),'no silently failed preview '+width+' '+profile.id);ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no page overflow '+width+' '+profile.id);
  }
  await p.evaluate(()=>lobby());await p.reload();await boot(p);await begin(p);ok(await p.evaluate('s.characterId==="yui"&&s.specialAmmo===3&&s.units[0].hp===5'),'reload keeps machine but restores per-level supply '+width);equal(await p.evaluate('I.fromState(s)'),{weapons:{W06:2},skills:{BURST:2}},'reload preserves entry resources '+width);
  rows.push({width,height,touch,machines:10,realSpecialReleases:10,realEnemyResponses:10});await c.close();
 }
 ok(errors.length===0,errors.join('\n'));ok(bad.length===0,bad.join('\n'));const report={status:'PASS',checks,viewports:rows,errors,badRequests:bad,scope:'Actual Chromium: all ten selected profiles at six sizes, Japanese/English combat summaries, simultaneous normal/special choices, native touch/mouse cancellation and release, real seeded enemy response, isolated stock, common teleport timing, native retry, empty state and reload. Ten physics-proven first-selection previews at844x390. Resource fixtures and controlled aim are explicit; physical iPhones and human difficulty are not certified.'};fs.writeFileSync(path.join(out,'MACHINE_COMBAT_BROWSER.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:'PASS',checks,viewports:rows.length,errors},null,2));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
