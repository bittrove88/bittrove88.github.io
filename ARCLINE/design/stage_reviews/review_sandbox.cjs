'use strict';
// Offline design states use the unchanged runtime. No saved game or campaign source is written.
const G=require('../../game/dist/geometry.js'),P=require('../../game/dist/physics.js'),E=require('../../game/dist/engine.js'),L=require('../../game/dist/levels.js'),N=require('../../game/dist/encounters.js');
function rng(s){s.random=()=>{s.reviewRandomState=(Math.imul(1664525,s.reviewRandomState)+1013904223)>>>0;return s.reviewRandomState/4294967296;};return s;}
function make(e,{seed=1,character='gun'}={}){
 const m=e.after,s=E.campaign(e.stage,{matchSeed:seed,equippedCharacterId:character});
 s.spec={...L[e.stage-1],worldWidth:m.width,floors:m.floors,components:m.parts.map(x=>({...x,destructible:x.breakable})),features:m.features,spawn:[[m.player.x,m.player.h],[m.enemy.x,m.enemy.h]],pickups:m.pickups};s.effects={destroyed:[],broken:0,polarity:0};s.world=G.world(s.spec);
 for(const [i,q] of [[0,m.player],[1,m.enemy]]){const pos=G.safePosition(s.world,q.x*10,500-q.h*10);if(!pos)throw Error(`No spawn ${e.stage}/${i}`);Object.assign(s.units[i],pos,{range:[35,m.width-35]});if(q.floating){s.units[i].y=500-q.h*10;s.units[i].floating=true;}}
 s.units[0].facing=s.units[1].x>=s.units[0].x?1:-1;s.units[1].facing=-s.units[0].facing;
 const byId=new Map(m.pickups.map(q=>[q.placementId,q]));for(const q of s.pickups){const x=byId.get(q.placementId);if(x)Object.assign(q,G.point(x.x,x.h));}
 s.world=null;E.rebuildWorld(s);E.telegraph(s);s.reviewRandomState=seed>>>0;return rng(s);
}
const clone=s=>rng(JSON.parse(JSON.stringify(s)));
function muzzleClear(s,angle,side=0){const p=G.muzzle(s,side,angle);return !s.world.solids.some(o=>G.inside(p,o.poly))&&G.lineClear(s.world,p.pivot,p);}
function shot(s,angle,power,id='W01'){return P.simulate(s,0,angle,power,{weaponId:id});}
const damage=z=>z.damage[1]+Object.values(z.partDamage||{}).reduce((a,b)=>a+b,0);
function thinPath(z){return(z.bullets[0]?.path||[]).filter((p,i)=>i%4===0||z.events.some(e=>e.type==='bounce'&&Math.abs(e.t-p.t)<1e-6)).map(p=>[+(p.x/10).toFixed(3),+((500-p.y)/10).toFixed(3)]);}
function compact(z){return{angle:z.angle,power:z.power,damage:damage(z),selfDamage:z.damage[0],partDamage:z.partDamage,events:z.events.map(e=>({type:e.type,...(e.solidId?{solidId:e.solidId}:{}),...(e.id?{id:e.id}:{})})),destroyed:z.destroyed,path:thinPath(z)};}
function search(s,{id='W01',predicate=z=>damage(z)>0,required=[],angleStep=4,powerStep=5,minAngle=-12,maxAngle=168}={}){
 let best=null,score=-Infinity;for(let a=minAngle;a<=maxAngle;a+=angleStep){if(!muzzleClear(s,a))continue;for(const power of [...new Set([...Array.from({length:Math.floor(75/powerStep)+1},(_,i)=>25+i*powerStep),100])]){const z=shot(s,a,power,id);if(!predicate(z)||!required.every(k=>z.events.some(x=>x.type===k)))continue;const v=damage(z)-z.damage[0]*4+(z.destroyed?.length||0)*.001;if(v>score){score=v;best={angle:a,power,shot:z};}}}return best;
}
function snapshot(s){return{round:s.round,actions:s.shotCount,player:{x:s.units[0].x/10,h:(500-s.units[0].y)/10,facing:s.units[0].facing,hp:s.units[0].hp},enemy:{x:s.units[1].x/10,h:(500-s.units[1].y)/10,facing:s.units[1].facing,hp:s.units[1].hp,parts:s.units[1].parts.map(p=>p.hp)},destroyed:[...s.effects.destroyed],polarity:s.effects.polarity,broken:s.effects.broken,thinCloud:!!s.effects.thinCloud};}
function finish(s,z,{enemy='stationary'}={}){
 E.resolve(s,z);const reply={mode:enemy,resolvedState:snapshot(s)};if(s.result)return reply;E.next(s);
 if(enemy==='runtime'){const target=E.enemyMoveTarget(s),walk=E.move(s,1,target-s.units[1].x),plan=E.cpuPlan(s);E.launch(s,plan.angle,plan.power,plan);E.resolve(s,plan);Object.assign(reply,{walk,shot:compact(plan)});}
 if(!s.result){E.next(s);s.phase='aim';}return reply;
}
function fire(s,a,power,{id='W01',enemy='stationary'}={}){s.phase='aim';s.turn=0;if(id!=='TELEPORT'&&!E.selectWeapon(s,id))return null;s.teleportMode=id==='TELEPORT';const z=E.launch(s,a,power);if(!z)return null;const input={id,angle:a,power,round:s.round,origin:[s.units[0].x/10,(500-s.units[0].y)/10]};const response=finish(s,z,{enemy});return{input,shot:compact(z),teleportSuccess:z.teleportSuccess,landing:[s.units[0].x/10,(500-s.units[0].y)/10],response};}
function walk(s,dx){const before=[s.units[0].x,s.units[0].y],walk=E.move(s,0,dx);return{kind:'walk',requestedInputPx:dx,movedPx:walk,walkUsedPx:s.walkUsed,from:[before[0]/10,(500-before[1])/10],to:[s.units[0].x/10,(500-s.units[0].y)/10]};}
module.exports={G,P,E,L,N,make,clone,muzzleClear,shot,damage,thinPath,compact,search,finish,fire,walk,snapshot};
