'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),E=require('../dist/engine.js'),R=require('../dist/visual-registry.js'),C=require('./visual-baseline-cases.cjs'),baseline=require('./fixtures/visual-baseline.json');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');let checks=0;const ok=(v,m)=>{checks++;assert(v,m);};
ok(R.actors.length===42&&new Set(R.actors.map(x=>x.id)).size===42,'42 distinct role-specific drawing identities');
for(const [kind,n]of [['player',10],['enemy',12],['midboss',10],['boss',10]])ok(R.actors.filter(x=>x.kind===kind).length===n,'role '+kind);
ok(R.stages.length===100,'100 stage visual assignments');for(let stage=1;stage<=100;stage++){const a=R.stage(stage),s=E.levels[stage-1];ok(a.kind===(s.boss?'boss':'normal')&&a.theme===s.theme,'visual map preserves encounter/theme '+stage);ok(R.get(a.actorId)!==null,'valid drawing identity '+stage);ok(Boolean(a.plannedMidboss)===(stage%10===5),'midboss remains explicit candidate '+stage);}
ok(R.stage(39).kind==='normal'&&R.stage(5).kind==='normal','no new battles from visual metadata');
ok(R.resolve('unknown','enemy').id==='legacy:enemy'&&R.resolve('player:gun','enemy').id==='legacy:enemy','safe unknown/type mismatch fallback');ok(R.get('unknown')===null&&R.stage(0)===null&&R.stage(101)===null,'invalid IDs do not select stages');
for(const a of R.actors)ok(Object.isFrozen(a),'immutable actor '+a.id);ok(Object.isFrozen(R.stages)&&Object.isFrozen(R.stages[0]),'immutable stage table');
ok(baseline.rows.length===1096&&baseline.cpus.length===30,'fixed baseline coverage');
for(const row of baseline.rows){const c=C.cases[row.id];assert.deepEqual(c,row.input);checks++;const a=C.sample(E,c);ok(a.before===a.after,'immutable simulation '+row.id);ok(sha(a.before)===row.stateSha256&&sha(a.world)===row.worldSha256,'state/world match original '+row.id);ok(sha(a.shot)===row.shotSha256,'real shot events/path/damage match original '+row.id);assert.deepEqual(a.muzzle,row.muzzle);checks++;}
for(const row of baseline.cpus){const s=C.stateFor(E,row.input),plan=E.cpuPlan(s,E.seeded(129));ok(sha(JSON.stringify(plan))===row.planSha256,'seeded CPU matches original '+row.input.stage+'/'+row.input.characterId);}
const report={status:'PASS',checks,sourceCommit:baseline.sourceCommit,trajectories:baseline.rows.length,cpuPlans:baseline.cpus.length,actors:R.actors.length,stages:R.stages.length,scope:'Identity/namespace/unknown-ID safety and exact physics/event/state comparison with fixed0.10.0 data; no campaign-win or physical-device claim.'};
if(process.env.ARCLINE_EVIDENCE_DIR){fs.mkdirSync(process.env.ARCLINE_EVIDENCE_DIR,{recursive:true});fs.writeFileSync(path.join(process.env.ARCLINE_EVIDENCE_DIR,'VISUAL_BASELINE.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));
