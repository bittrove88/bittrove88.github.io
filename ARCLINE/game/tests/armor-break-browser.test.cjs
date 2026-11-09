'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../../..'),out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-armor-break-browser';fs.mkdirSync(out,{recursive:true});
const server=http.createServer((q,r)=>{let f=path.resolve(root,'.'+new URL(q.url,'http://local').pathname);if(!f.startsWith(root+path.sep))return r.writeHead(403).end();if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f+='/index.html';fs.readFile(f,(e,b)=>{if(e)return r.writeHead(404).end();r.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(f)]||'text/html');r.end(b);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.ARCLINE_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox']}),rows=[],errors=[];
 try{
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:'+server.address().port+'/ARCLINE/game/attack-review/');await page.waitForFunction(()=>window.review?.current);
  for(const [width,height]of [[1200,720],[844,390]]){
   await page.setViewportSize({width,height});
   for(const stage of [40,60,70,80,90]){
    const result=await page.evaluate(({width,height,stage})=>{
     document.querySelector('#armorCheck')?.remove();const canvas=document.createElement('canvas');canvas.id='armorCheck';canvas.style.cssText=`position:fixed;inset:0;width:${width}px;height:${height}px;z-index:9999`;document.body.append(canvas);
     const E=ArcEngine,s=E.campaign(stage,{matchSeed:42});s.spec={...s.spec,floors:[[[0,10],[300,10]]],features:[],staticFeatures:[],components:[],phaseFeatures:undefined,worldWidth:3000};s.world=E.geometry.world(s.spec);for(const [i,u]of s.units.entries())Object.assign(u,{x:i?1200:880,y:400,slope:0,floating:false,range:[35,2965]});E.bossActions.refresh(s);
     const q=E.geometry.actorParts(s,1)[0],target=stage===60?{x:1110,y:373}:{x:1200+q.dx,y:400+q.dy},dir=stage!==60&&q.dx>0?-1:1,options={weaponId:'W01',origin:{x:target.x-dir*90,y:target.y-3,theta:dir>0?0:Math.PI,dir},weaponOverrides:{blast:0}},single=E.trajectory(s,0,0,100,options),many=E.trajectory(s,0,0,100,{...options,volley:[{delay:0},{delay:.2}]}),ctx=canvas.getContext('2d'),draw=ArcRender.create(canvas),texts=[],native=ctx.fillText;
     ctx.fillText=function(value,x,y){const m=this.getTransform(),w=this.measureText(String(value)).width;const alignment=this.textAlign==='center'?.5:this.textAlign==='right'?1:0;texts.push({value:String(value),left:m.a*(x-w*alignment)+m.e,right:m.a*(x+w*(1-alignment))+m.e});return native.call(this,value,x,y);};
     const render=(phase,language='ja',reducedMotion=false)=>{
      const state=JSON.parse(JSON.stringify(s)),plan=JSON.parse(JSON.stringify(phase==='break'?many:single)),e=plan.events.filter(e=>e.type==='part-hit').at(-1),time=phase==='before'?e.t-.00001:e.t+.1;
      if(phase!=='before')E.applyEvents(state,plan,time);ArcI18n.setLanguage(language);texts.length=0;draw.resetCamera();draw.draw(state,{shot:plan,flight:time,time,reducedMotion,presentationFrame:{top:12,bottom:height-16}});
      const labels=texts.filter(t=>/^(?:あと\d発|\d LEFT|ガード|GUARD|装甲破壊|ARMOR BREAK)$/.test(t.value));if(labels.some(t=>t.left<0||t.right>canvas.width))throw Error('offscreen armor label');return labels.map(t=>t.value);
     };
     const before=render('before'),hit=render('hit'),broken=render('break'),english=render('hit','en'),reduced=render('hit','ja',true);
     if(before.includes('ガード')||!before.includes(stage<70?'あと1発':'あと2発'))throw Error('before contact');
     if(hit.filter(t=>t==='ガード').length!==1||!hit.includes(stage<70?'装甲破壊':'あと1発'))throw Error('contact feedback');
     if(!broken.includes('装甲破壊')||!english.includes('GUARD')||!reduced.includes('ガード'))throw Error('break/localization/reduced motion');
     return {stage,width,height,before,hit,broken,english,reduced};
    },{width,height,stage});rows.push(result);await page.locator('#armorCheck').screenshot({path:path.join(out,'armor-'+stage+'-'+width+'.png')});
   }
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'ARMOR_BREAK_BROWSER.json'),JSON.stringify({status:'PASS',scope:'Isolated collision/render fixtures; not a full campaign replay',rows,errors},null,2));console.log('PASS armor counters: five bosses, two viewport sizes, actual contacts, distinct projectiles, Japanese/English and reduced motion');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
