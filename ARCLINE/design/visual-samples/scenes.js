(function(root){
'use strict';
const node=typeof module!=='undefined',E=node?require('../../game/dist/engine.js'):root.ArcEngine,G=E.geometry;
const clone=o=>JSON.parse(JSON.stringify(o));
const definitions=Object.freeze([
 Object.freeze({id:'shore',title:'入江・昼',subtitle:'ガンとペブル / 固定・破壊・反射',character:'gun',enemy:'enemy:pebble',theme:'shore',baseStage:6,weapon:'W06',weaponName:'反射弾',states:['通常','破壊材を除去'],sources:['S01','S02','S05','S08'],caption:'硬いミントの反射面、紫の破壊材、浮遊する補給箱を見比べます。'}),
 Object.freeze({id:'cave',title:'鏡の岸壁・洞窟',subtitle:'ハーバー・ノット / 橋・反射板・開口',character:'gun',enemy:'midboss:harbor-knot',theme:'cave',baseStage:13,weapon:'W06',weaponName:'反射弾',states:['橋を閉じる','橋を開く','屋根を破壊'],sources:['S04','S07','S12'],caption:'板と支点、鏡面の枠、壊せる屋根を確認します。中ボスの戦闘は未導入の状態見本です。'}),
 Object.freeze({id:'polarity',title:'暗所・極性',subtitle:'ユイとポラリス / 磁場・端末・転移',character:'yui',enemy:'boss:polaris-core',theme:'polarity',baseStage:80,weapon:'TELEPORT',weaponName:'転移弾',states:['稼働','反転予約','弱化','停止'],sources:['S02','S03','S14','S16'],caption:'極性の向き、予約の3灯、弱化と停止を確認します。転移は実際の接触・落下・接地を再生します。'})
]);
function specFor(def){
 const spec=clone(E.levels[def.baseStage-1]);Object.assign(spec,{name:'描画見本 '+def.id,nameEn:'Visual sample '+def.id,theme:def.theme==='shore'?0:def.theme==='cave'?1:15,hold:1,features:[],staticFeatures:[],phaseFeatures:null,teleport:true,pickups:[],skills:{},clearRewards:[],floors:[[[0,-3],[100,-3]]],spawn:[[18,15],[65,15]]});
 if(def.id==='shore'){
  spec.components=[{id:'sample-shore-ground',poly:[[0,15],[28,15],[36,13],[56,13],[65,15],[100,15],[100,-3],[0,-3]],destructible:false},{id:'sample-shore-purple',poly:[[46,18],[53,18],[53,21],[46,21]],destructible:true}];spec.features=[{type:'W',v:[36,56]}];
 }else if(def.id==='cave'){
  spec.components=[{id:'sample-cave-left',poly:[[0,15],[32,15],[32,-3],[0,-3]],destructible:false},{id:'sample-cave-right',poly:[[44,15],[100,15],[100,-3],[44,-3]],destructible:false},{id:'sample-cave-roof',poly:[[48,25],[70,25],[70,28],[48,28]],destructible:true}];spec.features=[{type:'B',v:[32,15,12,0]},{type:'W',v:[44,54]},{type:'K',v:[58,22,64]}];
 }else{
  spec.components=[{id:'sample-polarity-ground',poly:[[0,15],[100,15],[100,-3],[0,-3]],destructible:false}];spec.features=[{type:'W',v:[32,48]},{type:'M',v:[44,21,14,1]},{type:'T',v:[56,20]}];
 }
 return spec;
}
function make(id='shore',variant=0){
 const def=definitions.find(d=>d.id===id)||definitions[0],index=Math.max(0,Math.min(def.states.length-1,variant|0)),s=E.campaign(def.baseStage,{equippedCharacterId:def.character,matchSeed:7021,battleInventory:{weapons:{W06:3},skills:{}}});
 s.spec=specFor(def);s.stage=def.baseStage;s.map=def.baseStage-1;s.angle=36;s.power=84;s.round=def.id==='cave'&&index===1?2:1;s.mode=def.weapon==='TELEPORT'?'W01':def.weapon;s.weaponId=s.mode;s.teleportMode=def.weapon==='TELEPORT';s.pickups=[];s.effects={broken:0,polarity:1,destroyed:[]};
 if(def.id==='polarity'){
  if(index===1)s.effects.pendingPolarity=-1;
  if(index>=2){s.effects.broken=index===2?1:2;s.units[1].parts.forEach((p,i)=>{if(i<s.effects.broken)p.hp=0;});}
 }
 s.world=G.world(s.spec,s.round,s.bossPhase,s.effects);
 if((def.id==='shore'&&index===1)||(def.id==='cave'&&index===2)){s.effects.destroyed=s.world.solids.filter(o=>o.destructible).map(o=>o.id);s.world=G.without(s.world,s.effects.destroyed);}
 for(const [i,x]of [[0,180],[1,650]]){const point=G.safePosition(s.world,x,350,s.units[1-i],[35,965]);if(!point)throw Error('Unsafe sample position '+id);Object.assign(s.units[i],point,{range:[35,965],animation:null});}
 let choice;
 if(def.weapon==='TELEPORT')choice={angle:8,power:64};
 else choice=E.solve(s,0,{weaponId:def.weapon,requireEvent:'bounce',minAngle:-8,maxAngle:62});
 if(!choice||!Number.isFinite(choice.angle)||!Number.isFinite(choice.power))throw Error('No finite sample shot '+id);
 s.angle=choice.angle;s.power=choice.power;
 let plan=E.trajectory(s,0,s.angle,s.power,{weaponId:def.weapon,skill:null});
 if(def.id==='shore'){
  const point=plan.path[Math.min(plan.path.length-2,Math.max(1,Math.floor(plan.path.length*.28)))];
  s.pickups=[{id:'sample-weapon',placementId:'visual-sample-weapon',kind:'trial',weaponId:'W06',x:point.x,y:point.y,collected:false}];
  plan=E.trajectory(s,0,s.angle,s.power,{weaponId:def.weapon,skill:null});
 }
 const before=clone(s),after=clone(s),resolved=clone(plan);E.launch(after,s.angle,s.power,resolved);E.resolve(after,resolved);
 return {def,index,before,after,plan:clone(plan),resolution:{teleportSuccess:resolved.teleportSuccess??null},scope:'AUTHORED_RENDER_VIGNETTE_NOT_A_REPLACEMENT_LEVEL',proof:{events:[...new Set(plan.events.map(e=>e.type))],damage:plan.damage,iterations:plan.iterations,finite:plan.bullets.every(b=>b.path.every(p=>Number.isFinite(p.x+p.y+p.t)))}};
}
function at(sample,age){
 const lead=.75,flight=age-lead,afterShot=flight>=sample.plan.duration,post=Math.max(0,flight-sample.plan.duration),world=afterShot?sample.after.world:G.without(sample.before.world,sample.plan.events.filter(e=>e.type==='break'&&e.t<=flight).map(e=>e.solidId)),collected=new Set(sample.plan.events.filter(e=>e.type==='pickup'&&e.t<=flight).map(e=>e.id));
 const base=afterShot?sample.after:sample.before;
 const display={...base,units:base.units.map(u=>({...u}))};
 if(afterShot&&sample.plan.teleport){const u=display.units[0],anim=u.animation;if(anim){const progress=Math.max(0,Math.min(1,post/anim.duration));u.x=anim.from.x+(u.x-anim.from.x)*progress;u.y=anim.from.y+(u.y-anim.from.y)*progress*progress;u.slope=anim.from.slope+(u.slope-anim.from.slope)*progress;}}
 display.world=world;return {display,world,pickups:sample.before.pickups.filter(p=>!collected.has(p.id)),shot:flight>=0?sample.plan:null,flight:Math.max(0,flight),phase:flight<0?'準備':!afterShot?'発射':sample.plan.teleport?'着地':'結果',period:lead+sample.plan.duration+1.2};
}
const api=Object.freeze({definitions,make,at});if(node)module.exports=api;else root.ArcVisualSamples=api;
})(globalThis);
