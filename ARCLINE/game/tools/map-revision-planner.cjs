'use strict';
// Targeted native matches for the 30 revised maps. No synthetic hits, stat edits,
// free movement, inventory grants or enemy-turn suppression.
const E=require('../dist/engine.js'),G=E.geometry,T=require('../dist/final-team.js'),fs=require('fs'),path=require('path');
const score=p=>p.damage[1]-p.damage[0]*4+(p.destroyed?.length||0)*.08+Object.values(p.partDamage).reduce((a,b)=>a+b,0)*.02;
function firing(s,id='W01',filter=()=>true){let best=null;const w=E.weapon(s,0,id),lo=w.minAngle??-12,hi=w.maxAngle??170;
 const tryShot=(angle,power)=>{const p=E.trajectory(s,0,angle,power,{weaponId:id,skill:null});if(p.damage[0]>.15||!filter(p))return;const value=score(p);if(!best||value>best.score)best={angle,power,score:value,plan:p,weaponId:id};};
 for(let a=lo;a<=hi;a+=6)for(let p=25;p<=100;p+=5)tryShot(a,p);
 if(best){const b={...best};for(let a=Math.max(lo,b.angle-5);a<=Math.min(hi,b.angle+5);a+=2)for(let p=Math.max(20,b.power-4);p<=Math.min(100,b.power+4);p+=2)tryShot(a,p);}
 return best;
}
function teleport(s,preferShelf=false){let best=null;const original={...s.units[0]},seen=new Set();
 for(let a=0;a<=170;a+=8)for(let p=25;p<=100;p+=10){const shot=E.trajectory(s,0,a,p,{weaponId:'TELEPORT',skill:null}),land=G.teleportLanding(s.world,shot.teleportContact,s.units[1],s.units[0].range);if(!land||Math.abs(land.x-original.x)<85)continue;const key=Math.round(land.x/50)+':'+Math.round(land.y/40);if(seen.has(key))continue;seen.add(key);const {entry,...pad}=land;Object.assign(s.units[0],original,pad);const aim=E.solve(s,0,{maxAngle:170,minAngle:-12}),value=aim.score-Math.abs(land.x-s.units[1].x)*.0001+(preferShelf&&!land.surface?.startsWith('floor')?2:0);if(!best||value>best.score)best={angle:a,power:p,score:value,weaponId:'TELEPORT'};}
 Object.assign(s.units[0],original);return best;
}
function match(stage,seed=4697,id='gun',allowSpecial=false,strategy='direct'){
 const s=E.campaign(stage,{matchSeed:seed,difficulty:'normal',equippedCharacterId:id,battleInventory:{}}),actions=[],enemies=[],entries=[],seen=new Set();let turns=0;
 while(!s.result&&turns++<s.shotLimit*2+4){
  if(s.turn===0){s.phase='aim';if(T.active(s)&&!seen.has(s.finalTeam.serial)){seen.add(s.finalTeam.serial);entries.push({id:s.characterId,map:s.finalTeam.map,x:s.units[0].x,y:s.units[0].y,hp:s.units[0].hp,boss:s.units[1].x,surface:s.units[0].surface});}
   const start={...s.units[0]},used=s.walkUsed||0,candidates=[],danger=['DROP','MARK','PREPARE'].includes(s.telegraph?.kind),forceTerminal=stage===80&&strategy==='terminal'&&!actions.some(a=>a.events.includes('terminal'));
   for(const input of [0,-10000,10000]){Object.assign(s.units[0],start);s.walkUsed=used;const moved=E.move(s,0,input),safe=!danger||Math.abs(s.units[0].x-s.telegraph.targetX)>105;const p=firing(s,'W01',p=>!forceTerminal||p.events.some(e=>e.type==='terminal'));if(p)candidates.push({...p,input,moved,safe});if(allowSpecial&&s.specialAmmo&&!forceTerminal){const p=firing(s,E.combat.get(s.characterId).special.id);if(p)candidates.push({...p,input,moved,safe});}}
   Object.assign(s.units[0],start);s.walkUsed=used;candidates.sort((a,b)=>b.score-a.score||((b.safe?1:0)-(a.safe?1:0))*10||Math.abs(a.moved)-Math.abs(b.moved));let a=candidates.find(p=>p.safe&&p.plan.damage[1]>.1)||candidates.find(p=>p.plan.damage[1]>.1);
   if(forceTerminal)a=candidates.find(p=>p.plan.events.some(e=>e.type==='terminal'));
   if(!a)a=candidates.find(p=>p.plan.destroyed?.length||Object.values(p.plan.partDamage).some(d=>d>0));
   if(strategy==='shelf'&&(T.active(s)?!actions.some(a=>a.map===s.finalTeam.map):actions.length===0)){const warp=teleport(s,true);if(warp)a={...warp,input:0,moved:0,teleport:true};}
   if(!a){const warp=teleport(s);if(warp)a={...warp,input:0,moved:0,teleport:true};else a=candidates[0];}
   if(!a)throw Error('No legal action '+stage+'/'+s.characterId);
   E.move(s,0,a.input);s.teleportMode=!!a.teleport;s.mode=a.teleport?'W01':a.weaponId;const owner=s.characterId,map=s.finalTeam?.map,from={x:s.units[0].x,y:s.units[0].y},shot=E.launch(s,a.angle,a.power);if(!shot)throw Error('Rejected launch '+stage);E.resolve(s,shot);while(s.pendingLoot.length)E.resolveLoot(s,null,true);
   actions.push({id:owner,map,angle:a.angle,power:a.power,weaponId:shot.weaponId,teleport:!!shot.teleport,moves:[{input:a.input,moved:a.moved}],walkUsed:s.walkUsed||0,from,to:{x:s.units[0].x,y:s.units[0].y},damage:shot.damage,events:[...new Set(shot.events.map(e=>e.type))],destroyed:shot.destroyed,hp:s.units[0].hp});
  }else{s.phase='cpu';const target=E.enemyMoveTarget(s);G.move(s,1,target-s.units[1].x);const p=E.cpuPlan(s,E.seeded((seed+s.round*1009)>>>0));E.resolve(s,E.launch(s,p.angle,p.power,p));enemies.push({round:s.round,id:s.characterId,kind:p.attackKind,angle:p.angle,power:p.power,damage:p.damage,hp:s.units[0].hp});}
  if(!s.result)E.next(s);
 }
 return {stage,seed,id,allowSpecial,strategy,result:s.result,reason:s.reason,shots:s.shotCount,limit:s.shotLimit,remainingHp:s.units[0].hp,complete:T.complete(s),entries,actions,enemies,...(s.finalTeam?{teamDamage:s.finalTeam.damage}:{} )};
}
module.exports={match,firing,teleport};
if(require.main===module){const stages=(process.env.ARCLINE_MAP_STAGES||'50,80,90').split(',').map(Number),seeds=(process.env.ARCLINE_MAP_SEEDS||'4697').split(',').map(Number),out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-map-revision';fs.mkdirSync(out,{recursive:true});const file=path.join(out,process.env.ARCLINE_MAP_REPORT||'MAP_MATCHES.json'),report=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):{status:'PASS',rows:[]};
 for(const stage of stages)for(const seed of seeds){const requested=process.env.ARCLINE_MAP_CHARACTER||'gun',id=requested==='recommended'?E.levels[stage-1].recommendedCharacter:requested,special=process.env.ARCLINE_MAP_SPECIAL==='1',strategy=process.env.ARCLINE_MAP_STRATEGY||'direct';if(report.rows.some(r=>r.stage===stage&&r.seed===seed&&r.id===id&&r.allowSpecial===special&&r.strategy===strategy))continue;const row=match(stage,seed,id,special,strategy);report.rows.push(row);report.status=report.rows.every(r=>r.result==='win'&&r.complete&&r.actions.every(a=>a.walkUsed<=140+1e-7))?'PASS':'FAIL';fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');console.log(stage,seed,id,strategy,row.result,row.reason,row.shots,'hp',row.remainingHp);if(row.result!=='win')process.exitCode=1;}
}
