(function(root){'use strict';
const node=typeof module!=='undefined',A=node?require('./attack-catalog.js'):root.ArcAttackCatalog,N=node?require('./encounters.js'):root.ArcEncounters,W=node?require('./weapons.js'):root.ArcWeapons,G=node?require('./geometry.js'):root.ArcGeometry,P=node?require('./physics.js'):root.ArcPhysics;
function technique(s){if(!s.spec.boss)return null;const id=s.stage===100?'E_FINAL_'+Math.min(4,1+Math.floor((s.finalTeam?.index||0)/3)):'E_'+s.stage;return A.enemyTechniques[id]||null;}
function finalSequence(s){
 const phase=Math.min(3,Math.floor((s.finalTeam?.index||0)/3));
 if(!s.finalAttackPattern||s.finalAttackPattern.phase!==phase)s.finalAttackPattern={phase,step:0};
 return A.finalEncounter.patterns[phase];
}
function finalWarning(s){
 const sequence=finalSequence(s),step=s.finalAttackPattern.step,kind=sequence[step%sequence.length],r=A.enemyTechniques[kind],targetX=s.units[0].x,targetY=s.units[0].y-22;
 if(r)return {kind,technique:kind,name:r.nameJa,nameEn:r.name,targetX,targetY,columns:[0],radius:r.params.warningRadius||65,windup:1.05,frozen:true,next:sequence[(step+1)%sequence.length]};
 const columns=kind==='MARK'?[-64,0,64]:kind==='TRIPLE'?[-42,0,42]:kind==='TWIN'?[-28,28]:[0];
 return {kind,targetX,targetY,columns,radius:kind==='MARK'?145:kind==='PREPARE'?120:kind==='DROP'?85:35,windup:kind==='PREPARE'?.8:kind==='MARK'?.25:0,next:sequence[(step+1)%sequence.length],frozen:true};
}
function fixedAim(s){return s.telegraph?.technique==='E_FINAL_2'?{angle:65,power:75,score:1}:null;}
function highLaunch(s,target,weapon){
 let aim=65,launch;
 // Solve the rising arc to an apex above both actors, rather than steering
 // too early toward a high platform. The descending leg keeps the frozen aim.
 for(let i=0;i<6;i++){
  const muzzle=G.muzzle(s,1,aim),top=Math.min(muzzle.y,target.y)-weapon.redirectHeight,g=P.GRAVITY*weapon.gravity,vy=Math.sqrt(2*g*(muzzle.y-top)),seconds=vy/g,vx=(target.x-muzzle.x)*weapon.redirectFraction/seconds;
  aim=Math.atan2(vy,Math.abs(vx))*180/Math.PI;
  launch={angle:aim,power:Math.hypot(vx,vy)/(6.7*weapon.speed),origin:{...muzzle,theta:Math.atan2(-vy,vx)}};
 }
 return launch;
}
function damageScale(plan){return plan.enemyTier==='final'?1:A.finalEncounter.normalDamage/20;}
function weakenFactor(s,plan){return s.stage===100?(plan.enemyTier==='final'?1:A.finalEncounter.brokenNormalMultiplier):.5;}
function finalizeDamage(s,plan){
 if(s.stage!==100)return;
 const cap=Math.min(Math.max(0,plan.damage[0]),Math.max(0,s.units[0].hp));let available=cap;
 for(const e of plan.events)if(e.type==='damage'&&e.unit===0){e.rawValue=e.value;e.value=Math.max(0,Math.min(e.value,available));available-=e.value;}
 plan.damage[0]=cap;
}
function telegraph(s){if(s.stage===100)return finalWarning(s);const r=technique(s);if(!r||s.round%3!==0)return null;const targetX=s.units[0].x,targetY=s.units[0].y-22;return {kind:r.id,technique:r.id,name:r.nameJa,nameEn:r.name,targetX,targetY,columns:r.id==='E_90'?[-110,0,110]:r.id==='E_20'?[-36,36]:[0],radius:r.params.warningRadius||65,windup:r.tier==='final'?1.05:.8,frozen:true};}
function appearance(s,weaponId='W01'){const foe=N.forSpec(s.spec),r=A.enemyAppearances?.[foe.id];return {...W.getEnemy(weaponId).appearance,color:foe.color,blast:W.getEnemy(weaponId).blast,fx:null,palette:null,motif:null,...r};}
function decorate(s,plan){const r=A.enemyTechniques[plan.weaponId];plan.appearance=r?{...W.getEnemy(plan.weaponId).appearance}:appearance(s,plan.weaponId);if(r){plan.specialTechnique=true;plan.enemyTier=r.tier;plan.techniqueName=r.nameJa;}return plan;}
function plan(s,angle,power){
 const t=s.telegraph,r=A.enemyTechniques[t?.technique];if(!r)return null;
 const id=r.id,opts={weaponId:id,targetPoint:{x:t.targetX,y:t.targetY}},m=G.muzzle(s,1,angle),side=s.units[1],target={x:t.targetX,y:t.targetY};
 if(['E_70','E_90'].includes(id))opts.volley=t.columns.map((dx,i)=>({origin:{x:G.clamp(target.x+dx,25,(s.spec.worldWidth||1000)-25),y:Math.min(target.y-260,side.y-180),theta:Math.PI/2},power:20,damage:id==='E_90'?.38:.7,blast:id==='E_90'&&i===2?100:id==='E_70'?90:60,delay:.15+i*.23}));
 if(id==='E_20')opts.volley=[-1,1].map((v,i)=>{const source={x:m.x,y:m.y+v*22},dx=target.x-source.x,dy=target.y-source.y,speed=P.launchSpeed(power,W.getEnemy(id)),distance=Math.abs(dx),g=300*W.getEnemy(id).gravity,disc=speed**4-g*(g*distance**2+2*(-dy)*speed**2);let theta=Math.atan2(dy,dx);if(disc>=0&&distance>1){const a=Math.atan((speed**2+(i?1:-1)*Math.sqrt(disc))/(g*distance));theta=dx<0?Math.PI+a:-a;}return {origin:{...source,theta},delay:i*.18,damage:.55};});
 let launchAngle=angle,launchPower=power;
 if(id==='E_FINAL_2'){
  const launch=highLaunch(s,target,W.getEnemy(id));launchAngle=launch.angle;launchPower=launch.power;
  opts.volley=r.params.volley.map(v=>({origin:launch.origin,power:launch.power,delay:v.delay,damage:v.damage}));
 }
 const p=P.simulate(s,1,launchAngle,launchPower,opts);if(id==='E_FINAL_3'&&p.impacts.length){const h=p.impacts[0];p.createGravityField={x:h.x,y:h.y,radius:200,charges:[1,1],serial:s.round};}
 if(id==='E_FINAL_4'&&p.impacts.length){const h=p.impacts[0];p.events.push({type:'final-collapse',t:p.duration,x:h.x,y:h.y,duration:.25});p.duration+=.25;}
 // The warning is fixed before the player's turn; the projectile never reads a later aim.
 p.events.unshift({type:'technique-warning',t:0,x:t.targetX,y:t.targetY,radius:t.radius,columns:t.columns,duration:.18});
 return decorate(s,p);
}
function resolve(s,shot){
 if(s.stage===100&&shot.side===1){finalSequence(s);s.finalAttackPattern.step++;}
 const field=s.effects.gravityField;if(field){field.charges[shot.side]=Math.max(0,field.charges[shot.side]-1);if(!field.charges.some(Boolean))delete s.effects.gravityField;}
 if(shot.createGravityField)s.effects.gravityField=JSON.parse(JSON.stringify(shot.createGravityField));
 if(shot.weaponId==='E_80'&&shot.damage[0]>0){const u=s.units[0],from={x:u.x,y:u.y,slope:u.slope},hits=shot.impacts.filter(h=>Math.hypot(h.x-u.x,h.y-(u.y-22))<85);for(const h of hits){const b=shot.bullets.find(b=>b.id===h.bullet),away=Math.sign(u.x-h.x)||1;G.move(s,0,(b?.stage===1?-1:1)*away*45*(W.combat.get(s.characterId).pushResistance||1));}if(u.x!==from.x){u.animation={from,age:0,duration:.45,lift:0};u.reactionKind='push';}}
}
const api={technique,telegraph,appearance,decorate,plan,resolve,fixedAim,damageScale,weakenFactor,finalizeDamage};if(node)module.exports=api;else root.ArcEnemyAttacks=api;
})(globalThis);
