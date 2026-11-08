(function(root){
'use strict';
const C=typeof module!=='undefined'?require('./combat.js'):root.ArcCombat;
const K=typeof module!=='undefined'?require('./skills.js'):root.ArcSkills;
const A=typeof module!=='undefined'?require('./attack-catalog.js'):root.ArcAttackCatalog||{weapons:{},enemyTechniques:{}};
const names=['Standard','Heavy Shell','Needle','Mortar','Hopper','Ricochet','Roller','Skipper','Fan Shot','Cluster','Twin','Airburst','Drill','Rail','Archer','Undercut','Impact','Magnet','Lifter','Pinball'];
const weapons=names.map((name,i)=>({id:'W'+String(i+1).padStart(2,'0'),name,...C.ballistics,damage:1,blast:60,shots:1,bounces:0}));
weapons[0].blast=64;
Object.assign(weapons[1],{speed:.82,gravity:1.18,damage:1.25,blast:100});
Object.assign(weapons[2],{speed:1.45,gravity:.7,damage:1.06,blast:18,needle:true});
Object.assign(weapons[3],{speed:.8,gravity:.65,minAngle:55,damage:1.08,blast:76});
Object.assign(weapons[4],{speed:.98,gravity:1.1,bounces:1,hop:true,restitution:.86,blast:54});
Object.assign(weapons[5],{speed:1.14,gravity:.8,bounces:2,restitution:.96,blast:40});
Object.assign(weapons[6],{speed:.95,gravity:1.15,roller:true,rollSpeed:180,rollDistance:220,blast:58});
Object.assign(weapons[7],{speed:1.13,gravity:.85,bounces:3,skipper:true,restitution:.92,blast:46});
Object.assign(weapons[8],{speed:.94,fan:true,shots:3,blast:44});
Object.assign(weapons[9],{speed:.88,gravity:1.12,split:true,blast:48});
Object.assign(weapons[10],{speed:1.08,gravity:.9,twin:true,shots:2,damage:1.06,blast:44});
Object.assign(weapons[11],{airburst:true,proximity:80,blast:96});
Object.assign(weapons[12],{speed:1.08,gravity:.9,phase:110,blast:32});
Object.assign(weapons[13],{speed:1.5,gravity:.08,blast:18});
Object.assign(weapons[14],{gravity:.82,archer:true,damage:1.03,blast:52});
Object.assign(weapons[15],{speed:.88,gravity:1.15,wave:true,waveDistance:180});
Object.assign(weapons[16],{speed:1.08,push:true,pushDistance:110,blast:56});
Object.assign(weapons[17],{speed:.88,gravity:1.05,pull:true,pullDistance:100,blast:80});
Object.assign(weapons[18],{speed:.9,gravity:.82,lift:true,liftHeight:110,liftDistance:60,blast:64});
Object.assign(weapons[19],{speed:1.15,gravity:.8,bounces:3,restitution:.98,push:true,pushDistance:75,blast:46});
// The same appearance descriptors are used by inventory, previews and live shots.
const appearances=[
 ['#fff0a9','orb','●','STANDARD',6],['#ff9a62','shell','⬟','HEAVY',10],
 ['#8af3ff','needle','➤','NEEDLE',5],['#ffb2cf','shell','◆','LOFT',8],
 ['#c6ff87','ring','⌁','HOP',7],['#77ffe5','ring','↗','RICOCHET',7],
 ['#b1fbc7','gear','◉','ROLL',9],['#ffe275','ring','⋯','SKIP',7],
 ['#f6a3ff','spark','⋔','FAN',6],['#ffbd78','diamond','✦','CLUSTER',7],
 ['#8fc6ff','orb','••','TWIN',7],['#dab0ff','ring','◎','AIRBURST',8],
 ['#ffba80','drill','➤','DRILL',8],['#95ffff','needle','━','RAIL',6],
 ['#d4ff8f','arrow','↓','DIVE',8],['#ffdf87','diamond','≋','WAVE',8],
 ['#ff977e','shell','→','IMPACT',9],['#d6a2ff','orbit','⊙','PULL',8],
 ['#8ee6ff','arrow','↑','LIFT',8],['#edff7e','spark','✧','PINBALL',8]
];
weapons.forEach((weapon,i)=>{const [color,shape,glyph,label,size]=appearances[i];weapon.appearance={color,shape,glyph,label,size};});
// Preserve the old ammunition catalog for saves and enemy attack patterns.
const legacyWeapons=weapons.map(w=>({...w,appearance:{...w.appearance}}));
const activeIds=['W21','W22','W02','W07','W09','W10','W11','W12','W14','W16','W19','W23'];
Object.assign(weapons[1],{damageCap:1.875,bossDamageCap:2});
for(const index of [6,11,15,18])Object.assign(weapons[index],{damageCap:1.5,bossDamageCap:2});
Object.assign(weapons[8],{childDamage:.9,damageCap:1.75,criticalMultiplier:1});
Object.assign(weapons[9],{splitChildDamage:.9,spiral:true,damageCap:1.75,criticalMultiplier:1});
Object.assign(weapons[10],{childDamage:1,damageCap:1.75,criticalMultiplier:1});
Object.assign(weapons[13],{damage:1.1,damageCap:1.65});
weapons.push(
 {id:'W21',name:'Twin Rain',...C.ballistics,minAngle:45,maxAngle:135,damage:.9,blast:45,shots:1,bounces:0,split:true,twoWave:true,damageCap:1.75,criticalMultiplier:1,appearance:{color:'#88cfff',shape:'diamond',glyph:'⋮',label:'RAIN',size:8}},
 {id:'W22',name:'Sky Bloom',...C.ballistics,minAngle:45,maxAngle:135,damage:1.05,blast:180,shots:1,bounces:0,apexBurst:true,damageCap:1.25,appearance:{color:'#ffc88d',shape:'spark',glyph:'✺',label:'BLOOM',size:9}},
 {id:'W23',name:'Drain Shell',...C.ballistics,damage:1,blast:60,shots:1,bounces:0,damageCap:1.5,drain:.25,drainHpCap:.15,appearance:{color:'#b0f6c9',shape:'orbit',glyph:'+',label:'DRAIN',size:8}}
);
const namesJa={W01:'通常弾',W03:'貫通針',W04:'迫撃弾',W05:'ホッパー',W06:'跳弾',W08:'低空跳弾',W13:'ドリル',W15:'急降下弾',W17:'押し出し弾',W18:'引き寄せ弾',W20:'ピンボール',W02:'重榴弾',W07:'転がる弾',W09:'扇状弾',W10:'分裂弾',W11:'連射弾',W12:'空中炸裂弾',W14:'レール弾',W16:'地走り弾',W19:'打ち上げ弾',W21:'二波雨弾',W22:'空中広域弾',W23:'吸収弾'};
weapons.forEach(w=>{w.nameJa=namesJa[w.id]||w.name;w.legacy=w.id!=='W01'&&!activeIds.includes(w.id);});
for(const [id,row]of Object.entries(A.weapons)){const w=weapons.find(w=>w.id===id);if(w)Object.assign(w,row.params,{name:row.name,nameJa:row.nameJa,appearance:{...w.appearance,...row.appearance}});}
const enemyTechniques=Object.entries(A.enemyTechniques||{}).map(([id,r])=>({id,...C.ballistics,shots:1,bounces:0,damage:1,blast:60,...r.params,name:r.name,nameJa:r.nameJa,enemyTechnique:true,appearance:{...r.appearance}}));
function getEnemy(id){return enemyTechniques.find(w=>w.id===id)||legacyWeapons.find(w=>w.id===id)||legacyWeapons[0];}
const coreUnlocks={W01:0,W02:3,W06:8,W14:13,W07:28,W12:35,W15:43,W10:48,W13:14,W16:67,W17:75,W19:84};
const teleport={id:'TELEPORT',name:'Teleport',...C.ballistics,damage:0,blast:0,shots:1,bounces:0,teleport:true,appearance:{color:'#a9e9ff',shape:'ring',glyph:'◎',label:'WARP',size:7}};
const skills=['BURST','BLINK','PUSH','BOUNCE','PULL','SPLIT','PHASE','SWAP',...K.ids];
function get(id,characterId){if(id==='TELEPORT')return teleport;if(id==='W01'&&characterId)return C.get(characterId).normal;return weapons.find(w=>w.id===id)||C.weapons.find(w=>w.id===id)||enemyTechniques.find(w=>w.id===id)||weapons[0];}
// Shared vector symbols for map capsules and inventory; no glyph-font fallback.
const iconPaths={
 W01:'M12 5a7 7 0 1 0 0 14 7 7 0 1 0 0-14Z',
 W02:'M12 3 21 10 18 21H6L3 10Z',W03:'M3 12h18m-7-5 7 5-7 5',
 W04:'M12 3 21 12 12 21 3 12Z',W05:'M3 19q4-28 9 0 4-15 9-4',W06:'M3 19 12 4l9 15m-7-3 7 3-1-7',
 W07:'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18Zm0 5a4 4 0 1 0 0 8 4 4 0 1 0 0-8ZM12 3v5m0 8v5M3 12h5m8 0h5',
 W08:'M2 18q3-8 6 0 3-8 6 0 3-8 8-2',W09:'M12 21V3m0 18L3 6m9 15 9-15M9 6l3-3 3 3',
 W10:'M12 2 17 7 12 12 7 7Zm0 12v8m-4-9-6 6m14-6 6 6',
 W11:'M4 5h5v14H4Zm11 0h5v14h-5Z',W12:'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18Zm0 5a4 4 0 1 0 0 8 4 4 0 1 0 0-8Z',
 W13:'M3 6 21 12 3 18Zm4 1v10m5-8v6',W14:'M2 9h15l5 3-5 3H2m1-3h19',W15:'M12 3v18m-7-7 7 7 7-7',
 W16:'M2 7q3-4 7 0t7 0 6 0M2 12q3-4 7 0t7 0 6 0M2 17q3-4 7 0t7 0 6 0',
 W17:'M3 12h18m-7-7 7 7-7 7',W18:'M21 12H3m7-7-7 7 7 7',W19:'M12 21V3m-7 7 7-7 7 7',W20:'M2 18 8 5l8 14 6-13',
 W21:'M5 2v6m7-6v6m7-6v6M5 14v6m7-6v6m7-6v6',
 W22:'M12 2v5m0 10v5M2 12h5m10 0h5M5 5l4 4m6 6 4 4M5 19l4-4m6-6 4-4',
 W23:'M12 4v16M4 12h16M4 4l4 4m-4-1V4h3m13 16-4-4m4 1v3h-3'
};
function iconPath(id){return iconPaths[id]||iconPaths.W01;}
function iconMarkup(id){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${iconPath(id)}"/></svg>`;}
function drawIcon(ctx,id,x,y,size=22,color='#fff0a9'){ctx.save();ctx.translate(x-size/2,y-size/2);ctx.scale(size/24,size/24);ctx.strokeStyle=color;ctx.lineWidth=1.8;ctx.lineCap='round';ctx.lineJoin='round';if(typeof Path2D!=='undefined')ctx.stroke(new Path2D(iconPath(id)));else{ctx.beginPath();ctx.arc(12,12,8,0,Math.PI*2);ctx.stroke();}ctx.restore();}
const api={iconPath,iconMarkup,drawIcon,weapons,activeIds,getEnemy,skills,coreUnlocks,teleport,combat:C,get};
if(typeof module!=='undefined')module.exports=api;else root.ArcWeapons=api;
})(globalThis);
