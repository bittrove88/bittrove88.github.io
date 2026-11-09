'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const {chromium} = require('playwright');
const site = process.env.ARCLINE_STAGING_SITE;
if (!site) throw Error('Set ARCLINE_STAGING_SITE to the assembled STG artifact');
const root = path.resolve(site), prefix = '/arcline-staging/';
const out = process.env.ARCLINE_EVIDENCE_DIR || '/tmp/arcline-staging-evidence'; fs.mkdirSync(out, {recursive:true});
let checks = 0;
function ok(value, message) { checks++; assert(value, message); }
const server = http.createServer((req,res) => {
  const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if (!pathname.startsWith(prefix)) {
    res.setHeader('Content-Type','text/html'); return res.end('<!doctype html><title>Storage witness</title>');
  }
  let file = path.resolve(root, pathname.slice(prefix.length));
  if (file !== root && !file.startsWith(root + path.sep)) return res.writeHead(403).end();
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpeg':'image/jpeg','.jpg':'image/jpeg','.wav':'audio/wav','.m4a':'audio/mp4'};
  fs.readFile(file,(e,b) => { if(e)return res.writeHead(404).end();res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(b); });
});
(async () => {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const executablePath = await require('../../game/tools/select_browser.cjs')(out);
  const browser = await chromium.launch({executablePath,args:['--no-sandbox']});
  try {
    const context = await browser.newContext({viewport:{width:844,height:390},reducedMotion:'reduce'});
    const witness = await context.newPage(); await witness.goto(origin+'/ARCLINE/');
    await witness.evaluate(() => {
      localStorage.setItem('arcline-campaign-v1','production-progress-sentinel');
      localStorage.setItem('arcline-language','en');localStorage.setItem('arcline-control-layout','right');
      localStorage.setItem('other-app','untouched');
    });
    const before = await witness.evaluate(() => JSON.stringify({...localStorage}));
    await context.addInitScript(() => {
      if (!location.pathname.startsWith('/arcline-staging/game/')) return;
      window.nativeAccesses = [];
      for (const key of ['localStorage','sessionStorage','indexedDB']) {
        const descriptor=Object.getOwnPropertyDescriptor(window,key);
        Object.defineProperty(window,key,{configurable:true,get(){nativeAccesses.push(key);return descriptor.get.call(window);}});
      }
      window.ytgame=new Proxy({},{get(){nativeAccesses.push('SDK');throw Error('SDK access');}});
    });
    const page=await context.newPage(), errors=[], failed=[];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('response', r => { if(r.status()>=400)failed.push(r.url()); });
    const started=[];
    for (const stage of [1,50,100]) {
      await page.goto(origin+prefix+'game/?stage='+stage);
      await page.waitForFunction(() => document.documentElement.dataset.stagingReady || document.documentElement.dataset.stagingError);
      ok(!await page.evaluate(() => document.documentElement.dataset.stagingError),'STG loads '+stage);
      await page.waitForFunction('save.ready&&!document.getElementById("play").disabled');
      ok(await page.evaluate(stage => save.data.cleared===stage-1 && selectedMap===stage-1,stage),'requested uncompleted stage '+stage);
      ok(await page.evaluate(() => nativeAccesses.length===0 && globalThis.ytgame===undefined),'no native storage or SDK '+stage);
      ok(await page.locator('link[rel=manifest]').count()===0,'no install manifest');
      ok(!await page.locator('#deleteLobbySave').isVisible()&&!await page.locator('#deleteStartSave').isVisible(),'no misleading save-deletion UI');
      if(stage===1){ok(await page.locator('#journeyStart').isVisible(),'normal first-use start');continue;}
      for(const mode of ['hard','easy','normal']) {
        await page.locator('#lobbyDifficulty').click();
        await page.locator('label:has(input[name=difficulty][value='+mode+'])').click();
        await page.waitForFunction(mode => !difficultyUi.busy && save.data.difficulty===mode,mode);
        ok(await page.evaluate(stage => save.data.cleared===stage-1 && selectedMap===stage-1,stage),'mode retains entry '+stage+'/'+mode);
        await page.locator('#closeSettings').click();
      }
      await page.evaluate(async()=>{ArcI18n.setLanguage('en');toggleControlLayout();save.data.campaignInventory.weapons.W06=7;await save.save();});
      await page.locator('#play').click();
      await page.waitForFunction('s!==null');
      ok(await page.evaluate(stage => s.stage===stage,stage),'real engine starts '+stage);
      if(stage===100)ok(await page.evaluate('s.finalTeam!=null||s.finalBattle!=null||s.spec.finalBattle!=null'),'final relay remains available');
      const parity=await page.evaluate(async()=>{
        const state=ArcEngine.campaign(50,{matchSeed:424242,difficulty:'normal'});
        const seed=42,copy=JSON.parse(JSON.stringify(state));copy.random=ArcEngine.seeded(seed);
        const expected=ArcEngine.planEnemyAction(copy,copy.random);
        const result=await new Promise((resolve,reject)=>{const worker=new Worker('cpu-worker.js?v='+ArcRelease.cacheVersion);worker.onmessage=e=>{worker.terminate();e.data.error?reject(Error(e.data.error)):resolve(e.data);};worker.onerror=reject;worker.postMessage({id:1,state:{...state,random:undefined},seed});});
        return JSON.stringify([result.action,result.target,result.plan])===JSON.stringify([expected.action,expected.target,expected.plan]);
      });
      ok(parity,'real packaged Worker matches engine '+stage); started.push(stage);
      await page.reload();await page.waitForFunction('globalThis.ArcStaging&&document.documentElement.dataset.stagingReady==="true"&&save.ready');
      ok(await page.evaluate(stage=>save.data.cleared===stage-1&&save.data.difficulty==='normal'&&ArcI18n.language==='ja'&&controlLayout==='left'&&save.data.campaignInventory.weapons.W06!==7,stage),'reload discards progress and settings '+stage);
      ok(await page.evaluate(()=>nativeAccesses.length===0),'reload never reads native state');
    }
    // A new tab must also start a fresh session on the same origin.
    const tab=await context.newPage();await tab.goto(origin+prefix+'game/?stage=50');await tab.waitForFunction('globalThis.ArcStaging&&document.documentElement.dataset.stagingReady==="true"&&save.ready');
    ok(await tab.evaluate('save.data.cleared===49&&ArcI18n.language==="ja"&&nativeAccesses.length===0'),'fresh independent tab');await tab.close();
    const audio=await page.evaluate(async()=>{const a=new Audio('assets/audio/bgm/bgm_title.m4a');a.muted=true;await a.play();await new Promise(r=>setTimeout(r,180));const played=a.currentTime>0;a.pause();return played;});
    ok(audio,'packaged AAC actually plays');
    await page.screenshot({path:path.join(out,'staging-100.png')});
    await page.goto(origin+prefix);await page.locator('#stage').fill('50');await page.locator('button[type=submit]').click();await page.waitForFunction('globalThis.ArcStaging&&document.documentElement.dataset.stagingReady==="true"&&save.ready');
    ok(await page.evaluate('selectedMap===49'),'launcher uses relative project URL');
    for(const [width,height] of [[568,240],[390,844]]){
      await page.setViewportSize({width,height});await page.waitForTimeout(100);
      ok(await page.locator('#play').isVisible(),'start action remains visible '+width+'x'+height);
      await page.screenshot({path:path.join(out,'staging-'+width+'x'+height+'.png')});
    }
    for(const invalid of ['0','101','1.5','abc']){
      await page.goto(origin+prefix+'game/?stage='+invalid);await page.waitForFunction(()=>document.documentElement.dataset.stagingError);
      ok(await page.evaluate('typeof ArcEngine==="undefined"'),'invalid stage blocks runtime '+invalid);
    }
    // If isolation cannot be installed, the runtime must never load.
    const blocked=await browser.newContext();await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{value:{},configurable:false}));
    const bp=await blocked.newPage();await bp.goto(origin+prefix+'game/?stage=50');await bp.waitForFunction(()=>document.documentElement.dataset.stagingError);
    ok(await bp.evaluate('typeof ArcEngine==="undefined"'),'failed isolation stops before game code');await blocked.close();
    ok(await witness.evaluate(()=>JSON.stringify({...localStorage}))===before,'production and other-app storage unchanged');
    ok(errors.length===0,'no browser exceptions: '+errors.join('\n'));ok(failed.length===0,'no missing assets: '+failed.join('\n'));
    const report={status:'PASS',checks,started,errors,failed,scope:'Memory-only STG and same-origin production storage witness; modes, settings, reload, new tab, startup failure, real Worker, packaged AAC. Physical iPhone/Android not tested.'};
    fs.writeFileSync(path.join(out,'STAGING_BROWSER.json'),JSON.stringify(report,null,2)+'\n');
    console.log('PASS staging browser '+checks+' checks');await context.close();
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
