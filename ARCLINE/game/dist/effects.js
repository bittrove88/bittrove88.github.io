(function(root){'use strict';
// Impact footprints retain the historical style; Ban shockwave follows its current collision cone.
const W=typeof module!=='undefined'?require('./weapons.js'):root.ArcWeapons;
const blastById=Object.freeze({S_GUN:165,S_BAN:0,S_HIBARI:145,S_HANA:90,S_RIN:45,S_MOGU:65,S_KORO:125,S_SORA:60,S_RICO:70,S_YUI:100});
const metrics=Object.freeze({trail:3,hot:5.5,shell:8,rail:10,core:1.6,railCore:3,impactStart:18,impactGrowth:76,sparkTravel:66,flashRadius:36,banWaveLength:140,banWaveHalfAngle:28});
function appearance(id){const w=W.get(id),a=w.appearance||{};return {...a,blast:blastById[id]??w.blast,weaponId:id};}
function impactBlast(plan,hit,look=appearance(plan.weaponId)){if(look.fx)return hit.blast??look.blast;return plan.weaponId==='S_RICO'?Math.min(150,70+20*plan.events.filter(e=>e.type==='bounce'&&e.bullet===hit.bullet&&e.t<=hit.t).length):W.get(plan.weaponId).special?look.blast:hit.blast??look.blast;}
function footprint(id,age,blast){const look=appearance(id),duration=look.shape==='shell'?1:look.shape==='needle'?.65:.9,t=Math.max(0,Math.min(1,age/duration)),size=Math.max(.55,Math.min(1.65,((blast??look.blast)||64)/64));return {duration,radius:(18+76*(1-Math.pow(1-t,3)))*size,trail:id==='W14'||id==='S_RIN'?10:look.shape==='shell'?8:5.5,projectile:look.size};}
const brushes=new WeakMap();
function forContext(ctx){if(brushes.has(ctx))return brushes.get(ctx);
 const path=(points,color,width=2,dash=[])=>{if(!points.length)return;ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.setLineDash([]);};
 function circle(x,y,r,color,stroke=null){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(color){ctx.fillStyle=color;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
 function round(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
 function star(x,y,r,color,rotation=0){ctx.beginPath();for(let i=0;i<10;i++){const a=rotation+i*Math.PI/5,rr=i%2?r*.4:r;const xx=x+Math.cos(a)*rr,yy=y+Math.sin(a)*rr;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.closePath();ctx.fillStyle=color;ctx.fill();}
 function sparks(x,y,r,count,color,width=1){for(let i=0;i<count;i++){const a=i*2.399,rr=r*(.6+(i%4)*.13);path([{x:x+Math.cos(a)*rr*.7,y:y+Math.sin(a)*rr*.7},{x:x+Math.cos(a)*rr,y:y+Math.sin(a)*rr}],color,width);}}
 function flower(x,y,r,color){for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ctx.beginPath();ctx.ellipse(x+Math.cos(a)*r*.5,y+Math.sin(a)*r*.5,r*.55,r*.28,a,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}circle(x,y,r*.17,'#ffe6a1');}
 function motif(name,x,y,r,color,t){ctx.save();ctx.translate(x,y);ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.fillStyle=color;
  if(name==='rope')for(let j=-1;j<=1;j+=2){const p=[];for(let i=-12;i<=12;i++)p.push({x:i*r/9,y:j*Math.sin(i*.5+t*5)*r*.3});path(p,color,1.4);}
  else if(name==='repair'||name==='grid'){for(let i=-1;i<=1;i++)ctx.strokeRect(i*r*.8-r*.3,-r*.3,r*.6,r*.6);if(name==='repair')path([{x:0,y:-r},{x:0,y:r}],color,2);}
  else if(name==='bell'||name==='mirror'){for(let i=1;i<=2;i++){ctx.beginPath();if(name==='bell')ctx.arc(0,0,r*i*.7,Math.PI*.15,Math.PI*.85);else{ctx.moveTo(0,-r*i*.6);ctx.lineTo(r*i*.6,0);ctx.lineTo(0,r*i*.6);ctx.lineTo(-r*i*.6,0);ctx.closePath();}ctx.stroke();}}
  else if(name==='lift'){for(let i=-1;i<=1;i++)path([{x:i*r*.6,y:r},{x:i*r*.6,y:-r},{x:i*r*.6-r*.2,y:-r*.7}],color,1.5);}
  else if(name==='wind')for(let j=-1;j<=1;j++){ctx.beginPath();ctx.moveTo(-r,j*r*.4);ctx.quadraticCurveTo(0,j*r*.6-r*.5,r,j*r*.4);ctx.stroke();}
  else if(name==='valve'||name==='magnet'){for(let i=0;i<3;i++){const a=t*3+i*2.094;circle(Math.cos(a)*r,Math.sin(a)*r,r*.18,name==='magnet'?(i%2?'#82cbed':'#e49298'):color);}circle(0,0,r*.55,null,color);}
  else if(name==='leaf'){ctx.rotate(t*.4);for(let j=-1;j<=1;j+=2){ctx.beginPath();ctx.ellipse(j*r*.5,0,r*.6,r*.25,j*.5,0,Math.PI*2);ctx.stroke();}}
  ctx.restore();
 }
 function lookFor(plan,b,t){const base={...appearance(plan.weaponId),...(plan.appearance||{}),...(b?.appearance||{}),stage:b?.stage||0};if(base.palette?.length)base.color=base.palette[(b?.id||0)%base.palette.length];if(base.fx==='meteor'&&!b?.primary)base.size*=.65;if(base.fx==='ricochet'){const n=plan.events.filter(e=>e.type==='bounce'&&e.bullet===b?.id&&e.t<=t).length;base.size*=Math.pow(1.5,Math.min(3,n));base.color=n>=3?'#ffffff':['#ec76bf','#7bdfe8','#ffda72'][n];base.rainbow=n>=3;}return base;}
 function projectile(p,previous,look,scale,time){
  const radius=look.size*(look.fx==='blackhole'?(look.effectScale||1):1)/scale,angle=previous?Math.atan2(p.y-previous.y,p.x-previous.x):0;
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
  ctx.shadowBlur=0;circle(0,0,radius*.35,look.core||'#fffef1');
  if(look.fx==='heavy'||look.fx==='gun'){for(let i=0;i<(look.fx==='gun'?8:3);i++){const a=time*17+i*2.399,xx=-radius*(1+i*.38),yy=Math.sin(a)*radius*(.5+i*.12);path([{x:xx,y:yy},{x:xx-radius*.5,y:yy+Math.cos(a)*radius*.7}],look.fx==='gun'?'#ffffff':'#ffd5aa',1.3/scale);}}
  if(look.fx==='meteor')star(0,0,radius*1.3,'#ecfbff',time*2);
  if(look.fx==='drain'){for(let i=0;i<3;i++){const a=time*6+i*Math.PI*2/3;circle(Math.cos(a)*radius*1.8,Math.sin(a)*radius*1.8,radius*.16,'#e0bbff');}}
  if(look.fx==='blackhole'||look.fx==='gravity'){circle(0,0,radius*1.1,'#100f27');ctx.save();ctx.rotate(time*2);ctx.strokeStyle=look.color;ctx.lineWidth=1.5/scale;ctx.beginPath();ctx.ellipse(0,0,radius*2,radius*.7,.4,0,Math.PI*2);ctx.stroke();ctx.restore();}
  if(look.rainbow)for(let i=0;i<7;i++){ctx.strokeStyle=['#ff7777','#ffb35f','#ffe875','#9ee37a','#72ddf4','#a2a0ff','#ef94f1'][i];ctx.lineWidth=2/scale;ctx.beginPath();ctx.arc(0,0,radius+i/scale, time*2+i*.7,time*2+i*.7+1.5);ctx.stroke();}
  if(look.motif)motif(look.motif,0,0,radius*1.7,look.color,time);
  if(look.fx==='water'||look.fx==='cloud'||look.fx==='ice'){for(let i=0;i<4;i++){const xx=-radius*(1.4+i*.7),yy=Math.sin(time*6+i)*radius*.6;if(look.fx==='ice')star(xx,yy,radius*.24,'#e4fbff',time);else circle(xx,yy,radius*(look.fx==='cloud'?.6:.2),'#ddf8ff');}}
  if(['stellar','finale','redirect','prism'].includes(look.fx)){ctx.save();ctx.rotate(time*2);for(let i=0;i<4;i++){const a=i*Math.PI/2;star(Math.cos(a)*radius*1.8,Math.sin(a)*radius*1.8,radius*.22,'#fff7da',a);}ctx.restore();}
  ctx.restore();
 }
 function explosion(impact,age,look,scale,reducedMotion,alpha=1){
  const duration=look.shape==='shell'?1:look.shape==='needle'?.65:.9;
  if(age<0||age>duration)return;const t=Math.min(1,age/duration),size=Math.max(.55,Math.min(look.fx?3.2:1.65,(look.blast||64)/64)),radius=(18+76*(1-Math.pow(1-t,3)))*size/scale;
  if(look.fx==='flower'){ctx.save();ctx.globalAlpha=alpha*(1-t);flower(impact.x,impact.y,(8+30*Math.sin(t*Math.PI*.75))/scale,look.color);sparks(impact.x,impact.y,(12+45*t)/scale,7,'#e8bf54',1.4/scale);ctx.restore();return;}
  if(look.fx==='ribbon'){ctx.save();ctx.globalAlpha=alpha*(1-t);circle(impact.x,impact.y,(8+24*t)/scale,look.color+'40','#e5fff7');sparks(impact.x,impact.y,(12+35*t)/scale,8,look.color,1.4/scale);ctx.restore();return;}
  if(look.fx==='shock'){ctx.save();ctx.translate(impact.x,impact.y);ctx.globalAlpha=alpha*(1-t);path([{x:-12/scale,y:0},{x:28/scale,y:0}],'#fff4df',3*(1-t)/scale);sparks(0,0,(9+20*t)/scale,5,look.color,1.4/scale);ctx.restore();return;}
  if(look.fx==='focus'){ctx.save();ctx.translate(impact.x,impact.y);ctx.globalAlpha=alpha*(1-t);const critical=impact.hit?.critical||impact.hit?.kind==='weak',height=(critical?115:28)*(1-t)/scale;path([{x:0,y:height*.2},{x:0,y:-height}],look.color,9*(1-t)/scale);path([{x:0,y:height*.2},{x:0,y:-height}],'#fffaff',3/scale);for(let i=0;i<8;i++){const a=i*2.399,d=(12+35*t)/scale;circle(Math.cos(a)*d,Math.sin(a)*d,Math.max(.5,2*(1-t))/scale,i%2?look.color:'#fffaff');}ctx.restore();return;}
  if(look.fx==='blackhole'){ctx.save();ctx.translate(impact.x,impact.y);ctx.globalAlpha=alpha*(1-t);const r=(35*(1-t)+5)*(look.effectScale||1)/scale;circle(0,0,r,'#100f27');for(let arm=0;arm<3;arm++){const points=[];for(let i=0;i<32;i++){const a=i*.2+arm*Math.PI*2/3-age*8,rr=r*(.15+i/20);points.push({x:Math.cos(a)*rr,y:Math.sin(a)*rr*.65});}path(points,arm?'#91e9d9':look.color,2/scale);}ctx.restore();return;}
  ctx.save();ctx.translate(impact.x,impact.y);ctx.globalAlpha=alpha*(1-t);
  if(look.motif){motif(look.motif,0,0,(12+35*t)/scale,look.color,age);sparks(0,0,(15+35*t)/scale,6,look.color,1/scale);ctx.restore();return;}
  if(['water','cloud','ice','gate','prism','flame','polarity','airstrike','stellar','redirect','gravity','finale'].includes(look.fx)){
   const r=(12+65*(1-Math.pow(1-t,3)))/scale*Math.max(.65,Math.min(1.8,(look.blast||70)/70));
   if(look.fx==='water'||look.fx==='flame'){const baseExplosion=look.fx==='flame'&&look.stage>0,height=(look.fx==='flame'?(baseExplosion?35:160):115)*Math.sin(Math.PI*Math.min(1,t*1.5))/scale;for(let i=-2;i<=2;i++)path([{x:i*7/scale,y:0},{x:i*12/scale,y:-height*(1-Math.abs(i)*.13)}],i%2?look.color:'#fff1d4',(8-Math.abs(i)*2)/scale);if(baseExplosion){ctx.beginPath();ctx.ellipse(0,0,r,r*.25,0,0,Math.PI*2);ctx.strokeStyle=look.color;ctx.lineWidth=5/scale;ctx.stroke();}else circle(0,0,r,null,look.color);}
   else if(look.fx==='cloud'){for(let i=0;i<7;i++){const a=i*2.399;circle(Math.cos(a)*r*.65,Math.sin(a)*r*.4,r*.4,look.color+'70');}circle(0,0,r*.7,null,'#f2fcff');}
   else if(look.fx==='ice'||look.fx==='prism'||look.fx==='gate'){for(let i=0;i<8;i++){const a=i*Math.PI/4,x=Math.cos(a)*r,y=Math.sin(a)*r;ctx.save();ctx.translate(x,y);ctx.rotate(a+age);ctx.strokeStyle=look.fx==='prism'?['#ff9cbb','#a7e3f4','#d7b9f3'][i%3]:look.color;ctx.strokeRect(-5/scale,-10/scale,10/scale,20/scale);ctx.restore();}}
   else if(look.fx==='polarity'){for(let i=0;i<10;i++){const a=i*Math.PI/5,d=r*(look.color==='#7fc9f0'?1-t:t),x=Math.cos(a)*d,y=Math.sin(a)*d;path([{x:x*.6,y:y*.6},{x,y}],look.color,2/scale);}}
   else if(look.fx==='gravity'){circle(0,0,(22*(1-t)+3)/scale,'#101322',look.color);for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(0,0,r,r*.3,i*Math.PI/3+age,0,Math.PI*2);ctx.strokeStyle=look.color;ctx.stroke();}}
   else{for(let i=0;i<3;i++){ctx.save();ctx.rotate(age*.5+i*Math.PI/3);ctx.strokeStyle=i?'#fff9df':look.color;ctx.lineWidth=(i?1:3)/scale;ctx.strokeRect(-r*.65,-r*.65,r*1.3,r*1.3);ctx.restore();}star(0,0,(18+10*(1-t))/scale,'#fff6d6',age);}
   sparks(0,0,r*1.2,12,look.color,1.4/scale);ctx.restore();return;
  }
  if(look.fx==='gun'||look.fx==='drill'){for(let i=0;i<6;i++){const a=i*2.399,rr=radius*(.3+t*.6),x=Math.cos(a)*rr,y=Math.sin(a)*rr*.45-25*t/scale;ctx.save();ctx.globalAlpha*=.16;circle(x,y,(12+30*t)/scale,'#66584e');ctx.restore();}for(let i=0;i<8;i++){const a=i*2.399,d=radius*(.4+t*.6),x=Math.cos(a)*d,y=Math.sin(a)*d*.6+40*t*t/scale;ctx.save();ctx.translate(x,y);ctx.rotate(a+t*3);ctx.fillStyle=i%2?'#bd8f5c':'#f6cb86';ctx.fillRect(-3/scale,-2/scale,6/scale,4/scale);ctx.restore();}}
  // Screen-space minimums make the same hit legible on a 320px phone and a tablet.
  circle(0,0,radius*.85,look.color+'20');ctx.lineWidth=Math.max(2,5*(1-t))/scale;
  ctx.strokeStyle=look.color;ctx.beginPath();ctx.ellipse(0,0,radius*(look.label==='RAIL'?1.45:1),radius*(look.label==='RAIL'?.16:.46),0,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle='#fff6d2';ctx.lineWidth=2/scale;ctx.beginPath();ctx.arc(0,0,radius*.72,0,Math.PI*2);ctx.stroke();
  if(t<.42){circle(0,0,36/scale,look.color+'80');circle(0,0,12/scale,'#fff6d2');}

  const count=reducedMotion?4:look.shape==='shell'?18:look.shape==='needle'?8:14;
  for(let i=0;i<count;i++){const a=i*2.399,dist=(14+66*t)*(1+(i%3)*.17)/scale;const x=Math.cos(a)*dist,y=Math.sin(a)*dist-35*t*(1-t)/scale;path([{x:x-Math.cos(a)*10*(1-t)/scale,y:y-Math.sin(a)*10*(1-t)/scale},{x,y}],i%3?'#fff1b8':look.color,Math.max(1,3*(1-t))/scale);}
  if(look.fx==='meteor'){for(let i=0;i<6;i++){const a=i*2.399;star(Math.cos(a)*radius*.7,Math.sin(a)*radius*.7,Math.max(1,8*(1-t))/scale,i%2?look.color:'#ffffff',age*2);}}
  if(look.fx==='wheel'){ctx.rotate(age*8);for(let i=0;i<8;i++){const a=i*Math.PI/4;path([{x:0,y:0},{x:Math.cos(a)*radius,y:Math.sin(a)*radius}],look.color,2/scale);}}
  if(look.fx==='gun'||look.fx==='drill')sparks(0,0,radius*1.5,reducedMotion?5:24,look.fx==='gun'?'#ffffff':'#ffd49b',2/scale);
  ctx.restore();
 }

 function finaleBeam(e,age,scale,reducedMotion,alpha,plan){
  if(age<-.14||age>e.duration+.18)return;
  const dx=e.to.x-e.from.x,dy=e.to.y-e.from.y,length=Math.hypot(dx,dy),w=e.width,fire=Math.max(0,age),fade=age<0?1:Math.max(0,Math.min(1,(e.duration+.18-age)/.18)),flare=reducedMotion?.25:Math.max(0,1-fire/.18),unitX=dx/length,unitY=dy/length;
  const contact=plan.events.find(q=>q.type==='damage'&&q.unit===0),focus=contact||e,reach=Math.max(w*2,(focus.x-e.from.x)*unitX+(focus.y-e.from.y)*unitY),front=reducedMotion?(age>=0?length:0):Math.min(length,Math.max(0,(reach+40)*(age+.1)/.1)),nose=Math.min(w*.45,front*.3),neck=Math.min(w*.78,front*.65);
  const shape=(half)=>{ctx.beginPath();ctx.moveTo(-14,0);ctx.bezierCurveTo(-4,-half*.08,neck*.12,-half*.1,neck*.33,-half*.3);ctx.bezierCurveTo(neck*.56,-half*.78,neck*.7,-half,neck,-half);ctx.lineTo(Math.max(neck,front-nose),-half);ctx.quadraticCurveTo(front-nose*.3,-half*.62,front+12,0);ctx.quadraticCurveTo(front-nose*.3,half*.62,Math.max(neck,front-nose),half);ctx.lineTo(neck,half);ctx.bezierCurveTo(neck*.7,half,neck*.56,half*.78,neck*.33,half*.3);ctx.bezierCurveTo(neck*.12,half*.1,-4,half*.08,-14,0);ctx.closePath();};
  ctx.save();ctx.translate(e.from.x,e.from.y);ctx.rotate(Math.atan2(dy,dx));
  if(front>2){
   ctx.save();shape(w/2);ctx.clip();ctx.globalAlpha=alpha*fade;
   const glow=ctx.createLinearGradient(0,-w/2,0,w/2);glow.addColorStop(0,'#ff8d1820');glow.addColorStop(.18,'#ffb23355');glow.addColorStop(.5,'#fff09ba0');glow.addColorStop(.82,'#ffb23355');glow.addColorStop(1,'#ff8d1820');ctx.fillStyle=glow;ctx.fillRect(-14,-w/2,front+30,w);
   const spiral=(foreground)=>{let segment=[];const finish=()=>{if(segment.length>1){ctx.globalAlpha=alpha*fade*(foreground?.98:.55);path(segment,foreground?'#f77c14':'#a9651844',w*(foreground?.14:.1));path(segment,foreground?'#ffd45c':'#f5af36',w*(foreground?.075:.045));if(foreground)path(segment,'#fff4b5',w*.023);}segment=[];};
    for(let x=5;x<=Math.min(front,3600);x+=5){const grow=Math.min(1,x/neck),phase=x/(w*1.6)*Math.PI*2-(reducedMotion?0:age*21),z=Math.cos(phase),y=Math.sin(phase)*w*.42*grow;if((z>=0)===foreground)segment.push({x,y});else finish();}finish();};
   spiral(false);
   ctx.globalAlpha=alpha*fade;const gold=ctx.createLinearGradient(0,-w*.24,0,w*.24);gold.addColorStop(0,'#ffb523');gold.addColorStop(.3,'#ffe487');gold.addColorStop(.5,'#ffffff');gold.addColorStop(.7,'#ffe487');gold.addColorStop(1,'#ffb523');ctx.fillStyle=gold;shape(w*(.2+flare*.045));ctx.fill();ctx.fillStyle='#fffff4';shape(w*(.055+flare*.025));ctx.fill();
   spiral(true);
   if(!reducedMotion)for(let i=0;i<9;i++){const x=(i*193+fire*2100)%Math.min(Math.max(1,front),2400),y=Math.sin(i*2.399)*w*.2;ctx.globalAlpha=alpha*fade*.65;path([{x,y},{x:x+45+flare*45,y:y+Math.sin(i)*2}],'#fffbdc',1.2/scale);}
   ctx.restore();
   if(!reducedMotion&&front<3600){ctx.globalAlpha=alpha*fade*.8;ctx.fillStyle='#fffbe6';ctx.beginPath();ctx.moveTo(front-18,-w*.12);ctx.lineTo(front+28,0);ctx.lineTo(front-18,w*.12);ctx.closePath();ctx.fill();}
  }
  const charge=age<0?1+age/.14:1,r=w*(.38+flare*.55)*Math.max(.1,charge),glow=ctx.createRadialGradient(0,0,0,0,0,r);glow.addColorStop(0,'#ffffef');glow.addColorStop(.2,'#fff5bf');glow.addColorStop(.5,'#ffca64a0');glow.addColorStop(1,'#ffa51000');ctx.globalAlpha=alpha*(age<0?charge*.8:.28+flare*.72);circle(-6,0,r,glow);circle(-6,0,(7+flare*17)*Math.max(.1,charge),'#fffde8');
  if(!reducedMotion){const travel=fire*1350;for(let i=0;i<3;i++){const x=travel-i*w*.9,q=(fire-i*.035)/.24;if(x<0||q<0||q>1)continue;ctx.globalAlpha=alpha*(1-q)*.7;ctx.strokeStyle=i?'#ffbd45':'#fff0b4';ctx.lineWidth=(3-i*.5)/scale;ctx.beginPath();ctx.ellipse(x,0,9+q*13,w*.23+q*w*.28,0,0,Math.PI*2);ctx.stroke();}
   if(age<0||fire<.17)for(let i=0;i<8;i++){const a=i*2.399+(age<0?charge:fire)*5,d=w*(age<0?.8*(1-charge)+.1:.2+fire*2);ctx.globalAlpha=alpha*(age<0?charge:flare)*.75;path([{x:Math.cos(a)*d,y:Math.sin(a)*d},{x:Math.cos(a)*d*.55,y:Math.sin(a)*d*.55}],'#ffe29b',1.6/scale);}
  }
  ctx.restore();
 }

 function draw(plan,t,options={}){
  if(!plan)return;const scale=options.scale||1,alpha=options.alpha??1,look={...appearance(plan.weaponId),...(plan.appearance||{})},rail=plan.weaponId==='W14'||plan.weaponId==='S_RIN';
  for(const b of plan.bullets){if(t<b.start||b.effect)continue;const look=lookFor(plan,b,t),points=b.path.filter(p=>p.t<=t);if(!points.length)continue;const alive=t<=b.t,next=b.path[points.length];if(alive&&next){const p=points.at(-1),q=(t-p.t)/(next.t-p.t||1);points.push({x:p.x+(next.x-p.x)*q,y:p.y+(next.y-p.y)*q,t});}const hot=points.filter(p=>p.t>=t-(look.fx?.3:.2)),tail=points.filter(p=>p.t>=t-(look.fx==='meteor'?.65:.45));
   ctx.save();ctx.globalAlpha=alpha*.2;path(tail,look.color,3/scale);ctx.globalAlpha=alpha;path(hot,look.color,(rail?10:look.shape==='shell'?8:5.5)/scale);path(hot,'#fffdf0',(rail?3:1.6)/scale);ctx.restore();if(alive)projectile(points.at(-1),points.at(-2),look,scale,t);
  }
  for(const e of plan.events){const age=t-e.t;
   if(e.type==='redirect'&&age>-.3&&age<.22){ctx.save();ctx.globalAlpha=alpha*.65;motif('mirror',e.x,e.y,12/scale,look.color,0);ctx.restore();}
   if(e.type==='final-beam'){finaleBeam(e,age,scale,options.reducedMotion,alpha,plan);continue;}
   if(age<0)continue;

   if(e.type==='converge'&&age<.18){ctx.save();ctx.globalAlpha=alpha*(1-age/.18);star(e.x,e.y,(10-30*age)/scale,'#fffaff',Math.PI/4);ctx.restore();}
   if(e.type==='reflect-split'&&age<.45){ctx.save();ctx.globalAlpha=alpha*(1-age/.45);for(let i=0;i<3;i++)sparks(e.x,e.y,(25+90*age)/scale,4,['#ff9cbb','#a7e3f4','#d7b9f3'][i],2/scale);ctx.restore();}
   if(['bounce','break','teleport-contact','terminal','magnet','wind','phase','cloud','updraft','vent'].includes(e.type)&&age<.5){ctx.save();ctx.globalAlpha=alpha*(1-age/.5);circle(e.x,e.y,(10+age*38)/scale,null,e.type==='break'?'#d4b6e5':e.type==='terminal'?'#f2b45f':'#8dddd0');ctx.restore();}
   if(e.type==='blast-zone'&&age<=e.fade){ctx.save();ctx.globalAlpha=alpha*.3*(1-age/e.fade);circle(e.x,e.y,e.radius,null,look.color);ctx.restore();}
   if(e.type==='wave'&&age<(e.duration||.7)+.3){const elapsed=Math.min(e.duration||0,age),points=e.duration?e.path.filter(p=>p.t<=e.t+elapsed):e.path;ctx.save();ctx.globalAlpha=alpha*Math.max(0,1-Math.max(0,age-(e.duration||.4))/.3);path(points,look.color,7/scale,[8/scale,5/scale]);ctx.restore();}
   if(e.type==='split'&&look.fx==='meteor'&&age<.65){ctx.save();ctx.globalAlpha=alpha*(1-age/.65);star(e.x,e.y,(20+50*age)/scale,'#f5fcff',age);sparks(e.x,e.y,(35+110*age)/scale,24,look.color,2/scale);ctx.restore();}
   if(e.type==='ring'&&age<=e.duration+.35){const progress=Math.max(0,Math.min(1,age/e.duration)),fade=Math.max(0,1-Math.max(0,age-e.duration)/.35),r=e.radius*progress,points=[];ctx.save();ctx.globalAlpha=alpha*.25*fade;circle(e.x,e.y,r,null,look.color);ctx.globalAlpha=alpha*(1-progress*.35)*fade;if(look.fx==='ribbon'){const phase=progress*Math.PI*2+(e.ringIndex||0)*Math.PI,loop=Array.from({length:65},(_,i)=>({x:e.x+Math.cos(i*Math.PI/32)*r,y:e.y+Math.sin(i*Math.PI/32)*r}));path(loop,look.color,5/scale);path(loop,'#edfffa',1.4/scale);for(let q=0;q<=1.0001;q+=.02){const a=phase-(1-q)*Math.PI*.7;points.push({x:e.x+Math.cos(a)*r,y:e.y+Math.sin(a)*r});}path(points,look.color,7/scale);path(points,'#edfffa',2/scale);if(points.length)circle(points.at(-1).x,points.at(-1).y,4/scale,'#ffffff');}else{ctx.lineWidth=4/scale;circle(e.x,e.y,r,null,look.color);circle(e.x,e.y,Math.max(0,r-5/scale),null,'#fff7dd');for(let i=0;i<4;i++){const a=i*Math.PI/2;star(e.x+Math.cos(a)*r,e.y+Math.sin(a)*r,4/scale,'#fff7dd',a);}}ctx.restore();}
   if(e.type==='final-collapse'&&age<=e.duration){const q=age/e.duration;ctx.save();ctx.globalAlpha=alpha*(1-q);circle(e.x,e.y,(12*(1-q)+1)/scale,'#152136',look.color);sparks(e.x,e.y,(25*(1-q)+2)/scale,8,'#fff2ce',1/scale);ctx.restore();}
   if(e.type==='drain'&&age<=e.duration){const q=age/e.duration;ctx.save();for(let i=0;i<7;i++){const t=Math.max(0,Math.min(1,q-i*.035)),x=e.x+(e.to.x-e.x)*t,y=e.y+(e.to.y-e.y)*t-Math.sin(t*Math.PI)*35;ctx.globalAlpha=alpha*(1-Math.abs(t-.5)*1.2);circle(x,y,(3+i%2)/scale,i%2?'#d8b5ff':look.color);}ctx.restore();}
   if(e.type==='gravity-well'&&age<=e.duration){const progress=age/e.duration,r=(19-5*progress)*(look.effectScale||1)/scale;ctx.save();ctx.translate(e.x,e.y);ctx.globalAlpha=alpha*.18;circle(0,0,e.radius,null,look.color);ctx.globalAlpha=alpha;for(let i=0;i<22;i++){const a=i*2.399+age*5,d=e.radius*(1-((progress*.9+i/22)%1));circle(Math.cos(a)*d,Math.sin(a)*d*.65,(1.5+i%3*.5)/scale,i%3?'#8fddce':'#e7fff5');}for(let arm=0;arm<3;arm++){const points=[];for(let i=0;i<32;i++){const a=i*.18+arm*Math.PI*2/3-age*6,d=r*(.3+i/10);points.push({x:Math.cos(a)*d,y:Math.sin(a)*d*.6});}path(points,arm?'#64c8b9':'#dbfff2',(arm?2:3)/scale);}circle(0,0,r,'#100e24');ctx.strokeStyle='#8fd9cf';ctx.lineWidth=2/scale;ctx.beginPath();ctx.ellipse(0,0,r*1.6,r*.55,-.3,0,Math.PI*2);ctx.stroke();ctx.restore();}
   if(e.type==='shockwave'&&age<(e.duration||.65)){const a=age/(e.duration||.65),r=e.length*(e.duration?a:Math.min(1,a*2.5)),half=e.halfAngle*Math.PI/180,base=e.direction<0?Math.PI:0;ctx.save();ctx.globalAlpha=alpha*(1-a*.8);ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.arc(e.x,e.y,r,base-half,base+half);ctx.closePath();ctx.fillStyle=look.color+'24';ctx.fill();ctx.lineWidth=4/scale;ctx.strokeStyle=look.color;ctx.stroke();ctx.beginPath();ctx.arc(e.x,e.y,r,base-half,base+half);ctx.strokeStyle='#ffe2ca';ctx.lineWidth=1.5/scale;ctx.stroke();ctx.restore();}
   if(e.type==='pull'&&age<e.duration){const a=age/e.duration;ctx.save();ctx.globalAlpha=alpha*(1-a*.5);path([{x:e.from.x+(e.to.x-e.from.x)*a,y:e.from.y+(e.to.y-e.from.y)*a-22},{x:e.x,y:e.y}],look.color,(look.fx==='blackhole'?1.5:3)/scale,[5/scale,4/scale]);if(look.fx!=='blackhole')circle(e.x,e.y,(10+Math.sin(a*Math.PI)*10)/scale,look.color+'44',look.color);ctx.restore();}
  }
  for(const hit of plan.teleport?[]:plan.impacts||[]){if(hit.beam)continue;const b=plan.bullets.find(b=>b.id===hit.bullet),itemLook=lookFor(plan,b,hit.t);explosion(hit,t-hit.t,{...itemLook,blast:impactBlast(plan,hit,itemLook)},scale,options.reducedMotion,alpha);}
 }
 const api=Object.freeze({projectile,explosion,draw});brushes.set(ctx,api);return api;
}
const api=Object.freeze({version:1,metrics,appearance,impactBlast,footprint,forContext});if(typeof module!=='undefined')module.exports=api;else root.ArcEffects=api;
})(globalThis);
