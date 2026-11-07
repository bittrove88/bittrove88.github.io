'use strict';
// Authoring fixture only. No production game file is written.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),E=require(path.join(root,'game/dist/engine.js')),F=require(path.join(root,'game/dist/final-team.js'));
const rows=[];
function capture(s,mapIndex=null){rows.push({id:s.stage===100?'100-'+mapIndex:String(s.stage),stage:s.stage,mapIndex,name:s.spec.name,characterId:s.characterId,world:JSON.parse(JSON.stringify(s.world)),units:s.units.map(u=>({x:u.x,y:u.y,slope:u.slope,facing:u.facing}))});}
for(let stage=1;stage<100;stage++)capture(E.campaign(stage,{matchSeed:1}));
const s=E.campaign(100,{matchSeed:1});capture(s,0);
for(let i=1;i<=9;i++){s.finalTeam.pending=true;F.advance(s);if(i%3===0)capture(s,F.mapIndex(s));}
const runtimeFiles=['engine.js','geometry.js','final-team.js','levels.js','characters.js','combat.js'];
const hashes=Object.fromEntries(runtimeFiles.map(name=>['game/dist/'+name,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'game/dist',name))).digest('hex')]));
const output={schema:'arcline.component-world-fixtures/v1',sourceRuntimeCommit:'3ebb4c9383465258bffbc9e5bc3b59d799d5038f',method:'ArcEngine.campaign(stage,{matchSeed:1}); final maps use ArcFinalTeam.advance on controlled authoring fixtures.',runtimeHashes:hashes,worlds:rows};
fs.writeFileSync(path.join(__dirname,'worlds.json'),JSON.stringify(output,null,2)+'\n');console.log('Wrote '+rows.length+' immutable authoring world fixtures');
