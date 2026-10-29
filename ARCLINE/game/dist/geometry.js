(function(root){
'use strict';
const EPS=1e-7,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const point=(x,h)=>({x:x*10,y:500-h*10});
const cross=(a,b)=>a.x*b.y-a.y*b.x;
function segment(a,b,c,d){
 const r={x:b.x-a.x,y:b.y-a.y},s={x:d.x-c.x,y:d.y-c.y},den=cross(r,s);
 if(Math.abs(den)<EPS)return null;
 const ca={x:c.x-a.x,y:c.y-a.y},t=cross(ca,s)/den,u=cross(ca,r)/den;
 if(t<-EPS||t>1+EPS||u<-EPS||u>1+EPS)return null;
 const len=Math.hypot(s.x,s.y);let nx=-s.y/len,ny=s.x/len;if(nx*r.x+ny*r.y>0){nx=-nx;ny=-ny;}
 return {t:clamp(t,0,1),x:a.x+r.x*t,y:a.y+r.y*t,nx,ny};
}
function inside(p,poly){let v=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
 const a=poly[i],b=poly[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)v=!v;
 }return v;}
function circle(a,b,c,r){const dx=b.x-a.x,dy=b.y-a.y,fx=a.x-c.x,fy=a.y-c.y,A=dx*dx+dy*dy;if(fx*fx+fy*fy<=r*r)return 0;if(A<EPS)return null;const B=2*(fx*dx+fy*dy),C=fx*fx+fy*fy-r*r,disc=B*B-4*A*C;if(disc<0)return null;const t=(-B-Math.sqrt(disc))/(2*A);return t>=0&&t<=1?t:null;}
function rectangle(id,x1,x2,h1,h2,kind='solid'){
 const a=point(x1,h2),b=point(x2,h1);return {id,kind,poly:[a,{x:b.x,y:a.y},b,{x:a.x,y:b.y}]};
}
function floorY(points,x){if(x<points[0].x-EPS||x>points.at(-1).x+EPS)return null;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];if(x<=b.x+EPS&&b.x>a.x)return a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x);}return points.at(-1).y;}
function world(spec,round=1,bossPhase=0,effects={}){
 const solids=[],regions=[],waters=[],terminals=[],surfaces=[];const tick=spec.id===11?Math.max(0,round-2):Math.floor((round-1)/(spec.hold||1));
 spec.floors.forEach((f,i)=>{const top=f.map(([x,h])=>point(x,h));const poly=[...top,{x:top.at(-1).x,y:560},{x:top[0].x,y:560}];solids.push({id:'floor'+i,kind:'floor',poly});surfaces.push({id:'floor'+i,points:top});});
 // Finite polygons retain their undersides: a mountain, an island and a cave
 // roof all share collision geometry, rather than a single height function.
 for(const component of spec.components||[]){
  const poly=component.poly.map(([x,h])=>point(x,h)),xs=poly.map(p=>p.x),left=Math.min(...xs),right=Math.max(...xs);
  const count=component.destructible?Math.max(1,Math.ceil((right-left)/100)):1;
  for(let piece=0;piece<count;piece++){
   const id=component.id+(component.destructible?'@'+piece:'');if(effects.destroyed?.includes(id))continue;
   const cut=count===1?poly:clipX(clipX(poly,left+(right-left)*piece/count,true),left+(right-left)*(piece+1)/count,false);
   if(cut.length<3)continue;
   const o={id,componentId:component.id,kind:component.destructible?'fragile':'bedrock',destructible:!!component.destructible,poly:cut};solids.push(o);
   for(let edge=0;edge<cut.length;edge++){
    const a=cut[edge],b=cut[(edge+1)%cut.length];if(Math.abs(a.x-b.x)<EPS)continue;
    const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
    if(inside({x:mid.x,y:mid.y+1},cut)&&!inside({x:mid.x,y:mid.y-1},cut))surfaces.push({id:id+':e'+edge,solidId:id,kind:o.kind,points:a.x<b.x?[a,b]:[b,a]});
   }
  }
 }
 const features=[...(spec.phaseFeatures?.[bossPhase]||spec.features),...(spec.staticFeatures||[]).map((f,j)=>({...f,id:'fixed'+j}))];
 features.forEach(({type:k,v,id:featureId},i)=>{
  const id=featureId||k+i;
  if(k==='S'||k==='R'){const [x1,x2,h1,h2]=v;const o=rectangle(id,x1,x2,h1,k==='R'?h1+2:h2,k==='R'?'roof':'solid');solids.push(o);surfaces.push({id,points:[o.poly[0],o.poly[1]]});}
  if(k==='B'){
   const [x,h,len,open,slope=0]=v,angle=((open+(tick%2))%2?75:slope)*Math.PI/180,a=point(x,h),b={x:a.x+Math.cos(angle)*len*10,y:a.y-Math.sin(angle)*len*10};
   solids.push({id,kind:'bridge',open:angle>1,poly:[a,b,{x:b.x,y:b.y+12},{x:a.x,y:a.y+12}],hinge:a});surfaces.push({id,points:[a,b]});
  }
  if(k==='K'){
   const [x,h,angle]=v,aa=(angle+(spec.id===39&&tick%2?90:0))*Math.PI/180,c=point(x,h),dx=Math.cos(aa)*55,dy=Math.sin(aa)*55;
   solids.push({id,kind:'crystal',poly:[{x:c.x-dx,y:c.y-dy},{x:c.x+dx,y:c.y+dy},{x:c.x+dx+4,y:c.y+dy+4},{x:c.x-dx+4,y:c.y-dy+4}]});
  }
  if(k==='W'){
   // The legacy W authoring slot is now a supported reflective material.
   // Its visible top is exactly the existing floor collision edge, never a
   // floating water plane or a second, hidden surface beneath the ground.
   const left=v[0]*10,right=v[1]*10;
   for(const floor of surfaces.filter(f=>f.kind!=='fragile')){
    for(let j=1;j<floor.points.length;j++){
     const a=floor.points[j-1],b=floor.points[j],x1=Math.max(left,a.x),x2=Math.min(right,b.x);
     if(x2-x1<.01)continue;
     const from={x:x1,y:floorY([a,b],x1)},to={x:x2,y:floorY([a,b],x2)};
     solids.push({id:id+':'+floor.id+':'+j,kind:'reflector',sourceFeatureId:id,floorId:floor.id,poly:[from,to,{x:to.x,y:to.y+6},{x:from.x,y:from.y+6}]});
    }
   }
  }
  if('CUFV'.includes(k)){
   const [x1,x2,h1,h2]=v;let direction=spec.id===54||spec.id===55?1:tick%2?-1:1;
   if(spec.id===60&&effects.broken>0)direction=1;
   const strength=spec.id===60?(effects.broken>=2?0:effects.broken===1?.18:.35):.35;
   const ventStartsOn=Number.isFinite(v[4])?!!v[4]:spec.ventStartsOn===undefined?spec.id===64:!!spec.ventStartsOn;
   const on=k!=='V'||(tick+(ventStartsOn?1:0))%2===1;
   let offset=spec.id===30?(effects.cloudOffset||0):0;
   regions.push({id,kind:k,x1:x1*10+offset,x2:x2*10+offset,y1:500-h2*10,y2:500-h1*10,direction,strength,on,slow:spec.id===90&&effects.thinCloud?.85:.72});
  }
  if(k==='M'){const [x,h,r,dir]=v;regions.push({id,kind:k,...point(x,h),radius:r*10,direction:effects.polarity||dir,strength:spec.id===80?(effects.broken>=2?0:effects.broken===1?.5:1):1,on:true});}
  if(k==='T')terminals.push({id,...point(v[0],v[1]),radius:20});
 });
 return {solids,regions,waters,terminals,surfaces};
}
function clipX(poly,x,greater){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ia=greater?a.x>=x-EPS:a.x<=x+EPS,ib=greater?b.x>=x-EPS:b.x<=x+EPS;if(ia)out.push({...a});if(ia!==ib){const t=(x-a.x)/(b.x-a.x);out.push({x,y:a.y+(b.y-a.y)*t});}}return out;}
function without(w,ids){const gone=new Set(ids);return {...w,solids:w.solids.filter(o=>!gone.has(o.id)),surfaces:w.surfaces.filter(f=>!gone.has(f.solidId||f.id))};}
function fallLanding(w,x,startY,other=null,range=[35,965]){
 if(x<range[0]||x>range[1])return null;
 const ys=w.surfaces.map(f=>floorY(f.points,x)).filter(y=>y!==null&&y>=startY-2).sort((a,b)=>a-b);
 for(const y of ys){const p=support(w,x,y);if(p&&Math.abs(p.slope)<=35*Math.PI/180&&clearBody(w,p)&&(!other||Math.hypot(x-other.x,y-other.y)>90))return p;}
 return null;
}
function teleportLanding(w,hit,other,range=[35,965]){
 if(!hit||!Number.isFinite(hit.x+hit.y))return null;
 const nx=Number(hit.nx)||0,ny=Number(hit.ny)||0;
 const top=ny<-.4,entry={x:hit.x+(top?0:nx*(hit.unit!==undefined?76:37)),y:hit.y+(top?-26:ny>.4?50:22)};
 if(!clearBody(w,entry))return null;
 const landing=fallLanding(w,entry.x,entry.y,other,range);
 return landing?{...landing,entry}:null;
}
function surfaceAt(w,x,near=400,maxDifference=Infinity){let best=null;for(const f of w.surfaces){const y=floorY(f.points,x);if(y!==null&&Math.abs(y-near)<=maxDifference&&(!best||Math.abs(y-near)<Math.abs(best.y-near)))best={x,y,id:f.id};}return best;}
function support(w,x,y){const a=surfaceAt(w,x-20,y,24),b=surfaceAt(w,x+20,y,24);if(!a||!b)return null;return {x,y:(a.y+b.y)/2,slope:Math.atan2(b.y-a.y,40),surface:a.id};}
function clearBody(w,p){const points=[{x:p.x,y:p.y-24},{x:p.x-22,y:p.y-20},{x:p.x+22,y:p.y-20},{x:p.x,y:p.y-45}];return !w.waters.some(r=>p.x>=r.x1&&p.x<=r.x2&&p.y>r.y-2)&&!w.solids.some(o=>points.some(q=>inside(q,o.poly)));}
function safePosition(w,x,y,other=null,range=[35,965]){
 for(const dx of [0,-5,5,-12,12,-24,24,-40,40,-70,70,-100,100]){
  const xx=clamp(x+dx,range[0],range[1]),f=surfaceAt(w,xx,y);if(!f)continue;const p=support(w,xx,f.y);
  if(p&&Math.abs(p.slope)<=35*Math.PI/180&&clearBody(w,p)&&(!other||Math.abs(xx-other.x)>100))return p;
 }return null;
}
function sweep(w,a,b,ignore=null){let best=null;for(const o of w.solids){if(o.id===ignore)continue;for(let i=0;i<o.poly.length;i++){const h=segment(a,b,o.poly[i],o.poly[(i+1)%o.poly.length]);if(h&&(!best||h.t<best.t-EPS||Math.abs(h.t-best.t)<=EPS&&o.kind==='reflector'&&['floor','bedrock'].includes(best.solid.kind)))best={...h,solid:o};}}return best;}
function lineClear(w,a,b){const h=sweep(w,a,b);return !h||h.t>.98;}
function move(s,side,amount){
 const u=s.units[side];if(!Number.isFinite(amount)||s.result)return 0;let remaining=clamp(amount,-1000,1000),moved=0;
 while(Math.abs(remaining)>.01){const dx=clamp(remaining,-2,2),x=clamp(u.x+dx,u.range[0],u.range[1]);if(Math.abs(x-u.x)<.01)break;
  const f=surfaceAt(s.world,x,u.y,24),p=f&&support(s.world,x,f.y);if(!p||Math.abs(p.y-u.y)>7||Math.abs(p.slope)>35*Math.PI/180||!clearBody(s.world,p)||Math.abs(x-s.units[1-side].x)<100)break;
  const d=x-u.x;Object.assign(u,p);moved+=d;remaining-=d;
 }return moved;
}
function muzzle(s,side,relativeAngle){const u=s.units[side],dir=s.units[1-side].x>=u.x?1:-1,theta=(dir===1?-relativeAngle:180+relativeAngle)*Math.PI/180+u.slope;
 const pivot={x:u.x+Math.sin(u.slope)*26,y:u.y-Math.cos(u.slope)*26};return {x:pivot.x+Math.cos(theta)*35,y:pivot.y+Math.sin(theta)*35,dx:Math.cos(theta),dy:Math.sin(theta),theta,dir,pivot,worldAngle:Math.atan2(-Math.sin(theta),Math.abs(Math.cos(theta)))*180/Math.PI};}
const api={clamp,point,segment,circle,inside,rectangle,floorY,world,surfaceAt,support,clearBody,safePosition,sweep,lineClear,move,muzzle,clipX,without,fallLanding,teleportLanding};if(typeof module!=='undefined')module.exports=api;else root.ArcGeometry=api;
})(globalThis);
