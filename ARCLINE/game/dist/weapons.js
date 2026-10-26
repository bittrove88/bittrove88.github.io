(function(root){
'use strict';
const names=['Standard','Heavy Shell','Needle','Mortar','Hopper','Ricochet','Roller','Skipper','Fan Shot','Cluster','Twin','Airburst','Drill','Rail','Archer','Undercut','Impact','Magnet','Lifter','Pinball'];
const weapons=names.map((name,i)=>({id:'W'+String(i+1).padStart(2,'0'),name,speed:1,gravity:1,damage:1,blast:60,shots:1,bounces:0}));
weapons[0].blast=64; // Blockout tuning: +4px to preserve a 13-point graze band; no aim correction.
Object.assign(weapons[1],{speed:.88,gravity:1.1,damage:1.25,blast:40});
Object.assign(weapons[2],{speed:1.12,damage:1.06,blast:20,needle:true});
Object.assign(weapons[3],{gravity:.8,minAngle:55,damage:1.06});
Object.assign(weapons[4],{bounces:1,damage:.97,blast:50});
Object.assign(weapons[5],{bounces:2,damage:.93,blast:30});
Object.assign(weapons[6],{roller:true,blast:50});
Object.assign(weapons[7],{bounces:3,skipper:true,damage:.9,blast:40});
Object.assign(weapons[8],{fan:true,shots:3,blast:35});
Object.assign(weapons[9],{split:true,blast:40});
Object.assign(weapons[10],{twin:true,shots:2,damage:1.06,blast:40});
Object.assign(weapons[11],{airburst:true,damage:.9,blast:70});
Object.assign(weapons[12],{phase:30,damage:.9,blast:30});
Object.assign(weapons[13],{gravity:.2,damage:.93,blast:10});
Object.assign(weapons[14],{archer:true,damage:1.03,blast:40});
Object.assign(weapons[15],{wave:true});
Object.assign(weapons[16],{push:true,damage:.85,blast:30});
Object.assign(weapons[17],{pull:true,damage:.85});
Object.assign(weapons[18],{lift:true,damage:.87,blast:40});
Object.assign(weapons[19],{bounces:3,push:true,damage:.93,blast:30});
// Appearance only: keeps each weapon recognizable without changing damage or flight.
const appearances=[
 ['#fff0a9','orb','●','ARC',6],['#ff9a62','shell','⬟','HEAVY',10],
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
const skills=['BURST','BLINK','PUSH','BOUNCE','PULL','SPLIT','PHASE','SWAP'];
const api={weapons,skills,get:id=>weapons.find(w=>w.id===id)||weapons[0]};
if(typeof module!=='undefined')module.exports=api;else root.ArcWeapons=api;
})(globalThis);
