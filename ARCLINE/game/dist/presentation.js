(function(root){
'use strict';
const $=id=>document.getElementById(id),E=root.ArcEngine,W=root.ArcWeapons;
const descriptions=['A clean, reliable arc.','A heavy, bright impact.','A fast, narrow dart.','A high, floating arc.','One springy bounce.','Two sharp ricochets.','Roll along the ground.','Skip across the surface.','Three spreading paths.','Split into a shower.','Two shots, one release.','Burst above the ground.','Cut through a thin wall.','A straight, bright beam.','Dive down from above.','Travel low along the ground.','Push with the impact.','Pull toward the impact.','Lift with the impact.','Bounce and push.'];
const finishNames=['Tidal Teal','Sunset Pennant','Coral Flash','Gold Dust','Scarab Pennant','Dune Ripple','Mist','Rainbow Wake','Ivy','Railway','Route Pennant','Brass Turret','Sandstorm Pennant','Golden Exhaust','Excavator','Aurora','Snowflake Pennant','Glacier Flash','Lava','Spark Wake','Polarity','Stardust Wake','Sky Garden','Meteor Pennant','Daybreak','Festival Wake','Aurora Pennant'];
const guardianNames=['Tideclaw Armor','Gatekeeper Armor','Cloudray Armor','Prism Armor','Driller Armor','Whitehowl Armor','Forge Armor','Polaris Armor','Carrier Armor','Archeart Armor'];
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function cosmetic(id){
 if(!id)return {id:null,name:'Original',color:'#caffd7',source:null,level:null};
 const source=E.levels.find(spec=>spec.pickups.some(p=>p.id===id));
 return {id,name:(id.startsWith('B')?guardianNames:finishNames)[parseInt(id.slice(1),10)-1]||'Rover finish',color:`hsl(${parseInt(id.slice(1),10)*29%360} 60% 78%)`,source:source?.name||null,level:source?.id||null};
}
function rover(id,large=false){
 const c=cosmetic(id),flag=(id?.startsWith('B')||['S02','S05','S11','S13','S17','S24','S27'].includes(id))?`<path d="M48 47V12l24 8-24 8" fill="${c.color}" stroke="${c.color}" stroke-width="3"/>`:'';
 return `<svg class="rover-mark${large?' hero-rover':''}" viewBox="0 0 180 110" aria-hidden="true"><ellipse cx="87" cy="96" rx="68" ry="6" fill="#08263755"/>${['S08','S14','S20','S22','S26'].includes(id)?`<path d="M23 77Q-9 55 4 45M17 87Q-9 89 0 70" fill="none" stroke="${c.color}" stroke-width="4" stroke-linecap="round" opacity=".7"/>`:''}${flag}<rect x="24" y="74" width="118" height="20" rx="10" fill="#163d50"/><path d="M23 72l25-27h66l31 27" fill="#3d8991"/><rect x="59" y="30" width="52" height="39" rx="9" fill="${c.color}"/><path d="M89 49l48-23" stroke="#3d8991" stroke-width="15" stroke-linecap="round"/><path d="M89 49l48-23" stroke="${c.color}" stroke-width="8" stroke-linecap="round"/><rect x="91" y="38" width="16" height="8" rx="3" fill="#356478"/>${['S03','S18'].includes(id)?`<path d="M144 23l11-11-2 14 13-2-11 12" fill="${c.color}" opacity=".8"/>`:''}${[46,82,119].map(x=>`<circle cx="${x}" cy="83" r="10" fill="#12384b"/><circle cx="${x}" cy="83" r="4" fill="#6aa39f"/>`).join('')}</svg>`;
}
function missing(spec,data){return spec.pickups.filter(p=>p.id[0]!=='R'&&!data.unlockedWeaponIds.includes(p.id)&&!data.collectedCosmeticIds.includes(p.id));}
function syncLobby(data,selectedMap){
 const spec=E.levels[selectedMap],weapon=W.get(data.equippedWeaponId),look=weapon.appearance,c=cosmetic(data.equippedCosmeticId);
 $('stageCaption').textContent=spec.boss?'AREA GUARDIAN · LEVEL '+spec.id:'LEVEL '+spec.id;
 $('equippedWeapon').textContent=weapon.name;$('equippedCosmetic').textContent=c.name;$('equippedWeaponGlyph').textContent=look.glyph;$('equippedWeaponGlyph').style.color=look.color;
 $('lobbyRover').innerHTML=rover(data.equippedCosmeticId,true);
 $('collectionCount').textContent=`${data.unlockedWeaponIds.length} ${data.unlockedWeaponIds.length===1?'WEAPON':'WEAPONS'} · ${data.collectedCosmeticIds.length} ${data.collectedCosmeticIds.length===1?'FINISH':'FINISHES'}`;
 const reward=missing(spec,data)[0];
 if(reward){const weapon=reward.id.startsWith('W')?W.get(reward.id):null;$('nextReward').innerHTML=`<i style="color:${weapon?.appearance.color||cosmetic(reward.id).color}" aria-hidden="true">${weapon?.appearance.glyph||'◆'}</i><span>FIND HERE <strong>${escape(weapon?.name||cosmetic(reward.id).name)}</strong></span>`;}
 else{const area=Math.floor(selectedMap/10),boss=E.levels[area*10+9];$('nextReward').innerHTML=`<i aria-hidden="true">${spec.boss?'◈':'↗'}</i><span>${spec.boss?'AREA GUARDIAN':'ON THE HORIZON'} <strong>${escape(boss.name)} · LV ${boss.id}</strong></span>`;}
 $('openCollection').setAttribute('aria-label',`Equipment: ${weapon.name}, ${c.name}. Open collection`);
 $('chooseLevel').setAttribute('aria-label',`Open journey, area ${Math.floor(selectedMap/10)+1}, level ${spec.id}`);
}
function miniature(spec){
 let paths=spec.floors.map(f=>`<polyline points="${f.map(([x,h])=>x+','+(52-h)).join(' ')}" fill="none" stroke="currentColor" stroke-width="2"/>`).join('');
 paths+=spec.features.filter(f=>'BRKS'.includes(f.type)).map(f=>{const v=f.v;if(f.type==='K')return `<circle cx="${v[0]}" cy="${52-v[1]}" r="3" fill="#abfff2"/>`;return `<path d="M${v[0]},${52-v[1]} l${f.type==='B'?v[2]:10},-3" stroke="#d4bfe4" stroke-width="2"/>`;}).join('');
 return `<svg viewBox="0 0 100 55" aria-hidden="true">${paths}</svg>`;
}
function renderJourney(data,selectedMap,onSelect){
 let area=Math.floor(selectedMap/10);
 function paint(){
  $('journeyAreas').innerHTML=E.biomes.map((biome,index)=>{
   const done=Math.max(0,Math.min(10,data.cleared-index*10)),open=index*10<=data.cleared;
   return `<button role="tab" aria-selected="${area===index}" aria-label="Area ${index+1}: ${escape(biome.name)}, ${done} of 10 cleared${open?'':', ahead'}" data-area="${index}" class="${area===index?'active ':''}${done===10?'complete ':''}${open?'':'ahead'}"><b>${done===10?'✓':String(index+1).padStart(2,'0')}</b><span>${escape(biome.name)}</span><i style="--done:${done*10}%"></i></button>`;
  }).join('');
  const biome=E.biomes[area],boss=E.levels[area*10+9],remaining=E.levels.slice(area*10,area*10+10).reduce((n,spec)=>n+missing(spec,data).length,0);
  $('journeySummary').innerHTML=`<div><small>AREA ${String(area+1).padStart(2,'0')} · LEVELS ${area*10+1}–${area*10+10}</small><h3>${escape(biome.name)}</h3></div><span>${remaining?`◆ ${remaining} TO FIND`:'◆ COLLECTION COMPLETE'}<small>◈ ${escape(boss.name)}</small></span>`;
  $('levelGrid').innerHTML=E.levels.slice(area*10,area*10+10).map((spec,j)=>{
   const index=area*10+j,locked=index>data.cleared,items=missing(spec,data),cleared=index<data.cleared;
   return `<button data-stage="${index}" ${locked?'disabled':''} class="${cleared?'cleared ':''}${spec.boss?'guardian ':''}${index===selectedMap?'current':''}" aria-label="Level ${spec.id}, ${escape(spec.name)}, ${locked?'locked':cleared?'cleared':'next'}${items.length?', '+items.length+' uncollected capsule'+(items.length>1?'s':''):''}"><div class="stage-number"><strong>${String(spec.id).padStart(2,'0')}</strong><span>${locked?'⌑':cleared?'✓':spec.boss?'◈':'→'}</span></div>${miniature(spec)}<strong class="stage-name">${escape(spec.name)}</strong><small>${spec.boss?'AREA GUARDIAN':items.length?items.map(p=>p.id[0]==='W'?'NEW WEAPON':'FINISH').join(' · '):cleared?'CLEARED':'CROSS THE FIELD'}</small>${items.length?'<span class="capsule" aria-hidden="true">◆</span>':''}</button>`;
  }).join('');
  $('journeyAreas').querySelectorAll('[data-area]').forEach(button=>button.onclick=()=>{area=+button.dataset.area;paint();$('journeyAreas').querySelector('[aria-selected="true"]')?.focus({preventScroll:true});});
  $('levelGrid').querySelectorAll('[data-stage]').forEach(button=>button.onclick=()=>{onSelect(+button.dataset.stage);if($('levelPicker').hidden)$('play').focus({preventScroll:true});});
 }
 paint();$('levelPicker').hidden=false;$('journeyAreas').querySelector('[aria-selected="true"]')?.scrollIntoView({block:'nearest',inline:'center'});$('closeLevels').focus({preventScroll:true});
}
let collectionView='weapons';
function showCollection(data,onEquip){
 function paint(){
  const weapons=data.unlockedWeaponIds.length,finishes=data.collectedCosmeticIds.length;
  let body=`<div class="collection-tabs" role="tablist" aria-label="Equipment category"><button role="tab" data-collection-tab="weapons" aria-selected="${collectionView==='weapons'}">WEAPONS <small>${weapons}/20</small></button><button role="tab" data-collection-tab="finishes" aria-selected="${collectionView==='finishes'}">FINISHES <small>${finishes}/37</small></button></div><p class="collection-note">${collectionView==='weapons'?'Equip one special. Standard is always ready.':'Your rover, your journey.'}</p><div class="equipment-grid">`;
  if(collectionView==='weapons')body+=W.weapons.map((weapon,index)=>{
   const owned=data.unlockedWeaponIds.includes(weapon.id),selected=data.equippedWeaponId===weapon.id,source=E.levels.find(s=>s.pickups.some(p=>p.id===weapon.id)),look=weapon.appearance;
   return `<button class="equipment-card weapon-card ${owned?'owned':'locked'} ${selected?'equipped':''}" data-equip-weapon="${weapon.id}" ${owned?'':'disabled'} aria-label="${escape(weapon.name)}, ${selected?'equipped':owned?'equip':`find at level ${source?.id||1}`}"><i class="weapon-glyph" style="--weapon-color:${look.color}" aria-hidden="true">${look.glyph}</i><strong>${escape(weapon.name)}</strong><span>${descriptions[index]}</span><small>${selected?'✓ EQUIPPED':owned?'EQUIP':`LV ${source?.id||1} · DISCOVER`}</small></button>`;
  }).join('');
  else body+=[null,...root.ArcSave.cosmeticIds].map(id=>{
   const c=cosmetic(id),owned=!id||data.collectedCosmeticIds.includes(id),selected=(data.equippedCosmeticId||null)===id;
   return `<button class="equipment-card finish-card ${owned?'owned':'locked'} ${selected?'equipped':''}" data-equip-cosmetic="${id||''}" ${owned?'':'disabled'} aria-label="${escape(c.name)}, ${selected?'equipped':owned?'equip':`find at level ${c.level}`}">${rover(id)}<strong>${escape(c.name)}</strong><span>${escape(c.source||'The first rover.')}</span><small>${selected?'✓ EQUIPPED':owned?'EQUIP':`LV ${c.level} · DISCOVER`}</small></button>`;
  }).join('');
  $('collectionGrid').innerHTML=body+'</div>';
  $('collectionGrid').querySelectorAll('[data-collection-tab]').forEach(button=>button.onclick=()=>{collectionView=button.dataset.collectionTab;paint();$('collectionGrid').querySelector('[aria-selected="true"]')?.focus({preventScroll:true});});
  $('collectionGrid').querySelectorAll('[data-equip-weapon]').forEach(button=>button.onclick=()=>{const id=button.dataset.equipWeapon;onEquip({weaponId:id});paint();$('collectionGrid').querySelector(`[data-equip-weapon="${id}"]`)?.focus({preventScroll:true});});
  $('collectionGrid').querySelectorAll('[data-equip-cosmetic]').forEach(button=>button.onclick=()=>{const id=button.dataset.equipCosmetic;onEquip({cosmeticId:id||null});paint();$('collectionGrid').querySelector(`[data-equip-cosmetic="${id}"]`)?.focus({preventScroll:true});});
 }
 paint();$('collectionPanel').hidden=false;$('closeCollection').focus({preventScroll:true});
}
function closeCollection(){$('collectionPanel').hidden=true;$('openCollection').focus({preventScroll:true});}
root.ArcPresentation={syncLobby,renderJourney,showCollection,closeCollection,cosmetic,rover};
})(globalThis);
