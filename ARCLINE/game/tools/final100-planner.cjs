'use strict';
// QA uses only production movement, projectiles, enemy turns and relay rules.
const E=require('../dist/engine.js'),T=require('../dist/final-team.js'),Q=require('./route-planner.cjs'),fs=require('node:fs'),path=require('node:path');
function match(seed=4697,allowSpecial=false){const s=E.campaign(100,{matchSeed:seed,battleInventory:{}}),actions=[],enemies=[],entries=[],seen=new Set();let safety=0;
while(!s.result&&safety++<s.shotLimit*2+4){if(s.turn===0){s.phase='aim';if(!seen.has(s.finalTeam.serial)){seen.add(s.finalTeam.serial);entries.push({id:s.characterId,map:s.finalTeam.map,x:s.units[0].x,y:s.units[0].y,hp:s.units[0].hp,boss:s.units[1].x});console.log('entry',s.characterId,s.finalTeam.map,'HP',E.combat.points(s.units[0].hp));}
 const moves=[],start={...s.units[0]},used=s.walkUsed||0,candidates=[],danger=['DROP','MARK','PREPARE'].includes(s.telegraph?.kind);
 for(const input of [0,-10000,10000,-70/E.combat.get(s.characterId).walk,70/E.combat.get(s.characterId).walk]){Object.assign(s.units[0],start);s.walkUsed=used;const moved=E.move(s,0,input),safe=!danger||Math.abs(s.units[0].x-s.telegraph.targetX)>105;
  const shot=Q.firing(s,'W01',p=>p.damage[0]<.12);if(shot)candidates.push({...shot,input,moved,safe,weaponId:'W01'});
  if(allowSpecial&&s.specialAmmo){const special=Q.firing(s,E.combat.get(s.characterId).special.id,p=>p.damage[0]<.12);if(special)candidates.push({...special,input,moved,safe,weaponId:E.combat.get(s.characterId).special.id});}
 }
 Object.assign(s.units[0],start);s.walkUsed=used;candidates.sort((a,b)=>(b.safe?3:0)+b.score-((a.safe?3:0)+a.score)||Math.abs(a.moved)-Math.abs(b.moved));let a=candidates.find(p=>p.safe&&p.plan.damage[1]>.1)||candidates.find(p=>p.plan.damage[1]>.1);
 if(a){moves.push({input:a.input,moved:E.move(s,0,a.input)});s.teleportMode=false;s.mode=a.weaponId;}
 else{a=Q.firing(s,'W01',p=>p.destroyed?.length>0&&p.damage[0]<.12);if(a){s.teleportMode=false;s.mode='W01';if(danger){const input=s.units[0].x<s.units[1].x?-10000:10000;moves.push({input,moved:E.move(s,0,input)});a=Q.firing(s,'W01',p=>p.destroyed?.length>0&&p.damage[0]<.12)||a;}}else{a=Q.teleport(s);s.teleportMode=true;s.mode='W01';}}
 if(!a)throw Error('No route '+s.characterId);const id=s.characterId,map=s.finalTeam.map,quota=s.finalTeam.damage[id],shot=E.launch(s,a.angle,a.power);if(!shot)throw Error('Launch rejected '+id);E.resolve(s,shot);while(s.pendingLoot.length)E.resolveLoot(s,null,true);actions.push({id,map,angle:a.angle,power:a.power,weaponId:shot.weaponId,teleport:!!shot.teleport,moves,walkUsed:s.walkUsed||0,bodyDamage:shot.damage[1],quotaBefore:quota,quotaAfter:s.finalTeam.damage[id],hp:s.units[0].hp});
 console.log('shot',actions.length,id,'quota',s.finalTeam.damage[id]*20,'HP',E.combat.points(s.units[0].hp),shot.teleport?'warp':'');
}else{s.phase='cpu';const p=E.cpuPlan(s,E.seeded((s.matchSeed+s.round*1009)>>>0));E.resolve(s,E.launch(s,p.angle,p.power,p));enemies.push({round:s.round,id:s.characterId,kind:p.attackKind,damage:p.damage[0],hp:s.units[0].hp});}
if(!s.result)E.next(s);
}
return {seed,allowSpecial,result:s.result,reason:s.reason,complete:T.complete(s),shots:s.shotCount,limit:s.shotLimit,last:s.characterId,damage:s.finalTeam.damage,entries,actions,enemies};}
module.exports={match};if(require.main===module){const out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-final100';fs.mkdirSync(out,{recursive:true});const seeds=(process.env.ARCLINE_FINAL_SEEDS||'4697').split(',').map(Number),rows=[];for(const seed of seeds){const r=match(seed,process.env.ARCLINE_FINAL_SPECIAL==='1');rows.push(r);fs.writeFileSync(path.join(out,'FINAL100_MATCHES.json'),JSON.stringify({status:rows.every(r=>r.result==='win'&&r.complete&&r.actions.every(a=>a.walkUsed<=140+1e-7))?'PASS':'FAIL',matches:rows.length,rows},null,2));console.log(r.result,r.reason,r.shots);if(r.result!=='win')process.exitCode=1;}}
