(function(root){
'use strict';
const E=root.ArcEngine,G=E.geometry;
function create(canvas){
 const ctx=canvas.getContext('2d');let view={scale:1,x:0,y:0};
 const path=(points,color,width=2,dash=[])=>{if(!points.length)return;ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.setLineDash([]);};
 function circle(x,y,r,color,stroke=null){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(color){ctx.fillStyle=color;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
 function round(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
 function rover(s,side,angle,cosmetic=null,alpha=1){
  const u=s.units[side],dir=s.units[1-side].x>=u.x?1:-1;
  const hue=cosmetic?parseInt(cosmetic.slice(1))*29%360:155;
  const bright=side?'#ffd1ac':cosmetic?`hsl(${hue} 60% 78%)`:'#caffd7',dark=side?'#a16963':'#3d8991';
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(u.x,u.y);ctx.rotate(u.slope||0);
  circle(0,1,29,'#11384855');
  if(side&&s.spec.boss){
   const n=s.stage/10;
   // Ten distinct chassis silhouettes, all share the same combat coordinates.
   if(n===1){for(const off of [-62,-32,32,62])path([{x:off*.65,y:-22},{x:off,y:-12},{x:off+Math.sign(off)*8,y:2}],dark,10);ctx.fillStyle=bright;ctx.beginPath();ctx.ellipse(0,-35,59,32,0,Math.PI,Math.PI*2);ctx.fill();}
   if(n===2){round(-59,-72,118,70,6,dark);round(-48,-65,96,55,3,bright);round(-20,-44,40,38,2,dark);}
   if(n===3){ctx.fillStyle=bright;ctx.beginPath();ctx.moveTo(-90,-48);ctx.lineTo(0,-68);ctx.lineTo(90,-48);ctx.lineTo(35,-15);ctx.lineTo(-35,-15);ctx.fill();}
   if(n===4){ctx.fillStyle=bright;ctx.beginPath();ctx.moveTo(-55,-18);ctx.lineTo(-66,-68);ctx.lineTo(-20,-52);ctx.lineTo(0,-88);ctx.lineTo(20,-52);ctx.lineTo(66,-68);ctx.lineTo(55,-18);ctx.fill();}
   if(n===5){round(-52,-55,112,40,9,bright);ctx.fillStyle=dark;ctx.beginPath();ctx.moveTo(-90,-25);ctx.lineTo(-45,-52);ctx.lineTo(-45,-8);ctx.fill();}
   if(n===6){round(-65,-56,130,45,8,bright);for(const x of [-42,42]){circle(x,-52,23,dark);for(let k=0;k<3;k++){const a=k*2.094;path([{x,y:-52},{x:x+Math.cos(a)*16,y:-52+Math.sin(a)*16}],bright,5);}}}
   if(n===7){round(-35,-66,70,60,6,bright);round(-70,-38,34,30,5,dark);round(36,-38,34,30,5,dark);round(-20,-85,40,18,2,dark);}
   if(n===8){circle(0,-42,48,dark);circle(0,-42,35,bright);for(const x of [-55,55])round(x-10,-73,20,48,3,bright);}
   if(n===9){ctx.fillStyle=bright;ctx.beginPath();ctx.moveTo(-80,-60);ctx.lineTo(85,-60);ctx.lineTo(56,-22);ctx.lineTo(-56,-22);ctx.fill();round(10,-86,35,28,4,dark);for(const x of [-48,48]){circle(x,-17,13,dark);path([{x,y:-7},{x,y:10}], '#ffc5a5',6);}}
   if(n===10){ctx.fillStyle=bright;ctx.beginPath();ctx.moveTo(-61,-12);ctx.lineTo(-65,-68);ctx.lineTo(-20,-85);ctx.lineTo(0,-62);ctx.lineTo(20,-85);ctx.lineTo(65,-68);ctx.lineTo(61,-12);ctx.fill();circle(0,-44,26,'#775874');}
   u.parts.forEach(p=>{if(p.hp<=0)return;circle(p.dx,p.dy,p.radius,'#a47570','#ffd6b3');ctx.fillStyle='#fff4c8';ctx.fillRect(p.dx-p.radius,p.dy-p.radius-9,p.radius*2*(p.hp/p.maxHp),4);ctx.font='8px system-ui';ctx.textAlign='center';ctx.fillText(p.name,p.dx,p.dy-p.radius-15);});
   const radius=u.exposed>0||s.bossPhase===2?33:s.effects.broken?28:22;
   circle((u.facingCore||0)*20,-77,radius,'#d5ffd6','#ffffff');circle((u.facingCore||0)*20,-77,radius*.55,'#f8fff0');
   if(s.bossPhase>0){ctx.font='13px system-ui';ctx.textAlign='center';ctx.fillStyle='#fff3d2';ctx.fillText(['I','II','III'][s.bossPhase],0,-110);}
  }else{
   round(-32,-16,64,18,8,'#153e51');for(const x of [-21,0,21]){circle(x,-6,8,'#14384b');circle(x,-6,3,dark);}
   ctx.fillStyle=dark;ctx.beginPath();ctx.moveTo(-34,-18);ctx.lineTo(-20,-33);ctx.lineTo(20,-33);ctx.lineTo(34,-18);ctx.closePath();ctx.fill();round(-15,-45,30,24,6,bright);round(dir===1?1:-14,-40,13,6,2,'#356478');
   const a=(dir===1?-angle:180+angle)*Math.PI/180;
   path([{x:0,y:-26},{x:Math.cos(a)*35,y:-26+Math.sin(a)*35}],dark,10);path([{x:0,y:-26},{x:Math.cos(a)*35,y:-26+Math.sin(a)*35}],bright,6);
   if(cosmetic?.[0]==='B'){path([{x:-24,y:-27},{x:-24,y:-58}],bright,2);ctx.fillStyle=bright;ctx.beginPath();ctx.moveTo(-24,-58);ctx.lineTo(-6,-52);ctx.lineTo(-24,-45);ctx.fill();}
  }
  ctx.restore();
 }
 function draw(s,options={}){
  const r=canvas.getBoundingClientRect(),w=r.width,h=r.height;if(!w||!h)return;
  let world=s.world,display=s;const transition=options.transition;
  const localDemo=options.demo,variant=localDemo?.variants?.[Math.min(localDemo.variants.length-1,Math.floor(localDemo.age/(localDemo.duration/localDemo.variants.length)))];if(variant?.world)world=variant.world;
  if(transition){const t=Math.min(1,transition.age/transition.duration),ease=t*t*(3-2*t);world={...s.world,solids:s.world.solids.map(o=>{const old=transition.world.solids.find(a=>a.id===o.id&&a.poly.length===o.poly.length);return old?{...o,poly:o.poly.map((p,i)=>({x:old.poly[i].x+(p.x-old.poly[i].x)*ease,y:old.poly[i].y+(p.y-old.poly[i].y)*ease}))}:o;})};display={...s,units:s.units.map((u,i)=>({...u,x:transition.units[i].x+(u.x-transition.units[i].x)*ease,y:transition.units[i].y+(u.y-transition.units[i].y)*ease,slope:transition.units[i].slope+(u.slope-transition.units[i].slope)*ease}))};}
  const dpr=Math.min(window.devicePixelRatio||1,2);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0);const biome=E.biomes[s.spec.theme],time=options.time||0;
  const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,biome.sky[0]);sky.addColorStop(.67,biome.sky[1]);sky.addColorStop(1,biome.land);ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
  circle(w*.76,h*.21,Math.min(w,h)*.065,'#fff1c686');
  for(let layer=0;layer<4;layer++){
   ctx.fillStyle=[biome.land+'40',biome.land+'70',biome.land+'90',biome.sky[0]+'65'][layer];ctx.beginPath();ctx.moveTo(0,h);
   for(let x=0;x<=w+12;x+=12){const y=h*(.38+layer*.085)+Math.sin(x/w*8+layer*1.7)*h*.045+Math.cos(x/w*17+layer)*h*.015;ctx.lineTo(x,y);}ctx.lineTo(w,h);ctx.fill();
  }
  const lobby=options.lobby,wide=w/h>1.5,fieldW=lobby&&w>900?w*.56:w;
  const maxScale=fieldW/1080,top=lobby?(wide?110:h*.28):(wide?115:190),bottom=lobby?(wide?h-60:h*.62):(wide?h-55:h-212);
  let minY=Math.min(...s.units.map(u=>u.y-125),160),maxY=500;
  const shot=options.shot,flight=options.flight||0;
  if(shot)for(const b of shot.bullets)for(const p of b.path)minY=Math.min(minY,p.y-25);
  // Fit the entire current shot. Aim never reveals the complete landing prediction.
  const scale=Math.min(maxScale,Math.max(.1,(bottom-top)/(maxY-minY+30)));
  view={scale,x:fieldW*.5-500*scale,y:bottom-maxY*scale};
  const shake=options.impact&&!options.reducedMotion?Math.max(0,1-options.impact.age*4)*3:0;
  ctx.save();ctx.translate(view.x+Math.sin(time*80)*shake,view.y);ctx.scale(scale,scale);
  // Walkable and overhead polygons share the actual collision geometry.
  for(const o of world.solids){
   ctx.beginPath();o.poly.forEach((p,i)=>{const y=o.kind==='floor'&&i>=o.poly.length-2?Math.max(p.y,(h-view.y)/scale+50):p.y;i?ctx.lineTo(p.x,y):ctx.moveTo(p.x,y);});ctx.closePath();ctx.fillStyle=o.kind==='crystal'?'#bbf8e680':o.kind==='bridge'?'#b2ac8b':o.kind==='roof'?'#557e89':biome.land;ctx.fill();
   path(o.kind==='floor'?o.poly.slice(0,-2):[...o.poly,o.poly[0]],o.kind==='crystal'?'#e5fff4':biome.edge,o.kind==='crystal'?5:3);
   if(o.kind==='crystal'){
    const a=o.poly[0],b=o.poly[1];path([{x:a.x+5,y:a.y+8},{x:b.x-5,y:b.y+8}],'#153e5b',2,[7,7]);
   }
   if(o.kind==='bridge'){
    circle(o.hinge.x,o.hinge.y,7,'#d9e8aa','#3b5762');
    const pad=G.surfaceAt(world,o.hinge.x-36,o.hinge.y);if(pad){circle(pad.x,pad.y-18,20,'#e7ffc012','#e7ffc04d');}
    const b=o.poly[1],len=Math.hypot(b.x-o.hinge.x,b.y-o.hinge.y),nextOpen=!o.open,aa=nextOpen?-75*Math.PI/180:0;
    path([o.hinge,{x:o.hinge.x+Math.cos(aa)*len,y:o.hinge.y+Math.sin(aa)*len}],'#e7ffc044',2,[8,8]);
   }
   if(o.kind==='roof'&&[35,65].includes(s.stage))for(const x of [o.poly[0].x+10,o.poly[1].x-10])path([{x,y:o.poly[0].y+15},{x,y:520}],biome.edge+'75',5);
  }
  for(const water of world.waters){ctx.fillStyle='#69d4dd47';ctx.fillRect(water.x1,water.y,water.x2-water.x1,530-water.y);path([{x:water.x1,y:water.y},{x:water.x2,y:water.y}],'#bdf9ea',2);for(let x=water.x1+8;x<water.x2;x+=35)path([{x,y:water.y+6},{x:x+16,y:water.y+6}],'#d3ffed70',1);}
  for(const r of world.regions){
   if(r.kind==='M'){
    circle(r.x,r.y,r.radius,'#b1a4ff16','#d9bdff88');
    for(let i=0;i<3;i++){ctx.strokeStyle='#d6c2ff77';ctx.lineWidth=2;ctx.beginPath();ctx.arc(r.x,r.y,r.radius*(.4+i*.23),time*.2*r.direction+i,time*.2*r.direction+i+3.8);ctx.stroke();}
    ctx.font='12px system-ui';ctx.fillStyle='#ead9ff';ctx.textAlign='center';ctx.fillText(r.direction>0?'↻':'↺',r.x,r.y);continue;
   }
   ctx.fillStyle=r.kind==='C'?'#e4ecff2b':r.kind==='F'?'#b0e1ed17':'#f8d89915';ctx.fillRect(r.x1,r.y1,r.x2-r.x1,r.y2-r.y1);ctx.strokeStyle=r.kind==='C'?'#f5f4ffb0':'#d8f0c17a';ctx.lineWidth=2;ctx.setLineDash(r.kind==='C'?[6,8]:[2,9]);ctx.strokeRect(r.x1,r.y1,r.x2-r.x1,r.y2-r.y1);ctx.setLineDash([]);
   if(r.kind==='C'){for(let x=r.x1+20;x<r.x2;x+=33)circle(x,(r.y1+r.y2)/2,18,'#f5f4ff22');}
   else if(r.kind==='F'){for(let y=r.y1+20;y<r.y2;y+=45)path([{x:r.x1+10,y},{x:r.x2-10,y}], '#cff1e670',2);ctx.font='25px system-ui';ctx.fillStyle='#e6f4db';ctx.textAlign='center';ctx.fillText(r.direction===1?'→':'←',(r.x1+r.x2)/2,(r.y1+r.y2)/2);}
   else {for(let x=r.x1+14;x<r.x2;x+=25){const y=r.y2-((time*35+x)%Math.max(30,r.y2-r.y1));path([{x,y:y+17},{x,y},{x:x-5,y:y+6}],r.on?'#f7edbda0':'#d8c69b44',2);}if(r.kind==='V')circle((r.x1+r.x2)/2,r.y2,9,r.on?'#ffd0a4':'#6c6872','#f4d0a2');}
  }
  for(const t of world.terminals){circle(t.x,t.y,20,'#183d56','#e5c3ff');ctx.fillStyle='#e9ceff';ctx.font='22px system-ui';ctx.textAlign='center';ctx.fillText('↻',t.x,t.y+7);if(s.effects.pendingPolarity)path([{x:t.x,y:t.y},{x:t.x+35,y:t.y-35}],'#f6c9ff',3,[4,4]);}
  if(!lobby&&s.telegraph){
   const t=s.telegraph,y=G.surfaceAt(s.world,t.targetX,s.units[0].y)?.y||s.units[0].y;
   path([{x:t.targetX-t.radius,y:y+5},{x:t.targetX+t.radius,y:y+5}],'#ffc09c',5,[7,6]);
   for(let x=t.targetX-t.radius;x<t.targetX+t.radius;x+=15)path([{x,y:y+14},{x:x+9,y:y+4}],'#ffccac',2);
   ctx.font='11px system-ui';ctx.textAlign='center';ctx.fillStyle='#ffe2c2';ctx.fillText(t.kind,t.targetX,y+33);
  }
  for(const item of s.pickups){if(item.collected)continue;const y=item.y+Math.sin(time*Math.PI+item.x)*4;
   ctx.save();ctx.translate(item.x,y);ctx.rotate(Math.PI/4);ctx.fillStyle=item.id[0]==='W'?'#f5edb8':item.id[0]==='R'?'#a9e7f3':'#dfc3f4';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=12;ctx.fillRect(-12,-12,24,24);ctx.shadowBlur=0;ctx.strokeStyle='#fff9db';ctx.lineWidth=2;ctx.strokeRect(-17,-17,34,34);ctx.restore();ctx.fillStyle='#174354';ctx.textAlign='center';ctx.font='bold 11px system-ui';ctx.fillText(item.id[0],item.x,y+4);
  }
  if(s.selectedSkill==='BLINK')s.blink.forEach((b,i)=>{circle(b.x,b.y-22,35,'#c9ffe42b','#efffd6');ctx.font='16px system-ui';ctx.fillStyle='#efffd6';ctx.fillText(String(i+1),b.x,b.y-54);});
  if(options.canAim){
   const m=G.muzzle(s,0,s.angle),short=[{x:m.x,y:m.y},{x:m.x+m.dx*90,y:m.y+m.dy*90}],collision=G.sweep(s.world,short[0],short[1]);if(collision)short[1]=collision;
   path(short,'#f1ffcbcc',Math.max(2,1/scale),[6,8]);
   if(collision?.solid.kind==='crystal'||s.selectedSkill==='BOUNCE'&&collision){const dot=m.dx*collision.nx+m.dy*collision.ny;path([collision,{x:collision.x+(m.dx-2*dot*collision.nx)*55,y:collision.y+(m.dy-2*dot*collision.ny)*55}],'#eeffab',3,[5,5]);}
  }
  display={...display,units:display.units.map(u=>{if(!u.animation)return u;const a=u.animation,t=Math.min(1,a.age/a.duration),ease=t*t*(3-2*t);return {...u,x:a.from.x+(u.x-a.from.x)*ease,y:a.from.y+(u.y-a.from.y)*ease-Math.sin(t*Math.PI)*a.lift};})};
  rover(display,0,s.angle,options.cosmetic);rover(display,1,52);
  function shotAt(plan,t,alpha=1){
   for(const b of plan.bullets){if(t<b.start)continue;let i=b.path.findIndex(p=>p.t>t);if(i<0)i=b.path.length;
    const points=b.path.slice(0,i),alive=t<=b.t;ctx.globalAlpha=alpha;path(points,'#fff0c5',Math.max(4,2.3/scale));
    if(alive&&points.length){const p=points.at(-1);circle(p.x,p.y,Math.max(7,3/scale),'#fff8d3');const bounceCount=(b.initialBounces||0)+plan.events.filter(e=>e.bullet===b.id&&['bounce','skip'].includes(e.type)&&e.t<=t).length;if(bounceCount<3)circle(p.x,p.y,Math.max(10,4/scale),null,'#fff8b4');}
   }
   for(const e of plan.events)if(['cloud','updraft','wind','vent','magnet','phase','bounce','skip'].includes(e.type)&&t>=e.t&&t-e.t<.5){const colors={cloud:'#c6e4ff',updraft:'#f4e6b2',wind:'#b4e7e6',vent:'#ffd0a6',magnet:'#d7baff',phase:'#d0fff2',bounce:'#ffffff',skip:'#c4fff0'};ctx.globalAlpha=alpha*(1-(t-e.t)/.5);circle(e.x,e.y,10+(t-e.t)*35,null,colors[e.type]);}
   for(const e of plan.events)if(e.type==='wave'&&t>=e.t){ctx.globalAlpha=alpha;path(e.path,'#ffe3a0',5,[6,4]);}
   ctx.globalAlpha=1;
  }
  if(shot)shotAt(shot,flight,1);
  if(options.tail){const a=options.tail.age<.8?1:Math.max(0,1-(options.tail.age-.8)/.6);shotAt(options.tail.shot,Infinity,a);}
  if(options.demo){
   const source=options.demo,parts=source.variants?.length||1,period=(source.duration||1.3)/parts,d=variant?{...source,...variant}:source,t=(source.age%period)/period;
   ctx.globalAlpha=.6;const u=s.units[0];
   if(d.id==='slope'){const x=u.x+Math.sin(t*Math.PI)*100,p=G.surfaceAt(s.world,x,u.y);if(p){path([{x:u.x,y:u.y-55},{x,y:p.y-55}],'#ffffff',3,[4,4]);circle(x,p.y-25,24,'#ffffff44','#ffffff');}}
   else if(d.id==='BLINK'){for(const b of s.blink)circle(b.x,b.y-25,28,'#ffffff40','#ffffff');path([{x:u.x,y:u.y-30},{x:s.blink[0]?.x||u.x+100,y:(s.blink[0]?.y||u.y)-30}],'#fff',3,[5,6]);}
   else if(d.id==='SWAP'||d.id==='boss-swap'){const e=s.units[1];if(d.id==='boss-swap'){circle(e.x,e.y-77,42,'#ffffff44','#fff');ctx.font='30px system-ui';ctx.fillStyle='#fff';ctx.fillText('↻',e.x,e.y-75);}else{path([{x:u.x,y:u.y-60},{x:e.x,y:e.y-60}],'#fff',4,[6,10]);circle(u.x+(e.x-u.x)*t,u.y+(e.y-u.y)*t-25,25,'#ffffff44','#fff');circle(e.x+(u.x-e.x)*t,e.y+(u.y-e.y)*t-25,25,'#ffffff44','#fff');}}
   else if(['PUSH','PULL'].includes(d.id)){const e=s.units[1],dir=d.id==='PUSH'?1:-1;path([{x:e.x,y:e.y-20},{x:e.x+dir*t*72,y:e.y-20}],'#fff',4);circle(e.x+dir*t*72,e.y-20,25,'#ffffff40','#fff');}
   else if(d.plan&&!(d.id==='controls'&&d.age<.55)){const progress=d.id==='controls'?Math.max(0,(d.age-.55)/(d.duration-.55)):t;shotAt(d.plan,Math.min(d.plan.duration,progress*d.plan.duration),.55);}
   ctx.globalAlpha=1;
  }
  if(options.impact){const i=options.impact;ctx.globalAlpha=Math.max(0,1-i.age);circle(i.x,i.y,15+i.age*90,null,'#fff0c2');ctx.globalAlpha=1;}
  ctx.restore();
  const fire=document.getElementById('fire').getBoundingClientRect();
  if(options.demo?.id==='controls'&&options.demo.age<.6){circle(fire.x+fire.width*.55,fire.y+fire.height*.6,11,'#ffffff88','#ffffff');circle(fire.x+fire.width*.55,fire.y+fire.height*.6,18,null,'#ffffff66');}
  for(const effect of options.pickupEffects||[]){const t=Math.min(1,effect.age/.8),ease=t*t*(3-2*t),target=document.getElementById(effect.id[0]==='W'?'weaponToggle':'pause').getBoundingClientRect(),x=view.x+effect.x*view.scale,y=view.y+effect.y*view.scale;ctx.globalAlpha=1-t;circle(x+(target.x+target.width/2-x)*ease,y+(target.y+target.height/2-y)*ease-Math.sin(t*Math.PI)*30,9,'#f2ffb4','#ffffff');ctx.globalAlpha=1;}
 }
 function toWorld(x,y){const r=canvas.getBoundingClientRect();return {x:(x-r.left-view.x)/view.scale,y:(y-r.top-view.y)/view.scale};}
 return {draw,toWorld,get view(){return view;}};
}
root.ArcRender={create};
})(globalThis);
