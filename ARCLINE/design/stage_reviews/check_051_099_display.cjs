'use strict';
// Self-contained design review, not gameplay or a physical-device test.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const out=path.resolve(process.argv[2]||'/tmp/arcline-map-review-051-099');fs.mkdirSync(out,{recursive:true});
const html=fs.readFileSync(path.join(__dirname,'map_review_gallery.html'),'utf8');
const g=JSON.parse(fs.readFileSync(path.join(__dirname,'map_review_gallery_data.json'),'utf8'));
const entries=g.stages.filter(x=>g.reviewScope.includes(x.stage));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.ARCLINE_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox']});const rows=[],cards=[];
 try{
  for(const [viewport,width,height] of [['desktop',1440,1100],['phone-landscape',844,390],['phone-portrait',390,844]]){
   const page=await browser.newPage({viewport:{width,height}}),errors=[],requests=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));await page.setContent(html);
   assert.equal(await page.locator('#stagePicker option').count(),49);
   for(const e of entries){const n=e.stage;
    await page.selectOption('#stagePicker',String(n));
    assert((await page.locator('#stageTitle').innerText()).includes(String(n)));
    assert.equal(await page.locator('#comparePrevious').isDisabled(),!e.previous);
    for(const comparison of e.previous?['live','previous']:['live']){
     await page.click(comparison==='live'?'#compareLive':'#comparePrevious');
     const sizes=await page.locator('.chart svg').evaluateAll(xs=>({boxes:xs.map(x=>x.getAttribute('viewBox')),widths:xs.map(x=>x.getBoundingClientRect().width),overflow:document.documentElement.scrollWidth>innerWidth+1}));
     assert.equal(sizes.boxes[0],sizes.boxes[1]);assert(Math.abs(sizes.widths[0]-sizes.widths[1])<1);assert(!sizes.overflow);
     rows.push({stage:n,viewport,comparison,status:'PASS',sameScale:true,noHorizontalOverflow:true});
    }
    await page.click('#compareLive');
    for(const opening of ['main','alternative','intact']){
     await page.selectOption('#openingState',opening);
     const opened=await page.locator('.map').nth(1).locator('[data-opened="true"]').count();assert.equal(opened,(e.destructionPlans[opening]||[]).length,`stage ${n} ${opening}`);
    }
    assert.equal(await page.locator('#partRows tr').count(),e.after.parts.length);
    const available=e.after.shotExamples.filter(x=>(x.round||1)===1&&!(x.assumedPolarity||0)&&!(x.destroyed||[]).length).length;
    assert.equal(await page.locator('.map').nth(1).locator('.shot-path').count(),Math.min(2,available));
    await page.selectOption('#openingState','main');
    if(viewport==='desktop'){
     await page.screenshot({path:path.join(out,`stage-${n}-comparison.png`),fullPage:true});
     cards.push({stage:n,title:await page.locator('#stageTitle').innerText(),concept:e.headline,main:e.mainRoute,alternative:e.alternativeRoute,status:e.shotProbeSummary,html:await page.locator('.map').nth(1).innerHTML()});
    }
    await page.selectOption('#openingState','intact');
   }
   await page.selectOption('#stagePicker','91');await page.selectOption('#openingState','alternative');await page.selectOption('#shotPoint','side');assert.equal(await page.locator('.map').nth(1).locator('.shot-path').count(),1);await page.selectOption('#shotPoint','all');
   await page.selectOption('#stagePicker','79');await page.selectOption('#worldRound','2');assert.equal(await page.locator('#worldRound').inputValue(),'2');
   await page.selectOption('#polarityState','-1');await page.selectOption('#openingState','alternative');
   await page.uncheck('#showShots');assert.equal(await page.locator('.shot-path').count(),0);await page.check('#showShots');
   await page.uncheck('#partLabels');assert.equal(await page.locator('.unit-label').count(),0);await page.check('#partLabels');
   await page.click('#toggleScale');const z=await page.locator('.chart svg').evaluateAll(xs=>xs.map(x=>x.getBoundingClientRect().width));assert(z[0]>=1600&&Math.abs(z[0]-z[1])<1);assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)));await page.click('#toggleScale');
   await page.selectOption('#worldRound','1');await page.selectOption('#polarityState','0');await page.selectOption('#openingState','intact');
   for(const start of [51,61,71,81,91]){await page.selectOption('#rangePicker',String(start));assert.equal(await page.locator('#stagePicker option').count(),start===91?9:10);}
   await page.selectOption('#rangePicker','all');await page.selectOption('#stagePicker','99');await page.click('#prev');assert((await page.locator('#stageTitle').innerText()).includes('98'));await page.click('#next');assert((await page.locator('#stageTitle').innerText()).includes('99'));assert(await page.locator('#next').isDisabled());
   if(viewport==='phone-portrait')await page.screenshot({path:path.join(out,'phone-portrait.png'),fullPage:true});
   assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);await page.close();
  }
  for(const start of [51,61,71,81,91]){const end=Math.min(99,start+9),page=await browser.newPage({viewport:{width:1800,height:1100}}),selected=cards.filter(c=>c.stage>=start&&c.stage<=end);
   await page.setContent(`<!doctype html><html lang="ja"><meta charset="utf-8"><style>body{background:#0a1923;color:#edf8f4;font:15px/1.5 system-ui;margin:20px}h1{font-size:28px}main{display:grid;grid-template-columns:1fr 1fr;gap:12px}article{border:1px solid #395d67;background:#142d3a;border-radius:14px;padding:14px;min-width:0}h2{font-size:19px;margin:0 0 6px}p{margin:5px 0}.header{display:none}.chart svg{width:100%;display:block}.legend{font-size:12px;color:#bacfd0}.chart{margin-top:10px}</style><h1>ARCLINE｜${start}〜${end}面 個別地形案</h1><p>未承認・ゲーム未実装。主経路の開口案を表示。金・紫の実線は固定敵への単発例、青い点線は移動の構想。反撃・全手順は未検証。面間の縮尺は異なります。</p><main>${selected.map(c=>`<article><h2>${c.title}</h2><p>${c.concept}</p>${c.html}<p>${c.status}</p><p>主：${c.main}</p><p>別：${c.alternative}</p></article>`).join('')}</main></html>`);
   await page.screenshot({path:path.join(out,`overview-${start}-${end}.png`),fullPage:true});await page.close();
  }
  const report={status:'PASS',scope:'Comparison HTML only; emulated viewports, not physical-device or gameplay verification.',maps:49,viewports:3,stageViewportChecks:147,comparisonChecks:rows.length,checks:rows,additionalChecks:['All destruction plans and unit boundaries','Live/previous switching','Shot paths match opening/round/polarity','Cycle and polarity controls','IDs and shots visibility','1600px zoom and containment','Five chapter filters','Previous/next navigation'],consoleErrors:0,runtimeRequests:0};
  fs.writeFileSync(path.join(__dirname,'STAGES_051_099_DISPLAY_CHECK.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:'PASS',maps:49,stageViewports:147,comparisons:rows.length,consoleErrors:0,runtimeRequests:0}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
