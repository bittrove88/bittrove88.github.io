/** Background design-data renderer. Not integrated with game. */
(function(root){
'use strict';
function paint(ctx,scene,width,height){
 const vw=scene.coordinateSpace.width,vh=scene.coordinateSpace.height;
 if(!(width>0&&height>0))return;
 ctx.save();
 try {
  for(const layer of scene.layers){
   for(const object of layer.objects){
    ctx.save();
    try {
     ctx.fillStyle=scene.palette[object.fill];
     if(object.type==='circle'){
      ctx.beginPath();
      ctx.arc(object.cx*width/vw,object.cy*height/vh,object.r*Math.min(width/vw,height/vh),0,Math.PI*2);
      ctx.fill();
     }else if(object.type==='rect'){
      ctx.fillRect(object.x*width/vw,object.y*height/vh,object.w*width/vw,object.h*height/vh);
     }else if(object.type==='path'){
      ctx.scale(width/vw,height/vh);
      ctx.fill(new Path2D(object.d));
     }else throw new Error('Unsupported primitive '+object.type);
    }finally{ctx.restore();}
   }
  }
 }finally{ctx.restore();}
}
root.ArcBackgroundDataPreview={paint};
if(typeof module!=="undefined"&&module.exports)module.exports={paint};
})(globalThis);
