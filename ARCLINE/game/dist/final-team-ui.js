/* Generated from game/ui/final-team-ui.js. Edit the source. */
(function(root){'use strict';
function create(hooks){const $=id=>document.getElementById(id);let serial=-1,transition=false;const local=(ja,en)=>root.ArcI18n.language==='en'?en:ja;
 $('finalTeamHUD').onclick=()=>{if(hooks.allowed())hooks.open();};
 function sync(s){const on=root.ArcFinalTeam.active(s);$('battle').dataset.finalTeam=String(on);$('finalTeamHUD').hidden=!on||!!s?.result||hooks.hidden();if(!on){serial=-1;transition=false;$('finalTeamTransition').hidden=true;return;}
  const c=s.spec.finalBattle,t=s.finalTeam,id=c.order[t.index],a=root.ArcCharacters.get(id),done=c.order.filter(x=>t.damage[x]>=c.requiredDamage-1e-7).length,left=Math.max(0,Math.ceil((c.requiredDamage-t.damage[id])*root.ArcCombat.pointsPerUnit-1e-7));
  $('finalTeamWho').textContent=local(a.nameJa,a.name)+' '+(t.index+1)+'/10';$('finalTeamProgress').textContent=local((t.pending?'交代待ち':'あと'+left)+'・必殺'+s.specialAmmo,(t.pending?'Handoff':'Need '+left)+' · SP '+s.specialAmmo);$('finalTeamHUD').setAttribute('aria-label',local('出撃順を確認。達成'+done+'/10機','View fixed order. '+done+' of 10 complete'));$('finalTeamHUD').disabled=!hooks.allowed();
  if(serial!==t.serial){if(serial>=0){transition=true;$('finalTeamTransition').dataset.travel=String(!!t.travel);$('finalTeamTransition').style.setProperty('--team-duration',(t.travel?(matchMedia('(prefers-reduced-motion: reduce)').matches?.7:t.travel.duration):.6)+'s');$('finalTeamTransition').classList.remove('is-entering');void $('finalTeamTransition').offsetWidth;$('finalTeamTransition').classList.add('is-entering');}serial=t.serial;}
  if(s.phase!=='transition')transition=false;
  $('finalTeamTransition').hidden=!transition||hooks.hidden();$('finalTeamTransitionEvent').textContent=t.travel?local('地殻崩壊 → 第'+(t.map+1)+'戦場','GROUND COLLAPSE → ARENA '+(t.map+1)):local('出撃交代','RELAY HANDOFF');$('finalTeamTransitionName').textContent=local(a.nameJa,a.name)+' · '+(t.index+1)+'/10';$('finalTeamTransitionMap').textContent=local(c.maps[t.map].name.ja,c.maps[t.map].name.en);
 }
 return {sync};}
root.ArcFinalTeamUi={create};
})(globalThis);
