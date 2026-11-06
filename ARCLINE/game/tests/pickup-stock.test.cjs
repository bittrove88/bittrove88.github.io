'use strict';
const assert=require('node:assert/strict'),cp=require('node:child_process'),vm=require('node:vm'),path=require('node:path'),W=require('../dist/weapons.js'),K=require('../dist/skills.js'),E=require('../dist/engine.js');let checks=0;const ok=(v,m)=>{checks++;assert(v,m);},eq=(a,b,m)=>{checks++;assert.deepEqual(a,b,m);},plain=x=>JSON.parse(JSON.stringify(x));
// The preceding local release has exactly these combat definitions. UI icon and
// translated-name changes must not change damage, trajectories or skill rules.
function prior(name){const m={exports:{}};vm.runInNewContext(cp.execFileSync('git',['show','fe495ae:ARCLINE/game/dist/'+name+'.js'],{encoding:'utf8'}),{module:m,require:id=>require(path.resolve(__dirname,'../dist',id))});return m.exports;}
const beforeW=prior('weapons'),beforeK=prior('skills'),strip=(row,fields)=>Object.fromEntries(Object.entries(plain(row)).filter(([k])=>!fields.includes(k)));
eq(W.weapons.map(w=>strip(w,['nameJa'])),plain(beforeW.weapons).map(w=>strip(w,['nameJa'])),'all23 weapon mechanics unchanged');
eq(K.rows.map(k=>strip(k,['path','noteJa'])),plain(beforeK.rows).map(k=>strip(k,['path','noteJa'])),'skill identities and effects unchanged');eq(K.ids,plain(beforeK.ids),'legacy skill IDs preserved');eq(W.activeIds,plain(beforeW.activeIds),'auxiliary slate unchanged');
for(const w of W.weapons){ok(w.nameJa&&w.nameJa!==w.name,'Japanese name present '+w.id);ok(W.iconPath(w.id)&&!W.iconMarkup(w.id).includes('<text'),'vector weapon icon '+w.id);if(w.id!=='W01')ok(W.iconPath(w.id)!==W.iconPath('W01'),'weapon does not fall back to normal icon '+w.id);}
for(const id of W.skills){ok(K.iconPath(id)&&!K.markup(id).includes('<text'),'legacy/current skill icon has no glyph dependency '+id);}
eq(new Set(K.activeIds.map(id=>K.iconPath(id))).size,15,'all15 current skills have distinct vector paths');eq(new Set(W.activeIds.map(id=>W.iconPath(id))).size,12,'all12 current auxiliaries have distinct vector paths');
const pickups=E.levels.flatMap(l=>E.campaign(l.id).pickups.map(p=>({...p,stage:l.id})));eq(pickups.length,46,'same46 capsule placements');for(const p of pickups){const info=p.kind==='trial'?W.get(p.weaponId):K.get(p.skill);ok(info?.nameJa&&info?.name,'actual capsule has bilingual name '+p.stage);ok((p.kind==='trial'?W.iconPath(p.weaponId):K.iconPath(p.skill)).length>5,'actual capsule has vector '+p.stage);}
console.log('PASS pickup-stock '+checks+' checks');
