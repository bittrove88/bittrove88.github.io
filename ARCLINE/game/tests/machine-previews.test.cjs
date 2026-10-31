'use strict';
const E=require('../dist/engine.js'),P=require('../dist/preview.js'),L=require('../dist/lessons.js'),fs=require('node:fs');
const out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-machine-combat';fs.mkdirSync(out,{recursive:true});
const cases=[],failed=[],started=Date.now();
for(const profile of E.combat.profiles)for(const id of L.ids){
 const stage=L.stages.find(r=>r.entry===id||r.weaponCapsules.includes(id)||r.skillChoices.includes(id))?.stage||(/boss/.test(id)?10:7),s=E.campaign(stage,{equippedCharacterId:profile.id,matchSeed:20261031,battleInventory:{weapons:Object.fromEntries(E.weapons.filter(w=>w.id!=='W01').map(w=>[w.id,3])),skills:Object.fromEntries(E.skills.map(id=>[id,3]))}});
 const raw=JSON.stringify(s);let d;try{d=P.create(s,id);}catch(e){failed.push({machine:profile.id,id,error:String(e)});continue;}
 const row={machine:profile.id,id,stage,source:d?.source||d?.presentation?.source,valid:!!d?.proof?.valid,immutable:JSON.stringify(s)===raw};cases.push(row);if(!row.valid||!row.immutable)failed.push(row);
}
const report={status:failed.length?'FAIL':'PASS',checks:cases.length*2,machines:10,lessons:L.ids.length,cases,failed,elapsedMs:Date.now()-started,scope:'Every existing and machine-specific lesson with all ten combat profiles; actual demonstrated effect proof and live-state immutability. Authored practice vignettes are allowed and labelled in the UI.'};fs.writeFileSync(out+'/MACHINE_PREVIEWS.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,cases:cases.length,failed},null,2));

if(failed.length)process.exitCode=1;
