'use strict';
// Capture only from an explicitly selected immutable baseline copy. Never bless
// a failed comparison by recording the current game over the checked-in file.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const args=process.argv.slice(2),value=k=>args[args.indexOf(k)+1],dist=value('--dist'),output=value('--output');
if(!args.includes('--dist')||!args.includes('--output'))throw Error('Use --dist <immutable baseline copy> --output <new file>');
if(fs.existsSync(output))throw Error('Baseline output already exists; refusing to overwrite');
if(path.resolve(dist)===path.resolve(__dirname,'../dist'))throw Error('Select an immutable baseline copy, not the active distribution');
const E=require(path.resolve(dist,'engine.js')),C=require('../tests/visual-baseline-cases.cjs'),sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const expected=require('../../design/sheets/implementation_plan.json').baseline.files;
for(const [name,record]of Object.entries(expected))if(sha(fs.readFileSync(path.resolve(dist,name)))!==record.sha256)throw Error('Immutable0.10.0 source mismatch: '+name);
const rows=C.cases.map((c,i)=>{const a=C.sample(E,c);if(a.before!==a.after)throw Error('Simulation mutated case '+i);return {id:i,input:c,stateSha256:sha(a.before),worldSha256:sha(a.world),shotSha256:sha(a.shot),muzzle:a.muzzle};});
const cpus=[];
for(const characterId of ['gun','rin','yui'])for(const stage of [1,4,7,13,23,33,53,62,80,100]){
 const c={characterId,stage,seed:123,round:1},s=C.stateFor(E,c),plan=E.cpuPlan(s,E.seeded(129));cpus.push({input:c,planSha256:sha(JSON.stringify(plan))});
}
fs.mkdirSync(path.dirname(output),{recursive:true});
const header={version:1,sourceCommit:'2cf1a18bce54a65247c35b273c242d802a18301b',implementation:'0.10.0',scope:'1096 immutable real trajectory cases, including 96 round/part/phase states; 30 seeded CPU cases. Geometry/replay evidence, not campaign wins.'};
fs.writeFileSync(output,JSON.stringify(header,null,2).slice(0,-2)+',\n  "rows": [\n'+rows.map(r=>'    '+JSON.stringify(r)).join(',\n')+'\n  ],\n  "cpus": [\n'+cpus.map(r=>'    '+JSON.stringify(r)).join(',\n')+'\n  ]\n}\n');
console.log(JSON.stringify({status:'PASS',trajectories:rows.length,cpuPlans:cpus.length,output}));
