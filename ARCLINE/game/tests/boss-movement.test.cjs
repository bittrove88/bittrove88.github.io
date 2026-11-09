'use strict';
const assert=require('node:assert/strict'),E=require('../dist/engine.js'),P=require('../dist/physics.js'),{fixtures,audit}=require('../tools/probe_boss_movement.cjs'),{copy,state}=require('../tools/probe_boss_ballistics.cjs');
let checks=0;const rows=[];
for(const stage of [10,20,30,50,60,70,80,90]){
 const all=fixtures(stage),cross=all.find(c=>c.details.crossed),steep=all.find(c=>Math.abs(c.details.landed?.slope||0)>35*Math.PI/180),fall=all.find(c=>c.label==='support-destroyed');
 for(const c of [...new Set([cross,steep,fall,all.find(c=>c.label==='low-hp:0.05'),all.find(c=>c.label==='skip-enemy-turn')].filter(Boolean))]){
  const result=audit(c);assert.deepEqual(result.failures,[],stage+'/'+c.label);checks++;rows.push({stage,label:c.label,crossed:!!c.details.crossed,fall:!!c.details.destroyed});
 }
}
// Warning graphics use the collision center on a genuinely steep native pad.
const {s}=state(90);s.turn=0;s.phase='aim';E.move(s,0,10000);E.telegraph(s);const center=P.bodyCenter(s,0);
assert(Math.abs(s.units[0].slope)>35*Math.PI/180);assert.equal(s.telegraph.targetX,center.x);assert.equal(s.telegraph.targetY,center.y);checks++;
// The frozen pose is serializable and survives the main/Worker state boundary.
const saved=JSON.parse(JSON.stringify(s.telegraph)),before=copy(s);E.move(s,0,-10000);assert.deepEqual(s.telegraph,saved);assert.deepEqual(saved.targetPose,{x:before.units[0].x,y:before.units[0].y,slope:before.units[0].slope});checks++;
// The tidal wave must leave a walkable escape while keeping an actual hit
// against a player who stays on the first warning's native starting pad.
const {s:tide}=state(10),stay=E.cpuPlan(copy(tide),()=>.5);tide.turn=0;tide.phase='aim';const walked=E.move(tide,0,-10000),escape=E.cpuPlan(tide,()=>.5);
assert(stay.damage[0]>0&&walked< -100&&escape.damage[0]===0);checks++;
console.log(JSON.stringify({status:'PASS',checks,rows,scope:'Native teleport across the boss, steep landing and support destruction; frozen aim and exact contact HP; skip and low-HP regressions.'}));
