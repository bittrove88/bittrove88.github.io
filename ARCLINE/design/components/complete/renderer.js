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
  const stroke=()=>{ctx.save();const alpha=ctx.globalAlpha;ctx.strokeStyle=r.accent||'#EAF4F7';ctx.lineWidth=(r.cueHaloWidth??3.6)*u;ctx.globalAlpha=alpha*(r.cueHaloOpacity??.85);ctx.stroke();ctx.strokeStyle=r.color;ctx.lineWidth=(r.cueWidth??2)*u;ctx.globalAlpha=alpha*(r.cueOpacity??.85);ctx.stroke();ctx.restore();};
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
  const horizontal=r.kind==='F',speed=horizontal?36*u*(r.strength??.35)/.35:(r.kind==='V'?48:30)*u,period=(horizontal?w:h)/Math.max(.01,speed);
  if(horizontal){const sx=dir>0?source.x1+6*u:source.x2-6*u;for(let j=0;j<rows;j++){const y=r.y1+h*(j+.5)/rows;ctx.beginPath();ctx.moveTo(sx,y+3*u);ctx.quadraticCurveTo(sx+dir*5*u,y-3*u,sx+dir*13*u,y);stroke();}}
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
   const phase=((t/period+(horizontal?i/cols:j/rows))%1+1)%1;
   const x=horizontal?r.x1+(dir>0?phase:1-phase)*w:r.x1+w*(i+.5)/cols;
   const y=horizontal?r.y1+h*(j+.5)/rows:r.y2-phase*h;
   arrow(x,y,horizontal?dir:0,horizontal?0:-1,12*u);
   if(r.kind==='V'){ctx.save();ctx.globalAlpha*=.65;ctx.beginPath();ctx.moveTo(x-3*u,y+14*u);ctx.quadraticCurveTo(x+5*u,y+20*u,x-2*u,y+29*u);stroke();ctx.restore();}
  }
 }finally{ctx.restore();}
}
const api=Object.freeze({draw,select,version:'1.0',runtimeIntegrated:false});
if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ArcComponentCollection=api;
})(globalThis);
