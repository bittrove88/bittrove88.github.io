'use strict';
const assert=require('node:assert/strict');
const V=require('../../design/components/complete/renderer.js');
let checks=0;
const ok=(value,message)=>{checks++;assert(value,message);};
class TraceContext {
 constructor(zoom){this.zoom=zoom;this.globalAlpha=1;this.paths=[];this.texts=[];this.stack=[];}
 getTransform(){return {a:this.zoom,b:0,c:0,d:this.zoom,e:0,f:0};}
 save(){this.stack.push({globalAlpha:this.globalAlpha,strokeStyle:this.strokeStyle,lineWidth:this.lineWidth});}
 restore(){Object.assign(this,this.stack.pop());}
 scale(){} setLineDash(){} rect(){} clip(){} fillRect(){}
 beginPath(){this.path=[];}
 moveTo(...p){this.path.push(['move',...p]);}
 lineTo(...p){this.path.push(['line',...p]);}
 bezierCurveTo(...p){this.path.push(['bezier',...p]);}
 quadraticCurveTo(...p){this.path.push(['quadratic',...p]);}
 stroke(){this.paths.push(JSON.parse(JSON.stringify(this.path)));}
 measureText(value){return {width:value.length*6};}
 fillText(value){this.texts.push(value);}
 strokeText(){}
}
const region=kind=>({kind,x1:100,x2:700,y1:-310,y2:80,direction:1,strength:.35,on:true,color:'#295F51',accent:'#DDF6E8',offscreenFlowSourceHint:false});
const boundsA={left:120,right:650,top:-250,bottom:0},boundsB={left:140,right:690,top:-230,bottom:60};
function capture(r,{bounds=boundsA,zoom=1,time=2,reducedMotion=false}={}){
 const ctx=new TraceContext(zoom);
 V.draw(ctx,1,1,{width:1,height:1,nodes:[{type:'group',role:'field',motion:r,children:[]}]},{pixelRatio:1,fieldMotion:true,fieldBounds:bounds,time,reducedMotion});
 const seen=new Set(),paths=ctx.paths.filter(p=>{const key=JSON.stringify(p);if(seen.has(key))return false;seen.add(key);return true;});
 const moving=paths.filter(p=>p.length===5&&p[0][0]==='move'&&p[1][0]==='line'&&Math.abs(Math.hypot(p[1][1]-p[0][1],p[1][2]-p[0][2])-18/zoom)<1e-6).map(p=>({x:(p[0][1]+p[1][1])/2,y:(p[0][2]+p[1][2])/2}));
 return {paths,moving,texts:ctx.texts};
}
for(const kind of ['F','U','V']){
 const r=region(kind),before=JSON.stringify(r),a=capture(r),b=capture(r,{bounds:boundsB});
 assert.deepEqual(a.paths,b.paths,'camera clipping must not relocate flow geometry '+kind);checks++;
 for(const zoom of [.65,1.25]){const c=capture(r,{zoom});assert.deepEqual(c.moving.map(p=>[+p.x.toFixed(6),+p.y.toFixed(6)]),a.moving.map(p=>[+p.x.toFixed(6),+p.y.toFixed(6)]),'camera zoom must not change flow phase/lane centers '+kind+'/'+zoom);checks++;}
 ok(capture({...r,on:false}).paths.length===0,'off flow stays hidden '+kind);
 assert.deepEqual(capture(r,{time:0,reducedMotion:true}).paths,capture(r,{time:99,reducedMotion:true}).paths,'reduced-motion flow stays static '+kind);checks++;
 assert.equal(JSON.stringify(r),before,'drawing preserves physical region '+kind);checks++;
}
for(const direction of [-1,1]){
 const r={...region('F'),direction},a=capture(r,{time:0}),b=capture(r,{time:.25});
 ok(a.paths.length===6&&a.moving.length===3,'wind has three traces and three moving arrows, without fixed endpoint marks');
 ok(a.moving.every((p,i)=>(b.moving[i].x-p.x)*direction>0),'moving wind arrows retain their physical direction');
 assert.deepEqual(capture(r,{time:.75}).moving,capture({...r,strength:.18},{time:.75*.35/.18}).moving,'weak wind changes speed only');checks++;
 ok(capture({...r,offscreenFlowSourceHint:true},{bounds:{...boundsA,left:300,right:500}}).texts.length===0,'wind has no off-screen source mark');
}
console.log('PASS flow-camera '+checks+' checks');
