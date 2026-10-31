'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright'),E=require('../dist/engine.js'),S=require('../dist/save.js'),A=require('../dist/characters.js');
const root=path.resolve(__dirname,'../dist'),out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-character-graphics';
fs.mkdirSync(out,{recursive:true});let checks=0;const ok=(v,m)=>{checks++;assert(v,m);};
ok(A.characters.length===10,'ten reference machines');
assert.deepEqual(A.characters.map(c=>c.id),S.characterIds);checks++;
ok(S.decode(null).equippedCharacterId==='gun','existing saves get a safe visual default');
ok(S.decode(JSON.stringify({equippedCharacterId:'unknown'})).equippedCharacterId==='gun','untrusted visual id falls back');
for(const id of S.characterIds){
 const data=S.decode(JSON.stringify({schemaVersion:2,contentRevision:S.revision,cleared:100,equippedCharacterId:id,unlockedWeaponIds:['W01','W20'],equippedWeaponId:'W20',collectedCosmeticIds:['S01','B10'],equippedCosmeticId:'B10'}));
 ok(data.equippedCharacterId===id&&data.equippedWeaponId==='W20'&&data.equippedCosmeticId==='B10'&&data.cleared===100,'visual choice preserves progression and inventory '+id);
 for(let n=1;n<=100;n++){
  const base=E.campaign(n,{...data,equippedCharacterId:'gun',matchSeed:123}),selected=E.campaign(n,{...data,matchSeed:123});
  assert.equal(selected.units[0].maxHp,E.combat.get(id).hp/20,'machine combat profile '+id+' stage '+n);checks++;
  assert.deepEqual({world:selected.world,enemy:selected.units[1],pickups:selected.pickups,spawn:[selected.units[0].x,selected.units[0].y]}, {world:base.world,enemy:base.units[1],pickups:base.pickups,spawn:[base.units[0].x,base.units[0].y]},'machine selection preserves map, enemy, pickups and spawn '+id+' stage '+n);checks++;
  assert.equal(selected.random(),base.random(),'enemy randomness unchanged '+id+' stage '+n);checks++;
 }
}
const server=http.createServer((req,res)=>{
 const name=req.url.split('?')[0],file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(error,bytes)=>{if(error)return res.writeHead(404).end();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(bytes);});
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const errors=[],viewports=[];let poses=0;
 try{
  for(const [width,height]of[[568,240],[667,280],[844,390],[932,430],[1024,768],[1440,900]]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:width<1000,deviceScaleFactor:2}),page=await context.newPage();
   page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction('!document.getElementById("play").disabled');
   await page.locator('#openCharacters').click();ok(await page.locator('[data-equip-character]').count()===10,'ten selectable machines '+width);
   for(const c of A.characters){
    await page.locator('[data-equip-character="'+c.id+'"]').click();
    ok(await page.evaluate(id=>save.data.equippedCharacterId===id,c.id),'select '+c.id+' '+width);
    ok(await page.locator('[data-equip-character="'+c.id+'"]').getAttribute('aria-pressed')==='true','selected state '+c.id);
    ok(await page.locator('.character-detail strong').innerText()===c.nameJa,'Japanese machine name '+c.id);
    const dimensions=await page.evaluate(()=>{
     const panel=document.querySelector('.collection-panel'),r=panel.getBoundingClientRect();
     return {overflow:panel.scrollWidth>panel.clientWidth+1,left:r.left,right:r.right,canvases:[...document.querySelectorAll('.equipment-grid canvas')].map(c=>({width:c.clientWidth,height:c.clientHeight,pixels:c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v)}))};
    });
    ok(!dimensions.overflow&&dimensions.left>=0&&dimensions.right<=width+1,'machine picker fits '+width);
    ok(dimensions.canvases.length===10&&dimensions.canvases.every(c=>c.width>30&&c.height>=70&&c.pixels),'all ten rendered card thumbnails '+width);
   }
   if(width===844)await page.screenshot({path:path.join(out,'machines-phone.png')});
   await page.locator('#closeCollection').click();await page.evaluate(()=>save.pending);await page.reload();await page.waitForFunction('!document.getElementById("play").disabled');
   ok(await page.evaluate('save.data.equippedCharacterId')==='yui','selection survives reload '+width);
   await page.evaluate(()=>{cancelAnimationFrame(raf);raf=0;save.data.seenPreviewIds=[...ArcSave.previewIds];selectedMap=12;start();endDemo();encounter=null;document.getElementById('encounterBanner').hidden=true;hud();draw();});
   const unchanged=await page.evaluate(()=>{
    const before=JSON.stringify(s),result=[];
    for(const c of ArcCharacters.characters){save.data.equippedCharacterId=c.id;hud();draw();result.push({id:c.id,stable:JSON.stringify(s)===before,name:document.getElementById('playerName').textContent});}
    return result;
   });
   ok(unchanged.every(x=>x.stable),'drawing every machine leaves battle unchanged '+width);
   if(width===844)await page.screenshot({path:path.join(out,'yui-battle-phone.png')});
   if(width===1440){
    const geometry=await page.evaluate(()=>{
     const canvas=document.createElement('canvas');canvas.width=500;canvas.height=500;const ctx=canvas.getContext('2d'),faults=[],hashes=[];
     function bounds(){const p=ctx.getImageData(0,0,500,500).data;let left=500,right=0,top=500,bottom=0;for(let y=0;y<500;y++)for(let x=0;x<500;x++)if(p[(y*500+x)*4+3]>80){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}return {left,right,top,bottom};}
     let capture=false,centers=[];
     const ellipse=ctx.ellipse.bind(ctx);ctx.ellipse=(x,y,...args)=>{if(capture){const p=new DOMPoint(x,y).matrixTransform(ctx.getTransform());centers.push({x:p.x,y:p.y});}return ellipse(x,y,...args);};
     ctx.createLinearGradient=ctx.createRadialGradient=()=>{throw Error('Gloss gradient inside character renderer');};
     for(const character of ArcCharacters.characters){
      for(const dir of[-1,1])for(const slope of[-.45,0,.45])for(const angle of[-12,0,32,55,85]){
       const state=E.campaign(13,{matchSeed:123});state.units[0]={...state.units[0],x:200,y:300,slope};state.units[1].x=dir===1?800:50;
       const m=G.muzzle(state,0,angle);ctx.clearRect(0,0,500,500);ctx.save();ctx.lineWidth=7;ctx.globalAlpha=.8;
       centers=[];capture=true;const r=ArcCharacters.draw(ctx,character.id,{x:200,y:300,dir,slope,angle,muzzle:m,travel:200,hit:2,kick:2});capture=false;
       // Chromium quantizes Canvas transforms; 0.0001 world units is far below a screen pixel.
       const muzzleError=Math.min(...centers.map(p=>Math.hypot(p.x-m.x,p.y-m.y)));
       if(Math.hypot(r.muzzle.x-m.x,r.muzzle.y-m.y)>1e-8||muzzleError>1e-4)faults.push({id:character.id,dir,slope,angle,reason:'muzzle',muzzleError});
       if(ctx.lineWidth!==7||ctx.globalAlpha!==.8||ctx.getTransform().a!==1)faults.push({id:character.id,reason:'leaked canvas state'});
       if(centers.some(p=>!Number.isFinite(p.x+p.y)))faults.push({id:character.id,reason:'nonfinite path'});
       ctx.restore();
      }
      ctx.clearRect(0,0,500,500);ArcCharacters.draw(ctx,character.id,{x:200,y:300,angle:32});const pixels=ctx.getImageData(0,0,500,500).data;
      let hash=2166136261;for(let i=0;i<pixels.length;i++)hash=Math.imul(hash^pixels[i],16777619);hashes.push(hash>>>0);
      const right=bounds();ctx.clearRect(0,0,500,500);ArcCharacters.draw(ctx,character.id,{x:200,y:300,angle:32,dir:-1});const left=bounds();
      if(Math.abs(left.top-right.top)>1||Math.abs(left.bottom-right.bottom)>1||Math.abs(left.left+right.right-399)>2||Math.abs(left.right+right.left-399)>2)faults.push({id:character.id,reason:'left-facing weapon must mirror, not turn upside down',left,right});
     }
     // Compare warm rendering time with the current frame budget, not a device certification.
     const timing={};for(const mode of['stationary','walking']){const samples=[];for(let frame=0;frame<80;frame++){const t=performance.now();ArcCharacters.draw(ctx,'gun',{x:200,y:300,angle:32,travel:mode==='walking'?frame:200});if(frame>9)samples.push(performance.now()-t);}samples.sort((a,b)=>a-b);timing[mode+'P95Ms']=samples[Math.floor(samples.length*.95)];}
     return {faults,unique:new Set(hashes).size,poses:300,timing};
    });
    ok(geometry.faults.length===0,JSON.stringify(geometry.faults.slice(0,5)));ok(geometry.unique===10,'ten distinct rendered silhouettes and palettes');poses=geometry.poses;
    fs.writeFileSync(path.join(out,'DRAWING.json'),JSON.stringify(geometry,null,2)+'\n');
    await page.evaluate(()=>{lobby();ArcI18n.setLanguage('en');document.getElementById('openCharacters').click();});
    ok(await page.locator('[data-equip-character="gun"] strong').innerText()==='GUN','English names');
    ok(await page.locator('.character-detail p').first().innerText()==='Gravity towing support','English descriptions');
    await page.evaluate(()=>ArcI18n.setLanguage('ja'));ok(await page.locator('.character-detail p').first().innerText()==='重力牽引サポート','Japanese descriptions restored');
   }
   viewports.push({width,height,machines:10});await context.close();
  }
  ok(errors.length===0,errors.join('\n'));const report={status:'PASS',checks,poses,viewports,errors,scope:'Ten code-drawn appearances, six emulated viewports, selection persistence, Japanese/English, 300 actual Canvas muzzle poses, and 1,000 selected-profile campaign states with unchanged map/enemy/spawn/randomness. Reference-image fidelity is visually reviewed, not pixel-equivalence. Physical phone performance and additional concept attachments are unverified.'};
  fs.writeFileSync(path.join(out,'CHARACTERS.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exit(1);});
