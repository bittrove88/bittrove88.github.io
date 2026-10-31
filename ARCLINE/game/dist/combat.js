(function(root){
'use strict';
// One internal HP/damage unit is twenty displayed points. Geometry stays in world units.
const pointsPerUnit=20,teleportCharge={rise:2.6,fall:2.6,hold:.25};
const rows=[
 ['gun',140,.8,.75,.65,2.6,.75,1.55,55,'Intermediate','Short-range heavy cannon. Close the distance.', 'Demolition Shell','A broad blast breaks cover and pushes the target.','#eb7928','shell'],
 ['ban',120,.95,.75,.4,2.6,.95,1.05,50,'Beginner','Steady mid-range fire.','Forward Shockwave','Impact sends a wide shockwave forward.','#da3156','shell'],
 ['hibari',120,1.05,.75,1,2.6,1.05,1,45,'Beginner','A steady, light arc.','Proximity Burst','Explodes near a visible rival before contact.','#24a6ad','ring'],
 ['hana',100,1,.75,1,2.4,1,1,50,'Beginner','One shot from the central barrel.','Triple Salvo','Three delayed shots spread across different angles.','#ee617e','spark'],
 ['rin',100,1,.75,1,3.2,1.2,1.05,28,'Intermediate','Fast small rounds; a slow, precise charge.','Focus Cannon','A precise center hit deals up to 75 damage.','#9570b7','needle'],
 ['mogu',120,.9,.75,.8,2.4,.95,1.05,50,'Intermediate','A steady mid-range arc; all firing angles available.','Breach Charges','Three blasts advance through breakable cover.','#e5a733','drill'],
 ['koro',100,1.15,1,1,2.4,1.05,1.15,45,'Intermediate','A low arc that can still reach high ground.','Rolling Bomb','Runs along floors, drops across gaps, then rolls again.','#a4bd39','gear'],
 ['sora',100,.95,.75,1,2.8,.9,.8,45,'Intermediate','A gentle arc with unrestricted normal elevation.','Meteor Rain','A high shot splits into eight falling bomblets.','#287cc1','diamond'],
 ['rico',80,1.2,.75,1.2,2.4,1,1,45,'Advanced','Steady normal fire without automatic ground bounces.','Growing Ricochet','Up to four bounces grow the damage and blast.','#d94894','ring'],
 ['yui',100,1.05,.75,1,2.8,.95,.9,45,'Advanced','A small arc without passive attraction.','Compression Core','Pulls a visible rival toward impact, then explodes.','#36b7a4','orbit']
];
const specials={
 gun:{speed:.72,gravity:1.45,damage:2.4,blast:110,damageCap:2.4,push:true,pushDistance:60},
 ban:{speed:.95,gravity:1,damage:2.4,blast:0,damageCap:2.4,coneLength:200,coneAngle:40,push:true,pushDistance:120},
 hibari:{speed:1.1,gravity:.85,damage:2,blast:100,damageCap:2,airburst:true,proximity:75},
 hana:{speed:.98,gravity:1,damage:.8,blast:65,damageCap:2.4,volley:[{offset:-7,delay:0,barrel:-1},{offset:0,delay:.18,barrel:0},{offset:7,delay:.36,barrel:1}]},
 rin:{speed:1.55,gravity:.28,damage:3,blast:22,damageCap:3.75,criticalMultiplier:1.25,needle:true},
 mogu:{speed:.95,gravity:1,damage:.7,blast:55,damageCap:2.1,breachPulses:3,pulseDelay:.22,pulseAdvance:22},
 koro:{speed:.95,gravity:1.1,damage:2.3,blast:90,damageCap:2.3,roller:true,rollSpeed:220,rollDistance:600,rollSeconds:3,resumeRoll:true,contactBreak:32},
 sora:{speed:.9,gravity:.7,damage:.35,blast:45,damageCap:2.4,minAngle:55,maxAngle:125,split:true,splitCount:8,splitSpread:28,splitChildDamage:.35,fallingChildren:true},
 rico:{speed:1.1,gravity:.9,damage:1.3,blast:70,damageCap:2.5,bounces:4,maxBounces:4,restitution:.95,bounceDamage:.3,bounceBlast:10,maxBlast:110},
 yui:{speed:.95,gravity:1,damage:2,blast:80,damageCap:2.6,pullToImpact:true,pullRadius:160,pullDistance:120,pullSeconds:.6,compressionRadius:45,compressionBonus:.6}
};
const profiles=rows.map(([id,hp,walk,climb,pushResistance,seconds,speed,gravity,blast,playerType,normalNote,specialName,specialNote,color,shape])=>({
 id,hp,walk,chargeWalk:id==='yui'?1.15:1,climb,pushResistance,hitbox:1,playerType,
 charge:{rise:seconds,fall:seconds,hold:.25},normalNote,specialNote,
 normal:{id:'N_'+id.toUpperCase(),name:'Standard',machineId:id,normal:true,speed,gravity,damage:1,blast,minAngle:-15,maxAngle:170,criticalMultiplier:1.5,damageCap:1.5,bossDamageCap:2,bounces:0,shots:1,appearance:{color:'#fff0a9',shape:id==='gun'?'shell':id==='rin'?'needle':'orb',glyph:'●',label:'NORMAL',size:id==='gun'?7:5}},
 special:{id:'S_'+id.toUpperCase(),name:specialName,machineId:id,special:true,shots:1,bounces:0,minAngle:-15,maxAngle:170,criticalMultiplier:1,...specials[id],appearance:{color,shape,glyph:'◆',label:'SPECIAL',size:10}}
}));
const deepFreeze=o=>{Object.freeze(o);for(const value of Object.values(o))if(value&&typeof value==='object'&&!Object.isFrozen(value))deepFreeze(value);return o;};
profiles.forEach(deepFreeze);Object.freeze(profiles);deepFreeze(teleportCharge);
const get=id=>profiles.find(p=>p.id===id)||profiles[0],weapons=Object.freeze(profiles.flatMap(p=>[p.normal,p.special]));
function chargePower(seconds,profileOrState){
 const timing=profileOrState?.teleportMode?teleportCharge:profileOrState?.charge||get(profileOrState?.characterId||profileOrState?.id).charge;
 const t=Math.max(0,seconds)%(timing.rise+timing.hold+timing.fall);
 return t<timing.rise?20+80*t/timing.rise:t<timing.rise+timing.hold?100:100-80*(t-timing.rise-timing.hold)/timing.fall;
}
const api={profiles,weapons,get,pointsPerUnit,teleportCharge,chargePower,points:n=>Math.round(n*pointsPerUnit*100)/100};
if(typeof module!=='undefined')module.exports=api;else root.ArcCombat=api;
})(globalThis);
