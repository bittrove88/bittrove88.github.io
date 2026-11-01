(function(root){'use strict';
// Impact footprints retain the historical style; Ban shockwave follows its current collision cone.
const W=typeof module!=='undefined'?require('./weapons.js'):root.ArcWeapons;
const blastById=Object.freeze({S_GUN:165,S_BAN:0,S_HIBARI:145,S_HANA:90,S_RIN:45,S_MOGU:65,S_KORO:125,S_SORA:60,S_RICO:70,S_YUI:100});
const metrics=Object.freeze({trail:3,hot:5.5,shell:8,rail:10,core:1.6,railCore:3,impactStart:18,impactGrowth:76,sparkTravel:66,flashRadius:36,banWaveLength:140,banWaveHalfAngle:28});
function appearance(id){const w=W.get(id),a=w.appearance||{};return {...a,blast:blastById[id]??w.blast,weaponId:id};}
function impactBlast(plan,hit,look=appearance(plan.weaponId)){return plan.weaponId==='S_RICO'?Math.min(150,70+20*plan.events.filter(e=>e.type==='bounce'&&e.bullet===hit.bullet&&e.t<=hit.t).length):W.get(plan.weaponId).special?look.blast:hit.blast??look.blast;}
function footprint(id,age,blast){const look=appearance(id),duration=look.shape==='shell'?1:look.shape==='needle'?.65:.9,t=Math.max(0,Math.min(1,age/duration)),size=Math.max(.55,Math.min(1.65,((blast??look.blast)||64)/64));return {duration,radius:(18+76*(1-Math.pow(1-t,3)))*size,trail:id==='W14'||id==='S_RIN'?10:look.shape==='shell'?8:5.5,projectile:look.size};}
const brushes=new WeakMap();
function forContext(ctx){if(brushes.has(ctx))return brushes.get(ctx);
 const path=(points,color,width=2,dash=[])=>{if(!points.length)return;ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.setLineDash([]);};
 function circle(x,y,r,color,stroke=null){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(color){ctx.fillStyle=color;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
 function round(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
 function projectile(p,previous,look,scale,time){
  const radius=look.size/scale,angle=previous?Math.atan2(p.y-previous.y,p.x-previous.x):0;
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(angle);ctx.shadowColor=look.color;ctx.shadowBlur=0;
  const shape=look.shape;ctx.fillStyle=look.color;ctx.strokeStyle='#ffffff';ctx.lineWidth=1.6/scale;
  if(shape==='needle'||shape==='arrow'||shape==='drill'){
   ctx.beginPath();ctx.moveTo(radius*2.5,0);ctx.lineTo(-radius*1.3,-radius*.65);ctx.lineTo(-radius*.5,0);ctx.lineTo(-radius*1.3,radius*.65);ctx.closePath();ctx.fill();ctx.stroke();
   if(shape==='drill')for(let i=0;i<3;i++)path([{x:-radius+i*radius*.7,y:-radius*.7},{x:-radius*.3+i*radius*.7,y:radius*.7}],'#fff1cc',1/scale);
  }else if(shape==='diamond'||shape==='spark'){
   ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,radiusPart=i%2?radius*.45:radius*1.2;const x=Math.cos(a)*radiusPart,y=Math.sin(a)*radiusPart;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fill();ctx.stroke();
  }else if(shape==='shell'){
   round(-radius*1.2,-radius*.8,radius*2.3,radius*1.6,radius*.5,look.color);path([{x:-radius*.6,y:-radius*.75},{x:-radius*.6,y:radius*.75}],'#fff9dc',2/scale);
  }else{
   circle(0,0,radius,look.color,'#ffffff');
   if(shape==='ring'||shape==='orbit'||shape==='gear'){ctx.rotate(time*4);circle(0,0,radius*1.55,null,look.color);if(shape==='orbit')circle(radius*1.7,0,radius*.3,'#ffffff');if(shape==='gear')for(let i=0;i<6;i++){const a=i*Math.PI/3;path([{x:Math.cos(a)*radius,y:Math.sin(a)*radius},{x:Math.cos(a)*radius*1.8,y:Math.sin(a)*radius*1.8}],look.color,2/scale);}}
  }
  ctx.shadowBlur=0;circle(0,0,radius*.35,'#fffef1');ctx.restore();
 }
 function explosion(impact,age,look,scale,reducedMotion,alpha=1){
  const duration=look.shape==='shell'?1:look.shape==='needle'?.65:.9;
  if(age<0||age>duration)return;const t=Math.min(1,age/duration),size=Math.max(.55,Math.min(1.65,(look.blast||64)/64)),radius=(18+76*(1-Math.pow(1-t,3)))*size/scale;
  ctx.save();ctx.translate(impact.x,impact.y);ctx.globalAlpha=alpha*(1-t);
  // Screen-space minimums make the same hit legible on a 320px phone and a tablet.
  circle(0,0,radius*.85,look.color+'20');ctx.lineWidth=Math.max(2,5*(1-t))/scale;
  ctx.strokeStyle=look.color;ctx.beginPath();ctx.ellipse(0,0,radius*(look.label==='RAIL'?1.45:1),radius*(look.label==='RAIL'?.16:.46),0,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle='#fff6d2';ctx.lineWidth=2/scale;ctx.beginPath();ctx.arc(0,0,radius*.72,0,Math.PI*2);ctx.stroke();
  if(t<.42){circle(0,0,36/scale,look.color+'80');circle(0,0,12/scale,'#fff6d2');}

  const count=reducedMotion?4:look.shape==='shell'?18:look.shape==='needle'?8:14;
  for(let i=0;i<count;i++){const a=i*2.399,dist=(14+66*t)*(1+(i%3)*.17)/scale;const x=Math.cos(a)*dist,y=Math.sin(a)*dist-35*t*(1-t)/scale;path([{x:x-Math.cos(a)*10*(1-t)/scale,y:y-Math.sin(a)*10*(1-t)/scale},{x,y}],i%3?'#fff1b8':look.color,Math.max(1,3*(1-t))/scale);}
  ctx.restore();
 }

 function draw(plan,t,options={}){
  if(!plan)return;const scale=options.scale||1,alpha=options.alpha??1,look=appearance(plan.weaponId),rail=plan.weaponId==='W14'||plan.weaponId==='S_RIN';
  for(const b of plan.bullets){if(t<b.start)continue;const points=b.path.filter(p=>p.t<=t);if(!points.length)continue;const alive=t<=b.t,hot=alive?points.filter(p=>p.t>=t-(rail?.22:.48)):points;
   ctx.save();ctx.globalAlpha=alpha*.34;path(points,look.color,3/scale);ctx.globalAlpha=alpha;path(hot,look.color,(rail?10:look.shape==='shell'?8:5.5)/scale);path(hot,'#fffdf0',(rail?3:1.6)/scale);ctx.restore();if(alive)projectile(points.at(-1),points.at(-2),look,scale,t);
  }
  for(const e of plan.events){const age=t-e.t;if(age<0)continue;
   if(['bounce','break','teleport-contact','terminal','magnet','wind','phase','cloud','updraft','vent'].includes(e.type)&&age<.5){ctx.save();ctx.globalAlpha=alpha*(1-age/.5);circle(e.x,e.y,(10+age*38)/scale,null,e.type==='break'?'#d4b6e5':e.type==='terminal'?'#f2b45f':'#8dddd0');ctx.restore();}
   if(e.type==='wave'){ctx.save();ctx.globalAlpha=alpha;path(e.path,look.color,7/scale,[8/scale,5/scale]);ctx.restore();}
   if(e.type==='shockwave'&&age<.65){const a=age/.65,r=e.length*Math.min(1,a*2.5),half=e.halfAngle*Math.PI/180,base=e.direction<0?Math.PI:0;ctx.save();ctx.globalAlpha=alpha*(1-a);ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.arc(e.x,e.y,r,base-half,base+half);ctx.closePath();ctx.fillStyle=look.color+'30';ctx.fill();ctx.lineWidth=3/scale;ctx.strokeStyle=look.color;ctx.stroke();ctx.restore();}
   if(e.type==='pull'&&age<e.duration){const a=age/e.duration;ctx.save();ctx.globalAlpha=alpha*(1-a*.5);path([{x:e.from.x+(e.to.x-e.from.x)*a,y:e.from.y+(e.to.y-e.from.y)*a-22},{x:e.x,y:e.y}],look.color,3/scale,[5/scale,4/scale]);circle(e.x,e.y,(10+Math.sin(a*Math.PI)*10)/scale,look.color+'44',look.color);ctx.restore();}
  }
  for(const hit of plan.teleport?[]:plan.impacts||[])explosion(hit,t-hit.t,{...look,blast:impactBlast(plan,hit,look)},scale,options.reducedMotion,alpha);
 }
 const api=Object.freeze({projectile,explosion,draw});brushes.set(ctx,api);return api;
}
const api=Object.freeze({version:1,metrics,appearance,impactBlast,footprint,forContext});if(typeof module!=='undefined')module.exports=api;else root.ArcEffects=api;
})(globalThis);
