'use strict';
// Marketing sequences contain only native trajectories and committed engine states.
const E=require('../dist/engine.js'),G=E.geometry,Q=require('./route-planner.cjs'),fs=require('node:fs'),path=require('node:path');
const clone=x=>JSON.parse(JSON.stringify(x)),rows={};
function action(s,plan,labelJa,labelEn,extra={}){const before=clone(s),shot=E.launch(s,plan.angle,plan.power,plan);if(!shot)throw Error('Rejected demonstration action');E.resolve(s,shot);while(s.pendingLoot.length)E.resolveLoot(s,null,true);return {before,after:clone(s),plan:clone(shot),label:{ja:labelJa,en:labelEn},...extra};}
function enemy(s){E.next(s);const from=clone(s.units[1]),x=E.enemyMoveTarget(s);G.move(s,1,x-s.units[1].x);const plan=E.cpuPlan(s,E.seeded(77));const step=action(s,plan,'準備にも相手の手番が返る','Preparation still gives the rival a turn',{walkFrom:from,walkSide:1});E.next(s);s.phase='aim';return step;}
{
 const s=E.campaign(31,{equippedCharacterId:'gun',matchSeed:77,battleInventory:{}}),p=Q.firing(s,'W01',p=>p.damage[1]>.4&&p.damage[0]===0&&p.events.filter(e=>e.type==='bounce').length===1&&p.events.some(e=>e.type==='bounce'&&e.surface==='reflector'));
 if(!p)throw Error('No single-bounce demonstration');
 rows.reflection={id:'reflection',stage:31,reason:{ja:'低い屋根の下から、明るい鏡床で一度だけ跳ねる。',en:'One bounce from the bright mirror floor passes under the roof.'},steps:[action(s,p.plan,'鏡床へ当て、敵に命中','Hit the mirror floor, then the rival')],proof:{source:'production engine5.0',valid:true,bounces:1,reflectorHit:true,enemyDamage:p.plan.damage[1]}};
}
{
 const s=E.campaign(7,{equippedCharacterId:'gun',matchSeed:77,battleInventory:{}}),p=Q.firing(s,'W01',p=>p.destroyed.length>0&&p.damage[1]===0&&p.damage[0]===0);if(!p)throw Error('No cover break');
 const steps=[action(s,p.plan,'割れた門が射線を塞いでいる','Break the cracked gate blocking the lane')];steps.push(enemy(s));const walkFrom=clone(s.units[0]);G.move(s,0,180);const follow=Q.firing(s,'W01',p=>p.damage[1]>.4&&p.damage[0]===0);if(!follow)throw Error('No follow-up after break');steps.push(action(s,follow.plan,'開いた窓から、次の一射','Send the next shot through the opening',{walkFrom,walkSide:0}));
 rows.destruction={id:'destruction',stage:7,reason:{ja:'一射目で遮蔽を外し、開いた射線を二射目で使う。',en:'The first shot removes cover; the next uses the opened lane.'},steps,proof:{source:'production engine5.0',valid:true,destroyed:p.plan.destroyed,followUpDamage:follow.plan.damage[1],beforeSolids:steps[0].before.world.solids.length,afterSolids:steps[0].after.world.solids.length}};
}
{
 const s=E.campaign(29,{equippedCharacterId:'gun',matchSeed:77,battleInventory:{}}),from=clone(s.units[0]);let selected=null;
 for(let angle=8;angle<=84&&!selected;angle+=4)for(let power=35;power<=100;power+=5){const p=E.trajectory(s,0,angle,power,{weaponId:'TELEPORT'}),land=G.teleportLanding(s.world,p.teleportContact,s.units[1],s.units[0].range);if(!land||Math.hypot(land.x-from.x,land.y-from.y)<350||land.x<450||land.x>=s.units[1].x-80)continue;const old={...s.units[0]};const {entry,...pad}=land;Object.assign(s.units[0],pad);const q=Q.firing(s,'W01',p=>p.damage[1]>.4&&p.damage[0]===0);Object.assign(s.units[0],old);if(q){selected={plan:p,land};break;}}
 if(!selected)throw Error('No distant useful teleport');
 const walkProbe=clone(s);G.move(walkProbe,0,1000);if(walkProbe.units[0].x>=selected.land.x-50)throw Error('Teleport is merely ordinary walking');
 s.teleportMode=true;const steps=[action(s,selected.plan,'歩いて渡れない島へ、転移弾を送る','Teleport to an island walking cannot reach')];s.teleportMode=false;steps.push(enemy(s));const follow=Q.firing(s,'W01',p=>p.damage[1]>.4&&p.damage[0]===0);if(!follow)throw Error('No useful attack after teleport');steps.push(action(s,follow.plan,'離れた射点から、敵を狙う','Aim from the new distant position'));
 rows.teleport={id:'teleport',stage:29,reason:{ja:'渡れない谷を越え、遠い中継島を次の射点にする。',en:'Cross the impassable gap and use the far relay island as a firing position.'},steps,proof:{source:'production engine5.0',valid:true,displacement:Math.hypot(steps[0].after.units[0].x-from.x,steps[0].after.units[0].y-from.y),walkingLimit:walkProbe.units[0].x,landing:clone(steps[0].after.units[0]),followUpDamage:follow.plan.damage[1]}};
}
fs.writeFileSync(path.resolve(__dirname,'../../site/scenes.js'),'/* Generated from ARCLINE0.13 production physics; do not edit. */\nglobalThis.ArcSiteScenes='+JSON.stringify(rows)+';\n');console.log(Object.fromEntries(Object.entries(rows).map(([id,r])=>[id,{steps:r.steps.length,proof:r.proof}])));
