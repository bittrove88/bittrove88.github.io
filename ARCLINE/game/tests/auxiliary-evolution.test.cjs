'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),E=require('../dist/engine.js'),W=require('../dist/weapons.js'),A=require('../dist/attack-catalog.js'),M=require('../dist/attack-review-model.js');
const ids=process.argv.slice(2).length?process.argv.slice(2):Object.keys(A.weapons);let checks=0;const ok=(v,m)=>{checks++;assert.ok(v,m)},near=(a,b,m)=>ok(Math.abs(a-b)<1e-7,m+' '+a+' '+b);
const rows=[];
for(const id of ids){
 const r=M.create('weapon:'+id),p=r.plan,w=W.get(id);ok(r.plan.bullets.every(b=>b.path.every(q=>Number.isFinite(q.x+q.y+q.t))),'finite '+id);ok(p.damage[1]<=w.damageCap+1e-8,'aggregate cap '+id);ok(w.nameJa===A.weapons[id].nameJa,'name '+id);ok(w.appearance.color===A.weapons[id].appearance.color,'color '+id);
 ok(p.damage[1]>0,'showcase has a real hit '+id);
 const s=M.state(r.row,'arena'),before=JSON.stringify(s),a=E.trajectory(s,0,30,75,{weaponId:id}),b=E.trajectory(s,0,30,75,{weaponId:id});ok(JSON.stringify(s)===before,'immutable aim '+id);assert.deepEqual(a.bullets.map(b=>b.path),b.bullets.map(b=>b.path));checks++;
 if(id==='W22'){
  ok(a.bullets.length===10,'ten pellets');ok(!a.events.some(e=>e.type==='apex-burst'),'no apex burst');
  const hits=[];for(const d of [100,700]){s.units[1].x=200+d;const theta=-Math.asin(300*d/(670*670))/2,shot=E.trajectory(s,0,0,100,{weaponId:id,origin:{x:200,y:378,theta}});hits.push(shot.impacts.filter(i=>i.hit?.unit===1).length);}ok(hits[0]>hits[1],'distance decreases pellet contacts '+hits);near(w.scatterAngle,6,'narrow spread');
 }
 if(id==='W11'){ok(a.bullets.length===6,'six bullets');a.bullets.forEach((b,i)=>near(b.start,i*.1,'delayed shot '+i));}
 if(id==='W23'){
  s.units[0].hp=1;s.units[0].maxHp=7;s.units[1].hp=5;const shot=E.trajectory(s,0,0,60,{weaponId:id,origin:{x:s.units[1].x-48,y:378,theta:0}});E.resolve(s,shot);near(shot.drained,Math.min(shot.damage[1],5),'100 percent actual damage');ok(shot.drained>7*.15,'old heal cap removed');
  const t=M.state(r.row,'arena');t.units[0].hp=1;t.units[0].maxHp=7;t.units[1].hp=.2;const q=E.trajectory(t,0,0,60,{weaponId:id,origin:{x:t.units[1].x-48,y:378,theta:0}});E.resolve(t,q);near(q.drained,.2,'no overkill healing');
 }
 if(id==='W16'){
  s.units[1].x=600;const shot=E.trajectory(s,0,0,70,{weaponId:id,origin:{x:480,y:395,theta:.2}}),waves=shot.events.filter(e=>e.type==='wave'),hit=shot.events.find(e=>e.type==='damage'&&e.unit===1);ok(waves.length===2,'left and right actual waves');ok(waves.every(e=>Math.abs(e.path.at(-1).x-e.x)<=126+1e-6),'range 70 percent');ok(hit&&hit.t>waves[0].t,'delayed arrival damage');const hp=s.units[1].hp;E.applyEvents(s,shot,hit.t-.00001);near(s.units[1].hp,hp,'no premature wave hit');E.applyEvents(s,shot,hit.t+.00001);ok(s.units[1].hp<hp,'actual arrival commits damage');const damaged=s.units[1].hp;E.resolve(s,shot);near(s.units[1].hp,damaged,'no duplicate wave damage');
 }
 if(id==='W10'){
  const q=E.trajectory(s,0,80,100,{weaponId:id}),children=q.bullets.filter(b=>!b.primary);ok(children.length===3,'three split children');ok(children.some(b=>b.path.some(x=>x.t>b.start+.85)),'spiral survives old stop');ok(w.continuousSpiral,'continuous collision spiral enabled');
 }
 const stock=M.state(r.row,'arena');stock.weaponStock[id]=2;stock.mode=id;const launched=E.launch(stock,r.plan.angle,r.plan.power);ok(!!launched,'launch '+id);near(stock.weaponStock[id],1,'one stock per attack '+id);
 rows.push({id,name:w.nameJa,damage:p.damage,bullets:p.bullets.filter(b=>!b.effect).length,duration:p.duration,status:'PASS'});
}
const out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-attacks';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'aux-'+ids.join('-')+'.json'),JSON.stringify({checks,rows},null,2));console.log(JSON.stringify({status:'PASS',checks,rows}));
