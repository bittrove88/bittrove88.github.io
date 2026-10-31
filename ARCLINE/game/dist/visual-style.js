(function(root){
'use strict';
const colors=Object.freeze({ink:'#142e3b',steel:'#40525b',steelLight:'#6d7d7c',rubber:'#243742',cream:'#eee4ca',reflect:'#8dddd0',fragile:'#9774af',crack:'#d4b6e5',warning:'#f2b45f',danger:'#e96a5e'});
const metrics=Object.freeze({outer:1.5,inner:.8,minBody:32,control:84});
function unit(ctx,dpr=1){const m=ctx.getTransform();return Math.max(.001,dpr)/Math.max(.001,Math.hypot(m.a,m.b));}
function brush(ctx,c,options={}){
 const u=unit(ctx,options.dpr||1),detail=options.detail||'battle',ink=colors.ink;
 const width=(n,outer=false)=>u*Math.max(.6,Math.min(outer?2:2.4,(outer?metrics.outer:metrics.inner)*n/(outer?2.2:2)));
 function poly(points,fill,stroke=ink,n=2.2){ctx.beginPath();for(let i=0;i<points.length;i+=2)i?ctx.lineTo(points[i],points[i+1]):ctx.moveTo(points[i],points[i+1]);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width(n,true);ctx.stroke();}}
 function line(points,color=ink,n=2){if(points.length<4)return;ctx.beginPath();for(let i=0;i<points.length;i+=2)i?ctx.lineTo(points[i],points[i+1]):ctx.moveTo(points[i],points[i+1]);ctx.strokeStyle=color;ctx.lineWidth=width(n);ctx.stroke();}
 function oval(x,y,rx,ry,fill,stroke=ink,n=2){ctx.beginPath();ctx.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width(n,true);ctx.stroke();}}
 function rect(x,y,w,h,r,fill,stroke=ink,n=2){ctx.beginPath();ctx.roundRect(x,y,w,h,Math.min(r,w/2,h/2));if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width(n,true);ctx.stroke();}}
 function bolt(x,y,r=1.5){if(detail==='distant')return;oval(x,y,r,r,colors.cream,ink,.75);}
 function vent(x,y,n=3,vertical=false){if(detail==='distant')return;for(let i=0;i<n;i++)line(vertical?[x+i*4,y,x+i*4,y+8]:[x,y+i*4,x+9,y+i*4],ink,1.3);}
 function wheel(x,y,r,phase,trim=c.color){oval(x,y,r,r,colors.rubber);oval(x,y,r*.69,r*.69,colors.steelLight,ink,1.5);oval(x,y,r*.44,r*.44,trim,ink,1.2);if(detail!=='distant')for(let i=0;i<5;i++){const a=i*Math.PI*2/5+phase;line([x+Math.cos(a)*r*.5,y+Math.sin(a)*r*.5,x+Math.cos(a)*r*.62,y+Math.sin(a)*r*.62],colors.rubber,1.3);}oval(x,y,r*.14,r*.14,colors.cream,ink,.8);}
 function track(x,y,w,h,phase,rollers=4){rect(x,y,w,h,h*.44,colors.rubber,ink,2.8);rect(x+3,y+3,w-6,h-6,h*.35,colors.steel,ink,1);const r=(h-10)/2;for(let i=0;i<rollers;i++)wheel(x+r+6+(w-r*2-12)*i/(rollers-1),y+h/2,r,phase,colors.steelLight);if(detail!=='distant'){const shift=((phase*5)%8+8)%8;for(let px=x+9+shift;px<x+w-7;px+=8){line([px,y+1,px-2,y+4],colors.steelLight,1.5);line([px,y+h-4,px-2,y+h-1],colors.steelLight,1.5);}}}
 function plate(points,shade=null){poly(points,c.color);if(shade)poly(shade,c.shade,null);}
 return {poly,line,oval,rect,bolt,vent,wheel,track,plate};
}
const api=Object.freeze({version:1,colors,metrics,unit,brush});
if(typeof module!=='undefined')module.exports=api;else root.ArcVisualStyle=api;
})(globalThis);
