(function(root){
'use strict';
const node=typeof module!=='undefined',V=node?require('./visual-style.js'):root.ArcVisualStyle,N=node?require('./encounters.js'):root.ArcEncounters,I=V.colors.ink,S=V.colors.steel,T=V.colors.cream;
function mix(a,b,t){const h=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16)),x=h(a),y=h(b);return '#'+x.map((v,i)=>Math.round(v+(y[i]-v)*t).toString(16).padStart(2,'0')).join('');}
const palettes=Object.freeze(Object.fromEntries(N.all.map(a=>[a.id,Object.freeze({color:a.color,shade:mix(a.color,I,.3),light:mix(a.color,T,.28),trim:T,accent:a.kind==='normal'?'#c2b283':'#dba164'})])));
function chassis(d,c,w=72,wheels=false,phase=0){
 if(wheels){for(const x of[-w*.32,w*.31])d.wheel(x,-10,11,phase,c.shade);}else d.track(-w/2,-20,w,20,phase,Math.max(4,Math.round(w/18)));
 d.poly([-w/2-2,-22,-w*.33,-35,w*.3,-35,w/2+2,-22,w*.37,-14,-w*.4,-14],c.shade);
 d.poly([-w*.35,-34,w*.26,-34,w*.41,-24,w*.24,-20,-w*.4,-23],c.color);d.line([-w*.3,-23,w*.24,-23],c.light,1.5);
 for(const x of[-w*.3,w*.25])d.bolt(x,-26,1.2);
}
function cabin(d,c,x=-14,y=-51,w=29,h=24){d.rect(x,y,w,h,3,c.color);d.poly([x+2,y+1,x+w-3,y+1,x+w-6,y+h*.5,x+3,y+h*.5],c.light);d.rect(x+5,y+5,w*.3,h*.38,1,S);d.rect(x+7,y+7,3,3,.3,'#b9d5d0',null);d.bolt(x+w-5,y+h-5,1);}
function foot(d,c,x,y=0){d.poly([x-14,y,x-11,y-8,x+9,y-8,x+15,y],c.shade);d.rect(x-9,y-7,18,4,1,c.color);}
function arm(d,c,a,b,width=9){const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,nx=-dy/len*width/2,ny=dx/len*width/2;d.poly([a[0]+nx,a[1]+ny,b[0]+nx,b[1]+ny,b[0]-nx,b[1]-ny,a[0]-nx,a[1]-ny],c.color);d.oval(a[0],a[1],width*.4,width*.4,c.accent);d.oval(b[0],b[1],width*.4,width*.4,S);}
function horn(d,c,x,y,r=20){d.poly([x-27,y-7,x+2,y-r,x+2,y+r,x-27,y+7],c.trim);d.oval(x+2,y,7,r,c.shade);d.oval(x+3,y,4,r*.75,S);d.rect(x-31,y-6,9,12,2,c.color);}
function prism(d,c,x,y,r=26){const pts=[x,y-r,x+r*.75,y-r*.35,x+r*.8,y+r*.5,x,y+r,x-r*.8,y+r*.5,x-r*.7,y-r*.35];d.poly(pts,c.trim);d.poly([x,y-r,x+r*.75,y-r*.35,x,y+2],c.light);d.poly([x,y+2,x+r*.75,y-r*.35,x+r*.8,y+r*.5,x,y+r],c.color);d.poly([x,y+2,x-r*.7,y-r*.35,x-r*.8,y+r*.5,x,y+r],c.shade);}
function fan(d,c,x,y,r){d.oval(x,y,r,r,c.trim);d.oval(x,y,r*.78,r*.78,S);for(let i=0;i<4;i++){const a=i*Math.PI/2;d.poly([x,y,x+Math.cos(a)*r*.62,y+Math.sin(a)*r*.62,x+Math.cos(a+.6)*r*.48,y+Math.sin(a+.6)*r*.48],c.light);}d.oval(x,y,r*.2,r*.2,c.accent);}
function magnet(d,c,x,y,r=19){d.poly([x-r,y-r,x-r*.5,y-r,x-r*.5,y+r*.3,x+r*.5,y+r*.3,x+r*.5,y-r,x+r,y-r,x+r,y+r*.7,x+r*.5,y+r,x-r*.5,y+r,x-r,y+r*.7],c.color);d.rect(x-r-1,y-r-2,r*.55,r*.45,1,c.trim);d.rect(x+r*.5,y-r-2,r*.55,r*.45,1,c.trim);}
function drill(d,c,x,y,len=48,r=17){d.poly([x,y-r,x+len,y,x,y+r],S);for(let i=0;i<5;i++){const xx=x+i*len/6,rr=r*(1-i/6);d.line([xx,y-rr,xx+len/10,y+rr],c.light,2.4);}d.oval(x,y,5,r,c.trim);}
function cannon(d,c,x,y,len=44,r=8){d.rect(x,y-r,len,2*r,2,S);d.rect(x+len*.32,y-r-1,7,2*r+2,1,c.trim);d.rect(x+len-7,y-r-2,7,2*r+4,2,c.color);d.oval(x+len,y,3,r,I,c.trim,1);}
function normal(ctx,d,c,key,u,o){
 if(key==='pebble')return false;
 const wheels=['gust','mist','volt','blast'].includes(key);chassis(d,c,key==='blast'?83:70,wheels,u.x*.13);
 switch(key){
  case 'slate':cabin(d,c,-19,-57,33,29);d.rect(-32,-42,12,15,1,c.shade);arm(d,c,[10,-27],[34,-25],7);d.poly([23,-39,43,-38,48,-5,21,-9],c.trim);d.poly([29,-34,40,-34,42,-11,27,-13],c.light);d.line([24,-9,48,-5],S,2);break;
  case 'spike':cabin(d,c,-21,-47,40,21);d.oval(0,-39,8,8,S);arm(d,c,[-28,-17],[-40,-2],6);arm(d,c,[27,-17],[40,-2],6);foot(d,c,-40);foot(d,c,40);d.rect(-13,-53,22,10,2,c.color);break;
  case 'flint':d.poly([-33,-28,-26,-43,16,-43,29,-29],c.color);d.rect(-12,-49,33,16,2,c.shade);d.rect(-9,-47,23,7,1,c.light);d.rect(8,-51,9,4,1,c.trim);d.vent(-26,-33,3,true);break;
  case 'mole':cabin(d,c,-27,-57,39,31);d.rect(-31,-39,9,12,1,c.trim);d.rect(14,-49,14,20,2,S);d.vent(16,-45,3);d.rect(-7,-62,10,5,1,c.accent);break;
  case 'riff':cabin(d,c,-26,-44,33,22);d.rect(-2,-60,7,24,1,S);prism(d,c,5,-64,21);d.rect(-25,-29,14,5,1,c.trim);break;
  case 'gust':cabin(d,c,-28,-46,31,26);d.rect(-20,-62,3,17,1,S);d.oval(-19,-65,4,4,c.accent);d.rect(5,-47,24,14,2,c.color);fan(d,c,17,-47,22);break;
  case 'pole':cabin(d,c,-31,-52,34,27);arm(d,c,[-2,-32],[4,-66],12);arm(d,c,[4,-66],[29,-54],12);magnet(d,{...c,color:'#ab6854'},31,-38,15);break;
  case 'hang':cabin(d,c,-28,-39,40,17);d.rect(-6,-66,13,33,2,S);arm(d,c,[-10,-64],[40,-65],13);d.rect(26,-69,12,8,1,c.trim);arm(d,c,[35,-57],[44,-11],5);foot(d,c,44);break;
  case 'mist':cabin(d,c,-30,-46,40,22);d.rect(-26,-53,17,7,1,c.trim);horn(d,c,25,-39,23);d.rect(-20,-25,10,4,1,c.accent);break;
  case 'volt':cabin(d,c,-21,-45,34,23);d.poly([-33,-26,-28,-36,3,-37,23,-28],c.light);d.rect(-3,-54,19,11,2,c.color);d.rect(1,-58,10,4,1,c.accent);d.vent(-23,-31,2,true);break;
  case 'blast':cabin(d,c,-31,-49,39,25);d.rect(12,-48,20,20,2,c.color);d.rect(-34,-26,25,6,1,c.shade);d.vent(-28,-43,3,true);break;
 }
 return true;
}
function midboss(ctx,d,c,key,u,o){
 if(key==='harbor-knot')return false;
 chassis(d,c,100,false);cabin(d,c,-34,-49,33,25);
 switch(key){
  case 'bridge-mender':
   for(const [x,sgn]of[[-28,-1],[25,1]]){d.rect(x-4,-85,8,47,1,S);arm(d,c,[x,-82],[x+sgn*26,-69],10);d.rect(x+sgn*26-9,-70,18,22,1,c.trim);d.line([x+sgn*26-6,-66,x+sgn*26+6,-66,x+sgn*26+6,-53,x+sgn*26-6,-53],c.color,1.5);}d.line([-32,-53,-5,-53],c.accent,3);break;
  case 'mist-bell':d.rect(-16,-81,4,38,1,S);for(const x of[-28,-2])d.oval(x,-80,9,9,c.trim);d.line([-24,-80,-5,-80],S,3);horn(d,c,28,-45,28);d.oval(-30,-54,13,13,c.color);break;
  case 'reflect-ram':d.rect(-1,-46,11,16,2,S);prism(d,c,12,-64,40);d.rect(-44,-40,7,18,2,c.accent);break;
  case 'lift-mole':
   d.rect(-4,-99,8,71,1,S);d.rect(7,-99,7,71,1,c.trim);d.line([1,-92,10,-92,1,-81,10,-81,1,-70,10,-70],c.light,1.5);d.rect(20,-67,32,4,1,c.color);d.line([20,-67,20,-86,52,-86,52,-67],c.accent,3);for(const x of[26,34,42])d.line([x,-84,x,-69],c.trim,1);d.rect(-36,-70,19,7,1,c.trim);d.line([-27,-68,-27,-47],S,7);break;
  case 'gale-scout':d.rect(-24,-89,4,43,1,S);d.rect(16,-91,4,58,1,S);d.oval(-34,-79,8,8,c.trim);d.oval(-11,-79,8,8,c.shade);d.line([-30,-79,-15,-79],S,3);d.poly([20,-87,56,-76,49,-58,20,-65],c.trim);d.poly([20,-87,34,-83,31,-62,20,-65],c.color);break;
  case 'cinder-chef':d.rect(-6,-68,52,44,8,c.color);d.oval(20,-65,25,9,c.light);d.rect(-25,-63,13,34,1,c.accent);d.rect(-28,-67,19,6,2,c.shade);d.rect(7,-83,25,16,4,c.color);d.oval(19,-84,15,6,c.accent);d.rect(7,-47,23,14,2,c.shade);d.line([11,-43,25,-43],c.accent,3);break;
  case 'ore-shepherd':arm(d,c,[-3,-38],[10,-69],14);arm(d,c,[10,-69],[35,-59],12);magnet(d,{...c,color:'#d88343'},34,-40,19);d.rect(-33,-56,21,9,1,c.trim);break;
  case 'bloom-tender':
   for(const [x,h]of[[-3,73],[24,62]]){arm(d,c,[x-9,-31],[x-9,-h],8);arm(d,c,[x-9,-h],[x+18,-h+9],8);d.rect(x+14,-h+6,12,9,2,c.trim);}d.rect(-32,-66,11,20,2,c.trim);for(const x of[-35,-27,-20])d.poly([x,-32,x-5,-42,x,-46,x+3,-41,x+4,-34],'#5c8e67');break;
  case 'line-warden':d.rect(-12,-78,13,42,2,S);d.rect(-24,-84,35,18,3,c.color);d.oval(12,-75,6,8,S);arm(d,c,[6,-34],[33,-41],10);d.poly([19,-60,41,-57,53,-6,20,-8],c.trim);d.poly([25,-55,37,-52,44,-15,26,-17],c.shade);break;
 }
 return true;
}
function giant(ctx,d,c,key,u,o){
 if(key==='polaris-core')return false;
 const phase=o.state?.bossPhase||0;
 if(!['cloudray','skycarrier'].includes(key)){d.track(-64,-21,128,22,0,7);d.poly([-65,-25,-47,-44,44,-44,65,-25,54,-17,-54,-17],c.shade);}
 switch(key){
  case 'tideclaw':
   cabin(d,c,-28,-65,53,31);d.poly([-43,-28,-30,-58,33,-58,48,-27],c.color);d.rect(-26,-74,9,10,2,c.accent);d.rect(-8,-72,27,6,2,c.trim);
   arm(d,c,[14,-35],[40,-61],19);d.poly([32,-68,29,-89,44,-105,57,-101,66,-88,55,-83,48,-92,42,-85,45,-66],c.color);d.poly([48,-55,62,-49,71,-28,63,-15,49,-19,42,-30,47,-36,54,-25,60,-25,58,-36,47,-42],c.accent);break;
  case 'gatekeeper':
   d.rect(-39,-70,77,43,3,c.trim);cabin(d,c,-20,-88,35,22);d.rect(-55,-58,19,56,2,c.shade);d.rect(-51,-55,11,49,1,c.color);d.rect(33,-58,27,55,2,c.trim);d.rect(40,-53,9,47,1,c.color);d.rect(-21,-63,49,18,2,c.color);cannon(d,c,7,-61,51,6);cannon(d,c,-2,-79,48,6);break;
  case 'cloudray':
   d.poly([-88,-47,-25,-62,0,-78,25,-62,88,-47,39,-27,-39,-27],c.color);d.poly([-88,-47,-34,-48,-9,-35,-46,-39],c.trim);d.poly([88,-47,34,-48,9,-35,46,-39],c.trim);d.poly([-25,-62,0,-78,25,-62,15,-40,-15,-40],c.trim);d.rect(-10,-93,20,22,2,c.color);d.line([0,-94,0,-107],S,2);d.rect(-35,-25,70,8,2,c.shade);break;
  case 'prism-guardian':
   d.rect(-49,-32,98,14,3,c.trim);d.rect(-46,-60,15,39,3,c.color);d.rect(31,-60,15,39,3,c.color);prism(d,c,0,-64,43);d.oval(0,-64,43,46,null,S,3);d.rect(-58,-42,10,21,2,c.accent);d.rect(48,-42,10,21,2,c.trim);break;
  case 'dust-driller':
   d.rect(-48,-62,93,34,5,c.color);cabin(d,c,-39,-63,31,29);d.poly([16,-54,51,-44,55,-27,7,-27],c.trim);drill(d,c,23,-43,61,23);d.rect(-43,-77,12,17,2,S);d.rect(-47,-81,21,6,2,c.accent);d.vent(-20,-51,4,true);break;
  case 'whitehowl':
   d.poly([-53,-24,-39,-55,35,-55,52,-24],c.trim);cabin(d,c,-18,-73,35,25);for(const x of[-43,43]){fan(d,c,x,-56,25);d.rect(x-5,-32,10,14,2,c.color);}d.poly([-62,-23,-43,-24,-35,-3,-64,-3],c.trim);d.poly([-35,-24,-15,-24,-9,-3,-38,-3],c.trim);break;
  case 'forge-titan':
   d.rect(-30,-83,60,62,7,c.color);d.oval(0,-82,28,10,c.shade);d.rect(-22,-70,44,13,2,c.accent);d.rect(-21,-51,42,20,3,c.shade);d.rect(-15,-47,30,12,2,'#e5a35f');for(const x of[-44,44]){d.poly([x-14,-52,x+9,-58,x+15,-23,x-12,-19],c.color);d.rect(x-8,-48,12,20,2,c.shade);}d.rect(-13,-97,26,12,3,S);break;
  case 'skycarrier':
   d.poly([-90,-65,-65,-78,73,-78,91,-60,67,-39,-61,-39],c.trim);d.poly([-88,-62,88,-62,67,-39,-61,-39],c.color);d.rect(-20,-93,37,17,2,c.color);d.line([-8,-94,-8,-109],S,2);for(const x of[-54,0,54]){d.rect(x-12,-34,24,18,2,c.shade);d.rect(x-9,-31,18,11,1,c.color);d.line([x,-40,x,-34],S,3);d.bolt(x,-24,1.5);}for(const x of[-65,-46,-27,30,50,68])d.rect(x,-72,8,4,1,c.color);break;
  case 'archeart':
   for(const sgn of[-1,1]){const x=sgn*45;d.poly([x-18,-13,x-20,-78,x-3,-97,x+14,-85,x+18,-15],c.trim);d.poly([x-10,-18,x-12,-74,x+2,-83,x+9,-72,x+9,-17],c.color);}
   d.oval(0,-64,39,43,c.shade);d.oval(0,-64,31,35,c.trim);d.oval(0,-64,24,28,c.color);if(phase===0){d.poly([-27,-91,-5,-96,-5,-35,-26,-39],c.shade);d.poly([27,-91,5,-96,5,-35,26,-39],c.shade);}else if(phase===1){d.oval(0,-64,34,38,null,c.accent,3);for(const x of[-29,29])d.rect(x-5,-83,10,37,3,c.trim);}else d.oval(0,-64,23,26,c.light);break;
 }
 return true;
}
function damage(ctx,d,c,u,o){
 const def=o.definition;if(!def||def.kind==='normal')return;const parts=u.parts||[],dir=o.dir||1,core=u.core||def.core;
 for(const p of parts){const x=p.dx,y=p.dy;if(p.hp>0){d.oval(x,y,6,7,c.accent,I,1);d.line([x-4,y-3,x+4,y+3],c.trim,1);for(let n=0;n<Math.ceil(p.maxHp);n++)d.rect(x-5+n*6,y-p.radius-6,4,2,.4,n<p.hp?c.accent:S,null);}if(p.hp<=0){const r=p.radius*.82;d.poly([x-r,y-r*.45,x-r*.35,y-r*.85,x+r*.4,y-r*.73,x+r,y-r*.12,x+r*.65,y+r*.65,x-r*.15,y+r*.8,x-r*.85,y+r*.2],S);d.poly([x-8,y-6,x,y-10,x+8,y-3,x+5,y+7,x-7,y+5],S);d.line([x-8,y-6,x+3,y-1,x-2,y+6],V.colors.crack,1.4);}else if(p.hp<p.maxHp){d.line([x-7,y-9,x+1,y-3,x-4,y+4,x+6,y+8],V.colors.crack,1.1);}}
 if(core&&(!o.state?.spec.midboss||parts.some(p=>p.hp<=0)||u.exposed>0)){
  const x=core.x,y=core.y,exposed=parts.some(p=>p.hp<=0)||u.exposed>0||o.state?.bossPhase===2;
  d.oval(x,y,exposed?13:9,exposed?14:10,exposed?'#b8dec3':'#75b5be',I,1.2);d.oval(x,y,exposed?6:4,exposed?8:5,exposed?'#e0e6bd':'#b0d3cd',null);
 }
}
function draw(ctx,id,u,o={}){
 const def=N.get(id);if(!def)return false;if(['pebble','harbor-knot','polaris-core'].includes(def.key))return false;
 const c=palettes[id],d=V.brush(ctx,c,o),handled=def.kind==='normal'?normal(ctx,d,c,def.key,u,o):def.kind==='midboss'?midboss(ctx,d,c,def.key,u,o):giant(ctx,d,c,def.key,u,o);
 if(handled)damage(ctx,d,c,u,{...o,definition:def});return handled;
}
function drawWeapon(ctx,id,m,o={}){
 const def=N.get(id);if(!def||def.key==='pebble')return false;const c=palettes[id],d=V.brush(ctx,c,o),len=Math.hypot(m.x-m.pivot.x,m.y-m.pivot.y);
 ctx.save();ctx.translate(m.pivot.x,m.pivot.y);ctx.rotate(m.theta);
 if(def.kind!=='normal'){
  if(['prism-guardian','reflect-ram','polaris-core','archeart'].includes(def.key)){d.rect(-4,-5,len,10,2,S);d.oval(len,0,5,7,c.light,I,1);}
  else if(['gale-scout','whitehowl'].includes(def.key)){d.rect(-4,-5,len,10,2,S);fan(d,c,len,0,9);}
  else if(['mist-bell'].includes(def.key))horn(d,c,len-2,0,12);
  else if(def.key==='harbor-knot'){d.line([-4,0,len,0],c.accent,3);d.oval(len,0,3,3,c.trim);}
  else cannon(d,c,-3,0,len+3,5);
 }else if(def.key==='riff'){prism(d,c,len,0,14);d.rect(-6,-5,len-1,10,2,S);}
 else if(def.key==='gust'){d.rect(-5,-5,len,10,2,S);fan(d,c,len,0,13);}
 else if(def.key==='pole'){d.rect(-6,-6,len-3,12,2,S);magnet(d,c,len,0,11);}
 else if(def.key==='mist'){d.rect(-7,-5,len*.55,10,2,S);horn(d,c,len-2,0,17);}
 else if(def.key==='mole')drill(d,c,0,0,len,12);
 else cannon(d,c,0,0,len,def.key==='flint'?3:def.key==='blast'?12:def.key==='spike'?7:5);
 ctx.restore();return true;
}
const api=Object.freeze({palettes,draw,drawWeapon,damage});if(node)module.exports=api;else root.ArcActorBodies=api;
})(globalThis);
