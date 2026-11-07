'use strict';
// Artifacts and browser evidence for the independent gallery, not the live game.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('../../../node_modules/playwright');
const root=__dirname,evidence=process.env.ARCLINE_COMPONENT_EVIDENCE_DIR||'/tmp/arcline-components-complete';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function main(){
 fs.mkdirSync(path.join(root,'png'),{recursive:true});fs.mkdirSync(evidence,{recursive:true});
 const server=http.createServer((req,res)=>{
  const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/,''),file=path.resolve(root,relative||'index.html');
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.svg':'image/svg+xml','.js':'text/javascript','.json':'application/json','.png':'image/png','.md':'text/plain; charset=utf-8'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;const errors=[],external=[];
 try{
  browser=await chromium.launch({executablePath:process.env.ARCLINE_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:1600,height:1000}}),origin=`http://127.0.0.1:${server.address().port}`;
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(origin))external.push(r.url());});
  await page.goto(origin);await page.evaluate(()=>document.fonts.ready);
  const baseline=await page.evaluate(()=>JSON.stringify(COLLECTION));
  const structural=await page.evaluate(()=>{
   const assert=(x,msg)=>{if(!x)throw Error(msg);};let selections=0,colliders=0,fields=0,visibleFieldBadges=0;
   const walk=(a,out=[])=>{out.push(a);for(const c of a.children||[])walk(c,out);return out;};
   for(const row of COLLECTION.worlds){
    const style=ArcComponentCollection.select(COLLECTION.manifest,row.stage,row.mapIndex),graph=COLLECTION.maps[row.id];selections++;
    assert(graph.sceneId===style.id,'wrong scene '+row.id);const nodes=graph.nodes.flatMap(n=>walk(n));

    // The visible foreground has one collider node per real solid. Device bases are decorative and excluded.
    const foreground=nodes.find(n=>n.role==='foreground'),visible=foreground.children.filter(n=>n.collider);
    assert(visible.length===row.world.solids.length,'solid count '+row.id);
    for(let i=0;i<visible.length;i++){assert(JSON.stringify(visible[i].collider)===JSON.stringify(row.world.solids[i].poly.map(p=>[p.x,p.y])),'collider changed '+row.id);colliders++;}
    const badges=walk(foreground).filter(n=>n.role==='stateBadge');assert(badges.length===0,'no routine field badges');
    const regions=nodes.filter(n=>n.role==='field');assert(regions.length===row.world.regions.length,'field count');
    regions.forEach((n,i)=>{const region=row.world.regions[i];for(const key of ['kind','direction','on','strength'])assert((n.sourceState[key]??null)===(region[key]??null),'field state '+key);const bands=walk(n).filter(a=>a.role==='fieldRange'),active=region.on!==false&&(region.strength??1)>0;assert(bands.length===(active&&['F','U','V'].includes(region.kind)?1:0),'active flow area only');if(bands.length)assert(JSON.stringify(bands[0].bounds)===JSON.stringify([region.x1,region.y1,region.x2,region.y2]),'flow area changed physics extent');fields++;});
   }
   for(const [stage,index] of [[0,null],[101,null],['10',null],[100,null],[100,-1],[100,4],[100,1.2],[100,'1'],[NaN,null],[true,null]]){assert(ArcComponentCollection.select(COLLECTION.manifest,stage,index)===null,'invalid selector');selections++;}
   const freeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.freeze(o);Object.values(o).forEach(freeze);}};freeze(COLLECTION);
   return {selections,colliders,fields,visibleFieldBadges};
  });
  const ids=await page.evaluate(()=>Object.keys(COLLECTION.graphs)),parity=[];
  for(const id of ids){
   const result=await page.evaluate(async id=>{
    const graph=COLLECTION.graphs[id],canvas=document.createElement('canvas');canvas.width=graph.width;canvas.height=graph.height;const ctx=canvas.getContext('2d');ArcComponentCollection.draw(ctx,canvas.width,canvas.height,graph);
    const png=canvas.toDataURL('image/png').split(',')[1],actual=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    const image=new Image();image.src='svg/'+id+'.svg';await image.decode();const ref=document.createElement('canvas');ref.width=canvas.width;ref.height=canvas.height;const rc=ref.getContext('2d');rc.drawImage(image,0,0);const expected=rc.getImageData(0,0,ref.width,ref.height).data;
    let sum=0,max=0,transparent=0;for(let i=0;i<actual.length;i+=4){if(actual[i+3]!==255)transparent++;for(let j=0;j<3;j++){const d=Math.abs(actual[i+j]-expected[i+j]);sum+=d;max=Math.max(max,d);}}
    const strip=a=>({...a,...(a.children?{children:a.children.filter(n=>n.type!=='text').map(strip)}:{})});
    const paintGraph={...graph,nodes:graph.nodes.filter(n=>n.type!=='text').map(strip)};ctx.clearRect(0,0,canvas.width,canvas.height);ArcComponentCollection.draw(ctx,canvas.width,canvas.height,paintGraph);const paint=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    const source=(await (await fetch('svg/'+id+'.svg')).text()).replace(/<text[\s\S]*?<\/text>/g,'');const paintImage=new Image();paintImage.src='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(source)));await paintImage.decode();rc.clearRect(0,0,ref.width,ref.height);rc.drawImage(paintImage,0,0);const paintExpected=rc.getImageData(0,0,ref.width,ref.height).data;let paintSum=0;for(let i=0;i<paint.length;i+=4)for(let j=0;j<3;j++)paintSum+=Math.abs(paint[i+j]-paintExpected[i+j]);
    return {png,meanRGB:sum/(canvas.width*canvas.height*3),artOnlyMeanRGB:paintSum/(canvas.width*canvas.height*3),maxChannelDifference:max,transparentPixels:transparent};
   },id);
   fs.writeFileSync(path.join(root,'png',id+'.png'),Buffer.from(result.png,'base64'));delete result.png;parity.push({id,...result});assert.equal(result.transparentPixels,0,id+' opacity');assert.ok(result.meanRGB<1.5,id+' SVG/Canvas mismatch '+result.meanRGB);assert.ok(result.artOnlyMeanRGB<.02,id+' material mismatch '+result.artOnlyMeanRGB);
  }
  const sizes=[[1600,1350],[844,390],[568,240],[393,852]];
  const renders=await page.evaluate(sizes=>{
   let count=0;for(const scene of COLLECTION.manifest.scenes)for(const [width,height] of sizes){const c=document.createElement('canvas');c.width=width;c.height=height;ArcComponentCollection.draw(c.getContext('2d'),width,height,COLLECTION.graphs[scene.id]);const data=c.getContext('2d').getImageData(0,0,width,height).data;for(let i=3;i<data.length;i+=4)if(data[i]!==255)throw Error('transparent '+scene.id);count++;}return count;
  },sizes);
  const mapRenders=await page.evaluate(()=>{
   let count=0;const c=document.createElement('canvas');c.width=1000;c.height=430;for(const graph of Object.values(COLLECTION.maps))for(const options of [{},{chargeZoom:true,collision:true},{hideBackground:true,collision:true}]){const ctx=c.getContext('2d');ctx.clearRect(0,0,1000,430);ArcComponentCollection.draw(ctx,1000,430,graph,options);count++;}return count;
  });
  const contextRestored=await page.evaluate(()=>{
   const c=document.createElement('canvas');c.width=2000;c.height=1000;const ctx=c.getContext('2d');ctx.setTransform(2,0,0,2,17,23);ctx.globalAlpha=.37;ctx.globalCompositeOperation='multiply';ctx.fillStyle='#123456';ctx.strokeStyle='#abcdef';ctx.lineWidth=7;ctx.setLineDash([3,4]);ctx.textAlign='center';ctx.textBaseline='bottom';ctx.filter='blur(1px)';ctx.shadowBlur=5;ctx.shadowOffsetX=3;
   const state=()=>JSON.stringify([Array.from(ctx.getTransform().toFloat64Array()),ctx.globalAlpha,ctx.globalCompositeOperation,ctx.fillStyle,ctx.strokeStyle,ctx.lineWidth,ctx.getLineDash(),ctx.textAlign,ctx.textBaseline,ctx.filter,ctx.shadowBlur,ctx.shadowOffsetX,ctx.fontKerning]);
   const before=state();ArcComponentCollection.draw(ctx,1000,430,COLLECTION.maps['61'],{collision:true,chargeZoom:true});return before===state();
  });assert.ok(contextRestored,'canvas context leaked');
  let uiSelections=0;
  for(const kind of ['normal','boss','final']){
   await page.locator(`[data-kind="${kind}"]`).click();
   const scenes=await page.locator('#scene option').evaluateAll(items=>items.map(o=>o.value));
   for(const id of scenes){await page.locator('#scene').selectOption(id);assert.equal(await page.evaluate(()=>previewState.id),id);uiSelections++;}
  }
  await page.locator('[data-kind="states"]').click();assert.equal(await page.evaluate(()=>previewState.id),'shared-states');
  await page.locator('[data-kind="normal"]').click();await page.locator('#mode').selectOption('map');
  await page.locator('#background').uncheck();await page.locator('#collision').check();await page.locator('#charge').check();
  const layouts=[];
  for(const [width,height] of sizes)for(const mode of ['sheet','map']){await page.setViewportSize({width,height});await page.locator('#mode').selectOption(mode);const layout=await page.evaluate(()=>({width:innerWidth,pageWidth:document.documentElement.scrollWidth,viewerWidth:document.querySelector('.viewer').clientWidth}));assert.ok(layout.pageWidth<=width,`body overflow ${width}`);layouts.push({mode,...layout});await page.screenshot({path:path.join(evidence,`gallery-${mode}-${width}x${height}.png`),fullPage:true});}
  assert.equal(await page.evaluate(()=>JSON.stringify(COLLECTION)),baseline,'art data mutated');assert.equal(await page.evaluate(()=>localStorage.length),0,'save written');assert.equal(errors.length,0);assert.equal(external.length,0);
  const fixture=JSON.parse(fs.readFileSync(path.join(root,'worlds.json')));for(const [file,hash]of Object.entries(fixture.runtimeHashes))assert.equal(sha(fs.readFileSync(path.join(root,'../../..',file))),hash,'runtime changed '+file);
  const report={scope:'Independent component gallery and art fixtures; not game integration or device play.',sceneCounts:{normal:20,boss:9,final:4},graphPNGs:ids.length,themeSizeRenders:renders,sizes,mapRenders,...structural,uiSelections,layouts,parity,contextRestored,dataImmutable:true,saveWrites:0,javaScriptErrors:errors,externalHTTP:external,runtimeFixtureHashesMatch:true,designApproved:false,runtimeIntegrated:false};
  fs.writeFileSync(path.join(root,'validation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,parity:{count:parity.length,maxMeanRGB:Math.max(...parity.map(r=>r.meanRGB))}},null,2));
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
