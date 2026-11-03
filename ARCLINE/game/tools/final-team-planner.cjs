'use strict';
// Offline QA only. Each attack uses the production engine and real enemy turns.
const E=require('../dist/engine.js'),T=require('../dist/final-team.js'),Q=require('./route-planner.cjs');
function match(seed,preferSpecial=false){const s=E.campaign(100,{matchSeed:seed,battleInventory:{}}),actions=[],enemies=[],entries=[],seen=new Set();let safety=0;
 while(!s.result&&safety++<s.shotLimit*2+6){if(s.turn===0){s.phase='aim';if(!seen.has(s.finalTeam.serial)){seen.add(s.finalTeam.serial);entries.push({id:s.characterId,index:s.finalTeam.index,map:s.finalTeam.map,x:s.units[0].x,y:s.units[0].y,hp:s.units[0].hp,maxHp:s.units[0].maxHp,special:s.specialAmmo,bossX:s.units[1].x});}
  if(['DROP','MARK','PREPARE'].includes(s.telegraph?.kind))E.geometry.move(s,0,s.units[0].x<s.units[1].x?-140:140);
  const before={x:s.units[0].x,y:s.units[0].y};let a=null;
  if(preferSpecial&&s.specialAmmo){const found=Q.firing(s,E.combat.get(s.characterId).special.id,p=>p.damage[1]>.1&&p.damage[0]<.1);if(found)a={kind:'special',angle:found.angle,power:found.power,walk:0};}
  if(!a)a=Q.choose(s);const id=s.characterId,map=s.finalTeam.map,quota=s.finalTeam.damage[id];s.teleportMode=a.kind==='teleport';s.mode=a.kind==='special'?E.combat.get(id).special.id:'W01';const p=E.launch(s,a.angle,a.power);if(!p)throw Error('Rejected team shot '+id);E.resolve(s,p);while(s.pendingLoot.length)E.resolveLoot(s,null,true);actions.push({...a,id,map,before,after:{x:s.units[0].x,y:s.units[0].y},bodyDamage:p.damage[1],quotaBefore:quota,quotaAfter:s.finalTeam.damage[id],hp:s.units.map(u=>u.hp),destroyed:p.destroyed});
 }else{s.phase='cpu';const p=E.cpuPlan(s,E.seeded((s.matchSeed+s.round*1009)>>>0));E.resolve(s,E.launch(s,p.angle,p.power,p));enemies.push({round:s.round,id:s.characterId,kind:p.attackKind,damage:p.damage,hp:s.units[0].hp});}
 if(!s.result)E.next(s);
 }
 return {seed,preferSpecial,result:s.result,reason:s.reason,shots:s.shotCount,limit:s.shotLimit,complete:T.complete(s),last:s.characterId,damage:s.finalTeam.damage,entries,actions,enemies};
}
module.exports={match};
if(require.main===module){const fs=require('node:fs'),path=require('node:path'),out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-final-team';fs.mkdirSync(out,{recursive:true});const rows=[];for(const [seed,special]of[[4697,false],[5694,false],[6691,false],[13719,true]]){const row=match(seed,special);rows.push(row);console.log(row.result+' '+seed+' '+row.shots+' shots, '+row.entries.length+' machines, last='+row.last);fs.writeFileSync(path.join(out,'TEAM_MATCHES.json'),JSON.stringify({status:rows.every(r=>r.result==='win'&&r.complete)?'PASS':'FAIL',matches:rows.length,rows,scope:'Actual enemy turns and damage; three all-team normal-only seeds and one with available signature attacks. No synthetic wins; human difficulty unverified.'},null,2)+'\n');}if(rows.some(r=>r.result!=='win'||!r.complete))process.exitCode=1;}
