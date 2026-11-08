'use strict';
const assert=require('node:assert/strict'),cp=require('node:child_process'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const E=require('../dist/engine.js'),C=E.combat,M=require('../dist/attack-review-model.js'),F=require('../dist/effects.js');
const baseline='a45f6031b5e2f6b2eff74b0356554713bea631a0',cache={};
function old(name){name=name.replace(/^\.\//,'').replace(/\.js$/,'');if(cache[name])return cache[name];const module={exports:{}};cache[name]=module.exports;vm.runInNewContext(cp.execFileSync('git',['show',baseline+':ARCLINE/game/dist/'+name+'.js'],{encoding:'utf8'}),{module,require:old});return cache[name]=module.exports;}
const plain=x=>JSON.parse(JSON.stringify(x)),oldE=old('engine');let checks=0;const ok=(v,m)=>{checks++;assert.ok(v,m)},eq=(a,b,m)=>{checks++;assert.deepEqual(plain(a),plain(b),m)};
const colors=['#eb7928','#da3156','#24a6ad','#ee617e','#9570b7','#e5a733','#a4bd39','#287cc1','#d94894','#36b7a4'];
for(const [i,p]of C.profiles.entries()){
 eq(p.normal.appearance.color,colors[i],'normal main color '+p.id);
 eq(F.appearance(p.normal.id).color,colors[i],'shared live/demo normal color '+p.id);
 const scene=M.create('normal:'+p.id),a=scene.plan,b=oldE.trajectory(plain(scene.before),0,a.angle,a.power,{weaponId:'W01'});
 eq(a.bullets.map(x=>x.path),b.bullets.map(x=>x.path),'unchanged normal trajectory '+p.id);eq(a.damage,b.damage,'unchanged normal damage '+p.id);
 ok(a.damage[1]>0,'real normal hit '+p.id);ok(M.create('normal:'+p.id,'miss').plan.damage[1]===0,'real normal miss '+p.id);
}
console.log(JSON.stringify({status:'PASS',checks,scope:'Normal colors and actual hit/miss, trajectory and damage parity against PR125.'}));
