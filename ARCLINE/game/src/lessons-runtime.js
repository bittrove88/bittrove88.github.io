const specialInstructions={gun:'Land beside the rival and cracked cover.',ban:'Land before the rival. The wave travels forward.',hibari:'Send the round close to a visible rival.',hana:'Aim the three-shot spread toward the rival.',rin:'Take your time and hit the rival center.',mogu:'Hit cracked purple cover to open a route.',koro:'Land on the floor before the gap.',sora:'Aim at 50° or higher to scatter eight bomblets.',rico:'Bounce between the floor and cover.',yui:'Land near the rival to pull it toward impact.'};
for(const p of E.combat.profiles)curriculum.descriptions[p.special.id]={title:p.special.name,instruction:specialInstructions[p.id],outcome:p.specialNote,context:'MACHINE SPECIAL'};
Object.assign(curriculum.descriptions,{
 S_GUARD:{title:'Guard',instruction:'Reserve Guard, then fire or teleport.',outcome:'The next rival attack deals half damage.',context:'SKILL DEMO'},
 S_BREACH:{title:'Breach',instruction:'Fire at cracked cover with Breach reserved.',outcome:'One more nearby piece breaks. Damage stays the same.',context:'SKILL DEMO'},
 S_REPAIR:{title:'Field Repair',instruction:'Repair restores 30 HP and uses one action.',outcome:'The rival acts after the repair.',context:'SKILL DEMO'}
});
for(const record of curriculum.stages.filter(r=>r.stage<=20)){const spec=E.levels[record.stage-1];record.weaponCapsules=spec.pickups.filter(p=>p.kind==='trial').map(p=>p.weaponId);record.skillChoices=spec.pickups.filter(p=>p.kind==='skill').map(p=>p.skillId);}
curriculum.descriptions['boss-swap']={title:'EXPOSE THE CORE',instruction:'Select SWAP, then hit the guardian.',outcome:'Its core opens briefly.',context:'BOSS DEMO'};
const ids=Object.keys(curriculum.descriptions),keys=ids.map(id=>'v5:'+id);
const data=value=>value?.data||value||{};
const key=id=>'v5:'+id;
function describe(id){const d=curriculum.descriptions[id];return d?{id,key:key(id),...d}:null;}
function seen(id,save){return (data(save).seenPreviewIds||[]).includes(key(id));}
function eligibleEntry(s,id){
 if(!id)return false;
 if(['B','C','K','U','F','V','M','W'].includes(id)||id==='reflection')return s.spec.features.some(f=>f.type===(id==='reflection'?'W':id));
 if(id==='teleport'||id==='wall-fall')return s.spec.teleport;
 if(id==='destruction')return s.world.solids.some(o=>o.destructible);
 if(id==='pickup')return s.pickups.some(p=>!p.collected);
 if(id==='boss-core')return E.guardian(s)&&s.units[1].parts.some(p=>p.hp>0);
 if(id==='boss-swap')return !!s.spec.boss&&(s.skills.SWAP||0)>0;
 return true;
}
function forWeapon(s,id,save){return id!=='W01'&&s.mode===id&&E.availableWeapons(s).some(w=>w.id===id&&!w.disabled)&&!seen(id,save)?describe(id):null;}
function forSkill(s,id,save){return E.skills.includes(id)&&s.selectedSkill===id&&(s.skills[id]||0)>0&&!s.skillUsed&&!seen(id,save)?describe(id):null;}
function forStage(s,save){
 const record=curriculum.stages[s.stage-1],out=[];
 if(s.spec.midboss&&!seen('boss-core',save))return [describe('boss-core')];
 // Returning players retain progress, but still learn the new control layout.
 if(!seen('controls',save))return [describe('controls')];
 if(record?.stage===s.stage&&eligibleEntry(s,record.entry)&&!seen(record.entry,save))out.push(describe(record.entry));
 if(!out.length){const first=['teleport','destruction'].find(id=>eligibleEntry(s,id)&&!seen(id,save));if(first)out.push(describe(first));}
 const weapon=forWeapon(s,s.mode,save);if(weapon)out.push(weapon);
 return out;
}
const api={revision:curriculum.revision,ids,keys,key,describe,seen,forStage,forWeapon,forSkill,stages:curriculum.stages};
if(typeof module!=='undefined')module.exports=api;else root.ArcLessons=api;
})(globalThis);
