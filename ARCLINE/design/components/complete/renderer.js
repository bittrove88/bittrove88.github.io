/* Independent component-art preview. No game, save, physics or network imports. */
(function(root){
'use strict';
function select(manifest,stage,mapIndex=null){
 if(!Number.isInteger(stage)||stage<1||stage>100)return null;
 if(stage===100)return Number.isInteger(mapIndex)&&mapIndex>=0&&mapIndex<4?manifest.scenes.find(s=>s.kind==='final'&&s.mapIndex===mapIndex)||null:null;
 if(stage%10===0)return manifest.scenes.find(s=>s.kind==='boss'&&s.stage===stage)||null;
 return manifest.scenes.find(s=>s.kind==='normal'&&s.themeIndex===Math.floor((stage-1)/5))||null;
}
function draw(ctx,width,height,scene,options={}){
 if(!ctx||!scene||!Array.isArray(scene.nodes)||![width,height].every(x=>Number.isFinite(x)&&x>0))throw Error('Invalid component artwork');
 const initial=ctx.getTransform(),pixelScale=options.pixelRatio||Math.hypot(initial.a,initial.b)||1;
 function node(a){
  if(a.role==='fieldStill'&&options.fieldMotion||a.role==='field'&&options.hideFields)return;
  if(a.role==='background'&&options.hideBackground||a.role==='collisionOverlay'&&!options.collision)return;
  ctx.save();try{
   if(a.opacity!==undefined)ctx.globalAlpha*=a.opacity;
   if(a.type==='group'){
    if(a.transform)ctx.transform(...a.transform);
    if(a.clip)ctx.clip(new Path2D(a.clip));
    if(a.role==='foreground'&&options.chargeZoom){const [x,y]=a.pivot;ctx.translate(x,y);ctx.scale(.9,.9);ctx.translate(-x,-y);}
    if(a.role==='field'&&options.fieldBounds){const b=options.fieldBounds;ctx.beginPath();ctx.rect(b.left,b.top,b.right-b.left,b.bottom-b.top);ctx.clip();}
    if(a.role==='field'&&a.motion&&options.fieldMotion){const m=ctx.getTransform();fieldMotion(ctx,a.motion,options.reducedMotion?0:options.time||0,pixelScale/Math.max(.0001,Math.hypot(m.a,m.b)),options.fieldBounds);}
    for(const child of a.children)node(child);return;
   }
   if(a.type==='text'){ctx.fillStyle=a.fill;ctx.font=`${a.weight} ${a.size}px "Noto Sans CJK JP",Arial,sans-serif`;if(a.stroke){ctx.strokeStyle=a.stroke;ctx.lineJoin='round';const m=ctx.getTransform();ctx.lineWidth=a.screenStroke?a.strokeWidth*pixelScale/Math.max(.0001,Math.hypot(m.a,m.b)):a.strokeWidth;ctx.strokeText(a.text,a.x,a.y);}ctx.fillText(a.text,a.x,a.y);return;}
   let p;if(a.type==='path')p=new Path2D(a.d);else if(a.type==='ellipse'){p=new Path2D();p.ellipse(a.cx,a.cy,a.rx,a.ry,0,0,Math.PI*2);}else throw Error('Unsupported component primitive');
   if(a.fill&&a.fill!=='none'){ctx.fillStyle=a.fill;ctx.fill(p);}
   if(a.stroke){ctx.strokeStyle=a.stroke;ctx.lineCap=ctx.lineJoin='round';const m=ctx.getTransform();ctx.lineWidth=a.screenStroke?a.strokeWidth*pixelScale/Math.max(.0001,Math.hypot(m.a,m.b)):a.strokeWidth;ctx.stroke(p);}
  }finally{ctx.restore();}
 }
 ctx.save();try{
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';ctx.shadowBlur=ctx.shadowOffsetX=ctx.shadowOffsetY=0;ctx.setLineDash([]);ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fontKerning='none';
  if(scene.backgroundColor){ctx.fillStyle=scene.backgroundColor;ctx.fillRect(0,0,width,height);}
  ctx.scale(width/scene.width,height/scene.height);for(const a of scene.nodes)node(a);
 }finally{ctx.restore();}
}
// Decorative direction cues. This never integrates projectile physics or changes region state.
function fieldMotion(ctx,r,time,u,visible){
 if(r.on===false||(r.strength??1)<=0)return;
 const t=Number.isFinite(time)?Math.max(0,time):0,dir=r.direction<0?-1:1;
 ctx.save();try{
  ctx.strokeStyle=ctx.fillStyle=r.color;ctx.lineCap=ctx.lineJoin='round';
  const flow=['F','U','V'].includes(r.kind);
  const stroke=(trace=false)=>{ctx.save();const alpha=ctx.globalAlpha,factor=trace?.65:1;ctx.strokeStyle=r.accent||'#EAF4F7';ctx.lineWidth=(flow?r.flowHaloWidth??4:r.cueHaloWidth??3.6)*u*(trace?.7:1);ctx.globalAlpha=alpha*(flow?r.flowHaloOpacity??.95:r.cueHaloOpacity??.85)*factor;ctx.stroke();ctx.strokeStyle=r.color;ctx.lineWidth=(flow?r.flowCueWidth??2.4:r.cueWidth??2)*u*(trace?.55:1);ctx.globalAlpha=alpha*(flow?r.flowCueOpacity??.95:r.cueOpacity??.85)*factor;ctx.stroke();ctx.restore();};
  const arrow=(x,y,dx,dy,length)=>{ctx.beginPath();ctx.moveTo(x-dx*length,y-dy*length);ctx.lineTo(x+dx*length,y+dy*length);ctx.moveTo(x+dx*(length-4*u)-dy*3*u,y+dy*(length-4*u)+dx*3*u);ctx.lineTo(x+dx*length,y+dy*length);ctx.lineTo(x+dx*(length-4*u)+dy*3*u,y+dy*(length-4*u)-dx*3*u);stroke();};
  if(r.kind==='M'){
   ctx.beginPath();ctx.arc(r.x,r.y,r.radius,0,Math.PI*2);ctx.clip();const weak=(r.strength??1)<1,period=weak?16:8;
   for(let i=0;i<(weak?1:2);i++){
    const rad=r.radius*(weak?.56:.38+i*.26),a=(t/period*Math.PI*2+i*2.3)*dir,b=a+dir*1.15;
    ctx.beginPath();ctx.arc(r.x,r.y,rad,a,b,dir<0);stroke();
    const x=r.x+Math.cos(b)*rad,y=r.y+Math.sin(b)*rad;arrow(x,y,-Math.sin(b)*dir,Math.cos(b)*dir,3*u);
   }return;
  }
  const bounds={x1:Math.max(r.x1,visible?.left??r.x1),x2:Math.min(r.x2,visible?.right??r.x2),y1:Math.max(r.y1,visible?.top??r.y1),y2:Math.min(r.y2,visible?.bottom??r.y2)};
  const source=r;r={...r,...bounds};const w=r.x2-r.x1,h=r.y2-r.y1;if(w<=0||h<=0)return;ctx.beginPath();ctx.rect(r.x1,r.y1,w,h);ctx.clip();
  const cols=Math.max(1,Math.min(3,Math.ceil(w/(125*u)))),rows=Math.max(1,Math.min(2,Math.ceil(h/(95*u))));
  if(r.kind==='C'){
   const thin=(r.slow??.72)>.72;
   for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
    const x=r.x1+w*(i+.5)/cols,y=r.y1+h*(j+.52)/rows+Math.sin(t*Math.PI/4+i+j)*2*u;
    const a=(thin?.8:1)*u,q=(dx,dy)=>[x+dx*a,y+dy*a];ctx.beginPath();ctx.moveTo(...q(-36,10));ctx.bezierCurveTo(...q(-55,9),...q(-48,-9),...q(-28,-8));ctx.bezierCurveTo(...q(-26,-24),...q(-5,-24),...q(3,-11));ctx.bezierCurveTo(...q(21,-17),...q(37,-11),...q(35,-1));ctx.bezierCurveTo(...q(52,0),...q(50,12),...q(29,12));ctx.closePath();ctx.save();ctx.globalAlpha*=thin?(r.thinCloudOpacity??.55):(r.cloudOpacity??.68);ctx.fill();ctx.restore();ctx.save();ctx.strokeStyle=r.accent||'#EAF4F7';ctx.lineWidth=(r.cloudEdgeWidth??1.4)*u;ctx.globalAlpha*=r.cloudEdgeOpacity??.8;ctx.stroke();ctx.restore();
   }return;
  }
  const horizontal=r.kind==='F',fullW=source.x2-source.x1,fullH=source.y2-source.y1,speed=horizontal?36*u*(r.strength??.35)/.35:(r.kind==='V'?48:30)*u,period=(horizontal?fullW:fullH)/Math.max(.01,speed),lanes=Math.max(1,Math.min(horizontal?3:2,Math.ceil((horizontal?h:w)/((horizontal?80:70)*u))));
  ctx.save();ctx.fillStyle=r.color;ctx.globalAlpha*=r.flowBandOpacity??.07;ctx.fillRect(source.x1,source.y1,fullW,fullH);ctx.restore();
  for(let i=0;i<lanes;i++){
   const phase=((t/period+i/lanes+.24)%1+1)%1;
   if(horizontal){
    const y=r.y1+h*(i+.5)/lanes,sx=dir>0?source.x1+8*u:source.x2-8*u,ex=dir>0?source.x2-8*u:source.x1+8*u;
    ctx.beginPath();ctx.moveTo(source.x1+8*u,y);ctx.bezierCurveTo(source.x1+fullW*.3,y-8*u,source.x1+fullW*.7,y+8*u,source.x2-8*u,y);stroke(true);
    ctx.beginPath();ctx.moveTo(sx+dir*8*u,y-5*u);ctx.lineTo(sx,y-5*u);ctx.moveTo(sx+dir*8*u,y+5*u);ctx.lineTo(sx,y+5*u);stroke();arrow(ex-dir*7*u,y,dir,0,5*u);
    const p=dir>0?phase:1-phase;arrow(source.x1+fullW*p,y+24*u*p*(1-p)*(2*p-1),dir,0,9*u);
   }else{
    const x=r.x1+w*(i+.5)/lanes;
    ctx.beginPath();ctx.moveTo(x,source.y2-10*u);ctx.bezierCurveTo(x-5*u,source.y2-fullH*.3,x+5*u,source.y1+fullH*.3,x,source.y1+9*u);stroke(true);
    ctx.beginPath();ctx.moveTo(x-7*u,source.y2-4*u);ctx.lineTo(x-7*u,source.y2-9*u);ctx.quadraticCurveTo(x,source.y2-15*u,x+7*u,source.y2-9*u);ctx.lineTo(x+7*u,source.y2-4*u);stroke();arrow(x,source.y1+14*u,0,-1,5*u);
    arrow(x,source.y2-fullH*phase,0,-1,9*u);
    if(r.kind==='V'){ctx.save();ctx.globalAlpha*=.7;const y=source.y2-fullH*phase;ctx.beginPath();ctx.moveTo(x-3*u,y+12*u);ctx.quadraticCurveTo(x+5*u,y+19*u,x-2*u,y+26*u);stroke();ctx.restore();}
   }
  }
  // A continuation hint points toward an off-screen real source; never move the source onto the viewport edge.
  let hint=null,hx=(r.x1+r.x2)/2,hy=r.y2-7*u;
  if(!horizontal&&source.y2>r.y2+14*u)hint=r.kind==='V'?'噴出口↓':'発生源↓';
  else if(horizontal&&(dir>0?source.x1<r.x1-14*u:source.x2>r.x2+14*u)){hint=dir>0?'発生源←':'発生源→';hy=r.y1+13*u;}
  if(hint&&r.offscreenFlowSourceHint!==false){if(w<36*u)hint=horizontal?(dir>0?'←':'→'):'↓';ctx.save();ctx.font=`600 ${Math.max(9,Math.min(11,w/u/4-1))*u}px system-ui`;ctx.textAlign='center';ctx.lineJoin='round';ctx.lineWidth=3*u;ctx.strokeStyle=r.accent||'#EAF4F7';ctx.strokeText(hint,hx,hy);ctx.fillStyle=r.color;ctx.fillText(hint,hx,hy);ctx.restore();}
 }finally{ctx.restore();}
}
const api=Object.freeze({draw,select,version:'1.0',runtimeIntegrated:false});
if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ArcComponentCollection=api;
})(globalThis);
