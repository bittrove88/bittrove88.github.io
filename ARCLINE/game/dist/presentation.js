(function(root){
'use strict';
const $=id=>document.getElementById(id),E=root.ArcEngine,W=root.ArcWeapons;
const descriptions=['A reliable arc and balanced blast.','A wide blast catches nearby targets.','A fast, narrow shot for small openings.','A high arc falls behind cover.','One high bounce off solid ground.','Two controlled ricochets.','Rolls forward along the ground.','Low, repeated ground bounces.','Three paths spread at launch.','Splits into three at the top.','Two close shots in sequence.','Bursts near the target before contact.','Passes through a thin wall.','A near-straight shot through a clear lane.','Dives sharply after the top.','Impact sends waves along the floor.','Pushes the target away.','Pulls the target toward the impact.','Carries the target to a higher platform.','Ricochets and pushes the target.'];
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
function themeName(index){const spec=E.levels[index*5];return spec?.themeName||E.biomes[spec?.theme]?.name||'Theme '+(index+1);}
function syncLobby(data,selectedMap){
 const spec=E.levels[selectedMap],theme=Math.floor(selectedMap/5),slot=selectedMap%5,weapon=W.get(data.equippedWeaponId),look=weapon.appearance,c=cosmetic(data.equippedCosmeticId);
 $('arenaTag').textContent=String(theme+1).padStart(2,'0')+' / 20';$('arenaTitle').textContent=themeName(theme);$('stageCaption').textContent=(slot+1)+' / 5';
 $('themeProgress').innerHTML=Array.from({length:5},(_,i)=>`<i class="${theme*5+i<data.cleared?'cleared ':''}${i===slot?'current':''}"></i>`).join('');$('themeProgress').setAttribute('aria-label',`Theme ${theme+1}, stage ${slot+1} of 5`);
 $('progressText').textContent='LEVEL '+spec.id;$('play').innerHTML=`PLAY <span aria-hidden="true">→</span>`;
 $('equippedWeapon').textContent=weapon.name;$('equippedCosmetic').textContent=c.name;$('equippedWeaponGlyph').textContent=look.glyph;$('equippedWeaponGlyph').style.color=look.color;$('lobbyRover').innerHTML=rover(data.equippedCosmeticId,true);
 $('collectionCount').textContent=data.unlockedWeaponIds.length+'/20 · '+data.collectedCosmeticIds.length+'/37';
 $('openCollection').setAttribute('aria-label',`Equipment: ${weapon.name}, ${c.name}`);$('chooseLevel').setAttribute('aria-label',`Journey, theme ${theme+1}, level ${spec.id}`);
}
function miniature(spec){
 let paths=spec.floors.map(f=>`<polyline points="${f.map(([x,h])=>x+','+(52-h)).join(' ')}" fill="none" stroke="currentColor" stroke-width="2"/>`).join('');
 for(const {type,v} of spec.features){
  if(type==='W')for(const floor of spec.floors)for(let i=1;i<floor.length;i++){const [ax,ah]=floor[i-1],[bx,bh]=floor[i],x1=Math.max(ax,v[0]),x2=Math.min(bx,v[1]);if(x2<=x1||bx===ax)continue;const h=x=>ah+(bh-ah)*(x-ax)/(bx-ax);paths+=`<path d="M${x1},${52-h(x1)}L${x2},${52-h(x2)}" stroke="#bcf9f2" stroke-width="3.5"/>`;}
  if(type==='K'){const a=v[2]*Math.PI/180,dx=Math.cos(a)*5.5,dy=Math.sin(a)*5.5;paths+=`<path d="M${v[0]-dx},${52-v[1]-dy}L${v[0]+dx},${52-v[1]+dy}" stroke="#abfff2" stroke-width="2.5"/>`;}
  if(type==='S')paths+=`<rect x="${v[0]}" y="${52-v[3]}" width="${v[1]-v[0]}" height="${v[3]-v[2]}" fill="#739b9b" stroke="#d4e6db" stroke-width=".8"/>`;
  if(type==='R')paths+=`<rect x="${v[0]}" y="${50-v[2]}" width="${v[1]-v[0]}" height="2" fill="#a6bcb7"/>`;
  if(type==='B'){const a=(v[3]?75:v[4]||0)*Math.PI/180;paths+=`<path d="M${v[0]},${52-v[1]}l${Math.cos(a)*v[2]},${-Math.sin(a)*v[2]}" stroke="#d4bfe4" stroke-width="2.2"/>`;}
 }
 return `<svg viewBox="0 0 100 55" aria-hidden="true">${paths}</svg>`;
}
function renderJourney(data,selectedMap,onSelect){
 let area=Math.floor(selectedMap/5);const total=Math.ceil(E.levels.length/5);
 function paint(focus=false){
  $('journeyAreas').innerHTML=Array.from({length:total},(_,index)=>{const done=Math.max(0,Math.min(5,data.cleared-index*5)),open=index*5<=data.cleared;return `<button role="tab" aria-selected="${area===index}" aria-label="Theme ${index+1}: ${escape(themeName(index))}, ${done} of 5 cleared" data-area="${index}" class="${area===index?'active ':''}${done===5?'complete ':''}${open?'':'ahead'}">${done===5?'✓':String(index+1).padStart(2,'0')}</button>`;}).join('');
  const stages=E.levels.slice(area*5,area*5+5),remaining=stages.reduce((n,spec)=>n+missing(spec,data).length,0);
  $('journeySummary').innerHTML=`<h3>${escape(themeName(area))}</h3><p>${area+1} / ${total}${remaining?' · ◆ '+remaining:''}</p>`;
  $('journeyPrev').disabled=area===0;$('journeyNext').disabled=area===total-1;
  $('levelGrid').innerHTML=stages.map((spec,j)=>{const index=area*5+j,locked=index>data.cleared,items=missing(spec,data),cleared=index<data.cleared;return `<button data-stage="${index}" ${locked?'disabled':''} class="${cleared?'cleared ':''}${j===4?'guardian ':''}${index===selectedMap?'current':''}" aria-label="Level ${spec.id}, ${escape(spec.name)}, ${locked?'locked':cleared?'cleared':'next'}${items.length?', '+items.length+' uncollected':''}"><div class="stage-number"><strong>${String(spec.id).padStart(2,'0')}</strong><span aria-hidden="true">${locked?'🔒':cleared?'✓':spec.boss?'◈':'→'}</span></div>${miniature(spec)}<strong class="stage-name">${escape(spec.name)}</strong>${items.length?'<span class="capsule" aria-hidden="true">◆</span>':''}</button>`;}).join('');
  $('journeyAreas').querySelectorAll('[data-area]').forEach(button=>button.onclick=()=>{area=+button.dataset.area;paint(true);});
  $('levelGrid').querySelectorAll('[data-stage]').forEach(button=>button.onclick=()=>{onSelect(+button.dataset.stage);if($('levelPicker').hidden)$('play').focus({preventScroll:true});});
  $('journeyPrev').onclick=()=>{area=Math.max(0,area-1);paint();};$('journeyNext').onclick=()=>{area=Math.min(total-1,area+1);paint();};
  const tab=$('journeyAreas').querySelector('[aria-selected="true"]');tab?.scrollIntoView({block:'nearest',inline:'center'});if(focus)tab?.focus({preventScroll:true});
 }
 $('levelPicker').hidden=false;paint();$('closeLevels').focus({preventScroll:true});
}
let collectionView='weapons';
function showCollection(data,onEquip){
 function paint(){
  const weapon=W.get(data.equippedWeaponId),finish=cosmetic(data.equippedCosmeticId);
  let body=`<div class="collection-tabs" role="tablist" aria-label="Equipment category"><button role="tab" data-collection-tab="weapons" aria-selected="${collectionView==='weapons'}">Weapons <small>${data.unlockedWeaponIds.length}/20</small></button><button role="tab" data-collection-tab="finishes" aria-selected="${collectionView==='finishes'}">Finishes <small>${data.collectedCosmeticIds.length}/37</small></button></div>`;
  body+=collectionView==='weapons'?`<div class="equipment-detail"><i style="--weapon-color:${weapon.appearance.color}" aria-hidden="true">${weapon.appearance.glyph}</i><div><strong>${escape(weapon.name)}</strong><p>${escape(weapon.description||descriptions[W.weapons.indexOf(weapon)])}</p></div></div>`:`<div class="equipment-detail">${rover(data.equippedCosmeticId)}<div><strong>${escape(finish.name)}</strong><p>${escape(finish.source||'Original')}</p></div></div>`;
  body+='<div class="equipment-grid">';
  if(collectionView==='weapons')body+=W.weapons.map(w=>{const owned=data.unlockedWeaponIds.includes(w.id),selected=data.equippedWeaponId===w.id,source=E.levels.find(s=>s.pickups.some(p=>p.id===w.id)),look=w.appearance;return `<button class="equipment-card weapon-card ${owned?'owned':'locked'} ${selected?'equipped':''}" data-equip-weapon="${w.id}" ${owned?'':'disabled'} aria-label="${escape(w.name)}, ${selected?'equipped':owned?'equip':`find at level ${source?.id||1}`}"><i class="weapon-glyph" style="--weapon-color:${look.color}" aria-hidden="true">${look.glyph}</i><strong>${escape(w.name)}</strong><small>${selected?'✓':owned?'':`LV ${source?.id||1}`}</small></button>`;}).join('');
  else body+=[null,...root.ArcSave.cosmeticIds].map(id=>{const c=cosmetic(id),owned=!id||data.collectedCosmeticIds.includes(id),selected=(data.equippedCosmeticId||null)===id;return `<button class="equipment-card finish-card ${owned?'owned':'locked'} ${selected?'equipped':''}" data-equip-cosmetic="${id||''}" ${owned?'':'disabled'} aria-label="${escape(c.name)}, ${selected?'equipped':owned?'equip':`find at level ${c.level}`}">${rover(id)}<strong>${escape(c.name)}</strong><small>${selected?'✓':owned?'':`LV ${c.level}`}</small></button>`;}).join('');
  $('collectionGrid').innerHTML=body+'</div>';
  $('collectionGrid').querySelectorAll('[data-collection-tab]').forEach(button=>button.onclick=()=>{collectionView=button.dataset.collectionTab;paint();$('collectionGrid').querySelector('[aria-selected="true"]')?.focus({preventScroll:true});});
  $('collectionGrid').querySelectorAll('[data-equip-weapon]').forEach(button=>button.onclick=()=>{const id=button.dataset.equipWeapon;onEquip({weaponId:id});paint();$('collectionGrid').querySelector(`[data-equip-weapon="${id}"]`)?.focus({preventScroll:true});});
  $('collectionGrid').querySelectorAll('[data-equip-cosmetic]').forEach(button=>button.onclick=()=>{const id=button.dataset.equipCosmetic;onEquip({cosmeticId:id||null});paint();$('collectionGrid').querySelector(`[data-equip-cosmetic="${id}"]`)?.focus({preventScroll:true});});
 }
 paint();$('collectionPanel').hidden=false;$('closeCollection').focus({preventScroll:true});
}
function closeCollection(){$('collectionPanel').hidden=true;$('openCollection').focus({preventScroll:true});}
function closeWeapons(){$('weaponPicker').hidden=true;$('weaponToggle').focus({preventScroll:true});}
function showWeapons(choices,current,onSelect){
 $('weaponChoices').innerHTML=choices.map(choice=>{const w=W.get(choice.id);return `<button data-choose-weapon="${choice.id}" class="${choice.id===current?'selected':''}" aria-pressed="${choice.id===current}" style="--weapon-color:${w.appearance.color}"><i aria-hidden="true">${w.appearance.glyph}</i><strong>${escape(w.name)}</strong><span aria-label="${choice.id==='W01'?'unlimited':choice.ammo+' shots'}">${choice.id==='W01'?'∞':choice.ammo}</span></button>`;}).join('');
 $('weaponChoices').querySelectorAll('[data-choose-weapon]').forEach(button=>button.onclick=()=>{closeWeapons();onSelect(button.dataset.chooseWeapon);});$('closeWeapons').onclick=closeWeapons;$('weaponPicker').hidden=false;$('weaponChoices').querySelector('.selected')?.focus({preventScroll:true});
}
root.ArcPresentation={syncLobby,renderJourney,showCollection,closeCollection,showWeapons,closeWeapons,cosmetic,rover};
})(globalThis);
