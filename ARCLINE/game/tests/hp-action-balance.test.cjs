'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),vm=require('node:vm');
const E=require('../dist/engine.js'),T=require('../dist/final-team.js'),S=require('../dist/save.js');
const root=path.resolve(__dirname,'../..'),base='5129717a09dc868ce6b632bbac75add19f512632',cache={};
function old(name){name=name.replace(/^\.\//,'');if(cache[name])return cache[name];const m={exports:{}};vm.runInNewContext(cp.execFileSync('git',['show',base+':ARCLINE/game/dist/'+name],{cwd:root,encoding:'utf8'}),{module:m,require:id=>id.startsWith('./')?old(id):require(id)});return cache[name]=m.exports;}
const before=old('engine.js'),plain=x=>JSON.parse(JSON.stringify(x)),easy=h=>Math.min(80,Math.round(h*.75));let checks=0;const eq=(a,b,m)=>{checks++;assert.deepEqual(plain(a),plain(b),m);},ok=(x,m)=>{checks++;assert(x,m);};
const normalHp=[60,60,60,60,60,60,80,80,80,80,100,100,100,100,100,100,120,120,140,140],normalLimits=[12,12,12,12,12,12,16,16,18,18,18,18,18,18,18,18,22,22,24,24];
const midHp=[80,80,100,100,100,120,120,120,160,180],midCaps=[16,18,18,18,20,22,24,24,26,28],bossHp=[140,160,160,180,180,200,200,240,240],bossCaps=[20,22,22,24,26,24,24,28,28];
const levelsBefore=JSON.stringify(E.levels),rows=[];
for(const mode of ['easy','normal','hard'])for(let stage=1;stage<=100;stage++){
 const s=E.campaign(stage,{difficulty:mode,matchSeed:4697,battleInventory:{}}),oldState=before.campaign(stage,{difficulty:mode,matchSeed:4697,battleInventory:{}}),theme=Math.floor((stage-1)/5),ordinary=!s.spec.boss&&!s.spec.midboss;
 let hp=ordinary?normalHp[theme]:stage%10===5?midHp[Math.floor(stage/10)]:stage===100?1500:bossHp[stage/10-1],limit=ordinary?normalLimits[theme]:stage%10===5?midCaps[Math.floor(stage/10)]:stage===100?20:bossCaps[stage/10-1];
 const expected=mode==='easy'?(stage===100?800:easy(hp)):hp;
 eq(s.units[1].hp*20,expected,'actual enemy HP '+stage+'/'+mode);eq(s.units[1].maxHp,s.units[1].hp,'full initial HP');eq(s.shotLimit,limit,'actual action cap');
 eq(s.world,oldState.world,'entire world unchanged '+stage);eq(s.units.map(u=>[u.x,u.y,u.facing]),oldState.units.map(u=>[u.x,u.y,u.facing]),'spawns unchanged');eq(s.pickups,oldState.pickups,'all capsules unchanged');
 eq(s.units[0].hp*20,stage===100?100:E.combat.get('gun').hp,'player HP');
 if(ordinary)eq(hp,oldState.units[1].hp*20,'all ordinary Normal/Hard HP retained');
 if(stage>=80&&stage<100&&![80,85,90,95].includes(stage))eq(hp,oldState.units[1].hp*20,'late HP retained');
 if(mode==='easy')ok([3,4].includes(Math.ceil((stage===100?80:expected)/20)),'Easy3-4 body hits');
 if(s.spec.boss||s.spec.midboss){const factor=expected/hp;eq(s.units[1].parts.map(p=>[p.hp*20,p.maxHp*20]),E.encounters.forSpec(s.spec).parts.map(p=>{const h=Math.round(p.hp*20*factor);return [h,h];}),'parts scaled once');}
 if(stage===100){eq(s.spec.finalBattle.requiredDamage*20,mode==='easy'?80:150,'effective final quota');eq(s.specialAmmo,3,'three specials');}
 rows.push({stage,mode,hp:expected,limit});
}
eq(JSON.stringify(E.levels),levelsBefore,'difficulty starts never mutate base catalog');
for(let t=0;t<20;t++){const ls=E.levels.slice(t*5,t*5+4);eq(new Set(ls.map(l=>l.actionLimit)).size,1,'shared theme action cap');eq(new Set(ls.map(l=>l.enemyHp)).size,1,'shared theme HP');if(t)ok(easy(ls[0].enemyHp*20)>=easy(E.levels[(t-1)*5].enemyHp*20),'Easy HP never falls between themes');}
// Phase transitions are isolated boundary fixtures, not fabricated match evidence.
for(const mode of ['easy','normal','hard']){const s=E.campaign(100,{difficulty:mode,matchSeed:4697});s.pendingChanges=[{type:'phase',value:1}];E.boundary(s);eq(s.units[1].parts.map(p=>p.hp*20),mode==='easy'?[21,21]:[40,40],'regenerated phase parts use same HP scale');const entry=T.snapshot(s),saved=plain(entry);s.units[0].hp=0;s.finalTeam.damage.hana=1;s.shotCount=19;E.check(s);ok(T.restore(s,entry),'retry restores');eq(s.units[0].hp*20,100,'retry player100');eq(s.shotCount,0,'retry count0');eq(s.shotLimit,20,'retry cap20');eq(s.finalTeam.damage,saved.finalTeam.damage,'retry quota reset');eq(entry,saved,'entry immutable');
 const quota=s.spec.finalBattle.requiredDamage;s.shotCount=20;const credit=T.credit(s,s.characterId,quota);s.units[1].hp-=credit;ok(!E.check(s),'quota completed on action20 may hand off');E.next(s);eq([s.characterId,s.shotCount,s.shotLimit,s.units[0].hp*20],['koro',0,20,100],'next machine resets');const failed=E.campaign(100,{difficulty:mode});failed.shotCount=20;E.check(failed);eq([failed.result,failed.reason],['lose','shots'],'incomplete quota loses at20');}
for(const file of ['physics.js','geometry.js','combat.js','weapons.js','skills.js','enemy-actions.js','enemy-attacks.js','attack-catalog.js','save.js','campaign-run.js','final-team.js','master-progress.js','master-mode.js','sfx-manager.js','effects.js','render.js','battle-catalog.js'])eq(fs.readFileSync(path.join(root,'game/dist',file),'utf8'),cp.execFileSync('git',['show','799287e2996b885f2aa350d1d6aabbef8ec795b2:ARCLINE/game/dist/'+file],{cwd:root,encoding:'utf8'}),'protected runtime '+file);
eq([S.schemaVersion,S.resetVersion],[8,2],'save identity retained');
const out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-hp-action';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'HP_ACTION_BALANCE.json'),JSON.stringify({status:'PASS',checks,initializations:rows.length,rows,scope:'All100 actual starts in three modes; intended caps and HP; whole worlds/spawns/pickups,base immutability,Easy monotonicity,phase parts,retry and action20 boundary; protected combat/save source equality. Synthetic boundary fixtures are separate from native match evidence.'},null,2));console.log('PASS HP/action balance '+checks+' checks');
