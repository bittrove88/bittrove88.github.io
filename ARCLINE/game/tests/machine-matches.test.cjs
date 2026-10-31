'use strict';
const E=require('../dist/engine.js'),G=E.geometry,fs=require('node:fs');
const out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-machine-combat';fs.mkdirSync(out,{recursive:true});
const stages=(process.env.STAGES?process.env.STAGES.split(',').map(Number):[1,7,13,23,33,53,62,75,80,90,95,100]),rows=[];
function attack(s){
 const ids=['W01',...(s.specialAmmo>0?[E.combat.get(s.characterId).special.id]:[])];let best=null;
 for(const id of ids){const aim=E.solve(s,0,{weaponId:id}),plan=E.trajectory(s,0,aim.angle,aim.power,{weaponId:id}),value=plan.damage[1]-plan.damage[0]*2;
  const candidate={...aim,weaponId:id,damage:plan.damage[1],self:plan.damage[0],value,plan};if(!best||candidate.value>best.value+.01||candidate.damage>=s.units[1].hp&&candidate.self===0&&id==='W01')best=candidate;
 }return best;
}
function choose(s){
 const unit=s.units[0],original={...unit};let best={...attack(s),x:unit.x};
 for(const dx of[90,-90,200,-200,340,-340]){Object.assign(unit,original);E.move(s,0,dx);if(Math.abs(unit.x-original.x)<4)continue;const a=attack(s);if(a.value>best.value+.05)best={...a,x:unit.x};}Object.assign(unit,original);
 if(best.value>.15){E.move(s,0,best.x-unit.x);return best;}
 const breaks=[],warps=[],visited=new Set();
 for(let angle=-8;angle<=80;angle+=4)for(let power=25;power<=100;power+=5){const plan=E.trajectory(s,0,angle,power,{weaponId:'W01',skill:null});if(plan.destroyed.length&&plan.damage[0]<.5)breaks.push({angle,power,weaponId:'W01',kind:'break',distance:Math.hypot(plan.end.x-s.units[1].x,plan.end.y-s.units[1].y),count:plan.destroyed.length});
  if(s.spec.teleport){const plan=E.trajectory(s,0,angle,power,{weaponId:'TELEPORT',skill:null}),land=G.teleportLanding(s.world,plan.teleportContact,s.units[1],unit.range);if(!land||Math.hypot(land.x-unit.x,land.y-unit.y)<60)continue;const key=Math.round(land.x/50)+':'+Math.round(land.y/45);if(visited.has(key))continue;visited.add(key);warps.push({angle,power,weaponId:'TELEPORT',kind:'teleport',land,distance:Math.hypot(land.x-s.units[1].x,land.y-s.units[1].y)});}
 }
 warps.sort((a,b)=>a.distance-b.distance);for(const warp of warps.slice(0,12)){Object.assign(unit,warp.land);const next=attack(s);let opening=false;if(next.value<=.15){const aim=E.solve(s,0,{weaponId:'W01',requireEvent:'break'});opening=E.trajectory(s,0,aim.angle,aim.power,{weaponId:'W01'}).destroyed.length>0;}Object.assign(unit,original);if(opening&&next.value<=.15){const supports=[-20,20].map(dx=>G.surfaceAt(s.world,warp.land.x+dx,warp.land.y,24)),fragile=supports.map(f=>s.world.surfaces.find(q=>q.id===f?.id)?.solidId).filter(id=>s.world.solids.some(o=>o.id===id&&o.destructible));if(fragile.length&&!G.fallLanding(G.without(s.world,fragile),warp.land.x,warp.land.y,s.units[1],unit.range))opening=false;}if(next.value>.15||opening)return warp;}
 breaks.sort((a,b)=>a.distance-b.distance||b.count-a.count);if(breaks.length)return breaks[0];return {...best,kind:'stalled'};
}
const profiles=E.combat.profiles.filter(p=>!process.env.CHARACTERS||process.env.CHARACTERS.split(',').includes(p.id)),pairs=process.env.ROTATE_MACHINES?stages.map((stage,i)=>({profile:profiles[i%profiles.length],stage})):profiles.flatMap(profile=>stages.map(stage=>({profile,stage}))),expected=pairs.length;if(!expected||stages.some(n=>!Number.isInteger(n)||n<1||n>100))throw Error('Invalid representative selection');
const started=Date.now();for(const {profile,stage} of pairs){const s=E.campaign(stage,{equippedCharacterId:profile.id,matchSeed:stage*19+997,battleInventory:{}}),actions=[];let safety=0;while(!s.result&&safety++<s.shotLimit*2+4){if(s.turn===0){s.phase='aim';while(s.pendingLoot.length)E.resolveLoot(s,null,true);if(s.telegraph&&['DROP','MARK','PREPARE'].includes(s.telegraph.kind))E.move(s,0,(s.units[0].x<500?1:-1)*245);
 const action=choose(s);if(process.env.DEBUG_ROUTE)console.log('CHOICE',s.round,s.units[0].x,s.units[0].y,action.kind,action.weaponId,action.angle,action.power,action.value);if(action.weaponId==='TELEPORT')E.selectTeleport(s);else{if(s.teleportMode)E.selectTeleport(s);E.selectWeapon(s,action.weaponId);}const shot=E.launch(s,action.angle,action.power);if(!shot)throw Error('No launch '+profile.id+' '+stage+' '+s.phase);E.resolve(s,shot);actions.push({round:s.round,kind:action.kind||'attack',weaponId:shot.weaponId,damage:shot.damage,player:s.units[0].hp,enemy:s.units[1].hp,special:s.specialAmmo,destroyed:shot.destroyed.length,position:s.units.map(u=>({x:u.x,y:u.y,supported:!!G.support(s.world,u.x,u.y)}))});}
 else{const target=E.enemyMoveTarget(s);G.move(s,1,target-s.units[1].x);const plan=E.cpuPlan(s,E.seeded((s.matchSeed+s.round*1009)>>>0));E.resolve(s,E.launch(s,plan.angle,plan.power,plan));}if(!s.result)E.next(s);}
 const row={id:profile.id,stage,result:s.result,reason:s.reason,hp:E.combat.points(s.units[0].hp),actions:actions.length,limit:s.shotLimit,sequence:actions};rows.push(row);console.log((s.result==='win'?'PASS':'FAIL'),profile.id,stage,row.actions,row.hp,s.reason);
 fs.writeFileSync(out+'/'+(process.env.RESULT_FILE||'REPRESENTATIVE_MATCHES.json'),JSON.stringify({status:rows.length<expected?'RUNNING':rows.every(r=>r.result==='win')?'PASS':'FAIL',stages,machines:profiles.length,sampling:process.env.ROTATE_MACHINES?'one rotating machine per stage':'all selected machine-stage pairs',matches:rows.length,expected,elapsedMs:Date.now()-started,scope:'Machine-selected normal/special, walking, excavation and common teleport against real seeded enemy turns. No auxiliary or skill supply, no HP fixtures. Representative scenes only; not all1000 character-stage matchups or human difficulty.',rows},null,2)+'\n');
}

if(rows.some(r=>r.result!=='win'))process.exitCode=1;
