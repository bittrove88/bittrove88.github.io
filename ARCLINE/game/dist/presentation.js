(function(root){'use strict';
const $=id=>document.getElementById(id),E=root.ArcEngine,W=root.ArcWeapons,A=root.ArcCharacters,C=E.combat,Crew=root.ArcCrew;
const language=()=>root.ArcI18n.language,local=(ja,en)=>language()==='en'?en:ja;
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const missing=()=>[];
function themeName(index){return language()==='en'?E.biomes[index].name:E.levels[index*5].themeName;}
function syncLobby(data,selectedMap,context){
 const spec=E.levels[selectedMap],c=A.get(data.equippedCharacterId),stock=context?.entry.inventory||{weapons:{},skills:{}};
 $('arenaTag').textContent=local('第'+(Math.floor(selectedMap/10)+1)+'章 · '+themeName(spec.theme),'CHAPTER '+(Math.floor(selectedMap/10)+1)+' · '+themeName(spec.theme));
 $('arenaTitle').textContent=root.ArcStory.stageName(spec,language(),false,data.cleared);
 $('stageCaption').textContent=language()==='en'?spec.tacticalGoalEn:spec.tacticalGoal;
 $('progressText').textContent=local(data.cleared+' / 100 面クリア',''+data.cleared+' / 100 CLEARED');
 $('themeProgress').innerHTML=Array.from({length:5},(_,i)=>`<i class="${spec.theme*5+i<data.cleared?'cleared ':''}${i===(selectedMap%5)?'current':''}"></i>`).join('');
 $('play').textContent=local('ステージ'+spec.id+'を開始','Start stage '+spec.id);
 $('equippedCharacterName').textContent=language()==='en'?c.name:c.nameJa;
 $('lobbyRover').innerHTML=A.markup(c.id,'hero-character');A.paintAll($('lobbyRover'));
 $('equippedWeapon').textContent=local('武器 '+Object.keys(stock.weapons).length+' · スキル '+Object.keys(stock.skills).length,'Weapons '+Object.keys(stock.weapons).length+' · Skills '+Object.keys(stock.skills).length);
 $('collectionCount').textContent=data.unlockedCharacterIds.length+'/10';
 $('openCollection').setAttribute('aria-label',local('章の持ち物と武器一覧','Chapter inventory and weapon records'));
 $('openCharacters').setAttribute('aria-label',local('仲間を選ぶ。現在 '+c.nameJa,'Choose a companion. Current '+c.name));
 $('chooseLevel').textContent=local('ステージを選ぶ','Stages');
}
function miniature(spec){
 let paths=spec.floors.map(f=>`<polyline points="${f.map(([x,h])=>x+','+(52-h)).join(' ')}" fill="none" stroke="currentColor" stroke-width="2"/>`).join('');
 for(const component of spec.components||[])paths+=`<polygon points="${component.poly.map(([x,h])=>x+','+(52-h)).join(' ')}" fill="${component.destructible?'#9f806c':'#637d8b'}" stroke="#c4d2cd" stroke-width=".8"/>`;
 for(const {type,v,sizeFactor=1,openAngleDeg=75,defaultPose} of spec.features){
  if(type==='W')for(const floor of spec.floors)for(let i=1;i<floor.length;i++){const [ax,ah]=floor[i-1],[bx,bh]=floor[i],x1=Math.max(ax,v[0]),x2=Math.min(bx,v[1]);if(x2<=x1||bx===ax)continue;const h=x=>ah+(bh-ah)*(x-ax)/(bx-ax);paths+=`<path d="M${x1},${52-h(x1)}L${x2},${52-h(x2)}" stroke="#bcf9f2" stroke-width="3.5"/>`;}
  if(type==='K'){const a=v[2]*Math.PI/180,dx=Math.cos(a)*5.5*sizeFactor,dy=Math.sin(a)*5.5*sizeFactor;paths+=`<path d="M${v[0]-dx},${52-v[1]-dy}L${v[0]+dx},${52-v[1]+dy}" stroke="#abfff2" stroke-width="2.5"/>`;}
  if(type==='S')paths+=`<rect x="${v[0]}" y="${52-v[3]}" width="${v[1]-v[0]}" height="${v[3]-v[2]}" fill="#739b9b" stroke="#d4e6db" stroke-width=".8"/>`;
  if(type==='R')paths+=`<rect x="${v[0]}" y="${50-v[2]}" width="${v[1]-v[0]}" height="2" fill="#a6bcb7"/>`;
  if(type==='B'){const a=((v[3]+(defaultPose==='lowered'?1:0))%2?openAngleDeg:v[4]||0)*Math.PI/180;paths+=`<path d="M${v[0]},${52-v[1]}l${Math.cos(a)*v[2]},${-Math.sin(a)*v[2]}" stroke="#d4bfe4" stroke-width="2.2"/>`;}
 }
 return `<svg viewBox="0 -8 ${(spec.worldWidth||1000)/10} 63" aria-hidden="true">${paths}</svg>`;
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
  const tab=$('journeyAreas').querySelector('[aria-selected="true"]');if(tab){const strip=$('journeyAreas'),app=$('app'),r=root.ArcViewport.rect(tab,app),box=root.ArcViewport.rect(strip,app);strip.scrollLeft=Math.max(0,Math.min(strip.scrollWidth-strip.clientWidth,strip.scrollLeft+(r.left+r.right-box.left-box.right)/2));}if(focus)tab?.focus({preventScroll:true});
 }
 $('levelPicker').hidden=false;paint();$('closeLevels').focus({preventScroll:true});
}

function itemInfo(id,kind='weapons'){
 const skill=kind==='skills',row=skill?root.ArcSkills.get(id):W.get(id),catalog=root.ArcBattleCatalog;
 return {name:skill?(language()==='en'?row?.name:row?.nameJa)||root.ArcI18n.t(id):(language()==='en'?catalog.weaponNames[id]?.en:catalog.weaponNames[id]?.ja)||(language()==='en'?row.name:row.nameJa),note:skill?(language()==='en'?row?.note:row?.noteJa)||(language()==='en'?catalog.skillRows[id]?.shortEn:catalog.skillRows[id]?.shortJa)||'':(language()==='en'?catalog.weaponNotesEn[id]:catalog.weaponNotes[id])||local('残数制限のない基本の弾。','Standard fire with unlimited ammunition.'),icon:skill?root.ArcSkills.markup(id):W.iconMarkup(id)};
}
function stockLabel(id,kind,inventory){const count=inventory?.[kind]?.[id]||0;return id==='W01'?local('いつでも使用可能 · ∞','Always available · ∞'):local('保有 '+count+(kind==='skills'?'回':'発'),'In stock: '+count+(kind==='skills'?' uses':' shots'));}
let collectionView='characters',collectionRefresh=null;
function showCollection(data,onEquip,initialView='characters',options={}){
 collectionView=['weapons','skills'].includes(initialView)?initialView:'characters';let inspected=data.equippedCharacterId,recordWeapon='W01',recordSkill=root.ArcSkills.activeIds[0];
 const owned=id=>Crew.owned(data,id);
 function paint(){
  document.querySelector('#collectionPanel header strong').textContent=collectionView==='characters'?local('仲間と持ち物','Companions and inventory'):local('武器・スキル図鑑','Weapons and skills');
  let body=`<div class="collection-tabs" role="tablist"><button data-collection-tab="characters" role="tab" aria-selected="${collectionView==='characters'}">${local('仲間','Companions')} ${data.unlockedCharacterIds.length}/10</button><button data-collection-tab="weapons" role="tab" aria-selected="${collectionView==='weapons'}">${local('武器一覧','Weapon records')}</button><button data-collection-tab="skills" role="tab" aria-selected="${collectionView==='skills'}">${local('スキル一覧','Skill records')}</button></div>`;
  if(collectionView==='characters'){
   const m=A.get(inspected),p=C.get(inspected),r=Crew.get(inspected),selected=data.equippedCharacterId===inspected;
   body+=`<div class="machine-roster"><div class="machine-buttons" role="group" aria-label="${local('10機の仲間','Ten machines')}">${Crew.rows.map(r=>root.ArcCharacterHero.tile(r.id,data,inspected,language())).join('')}</div><section class="machine-profile" aria-label="${m.name}">${root.ArcCharacterHero.markup(m.id,{data,lang:language(),description:root.ArcStory.pick(r.desire,language())})}</section></div>`;
  }else {
   const kind=collectionView,skill=kind==='skills',inventory=options.inventory||data.campaignInventory||{weapons:{},skills:{}},ids=skill?[...root.ArcSkills.activeIds,...Object.keys(inventory.skills||{}).filter(id=>!root.ArcSkills.activeIds.includes(id))]:['W01',...W.activeIds,...Object.keys(inventory.weapons||{}).filter(id=>!W.activeIds.includes(id)&&id!=='W01')],selected=skill?recordSkill:recordWeapon,info=itemInfo(selected,kind);
   body+=`<div class="equipment-records" data-story-raw><p class="inventory-note">${local('カードを選ぶと効果を確認できます。閲覧では持ち物を消費しません。','Select a card to inspect its effect. Browsing never uses stock.')}</p><div class="equipment-grid" role="group" aria-label="${local('一覧','Catalog')}">${ids.map(id=>{const i=itemInfo(id,kind);return `<button type="button" data-item-record="${id}" class="equipment-card" aria-pressed="${id===selected}"><i aria-hidden="true">${i.icon}</i><strong>${escape(i.name)}</strong><small>${escape(stockLabel(id,kind,inventory))}</small><span>${escape(i.note)}</span></button>`;}).join('')}</div><section class="equipment-inspector" aria-live="polite"><strong>${escape(info.name)}</strong><p>${escape(info.note)}</p><small>${escape(stockLabel(selected,kind,inventory))}</small></section></div>`;
  }
  $('collectionGrid').innerHTML=body;A.paintAll($('collectionGrid'));root.ArcCharacterHero.hydrate($('collectionGrid'));
  for(const b of $('collectionGrid').querySelectorAll('[data-inspect-character]'))b.onclick=()=>{inspected=b.dataset.inspectCharacter;paint();$('collectionGrid').querySelector(`[data-inspect-character="${inspected}"]`).focus({preventScroll:true});};
  for(const b of $('collectionGrid').querySelectorAll('[data-item-record]'))b.onclick=()=>{const grid=$('collectionGrid').querySelector('.equipment-grid'),scroll=grid.scrollTop,id=b.dataset.itemRecord;if(collectionView==='skills')recordSkill=id;else recordWeapon=id;paint();$('collectionGrid').querySelector('.equipment-grid').scrollTop=scroll;$('collectionGrid').querySelector(`[data-item-record="${id}"]`).focus({preventScroll:true});};
  const tabs=[...$('collectionGrid').querySelectorAll('[data-collection-tab]')];for(const b of tabs){const selected=b.dataset.collectionTab===collectionView;b.tabIndex=selected?0:-1;b.onclick=()=>{collectionView=b.dataset.collectionTab;paint();$('collectionGrid').querySelector(`[data-collection-tab="${collectionView}"]`).focus({preventScroll:true});};b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();tabs[e.key==='Home'?0:e.key==='End'?tabs.length-1:(tabs.indexOf(b)+(e.key==='ArrowLeft'?-1:1)+tabs.length)%tabs.length].click();};}
  const b=$('collectionGrid').querySelector('[data-confirm-character]');if(b&&root.ArcCrewUsage?.blocked(data,inspected)){b.disabled=true;b.textContent=local('補充あと'+root.ArcCrewUsage.remaining(data,inspected)+'面','Resupply: '+root.ArcCrewUsage.remaining(data,inspected)+' stages');}if(b)b.onclick=()=>{const id=b.dataset.confirmCharacter;if(!owned(id))return;const accepted=onEquip({characterId:id});if(accepted===false)return;data.equippedCharacterId=id;paint();};
 }
 collectionRefresh=paint;root.ArcScreens.open('collectionPanel',{trigger:options.trigger,block:['lobby','battle'],cycleFocus:true,onEscape:()=>closeCollection()});paint();$('closeCollection').focus({preventScroll:true});
}
root.addEventListener('arcline-language',()=>{if(!$('collectionPanel').hidden)collectionRefresh?.();if(!$('weaponPicker').hidden)weaponRefresh?.();});
function closeCollection(){root.ArcScreens.close('collectionPanel');}
let weaponRefresh=null;
function closeWeapons(){root.ArcScreens.close('weaponPicker');}
function showWeapons(choices,current,onSelect,options={}){
 const library=!!options.library,skills=Object.entries(options.skills||{}).filter(([,n])=>n>0),aux=choices.filter(c=>c.id!=='W01'&&!((c.weapon||W.get(c.id)).special)&&c.ammo>0),total=aux.reduce((n,c)=>n+c.ammo,0),skillTotal=skills.reduce((n,[,count])=>n+count,0),scroller=$('weaponStockScroll'),positions={weapons:0,skills:0};let tab='weapons',inspected=null;
 $('weaponStockInspector')?.remove();
 $('weaponPickerTitle').textContent=library?local('武器・スキルの確認','Inspect weapons and skills'):options.title||'Choose weapon';document.querySelector('.weapon-picker-note').textContent=options.note||'Unused ammunition and skills carry across chapters. Each map capsule can be claimed once per difficulty.';
 $('weaponPicker').dataset.stockLibrary=String(library);$('weaponChoices').setAttribute('role',library?'tabpanel':'group');$('weaponChoices').setAttribute('aria-labelledby',library?'inventoryWeaponsTab':'weaponPickerTitle');$('inventoryTabs').hidden=!library;$('openLibrary').hidden=!library;
 const refresh=()=>{
  $('weaponInventorySummary').textContent=library?local(`武器${aux.length}種類・${total}発 / スキル${skills.length}種類・${skillTotal}回`,`${aux.length} weapon types · ${total} shots / ${skills.length} skill types · ${skillTotal} uses`):local(`補助武器${aux.length}種類・残数${total}発`,`${aux.length} auxiliary types · ${total} shots`);
  $('inventoryWeaponsTab').textContent=local('武器','Weapons')+' '+aux.length;$('inventorySkillsTab').textContent=local('スキル','Skills')+' '+skills.length;
  $('weaponPickerTitle').textContent=library?local('武器・スキルの確認','Inspect weapons and skills'):options.title||'Choose weapon';
  $('openLibrary').textContent=local('武器・スキル図鑑を開く','Open weapons and skills catalog');
  for(const card of $('weaponChoices').querySelectorAll('[data-choose-weapon]')){const i=itemInfo(card.dataset.chooseWeapon);card.querySelector('strong').textContent=i.name;card.querySelector('.weapon-choice-copy small').textContent=i.note;card.setAttribute('aria-label',i.name+', '+stockLabel(card.dataset.chooseWeapon,'weapons',{weapons:Object.fromEntries(choices.map(c=>[c.id,c.ammo]))}));}
  $('chapterSkillStock').innerHTML=skills.length?skills.map(([id,n])=>{const info=root.ArcSkills.get(id);return `<button type="button" class="inventory-skill${info?.rare?' rare':''}" data-stock-skill="${id}"><i aria-hidden="true">${root.ArcSkills.markup(id)}</i><div><strong>${escape(itemInfo(id,'skills').name)}</strong><small>${escape(itemInfo(id,'skills').note)}</small></div><b class="inventory-count">×${n}</b></button>`;}).join(''):`<p class="stock-empty">${local('保有スキルはありません。マップのカプセルから入手できます。','No skills in stock. Collect capsules on the map.')}</p>`;
 };
 weaponRefresh=()=>{refresh();bindSkillInspection();paintInspector();};
 let category=null;$('weaponChoices').innerHTML=choices.map(choice=>{const heading=options.grouped&&choice.category!==category?`<h3 class="weapon-group-heading">${choice.category==='machine'?'Machine weapons':'Picked auxiliary'}</h3>`:'';category=choice.category;const w=choice.weapon||W.get(choice.id),selected=choice.id===current,empty=!!choice.disabled||choice.ammo<=0,stock=choice.id==='W01'?'Unlimited':`${choice.ammo} ${choice.ammo===1?'shot':'shots'}`,source=choice.id==='W01'?'Always available':choice.source||'Carries across chapters';return heading+`<button type="button" data-choose-weapon="${choice.id}" class="${selected?'selected ':''}${empty?'empty':''}" ${empty?'disabled':''} aria-pressed="${selected}" aria-label="${escape(w.name)}, ${stock}, ${empty?'empty':selected?'selected':source}" style="--weapon-color:${w.appearance.color}"><i aria-hidden="true">${W.iconMarkup(choice.id)}</i><span class="weapon-choice-copy"><strong>${escape(itemInfo(choice.id).name)}</strong><small>${escape(library?itemInfo(choice.id).note:source)}</small></span><span class="weapon-choice-stock"><span>${stock}</span><small>${empty?'Empty':selected?'Selected':'Select'}</small></span></button>`;}).join('');
 const switchTab=(next,focus=false)=>{positions[tab]=scroller.scrollTop;tab=next;document.querySelector('.weapon-picker-note').hidden=library&&tab==='skills';$('weaponChoices').hidden=tab!=='weapons';$('chapterSkillStock').hidden=tab!=='skills';$('openLibrary').hidden=!library;for(const name of ['weapons','skills']){const b=$(name==='weapons'?'inventoryWeaponsTab':'inventorySkillsTab'),active=name===tab;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;if(active&&focus)b.focus({preventScroll:true});}scroller.scrollTop=positions[tab];inspected=null;paintInspector();};
 for(const name of ['weapons','skills']){const b=$(name==='weapons'?'inventoryWeaponsTab':'inventorySkillsTab');b.onclick=()=>switchTab(name);b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();switchTab(e.key==='Home'?'weapons':e.key==='End'?'skills':tab==='weapons'?'skills':'weapons',true);};}
 let inspector=null;
 function paintInspector(){
  if(!library||!inspector)return;
  const info=inspected&&itemInfo(inspected,tab);
  inspector.innerHTML=inspected?`<div><strong>${escape(info.name)}</strong><p>${escape(info.note)}</p><small>${tab==='skills'?local('ここでは確認のみ。戦闘中に使用できます。','Inspect here; use skills during battle.'):stockLabel(inspected,tab,{weapons:Object.fromEntries(choices.map(c=>[c.id,c.ammo]))})}</small></div>${tab==='weapons'?`<button type="button" id="confirmStockWeapon">${inspected===current?local('装備中','Equipped'):local('この武器を装備','Equip this weapon')}</button>`:''}`:`<p>${local('カードを選んで効果を確認。持ち物は消費しません。','Select a card to inspect. No stock is consumed.')}</p>`;
  if($('confirmStockWeapon')){$('confirmStockWeapon').disabled=inspected===current;$('confirmStockWeapon').onclick=()=>{const id=inspected;closeWeapons();onSelect(id);};}
  for(const card of $('chapterSkillStock').querySelectorAll('[data-stock-skill]'))card.setAttribute('aria-pressed',String(card.dataset.stockSkill===inspected));
  for(const card of $('weaponChoices').querySelectorAll('[data-choose-weapon]'))card.dataset.inspected=String(card.dataset.chooseWeapon===inspected);
 }
 function bindSkillInspection(){for(const card of $('chapterSkillStock').querySelectorAll('[data-stock-skill]'))card.onclick=()=>{inspected=card.dataset.stockSkill;paintInspector();};}
 if(library){inspector=document.createElement('section');inspector.id='weaponStockInspector';inspector.className='stock-inspector';inspector.dataset.storyRaw='';inspector.setAttribute('aria-live','polite');$('weaponStockScroll').before(inspector);}
 refresh();bindSkillInspection();switchTab('weapons');
 $('weaponChoices').querySelectorAll('[data-choose-weapon]').forEach(button=>button.onclick=()=>{if(button.disabled)return;if(library){inspected=button.dataset.chooseWeapon;paintInspector();return;}closeWeapons();onSelect(button.dataset.chooseWeapon);});$('closeWeapons').onclick=closeWeapons;root.ArcScreens.open('weaponPicker',{trigger:library?$('openCollection'):$('weaponToggle'),block:['lobby','battle'],cycleFocus:true,onEscape:closeWeapons});scroller.scrollTop=0;const selected=$('weaponChoices').querySelector('.selected:not(:disabled)')||$('weaponChoices').querySelector('button:not(:disabled)');selected?.focus({preventScroll:true});if(selected&&options.grouped&&selected.dataset.chooseWeapon!=='W01'&&!W.get(selected.dataset.chooseWeapon).special)selected.scrollIntoView({block:'nearest'});
}
root.ArcPresentation={itemInfo,syncLobby,renderJourney,showCollection,closeCollection,showWeapons,closeWeapons};
})(globalThis);
