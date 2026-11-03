// Controlled completion fixture for save/media tests only. Real combat is covered by final-battle.
module.exports=function completeFinalTeam(s){if(s.stage===100&&s.finalTeam){s.finalTeam.index=9;s.finalTeam.map=3;s.characterId='gun';for(const id of s.spec.finalBattle.order)s.finalTeam.damage[id]=s.spec.finalBattle.requiredDamage;s.finalTeam.pending=false;}return s;};
