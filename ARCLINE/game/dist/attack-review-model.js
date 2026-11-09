(function(root){
'use strict';
const node=typeof module!=='undefined',E=node?require('./engine.js'):root.ArcEngine,W=node?require('./weapons.js'):root.ArcWeapons,C=W.combat,G=E.geometry;
const A=node?require('./attack-catalog.js'):root.ArcAttackCatalog||{weapons:{},specials:{}};
const P=node?require('./preview.js'):root.ArcPreview;
const Motion=node?require('./attack-motion.js'):root.ArcAttackMotion;
const rows=C.profiles.map(p=>({id:'normal:'+p.id,category:'通常弾',character:p.id,stage:4,weaponId:'W01',name:({gun:'ガン',hana:'ハナ',koro:'コロ',ban:'バン',sora:'ソラ',rico:'リコ',hibari:'ヒバリ',mogu:'モグ',rin:'リン',yui:'ユイ'})[p.id]+' 通常弾',trajectory:'機体のメインカラーの弾と短い光跡。',impact:'同じ色の小さな閃光と粒子。',effect:'現行の直撃・爆風・中心命中を維持。'}));
for(const [id,r]of Object.entries(A.weapons))rows.push({...r,id:'weapon:'+id,category:'補助武器',stage:r.stage||4,character:'gun',weaponId:id,name:r.nameJa});
for(const [id,r]of Object.entries(A.specials))rows.push({...r,id:'special:'+id,category:'必殺技',stage:4,character:id,weaponId:'S_'+id.toUpperCase(),name:r.nameJa});
for(const foe of E.encounters.all){const stage=foe.stage||E.levels.find(l=>l.encounterId===foe.id)?.id||4;for(const kind of [...new Set(foe.attacks||['STANDARD'])])rows.push({id:foe.id+':'+kind,category:foe.kind==='normal'?'通常敵':foe.kind==='midboss'?'中ボス':'大ボス 基本技',stage,side:1,attackKind:kind,weaponId:'W01',name:foe.name+' '+kind,trajectory:foe.kind==='normal'?'機体の色で識別できる弾。既存の弾道を維持。':'機体固有のモチーフを添えた光跡。既存の弾道を維持。',impact:foe.kind==='normal'?'同じ色の小さな閃光。':'機構や材質を表す幾何学の光と火花。',effect:'既存の命中・破壊・移動規則を維持。部位破壊後の攻撃弱体化を保持。'});}
for(const [id,r]of Object.entries(A.enemyTechniques||{}))rows.push({...r,id:'technique:'+id,category:r.tier==='final'?'ラスボス':'大ボス 独自技',side:1,character:'gun',weaponId:id,name:r.nameJa,attackKind:id});
function state(row,scene){
 const s=E.campaign(row.stage,{equippedCharacterId:row.character||'gun',matchSeed:20261108,battleInventory:{weapons:{[row.weaponId]:6},skills:{}}});
 if(scene==='map'&&row.weaponId.startsWith('E_FINAL_')){const target=(Number(row.weaponId.at(-1))-1)*3,F=node?require('./final-team.js'):root.ArcFinalTeam;while(s.finalTeam.index<target){s.finalTeam.pending=true;F.advance(s);}}
 s.pickups=[];s.specialAmmo=3;s.mode=row.weaponId;s.phase='aim';s.turn=0;
 if(scene!=='map'){
  const components=scene==='wall'?[{id:'review-wall',destructible:true,poly:[[50,10],[53,10],[53,28],[50,28]]}]:[],floors=scene==='gap'?[[[0,10],[48,10]],[[57,5],[120,5]]]:[[[0,10],[120,10]]];
  const features=scene==='reflect'?[{type:'W',v:[0,120]}]:[];
  s.spec={...s.spec,worldWidth:1200,boss:row.side?!!s.spec.boss:false,midboss:row.side?!!s.spec.midboss:false,finalBattle:null,components,floors,features,staticFeatures:[],phaseFeatures:null};s.finalTeam=null;s.world=G.world(s.spec);
  s.units=[160,850].map((x,i)=>({...s.units[i],...G.safePosition(s.world,x,400),...(!row.side||i===0?{parts:[],core:null,hitShape:null,weaponPivot:null,muzzleLength:35}:{}),floating:false,hp:100,maxHp:100,range:[35,1165]}));s.units[0].facing=1;s.units[1].facing=-1;
 }
 return s;
}
function create(id,scene='arena'){
 const row=rows.find(r=>r.id===id);if(!row)throw new Error('Unknown attack '+id);let s=state(row,scene),proven=null;
 if(row.side===1){s.round=3;s.turn=1;s.phase='cpu';s.telegraph={kind:row.attackKind,...(row.weaponId.startsWith('E_')?{technique:row.weaponId}:{}),targetX:s.units[0].x,targetY:s.units[0].y-22,radius:A.enemyTechniques?.[row.weaponId]?.params.warningRadius||65,columns:row.weaponId==='E_90'?[-110,0,110]:[0],frozen:true};if(row.weaponId.startsWith('E_')&&s.stage<100)E.telegraph(s);const before=JSON.parse(JSON.stringify(s)),plan=E.cpuPlan(s,()=>.5);E.resolve(s,plan);return {row,before,after:s,plan,scene,motion:Motion.create(plan)};}
 if(scene==='arena'&&['補助武器','必殺技'].includes(row.category)&&P){const demo=P.create(s,row.weaponId);if(demo?.proof?.valid){s=JSON.parse(JSON.stringify(demo.before));proven={angle:demo.plan.angle,power:demo.plan.power};}}
 if(row.weaponId==='W23')s.units[0].hp=Math.min(s.units[0].hp,s.units[0].maxHp*.3);
 const before=JSON.parse(JSON.stringify(s));
 const aim=proven||(scene==='miss'?{angle:85,power:20}:E.solve(s,0,{weaponId:row.weaponId,minAngle:W.get(row.weaponId,s.characterId).minAngle??-10,maxAngle:W.get(row.weaponId,s.characterId).maxAngle??85}));
 aim.angle=G.clamp(aim.angle,W.get(row.weaponId,s.characterId).minAngle??-15,W.get(row.weaponId,s.characterId).maxAngle??170);
 s.angle=aim.angle;s.power=aim.power;const plan=E.trajectory(s,0,aim.angle,aim.power,{weaponId:row.weaponId});
 E.resolve(s,plan);return {row,before,after:s,plan,scene,motion:Motion.create(plan)};
}
const api={rows,create,state};if(node)module.exports=api;else root.ArcAttackReview=api;
})(globalThis);
