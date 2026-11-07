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
 const initial=ctx.getTransform(),pixelScale=Math.hypot(initial.a,initial.b)||1;
 function node(a){
  if(a.role==='background'&&options.hideBackground||a.role==='collisionOverlay'&&!options.collision)return;
  ctx.save();try{
   if(a.type==='group'){
    if(a.transform)ctx.transform(...a.transform);
    if(a.clip)ctx.clip(new Path2D(a.clip));
    if(a.role==='foreground'&&options.chargeZoom){const [x,y]=a.pivot;ctx.translate(x,y);ctx.scale(.9,.9);ctx.translate(-x,-y);}
    for(const child of a.children)node(child);return;
   }
   if(a.type==='text'){ctx.fillStyle=a.fill;ctx.font=`${a.weight} ${a.size}px "Noto Sans CJK JP",Arial,sans-serif`;ctx.fillText(a.text,a.x,a.y);return;}
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
const api=Object.freeze({draw,select,version:'1.0',runtimeIntegrated:false});
if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ArcComponentCollection=api;
})(globalThis);
