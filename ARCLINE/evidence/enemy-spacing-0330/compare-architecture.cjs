'use strict';
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const E=require('../../game/dist/engine.js');
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const rows=[];
for(let n=1;n<=100;n++){const s=E.campaign(n,{matchSeed:42});rows.push({label:'capabilities-'+n,hash:hash({normal:E.enemyActionRules(s),boss:E.bossActions.rule(s)})});}
for(const stage of [9,30,41,50,70,90,100])for(const floating of [false,true]){
 const s=E.campaign(stage,{matchSeed:42});s.spec={...s.spec,floors:[[[0,10],[300,10]]],components:[],features:[],staticFeatures:[],phaseFeatures:null,worldWidth:3000};s.world=E.geometry.world(s.spec);s.units.forEach((u,i)=>Object.assign(u,{x:i?1500:700,y:400,slope:0,surface:'floor0',range:[35,2965],facing:i?-1:1,floating:i?floating:false}));E.bossActions.refresh(s);s.turn=1;s.phase='cpu';const moved=[];
 for(const amount of [-400,100,-400]){moved.push(E.move(s,1,amount));s.round++;}
 rows.push({label:'movement-'+stage+'-'+floating,hash:hash({moved,s})});
}
for(const [stage,seed]of [[9,42],[30,42],[41,42],[50,42],[50,2000],[71,42],[71,2000],[90,42],[100,42]]){
 const s=E.campaign(stage,{matchSeed:seed});s.turn=1;s.phase='cpu';const before=hash(s),decision=E.planEnemyAction(s,E.seeded(1));assert.equal(hash(s),before);rows.push({label:'decision-'+stage+'-'+seed,hash:hash(decision)});
}
const dest=process.argv[2];fs.writeFileSync(dest,JSON.stringify({rows},null,2)+'\n');
if(process.argv[3]){const old=JSON.parse(fs.readFileSync(process.argv[3]));assert.deepEqual(rows,old.rows);console.log('PASS identical decisions, shot plans, movement and unlocks: '+rows.length+' conditions');}else console.log('Recorded baseline: '+rows.length+' conditions');
