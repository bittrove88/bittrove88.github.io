(function(root){
'use strict';
const E=root.ArcEngine,G=E.geometry;
function create(canvas){
 const isArenaPickup=item=>!item.collected&&Number.isFinite(item.x)&&Number.isFinite(item.y)&&item.x>=0&&item.x<=1000;
 const ctx=canvas.getContext('2d');let view={scale:1,x:0,y:0},lastCameraTime=0,cameraKey='',aimCache=null,frameCache=null,guideCache=null;
 function canvasRect(element){
  if(!element)return null;
  const app=canvas.closest('#app')||canvas.parentElement,viewport=root.ArcViewport;
  if(viewport&&app){const r=viewport.rect(element,app),c=viewport.rect(canvas,app);return {x:r.x-c.x,y:r.y-c.y,left:r.left-c.left,top:r.top-c.top,right:r.right-c.left,bottom:r.bottom-c.top,width:r.width,height:r.height};}
  const r=element.getBoundingClientRect(),c=canvas.getBoundingClientRect(),sx=canvas.clientWidth/c.width,sy=canvas.clientHeight/c.height;
  return {x:(r.left-c.left)*sx,y:(r.top-c.top)*sy,left:(r.left-c.left)*sx,top:(r.top-c.top)*sy,right:(r.right-c.left)*sx,bottom:(r.bottom-c.top)*sy,width:r.width*sx,height:r.height*sy};
 }
 const path=(points,color,width=2,dash=[])=>{if(!points.length)return;ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.setLineDash([]);};
 function circle(x,y,r,color,stroke=null){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(color){ctx.fillStyle=color;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
 function round(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
 function blend(a,b,t){const hex=value=>/^#[0-9a-f]{6}$/i.test(value)?[1,3,5].map(i=>parseInt(value.slice(i,i+2),16)):[70,100,115],aa=hex(a),bb=hex(b);return '#'+aa.map((v,i)=>Math.round(v+(bb[i]-v)*t).toString(16).padStart(2,'0')).join('');}
 function polygon(points){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();}
 function appearance(id){const weapon=ArcWeapons.get(id||'W01');return {...(weapon.appearance||{color:'#fff0a9',shape:'orb',size:6}),blast:weapon.blast,weaponId:weapon.id};}
 const flagColors={S02:'#ffbb83',S05:'#f0d989',S11:'#ffabb0',S13:'#ffd485',S17:'#cdf8ff',S24:'#d8c1ff',S27:'#aff3d6'};
 const trailColors={S08:['#ffb5c5','#ffe4a4','#bbf3b9','#a8ddff','#d6bcff'],S14:['#ffdc87','#fff4bf'],S20:['#ffb482','#ffe3a8'],S22:['#d2c0ff','#eaf9ff'],S26:['#ffd98e','#b7e7ff','#ffbcd9','#bbf3c5']};
 function cosmeticFlag(id,x,y,time,reducedMotion){
  const color=flagColors[id]||'#e9d8ff',flutter=reducedMotion?0:Math.sin(time*3)*3;
  path([{x,y:y+36},{x,y}],color,2.3);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+29,y+5+flutter);ctx.lineTo(x+24,y+15);ctx.lineTo(x,y+19);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#315269';ctx.fillStyle='#315269';ctx.lineWidth=2;
  if(id==='S02'){circle(x+11,y+9,5,'#fceac2');}
  else if(id==='S05'){ctx.beginPath();ctx.ellipse(x+12,y+10,4,6,0,0,Math.PI*2);ctx.fill();path([{x:x+6,y:y+5},{x:x+17,y:y+15}],'#315269',1.5);}
  else if(id==='S11'){path([{x:x+6,y:y+4},{x:x+6,y:y+15},{x:x+17,y:y+15},{x:x+17,y:y+5}],'#315269',1.5);path([{x:x+4,y:y+8},{x:x+20,y:y+8}],'#315269',1.5);}
  else if(id==='S13'){path([{x:x+4,y:y+8},{x:x+12,y:y+6},{x:x+22,y:y+9}],'#8c684e',2);path([{x:x+4,y:y+13},{x:x+14,y:y+11},{x:x+23,y:y+14}],'#8c684e',2);}
  else if(id==='S17'){for(let i=0;i<3;i++){const a=i*Math.PI/3;path([{x:x+12-Math.cos(a)*7,y:y+10-Math.sin(a)*7},{x:x+12+Math.cos(a)*7,y:y+10+Math.sin(a)*7}],'#5782a6',1.5);}}
  else if(id==='S24'){path([{x:x+5,y:y+5},{x:x+19,y:y+14}],'#6e5b99',3);circle(x+18,y+13,3,'#fbf5d1');}
  else if(id==='S27'){path([{x:x+4,y:y+15},{x:x+10,y:y+5},{x:x+17,y:y+12},{x:x+24,y:y+7}],'#7d8ac4',3);}
 }
 function cosmeticTrail(points,time,id,scale,reducedMotion,alpha){
  const palette=trailColors[id];if(!palette||points.length<2)return;
  ctx.save();ctx.globalAlpha=alpha*.65;
  if(reducedMotion){path(points,palette[0],1.4/scale,[2/scale,12/scale]);ctx.restore();return;}
  const step=Math.max(6,Math.ceil(points.length/12));
  for(let i=1;i<points.length;i+=step){const p=points[i],age=Math.max(0,time-p.t);if(age>.5)continue;const color=palette[Math.floor(i/step)%palette.length],x=p.x+Math.sin(i)*age*12/scale,y=p.y+age*age*18/scale;ctx.globalAlpha=alpha*(1-age/.5)*.8;
   if(id==='S14'){circle(x,y,(2+age*5)/scale,color+'55',color);}
   else if(id==='S20'){path([{x:x-3/scale,y:y+3/scale},{x:x+3/scale,y:y-3/scale}],color,1.6/scale);}
   else if(id==='S22'){path([{x:x-3/scale,y},{x:x+3/scale,y}],color,1.4/scale);path([{x,y:y-3/scale},{x,y:y+3/scale}],color,1.4/scale);}
   else if(id==='S26'){ctx.fillStyle=color;ctx.fillRect(x,y,3/scale,2/scale);}
   else circle(x,y,2/scale,color);
  }
  ctx.restore();
 }
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
  if(age<0||age>duration)return;const t=Math.min(1,age/duration),size=Math.max(.55,Math.min(1.65,(look.blast||64)/64)),radius=(18+76*(1-Math.pow(1-t,3)))*size/scale;
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
 function aimKey(s){return [s.stage,s.round,s.bossPhase,s.characterId,s.mode,s.teleportMode,s.selectedSkill,s.angle.toFixed(2),...s.units.flatMap(u=>[u.x.toFixed(1),u.y.toFixed(1),u.slope.toFixed(3),u.exposed,...u.parts.map(p=>p.hp)])].join(':');}
 function aimPlan(s){
  const key=aimKey(s)+':'+s.power.toFixed(1);
  if(!aimCache||aimCache.key!==key||aimCache.world!==s.world)aimCache={key,world:s.world,plan:E.trajectory(s,0,s.angle,s.power)};
  return aimCache.plan;
 }
 function aimEnvelope(s){
  // Reserve the charge envelope before the finger lands. Holding power never zooms the scene.
  const key=aimKey(s);
  if(!frameCache||frameCache.key!==key||frameCache.world!==s.world){
   const points=[20,65,100].flatMap(power=>E.trajectory(s,0,s.angle,power).bullets.flatMap(b=>b.path));
   frameCache={key,world:s.world,points};
  }
  return frameCache.points;
 }
 function backdropLandmarks(theme,w,h,time,reducedMotion){
  ctx.save();ctx.globalAlpha=.23;ctx.fillStyle='#d5e7dc';ctx.strokeStyle='#d5e7dc';ctx.lineWidth=2;
  const base=h*.49,drift=reducedMotion?0:Math.sin(time*.12)*3;
  for(let i=0;i<3;i++){
   const x=w*(.16+i*.34),size=Math.min(w,h)*(.045+i*.006),y=base+Math.sin(i*2)*h*.035+drift;
   if(theme===0){path([{x:x-size,y},{x:x-size*.3,y:y-size*.9},{x:x+size,y}], '#d5e7dc',2);path([{x,y:y-size*1.5},{x,y:y+size*.35}],'#d5e7dc',2);}
   else if(theme===1){polygon([{x:x-size,y},{x:x+size*.2,y:y-size},{x:x+size,y:y-size*.7},{x:x-size*.2,y:y+size*.3}]);ctx.fill();path([{x:x-size*.5,y:y-size*.1},{x:x+size*.6,y:y-size*.7}],'#effff5',2);}
   else if(theme===2||theme===5){ctx.fillRect(x-size,y-size*1.6,size*.4,size*1.6);ctx.fillRect(x+size*.5,y-size*1.6,size*.4,size*1.6);ctx.beginPath();ctx.arc(x,y-size*1.6,size*.7,Math.PI,0);ctx.stroke();if(theme===5)path([{x:x-size*1.5,y:y+size*.4},{x:x+size*1.4,y:y+size*.4}],'#d5e7dc',2);}
   else if(theme===3){for(const off of [-1,.2,1])ctx.fillRect(x+size*off,y-size*(off===.2?2:1.4),size*.3,size*(off===.2?2:1.4));path([{x:x-size*1.2,y:y-size*1.4},{x:x+size*1.4,y:y-size*1.4}],'#d5e7dc',4);}
   else if(theme===4){for(const off of [-.7,0,.7]){circle(x+off*size,y-size*(off?1:1.6),size*.6,'#d5e7dc');path([{x:x+off*size,y},{x:x+off*size,y:y-size*(off?1:1.6)}],'#d5e7dc',2);}}
   else if(theme===6||theme===11){polygon([{x,y:y-size*2},{x:x+size*.5,y},{x:x-size*.65,y}]);ctx.fill();if(theme===11)path([{x:x-size*.6,y:y-size*.2},{x:x+size*.2,y:y-size*1.4},{x:x+size*.6,y:y-size*.2}],'#efffff',2);}
   else if(theme===7){for(const off of [-.8,.8])ctx.fillRect(x+off*size,y-size*1.8,size*.15,size*1.8);path([{x:x-size,y:y-size*1.8},{x:x+size,y:y-size*1.8}],'#d5e7dc',4);path([{x:x-size*1.5,y},{x:x+size*1.5,y}],'#d5e7dc',3);}
   else if(theme===8){polygon([{x:x-size,y},{x:x-size*.4,y:y-size*.5},{x:x+size*.3,y:y-size*1.5},{x:x+size,y}]);ctx.fill();for(const off of [-.2,.3])path([{x:x+off*size,y:y-size*.2},{x:x+(off+.1)*size,y:y-size}],'#f2d3b0',2);}
   else if(theme===9||theme===13){ctx.fillRect(x-size*.6,y-size*1.4,size*.4,size*1.4);ctx.fillRect(x+size*.2,y-size*2.2,size*.4,size*2.2);circle(x+size*.4,y-size*2.4,size*.22,'#f2d3b044');if(theme===13)round(x-size,y-size*.8,size*2,size*.8,size*.1,'#d5e7dc');}
   else if(theme===10){ctx.fillRect(x-size,y-size*.7,size*2,size*.7);ctx.beginPath();ctx.arc(x,y-size*.7,size*.55,Math.PI,0);ctx.fill();path([{x:x+size*.6,y:y-size*.6},{x:x+size*.6,y:y-size*2.2},{x:x+size*1.2,y:y-size*1.7}],'#d5e7dc',2);}
   else if(theme===12){polygon([{x:x-size*1.4,y},{x:x-size*.4,y:y-size*1.8},{x:x+size*.1,y:y-size*1.5},{x:x+size*.5,y:y-size*1.8},{x:x+size*1.5,y}]);ctx.fill();}
   else if(theme===14||theme===15){ctx.beginPath();ctx.arc(x,y-size,size*.7,.25,Math.PI-.25);ctx.stroke();path([{x:x-size*.7,y:y-size},{x:x-size*.7,y},{x:x+size*.7,y},{x:x+size*.7,y:y-size}],'#d5e7dc',3);if(theme===15)circle(x,y-size,size*.3,'#d5e7dc');}
   else if(theme===16){ctx.beginPath();ctx.ellipse(x,y,size*1.4,size*.32,0,0,Math.PI*2);ctx.fill();path([{x:x-size,y},{x:x-size*.6,y:y+size},{x:x+size*.3,y:y+size*.7},{x:x+size,y}],'#d5e7dc',2);}
   else if(theme===17){polygon([{x:x-size*1.5,y:y-size*.8},{x:x+size*1.5,y:y-size*.8},{x:x+size*.8,y},{x:x-size*.8,y}]);ctx.fill();ctx.fillRect(x+size*.3,y-size*1.4,size*.6,size*.6);}
   else{ctx.fillRect(x-size,y-size*1.6,size*2,size*1.6);for(let k=0;k<3;k++)ctx.fillRect(x-size+k*size*.75,y-size*2,size*.5,size*.5);if(theme===19)path([{x,y:y-size*2},{x,y:y-size*3},{x:x+size*.65,y:y-size*2.6}],'#f1e8bc',2);}
  }
  ctx.restore();
 }
 function unitEffects(s,u,side,options,time,scale){
  const reaction=u.reaction,recoil=u.recoil;
  if(u.teleportFlash){const t=u.teleportFlash.age/.8;ctx.save();ctx.globalAlpha=1-t;circle(u.x,u.y-22,(22+20*t)/scale,null,'#c0f1ff');circle(u.x,u.y-22,(15+10*t)/scale,null,'#f0ffed');ctx.restore();}
  if(recoil&&recoil.age<.22){
   const enemyShot=options.shot?.side===1?options.shot:options.tail?.shot?.side===1?options.tail.shot:null,m=G.muzzle(s,side,side?enemyShot?.angle??52:s.angle),t=recoil.age/.22;
   ctx.save();ctx.globalAlpha=1-t;const look=appearance(E.weapon(s,side).id);
   circle(m.x,m.y,(5+14*t)/scale,look.color+'33',look.color);
   if(t<.35)path([{x:m.x-m.dx*2/scale,y:m.y-m.dy*2/scale},{x:m.x+m.dx*15/scale,y:m.y+m.dy*15/scale}],'#fff7d4',4/scale);
   if(!side&&['S03','S18'].includes(options.cosmetic)&&!options.reducedMotion){const coral=options.cosmetic==='S03';for(let i=0;i<6;i++){const a=i*Math.PI/3,dist=(5+24*t)/scale,x=m.x+Math.cos(a)*dist,y=m.y+Math.sin(a)*dist;if(coral)circle(x,y,(2+2*(1-t))/scale,'#ffc1ad');else path([{x:x-Math.cos(a)*4/scale,y:y-Math.sin(a)*4/scale},{x:x+Math.cos(a)*4/scale,y:y+Math.sin(a)*4/scale}],'#c2f6ff',2/scale);}}
   ctx.restore();
  }
  if(reaction&&reaction.age<.7){
   const t=reaction.age/.7,weight=Math.min(2,reaction.damage||1),y=u.y-(s.spec.boss&&side?45:23);
   ctx.save();ctx.globalAlpha=Math.max(0,1-t)*.7;
   ctx.strokeStyle=side?'#ffe0af':'#ffd7cb';ctx.lineWidth=(2+weight)/scale;ctx.beginPath();ctx.ellipse(u.x,y,(24+40*t)/scale,(18+22*t)/scale,0,0,Math.PI*2);ctx.stroke();
   for(const index of reaction.broken||[]){const p=u.parts[index];if(!p)continue;for(let i=0;i<5;i++){const a=i*1.35,dist=(8+40*t)/scale;path([{x:u.x+p.dx+Math.cos(a)*dist,y:u.y+p.dy+Math.sin(a)*dist+t*t*35/scale},{x:u.x+p.dx+Math.cos(a)*(dist+5/scale),y:u.y+p.dy+Math.sin(a)*(dist+5/scale)+t*t*35/scale}],'#ffdeb2',3/scale);}}
   ctx.restore();
  }
 }
 function rover(s,side,angle,cosmetic=null,alpha=1,options={}){
  const u=s.units[side],dir=s.units[1-side].x>=u.x?1:-1;
  const hue=cosmetic?parseInt(cosmetic.slice(1))*29%360:155;
  const disabled=u.hp<=0,bright=disabled?'#75868c':side?'#ffd1ac':cosmetic?`hsl(${hue} 60% 78%)`:'#caffd7',dark=disabled?'#445a67':side?'#a16963':'#3d8991';
  const hit=!options.reducedMotion&&u.reaction&&u.reaction.age<.7?Math.sin(u.reaction.age*44)*Math.exp(-u.reaction.age*9)*4:0;
  const kick=!options.reducedMotion&&u.recoil&&u.recoil.age<.22?Math.sin(u.recoil.age/.22*Math.PI)*3:0;
  if(!side&&root.ArcCharacters){
   root.ArcCharacters.draw(ctx,options.characterId,{x:u.x,y:u.y,dir,slope:u.slope||0,travel:u.x,hit,kick,disabled,alpha,muzzle:G.muzzle(s,side,angle)});
   // Legacy collected finishes remain optional overlays; the reference palette stays intact.
   if(cosmetic){
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(u.x,u.y);ctx.rotate(u.slope||0);
    if(cosmetic[0]==='B'){path([{x:-28,y:-17},{x:-23,y:-30},{x:-14,y:-26}],bright,5);path([{x:28,y:-17},{x:23,y:-30},{x:14,y:-26}],bright,5);cosmeticFlag(cosmetic,-24,-67,options.time||0,options.reducedMotion);}
    else if(flagColors[cosmetic])cosmeticFlag(cosmetic,-25,-67,options.time||0,options.reducedMotion);
    else if(cosmetic==='S09'){path([{x:-30,y:-18},{x:-22,y:-30},{x:-13,y:-27},{x:-7,y:-41},{x:4,y:-43},{x:16,y:-31},{x:29,y:-24}],'#bfe8a9',2.5);for(const [x,y]of[[-24,-24],[-12,-30],[-4,-40],[13,-34],[23,-27]]){ctx.save();ctx.translate(x,y);ctx.rotate(x*.08);ctx.fillStyle='#a8d89a';ctx.beginPath();ctx.ellipse(0,0,4,2,Math.PI/4,0,Math.PI*2);ctx.fill();ctx.restore();}}
    ctx.restore();
    if(['S03','S18'].includes(cosmetic)){
     const m=G.muzzle(s,side,angle),coral=cosmetic==='S03',color=coral?'#ffbaa8':'#bcefff';ctx.save();ctx.translate(m.x,m.y);ctx.rotate(m.theta);circle(0,0,coral?7:8,null,color);
     if(coral)for(const a of[-1.4,0,1.4])path([{x:0,y:0},{x:Math.cos(a)*11,y:Math.sin(a)*11}],color,3);else path([{x:-4,y:-8},{x:4,y:-5},{x:7,y:0},{x:4,y:5},{x:-4,y:8}],color,2.5);ctx.restore();
    }
   }
   return;
  }
  ctx.save();ctx.globalAlpha=alpha*(disabled?.75:1);ctx.translate(u.x-dir*kick+hit,u.y+(disabled?3:0));ctx.rotate((u.slope||0)+(disabled?dir*.07:0)+(options.reducedMotion?0:hit*.002));
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
   u.parts.forEach((p,i)=>{
    const damaged=p.hp<p.maxHp,partColor=disabled?'#7d8a92':/GUN|CANNON|ARM/.test(p.name)?'#ffd49f':/THRUST|ENGINE|ROTOR|FAN/.test(p.name)?'#afe8f2':'#dfc8ef';
    if(p.hp<=0){circle(p.dx,p.dy,p.radius*.65,'#1b2f4355','#a18e9766');path([{x:p.dx-8,y:p.dy-8},{x:p.dx+8,y:p.dy+8}],'#897783',2);return;}
    circle(p.dx,p.dy,p.radius,disabled?'#495b68':damaged?'#765563':'#a47570',partColor);
    if(/GUN|CANNON|ARM/.test(p.name))path([{x:p.dx,y:p.dy},{x:p.dx-24,y:p.dy-4}],partColor,7);
    else if(/THRUST|ENGINE|ROTOR|FAN/.test(p.name)){circle(p.dx,p.dy,p.radius*.45,'#274655',partColor);if(!disabled&&!options.reducedMotion)path([{x:p.dx,y:p.dy+8},{x:p.dx,y:p.dy+18+Math.sin((options.time||0)*12+i)*4}],partColor,4);}
    else{ctx.strokeStyle=partColor;ctx.lineWidth=3;ctx.strokeRect(p.dx-8,p.dy-12,16,24);}
    for(let hp=0;hp<p.maxHp;hp++)round(p.dx-p.maxHp*4+hp*8,p.dy-p.radius-9,5,4,1,hp<p.hp?partColor:'#514652');
   });
   const exposed=u.exposed>0||s.bossPhase===2||s.effects.broken>0,radius=exposed?30:22,coreX=(u.facingCore||0)*20,coreY=-77;
   circle(coreX,coreY,radius,disabled?'#586e75':exposed?'#c9ffd4':'#718b88',disabled?'#93a3a3':exposed?'#ffffff':'#d5ecbe');circle(coreX,coreY,radius*.5,disabled?'#7a8b8d':exposed?'#fbfff1':'#bfddcb');
   if(exposed&&!disabled){ctx.save();ctx.strokeStyle='#deffc9';ctx.lineWidth=2/view.scale;ctx.beginPath();ctx.arc(coreX,coreY,radius+7+(options.reducedMotion?0:Math.sin((options.time||0)*4)*2),0,Math.PI*2);ctx.stroke();ctx.restore();}
   if(s.bossPhase>0){ctx.font=`700 ${12/view.scale}px system-ui`;ctx.textAlign='center';ctx.fillStyle='#fff3d2';ctx.fillText(['I','II','III'][s.bossPhase],70,-94);}
  }else{
   round(-32,-16,64,18,8,'#153e51');for(const x of [-21,0,21]){circle(x,-6,8,'#14384b');circle(x,-6,3,dark);}
   ctx.fillStyle=dark;ctx.beginPath();ctx.moveTo(-34,-18);ctx.lineTo(-20,-33);ctx.lineTo(20,-33);ctx.lineTo(34,-18);ctx.closePath();ctx.fill();round(-15,-45,30,24,6,bright);round(dir===1?1:-14,-40,13,6,2,'#356478');if(side&&!disabled){circle(0,-22,12,'#fff5c31a','#ffe7ae99');circle(0,-22,3,'#fff1bb');}

   if(cosmetic?.[0]==='B'){
    path([{x:-28,y:-17},{x:-23,y:-30},{x:-14,y:-26}],bright,5);path([{x:28,y:-17},{x:23,y:-30},{x:14,y:-26}],bright,5);cosmeticFlag(cosmetic,-24,-67,options.time||0,options.reducedMotion);circle(-12,-58,3,'#f9f1c4');
   }else if(flagColors[cosmetic])cosmeticFlag(cosmetic,-25,-67,options.time||0,options.reducedMotion);
   else if(cosmetic==='S09'){
    path([{x:-30,y:-18},{x:-22,y:-30},{x:-13,y:-27},{x:-7,y:-41},{x:4,y:-43},{x:16,y:-31},{x:29,y:-24}],'#bfe8a9',2.5);
    for(const [x,y] of [[-24,-24],[-12,-30],[-4,-40],[13,-34],[23,-27]]){ctx.save();ctx.translate(x,y);ctx.rotate(x*.08);ctx.fillStyle='#a8d89a';ctx.beginPath();ctx.ellipse(0,0,4,2,Math.PI/4,0,Math.PI*2);ctx.fill();ctx.restore();}
   }
  }
  ctx.restore();
  // The barrel stays anchored to the exact physics pivot and muzzle while the chassis reacts.
  if(!(side&&s.spec.boss)){
   const m=G.muzzle(s,side,angle),weapon=!side?ArcWeapons.get(s.teleportMode?'TELEPORT':s.mode):ArcWeapons.get('W01'),weaponLook=appearance(weapon.id),barrelWidth=!side&&weapon.id==='W02'?14:!side&&['W03','W14'].includes(weapon.id)?7:10;ctx.save();ctx.globalAlpha=alpha;
   path([m.pivot,m],dark,barrelWidth);path([m.pivot,m],!side&&weapon.id!=='W01'?weaponLook.color:bright,Math.max(3,barrelWidth-4));
   if(!side&&['W09','W10','W11'].includes(weapon.id))for(const offset of [-5,5])path([{x:m.x-m.dx*12-m.dy*offset,y:m.y-m.dy*12+m.dx*offset},{x:m.x-m.dy*offset,y:m.y+m.dx*offset}],weaponLook.color,2.5);
   if(!side&&['W13','W14','W18'].includes(weapon.id))for(const distance of [12,21]){const x=m.pivot.x+m.dx*distance,y=m.pivot.y+m.dy*distance;path([{x:x-m.dy*6,y:y+m.dx*6},{x:x+m.dy*6,y:y-m.dx*6}],weaponLook.color,2);}
   if(!side&&['S03','S18'].includes(cosmetic)){
    ctx.save();ctx.translate(m.x,m.y);ctx.rotate(m.theta);const coral=cosmetic==='S03',color=coral?'#ffbaa8':'#bcefff',radius=coral?7:8;circle(0,0,radius,null,color);
    if(coral){for(const a of [-1.4,0,1.4])path([{x:0,y:0},{x:Math.cos(a)*11,y:Math.sin(a)*11}],color,3);}
    else{path([{x:-4,y:-8},{x:4,y:-5},{x:7,y:0},{x:4,y:5},{x:-4,y:8}],color,2.5);}
    ctx.restore();
   }
   ctx.restore();
  }
 }
 function draw(s,options={}){
  const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
  const localDemo=options.demo,variant=localDemo?.variants?.[Math.min(localDemo.variants.length-1,Math.floor(localDemo.age/(localDemo.duration/localDemo.variants.length)))],demonstration=variant?{...localDemo,...variant}:localDemo;
  if(demonstration?.state||demonstration?.before)s=demonstration.state||demonstration.before;
  if(demonstration?.pose)s={...s,...demonstration.pose};
  else if(demonstration?.plan)s={...s,angle:demonstration.plan.angle,power:demonstration.plan.power,mode:demonstration.plan.weaponId,selectedSkill:demonstration.plan.skill};
  const demoFlight=demonstration?.flight??Math.max(0,(demonstration?.age||0)-(demonstration?.flightStart||0));
  let world=demonstration?.world||s.world,display=s;const transition=options.transition;
  if(demonstration?.after){const after=demonstration.after,t=Math.max(0,Math.min(1,demonstration.effectProgress??((demonstration.age-(demonstration.flightEnd||demonstration.plan?.duration||0))/.5))),ease=t*t*(3-2*t);
   display={...s,units:s.units.map((u,i)=>{const target=after.units[i];const warp=['teleport','wall-fall'].includes(demonstration.id)&&i===0&&demonstration.phase==='RESULT',origin=warp?target.animation?.from||u:u;return {...u,x:origin.x+(target.x-origin.x)*(warp?t*t:ease),y:origin.y+(target.y-origin.y)*(warp?t*t:ease),slope:u.slope+(target.slope-u.slope)*ease,hp:t>=.5?target.hp:u.hp,parts:t>=.5?target.parts:u.parts,exposed:t>=.5?target.exposed:u.exposed,facingCore:t>=.5?target.facingCore:u.facingCore,floating:t>=.5?target.floating:u.floating,reactionKind:t>=.5?target.reactionKind:u.reactionKind};})};
   display={...display,guardActive:t>=.5?after.guardActive:s.guardActive};
   if(t>=.5||['destruction','choices'].includes(demonstration.id)&&t>0){world=after.world||world;s={...s,world,effects:after.effects||s.effects,pickups:after.pickups||s.pickups,bossPhase:after.bossPhase??s.bossPhase};display={...display,world,effects:s.effects,pickups:s.pickups,bossPhase:s.bossPhase};}
  }
  if(demonstration?.plan)for(const e of demonstration.plan.events.filter(e=>e.type==='pull'&&demoFlight>=e.t)){const t=Math.min(1,(demoFlight-e.t)/e.duration),ease=t*t*(3-2*t);display={...display,units:display.units.map((u,i)=>i!==e.unit?u:{...u,x:e.from.x+(e.to.x-e.from.x)*ease,y:e.from.y+(e.to.y-e.from.y)*ease,slope:e.from.slope+(e.to.slope-e.from.slope)*ease,animation:null})};}
  if(transition){const t=Math.min(1,transition.age/transition.duration),ease=t*t*(3-2*t);world={...s.world,solids:s.world.solids.map(o=>{const old=transition.world.solids.find(a=>a.id===o.id&&a.poly.length===o.poly.length);return old?{...o,poly:o.poly.map((p,i)=>({x:old.poly[i].x+(p.x-old.poly[i].x)*ease,y:old.poly[i].y+(p.y-old.poly[i].y)*ease}))}:o;})};display={...s,units:s.units.map((u,i)=>({...u,x:transition.units[i].x+(u.x-transition.units[i].x)*ease,y:transition.units[i].y+(u.y-transition.units[i].y)*ease,slope:transition.units[i].slope+(u.slope-transition.units[i].slope)*ease}))};}
  const dpr=Math.min(window.devicePixelRatio||1,2);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.lineCap='round';ctx.lineJoin='round';const biome=E.biomes[s.spec.theme]||E.biomes[0],time=options.time||0;
  const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,biome.sky[0]);sky.addColorStop(.67,biome.sky[1]);sky.addColorStop(1,biome.land);ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
  circle(w*.76,h*.21,Math.min(w,h)*.065,'#fff1c686');
  for(let layer=0;layer<4;layer++){
   ctx.fillStyle=[biome.land+'40',biome.land+'70',biome.land+'90',biome.sky[0]+'65'][layer];ctx.beginPath();ctx.moveTo(0,h);
   for(let x=0;x<=w+12;x+=12){const y=h*(.38+layer*.085)+Math.sin(x/w*8+layer*1.7)*h*.045+Math.cos(x/w*17+layer)*h*.015;ctx.lineTo(x,y);}ctx.lineTo(w,h);ctx.fill();
  }
  backdropLandmarks(s.spec.theme,w,h,time,options.reducedMotion);
  const lobby=options.lobby,wide=w/h>1.5,fieldW=lobby&&w>900?w*.56:w;
  const controls=canvasRect(document.getElementById('battleControls')),header=canvasRect(document.querySelector('.battle-top')),tutorial=canvasRect(document.getElementById('tutorial'));
  const lessonFocus=demonstration?.focus,validFocus=lessonFocus&&Number.isFinite(lessonFocus.x)&&Number.isFinite(lessonFocus.y)&&lessonFocus.x>=0&&lessonFocus.x<=1000;
  const closeFocus=demonstration?.phase==='RESULT'&&validFocus&&!demonstration.framing?.keepOverview?{...lessonFocus,radius:Math.max(100,Math.min(280,lessonFocus.radius||170))}:null;
  const frameUnit=u=>!closeFocus||Math.abs(u.x-closeFocus.x)<=closeFocus.radius+65&&Math.abs(u.y-closeFocus.y)<=260,subjects=demonstration?.framing?.subjects,showsUnit=(u,i)=>(!subjects||subjects.includes(i))&&frameUnit(u),frameUnits=s.units.filter(showsUnit);
  const phoneLandscape=!lobby&&!localDemo&&w>h&&h<=600&&matchMedia('(pointer: coarse)').matches;
  const top=lobby?(wide?100:h*.23):localDemo?16:phoneLandscape?(h<=280?4:h<=340?8:48):Math.max(80,(header?.bottom||64)+20);
  const bottom=lobby?(wide?h-55:h*.63):localDemo&&tutorial?.height?Math.max(top+1,tutorial.top-12):phoneLandscape?h-(h<=280?96:104)-Math.max(0,h-(controls?.bottom||h-4)-4):Math.max(top+100,(controls?.top||h-210)-12);
  const landmarks=[...frameUnits.map(u=>({x:u.x,y:u.y-50})),...(!localDemo?s.pickups.filter(isArenaPickup):[])];
  if(closeFocus)landmarks.push({x:closeFocus.x-closeFocus.radius,y:closeFocus.y-45},{x:closeFocus.x+closeFocus.radius,y:closeFocus.y+45});
  if(demonstration?.after)landmarks.push(...demonstration.after.units.filter(showsUnit).map(u=>({x:u.x,y:u.y-60})));
  if(validFocus)landmarks.push({x:demonstration.focus.x,y:demonstration.focus.y});
  if(localDemo&&!closeFocus)for(const p of demonstration?.framing?.points||[])if(Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1000)landmarks.push(p);
  if(!localDemo&&!phoneLandscape)for(const o of world.solids)if(o.kind!=='floor')landmarks.push(...o.poly);
  if(!localDemo&&!phoneLandscape)for(const r of world.regions)if(r.kind==='M')landmarks.push({x:r.x-r.radius,y:r.y-r.radius},{x:r.x+r.radius,y:r.y+r.radius});else landmarks.push({x:r.x1,y:r.y1},{x:r.x2,y:r.y2});
  let minX=Math.max(-25,Math.min(...landmarks.map(p=>p.x))-85),maxX=Math.min(1025,Math.max(...landmarks.map(p=>p.x))+85);
  const floorPoints=world.surfaces.filter(f=>f.id.startsWith('floor')).flatMap(f=>f.points).filter(p=>p.x>=minX&&p.x<=maxX);
  let minY=Math.min(...landmarks.map(p=>p.y),...frameUnits.map(u=>u.y-100))-28,maxY=Math.max(...frameUnits.map(u=>u.y+24),...floorPoints.map(p=>p.y+16),...(closeFocus?[closeFocus.y+45]:[]));
  if(phoneLandscape){minY=Math.min(...s.units.map((u,i)=>u.y-(i&&s.spec.boss?105:62)))-4;maxY=Math.max(...s.units.map(u=>u.y+8));}
  const baseline={minX,maxX,minY,maxY,scale:Math.min(fieldW/(maxX-minX),(bottom-top)/Math.max(130,maxY-minY))};
  const planning=!localDemo&&(options.canAim||options.planning),guide=planning?aimPlan(s):null;
  // Off-board miss paths never determine the arena framing.
  const guidePoints=planning?aimEnvelope(s).filter(p=>p.x>=0&&p.x<=1000):[];
  const shot=options.shot,flight=options.flight||0;
  if(guidePoints.length){minX=Math.max(-25,Math.min(minX,Math.min(...guidePoints.map(p=>p.x))-24));maxX=Math.min(1025,Math.max(maxX,Math.max(...guidePoints.map(p=>p.x))+24));minY=Math.min(minY,...guidePoints.map(p=>p.y-40));maxY=Math.max(maxY,...guidePoints.map(p=>p.y+24));}
  if(shot)for(const b of shot.bullets)for(const p of b.path)if(p.t<=flight+.4&&p.x>=0&&p.x<=1000)minY=Math.min(minY,p.y-28);
  const critical=[];
  function includeActors(state){for(let side=0;side<2;side++){const u=state.units[side];if(!showsUnit(u,side))continue;const extent=side&&state.spec.boss?105:43;critical.push(u.x-extent,u.x+extent);const muzzle=G.muzzle(state,side,side?52:state.angle);critical.push(muzzle.x-6,muzzle.x+6);}for(const pickup of state.pickups||[])if(isArenaPickup(pickup)&&!localDemo&&!phoneLandscape)critical.push(pickup.x-24,pickup.x+24);}
  includeActors(s);if(demonstration?.after)includeActors(demonstration.after);if(closeFocus)critical.push(closeFocus.x-closeFocus.radius,closeFocus.x+closeFocus.radius);
  // A held shot freezes this view, so reserve the player's legal walking extent first.
  if(planning&&!lobby&&!localDemo&&!phoneLandscape)critical.push(s.units[0].range[0]-50,s.units[0].range[1]+50);
  const leftMargin=phoneLandscape?Math.max(12,controls?.left||12):12,rightMargin=phoneLandscape?Math.max(12,w-(controls?.right||w-12)):12;
  const criticalMin=Math.min(...critical),criticalMax=Math.max(...critical),criticalScale=(fieldW-leftMargin-rightMargin)/Math.max(100,criticalMax-criticalMin);
  const fit=Math.min(fieldW/(maxX-minX),(bottom-top)/Math.max(130,maxY-minY)),readableScale=phoneLandscape?Math.min(1.25,criticalScale,Math.max(.52,(bottom-top)/Math.max(90,baseline.maxY-baseline.minY))):lobby?fit:Math.max(baseline.scale*.85,fit),scaleTarget=Math.min(readableScale,criticalScale,closeFocus?2.2:Infinity),clipped=scaleTarget>fit+.00001;
  // Keep the readable battlefield grounded when a high arc continues above the view.
  const frameMinY=phoneLandscape||clipped?baseline.minY:minY,frameMaxY=phoneLandscape||clipped?baseline.maxY:maxY;
  const focusY=top+(bottom-top)*(lobby?.55:.6),offsetY=Math.max(top-frameMinY*scaleTarget,Math.min(bottom-frameMaxY*scaleTarget,focusY-(frameMinY+frameMaxY)*.5*scaleTarget));
  const constrainX=(x,scale)=>Math.max(leftMargin-criticalMin*scale,Math.min(fieldW-rightMargin-criticalMax*scale,x));
  const target={scale:scaleTarget,x:constrainX(fieldW*.5-(phoneLandscape?(criticalMin+criticalMax):(minX+maxX))*.5*scaleTarget,scaleTarget),y:offsetY};
  if(phoneLandscape&&(baseline.maxY-baseline.minY)*scaleTarget>bottom-top){target.y=(top+bottom)/2-(s.units[0].y-22)*scaleTarget;}
  const nextKey=[s.stage,lobby,w,h,localDemo?'preview':'battle'].join(':');
  if(cameraKey!==nextKey||options.reducedMotion)view=target;
  else{const dt=Math.max(1/120,Math.min(.05,time-lastCameraTime||1/60)),k=1-Math.exp(-dt*(shot?5:phoneLandscape?6:10));view={scale:view.scale+(target.scale-view.scale)*k,x:view.x+(target.x-view.x)*k,y:!localDemo&&(options.shot||options.tail?.age<.55)?view.y:view.y+(target.y-view.y)*k};}
  if(options.cameraLock&&!options.chargeWalking){view={scale:options.cameraLock.scale,x:options.cameraLock.x,y:options.cameraLock.y};if(phoneLandscape){view.scale=Math.min(view.scale,criticalScale,Math.max(.52,(bottom-top)/Math.max(90,baseline.maxY-baseline.minY)));if((baseline.maxY-baseline.minY)*view.scale>bottom-top)view.y=(top+bottom)/2-(s.units[0].y-22)*view.scale;view.x=constrainX(view.x,view.scale);if((baseline.maxY-baseline.minY)*view.scale<=bottom-top)view.y=Math.max(top-baseline.minY*view.scale,Math.min(bottom-baseline.maxY*view.scale,view.y));}}
  else{view.scale=Math.min(view.scale,criticalScale);view.x=constrainX(view.x,view.scale);}
  if(options.cameraLock&&options.chargeWalking){view.scale=Math.min(options.cameraLock.scale,criticalScale);view.x=constrainX(view.x,view.scale);}
  // Follow the leading projectile without fitting its entire high arc into a
  // miniature battlefield. Horizontal actor bounds and all UI sizes stay fixed.
  const trackedShot=shot||(options.tail?.age<.55?options.tail.shot:null);
  if(trackedShot&&!localDemo){const trackTime=shot?flight:trackedShot.duration,bullet=trackedShot.bullets.find(b=>trackTime>=b.start&&trackTime<=b.t)||trackedShot.bullets[0],points=bullet?.path||[],p=points.find(q=>q.t>=trackTime+.22)||points.at(-1);if(p){const dt=Math.max(1/120,Math.min(.05,time-lastCameraTime||1/60)),screenY=view.y+p.y*view.scale,bandTop=top+22,bandBottom=bottom-22;let dy=screenY<bandTop?bandTop-screenY:screenY>bandBottom?bandBottom-screenY:0;view.y+=Math.max(-480*dt,Math.min(480*dt,dy*(1-Math.exp(-dt*7))));}}
  lastCameraTime=time;cameraKey=nextKey;const scale=view.scale;
  if(phoneLandscape){
   const enemyY=view.y+(s.units[1].y-(s.spec.boss?77:22))*view.scale;document.getElementById('battle').dataset.enemyDirection=enemyY<top?'above':enemyY>bottom?'below':'visible';
   const hw=header?.width||280,hh=header?.height||44,high=s.units.map((u,i)=>({x:view.x+u.x*view.scale,y:view.y+(u.y-(i&&s.spec.boss?77:22))*view.scale})).find(p=>p.y<hh+16&&p.x>(w-hw)/2-16&&p.x<(w+hw)/2+16);
   const align=high?(high.x>w/2?'left':'right'):'center',battle=document.getElementById('battle');if(battle.dataset.hudAlign!==align)battle.dataset.hudAlign=align;
  }

  const shake=options.impact&&!options.reducedMotion?Math.max(0,1-options.impact.age*5)*5:0,shakeX=Math.sin(time*80)*shake;
  ctx.save();ctx.translate(view.x+shakeX,view.y);ctx.scale(scale,scale);
  // Continue only exterior soil beyond the world edge. Interior island gaps and
  // the collision polygons remain unchanged when the camera leaves a margin.
  for(const o of world.solids){
   const surface=o.kind==='floor'?o.poly.slice(0,-2).map(p=>({...p})):null;
   if(surface){const a=surface[0],b=surface.at(-1),left=(-view.x-shakeX-2)/scale,right=(w-view.x-shakeX+2)/scale;if(a.x<=.001&&left<a.x)surface.unshift({x:left,y:a.y});if(b.x>=999.999&&right>b.x)surface.push({x:right,y:b.y});}
   const bottomY=surface?Math.max(...o.poly.slice(-2).map(p=>p.y),(h-view.y)/scale+50):0,shape=surface?[...surface,{x:surface.at(-1).x,y:bottomY},{x:surface[0].x,y:bottomY}]:o.poly;
   if(o.kind==='bedrock'){const left=o.poly.filter(p=>p.x<=.001),right=o.poly.filter(p=>p.x>=999.999);ctx.fillStyle=biome.land;for(const [edge,xx,width]of [[left,(-view.x-shakeX-2)/scale,2],[right,1000,(w-view.x-shakeX+2)/scale-1000]])if(edge.length>=2){const yy=Math.min(...edge.map(p=>p.y));if(edge===left&&xx<0)ctx.fillRect(xx,yy,-xx+1,Math.max(0,(h-view.y)/scale-yy+10));if(edge===right&&width>0)ctx.fillRect(1000,yy,width,Math.max(0,(h-view.y)/scale-yy+10));}}
   polygon(shape);ctx.fillStyle=o.kind==='reflector'?'#527c94':o.kind==='crystal'?'#69b7ad':o.kind==='bridge'?'#998973':o.kind==='fragile'?'#9970aa':o.kind==='bedrock'?blend(biome.land,biome.sky[0],.4):o.kind==='roof'?'#41677c':'#536879';
   if(surface){const topY=Math.min(...surface.map(p=>p.y)),ground=ctx.createLinearGradient(0,topY,0,topY+300/scale);ground.addColorStop(0,blend(biome.land,'#d9e8c5',.15));ground.addColorStop(.22,biome.sky[0]+'d9');ground.addColorStop(1,biome.sky[0]);ctx.fillStyle=ground;}
   ctx.fill();
   if(surface){for(const depth of [15,42,88,148,220,300,410]){const points=surface.map((p,i)=>({x:p.x,y:p.y+depth+Math.sin(i*1.7+depth*.05)*6}));path(points,depth<40?'#d8f0d517':'#c1e3df0a',depth<40?2:1.5);}}
   if(!['floor','bedrock','fragile','reflector','crystal'].includes(o.kind)){
    const left=Math.min(...o.poly.map(p=>p.x)),right=Math.max(...o.poly.map(p=>p.x)),topY=Math.min(...o.poly.map(p=>p.y)),bottomY=Math.max(...o.poly.map(p=>p.y));
    ctx.save();polygon(o.poly);ctx.clip();const material=ctx.createLinearGradient(left,topY,right,bottomY);material.addColorStop(0,o.kind==='bridge'?'#b5a483':'#81949f');material.addColorStop(.28,o.kind==='bridge'?'#907f69':'#526c80');material.addColorStop(1,'#253f56');ctx.fillStyle=material;ctx.fillRect(left,topY,right-left,bottomY-topY);
    ctx.fillStyle='#132d4266';ctx.fillRect(Math.max(left,right-9),topY,9,bottomY-topY);
    for(let y=topY+24,row=0;y<bottomY;y+=30,row++){path([{x:left,y},{x:right,y}],'#132d4266',1.4/scale);for(let x=left+(row%2?20:0);x<right;x+=40)path([{x,y:y-29},{x,y}],'#c1d5d52e',1/scale);}
    ctx.restore();path(o.poly.slice(0,2),'#d8ead3',3/scale);path([o.poly[1],o.poly[2]],'#16384e',2/scale);
   }
   if(o.kind==='fragile'){const cx=o.poly.reduce((n,p)=>n+p.x,0)/o.poly.length,cy=o.poly.reduce((n,p)=>n+p.y,0)/o.poly.length;path([{x:cx-7,y:cy-15},{x:cx+4,y:cy-4},{x:cx-5,y:cy+4},{x:cx+6,y:cy+16}],'#f4d2ff',1.5/scale);}
   path(surface||[...o.poly,o.poly[0]],o.kind==='fragile'?'#e5c6f2':o.kind==='reflector'?'#dcfff1':o.kind==='crystal'?'#e5fff4':biome.edge,o.kind==='crystal'?5:o.kind==='reflector'?2.5/scale:3);
   if(o.kind==='reflector'){
    const a=o.poly[0],b=o.poly[1],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),nx=dy/length,ny=-dx/length;
    path([a,b],'#d9fff2',3.5/scale);
    for(let distance=16/scale;distance<length-7/scale;distance+=32/scale){const x=a.x+dx*distance/length,y=a.y+dy*distance/length;path([{x:x-dx/length*5/scale+nx*2/scale,y:y-dy/length*5/scale+ny*2/scale},{x:x+nx*6/scale,y:y+ny*6/scale},{x:x+dx/length*5/scale+nx*2/scale,y:y+dy/length*5/scale+ny*2/scale}],'#ccfff0',1.5/scale);}
   }
   if(o.kind==='crystal'){
    const a=o.poly[0],b=o.poly[1];path([{x:a.x+5,y:a.y+5},{x:b.x-5,y:b.y+5}],'#285f70',2,[7,7]);path([o.poly[0],o.poly[2]],'#e5fff4aa',2);
   }
   if(o.kind==='bridge'){
    circle(o.hinge.x,o.hinge.y,7,'#d9e8aa','#3b5762');
    const pad=G.surfaceAt(world,o.hinge.x-36,o.hinge.y);if(pad){circle(pad.x,pad.y-18,20,'#e7ffc012','#e7ffc04d');}
    const b=o.poly[1],len=Math.hypot(b.x-o.hinge.x,b.y-o.hinge.y),nextOpen=!o.open,aa=nextOpen?-75*Math.PI/180:0;
    path([o.hinge,{x:o.hinge.x+Math.cos(aa)*len,y:o.hinge.y+Math.sin(aa)*len}],'#e7ffc044',2,[8,8]);
   }
   if(o.kind==='roof'&&[35,65].includes(s.stage))for(const x of [o.poly[0].x+10,o.poly[1].x-10])path([{x,y:o.poly[0].y+15},{x,y:520}],biome.edge+'75',5);
  }
  for(const r of world.regions){
   if(r.kind==='M'){
    const active=r.on!==false&&(r.strength??1)>0;
    circle(r.x,r.y,r.radius,active?'#b1a4ff16':'#8790a00d',active?'#d9bdff88':'#a4afb333');
    if(!active){ctx.font=`700 ${18/scale}px system-ui`;ctx.fillStyle='#a4b3bc';ctx.textAlign='center';ctx.fillText('·',r.x,r.y+6/scale);continue;}
    for(let i=0;i<3;i++){const motion=options.reducedMotion?0:time*.2*r.direction;ctx.strokeStyle='#d6c2ff77';ctx.lineWidth=2;ctx.beginPath();ctx.arc(r.x,r.y,r.radius*(.4+i*.23),motion+i,motion+i+3.8);ctx.stroke();}
    const angle=(options.reducedMotion?0:time*.2*r.direction)+2,rr=r.radius*.86,dx=Math.cos(angle),dy=Math.sin(angle),tx=-dy*r.direction,ty=dx*r.direction,x=r.x+dx*rr,y=r.y+dy*rr;
    path([{x:x-tx*8/scale+dx*4/scale,y:y-ty*8/scale+dy*4/scale},{x,y},{x:x-tx*8/scale-dx*4/scale,y:y-ty*8/scale-dy*4/scale}],'#eee2ff',2/scale);
    ctx.font=`700 ${18/scale}px system-ui`;ctx.fillStyle='#ead9ff';ctx.textAlign='center';ctx.fillText(r.direction>0?'↻':'↺',r.x,r.y+6/scale);continue;
   }
   const width=r.x2-r.x1,height=r.y2-r.y1,active=r.on!==false;
   ctx.save();ctx.beginPath();ctx.rect(r.x1,r.y1,width,height);ctx.clip();
   if(r.kind==='C'){
    for(let row=0;row<3;row++){const x=r.x1+width*(row===1?.55:.46),y=r.y1+height*(.23+row*.27),rx=width*(row===1?.45:.4),ry=height*.23;
     ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);const puff=ctx.createRadialGradient(-.15,-.15,.1,0,0,1);puff.addColorStop(0,'#f6fcff77');puff.addColorStop(.6,'#eaf4ff60');puff.addColorStop(1,'#eaf4ff00');circle(0,0,1,puff);ctx.restore();}
   }else if(r.kind==='F'){
    const wind=ctx.createLinearGradient(r.x1,0,r.x2,0);wind.addColorStop(0,'#b5edf000');wind.addColorStop(.5,'#b5edf02b');wind.addColorStop(1,'#b5edf000');ctx.fillStyle=wind;ctx.fillRect(r.x1,r.y1,width,height);
    const direction=r.direction||1,drift=options.reducedMotion?0:(time*32)%50;
    for(let y=r.y1+14;y<r.y2-4;y+=30){ctx.strokeStyle='#d8f7eeaa';ctx.lineWidth=1.6/scale;ctx.beginPath();ctx.moveTo(r.x1+8,y);ctx.bezierCurveTo(r.x1+width*.3,y-9,r.x1+width*.65,y+9,r.x2-8,y);ctx.stroke();const x=direction>0?r.x1+width*.55+drift:r.x2-width*.55-drift;path([{x:x-direction*7/scale,y:y-4/scale},{x,y},{x:x-direction*7/scale,y:y+4/scale}],'#e4f9de',1.7/scale);}
   }else{
    const flow=ctx.createLinearGradient(0,r.y1,0,r.y2);flow.addColorStop(0,'#ffe5a300');flow.addColorStop(.7,active?'#ffe5a32e':'#ffe5a30b');flow.addColorStop(1,active?'#ffd79d55':'#ffd79d15');ctx.fillStyle=flow;ctx.fillRect(r.x1,r.y1,width,height);
    for(let x=r.x1+13;x<r.x2;x+=28){const y=r.y2-(options.reducedMotion?height*.5:((time*42+x)%Math.max(30,height)));path([{x,y:y+13},{x,y},{x:x-4/scale,y:y+5/scale}],active?'#f9edb6bb':'#b5b4a04d',1.8/scale);}
   }
   ctx.restore();
   if(r.kind==='V'){path([{x:r.x1+4,y:r.y2},{x:r.x2-4,y:r.y2}],active?'#ffdbac':'#7c848d',5/scale);for(let x=r.x1+10;x<r.x2-6;x+=15)path([{x,y:r.y2-4/scale},{x:x+4,y:r.y2+4/scale}],'#365366',2/scale);}
  }
  for(const t of world.terminals){circle(t.x,t.y,20,'#183d56','#e5c3ff');ctx.fillStyle='#e9ceff';ctx.font='22px system-ui';ctx.textAlign='center';ctx.fillText('↻',t.x,t.y+7);if(s.effects.pendingPolarity)path([{x:t.x,y:t.y},{x:t.x+35,y:t.y-35}],'#f6c9ff',3,[4,4]);}
  if(demonstration?.focus){const focus=demonstration.focus,radius=focus.radius||85,glow=ctx.createRadialGradient(focus.x,focus.y,0,focus.x,focus.y,radius);glow.addColorStop(0,'#f5ffc415');glow.addColorStop(1,'#f5ffc400');circle(focus.x,focus.y,radius,glow);}
  if(!lobby&&!localDemo&&s.telegraph){
   const t=s.telegraph,y=G.surfaceAt(s.world,t.targetX,s.units[0].y)?.y||s.units[0].y;
   path([{x:t.targetX-t.radius,y:y+5},{x:t.targetX+t.radius,y:y+5}],'#ffc09c',5,[7,6]);
   for(let x=t.targetX-t.radius;x<t.targetX+t.radius;x+=15)path([{x,y:y+14},{x:x+9,y:y+4}],'#ffccac',2);
   ctx.font=`700 ${14/scale}px system-ui`;ctx.textAlign='center';ctx.fillStyle='#ffe2c2';ctx.fillText('!',t.targetX,y+20/scale);
  }
  for(const item of s.pickups){if(localDemo&&demonstration.id!=='pickup')continue;if(!isArenaPickup(item)||demonstration?.plan?.events.some(e=>e.type==='pickup'&&e.id===item.id&&demoFlight>=e.t))continue;const y=item.y+(options.reducedMotion?0:Math.sin(time*Math.PI+item.x)*4);
   const trial=item.kind==='trial',ammo=item.kind==='ammo',skillBox=item.kind==='skill';ctx.save();ctx.translate(item.x,y);round(-22,-18,44,36,7,skillBox?'#536987':trial?'#6d7858':'#596b78');ctx.strokeStyle=trial?'#efffb8':'#d5efff';ctx.lineWidth=2/scale;ctx.strokeRect(-20,-16,40,32);
   if(trial){const look=appearance(item.weaponId);projectile({x:0,y:0},null,{...look,size:7*scale},scale,time);}else if(skillBox){root.ArcSkills.draw(ctx,item.skill,0,0,27);}else if(ammo){for(const x of [-8,2,12]){round(x-3,-10,6,21,2,'#e2f4c6');}}else{circle(0,0,6,'#f0ddff');}ctx.restore();

  }
  if(s.selectedSkill==='BLINK')s.blink.forEach((b,i)=>{circle(b.x,b.y-22,35,'#c9ffe42b','#efffd6');ctx.font='16px system-ui';ctx.fillStyle='#efffd6';ctx.fillText(String(i+1),b.x,b.y-54);});
  if(planning){
   const plan=guide||aimPlan(s),look=appearance(E.weapon(s).id),full=!!options.charging,difficulty=root.ArcAimGuide.normalize(options.difficulty||s.difficulty);
   if(!guideCache||guideCache.plan!==plan||guideCache.difficulty!==difficulty)guideCache={plan,difficulty,paths:root.ArcAimGuide.paths(plan,difficulty)};
   const visible=difficulty==='hard'?root.ArcAimGuide.direction(G.muzzle(s,0,s.angle),scale):guideCache.paths;
   ctx.save();ctx.beginPath();ctx.rect(-view.x/scale,(top-view.y)/scale,fieldW/scale,(bottom-top)/scale);ctx.clip();
   for(const b of visible){const points=b.path;if(!points.length)continue;
    const dots=[1/scale,7/scale];ctx.save();ctx.lineCap='round';ctx.globalAlpha=full?.72:.8;path(points,'#102d49aa',4/scale,dots);ctx.shadowColor=look.color;ctx.shadowBlur=2;path(points,look.color,2/scale,dots);ctx.shadowBlur=0;ctx.restore();
   }
   ctx.restore();
   if(full&&difficulty!=='hard'){
    const edgeY=(top-view.y)/scale,points=visible[0]?.path||[];let marks=0;
    for(let i=1;i<points.length&&marks<2;i++){const a=points[i-1],b=points[i];if((a.y-edgeY)*(b.y-edgeY)>=0)continue;const ratio=(edgeY-a.y)/(b.y-a.y),x=a.x+(b.x-a.x)*ratio,screenX=view.x+x*scale;if(screenX<10||screenX>fieldW-10)continue;
     const arrow=[{x:x-5/scale,y:edgeY+9/scale},{x,y:edgeY+4/scale},{x:x+5/scale,y:edgeY+9/scale}];path(arrow,'#17344d',5/scale);path(arrow,look.color,2/scale);marks++;
    }
   }
  }
  display={...display,units:display.units.map(u=>{if(!u.animation)return u;const a=u.animation,t=Math.min(1,a.age/a.duration),ease=a.fall?t*t:t*t*(3-2*t);return {...u,x:a.from.x+(u.x-a.from.x)*ease,y:a.from.y+(u.y-a.from.y)*ease-Math.sin(t*Math.PI)*a.lift};})};
  if(!lobby){for(let side=0;side<2;side++){const u=display.units[side];if(!showsUnit(u,side))continue;ctx.save();ctx.globalAlpha=.38;ctx.strokeStyle=side?'#ffb58f':'#dfffbd';ctx.lineWidth=2/scale;ctx.beginPath();ctx.ellipse(u.x,u.y+5,42,12,0,0,Math.PI*2);ctx.stroke();ctx.restore();}}
  if(!lobby){if(display.guardActive){const u=display.units[0];circle(u.x,u.y-25,48,null,'#c6efbd');root.ArcSkills.draw(ctx,'S_GUARD',u.x+38,u.y-60,18/scale);}if(s.repair&&s.phase==='repair'){const u=display.units[0];circle(u.x,u.y-25,(25+40*s.repair.age)/scale,null,'#b7f4c6');}const enemyShot=demonstration?.plan?.side===1?demonstration.plan:shot?.side===1?shot:options.tail?.shot?.side===1?options.tail.shot:null;if(showsUnit(display.units[0],0))rover(display,0,s.angle,options.cosmetic,localDemo?.9:1,options);if(showsUnit(display.units[1],1))rover(display,1,enemyShot?.angle??52,null,localDemo?.8:1,options);}
  if(!lobby)for(let side=0;side<2;side++)if(showsUnit(display.units[side],side))unitEffects(display,display.units[side],side,options,time,scale);
  if(options.encounter?.boss){
   const u=display.units[1],t=Math.min(1,options.encounter.age/(options.encounter.duration||1.1));
   ctx.save();ctx.globalAlpha=(1-t)*.7;circle(u.x,u.y-45,(55+60*t)/scale,null,'#ffe3bc');
   const core=G.muzzle(display,1,52);path([{x:core.x-16/scale,y:core.y-22/scale},{x:core.x,y:core.y-33/scale},{x:core.x+16/scale,y:core.y-22/scale}],'#ffdbb3',2/scale);ctx.restore();
  }
  if(options.ending){
   const end=options.ending,t=Math.min(1,end.age/1.2),u=display.units[end.winner===0?0:1];
   ctx.save();ctx.globalAlpha=Math.min(.8,t*.9);
   if(end.final){const x=display.units[1].x,y=display.units[1].y-77;for(let i=0;i<10;i++){const a=i*Math.PI/5-time*.12,dist=(35+Math.sin(t*Math.PI)*70)/scale;path([{x:x+Math.cos(a)*dist,y:y+Math.sin(a)*dist},{x:x+Math.cos(a)*(dist+15/scale),y:y+Math.sin(a)*(dist+15/scale)}],'#eaffc4',3/scale);}circle(x,y,(22+t*22)/scale,'#dcffbe11','#efffc3');}
   circle(u.x,u.y+5,(42+t*12),null,end.winner===0?'#eaffc1':'#ffc4a9');ctx.restore();
   for(const fallen of display.units.filter(unit=>unit.hp<=0)){
    ctx.save();for(let i=0;i<3;i++){const age=options.reducedMotion?.35:(end.age*.35+i*.28)%1,x=fallen.x+(i-1)*10/scale,y=fallen.y-25-age*28/scale;ctx.globalAlpha=(1-age)*.22;circle(x,y,(5+age*7)/scale,'#b2bdc8');}ctx.restore();
   }
  }
  if(!lobby&&showsUnit(display.units[1],1)&&s.spec.boss&&display.units[1].hp>0&&(display.units[1].exposed>0||s.effects.broken>0)){
   const u=display.units[1];ctx.save();ctx.textAlign='center';ctx.font=`800 ${10/scale}px system-ui`;ctx.fillStyle='#e9ffc9';ctx.strokeStyle='#243d4a';ctx.lineWidth=3/scale;const x=u.x+(u.facingCore||0)*20,y=u.y-118;ctx.strokeText('CORE ×2',x,y);ctx.fillText('CORE ×2',x,y);ctx.restore();
  }
  function shotAt(plan,t,alpha=1){
   const look=plan.side===1?{...appearance(plan.weaponId),color:'#ffab8c'}:appearance(plan.weaponId),rail=plan.weaponId==='W14'||plan.weaponId==='S_RIN';
   for(const b of plan.bullets){if(t<b.start)continue;let i=b.path.findIndex(p=>p.t>t);if(i<0)i=b.path.length;
    const points=b.path.slice(0,i),alive=t<=b.t;if(!points.length)continue;
    ctx.save();ctx.globalAlpha=alpha*.34;path(points,look.color,3/scale);
    const hot=alive?points.filter(p=>p.t>=t-(rail?.22:.48)):points;
    ctx.globalAlpha=alpha;ctx.shadowColor=look.color;ctx.shadowBlur=rail?22:13;
    path(hot,look.color,(rail?10:look.shape==='shell'?8:5.5)/scale);ctx.shadowBlur=0;
    path(hot,'#fffdf0',(rail?3:1.6)/scale);ctx.restore();
    if(plan.side===0&&trailColors[options.cosmetic])cosmeticTrail(hot,t,options.cosmetic,scale,options.reducedMotion,alpha);
    if(alive){const p=points.at(-1);projectile(p,points.at(-2),look,scale,Number.isFinite(t)?t:0);}
   }
   for(const e of plan.events)if(['cloud','updraft','wind','vent','magnet','phase','bounce','break','teleport-contact'].includes(e.type)&&t>=e.t&&t-e.t<.5){const colors={cloud:'#c6e4ff',updraft:'#f4e6b2',wind:'#b4e7e6',vent:'#ffd0a6',magnet:'#d7baff',phase:'#d0fff2',break:'#e6bdff','teleport-contact':'#bcecff',bounce:e.surface==='reflector'?'#c9fff0':'#ffffff'};ctx.save();ctx.globalAlpha=alpha*(1-(t-e.t)/.5);circle(e.x,e.y,(10+(t-e.t)*38)/scale,null,colors[e.type]);ctx.restore();}
   if(localDemo)for(const e of plan.events)if(e.type==='pickup'&&t>=e.t&&t-e.t<.75){const age=t-e.t;ctx.save();ctx.globalAlpha=1-age/.75;ctx.textAlign='center';ctx.font=`800 ${23/scale}px system-ui`;ctx.fillStyle='#e4ffc0';ctx.fillText('✓',e.x,e.y-(10+age*30)/scale);ctx.restore();}
   for(const e of plan.events)if(e.type==='wave'&&t>=e.t){ctx.save();ctx.globalAlpha=alpha;path(e.path,look.color,7/scale,[8/scale,5/scale]);ctx.restore();}
   for(const e of plan.events)if(e.type==='shockwave'&&t>=e.t&&t-e.t<.65){const age=(t-e.t)/.65,r=e.length*Math.min(1,age*2.5),a=e.halfAngle*Math.PI/180,base=e.direction<0?Math.PI:0;ctx.save();ctx.globalAlpha=alpha*(1-age);ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.arc(e.x,e.y,r,base-a,base+a);ctx.closePath();ctx.fillStyle=look.color+'30';ctx.fill();ctx.lineWidth=3/scale;ctx.strokeStyle=look.color;ctx.stroke();ctx.restore();}
   for(const e of plan.events)if(e.type==='pull'&&t>=e.t&&t-e.t<e.duration){const progress=(t-e.t)/e.duration;ctx.save();ctx.globalAlpha=alpha*(1-progress*.5);path([{x:e.from.x+(e.to.x-e.from.x)*progress,y:e.from.y+(e.to.y-e.from.y)*progress-22},{x:e.x,y:e.y}],look.color,3/scale,[5/scale,4/scale]);circle(e.x,e.y,(10+Math.sin(progress*Math.PI)*10)/scale,look.color+'44',look.color);ctx.restore();}
   for(const hit of plan.teleport?[]:plan.impacts||[])explosion(hit,t-hit.t,{...look,blast:hit.blast??look.blast},scale,options.reducedMotion,alpha);
   const enemy=1-plan.side,damage=plan.damage?.[enemy]||0;
   const marker=plan.impacts.find(i=>i.hit?.unit===enemy&&i.hit.kind==='weak')||plan.impacts.find(i=>i.hit?.unit===enemy)||plan.impacts.at(-1);
   if(!localDemo&&damage>0&&marker&&t>=marker.t&&t-marker.t<.9){const age=t-marker.t;ctx.save();ctx.globalAlpha=alpha*(1-age/.9);ctx.textAlign='center';ctx.font=`800 ${20/scale}px system-ui`;ctx.lineWidth=4/scale;ctx.strokeStyle='#19384c';ctx.fillStyle='#fff6c4';const special=!!ArcWeapons.get(plan.weaponId).special,label=(plan.events.some(e=>e.type==='critical')?(special?'CRITICAL':'CRITICAL ×1.5'):plan.events.some(e=>e.type==='weak')?(special?'CORE':'CORE ×2'):'HIT')+' · '+E.combat.points(damage);ctx.strokeText(label,marker.x,marker.y-(48+age*38)/scale);ctx.fillText(label,marker.x,marker.y-(48+age*38)/scale);ctx.restore();}
  }
  if(shot)shotAt(shot,flight,1);
  if(options.tail){const a=options.tail.age<.8?1:Math.max(0,1-(options.tail.age-.8)/.6);shotAt(options.tail.shot,options.tail.shot.duration+options.tail.age,a);}
  if(options.demo){
   const source=options.demo,parts=source.variants?.length||1,period=(source.duration||1.3)/parts,d=variant?{...source,...variant}:source,t=(source.age%period)/period;
   ctx.globalAlpha=.8;const u=s.units[0];
   if(d.state||d.before){
    const comparison=Array.isArray(d.comparison)?d.comparison:d.comparison?.path;
    if(comparison?.length&&d.phase!=='WATCH'){ctx.save();ctx.globalAlpha=.32;path(comparison,'#e4eef2',2/scale,[5/scale,8/scale]);ctx.restore();}
    if(d.plan&&(d.phase?d.phase!=='WATCH':source.age>=(d.flightStart||0))){const post=d.phase?(d.phase==='RESULT'?(d.resultAge??Math.min(.8,(d.effectProgress||0)*.8)):0):Math.max(0,source.age-(d.flightEnd??Infinity)),flightTime=d.flight??Math.max(0,source.age-(d.flightStart||0));shotAt(d.plan,flightTime+post,.95);}
   }
   else if(d.id==='slope'){const x=u.x+Math.sin(t*Math.PI)*100,p=G.surfaceAt(s.world,x,u.y);if(p){path([{x:u.x,y:u.y-55},{x,y:p.y-55}],'#ffffff',3,[4,4]);circle(x,p.y-25,24,'#ffffff44','#ffffff');}}
   else if(d.id==='BLINK'){for(const b of s.blink)circle(b.x,b.y-25,28,'#ffffff40','#ffffff');path([{x:u.x,y:u.y-30},{x:s.blink[0]?.x||u.x+100,y:(s.blink[0]?.y||u.y)-30}],'#fff',3,[5,6]);}
   else if(d.id==='SWAP'||d.id==='boss-swap'){const e=s.units[1];if(d.id==='boss-swap'){circle(e.x,e.y-77,42,'#ffffff44','#fff');ctx.font='30px system-ui';ctx.fillStyle='#fff';ctx.fillText('↻',e.x,e.y-75);}else{path([{x:u.x,y:u.y-60},{x:e.x,y:e.y-60}],'#fff',4,[6,10]);circle(u.x+(e.x-u.x)*t,u.y+(e.y-u.y)*t-25,25,'#ffffff44','#fff');circle(e.x+(u.x-e.x)*t,e.y+(u.y-e.y)*t-25,25,'#ffffff44','#fff');}}
   else if(['PUSH','PULL'].includes(d.id)){const e=s.units[1],dir=d.id==='PUSH'?1:-1;path([{x:e.x,y:e.y-20},{x:e.x+dir*t*72,y:e.y-20}],'#fff',4);circle(e.x+dir*t*72,e.y-20,25,'#ffffff40','#fff');}
   else if(d.plan&&!(d.id==='controls'&&d.age<(d.releaseAt||.95))){const progress=d.id==='controls'?Math.max(0,(d.age-(d.releaseAt||.95))/(d.duration-(d.releaseAt||.95))):t;shotAt(d.plan,Math.min(d.plan.duration,progress*d.plan.duration),.55);}
   ctx.globalAlpha=1;
  }
  if(options.impact&&!options.tail&&!shot)explosion(options.impact,options.impact.age,appearance(options.impact.weaponId),scale,options.reducedMotion);
  ctx.restore();
  if(!lobby&&!localDemo){for(let side=0;side<2;side++){const u=display.units[side],sy=view.y+(u.y-(side&&s.spec.boss?77:22))*scale,sx=view.x+u.x*scale;if(sy>=top+6&&sy<=bottom-6)continue;const y=sy<top?top+12:bottom-12,x=Math.max(30,Math.min(w-30,sx)),dir=sy<top?-1:1;ctx.save();round(x-28,y-11,56,22,7,'#10384cef');path([{x:x-6,y:y-dir*3},{x,y:y+dir*4},{x:x+6,y:y-dir*3}],side?'#ffd1ab':'#d8ffc8',2);ctx.restore();}}
  const fire=canvasRect(document.getElementById('fire'));
  if(!demonstration?.phase&&options.demo?.id==='controls'&&options.demo.age<(options.demo.releaseAt||.95)&&getComputedStyle(document.getElementById('fire')).visibility!=='hidden'){circle(fire.x+fire.width*.55,fire.y+fire.height*.6,11,'#ffffff88','#ffffff');circle(fire.x+fire.width*.55,fire.y+fire.height*.6,18,null,'#ffffff66');}
  // Preview labels are drawn in screen units so the taught contact stays legible
  // while the result camera moves closer. The reserved card never covers them.
  const annotation=demonstration?.annotation;
  if(annotation&&demonstration.phase!=='WATCH'&&Number.isFinite(annotation.x)&&Number.isFinite(annotation.y)&&annotation.x>=0&&annotation.x<=1000){
   const x=view.x+annotation.x*scale,y=view.y+annotation.y*scale,label=String(annotation.label||'').slice(0,34);
   ctx.save();ctx.beginPath();ctx.rect(0,top,w,Math.max(0,bottom-top));ctx.clip();
   const pulse=options.reducedMotion?0:Math.sin(time*5)*2;circle(x,y,15+pulse,'#e6ffc81a','#efffd0');
   if(label){ctx.font='750 13px system-ui';const bw=Math.min(w-24,ctx.measureText(label).width+22),bx=Math.max(12,Math.min(w-bw-12,x-bw/2)),by=Math.max(top+4,Math.min(bottom-34,y-52));path([{x,y:y-18},{x:Math.max(bx+10,Math.min(bx+bw-10,x)),y:by+28}],'#efffd0',1.5);round(bx,by,bw,29,8,'#113649ee');ctx.textAlign='center';ctx.fillStyle='#efffd0';ctx.fillText(label,bx+bw/2,by+19);}
   ctx.restore();
  }
  if(demonstration?.comparison&&demonstration.phase!=='WATCH'){
   const x=w-132,y=top+8;ctx.save();round(x,y,120,43,8,'#12384be8');ctx.font='650 11px system-ui';ctx.textAlign='left';ctx.fillStyle='#e8f5e4';
   path([{x:x+10,y:y+13},{x:x+33,y:y+13}],appearance(s.teleportMode?'TELEPORT':s.mode).color,3);ctx.fillText('Shot',x+42,y+17);
   path([{x:x+10,y:y+31},{x:x+33,y:y+31}],'#c2d2d7',2,[4,4]);ctx.fillText('No field',x+42,y+35);ctx.restore();
  }
  const cue=demonstration?.cue;
  if(cue&&['stick','aimStick','fire'].includes(cue.control)&&demonstration.phase==='WATCH'&&(cue.control!=='fire'||!document.getElementById('previewCharge'))){
   const x=64,y=top+49,axis=E.clamp(cue.axis||0,-1,1),vertical=cue.control==='aimStick';
   ctx.save();round(x-36,y-35,72,88,13,'#12384be8');circle(x,y,27,'#275368','#b7ddce');
   if(cue.control==='fire'){const value=E.clamp(((demonstration.pose?.power||20)-20)/80,0,1);ctx.lineWidth=4;ctx.strokeStyle='#e9ffc7';ctx.beginPath();ctx.arc(x,y,23,-Math.PI/2,-Math.PI/2+value*Math.PI*2);ctx.stroke();ctx.font='bold 34px system-ui';ctx.fillStyle='#e6ffc1';ctx.textAlign='center';ctx.fillText('ϟ',x,y+12);}
   else{const dx=vertical?0:axis*13,dy=vertical?-axis*13:0;path(vertical?[{x,y:y-20},{x,y:y+20}]:[{x:x-20,y},{x:x+20,y}],'#d7ecdc66',2);circle(x+dx,y+dy,13,'#7e9c9d','#edffd5');ctx.fillStyle='#eaffd1';ctx.font='bold 18px system-ui';ctx.textAlign='center';if(vertical){path([{x:x+dx-4,y:y+dy-6},{x:x+dx,y:y+dy-10},{x:x+dx+4,y:y+dy-6}],'#eaffd1',1.5);path([{x:x+dx-4,y:y+dy+6},{x:x+dx,y:y+dy+10},{x:x+dx+4,y:y+dy+6}],'#eaffd1',1.5);}else path([{x:x+dx-6,y:y+dy},{x:x+dx+6,y:y+dy}],'#eaffd1',2);}
   ctx.font='750 11px system-ui';ctx.textAlign='center';ctx.fillStyle='#eaffd1';ctx.fillText(cue.control==='fire'?'HOLD':vertical?'AIM':'MOVE',x,y+45);ctx.restore();
  }
  for(const effect of options.pickupEffects||[]){const t=Math.min(1,effect.age/.8),ease=t*t*(3-2*t),target=canvasRect(document.getElementById(effect.id[0]==='W'?'weaponToggle':'pause')),x=view.x+effect.x*view.scale,y=view.y+effect.y*view.scale;ctx.globalAlpha=1-t;circle(x+(target.x+target.width/2-x)*ease,y+(target.y+target.height/2-y)*ease-Math.sin(t*Math.PI)*30,9,'#f2ffb4','#ffffff');ctx.globalAlpha=1;}
 }
 function toWorld(x,y){const app=canvas.closest('#app')||canvas.parentElement,viewport=root.ArcViewport;if(viewport&&app){const p=viewport.point(x,y,app),c=viewport.rect(canvas,app);return {x:(p.x-c.x-view.x)/view.scale,y:(p.y-c.y-view.y)/view.scale};}const r=canvas.getBoundingClientRect();return {x:((x-r.left)*canvas.clientWidth/r.width-view.x)/view.scale,y:((y-r.top)*canvas.clientHeight/r.height-view.y)/view.scale};}
 return {draw,toWorld,get view(){return view;}};
}
root.ArcRender={create};
})(globalThis);
