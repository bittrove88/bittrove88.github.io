'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),vm=require('vm'),assert=require('assert/strict'),cache={};
const plain=x=>JSON.parse(JSON.stringify(x));
function original(name){name=name.replace(/^\.\//,'').replace(/\.js$/,'');if(cache[name])return cache[name];const m={exports:{}};vm.runInNewContext(cp.execFileSync('git',['show','4bcf554:ARCLINE/game/dist/'+name+'.js'],{encoding:'utf8'}),{module:m,require:original});return cache[name]=m.exports;}
function verify(file,equal=assert.deepEqual){
 const name=file.replace(/\.js$/,''),E=require('../dist/engine.js'),G=E.geometry,W=require('../dist/weapons.js');
 if(['geometry','physics','engine','render','visual-art'].includes(name)){
  const before=original('geometry');for(let n=51;n<=100;n++)for(const round of [1,2,3])equal(plain(G.world(E.levels[n-1],round)),plain(before.world(original('levels')[n-1],round)),'protected 51-100 collision '+n+'/'+round);
  if(name==='engine')for(const method of ['telegraph','enemyMoveTarget','changeCharacter'])equal(E[method].toString(),original('engine')[method].toString(),'preserved behavior '+method);
 }else if(name==='weapons'){for(const w of original('weapons').weapons)equal(plain(W.getEnemy(w.id)),plain(w),'enemy weapon unchanged '+w.id);equal(plain(W.teleport),plain(original('weapons').teleport),'teleport unchanged');}
 else if(name==='skills'){for(const id of ['S_GUARD','S_BREACH'])equal(require('../dist/skills.js').compatible(id,W.get('W01')),true,'legacy skill usable '+id);}
 else if(name==='inventory'){equal(require('../dist/inventory.js').normalize({weapons:{W03:3,W20:2},skills:{BURST:3,S_GUARD:2}}),{weapons:{W03:3,W20:2},skills:{BURST:3,S_GUARD:2}},'all legacy stock retained');}
 else if(name==='campaign-run'){const Run=require('../dist/campaign-run.js');equal(Run.chapter(100),10,'chapters retained');equal(Run.decode(Run.checkpoint(99,{weapons:{W03:2}},['L002:weapon:W02'],'test',7)).inventory,{weapons:{W03:2},skills:{}},'checkpoint retains legacy stock');}
 else if(name==='save'){const S=require('../dist/save.js');equal([S.key,S.schemaVersion,S.resetVersion],[original('save').key,8,2],'save identity preserved');}
 else {const current=require(path.resolve(__dirname,'../dist',file)),before=original(name);for(const key of Object.keys(before))if(typeof before[key]!=='function')equal(plain(current[key]),plain(before[key]),'unchanged catalog '+file+'/'+key);}
}
module.exports={verify,original};
