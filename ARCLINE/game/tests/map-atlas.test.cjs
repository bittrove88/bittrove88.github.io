'use strict';
// Production atlas contract: both embedded data and rendered feature geometry must
// follow the live campaign. This catches stale-looking sheets even when JSON matches.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('design/expedition_013/arcline_100_maps_atlas.html');
const data=id=>JSON.parse(html.match(new RegExp('<script id="'+id+'" type="application/json">([\\s\\S]*?)<\\/script>'))[1]);
const rows=data('payload'),themes=data('themePayload');
const levels=JSON.parse(read('design/runtime_campaign_20x5.json')).levels;
const design=JSON.parse(read('design/expedition_013/stage_design.json')).stages;
let checks=0;const eq=(a,b,m)=>{checks++;assert.deepEqual(a,b,m);},ok=(a,m)=>{checks++;assert.ok(a,m);};
eq([rows.length,themes.length,levels.length,design.length],[100,20,100,100],'all levels/themes present');
for(let i=0;i<100;i++){
 const l=levels[i],d=design[i],r=rows[i],n=i+1;
 eq([r.id,l.id,d.stage],[n,n,n],'stage order '+n);
 eq([r.name,r.theme,r.themeGoal,r.kind,r.difficulty],
  [l.name,l.themeName,l.themeGoal,l.boss?'大ボス':l.midboss?'中ボス':'通常',d.difficultyBand],
  'current stage labels '+n);
 const expected={floors:l.floors,components:l.components,features:l.features,spawn:l.spawn};
 if(l.worldWidth)expected.worldWidth=l.worldWidth;
 if(l.finalBattle)expected.relayMaps=l.finalBattle.maps;
 eq(r.geometry,expected,'actual rendered geometry '+n);
 eq([r.goal,r.terrainIntent,r.mainGimmicks,r.actions,r.limit,r.verified],
  [d.learningGoal,d.terrainIntent,d.mainGimmicks,d.expectedActions,l.actionLimit,d.testResult.status],
  'current design/performance '+n);
}
for(let i=0;i<20;i++){
 const t=themes[i],start=i*5,ls=levels.slice(start,start+5),ds=design.slice(start,start+5);
 eq([t.id,t.name,t.goal,t.difficulty,t.range],
  [i+1,ls[0].themeName,ls[0].themeGoal,[...new Set(ds.map(d=>d.difficultyBand))].join('・'),[start+1,start+5]],
  'theme metadata '+(i+1));
 eq([t.features,t.obstacles,t.destructible],
  [[...new Set(ds.flatMap(d=>d.mainGimmicks))].sort(),
  ls.flatMap(l=>l.finalBattle?.maps||[l]).reduce((sum,m)=>sum+m.components.length,0),
  ls.flatMap(l=>l.finalBattle?.maps||[l]).reduce((sum,m)=>sum+m.components.filter(c=>c.destructible).length,0)],
  'theme obstacles and features '+(i+1));
}
// Execute the same render function used by the standalone atlas, without a browser.
const browserScript=html.match(/<script>([\s\S]*?)<\/script>/);
ok(browserScript,'standalone renderer script exists');
const js=browserScript[1],stop=js.indexOf('function render(){');
ok(stop>0,'render function entry found');
const sandbox={document:{getElementById(id){return {textContent:id==='payload'?JSON.stringify(rows):JSON.stringify(themes)};}}};
vm.runInNewContext(js.slice(0,stop)+'\nglobalThis.atlasSvg=svg;',sandbox,{timeout:3000});
const svg=sandbox.atlasSvg;
for(const r of rows){const image=svg(r);ok(image.includes('<svg ')&&image.endsWith('</svg>'),'valid map SVG '+r.id);
 eq((image.match(/class="atlas-component"/g)||[]).length,r.geometry.components.length,'all collision components drawn '+r.id);}
const mapped=rows.filter(r=>r.geometry.features.some(f=>f.type==='W'));
ok(mapped.length>0,'reflective floors appear in campaign');
for(const r of mapped){const image=svg(r);ok(image.includes('class="atlas-feature atlas-reflector"'),'reflectors drawn on real surface '+r.id);
 ok(!image.includes('fill-opacity=".3"'),'no legacy fake water plane '+r.id);}
for(const [type,cl] of [['K','atlas-crystal'],['B','atlas-bridge'],['M','atlas-magnet'],['T','atlas-terminal'],['C','atlas-region']]){
 const r=rows.find(r=>r.geometry.features.some(f=>f.type===type));
 ok(!!r&&svg(r).includes('class="atlas-feature '+cl+'"'),type+' uses actual feature shape');
}
const relay=rows[99].geometry.relayMaps;
eq(relay.length,4,'all four final arenas retained');
for(let i=0;i<relay.length;i++){
 const m=relay[i],image=svg({id:'100-'+(i+1),geometry:{floors:m.floors,components:m.components,features:m.features,spawn:[Object.values(m.spawns)[0],m.bossSpawn],playerSpawns:Object.values(m.spawns),worldWidth:3000}});
 ok(image.includes('class="atlas-component"')&&image.endsWith('</svg>'),'final arena '+(i+1)+' renders');
 eq((image.match(/class="atlas-component"/g)||[]).length,m.components.length,'final arena '+(i+1)+' collision polygons');
}
const report={status:'PASS',checks,stages:100,themes:20,finalArenas:4,scope:'All production geometry and labels,rendered collision polygons,reflector overlays,bridge hinges,crystal orientation,magnetic region and full final relay.'};
console.log(report);
