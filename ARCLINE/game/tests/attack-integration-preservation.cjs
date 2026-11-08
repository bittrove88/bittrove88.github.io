'use strict';
// 0.29 explicitly supersedes old byte-preservation rules for these attack files.
// Keep all other bytes pinned, and verify protected gameplay data independently.
const assert=require('node:assert/strict'),cp=require('node:child_process'),vm=require('node:vm'),path=require('node:path');
const changed=new Set(['engine.js','physics.js','combat.js','weapons.js','final-team.js','game.js','render.js']);let verified=false;
function verify(){if(verified)return;verified=true;const root=path.resolve(__dirname,'../..'),base='861a3e317803c695dfdbbed3991bed4500a22d02',cache={};const old=n=>{n=n.replace(/^\.\//,'').replace(/\.js$/,'');if(cache[n])return cache[n];const m={exports:{}};cache[n]=m.exports;vm.runInNewContext(cp.execFileSync('git',['show',base+':ARCLINE/game/dist/'+n+'.js'],{cwd:root,encoding:'utf8'}),{module:m,require:old});return cache[n]=m.exports;},plain=x=>JSON.parse(JSON.stringify(x));
 for(const name of ['geometry','levels','inventory','crew','crew-usage','campaign-run','save','encounters'])assert.equal(cp.execFileSync('git',['show',base+':ARCLINE/game/dist/'+name+'.js'],{cwd:root,encoding:'utf8'}),require('node:fs').readFileSync(path.join(root,'game/dist',name+'.js'),'utf8'),'protected source '+name);
 const C=require('../dist/combat.js'),O=old('combat'),omit=p=>Object.fromEntries(Object.entries(p).filter(([k])=>!['normal','special','specialNote'].includes(k)));assert.deepEqual(C.profiles.map(omit),plain(O.profiles.map(omit)),'HP, movement, charge, resistance, identities unchanged');
 const E=require('../dist/engine.js');for(const method of ['enemyMoveTarget','changeCharacter'])assert.equal(E[method].toString(),old('engine')[method].toString(),'protected method '+method);
 for(const stage of [5,15,25,35,45,55,65,75,85,95])for(const round of [1,2,3,4]){const s=E.campaign(stage,{matchSeed:1});s.round=round;const b=plain(s);E.telegraph(s);old('engine').telegraph(b);assert.deepEqual(s.telegraph,plain(b.telegraph),'midboss warning unchanged');}
}
module.exports={changed:file=>changed.has(file),verify};
