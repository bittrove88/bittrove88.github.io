'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../../..'),out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-damage-sync-browser';fs.mkdirSync(out,{recursive:true});
const server=http.createServer((q,r)=>{let f=path.resolve(root,'.'+new URL(q.url,'http://local').pathname);if(!f.startsWith(root+path.sep))return r.writeHead(403).end();if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f+='/index.html';fs.readFile(f,(e,b)=>{if(e)return r.writeHead(404).end();r.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(f)]||'text/html');r.end(b);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.ARCLINE_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox']});
 const errors=[],rows=[];
 try{
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:'+server.address().port+'/ARCLINE/game/attack-review/');await page.waitForFunction(()=>window.review?.current);
  for(const [width,height]of [[1200,720],[844,390]]){
   await page.setViewportSize({width,height});
   const result=await page.evaluate(({width,height})=>{
    const language=ArcI18n.language;
    for(const id of ['mogu','hibari']){
     ArcI18n.setLanguage('ja');if(ArcI18n.t(ArcLessons.describe('S_'+id.toUpperCase()).instruction)!==ArcAttackCatalog.specials[id].noteJa)throw Error('current Japanese special instruction '+id);
     ArcI18n.setLanguage('en');if(ArcI18n.t(ArcLessons.describe('S_'+id.toUpperCase()).instruction)!==ArcAttackCatalog.specials[id].noteEn)throw Error('current English special instruction '+id);
    }
    ArcI18n.setLanguage(language);
    const canvas=document.createElement('canvas');canvas.style.cssText=`width:${width}px;height:${height}px;position:fixed;inset:0;background:#123;z-index:999`;document.body.append(canvas);
    const ctx=canvas.getContext('2d'),draw=ArcRender.create(canvas),original=ctx.fillText,labels=[];ctx.fillText=function(text,...args){labels.push(String(text));return original.call(this,text,...args);};
    const clone=x=>JSON.parse(JSON.stringify(x)),results=[];
    for(const row of ArcAttackReview.rows.filter(r=>['通常弾','補助武器','必殺技'].includes(r.category))){
     const r=ArcAttackReview.create(row.id),states=[];
     for(const fps of [30,120]){
      const s=clone(r.before),p=clone(r.plan);p.appliedEvents=0;p.resolved=false;delete p.appliedDamage;delete p.sourceAppliedDamage;delete p.appliedPartDamage;
      for(let t=0;t<=p.duration+1/fps;t+=1/fps)ArcEngine.applyEvents(s,p,t);ArcEngine.resolve(s,p);states.push(s.units.map(u=>({hp:u.hp,parts:u.parts.map(q=>q.hp)})));
     }
     const s=clone(r.before),p=clone(r.plan);p.appliedEvents=0;p.resolved=false;delete p.appliedDamage;delete p.sourceAppliedDamage;delete p.appliedPartDamage;
     let labelMatch=true;
     for(const e of p.events.filter(e=>(e.type==='damage'||e.type==='part-damage')&&e.unit===1)){
      ArcEngine.applyEvents(s,p,e.t+1e-8);labels.length=0;draw.resetCamera();draw.draw(s,{shot:p,flight:e.t+.001,time:e.t+.001,characterId:s.characterId,presentationFrame:{top:18,bottom:height-20}});
      const text=(e.type==='part-damage'?'PART':e.weak?'CORE':e.critical?'CRITICAL':'HIT')+' · '+ArcCombat.points(e.value)+(e.capped?' MAX':'');labelMatch&&=labels.some(label=>label===text||label.startsWith(text+' ×'));
     }
     results.push({id:row.id,frameIndependent:JSON.stringify(states[0])===JSON.stringify(states[1]),labelMatch,points:ArcCombat.points(r.plan.damage[1])});
    }
    window.damageCanvas=canvas;window.damageRenderer=draw;
    return results;
   },{width,height});
   for(const r of result){assert(r.frameIndependent,'frame independent HP '+r.id);assert(r.labelMatch,'exact rendered hit label '+r.id);rows.push({width,height,...r});}
   await page.evaluate(()=>{const r=ArcAttackReview.create('special:hibari'),s=JSON.parse(JSON.stringify(r.before)),p=JSON.parse(JSON.stringify(r.plan));p.appliedEvents=0;p.resolved=false;delete p.appliedDamage;delete p.sourceAppliedDamage;delete p.appliedPartDamage;const last=p.events.filter(e=>e.type==='damage'&&e.unit===1).at(-1);ArcEngine.applyEvents(s,p,last.t+.001);damageRenderer.resetCamera();damageRenderer.draw(s,{shot:p,flight:last.t+.001,time:last.t+.001,characterId:s.characterId});});
   await page.screenshot({path:path.join(out,'damage-hibari-'+width+'.png')});await page.evaluate(()=>damageCanvas.remove());
  }
  assert.equal(rows.length,64);assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'DAMAGE_SYNC_BROWSER.json'),JSON.stringify({status:'PASS',rows,errors},null,2));console.log('PASS damage sync browser: '+rows.length+' actual render/HP cases,30/120fps');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
