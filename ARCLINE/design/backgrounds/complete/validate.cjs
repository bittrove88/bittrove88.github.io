/* Standalone batch verification and PNG evidence export. No game mutations. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=__dirname;
const scenes=fs.readdirSync(path.join(root,'data')).sort().map(f=>JSON.parse(fs.readFileSync(path.join(root,'data',f),'utf8')));
const markup=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=fs.readFileSync(path.join(root,'renderer.js'),'utf8');
const output=path.join(root,'png');fs.mkdirSync(output,{recursive:true});
assert.deepEqual(JSON.parse(markup.match(/<script id="scene-data" type="application\/json">([\s\S]*?)<\/script>/)[1]),
 JSON.parse(JSON.stringify(scenes)).sort((a,b)=>a.themeIndex-b.themeIndex||({normal:0,boss:1,final:2}[a.kind]-{normal:0,boss:1,final:2}[b.kind])||(a.mapIndex||0)-(b.mapIndex||0)));
assert(markup.includes(source));
assert(!/createLinearGradient|createRadialGradient|drawImage|fetch\(|XMLHttpRequest|new Image/.test(source));
assert.equal(scenes.length,33);
const findings=[];
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1});
  const errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  await page.setContent(markup);
  const selection=await page.evaluate(()=>{
   const rows=[];for(let stage=1;stage<=99;stage++){const s=A.select(scenes,stage);rows.push({stage,id:s?.id,kind:s?.kind,theme:s?.themeIndex});}
   return {rows,final:[0,1,2,3].map(i=>A.select(scenes,100,i)?.id),bad:[A.select(scenes,100),A.select(scenes,100,4),A.select(scenes,0),A.select(scenes,101),A.select(scenes,'10'),A.select(scenes,1.5)]};
  });
  for(const row of selection.rows){assert(row.id);assert.equal(row.kind,row.stage%10===0?'boss':'normal');assert.equal(row.theme,Math.floor((row.stage-1)/5));}
  assert.deepEqual(selection.final,['final-100-0','final-100-1','final-100-2','final-100-3']);
  assert(selection.bad.every(v=>v===null));
  for(const scene of scenes){
   const svg=fs.readFileSync(path.join(root,'svg',scene.id+'.svg'),'utf8');
   assert(!/<(?:linearGradient|radialGradient|image|filter)|opacity=|stroke=/.test(svg));
   assert.equal((svg.match(/<(?:path|ellipse) /g)||[]).length,scene.shapes.length);
   const result=await page.evaluate(async({scene,svg})=>{
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
    const sizes=[];A.validate(scene);
    for(const [w,h] of [[1120,604],[844,390],[568,240],[393,852]]){
     canvas.width=w;canvas.height=h;A.draw(ctx,w,h,scene);
     const pixels=ctx.getImageData(0,0,w,h).data;let transparent=0;
     for(let i=3;i<pixels.length;i+=4)if(pixels[i]!==255)transparent++;
     sizes.push({width:w,height:h,transparent});
    }
    canvas.width=1120;canvas.height=604;A.draw(ctx,1120,604,scene);
    const rendered=ctx.getImageData(0,0,1120,604).data,png=canvas.toDataURL().split(',')[1];
    const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await img.decode();
    ctx.clearRect(0,0,1120,604);const scale=Math.max(1120/img.naturalWidth,604/img.naturalHeight);
    ctx.drawImage(img,(1120-img.naturalWidth*scale)/2,(604-img.naturalHeight*scale)/2,img.naturalWidth*scale,img.naturalHeight*scale);
    const pixels=ctx.getImageData(0,0,1120,604).data;let total=0,max=0;
    for(let i=0;i<pixels.length;i++)if(i%4!==3){const d=Math.abs(pixels[i]-rendered[i]);total+=d;max=Math.max(max,d);}
    ctx.globalAlpha=.41;ctx.filter='blur(3px)';ctx.globalCompositeOperation='multiply';ctx.shadowBlur=7;ctx.shadowOffsetX=5;ctx.shadowColor='#dba174';ctx.translate(3,5);
    const snapshot=()=>JSON.stringify([ctx.globalAlpha,ctx.filter,ctx.globalCompositeOperation,ctx.shadowBlur,ctx.shadowOffsetX,ctx.shadowColor,ctx.getTransform().toJSON()]);
    const before=snapshot();A.draw(ctx,1120,604,scene);const restored=before===snapshot();
    return {sizes,png,difference:total/(1120*604*3),maxDifference:max,restored};
   },{scene,svg});
   assert(result.sizes.every(s=>s.transparent===0),scene.id+' opaque coverage');
   assert(result.difference<.5,scene.id+' SVG / Canvas difference '+result.difference);
   assert(result.restored,scene.id+' Canvas restoration');
   fs.writeFileSync(path.join(output,scene.id+'.png'),Buffer.from(result.png,'base64'));
   delete result.png;findings.push({id:scene.id,...result});
  }
  const sheets=[['normal',4,'通常20テーマ'],['boss',3,'大ボス専用9景'],['final',2,'アークハート 4戦場']];
  for(const [kind,cols,title] of sheets){
   const sheet=await page.evaluate(({kind,cols,title})=>{
    const entries=scenes.filter(s=>s.kind===kind),width=cols*448,pad=17,tileH=283;
    const c=document.createElement('canvas');c.width=width;c.height=81+Math.ceil(entries.length/cols)*tileH;
    const x=c.getContext('2d');x.fillStyle='#f2f0e7';x.fillRect(0,0,c.width,c.height);
    x.fillStyle='#365957';x.font='25px sans-serif';x.fillText('ARCLINE / '+title,17,40);
    x.font='11px sans-serif';x.fillText('不透明な単色色面 / 背景デザイン資料 / ゲーム未統合',17,64);
    entries.forEach((s,i)=>{const px=i%cols*448+pad,py=81+Math.floor(i/cols)*tileH;x.save();x.translate(px,py);A.draw(x,414,223,s);x.restore();x.fillStyle='#365957';x.font='13px sans-serif';x.fillText((s.kind==='normal'?s.stageRange.join('–')+' / ':'')+s.title,px,py+246);});
    return c.toDataURL().split(',')[1];
   },{kind,cols,title});
   fs.writeFileSync(path.join(output,'overview-'+kind+'.png'),Buffer.from(sheet,'base64'));
  }
  const storyboard=await page.evaluate(()=>{
   const c=document.createElement('canvas');c.width=1344;c.height=734;
   const x=c.getContext('2d');x.fillStyle='#f2f0e7';x.fillRect(0,0,c.width,c.height);
   x.fillStyle='#365957';x.font='23px sans-serif';x.fillText('ARCLINE / 保全扉を抜ける3つの移動',17,34);
   x.font='11px sans-serif';x.fillText('通常2.2秒 / t=.55で新戦場 / 戦闘中の背景は静止 / 動作軽減時は扉を省略',17,58);
   for(let i=1;i<4;i++)[0,.45,.66,1].forEach((t,j)=>{
    const px=j*336+13,py=78+(i-1)*216;
    x.save();x.translate(px,py);A.transition(x,310,167,scenes.find(s=>s.id==='final-100-'+(i-1)),scenes.find(s=>s.id==='final-100-'+i),t,false);x.restore();
    x.fillStyle='#365957';x.font='12px sans-serif';x.fillText('MAP '+i+' → '+(i+1)+' / '+Math.round(t*100)+'%',px,py+186);
   });return c.toDataURL().split(',')[1];
  });
  fs.writeFileSync(path.join(output,'overview-transitions.png'),Buffer.from(storyboard,'base64'));
  // Exercise filters, selection, responsive layout and the final transition.
  for(const kind of ['normal','boss','final','all']){
   await page.locator(`[data-filter="${kind}"]`).click();
   assert.equal(await page.locator('#scene-list button').count(),kind==='all'?33:kind==='normal'?20:kind==='boss'?9:4);
  }
  await page.locator('[data-filter="final"]').click();
  for(const index of [0,1,2,3]){await page.locator(`[data-id="final-100-${index}"]`).click();assert.equal(await page.locator('#transition-panel').isVisible(),true);}
  await page.locator('#play-travel').click();await page.waitForFunction(()=>!playing,{},{timeout:5000});
  assert.equal(await page.locator('#travel-progress').inputValue(),'1000');
  await page.locator('#reduced').check();await page.locator('#play-travel').click();await page.waitForFunction(()=>!playing,{},{timeout:3000});
  const transitions=await page.evaluate(()=>{
   let count=0;const c=document.createElement('canvas');c.width=568;c.height=240;const x=c.getContext('2d');
   for(let i=1;i<4;i++)for(const t of [0,.35,.54,.55,.7,1])for(const reduced of [true,false]){
    A.transition(x,568,240,scenes.find(s=>s.id==='final-100-'+(i-1)),scenes.find(s=>s.id==='final-100-'+i),t,reduced);count++;
   }return count;
  });
  await page.locator('[data-filter="all"]').click();await page.locator('[data-id="normal-02"]').click();
  await page.screenshot({path:path.join(output,'gallery-desktop.png'),fullPage:true});
  await page.setViewportSize({width:393,height:852});
  for(const dim of ['844,390','568,240','393,852','1120,604'])await page.locator(`[data-size="${dim}"]`).click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:path.join(output,'gallery-mobile.png'),fullPage:true});
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('#reduced').isChecked(),true);
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  const report={dateJst:'2026-11-07',status:'PASS',sceneCount:33,viewportChecks:33*4,transitionFrames:transitions,
    selectionChecks:99+4+6,externalHttpRequests:requests.length,pageErrors:errors.length,
    maxMeanSvgCanvasDifference:Math.max(...findings.map(x=>x.difference)),gameIntegrated:false,findings};
  fs.writeFileSync(path.join(root,'VALIDATION.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({...report,findings:undefined},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
