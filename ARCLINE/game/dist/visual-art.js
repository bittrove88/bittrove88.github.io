(function(root){
'use strict';
const node=typeof module!=='undefined',V=node?require('./visual-style.js'):root.ArcVisualStyle,R=node?require('./visual-registry.js'):root.ArcVisualRegistry,B=node?require('./actor-bodies.js'):root.ArcActorBodies;
const C=V.colors;
const palettes=Object.freeze({pebble:Object.freeze({color:'#c7b58d',shade:'#9b896c',light:'#e2d5b3',trim:'#ddd4b8',accent:'#6e929c'}),harbor:Object.freeze({color:'#32778b',shade:'#245263',light:'#5995a1',trim:'#e8d3a1',accent:'#eb803d'}),polaris:Object.freeze({color:'#308eae',shade:'#1a607f',light:'#6db6c7',trim:'#e8dfc3',accent:'#9ddfdd'})});
const flatten=points=>points.flatMap(p=>[p.x,p.y]);
function line(ctx,points,color,px,dpr=1,dash=[]){if(points.length<2)return;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=color;ctx.lineWidth=px*V.unit(ctx,dpr);ctx.setLineDash(dash.map(n=>n*V.unit(ctx,dpr)));ctx.stroke();ctx.setLineDash([]);}
function shape(ctx,points,fill,stroke=C.ink,px=1.5,dpr=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=px*V.unit(ctx,dpr);ctx.stroke();}}
function pebble(d,c,time){
 d.track(-35,-18,70,18,time,4);d.poly([-36,-20,-25,-33,16,-35,30,-25,35,-17,18,-14,-27,-14],c.shade);
 d.poly([-23,-33,-10,-38,16,-35,28,-25,16,-22,-31,-22],c.color);d.poly([-11,-37,4,-38,16,-35,10,-25,-4,-25],c.trim);
 d.poly([-20,-27,-16,-53,9,-54,19,-31,15,-26],c.color);d.poly([-16,-51,-5,-54,8,-53,14,-36,2,-35,-15,-38],c.light);
 d.rect(-9,-49,10,13,1,C.steel);d.rect(-6,-46,3,6,.4,'#c0d9d7',null);d.rect(10,-29,14,5,1,c.accent);d.line([-28,-23,-20,-23],c.trim,2);
 for(const [x,y]of[[-13,-32],[7,-31],[23,-23],[-29,-18]])d.bolt(x,y,1.1);d.vent(-23,-19,2,true);
}
function pebbleBarrel(ctx,m,c,options){
 const d=V.brush(ctx,c,options);ctx.save();ctx.translate(m.pivot.x,m.pivot.y);ctx.rotate(m.theta);
 d.rect(-9,-6,22,12,3,c.color);d.rect(8,-4.2,25,8.4,1.7,C.steel);d.rect(18,-5.4,7,10.8,1,c.trim);d.rect(29,-6,6,12,1,c.shade);d.oval(35,0,2.8,5,C.ink,c.trim,1.2);d.line([10,-2,16,-2],C.steelLight,1);ctx.restore();
}
function harbor(d,c,time,options){
 d.track(-49,-18,99,18,time,6);d.poly([-47,-22,-33,-46,21,-47,47,-26,49,-17,-45,-17],c.shade);
 d.poly([-37,-46,-26,-63,5,-62,24,-43,22,-23,-34,-24],c.color);d.poly([-28,-59,-10,-61,2,-40,16,-25,1,-24,-22,-35],c.light);
 d.poly([-11,-59,1,-59,20,-42,19,-26,6,-26,-1,-41],c.trim);d.rect(-28,-46,10,13,1,C.steel);d.rect(-25,-43,4,5,1,c.accent);d.rect(-39,-26,11,7,1,c.accent);d.rect(28,-32,15,8,1,c.accent);
 // Fixed crane, exposed joints and hanging guide: no raster or shiny gradients.
 d.poly([-29,-52,-30,-73,-18,-80,-9,-65,-16,-53],C.steel);d.poly([-23,-76,26,-84,38,-78,-17,-68],c.shade);d.poly([-19,-76,27,-82,32,-77,-17,-71],c.color);d.oval(-20,-73,4,4,c.accent);d.oval(29,-79,4,4,c.accent);
 d.line([35,-77,40,-64,40,-56],C.steel,3);d.oval(40,-53,3,4,c.accent);d.rect(-37,-71,3,19,.7,C.steel);d.rect(-38,-73,5,4,1,c.accent);
 // The winch is the proposed weak point. Its connection to combat is deferred.
 d.oval(24,-35,25,27,C.steel);d.oval(27,-35,21,25,c.accent);d.oval(30,-35,13,21,c.shade);d.oval(32,-35,7,15,C.steel);d.oval(32,-35,3,8,c.trim);
 for(const x of[10,14,18])d.line([x,-57,x-3,-48,x-3,-24,x,-14],c.trim,1.8);
 d.poly([42,-57,48,-52,48,-44,43,-38,40,-38,42,-48,37,-53],c.accent);d.poly([42,-12,48,-17,47,-25,42,-30,39,-29,42,-20,37,-16],c.accent);
 for(const [x,y]of[[-34,-29],[-18,-54],[4,-46],[-13,-25],[35,-24]])d.bolt(x,y,1.2);
 if(options.damaged)d.line([23,-48,30,-43,24,-34,29,-28],C.crack,2.2);
}
function polaris(ctx,d,c,u,options){
 const parts=[...(u.parts||[])].sort((a,b)=>a.dx-b.dx),broken=parts.filter(p=>p.hp<=0).length;
 for(const [i,sgn]of[[-1,-1],[1,1]]){const p=parts[i<0?0:1]||{dx:sgn*58,dy:-35,hp:2},dead=p.hp<=0,x=p.dx,y=p.dy;
  d.poly([x-22,-1,x-18,-12,x+16,-12,x+23,-2],dead?C.steel:c.shade);d.rect(x-15,-10,30,8,2,dead?C.steel:c.color);d.oval(x-7,-5,3,3,C.rubber);d.oval(x+7,-5,3,3,C.rubber);
  d.poly([sgn*30,-79,x+sgn*9,y-5,x-sgn*6,y+5,sgn*27,-64],dead?C.steel:c.shade);d.poly([x-9,-12,x-12,y-14,x+4,y-18,x+12,-12],dead?C.steel:c.trim);
  d.poly([x+4,-12,x+2,y-10,x+10,y-8,x+17,-13],dead?C.steel:c.color);d.oval(x,y,13,15,dead?C.steel:c.color);d.oval(x,y,7,9,dead?'#3f515b':c.accent);d.oval(x,y,3,5,dead?'#71828a':c.trim);
  if(dead)d.line([x-9,y-5,x-2,y+1,x+4,y-8,x+10,y-4],C.crack,1.6);else d.bolt(x-8,y+7,1.1);
 }
 d.oval(0,-77,40,42,c.trim);ctx.save();ctx.beginPath();ctx.ellipse(0,-77,40,42,0,0,Math.PI*2);ctx.clip();
 d.poly([-42,-90,-29,-100,29,-100,42,-90,43,-77,-43,-77],c.color,null);d.poly([-42,-80,42,-80,42,-62,-42,-62],c.shade,null);d.poly([-40,-58,40,-58,30,-42,-28,-42],c.color,null);d.poly([-35,-47,-13,-39,13,-39,32,-47,31,-42,-28,-42],c.shade,null);
 for(const x of[-28,-16,16,28])d.oval(x,-77,x===-28||x===28?2.5:3,3.2,c.accent,C.ink,.8);d.line([-27,-100,27,-100],C.ink,1.3);d.line([-31,-57,31,-57],C.ink,1.3);ctx.restore();
 d.oval(0,-77,40,42,null);d.rect(-10,-121,20,7,3,c.color);d.rect(-3,-130,6,10,1,c.trim);d.oval(0,-131,2.5,2.5,c.accent);
 d.rect(-13,-39,26,8,2,c.shade);d.rect(-7,-30,14,7,2,c.color);d.rect(-7,-18,14,9,2,c.shade);d.rect(-4,-16,8,5,1,c.accent);
 const coreX=u.core?.x||0;
 d.oval(coreX,-77,15,16,broken?'#bde9d4':'#5bbfc6');d.oval(coreX,-77,8,9,broken?'#e0efcc':'#a0dddc',C.ink,1);d.rect(-4,-108,8,6,1,c.accent);
 for(const [x,y]of[[-17,-109],[18,-109],[-20,-48],[20,-48]])d.bolt(x,y,1);
}
function legacy(d,c,u,kind,m,options){
 if(kind==='boss'){d.rect(-54,-26,108,25,8,C.steel);d.rect(-40,-67,80,44,7,c.color);d.oval(0,-77,23,23,c.trim);for(const p of u.parts||[])d.oval(p.dx,p.dy,p.radius||20,p.radius||20,p.hp>0?c.color:C.steel);}
 else{d.track(-32,-18,64,18,0,4);d.poly([-33,-19,-19,-34,19,-34,33,-19],c.shade);d.rect(-15,-45,30,24,6,c.color);}
}
function drawActor(ctx,id,u,options={}){
 const kind=options.kind||id.split(':')[0],actor=R.resolve(id,kind),state=options.state,G=root.ArcEngine?.geometry,side=options.side||0,dir=options.muzzle?.bodyDir||u.facing||options.dir||options.muzzle?.dir||(state?(state.units[1-side].x>=u.x?1:-1):1),slope=u.slope||0;
 const muzzle=options.muzzle||(state&&G?G.muzzle(state,side,options.angle??48):root.ArcCharacters?.pose({x:u.x,y:u.y,dir,slope,angle:options.angle??32}));
 ctx.save();try{
  ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowBlur=0;
  if(actor.kind==='player'&&actor.artStatus!=='fallback'&&root.ArcCharacters){const result=root.ArcCharacters.draw(ctx,actor.key,{x:u.x,y:u.y,dir,slope,travel:options.travel??u.x,muzzle,alpha:options.alpha??1,disabled:u.hp<=0,artStyle:options.artStyle||'matte',dpr:options.dpr||1,detail:options.detail||'battle'});return {...result,drawnId:actor.id,source:actor.source};}
  ctx.globalAlpha*=options.alpha??1;if(u.hp<=0)ctx.filter='grayscale(.85)';ctx.translate(u.x,u.y);ctx.rotate(slope);ctx.scale(dir,1);
  const localUnit={...u,parts:(u.parts||[]).map(p=>({...p,dx:p.localX??p.dx*dir}))};
  const c=actor.key==='harbor-knot'?palettes.harbor:actor.key==='polaris-core'?palettes.polaris:palettes.pebble,d=V.brush(ctx,c,options);
  if(B?.draw(ctx,id,localUnit,{...options,dir,state})){}
  else if(actor.key==='pebble')pebble(d,c,options.travel??u.x*.13);
  else if(actor.key==='harbor-knot'){harbor(d,c,options.time||0,{...options,damaged:u.parts?.some(p=>p.hp<p.maxHp)});B?.damage(ctx,d,c,localUnit,{...options,state,definition:root.ArcEncounters?.get(id)});}
  else if(actor.key==='polaris-core'){
   // Parts are world offsets. Mirror them into the body's local coordinate so
   // the same visible generator remains on its actual physics anchor.
   polaris(ctx,d,c,localUnit,options);
  }else legacy(d,c,u,kind,muzzle,options);
 }finally{ctx.restore();}
 if(actor.key!=='pebble'&&muzzle)B?.drawWeapon(ctx,id,muzzle,options);
 if(actor.key==='pebble'&&muzzle){ctx.save();try{pebbleBarrel(ctx,muzzle,palettes.pebble,options);}finally{ctx.restore();}}
 return {drawnId:actor.artStatus==='fallback'?actor.id:actor.id,source:actor.source,muzzle:muzzle?{x:muzzle.x,y:muzzle.y}:null,proposedWeakPoint:actor.key==='harbor-knot'?{...(state&&G?G.actorPoint(state,side,24,-35):{x:u.x+dir*24,y:u.y-35}),radius:18,connected:state?.spec.encounterId===id}:null};
}
const sampleThemes=Object.freeze({shore:{sky:['#183c50','#b0c9bf'],ground:['#a9a17e','#87856b','#6e7967'],edge:'#d9d4ad'},cave:{sky:['#1a3447','#829a99'],ground:['#8c977e','#657d76','#455e60'],edge:'#c4d4b8'},polarity:{sky:['#172d43','#517583'],ground:['#798d86','#536b6d','#334e59'],edge:'#b7d2cb'}});
const materialRows=[
 ['#a9a17e','#87856b','#c9c5a2'],['#9c9b86','#707f76','#d3d9bb'],['#a6ab94','#798f82','#d7e4cd'],['#879c93','#5b7c79','#bddbd0'],['#98a699','#6a8380','#c7d9c6'],
 ['#9aa49a','#69827e','#d2ddd0'],['#a6a398','#7b8584','#e1ddc5'],['#b2a294','#857e81','#e4d2bc'],['#a69c84','#7d7f72','#d9caa3'],['#8b9680','#637f72','#c3d6b2'],
 ['#bbc9c5','#8da7ad','#e4e9d8'],['#aebcba','#7f9ca3','#e0e7d8'],['#a48e76','#7b695d','#d6ba8d'],['#9b937c','#726d62','#d3c0a1'],['#949c8e','#647d79','#d2d9bc'],
 ['#798d86','#536b6d','#b7d2cb'],['#94ab8b','#657f71','#d4dfae'],['#8f9f9c','#617c83','#d5dfcf'],['#9a9d91','#697d7c','#d4d7bc'],['#a9aa95','#7b8d80','#e4dfb3']
];
const themes=Object.freeze({...sampleThemes,...Object.fromEntries(materialRows.map(([a,b,c],i)=>[i,Object.freeze({sky:sampleThemes.shore.sky,ground:[a,b,c],edge:c})]))});
function backdrop(ctx,w,h,theme){
 const grad=ctx.createLinearGradient(0,0,0,h);grad.addColorStop(0,theme.sky[0]);grad.addColorStop(1,theme.sky[1]);ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#e3dfbb';ctx.globalAlpha=.65;ctx.beginPath();ctx.arc(w*.77,h*.2,Math.min(w,h)*.055,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 for(let layer=0;layer<3;layer++){const points=[{x:0,y:h}];for(let i=0;i<=12;i++){const x=w*i/12,y=h*(.4+layer*.13)+Math.sin(i*.9+layer)*h*.03+Math.cos(i*1.7-layer)*h*.025;points.push({x,y});}points.push({x:w,y:h});shape(ctx,points,[theme.ground[0]+'24',theme.ground[1]+'35',theme.ground[2]+'43'][layer],null);}
 ctx.save();ctx.globalAlpha=.17;ctx.fillStyle=theme.edge;for(const [x,y,s]of[[w*.17,h*.49,1],[w*.72,h*.4,.7],[w*.9,h*.52,.85]]){ctx.fillRect(x,y-28*s,8*s,28*s);ctx.fillRect(x+20*s,y-42*s,7*s,42*s);shape(ctx,[{x:x-12*s,y},{x:x+40*s,y},{x:x+32*s,y:y-12*s},{x:x-6*s,y:y-12*s}],theme.edge,null);}ctx.restore();
}
function drawSolid(ctx,o,world,options={}){
 const dpr=options.dpr||1,theme=themes[options.theme]||themes.shore,d=V.brush(ctx,{color:theme.ground[0],shade:theme.ground[1]},options),p=o.poly.map(p=>({...p}));
 ctx.save();try{
  if(o.kind==='reflector'){
   const mid={x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2-.5};
   if(world.solids.some(other=>other.id!==o.id&&other.kind!=='reflector'&&root.ArcEngine.geometry.inside(mid,other.poly)))return;
   shape(ctx,p,'#6eaaa2',C.ink,1.5,dpr);line(ctx,p.slice(0,2),C.reflect,2,dpr);
   const a=p[0],b=p[1],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
   for(let s=14;s<len-8;s+=28){const x=a.x+dx*s/len,y=a.y+dy*s/len;line(ctx,[{x:x-dx*4/len,y:y-dy*4/len},{x:x+nx*4,y:y+ny*4}],'#355b60',.8,dpr);}return;
  }
  if(o.kind==='bridge'){
   shape(ctx,p,'#8b9690',C.ink,1.5,dpr);const a=p[0],b=p[1],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);line(ctx,[a,b],C.cream,2,dpr);
   for(let s=14;s<len-10;s+=22){const x=a.x+dx*s/len,y=a.y+dy*s/len;line(ctx,[{x,y:y+2},{x:x-dy*7/len,y:y+dx*7/len}],'#415c66',.8,dpr);}d.oval(o.hinge.x,o.hinge.y,9,9,'#bcaa76');d.oval(o.hinge.x,o.hinge.y,3,3,C.steel);d.line([o.hinge.x-5,o.hinge.y-5,o.hinge.x+5,o.hinge.y+5],C.cream,1);d.oval(o.hinge.x-15,o.hinge.y+4,2.5,2.5,o.open?C.warning:C.reflect);return;
  }
  if(o.kind==='crystal'){
   const foot=p[0].y>p[1].y?p[0]:p[1],pad=root.ArcEngine.geometry.surfaceAt(world,foot.x,foot.y+50);
   if(pad&&pad.y>=foot.y&&pad.y-foot.y<60){d.poly([foot.x-4,foot.y,foot.x+4,foot.y,foot.x+7,pad.y-3,foot.x-7,pad.y-3],C.steel);d.rect(foot.x-14,pad.y-4,28,5,1,'#b9b499');}
   shape(ctx,p,'#5eaaa3',C.ink,1.5,dpr);line(ctx,p.slice(0,2),'#b5ded1',2.2,dpr);d.oval((p[0].x+p[1].x)/2,(p[0].y+p[1].y)/2,5,5,C.steel);return;
  }
  const surface=o.kind==='floor'?p.slice(0,-2):null;
  if(surface&&options.view){const v=options.view,left=-v.x/v.scale-3,right=(options.width-v.x)/v.scale+3;if(surface[0].x<=.001&&left<surface[0].x)surface.unshift({x:left,y:surface[0].y});if(surface.at(-1).x>=999.999&&right>surface.at(-1).x)surface.push({x:right,y:surface.at(-1).y});const bottom=Math.max(...p.map(p=>p.y),(options.height-v.y)/v.scale+8);p.splice(0,p.length,...surface,{x:surface.at(-1).x,y:bottom},{x:surface[0].x,y:bottom});}
  const fragile=o.kind==='fragile',palette=fragile?['#9678a5','#755e85','#b59ac1']:theme.ground;
  if(o.kind==='bedrock'&&options.view&&p.some(q=>q.y>=525)){
   const v=options.view,left=-v.x/v.scale-2,right=(options.width-v.x)/v.scale+2;
   if(p.filter(q=>q.x<=.001).length>=2&&left<0)for(const q of p)if(q.x<=.001)q.x=left;
   if(p.filter(q=>q.x>=999.999).length>=2&&right>1000)for(const q of p)if(q.x>=999.999)q.x=right;
  }
  shape(ctx,p,palette[0],C.ink,1.5,dpr);ctx.save();shape(ctx,p,null,null);ctx.clip();
  const left=Math.min(...p.map(q=>q.x)),right=Math.max(...p.map(q=>q.x)),top=Math.min(...p.map(q=>q.y)),bottom=Math.max(...p.map(q=>q.y)),span=right-left;
  shape(ctx,[{x:left,y:top+(bottom-top)*.46},{x:left+span*.34,y:top+(bottom-top)*.39},{x:right,y:top+(bottom-top)*.62},{x:right,y:bottom},{x:left,y:bottom}],palette[1],null);
  shape(ctx,[{x:left,y:top},{x:left+span*.27,y:top+15},{x:left+span*.42,y:top+45},{x:left,y:top+32}],palette[2],null);
  if(fragile){const x=(left+right)/2,y=(top+bottom)/2;line(ctx,[{x:x-9,y:y-21},{x:x+3,y:y-8},{x:x-5,y:y+3},{x:x+10,y:y+13},{x:x+4,y:y+28}],C.crack,1.1,dpr);line(ctx,[{x:x-5,y:y+3},{x:x-18,y:y+7}],C.crack,.75,dpr);}
  else for(let n=0;n<3;n++){const yy=top+26+n*28;line(ctx,[{x:left-2,y:yy},{x:left+span*.26,y:yy+5},{x:left+span*.6,y:yy+1},{x:right+2,y:yy+9}],theme.edge+'25',.65,dpr);}
  ctx.restore();
  const supports=world.surfaces.filter(s=>s.solidId===o.id||s.id===o.id);for(const s of supports)line(ctx,s.points,fragile?'#c6accf':theme.edge,1,dpr);
 }finally{ctx.restore();}
}
function drawRegion(ctx,r,options={}){
 const dpr=options.dpr||1,active=r.on!==false&&(r.strength??1)>0,time=options.reducedMotion?0:options.time||0;
 ctx.save();try{
  if(r.kind==='M'){
   const device=V.brush(ctx,{},options);device.rect(r.x-11,r.y+5,22,9,2,C.steel);device.poly([r.x-8,r.y+5,r.x-8,r.y-9,r.x-3,r.y-9,r.x-3,r.y,r.x+3,r.y,r.x+3,r.y-9,r.x+8,r.y-9,r.x+8,r.y+5],active?'#bb8379':'#788a8a');
   const color=active?(r.direction>0?'#83bccb':'#d09a9f'):'#8e9c9f';ctx.fillStyle=color+(active?'18':'08');ctx.strokeStyle=color;ctx.lineWidth=V.unit(ctx,dpr);ctx.setLineDash(active?[]:[4*V.unit(ctx,dpr),5*V.unit(ctx,dpr)]);ctx.beginPath();ctx.arc(r.x,r.y,r.radius,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.setLineDash([]);
   if(active)for(let i=0;i<3;i++){const a=i*2.094+time*.3*r.direction,rad=r.radius*(.52+i*.14);ctx.globalAlpha=.45;ctx.strokeStyle=color;ctx.beginPath();ctx.arc(r.x,r.y,rad,a,a+1.5);ctx.stroke();const b=a+1.5,x=r.x+Math.cos(b)*rad,y=r.y+Math.sin(b)*rad,tx=-Math.sin(b)*r.direction,ty=Math.cos(b)*r.direction;line(ctx,[{x:x-tx*7+Math.cos(b)*3,y:y-ty*7+Math.sin(b)*3},{x,y},{x:x-tx*7-Math.cos(b)*3,y:y-ty*7-Math.sin(b)*3}],color,1,dpr);}
   ctx.globalAlpha=.85;const n=6*V.unit(ctx,dpr);line(ctx,[{x:r.x-n,y:r.y},{x:r.x+n,y:r.y}],color,1.2,dpr);if(r.direction>0)line(ctx,[{x:r.x,y:r.y-n},{x:r.x,y:r.y+n}],color,1.2,dpr);return;
  }
  const color=r.kind==='C'?'#c2d4d7':r.kind==='F'?'#9ccac4':'#d6bf89';ctx.fillStyle=color+(active?'1d':'08');ctx.fillRect(r.x1,r.y1,r.x2-r.x1,r.y2-r.y1);
  if(r.kind==='V'){const d=V.brush(ctx,{},options);d.rect(r.x1,r.y2-6,r.x2-r.x1,10,2,C.steel);for(let x=r.x1+5;x<r.x2-4;x+=9)d.line([x,r.y2-3,x+3,r.y2+1],active?'#d6bf89':'#82918d',1.3);d.oval(r.x1+5,r.y2+7,2,2,active?C.warning:'#78878a');}
  line(ctx,[{x:r.x1,y:r.y1},{x:r.x1,y:r.y2}],color+'88',.8,dpr,[3,6]);line(ctx,[{x:r.x2,y:r.y1},{x:r.x2,y:r.y2}],color+'88',.8,dpr,[3,6]);
  for(let row=0;row<3;row++){const y=r.y1+(r.y2-r.y1)*(row+.5)/3,x=(r.x1+r.x2)/2;if(r.kind==='C'){ctx.globalAlpha=.3;const d=V.brush(ctx,{},options);d.oval(x-15,y,23,8,color,null);d.oval(x+12,y-2,25,10,color,null);}
   else{const horizontal=r.kind==='F',dir=horizontal?r.direction||1:-1,shift=options.reducedMotion?0:Math.sin(time+row)*4;line(ctx,horizontal?[{x:x-dir*13,y},{x:x+dir*13,y},{x:x+dir*7,y:y-4}]:[{x:x+shift,y:y+12},{x:x+shift,y:y-9},{x:x-4+shift,y:y-3}],active?color:color+'55',1,dpr);}}
 }finally{ctx.restore();}
}
function drawTerminal(ctx,t,s,options={}){
 ctx.save();try{const d=V.brush(ctx,{},options),pending=s.effects.pendingPolarity!==undefined,pad=root.ArcEngine.geometry.surfaceAt(s.world,t.x,t.y+80);
  if(pad&&pad.y>t.y&&pad.y-t.y<90){d.rect(t.x-5,t.y+15,10,Math.max(4,pad.y-t.y-12),2,C.steel);d.rect(t.x-19,pad.y-5,38,6,2,C.steel);}
  d.rect(t.x-19,t.y-20,38,38,4,C.steel);d.rect(t.x-14,t.y-15,28,25,2,'#9ab9b4');d.line([t.x-9,t.y-3,t.x-2,t.y-3],C.ink,1.8);d.line([t.x+4,t.y-6,t.x+4,t.y,t.x+1,t.y-3,t.x+7,t.y-3],C.ink,1.4);
  for(let i=0;i<3;i++)d.oval(t.x-8+i*8,t.y+13,1.7,1.7,pending?C.warning:'#78989a',null);
  if(pending)line(ctx,[{x:t.x-17,y:t.y-24},{x:t.x+17,y:t.y-24}],C.warning,1.5,options.dpr||1,[2,3]);
 }finally{ctx.restore();}
}
function drawPickup(ctx,item,options={}){
 if(item.collected)return;ctx.save();try{const d=V.brush(ctx,{},options),y=item.y+(options.reducedMotion?0:Math.sin((options.time||0)*2)*2),x=item.x;
  d.poly([x-15,y-16,x+15,y-16,x+20,y-10,x+20,y+11,x+14,y+17,x-15,y+17,x-20,y+11,x-20,y-10],'#d7d1b4');d.rect(x-14,y-11,28,20,2,'#345568');
  if(item.kind==='trial'){const w=root.ArcWeapons?.get(item.weaponId),a=w?.appearance||{},color=a.color||C.warning;d.rect(x-12,y-2,21,6,1,color);if(['needle','arrow'].includes(a.shape))d.poly([x+3,y-5,x+14,y+1,x+3,y+6],color);else if(a.shape==='shell')d.rect(x+6,y-5,7,12,2,color);else if(['ring','orbit','gear'].includes(a.shape))d.oval(x+5,y+1,7,7,null,color,1.6);else if(['diamond','spark'].includes(a.shape))d.poly([x+6,y-6,x+13,y+1,x+6,y+8,x-1,y+1],color);else d.oval(x+8,y+1,5,5,color);for(let i=0;i<3;i++)d.rect(x-10+i*8,y+12,5,2,.4,color,null);}
  else if(item.kind==='ammo')for(const xx of[-7,0,7])d.rect(x+xx-2,y-7,4,13,1,C.cream,null);
  else if(item.kind==='skill'){if(root.ArcSkills)root.ArcSkills.draw(ctx,item.skill,x,y,23);else d.poly([x,y-8,x+8,y-4,x+7,y+3,x,y+9,x-7,y+3,x-8,y-4],C.reflect,C.ink,1);}
  line(ctx,[{x:x-9,y:y+24},{x:x+9,y:y+24}],'#183e4b55',1,options.dpr||1);
 }finally{ctx.restore();}
}
function drawShot(ctx,plan,t,options={}){return root.ArcEffects?.forContext(ctx).draw(plan,t,{...options,scale:1/V.unit(ctx,options.dpr||1)});}
function contracts(ctx,s,actors,options={}){
 const dpr=options.dpr||1,G=root.ArcEngine.geometry;ctx.save();try{
  for(let i=0;i<s.units.length;i++){const u=s.units[i],d=V.brush(ctx,{},options),guardian=i===1&&root.ArcEngine.guardian(s),h=u.hitShape||{x:0,y:-22,rx:31,ry:31},point=G.actorPoint(s,i,h.x,h.y);
   ctx.setLineDash([3*V.unit(ctx,dpr),3*V.unit(ctx,dpr)]);ctx.save();ctx.translate(point.x,point.y);ctx.rotate(u.slope||0);d.oval(0,0,h.rx,h.ry,null,'#f2dfaa',1);ctx.restore();
   if(guardian){const broken=u.parts.some(p=>p.hp<=0),exposed=u.exposed>0||s.spec.id===100&&s.bossPhase===2,core=u.core;if(core&&(!s.spec.midboss||broken||exposed)){const q=G.actorPoint(s,i,core.x,core.y),r=exposed?core.exposedRadius:core.radius+(broken?3:0);d.oval(q.x,q.y,r,r,null,'#b5ebd8',1);}for(const p of G.actorParts(s,i))if(p.hp>0)d.oval(u.x+p.dx,u.y+p.dy,p.radius,p.radius,null,'#f0b9bc',1);}
   ctx.setLineDash([]);const m=G.muzzle(s,i,i?52:s.angle),r=4*V.unit(ctx,dpr);line(ctx,[{x:m.x-r,y:m.y},{x:m.x+r,y:m.y}],'#f6efd8',1,dpr);line(ctx,[{x:m.x,y:m.y-r},{x:m.x,y:m.y+r}],'#f6efd8',1,dpr);line(ctx,[{x:u.x-18,y:u.y},{x:u.x+18,y:u.y}],'#c4ecd3',1,dpr);
   if(actors[i]==='midboss:harbor-knot'&&s.spec.encounterId!==actors[i]){const dir=s.units[0].x>=u.x?1:-1;ctx.setLineDash([2*V.unit(ctx,dpr),5*V.unit(ctx,dpr)]);d.oval(u.x+dir*24,u.y-35,18,18,null,C.warning,1.2);ctx.setLineDash([]);}
  }
 }finally{ctx.restore();}
}
function create(canvas,configuration={}){
 const ctx=canvas.getContext('2d');let view={x:0,y:0,scale:1},lastTime=0,lastKey='';
 function draw(s,options={}){
  const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return null;const dpr=Math.min(3,root.devicePixelRatio||1);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  const world=options.world||s.world,display=options.display||s,actors=options.actors||['player:'+s.characterId,R.stage(s.stage)?.actorId||'legacy:enemy'],theme=themes[options.theme]||themes.shore;
  const top=options.presentationFrame?.top??22,bottom=options.presentationFrame?.bottom??h-104;
  const minX=Math.min(...s.units.map((u,i)=>u.x-(i&&s.spec.boss?100:52))),maxX=Math.max(...s.units.map((u,i)=>u.x+(i&&s.spec.boss?100:52))),minY=Math.min(...s.units.map((u,i)=>u.y-(i&&s.spec.boss?140:actors[i]==='midboss:harbor-knot'?92:72)),...(options.framingPoints||[]).map(p=>p.y)),maxY=Math.max(...s.units.map(u=>u.y+8));
  const scale=Math.max(.52,Math.min(2.1,(w-32)/(maxX-minX),(bottom-top-6)/(maxY-minY))),base={scale,x:w/2-(minX+maxX)*scale/2,y:bottom-maxY*scale};
  const time=options.time||0,dt=Math.max(1/120,Math.min(.05,time-lastTime||1/60)),key=[s.spec.name,w,h].join(':'),target={...base};
  if(options.shot&&Number.isFinite(options.flight)){const b=options.shot.bullets.find(b=>options.flight>=b.start&&options.flight<=b.t),p=b?.path.find(p=>p.t>=options.flight+.12);if(p){const y=target.y+p.y*scale;target.y+=y<top+10?top+10-y:y>bottom-10?bottom-10-y:0;}}
  if(options.cameraLock)view={...options.cameraLock};else if(key!==lastKey||options.reducedMotion)view=base;else{const k=1-Math.exp(-dt*8);view={scale:base.scale,x:base.x,y:view.y+Math.max(-480*dt,Math.min(480*dt,(target.y-view.y)*k))};}
  lastKey=key;lastTime=time;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.save();try{ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowBlur=0;backdrop(ctx,w,h,theme);ctx.translate(view.x,view.y);ctx.scale(view.scale,view.scale);
   const style={...options,dpr,world,view,width:w,height:h,detail:view.scale<.65?'distant':'battle'};
   for(const o of world.solids)drawSolid(ctx,o,world,style);for(const r of world.regions)drawRegion(ctx,r,style);for(const t of world.terminals)drawTerminal(ctx,t,{...s,world},style);for(const p of options.pickups||s.pickups||[])drawPickup(ctx,p,style);
   const results=[];for(let i=0;i<display.units.length;i++){const u=display.units[i];results.push(drawActor(ctx,actors[i],u,{...style,state:display,side:i,kind:actors[i].split(':')[0],angle:i?52:s.angle,muzzle:root.ArcEngine.geometry.muzzle(display,i,i?52:s.angle)}));}
   drawShot(ctx,options.shot,options.flight||0,{...style,characterId:s.characterId});if(options.debug)contracts(ctx,display,actors,style);
   return {view:{...view},dpr,field:{top,bottom},actors:results,bodyWidths:display.units.map((u,i)=>(i&&s.spec.boss?130:64)*view.scale)};
  }finally{ctx.restore();}
 }
 function toWorld(x,y){const r=canvas.getBoundingClientRect();return {x:((x-r.left)*canvas.clientWidth/r.width-view.x)/view.scale,y:((y-r.top)*canvas.clientHeight/r.height-view.y)/view.scale};}
 return {draw,toWorld,get view(){return {...view};}};
}
const api=Object.freeze({version:1,create,drawActor,drawSolid,drawRegion,drawTerminal,drawPickup,drawShot,drawContracts:contracts,palettes,implemented:Object.freeze(R.actors.filter(a=>a.artStatus!=='fallback').map(a=>a.id))});
if(node)module.exports=api;else root.ArcVisualArt=api;
})(globalThis);
