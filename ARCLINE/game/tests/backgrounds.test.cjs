'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const B=require('../dist/backgrounds.js'),E=require('../dist/engine.js'),F=require('../dist/final-team.js'),root=path.resolve(__dirname,'../..');
let checks=0;const ok=(v,m)=>{checks++;assert(v,m);};
const ids=new Set();
for(let stage=1;stage<=99;stage++){
 const state=E.campaign(stage,{matchSeed:17}),before=JSON.stringify(state),scene=B.sceneFor(state);
 ids.add(scene.id);ok(scene.kind===(stage%10===0?'boss':'normal'),'stage class '+stage);
 ok(scene.kind==='boss'?scene.stage===stage:scene.stageRange[0]<=stage&&scene.stageRange[1]>=stage,'art range '+stage);
 ok(JSON.stringify(state)===before,'background selection never mutates campaign '+stage);
}
const state=E.campaign(100,{matchSeed:17}),relay=[];
for(let i=0;i<10;i++){
 const scene=B.sceneFor(state);ids.add(scene.id);relay.push(scene.mapIndex);
 ok(scene.kind==='final'&&scene.mapIndex===Math.floor(i/3),'real final relay selects art '+i);
 if(i<9){F.credit(state,state.characterId,5);E.next(state);state.phase='aim';}
}
ok(relay.join(',')==='0,0,0,1,1,1,2,2,2,3','all ten pilots use their assigned four maps');
ok(ids.size===33&&B.scenes.length===33,'every artwork is reachable');
const manifest=require('../../design/backgrounds/complete/manifest.json');
for(const row of manifest.scenes)ok(JSON.stringify(B.scenes.find(s=>s.id===row.id))===JSON.stringify(require(path.join(root,'design/backgrounds/complete',row.json))),'bundle equals individually reviewed artwork '+row.id);
for(const file of ['engine.js','physics.js','geometry.js','combat.js','weapons.js','skills.js','inventory.js','final-team.js','campaign-run.js','save.js','game.js','visual-art.js']){
 const before=execFileSync('git',['show','3ebb4c9:ARCLINE/game/dist/'+file],{cwd:root});
 const current=fs.readFileSync(path.join(root,'game/dist',file));
 const preserved=file==='game.js'?Buffer.from(current.toString().replace(" if(s.spec.boss&&s.stage<100&&!s.spec.midboss)bgm.prepare('VICTORY');\n",'')):current;
 ok(before.equals(preserved),'gameplay/save/foreground source preserved '+file);
}
// The map contract separately pins approved51-99 and the five0.24.1 refinements.
const oldLevels=execFileSync('git',['show','3ebb4c9:ARCLINE/game/dist/levels.js'],{cwd:root,encoding:'utf8'}),oldModule={exports:{}};require('vm').runInNewContext(oldLevels,{module:oldModule});
const refinedIds=new Set(require('../../design/stage_reviews/STAGES_IDEA_REFINEMENT_APPROVED_RUNTIME.json').stages.map(r=>r.stage));
for(const index of [...Array.from({length:50},(_,i)=>i).filter(i=>!refinedIds.has(i+1)),99])ok(JSON.stringify(require('./pickup-placement-preservation.cjs')(E.levels[index]))===JSON.stringify(oldModule.exports[index]),'unmodified map data '+(index+1));
const out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-backgrounds';fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'BACKGROUNDS_UNIT.json'),JSON.stringify({status:'PASS',checks,artworks:ids.size,stageConditions:103,relay,scope:'Actual campaign and ten-pilot relay,reviewed source equality and byte-preserved gameplay/save/foreground modules against pre-integration main3ebb4c9.'},null,2));
console.log('PASS backgrounds '+checks);
