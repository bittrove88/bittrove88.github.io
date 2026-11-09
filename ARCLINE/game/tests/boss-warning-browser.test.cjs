'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright'),{fixtures}=require('../tools/probe_boss_movement.cjs'),{copy,state}=require('../tools/probe_boss_ballistics.cjs'),E=require('../dist/engine.js');
const root=path.resolve(__dirname,'../../..'),out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-boss-warning';fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file+='/index.html';fs.readFile(file,(error,body)=>{if(error)return res.writeHead(404).end();res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'text/html');res.end(body);});});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({executablePath:process.env.ARCLINE_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox']}),rows=[],errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1200,height:720}});page.on('pageerror',error=>errors.push(String(error)));await page.goto('http://127.0.0.1:'+server.address().port+'/ARCLINE/game/attack-review/');await page.waitForFunction('!!window.review');
  for(const stage of [20,30,50,60,70]){
   const fall=fixtures(stage).find(c=>c.label==='support-destroyed');assert(fall,'real support destruction '+stage);const before=state(stage).s;Object.assign(before.units[0],fall.reference);E.telegraph(before);const after=copy(fall.s);after.units.forEach(u=>{if(u.animation)u.animation.age=u.animation.duration;});
   for(const [width,height]of [[1200,720],[844,390]]){
    await page.setViewportSize({width,height});
    const result=await page.evaluate(({before,after,width,height})=>{
     const canvas=document.createElement('canvas');canvas.style.cssText=`position:fixed;inset:0;width:${width}px;height:${height}px;z-index:999;background:#123`;document.body.append(canvas);const ctx=canvas.getContext('2d'),renderer=ArcRender.create(canvas),native=Object.fromEntries(['beginPath','moveTo','lineTo','stroke'].map(name=>[name,ctx[name]]));let points=[],captured=[];
     ctx.beginPath=function(...args){points=[];return native.beginPath.apply(this,args);};ctx.moveTo=function(x,y){points.push({x,y});return native.moveTo.call(this,x,y);};ctx.lineTo=function(x,y){points.push({x,y});return native.lineTo.call(this,x,y);};ctx.stroke=function(...args){if(this.strokeStyle==='#ffc09c'&&points.length===2&&Math.abs(points[0].y-points[1].y)<1e-7&&Math.abs(points[1].x-points[0].x-2*before.telegraph.radius)<1e-7)captured.push(structuredClone(points));return native.stroke.apply(this,args);};
     const snapshots=[];for(const s of [before,after]){captured=[];renderer.resetCamera();renderer.draw(s,{time:0,characterId:s.characterId,presentationFrame:{top:18,bottom:height-20}});snapshots.push(captured);}
     window.warningAuditCanvas=canvas;return {snapshots,frozenY:before.telegraph.targetPose.y,playerY:after.units[0].y,columns:before.telegraph.columns.length};
    },{before:copy(before),after,width,height});
    assert(result.snapshots[0].length===result.columns&&result.snapshots[1].length===result.columns,'actual warning strokes captured '+stage);assert.deepEqual(result.snapshots[0],result.snapshots[1],'falling does not move the warning '+stage);assert(result.snapshots[1].every(line=>line.every(p=>Math.abs(p.y-result.frozenY-5)<1e-7)),'Canvas follows frozen world height '+stage);assert(Math.abs(result.playerY-result.frozenY)>100,'real fall is material '+stage);
    if(width===1200&&[20,70].includes(stage))await page.screenshot({path:path.join(out,'warning-fall-'+stage+'.png')});await page.evaluate(()=>warningAuditCanvas.remove());rows.push({stage,width,height,...result});
   }
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'WARNING_BROWSER.json'),JSON.stringify({status:'PASS',scope:'Actual Canvas warning paths before/after five native destructible-support falls, PC/mobile, frozen world coordinates rather than current player height.',rows,errors},null,2)+'\n');console.log('PASS boss warning browser '+rows.length+' actual Canvas cases');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
