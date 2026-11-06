/* Generated from game/ui/charge-camera.js. Edit the source. */
(function(root){
'use strict';
const P=typeof module!=='undefined'?require('../dist/physics.js'):root.ArcPhysics;
const ratio=.9,duration=.2,margin=12,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// A collision-free estimate from the player's known launch inputs. No world,
// trajectory, impacts, wind/magnet contacts, enemy plan or difficulty is read.
function needsZoom({muzzle,power,weapon,gravityFactor=1,view,ceiling}){
 if(!muzzle||!weapon||!view||![muzzle.y,muzzle.dy,power,view.scale,view.y,ceiling].every(Number.isFinite)||view.scale<=0||muzzle.dy>=0)return false;
 const speed=P.launchSpeed(power,weapon),up=-muzzle.dy*speed,gravity=clamp(P.GRAVITY*(weapon.gravity??1)*gravityFactor,1,600);
 const apex=muzzle.y-up*up/(2*gravity);
 return Number.isFinite(apex)&&view.y+apex*view.scale<ceiling-margin;
}
function latch(state,inputs){if(state&&!state.engaged&&needsZoom(inputs))state.engaged=true;return !!state?.engaged;}
function advance(amount,engaged,dt,reducedMotion=false){const target=engaged?1:0;if(reducedMotion)return target;const step=clamp(Number(dt)||0,0,.05)/duration;return clamp(amount+clamp(target-amount,-step,step),0,1);}
function factor(amount){const t=clamp(amount,0,1);return 1-(1-ratio)*t*t*(3-2*t);}
function apply(view,pivot,amount){const f=factor(amount);return {scale:view.scale*f,x:pivot.x+(view.x-pivot.x)*f,y:pivot.y+(view.y-pivot.y)*f};}
const api={ratio,duration,margin,needsZoom,latch,advance,factor,apply};if(typeof module!=='undefined')module.exports=api;else root.ArcChargeCamera=api;
})(globalThis);
