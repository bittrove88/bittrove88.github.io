(function(root){
'use strict';
const modes=['easy','normal','hard'],ratios={easy:1,normal:.5,hard:0},EPS=1e-7;
const normalize=id=>modes.includes(id)?id:'normal';
const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
function length(points){let sum=0;for(let i=1;i<points.length;i++)sum+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);return sum;}
function between(a,b,f){const p={...a,x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f};if(Number.isFinite(a.t)&&Number.isFinite(b.t))p.t=a.t+(b.t-a.t)*f;return p;}
function prefix(points,budget){
 if(budget<=EPS||points.length<2)return [];
 const result=[points[0]];let used=0;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],d=Math.hypot(b.x-a.x,b.y-a.y);
  if(d<=EPS)continue;
  if(used+d>budget+EPS){result.push(between(a,b,Math.max(0,Math.min(1,(budget-used)/d))));break;}
  result.push(b);used+=d;if(used>=budget-EPS)break;
 }
 return result;
}
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
 const ratio=ratios[normalize(mode)];if(!ratio)return [];
 const bullets=(plan?.bullets||[]).filter(b=>Array.isArray(b.path)&&b.path.length>1&&b.path.every(finite));
 if(ratio===1)return bullets.map(b=>({id:b.id,path:b.path}));
 const records=new Map(bullets.map(b=>[b.id,{bullet:b,parent:null}])),parents=new Set(),budgets=new Map();
 for(const record of records.values()){
  const b=record.bullet,first=b.path[0];
  // Split events carry the actual parent id. Delayed twin/fan projectiles
  // remain independent roots even though their `primary` flag is false.
  const event=(plan.events||[]).find(e=>e.type==='split'&&e.bullet!==b.id&&records.has(e.bullet)&&Math.abs(e.t-first.t)<EPS&&Math.hypot(e.x-first.x,e.y-first.y)<EPS);
  if(event){record.parent=records.get(event.bullet);parents.add(event.bullet);}
 }
 function lineage(record,end=Infinity,seen=new Set()){
  if(seen.has(record))return [];seen.add(record);
  const before=record.parent?lineage(record.parent,record.bullet.path[0].t,seen):[];
  return [...before,{id:record.bullet.id,path:until(record.bullet.path,end)}];
 }
 for(const record of records.values()){
  if(parents.has(record.bullet.id))continue;
  const segments=lineage(record),distances=segments.map(s=>length(s.path));
  let remaining=distances.reduce((a,b)=>a+b,0)*ratio;
  for(let i=0;i<segments.length;i++){
   const visible=Math.max(0,Math.min(remaining,distances[i]));
   budgets.set(segments[i].id,Math.max(budgets.get(segments[i].id)||0,visible));remaining-=visible;
  }
 }
 return bullets.map(b=>({id:b.id,path:prefix(b.path,budgets.get(b.id)||0)})).filter(b=>b.path.length>1);
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
 // Hard mode shows the barrel direction, independent of power or future contacts.
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
