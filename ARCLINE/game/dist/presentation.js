(function(root){'use strict';
const $=id=>document.getElementById(id),E=root.ArcEngine,W=root.ArcWeapons,A=root.ArcCharacters,C=E.combat,Crew=root.ArcCrew;
const language=()=>root.ArcI18n.language,local=(ja,en)=>language()==='en'?en:ja;
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const missing=()=>[];
function themeName(index){return language()==='en'?E.biomes[index].name:E.levels[index*5].themeName;}
function syncLobby(data,selectedMap,context){
 const spec=E.levels[selectedMap],c=A.get(data.equippedCharacterId),stock=context?.entry.inventory||{weapons:{},skills:{}},practice=context?.practice;
 $('arenaTag').textContent=local('第'+(Math.floor(selectedMap/10)+1)+'章 · '+themeName(spec.theme),'CHAPTER '+(Math.floor(selectedMap/10)+1)+' · '+themeName(spec.theme));
 $('arenaTitle').textContent=root.ArcStory.stageName(spec,language(),false,data.cleared);
 $('stageCaption').textContent=language()==='en'?spec.tacticalGoalEn:spec.tacticalGoal;
 $('progressText').textContent=local(data.cleared+' / 100 面クリア',''+data.cleared+' / 100 CLEARED');
 $('themeProgress').innerHTML=Array.from({length:5},(_,i)=>`<i class="${spec.theme*5+i<data.cleared?'cleared ':''}${i===(selectedMap%5)?'current':''}"></i>`).join('');
 $('play').textContent=practice?local('この面を練習','Practice this stage'):local(data.cleared||data.chapterRun?'冒険を続ける':'冒険をはじめる',data.cleared||data.chapterRun?'Continue the adventure':'Begin the adventure');
 $('equippedCharacterName').textContent=language()==='en'?c.name:c.nameJa;
 $('lobbyRover').innerHTML=A.markup(c.id,'hero-character');A.paintAll($('lobbyRover'));
 $('equippedWeapon').textContent=local('武器 '+Object.keys(stock.weapons).length+' · スキル '+Object.keys(stock.skills).length,'Weapons '+Object.keys(stock.weapons).length+' · Skills '+Object.keys(stock.skills).length);
 $('collectionCount').textContent=data.unlockedCharacterIds.length+'/10';
 $('openCollection').setAttribute('aria-label',local('持ち物・練習用武器','Inventory and practice weapons'));
 $('openCharacters').setAttribute('aria-label',local('仲間を選ぶ。現在 '+c.nameJa,'Choose a companion. Current '+c.name));
 $('chooseLevel').textContent=local('ステージを選ぶ','Stages');
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
function renderJourney(data,selectedMap,onSelect,onRestart){
 let area=Math.floor(selectedMap/5);const total=Math.ceil(E.levels.length/5);
 function paint(focus=false){
  $('journeyAreas').innerHTML=Array.from({length:total},(_,index)=>{const done=Math.max(0,Math.min(5,data.cleared-index*5)),open=index*5<=data.cleared;return `<button role="tab" aria-selected="${area===index}" aria-label="Theme ${index+1}: ${escape(themeName(index))}, ${done} of 5 cleared" data-area="${index}" class="${area===index?'active ':''}${done===5?'complete ':''}${open?'':'ahead'}">${done===5?'✓':String(index+1).padStart(2,'0')}</button>`;}).join('');
  const stages=E.levels.slice(area*5,area*5+5),remaining=stages.reduce((n,spec)=>n+missing(spec,data).length,0);
  $('journeySummary').innerHTML=`<h3>${escape(themeName(area))}</h3><p>${area+1} / ${total}${remaining?' · ◆ '+remaining:''}</p>`;
  $('journeyPrev').disabled=area===0;$('journeyNext').disabled=area===total-1;
  $('restartChapter').hidden=!onRestart;$('restartChapter').disabled=Math.floor(area/2)*10>data.cleared;$('restartChapter').textContent=`Start chapter ${Math.floor(area/2)+1} from the beginning`;$('restartChapter').onclick=()=>onRestart?.(Math.floor(area/2)*10+1);
  $('levelGrid').innerHTML=stages.map((spec,j)=>{const index=area*5+j,locked=index>data.cleared,items=missing(spec,data),cleared=index<data.cleared;return `<button data-stage="${index}" ${locked?'disabled':''} class="${cleared?'cleared ':''}${j===4?'guardian ':''}${index===selectedMap?'current':''}" aria-label="Level ${spec.id}, ${escape(root.ArcStory.stageName(spec,root.ArcI18n.language,false,data.cleared))}, ${locked?'locked':cleared?'cleared':'next'}${items.length?', '+items.length+' uncollected':''}"><div class="stage-number"><strong>${String(spec.id).padStart(2,'0')}</strong><span aria-hidden="true">${locked?'🔒':cleared?'✓':spec.boss?'◈':'→'}</span></div>${miniature(spec)}<strong class="stage-name">${escape(root.ArcStory.stageName(spec,root.ArcI18n.language,false,data.cleared))}</strong>${items.length?'<span class="capsule" aria-hidden="true">◆</span>':''}</button>`;}).join('');
  $('journeyAreas').querySelectorAll('[data-area]').forEach(button=>button.onclick=()=>{area=+button.dataset.area;paint(true);});
  $('levelGrid').querySelectorAll('[data-stage]').forEach(button=>button.onclick=()=>{onSelect(+button.dataset.stage);if($('levelPicker').hidden)$('play').focus({preventScroll:true});});
  $('journeyPrev').onclick=()=>{area=Math.max(0,area-1);paint();};$('journeyNext').onclick=()=>{area=Math.min(total-1,area+1);paint();};
  const tab=$('journeyAreas').querySelector('[aria-selected="true"]');tab?.scrollIntoView({block:'nearest',inline:'center'});if(focus)tab?.focus({preventScroll:true});
 }
 $('levelPicker').hidden=false;paint();$('closeLevels').focus({preventScroll:true});
}

let collectionView='characters',returnTo=null,collectionRefresh=null;
function showCollection(data,onEquip,initialView='characters',options={}){
 collectionView=initialView==='weapons'?'weapons':'characters';if(options.battle)collectionView='characters';returnTo=options.trigger||document.activeElement;let inspected=data.equippedCharacterId;
 const owned=id=>Crew.owned(data,id);
 function paint(){
  const previousHero=root.ArcCharacterHero.snapshot($('collectionGrid'));
  document.querySelector('#collectionPanel header strong').textContent=local(options.battle?'戦闘中の仲間変更':'仲間と持ち物',options.battle?'Change machine':'Companions and inventory');
  let body=options.battle?'':`<div class="collection-tabs" role="tablist"><button data-collection-tab="characters" role="tab" aria-selected="${collectionView==='characters'}">${local('仲間','Companions')} ${data.unlockedCharacterIds.length}/10</button><button data-collection-tab="weapons" role="tab" aria-selected="${collectionView==='weapons'}">${local('練習用武器','Practice weapons')}</button></div>`;
  if(collectionView==='characters'){
   const m=A.get(inspected),p=C.get(inspected),r=Crew.get(inspected),selected=data.equippedCharacterId===inspected;
   body+=`<div class="machine-roster"><div class="machine-buttons" role="group" aria-label="${local('10機の仲間','Ten machines')}">${Crew.rows.map(r=>root.ArcCharacterHero.tile(r.id,data,inspected,language())).join('')}</div><section class="machine-profile" aria-label="${m.name}">${root.ArcCharacterHero.markup(m.id,{data,lang:language(),battle:options.battle,description:options.battle?local('HP割合・行動数・必殺残数を引き継ぎます。','HP ratio, actions and special ammo are retained.'):root.ArcStory.pick(r.desire,language())})}</section></div>`;
  }else body+=`<p class="inventory-note">${local('章内で拾った武器・スキルはボスまで持ち越し。ここで選ぶ武器は練習用です。','Picked weapons and skills carry until the chapter boss. This selection is for practice.')}</p><div class="equipment-grid">${W.weapons.filter(w=>w.id in W.coreUnlocks).map(w=>{const unlocked=data.unlockedWeaponIds.includes(w.id);return `<button data-equip-weapon="${w.id}" class="equipment-card ${data.equippedWeaponId===w.id?'equipped':''}" ${unlocked?'':'disabled'}><strong>${root.ArcI18n.t(w.name)}</strong><small>${unlocked?local('練習で使用','Use in practice'):local((W.coreUnlocks[w.id]||1)+'面で解放','Clear LV '+(W.coreUnlocks[w.id]||1))}</small></button>`;}).join('')}</div>`;
  $('collectionGrid').innerHTML=body;A.paintAll($('collectionGrid'));root.ArcCharacterHero.hydrate($('collectionGrid'));const nextHero=$('collectionGrid').querySelector('.machine-profile');if(nextHero)root.ArcCharacterHero.crossfade(nextHero,previousHero);
  for(const b of $('collectionGrid').querySelectorAll('[data-inspect-character]'))b.onclick=()=>{inspected=b.dataset.inspectCharacter;paint();$('collectionGrid').querySelector(`[data-inspect-character="${inspected}"]`).focus({preventScroll:true});};
  for(const b of $('collectionGrid').querySelectorAll('[data-collection-tab]'))b.onclick=()=>{collectionView=b.dataset.collectionTab;paint();};
  for(const b of $('collectionGrid').querySelectorAll('[data-equip-weapon]'))b.onclick=()=>{onEquip({weaponId:b.dataset.equipWeapon});paint();};
  const b=$('collectionGrid').querySelector('[data-confirm-character]');if(b)b.onclick=()=>{const id=b.dataset.confirmCharacter;if(!owned(id))return;const accepted=onEquip({characterId:id});if(accepted===false)return;if(options.battle)closeCollection();else{data.equippedCharacterId=id;paint();}};
 }
 collectionRefresh=paint;$('collectionPanel').hidden=false;paint();$('closeCollection').focus({preventScroll:true});
}
root.addEventListener('arcline-language',()=>{if(!$('collectionPanel').hidden)collectionRefresh?.();});
function closeCollection(){$('collectionPanel').hidden=true;if(returnTo?.isConnected&&!returnTo.closest('[hidden]'))returnTo.focus({preventScroll:true});returnTo=null;}
document.addEventListener('keydown',e=>{if($('collectionPanel').hidden)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeCollection();}if(e.key==='Tab'){const all=[...$('collectionPanel').querySelectorAll('button:not(:disabled),summary')].filter(e=>e.getClientRects().length&&!e.closest('[inert]')),i=all.indexOf(document.activeElement);if(e.shiftKey&&i<=0||!e.shiftKey&&i===all.length-1){e.preventDefault();all[e.shiftKey?all.length-1:0]?.focus();}}},true);
function closeWeapons(){$('weaponPicker').hidden=true;($('battle').hidden?$('openCollection'):$('weaponToggle')).focus({preventScroll:true});}
function showWeapons(choices,current,onSelect,options={}){
 $('weaponPickerTitle').textContent=options.title||'Choose weapon';document.querySelector('.weapon-picker-note').textContent=options.note||'Weapons and skills carry until the chapter boss.';$('openLibrary').hidden=!options.library;
 $('chapterSkillStock').hidden=!options.library||!Object.keys(options.skills||{}).length;$('chapterSkillStock').innerHTML=Object.entries(options.skills||{}).map(([id,n])=>`<span>${escape(root.ArcSkills.get(id)?.name||id)}</span> ×${n}`).join(' · ');
 let category=null;$('weaponChoices').innerHTML=choices.map(choice=>{const heading=options.grouped&&choice.category!==category?`<h3 class="weapon-group-heading">${choice.category==='machine'?'Machine weapons':'Picked auxiliary'}</h3>`:'';category=choice.category;const w=choice.weapon||W.get(choice.id),selected=choice.id===current,empty=!!choice.disabled||choice.ammo<=0,stock=choice.id==='W01'?'Unlimited':`${choice.ammo} ${choice.ammo===1?'shot':'shots'}`,source=choice.id==='W01'?'Always available':choice.source||'Carried until boss';return heading+`<button type="button" data-choose-weapon="${choice.id}" class="${selected?'selected ':''}${empty?'empty':''}" ${empty?'disabled':''} aria-pressed="${selected}" aria-label="${escape(w.name)}, ${stock}, ${empty?'empty':selected?'selected':source}" style="--weapon-color:${w.appearance.color}"><i aria-hidden="true">${w.appearance.glyph}</i><span class="weapon-choice-copy"><strong>${escape(w.name)}</strong><small>${source}</small></span><span class="weapon-choice-stock"><span>${stock}</span><small>${empty?'Empty':selected?'Selected':'Select'}</small></span></button>`;}).join('');
 $('weaponChoices').querySelectorAll('[data-choose-weapon]').forEach(button=>button.onclick=()=>{if(button.disabled)return;closeWeapons();onSelect(button.dataset.chooseWeapon);});$('closeWeapons').onclick=closeWeapons;$('weaponPicker').hidden=false;$('weaponPicker').querySelector('.weapon-panel').scrollTop=0;const selected=$('weaponChoices').querySelector('.selected:not(:disabled)')||$('weaponChoices').querySelector('button:not(:disabled)');selected?.focus({preventScroll:true});if(selected&&options.grouped&&selected.dataset.chooseWeapon!=='W01'&&!W.get(selected.dataset.chooseWeapon).special)selected.scrollIntoView({block:'nearest'});
}
root.ArcPresentation={syncLobby,renderJourney,showCollection,closeCollection,showWeapons,closeWeapons};
})(globalThis);
