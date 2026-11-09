'use strict';
// Reproduce captured legal inputs using the current engine; no external optimizer required.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),E=require('../../game/dist/engine.js'),F=require('../../game/dist/final-team.js'),Q=require('../../game/tools/approved-map-qa.cjs');
const near=(a,b,m)=>assert(Math.abs(a-b)<1e-6,m+' '+a+'/'+b),rows=[];
for(const mode of ['normal','hard']){
 const row=JSON.parse(fs.readFileSync(path.join(__dirname,'matches/100-'+mode+'-clean-gun-4697.json'))),s=E.campaign(100,{difficulty:mode,equippedCharacterId:'gun',matchSeed:4697,battleInventory:{}});let enemies=0;
 for(const a of row.actions){assert.equal(s.turn,0);s.phase='aim';assert.equal(s.characterId,a.owner);s.units.forEach((u,i)=>{near(u.x,a.before[i][0],'before x');near(u.y,a.before[i][1],'before y');near(u.hp,a.hpBefore[i],'before HP');});near(E.move(s,0,a.input||0),a.moved,'legal walk');assert(a.teleport?E.selectTeleport(s):E.selectWeapon(s,'W01'));const p=E.launch(s,a.angle,a.power);assert(p);E.resolve(s,p);while(s.pendingLoot.length)E.resolveLoot(s,null,true);p.damage.forEach((n,i)=>near(n,a.damage[i],'player damage'));assert(s.shotCount<=20);if(s.result)break;E.next(s);if(s.turn===1){const hp=s.units[0].hp,p=Q.enemy(s),before=row.enemies[enemies++];p.damage.forEach((n,i)=>near(n,before.damage[i],'enemy damage'));near(hp-s.units[0].hp,p.damage[0],'enemy HP loss');if(s.result)break;E.next(s);}}
 assert.equal(s.result,'win');assert(F.complete(s));assert.equal(s.finalTeam.index,9);assert(Object.values(s.finalTeam.damage).every(x=>Math.abs(x-7.5)<1e-7));near(s.units[0].hp*20,62,'final HP after laser');assert.equal(enemies,row.enemies.length);rows.push({mode,result:s.result,playerActions:row.actions.length,enemyTurns:enemies,finalHP:s.units[0].hp*20,completeTenPilotQuota:true});
}
console.log(JSON.stringify({status:'PASS',rows},null,2));
