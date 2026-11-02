'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
// The new request authorizes only base launch speed/gravity and their note.
module.exports=(file,base,equal)=>{
 const currentPath=path.resolve(__dirname,'../dist',file),old=cp.execFileSync('git',['show',base+':ARCLINE/game/dist/'+file]);
 if(!['combat.js','weapons.js'].includes(file))return equal(fs.readFileSync(currentPath),old,'unchanged combat source '+file);
 const m={exports:{}};vm.runInNewContext(old.toString(),{module:m,require:id=>require(path.resolve(__dirname,'../dist',id))});
 const current=require(currentPath),plain=x=>JSON.parse(JSON.stringify(x));
 if(file==='weapons.js'){
  for(const field of ['weapons','teleport','skills','coreUnlocks'])equal(plain(current[field]),plain(m.exports[field]),'auxiliary behavior unchanged '+field);
 }else{
  const normalized=p=>{const copy=plain(p);delete copy.normalNote;for(const w of [copy.normal,copy.special]){delete w.speed;delete w.gravity;}return copy;};
  equal(current.profiles.map(normalized),plain(m.exports.profiles).map(normalized),'only requested launch weights and explanatory note change');
  equal(plain(current.ballistics),{speed:1,gravity:1},'common character launch constants');
  for(const p of current.profiles)for(const action of ['normal','special'])equal([p[action].speed,p[action].gravity],[1,1],'same base weight '+p.id+'/'+action);
 }
};
