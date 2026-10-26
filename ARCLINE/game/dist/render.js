(function(root){
'use strict';
const E=root.ArcEngine,G=E.geometry;
function create(canvas){
 const ctx=canvas.getContext('2d');let view={scale:1,x:0,y:0},cameraKey='',aimCache=null;
 const path=(points,color,width=2,dash=[])=>{if(!points.length)return;ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.setLineDash([]);};
 function circle(x,y,r,color,stroke=null){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(color){ctx.fillStyle=color;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
 function round(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
 function appearance(id){return ArcWeapons.get(id||'W01').appearance||{color:'#fff0a9',shape:'orb',size:6};}
 function projectile(p,previous,look,scale,time){
  const radius=look.size/scale,angle=previous?Math.atan2(p.y-previous.y,p.x-previous.x):0;
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(angle);ctx.shadowColor=look.color;ctx.shadowBlur=16;
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
  if(age<0||age>duration)return;const t=Math.min(1,age/duration),size=look.shape==='shell'?1.15:look.shape==='needle'?.75:1,radius=(18+76*(1-Math.pow(1-t,3)))*size/scale;
  ctx.save();ctx.translate(impact.x,impact.y);ctx.globalAlpha=alpha*(1-t);
  // Screen-space minimums make the same hit legible on a 320px phone and a tablet.
  circle(0,0,radius*.85,look.color+'20');ctx.lineWidth=Math.max(2,5*(1-t))/scale;
  ctx.strokeStyle=look.color;ctx.beginPath();ctx.ellipse(0,0,radius*(look.label==='RAIL'?1.45:1),radius*(look.label==='RAIL'?.16:.46),0,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle='#fff6d2';ctx.lineWidth=2/scale;ctx.beginPath();ctx.arc(0,0,radius*.72,0,Math.PI*2);ctx.stroke();
  if(t<.42){const glow=ctx.createRadialGradient(0,0,0,0,0,36/scale);glow.addColorStop(0,'#ffffff');glow.addColorStop(.3,look.color);glow.addColorStop(1,look.color+'00');circle(0,0,36/scale,glow);}
  const count=reducedMotion?4:look.shape==='shell'?18:look.shape==='needle'?8:14;
  for(let i=0;i<count;i++){const a=i*2.399,dist=(14+66*t)*(1+(i%3)*.17)/scale;const x=Math.cos(a)*dist,y=Math.sin(a)*dist-35*t*(1-t)/scale;path([{x:x-Math.cos(a)*10*(1-t)/scale,y:y-Math.sin(a)*10*(1-t)/scale},{x,y}],i%3?'#fff1b8':look.color,Math.max(1,3*(1-t))/scale);}
  ctx.restore();
 }
 function aimPlan(s){
  const key=[s.stage,s.round,s.bossPhase,s.mode,s.selectedSkill,s.angle.toFixed(2),s.power.toFixed(1),...s.units.flatMap(u=>[u.x.toFixed(1),u.y.toFixed(1),u.slope.toFixed(3),u.exposed])].join(':');
  if(!aimCache||aimCache.key!==key||aimCache.world!==s.world){aimCache={key,world:s.world,plan:E.trajectory(s,0,s.angle,s.power)};}
  return aimCache.plan;
 }
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
   u.parts.forEach(p=>{if(p.hp<=0)return;circle(p.dx,p.dy,p.radius,'#a47570','#ffd6b3');ctx.fillStyle='#fff4c8';ctx.fillRect(p.dx-p.radius,p.dy-p.radius-9,p.radius*2*(p.hp/p.maxHp),4);});
   const radius=u.exposed>0||s.bossPhase===2?33:s.effects.broken?28:22;
   circle((u.facingCore||0)*20,-77,radius,'#d5ffd6','#ffffff');circle((u.facingCore||0)*20,-77,radius*.55,'#f8fff0');
   if(s.bossPhase>0){ctx.font=`700 ${12/view.scale}px system-ui`;ctx.textAlign='center';ctx.fillStyle='#fff3d2';ctx.fillText(['I','II','III'][s.bossPhase],0,-110);}
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
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.lineCap='round';ctx.lineJoin='round';const biome=E.biomes[s.spec.theme],time=options.time||0;
  const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,biome.sky[0]);sky.addColorStop(.67,biome.sky[1]);sky.addColorStop(1,biome.land);ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
  circle(w*.76,h*.21,Math.min(w,h)*.065,'#fff1c686');
  for(let layer=0;layer<4;layer++){
   ctx.fillStyle=[biome.land+'40',biome.land+'70',biome.land+'90',biome.sky[0]+'65'][layer];ctx.beginPath();ctx.moveTo(0,h);
   for(let x=0;x<=w+12;x+=12){const y=h*(.38+layer*.085)+Math.sin(x/w*8+layer*1.7)*h*.045+Math.cos(x/w*17+layer)*h*.015;ctx.lineTo(x,y);}ctx.lineTo(w,h);ctx.fill();
  }
  const lobby=options.lobby,wide=w/h>1.5,fieldW=lobby&&w>900?w*.56:w;
  const controls=document.getElementById('battleControls')?.getBoundingClientRect(),header=document.querySelector('.battle-top')?.getBoundingClientRect();
  const top=lobby?(wide?100:h*.23):Math.max(80,(header?.bottom||64)+20);
  const bottom=lobby?(wide?h-55:h*.63):Math.max(top+100,(controls?.top||h-210)-12);
  const landmarks=[...s.units.map(u=>({x:u.x,y:u.y-50})),...s.pickups.filter(p=>!p.collected)];
  for(const o of world.solids)if(o.kind!=='floor')landmarks.push(...o.poly);
  for(const r of world.regions)if(r.kind==='M')landmarks.push({x:r.x-r.radius,y:r.y-r.radius},{x:r.x+r.radius,y:r.y+r.radius});else landmarks.push({x:r.x1,y:r.y1},{x:r.x2,y:r.y2});
  let minX=Math.max(-25,Math.min(...landmarks.map(p=>p.x))-85),maxX=Math.min(1025,Math.max(...landmarks.map(p=>p.x))+85);
  const guide=options.canAim?aimPlan(s):null,guidePoints=options.charging&&guide?guide.bullets.flatMap(b=>b.path):[];
  if(guidePoints.length){minX=Math.min(minX,Math.min(...guidePoints.map(p=>p.x))-24);maxX=Math.max(maxX,Math.max(...guidePoints.map(p=>p.x))+24);}
  const floorPoints=world.surfaces.filter(f=>f.id.startsWith('floor')).flatMap(f=>f.points).filter(p=>p.x>=minX&&p.x<=maxX);
  let minY=Math.min(...landmarks.map(p=>p.y),...s.units.map(u=>u.y-100))-28,maxY=Math.max(...s.units.map(u=>u.y+24),...floorPoints.map(p=>p.y+16));
  const shot=options.shot,flight=options.flight||0;
  if(guidePoints.length){minY=Math.min(minY,...guidePoints.map(p=>p.y-40));maxY=Math.max(maxY,...guidePoints.map(p=>p.y+24));}
  if(shot)for(const b of shot.bullets)for(const p of b.path)if(p.t<=flight+.4)minY=Math.min(minY,p.y-28);
  const scaleTarget=Math.min(fieldW/(maxX-minX),(bottom-top)/Math.max(130,maxY-minY));
  const focusY=top+(bottom-top)*(lobby?.55:.6),offsetY=Math.max(top-minY*scaleTarget,Math.min(bottom-maxY*scaleTarget,focusY-(minY+maxY)*.5*scaleTarget));
  const target={scale:scaleTarget,x:fieldW*.5-(minX+maxX)*.5*scaleTarget,y:offsetY};
  const nextKey=[s.stage,lobby,w,h].join(':');
  if(cameraKey!==nextKey||options.reducedMotion)view=target;
  else{const k=shot?.18:.25;view={scale:view.scale+(target.scale-view.scale)*k,x:view.x+(target.x-view.x)*k,y:view.y+(target.y-view.y)*k};}
  // A new high-power preview may need more room immediately; ease back in afterwards.
  // Clamp during charging so the path never slips under the HUD while the camera catches up.
  if(options.charging&&guidePoints.length){view.scale=Math.min(view.scale,scaleTarget);view.x=Math.max(-minX*view.scale,Math.min(fieldW-maxX*view.scale,view.x));view.y=Math.max(top-minY*view.scale,Math.min(bottom-maxY*view.scale,view.y));}
  cameraKey=nextKey;const scale=view.scale;
  const shake=options.impact&&!options.reducedMotion?Math.max(0,1-options.impact.age*5)*5:0;
  ctx.save();ctx.translate(view.x+Math.sin(time*80)*shake,view.y);ctx.scale(scale,scale);
  // Walkable and overhead polygons share the actual collision geometry.
  for(const o of world.solids){
   ctx.beginPath();o.poly.forEach((p,i)=>{const y=o.kind==='floor'&&i>=o.poly.length-2?Math.max(p.y,(h-view.y)/scale+50):p.y;i?ctx.lineTo(p.x,y):ctx.moveTo(p.x,y);});ctx.closePath();ctx.fillStyle=o.kind==='crystal'?'#bbf8e680':o.kind==='bridge'?'#b2ac8b':o.kind==='roof'?'#557e89':biome.land;
   if(o.kind==='floor'){const surface=o.poly.slice(0,-2),topY=Math.min(...surface.map(p=>p.y)),ground=ctx.createLinearGradient(0,topY,0,topY+300/scale);ground.addColorStop(0,biome.land);ground.addColorStop(.22,biome.sky[0]+'d9');ground.addColorStop(1,biome.sky[0]);ctx.fillStyle=ground;}
   ctx.fill();
   if(o.kind==='floor'){const surface=o.poly.slice(0,-2);for(const depth of [15,42,88,148,220,300,410]){const points=surface.map((p,i)=>({x:p.x,y:p.y+depth+Math.sin(i*1.7+depth*.05)*6}));path(points,depth<40?'#d8f0d517':'#c1e3df0a',depth<40?2:1.5);}}
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
   ctx.font=`700 ${14/scale}px system-ui`;ctx.textAlign='center';ctx.fillStyle='#ffe2c2';ctx.fillText('!',t.targetX,y+20/scale);
  }
  for(const item of s.pickups){if(item.collected)continue;const y=item.y+Math.sin(time*Math.PI+item.x)*4;
   ctx.save();ctx.translate(item.x,y);ctx.rotate(Math.PI/4);ctx.fillStyle=item.id[0]==='W'?'#f5edb8':item.id[0]==='R'?'#a9e7f3':'#dfc3f4';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=12;ctx.fillRect(-12,-12,24,24);ctx.shadowBlur=0;ctx.strokeStyle='#fff9db';ctx.lineWidth=2;ctx.strokeRect(-17,-17,34,34);ctx.restore();ctx.fillStyle='#174354';ctx.textAlign='center';ctx.font='bold 11px system-ui';ctx.fillText(item.id[0],item.x,y+4);
  }
  if(s.selectedSkill==='BLINK')s.blink.forEach((b,i)=>{circle(b.x,b.y-22,35,'#c9ffe42b','#efffd6');ctx.font='16px system-ui';ctx.fillStyle='#efffd6';ctx.fillText(String(i+1),b.x,b.y-54);});
  if(options.canAim){
   const plan=guide||aimPlan(s),look=appearance(s.mode),full=!!options.charging;
   for(const b of plan.bullets){const points=b.path.filter(p=>full||p.t<=.85);if(!points.length)continue;
    ctx.save();ctx.globalAlpha=full?.7:.85;path(points,'#102d49',10/scale);ctx.shadowColor=look.color;ctx.shadowBlur=10;path(points,look.color,4.5/scale,full?[]:[12/scale,8/scale]);ctx.shadowBlur=0;ctx.restore();
    const end=points.at(-1);circle(end.x,end.y,5/scale,'#ffffff',look.color);
   }
   if(full&&plan.impacts.length){const end=plan.impacts.at(-1),radius=ArcWeapons.get(s.mode).blast*(s.selectedSkill==='BURST'?1.5:1);ctx.save();ctx.globalAlpha=.6;circle(end.x,end.y,radius,look.color+'12',look.color);path([{x:end.x-10/scale,y:end.y},{x:end.x+10/scale,y:end.y}],look.color,2/scale);path([{x:end.x,y:end.y-10/scale},{x:end.x,y:end.y+10/scale}],look.color,2/scale);ctx.restore();}
   const muzzle=G.muzzle(s,0,s.angle);circle(muzzle.x,muzzle.y,4/scale,'#fffbd5');
  }
  display={...display,units:display.units.map(u=>{if(!u.animation)return u;const a=u.animation,t=Math.min(1,a.age/a.duration),ease=t*t*(3-2*t);return {...u,x:a.from.x+(u.x-a.from.x)*ease,y:a.from.y+(u.y-a.from.y)*ease-Math.sin(t*Math.PI)*a.lift};})};
  if(!lobby){for(let side=0;side<2;side++){const u=display.units[side];ctx.save();ctx.globalAlpha=.38;ctx.strokeStyle=side?'#ffb58f':'#dfffbd';ctx.lineWidth=2/scale;ctx.beginPath();ctx.ellipse(u.x,u.y+5,42,12,0,0,Math.PI*2);ctx.stroke();ctx.restore();}}
  rover(display,0,s.angle,options.cosmetic);rover(display,1,52);
  function shotAt(plan,t,alpha=1){
   const look=plan.side===1?{...appearance(plan.weaponId),color:'#ffab8c'}:appearance(plan.weaponId),rail=plan.weaponId==='W14';
   for(const b of plan.bullets){if(t<b.start)continue;let i=b.path.findIndex(p=>p.t>t);if(i<0)i=b.path.length;
    const points=b.path.slice(0,i),alive=t<=b.t;if(!points.length)continue;
    ctx.save();ctx.globalAlpha=alpha*.34;path(points,look.color,3/scale);
    const hot=alive?points.filter(p=>p.t>=t-(rail?.22:.48)):points;
    ctx.globalAlpha=alpha;ctx.shadowColor=look.color;ctx.shadowBlur=rail?22:13;
    path(hot,look.color,(rail?10:look.shape==='shell'?8:5.5)/scale);ctx.shadowBlur=0;
    path(hot,'#fffdf0',(rail?3:1.6)/scale);ctx.restore();
    if(alive){const p=points.at(-1);projectile(p,points.at(-2),look,scale,Number.isFinite(t)?t:0);}
   }
   for(const e of plan.events)if(['cloud','updraft','wind','vent','magnet','phase','bounce','skip'].includes(e.type)&&t>=e.t&&t-e.t<.5){const colors={cloud:'#c6e4ff',updraft:'#f4e6b2',wind:'#b4e7e6',vent:'#ffd0a6',magnet:'#d7baff',phase:'#d0fff2',bounce:'#ffffff',skip:'#c4fff0'};ctx.save();ctx.globalAlpha=alpha*(1-(t-e.t)/.5);circle(e.x,e.y,(10+(t-e.t)*38)/scale,null,colors[e.type]);ctx.restore();}
   for(const e of plan.events)if(e.type==='wave'&&t>=e.t){ctx.save();ctx.globalAlpha=alpha;path(e.path,look.color,7/scale,[8/scale,5/scale]);ctx.restore();}
   for(const hit of plan.impacts||[])explosion(hit,t-hit.t,look,scale,options.reducedMotion,alpha);
   const enemy=1-plan.side,damage=plan.damage?.[enemy]||0;
   const marker=plan.impacts.find(i=>i.hit?.unit===enemy&&i.hit.kind==='weak')||plan.impacts.find(i=>i.hit?.unit===enemy)||plan.impacts.at(-1);
   if(damage>0&&marker&&t>=marker.t&&t-marker.t<.9){const age=t-marker.t;ctx.save();ctx.globalAlpha=alpha*(1-age/.9);ctx.textAlign='center';ctx.font=`800 ${20/scale}px system-ui`;ctx.lineWidth=4/scale;ctx.strokeStyle='#19384c';ctx.fillStyle='#fff6c4';const label=plan.events.some(e=>e.type==='weak')?'CORE ×2':'HIT';ctx.strokeText(label,marker.x,marker.y-(48+age*38)/scale);ctx.fillText(label,marker.x,marker.y-(48+age*38)/scale);ctx.restore();}
  }
  if(shot)shotAt(shot,flight,1);
  if(options.tail){const a=options.tail.age<.8?1:Math.max(0,1-(options.tail.age-.8)/.6);shotAt(options.tail.shot,options.tail.shot.duration+options.tail.age,a);}
  if(options.demo){
   const source=options.demo,parts=source.variants?.length||1,period=(source.duration||1.3)/parts,d=variant?{...source,...variant}:source,t=(source.age%period)/period;
   ctx.globalAlpha=.6;const u=s.units[0];
   if(d.id==='slope'){const x=u.x+Math.sin(t*Math.PI)*100,p=G.surfaceAt(s.world,x,u.y);if(p){path([{x:u.x,y:u.y-55},{x,y:p.y-55}],'#ffffff',3,[4,4]);circle(x,p.y-25,24,'#ffffff44','#ffffff');}}
   else if(d.id==='BLINK'){for(const b of s.blink)circle(b.x,b.y-25,28,'#ffffff40','#ffffff');path([{x:u.x,y:u.y-30},{x:s.blink[0]?.x||u.x+100,y:(s.blink[0]?.y||u.y)-30}],'#fff',3,[5,6]);}
   else if(d.id==='SWAP'||d.id==='boss-swap'){const e=s.units[1];if(d.id==='boss-swap'){circle(e.x,e.y-77,42,'#ffffff44','#fff');ctx.font='30px system-ui';ctx.fillStyle='#fff';ctx.fillText('↻',e.x,e.y-75);}else{path([{x:u.x,y:u.y-60},{x:e.x,y:e.y-60}],'#fff',4,[6,10]);circle(u.x+(e.x-u.x)*t,u.y+(e.y-u.y)*t-25,25,'#ffffff44','#fff');circle(e.x+(u.x-e.x)*t,e.y+(u.y-e.y)*t-25,25,'#ffffff44','#fff');}}
   else if(['PUSH','PULL'].includes(d.id)){const e=s.units[1],dir=d.id==='PUSH'?1:-1;path([{x:e.x,y:e.y-20},{x:e.x+dir*t*72,y:e.y-20}],'#fff',4);circle(e.x+dir*t*72,e.y-20,25,'#ffffff40','#fff');}
   else if(d.plan&&!(d.id==='controls'&&d.age<(d.releaseAt||.95))){const progress=d.id==='controls'?Math.max(0,(d.age-(d.releaseAt||.95))/(d.duration-(d.releaseAt||.95))):t;shotAt(d.plan,Math.min(d.plan.duration,progress*d.plan.duration),.55);}
   ctx.globalAlpha=1;
  }
  if(options.impact&&!options.tail&&!shot)explosion(options.impact,options.impact.age,appearance(options.impact.weaponId),scale,options.reducedMotion);
  ctx.restore();
  const fire=document.getElementById('fire').getBoundingClientRect();
  if(options.demo?.id==='controls'&&options.demo.age<(options.demo.releaseAt||.95)){circle(fire.x+fire.width*.55,fire.y+fire.height*.6,11,'#ffffff88','#ffffff');circle(fire.x+fire.width*.55,fire.y+fire.height*.6,18,null,'#ffffff66');}
  for(const effect of options.pickupEffects||[]){const t=Math.min(1,effect.age/.8),ease=t*t*(3-2*t),target=document.getElementById(effect.id[0]==='W'?'weaponToggle':'pause').getBoundingClientRect(),x=view.x+effect.x*view.scale,y=view.y+effect.y*view.scale;ctx.globalAlpha=1-t;circle(x+(target.x+target.width/2-x)*ease,y+(target.y+target.height/2-y)*ease-Math.sin(t*Math.PI)*30,9,'#f2ffb4','#ffffff');ctx.globalAlpha=1;}
 }
 function toWorld(x,y){const r=canvas.getBoundingClientRect();return {x:(x-r.left-view.x)/view.scale,y:(y-r.top-view.y)/view.scale};}
 return {draw,toWorld,get view(){return view;}};
}
root.ArcRender={create};
})(globalThis);
