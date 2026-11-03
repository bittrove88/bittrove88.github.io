(function(root){
'use strict';
const modes=['easy','normal','hard'],ratios={easy:1,normal:1,hard:1},EPS=1e-7;
const normalize=id=>modes.includes(id)?id:'normal';
const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
function length(points){let sum=0;for(let i=1;i<points.length;i++)sum+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);return sum;}
function between(a,b,f){const p={...a,x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f};if(Number.isFinite(a.t)&&Number.isFinite(b.t))p.t=a.t+(b.t-a.t)*f;return p;}
function until(points,time){
 if(!Number.isFinite(time))return points;
 const result=[];
 for(let i=0;i<points.length;i++){
  const p=points[i];
  if(p.t<=time+EPS)result.push(p);
  else{const a=points[i-1];if(a&&a.t<time&&p.t>a.t)result.push(between(a,p,(time-a.t)/(p.t-a.t)));break;}
 }
 return result;
}
// This is a drawing projection of an existing simulation. Never mutate the
// projectile paths, events, collision world, damage, or enemy random sequence.
function paths(plan,mode){
 return (plan?.bullets||[]).filter(b=>Array.isArray(b.path)&&b.path.length>1&&b.path.every(finite)).map(b=>({id:b.id,path:b.path}));
}
// The Sora carrier must be visible through its actual split in every difficulty.
 // This is a read-only projection of the physics event; children are unchanged.
 function splitProjection(plan){
  if(plan?.weaponId!=='S_SORA')return null;
  const event=(plan.events||[]).find(e=>e.type==='split'&&finite(e));
  if(!event)return null;
  const bullet=(plan.bullets||[]).find(b=>b.id===event.bullet&&Array.isArray(b.path)&&b.path.every(finite));
  if(!bullet)return null;
  const traced=until(bullet.path,event.t);
  if(!traced.length)return null;
  const point={x:event.x,y:event.y,t:event.t},last=traced.at(-1);
  if(Math.hypot(last.x-point.x,last.y-point.y)>EPS)traced.push(point);
  else traced[traced.length-1]=point;
  return {parentId:bullet.id,path:traced,point};
 }
 // Retained direction primitive for callers outside the difficulty forecast.
// Keep its visible length constant as the camera zooms in and out.
function direction(muzzle,scale=1){
 if(!finite(muzzle)||!Number.isFinite(muzzle.dx)||!Number.isFinite(muzzle.dy))return [];
 const magnitude=Math.hypot(muzzle.dx,muzzle.dy);if(magnitude<EPS)return [];
 const distance=48/((Number.isFinite(scale)&&scale>0)?scale:1)/magnitude;
 return [{id:'direction',path:[{x:muzzle.x,y:muzzle.y},{x:muzzle.x+muzzle.dx*distance,y:muzzle.y+muzzle.dy*distance}]}];
}
const api={modes,ratios,normalize,length,paths,splitProjection,direction};
if(typeof module!=='undefined')module.exports=api;else root.ArcAimGuide=api;
})(globalThis);
