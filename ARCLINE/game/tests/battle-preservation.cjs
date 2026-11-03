'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
// Authorized changes:0.19.0 base launch weights;0.19.3 selected-stage
// continuation. Preserve other combat behavior and checkpoint contracts.
module.exports=(file,base,equal)=>{
 const currentPath=path.resolve(__dirname,'../dist',file),old=cp.execFileSync('git',['show',base+':ARCLINE/game/dist/'+file]);
 if(file==='render.js'){
  // 0.20.0 authorizes only an inspection transform and normal-camera reset.
  // Normalize these exact additions; every other byte remains protected.
  const text=fs.readFileSync(currentPath,'utf8').replace('  // Inspection owns only the display transform; physics and aiming stay in world coordinates.\n  if(options.cameraView)view={...options.cameraView};\n','').replace("return {draw,toWorld,resetCamera(){cameraKey='';lastCameraTime=0;},get view(){return {...view};}};",'return {draw,toWorld,get view(){return view;}};');
  return equal(Buffer.from(text),old,'renderer unchanged except authorized inspection transform/reset');
 }
 if(!['combat.js','weapons.js','campaign-run.js'].includes(file))return equal(fs.readFileSync(currentPath),old,'unchanged combat source '+file);
 const m={exports:{}};vm.runInNewContext(old.toString(),{module:m,require:id=>require(path.resolve(__dirname,'../dist',id))});
 const current=require(currentPath),plain=x=>JSON.parse(JSON.stringify(x));
 if(file==='campaign-run.js'){
  for(const name of ['chapter','decode','checkpoint','restart','finish','updatePreparation'])equal(current[name].toString(),m.exports[name].toString(),'checkpoint,inventory and completion contract unchanged '+name);
 }else if(file==='weapons.js'){
  for(const field of ['weapons','teleport','skills','coreUnlocks'])equal(plain(current[field]),plain(m.exports[field]),'auxiliary behavior unchanged '+field);
 }else{
  const normalized=p=>{const copy=plain(p);delete copy.normalNote;for(const w of [copy.normal,copy.special]){delete w.speed;delete w.gravity;}return copy;};
  equal(current.profiles.map(normalized),plain(m.exports.profiles).map(normalized),'only requested launch weights and explanatory note change');
  equal(plain(current.ballistics),{speed:1,gravity:1},'common character launch constants');
  for(const p of current.profiles)for(const action of ['normal','special'])equal([p[action].speed,p[action].gravity],[1,1],'same base weight '+p.id+'/'+action);
 }
};
