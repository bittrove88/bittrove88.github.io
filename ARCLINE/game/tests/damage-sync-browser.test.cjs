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
      const body=p.events.filter(q=>q.type==='damage'&&q.unit===1&&q.t<=e.t+1e-8),last=body.at(-1),text=String(ArcCombat.points(body.reduce((sum,q)=>sum+q.value,0)));labelMatch&&=(!last||e.t-last.t>=.9||labels.filter(label=>label===text).length===1)&&!labels.some(label=>/^(?:HIT|CORE|CRITICAL|PART)\b|MAX| ×\d/.test(label));
     }
     results.push({id:row.id,frameIndependent:JSON.stringify(states[0])===JSON.stringify(states[1]),labelMatch,points:ArcCombat.points(r.plan.damage[1])});
    }
    // Inspect real Canvas strokes: the entire bright ribbon follows the same
    // radius as the swept collision front, including partial-cover hit times.
    const ring=ArcAttackReview.create('special:hibari').plan.events.find(e=>e.type==='ring');
    const methods=['beginPath','moveTo','lineTo','stroke'],native=Object.fromEntries(methods.map(k=>[k,ctx[k]]));
    for(const progress of [.2,.5,.85]){
     let points=[],strokes=[];
     ctx.beginPath=function(...a){points=[];return native.beginPath.apply(this,a);};
     ctx.moveTo=function(x,y){points.push({x,y});return native.moveTo.call(this,x,y);};
     ctx.lineTo=function(x,y){points.push({x,y});return native.lineTo.call(this,x,y);};
     ctx.stroke=function(...a){strokes.push({points:[...points],width:this.lineWidth});return native.stroke.apply(this,a);};
     ArcEffects.forContext(ctx).draw({weaponId:'S_HIBARI',bullets:[],events:[ring],impacts:[]},ring.t+ring.duration*progress,{scale:1});
     const ribbon=strokes.filter(stroke=>stroke.width===7&&stroke.points.length>10);
     if(ribbon.length!==1||ribbon.some(stroke=>stroke.points.some(p=>Math.abs(Math.hypot(p.x-ring.x,p.y-ring.y)-ring.radius*progress)>1e-5)))throw Error('visible Hibari ribbon must follow the collision circle');
     for(const k of methods)ctx[k]=native[k];
    }
    const r=ArcAttackReview.create('special:hibari'),p=r.plan;
    const sequence=[];for(const e of p.events.filter(e=>e.type==='damage'&&e.unit===1)){labels.length=0;draw.draw(r.before,{shot:p,flight:e.t+.001,time:e.t+.001});const total=ArcCombat.points(p.events.filter(q=>q.type==='damage'&&q.unit===1&&q.t<=e.t+1e-8).reduce((sum,q)=>sum+q.value,0));if(!labels.includes(String(total)))throw Error('single cumulative Hibari label');sequence.push(total);}
    if(sequence.join(',')!=='11,23,35')throw Error('Hibari numeric sequence '+sequence);
    const videoBefore=ArcEngine.campaign(10,{equippedCharacterId:'hibari',matchSeed:20261109,battleInventory:{}}),videoPlan=ArcEngine.trajectory(videoBefore,0,48,60.67620434,{weaponId:'S_HIBARI'});
    const contacts=videoPlan.events.filter(e=>['damage','part-damage'].includes(e.type)&&e.unit===1);
    if(contacts.map(e=>ArcCombat.points(e.value)).join(',')!=='5.1,12,2.9,9.1')throw Error('native user-video regression');
    for(const fps of [30,120]){const state=clone(videoBefore),plan=clone(videoPlan);for(let time=0;time<plan.duration+1/fps;time+=1/fps)ArcEngine.applyEvents(state,plan,time);ArcEngine.resolve(state,plan);if(ArcCombat.points(state.units[1].hp)!==190.9||state.units[1].parts[0].hp!==0)throw Error('user-video body/armor timeline '+fps);}
    for(const e of contacts){labels.length=0;draw.resetCamera();draw.draw(videoBefore,{shot:videoPlan,flight:e.t+.001,time:e.t+.001});const numeric=labels.filter(label=>/^\d+(?:\.\d+)?$/.test(label));if(e.type==='part-damage'?numeric.length!==0:numeric.join(',')!=='9.1')throw Error('armor is visual, body has one actual-damage number '+numeric);}
    window.hibariVideo={before:videoBefore,plan:videoPlan};
    window.damageCanvas=canvas;window.damageRenderer=draw;
    return results;
   },{width,height});
   for(const r of result){assert(r.frameIndependent,'frame independent HP '+r.id);assert(r.labelMatch,'exact rendered hit label '+r.id);rows.push({width,height,...r});}
   await page.evaluate(()=>{const {before,plan}=hibariVideo,s=JSON.parse(JSON.stringify(before)),p=JSON.parse(JSON.stringify(plan));ArcEngine.applyEvents(s,p,Infinity);ArcEngine.resolve(s,p);const last=p.events.filter(e=>e.type==='damage'&&e.unit===1).at(-1);damageRenderer.resetCamera();damageRenderer.draw(s,{shot:p,flight:last.t+.001,time:last.t+.001,characterId:s.characterId});});
   await page.screenshot({path:path.join(out,'damage-hibari-boss-'+width+'.png')});
   await page.evaluate(()=>{const r=ArcAttackReview.create('special:hibari'),s=JSON.parse(JSON.stringify(r.before)),p=JSON.parse(JSON.stringify(r.plan));p.appliedEvents=0;p.resolved=false;delete p.appliedDamage;delete p.sourceAppliedDamage;delete p.appliedPartDamage;const last=p.events.filter(e=>e.type==='damage'&&e.unit===1).at(-1);ArcEngine.applyEvents(s,p,last.t+.001);damageRenderer.resetCamera();damageRenderer.draw(s,{shot:p,flight:last.t+.001,time:last.t+.001,characterId:s.characterId});});
   await page.screenshot({path:path.join(out,'damage-hibari-'+width+'.png')});await page.evaluate(()=>damageCanvas.remove());
  }
  assert.equal(rows.length,64);assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'DAMAGE_SYNC_BROWSER.json'),JSON.stringify({status:'PASS',rows,errors,additionalChecks:'Circular Hibari ribbon at three radii; single cumulative labels; native stage10 user-video regression5.1/12/2.9 plus9.1 to body, no armor numbers,30/120fps.'},null,2));console.log('PASS damage sync browser: '+rows.length+' actual render/HP cases,30/120fps');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
