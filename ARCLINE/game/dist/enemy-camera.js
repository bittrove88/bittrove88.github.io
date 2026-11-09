/* Generated from game/ui/enemy-camera.js. Edit the source. */
(function(root){
'use strict';
const G=typeof module!=='undefined'?require('../dist/geometry.js'):root.ArcGeometry;
const timing=Object.freeze({lead:.24,flash:.14,release:.24}),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
// Display-only framing. Read the committed launch pose and emitted sources,
// never impacts or the full future trajectory. Rain origins are not muzzles.
function bounds(state,plan){
 const source=plan.echo&&plan.echoUnit?plan.echoUnit:state.units[1],unit={...source,facing:plan.facing||source.facing},s={units:[state.units[0],unit]},boss=!!state.spec.boss,guardian=boss||!!state.spec.midboss;
 const h=unit.hitShape||{x:0,y:-22,rx:31,ry:31},center=G.actorPoint(s,1,h.x||0,h.y),a=unit.slope||0,rx=Math.hypot((h.rx||31)*Math.cos(a),(h.ry||31)*Math.sin(a)),ry=Math.hypot((h.rx||31)*Math.sin(a),(h.ry||31)*Math.cos(a));
 const extent=guardian?(boss?105:65):43,muzzle=G.muzzle(s,1,plan.angle??52);
 let left=Math.min(unit.x-extent,center.x-rx,muzzle.x-10),right=Math.max(unit.x+extent,center.x+rx,muzzle.x+10),top=Math.min(unit.y-(guardian?(boss?140:110):72),center.y-ry,muzzle.y-10),bottom=Math.max(unit.y+8,center.y+ry,muzzle.y+10);
 for(const p of G.actorParts(s,1))if(p.hp>0){const x=unit.x+p.dx,y=unit.y+p.dy;left=Math.min(left,x-p.radius);right=Math.max(right,x+p.radius);top=Math.min(top,y-p.radius);bottom=Math.max(bottom,y+p.radius);}
 const bullets=plan.bullets||[],first=Math.min(0,...bullets.map(b=>b.start||0));
 const emitted=bullets.filter(b=>{const p=b.path?.[0];return p&&!b.effect&&(b.primary||(b.start||0)<=first+1e-8||Math.hypot(p.x-muzzle.x,p.y-muzzle.y)<60);});
 for(const b of emitted){const p=b.path[0];left=Math.min(left,p.x-10);right=Math.max(right,p.x+10);top=Math.min(top,p.y-10);bottom=Math.max(bottom,p.y+10);}
 const beams=(plan.events||[]).filter(e=>e.type==='final-beam');
 for(const e of beams){left=Math.min(left,e.from.x-10);right=Math.max(right,e.from.x+10);top=Math.min(top,e.from.y-10);bottom=Math.max(bottom,e.from.y+10);}
 return {left,right,top,bottom,lastStart:Math.max(0,...emitted.map(b=>b.start||0),...beams.map(e=>e.t))};
}
function visible(view,box,frame){return view.x+box.left*view.scale>=frame.left-1e-6&&view.x+box.right*view.scale<=frame.right+1e-6&&view.y+box.top*view.scale>=frame.top-1e-6&&view.y+box.bottom*view.scale<=frame.bottom+1e-6;}
function fit(from,box,frame){
 const scale=Math.min(from.scale,(frame.right-frame.left)/(box.right-box.left),(frame.bottom-frame.top)/(box.bottom-box.top));
 return {scale,x:clamp(from.x,frame.left-box.left*scale,frame.right-box.right*scale),y:clamp(from.y,frame.top-box.top*scale,frame.bottom-box.bottom*scale)};
}
function prepare(state,plan,view,frame,includeEcho=false){if(!plan||plan.side!==1||plan.echo&&!includeEcho||!frame)return null;const box=bounds(state,plan);return {plan,from:{...view},age:0,needed:!visible(view,box,frame)};}
function view(normal,focus,state,frame,flight=null,reducedMotion=false){
 const box=bounds(state,focus.plan),target=fit(focus.from,box,frame);
 const weight=flight===null?(reducedMotion?1:smooth(focus.age/timing.lead)):reducedMotion?(flight<=box.lastStart+timing.flash+1e-8?1:0):1-smooth((flight-box.lastStart-timing.flash)/timing.release);
 const base=flight===null?focus.from:normal;
 return {scale:base.scale+(target.scale-base.scale)*weight,x:base.x+(target.x-base.x)*weight,y:base.y+(target.y-base.y)*weight};
}
const api={timing,bounds,visible,fit,prepare,view};if(typeof module!=='undefined')module.exports=api;else root.ArcEnemyCamera=api;
})(globalThis);
