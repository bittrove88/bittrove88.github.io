(function(root){
'use strict';
const C=typeof module!=='undefined'?require('./combat.js'):root.ArcCombat;
const K=typeof module!=='undefined'?require('./skills.js'):root.ArcSkills;
const names=['Standard','Heavy Shell','Needle','Mortar','Hopper','Ricochet','Roller','Skipper','Fan Shot','Cluster','Twin','Airburst','Drill','Rail','Archer','Undercut','Impact','Magnet','Lifter','Pinball'];
const weapons=names.map((name,i)=>({id:'W'+String(i+1).padStart(2,'0'),name,speed:1,gravity:1,damage:1,blast:60,shots:1,bounces:0}));
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
const coreUnlocks={W01:0,W02:3,W06:8,W14:13,W07:28,W12:35,W15:43,W10:48,W13:14,W16:67,W17:75,W19:84};
const teleport={id:'TELEPORT',name:'Teleport',speed:1,gravity:1,damage:0,blast:0,shots:1,bounces:0,teleport:true,appearance:{color:'#a9e9ff',shape:'ring',glyph:'◎',label:'WARP',size:7}};
const skills=['BURST','BLINK','PUSH','BOUNCE','PULL','SPLIT','PHASE','SWAP',...K.ids];
function get(id,characterId){if(id==='TELEPORT')return teleport;if(id==='W01'&&characterId)return C.get(characterId).normal;return weapons.find(w=>w.id===id)||C.weapons.find(w=>w.id===id)||weapons[0];}
const api={weapons,skills,coreUnlocks,teleport,combat:C,get};
if(typeof module!=='undefined')module.exports=api;else root.ArcWeapons=api;
})(globalThis);
