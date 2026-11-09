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
 $('equippedWeapon').textContent=local('持ち物・図鑑','Inventory & catalogs');
 $('collectionCount').textContent=data.unlockedCharacterIds.length+'/10';
 $('openCollection').setAttribute('aria-label',local('持ち物・図鑑。保有武器とスキルを確認','Inventory and catalogs. Inspect owned weapons and skills'));
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
function equipmentStock(id,kind,inventory){
 const unlimited=id==='W01',count=unlimited?Infinity:inventory?.[kind]?.[id]||0;
 return {value:unlimited?'∞':String(count),unit:unlimited?local('無制限','Unlimited'):kind==='skills'?local('回','uses'):local('発','shots'),label:stockLabel(id,kind,inventory),empty:!unlimited&&count===0};
}
function equipmentKind(id,kind){return kind==='weapons'?local('武器','Weapon'):root.ArcSkills.get(id)?.rare?local('レアスキル','Rare skill'):local('スキル','Skill');}
function equipmentCard(id,kind,inventory,attribute,selected){
 const info=itemInfo(id,kind),stock=equipmentStock(id,kind,inventory),compat=attribute==='data-item-record'?' equipment-card':kind==='skills'?' inventory-skill':'';
 return `<button type="button" class="equipment-item${compat}" ${attribute}="${id}" data-equipment-id="${id}" data-equipment-kind="${kind}" data-story-raw aria-pressed="${selected}" aria-label="${escape(info.name+', '+stock.label)}"><i class="equipment-item-icon" aria-hidden="true">${info.icon}<span class="equipment-item-status" aria-hidden="true">${selected?'✓':''}</span></i><strong class="equipment-item-name">${escape(info.name)}</strong><span class="equipment-item-stock${id==='W01'?' is-unlimited':''}${stock.empty?' is-empty':''}"><b>${stock.value}</b><small>${stock.unit}</small></span></button>`;
}
function equipmentDetail(id,kind,inventory){
 if(!id)return `<div class="equipment-detail-empty"><strong>${local('カードを選んで確認','Select a card to inspect')}</strong><p>${local('一覧から武器やスキルを選ぶと、効果を確認できます。','Choose a weapon or skill to see its effect.')}</p></div>`;
 const info=itemInfo(id,kind),stock=equipmentStock(id,kind,inventory);
 return `<div class="equipment-detail-heading"><div><small>${equipmentKind(id,kind)}</small><strong>${escape(info.name)}</strong></div></div><div class="equipment-detail-effect"><h3>${local('効果','Effect')}</h3><p>${escape(info.note)}</p></div>${stock.empty?`<p class="equipment-detail-note">${local('未保有です。マップのカプセルから入手できます。','Not in stock. Collect capsules on the map.')}</p>`:''}`;
}
// Companion-screen introductions: personality and purpose, separate from exact ability data.
const companionIntroductions={
 gun:{ja:'重い一撃で道を開く、頼もしい重装の仲間。港の作業路を直し、荷物が行き交う音を取り戻すために進む。',en:'A dependable heavyweight who opens the way with two powerful blasts. Gun wants to repair the port roads and hear cargo moving again.'},
 hana:{ja:'道標を直し、次の旅人を迷わせないやさしい仲間。連華砲の九連射にも、誰かを思う気づかいにも手を抜かない。',en:'A gentle companion who repairs signposts for the next traveller. Nine-round Flower Salvo brings the same care to a full volley as a helping hand.'},
 koro:{ja:'止まった荷物も、待っている想いも届けたい六輪の運び手。地面を転がる爆走砲とともに、道の先を目指す。',en:'A six-wheeled courier determined to deliver every stranded package. Rolling Blast Cannon travels along the ground; Koro keeps looking for the road ahead.'},
 ban:{ja:'閉ざされた道を開き、役に立ちたい突破役。衝撃砲の三段の波に、みんなが進める道をつくる願いを込める。',en:'A pathfinder who wants to put a powerful frame to good use. Three forward shockwaves carry a wish to open a road everyone can share.'},
 sora:{ja:'帰る誰かのため、遠くの誘導灯をともしたい仲間。空から十二発の流星を降らせ、見上げた先に希望を探す。',en:'Sora hopes to relight the distant beacons that guide travellers home. Twelve falling stars answer that hope with a Meteor Cannon strike from above.'},
 rico:{ja:'行き止まりにも、まだ先があると信じる冒険家。跳ねるほど強くなる跳弾砲で、思いがけない道を切り拓く。',en:'An explorer who sees possibility in every dead end. Ricochet Cannon grows stronger with each bounce, rewarding a shot that takes the unexpected route.'},
 hibari:{ja:'遠くから届く古い呼出信号を追う偵察役。二枚の光輪を広げ、まだ見ぬ送り主とのつながりを探している。',en:'A curious scout following an old call from far away. Two expanding rings echo the search for a connection with a sender still waiting.'},
 mogu:{ja:'壊すべきものと、残すべき支えを見分けたい解体の職人。前へ進む三段爆発で、みんなが通れる道をつくる。',en:'A demolition craftsperson who knows some supports are worth keeping. Three advancing blasts help Mogu build a road for everyone who follows.'},
 rin:{ja:'待つ誰かへ、止めた予報を届け直したい狙撃手。一点へ束ねる収束砲のように、静かな狙いに想いを込める。',en:'A marksman hoping to resume the forecasts someone still awaits. Focus Cannon gathers spreading rounds into one piercing shot, giving a quiet aim purpose.'},
 yui:{ja:'途切れた記録をたどり、助けを頼めるつながりを取り戻したい支え役。相手を引き寄せる重力砲で、仲間の前進を支える。',en:'A supporter restoring a network where help can be asked for. Gravity Cannon draws opponents inward, turning the power to connect toward the journey ahead.'}
};
function decorateCompanions(container,data,character){
 for(const card of container.querySelectorAll('[data-inspect-character]')){
  const id=card.dataset.inspectCharacter,special=root.ArcI18n.t(C.get(id).special.name),label=card.querySelector('small'),lock=label.querySelector('svg');
  label.textContent=special;label.className='companion-special';card.querySelector('.roster-role')?.remove();card.setAttribute('aria-label',card.getAttribute('aria-label')+' · '+special);
  if(lock){lock.classList.add('companion-lock');card.append(lock);}
  if(id===data.equippedCharacterId){const marker=document.createElement('span');marker.className='companion-current-marker';marker.textContent='✓';marker.setAttribute('aria-hidden','true');card.append(marker);}
 }
 const profile=container.querySelector('.machine-profile'),machine=A.get(character),copy=profile.querySelector('.ch-copy-body');
 profile.querySelector('.ch-name').textContent=local(machine.nameJa,machine.name);profile.querySelector('.ch-name-ja')?.remove();profile.querySelector('.ch-motto')?.remove();
 copy.insertBefore(copy.querySelector('.ch-description'),copy.querySelector('.ch-facts'));
}
let collectionRefresh=null;
function showCollection(data,onEquip,initialView='characters',options={}){
 let view=['weapons','skills'].includes(initialView)?initialView:'characters',scope=options.scope==='owned'?'owned':'all',character=data.equippedCharacterId;
 const inventory=options.inventory||data.campaignInventory||{weapons:{},skills:{}},positions={},expanded={};
 const ids=(kind,filter=scope)=>{
  const held=Object.keys(inventory[kind]||{}).filter(id=>inventory[kind][id]>0);
  return kind==='weapons'?['W01',...(filter==='owned'?held:[...W.activeIds,...held.filter(id=>!W.activeIds.includes(id))])].filter((id,i,all)=>all.indexOf(id)===i):filter==='owned'?held:[...root.ArcSkills.activeIds,...held.filter(id=>!root.ArcSkills.activeIds.includes(id))];
 };
 const selected={weapons:{owned:'W01',all:'W01'},skills:{owned:ids('skills','owned')[0]||null,all:ids('skills','all')[0]||null}};
 const pane=$('collectionGrid'),panel=$('collectionPanel'),key=()=>view==='characters'?view:view+':'+scope;
 function remember(){
  const previous=pane.dataset.collectionState;if(!previous)return;
  positions[previous]=[...pane.querySelectorAll('[data-collection-scroll]')].map(e=>e.scrollTop);
  const abilities=pane.querySelector('.ch-abilities');if(abilities)expanded[pane.querySelector('[data-machine]').dataset.machine]=abilities.open;
 }
 function focus(selector){panel.querySelector(selector)?.focus({preventScroll:true});}
 function switchView(next,nextScope=scope,keepItem=false){
  const current=view!=='characters'?selected[view][scope]:null;
  remember();view=next;scope=nextScope;
  if(keepItem&&current&&ids(view).includes(current))selected[view][scope]=current;
  paint();
  if(keepItem)pane.querySelector('[data-equipment-id="'+selected[view][scope]+'"]')?.scrollIntoView({block:'nearest'});
 }
 function bindTabs(selector,activate){
  const tabs=[...panel.querySelectorAll(selector)];for(const b of tabs){b.tabIndex=b.getAttribute('aria-selected')==='true'?0:-1;b.onclick=()=>activate(b);b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();tabs[e.key==='Home'?0:e.key==='End'?tabs.length-1:(tabs.indexOf(b)+(e.key==='ArrowLeft'?-1:1)+tabs.length)%tabs.length].click();};}
 }
 function paint(){
  panel.dataset.equipmentCatalog=String(view!=='characters');panel.dataset.collectionView=view;panel.dataset.collectionScope=scope;
  $('collectionTitle').textContent=local('仲間・持ち物','Companions & inventory');$('closeCollection').textContent=local('ホームへ ×','Home ×');$('closeCollection').setAttribute('aria-label',local('ホームへ戻る','Return home'));
  $('collectionNav').setAttribute('aria-label',local('確認する項目','Browse category'));
  $('collectionNav').innerHTML=['characters','weapons','skills'].map(kind=>`<button id="collectionTab-${kind}" data-collection-tab="${kind}" role="tab" aria-controls="collectionContent" aria-selected="${view===kind}">${kind==='characters'?local('仲間','Companions')+' '+data.unlockedCharacterIds.length+'/10':kind==='weapons'?local('武器','Weapons'):local('スキル','Skills')}</button>`).join('');
  let body='';
  const heading=local(view==='characters'?'仲間':view==='weapons'?'武器':'スキル',view==='characters'?'Companions':view==='weapons'?'Weapons':'Skills');
  if(view==='characters'){
   body+=`<div id="collectionContent" role="tabpanel" aria-labelledby="collectionTab-characters" class="machine-roster"><div class="machine-buttons" role="group" aria-label="${local('仲間の一覧。選ぶと詳細を表示','Companions. Select to inspect')}" data-collection-scroll>${Crew.rows.map(r=>root.ArcCharacterHero.tile(r.id,data,character,language())).join('')}</div><section class="machine-profile" aria-label="${escape(heading)}">${root.ArcCharacterHero.markup(character,{data,lang:language(),description:companionIntroductions[character][language()==='en'?'en':'ja']})}</section></div>`;
  }else{
   const list=ids(view),id=selected[view][scope]=list.includes(selected[view][scope])?selected[view][scope]:list[0]||null,skill=view==='skills',attribute=scope==='all'?'data-item-record':skill?'data-stock-skill':'data-choose-weapon';
   body+=`<div class="collection-scope" role="tablist" aria-label="${escape(heading+' '+local('表示範囲','scope'))}" data-story-raw><button id="collectionOwned" data-collection-scope="owned" role="tab" aria-controls="collectionEquipment" aria-selected="${scope==='owned'}">${local(skill?'保有スキル':'保有武器',skill?'Owned skills':'Owned weapons')} <span>${ids(view,'owned').length}</span></button><button id="collectionCatalog" data-collection-scope="all" role="tab" aria-controls="collectionEquipment" aria-selected="${scope==='all'}">${local(skill?'スキル図鑑':'武器図鑑',skill?'Skill catalog':'Weapon catalog')} <span>${ids(view,'all').length}</span></button></div><div id="collectionContent" role="tabpanel" aria-labelledby="collectionTab-${view}" class="collection-equipment-content"><div id="collectionEquipment" class="equipment-records" role="tabpanel" aria-labelledby="${scope==='owned'?'collectionOwned':'collectionCatalog'}" data-story-raw><div class="equipment-grid" role="group" aria-label="${escape(heading+' '+local('一覧','list'))}" data-collection-scroll>${list.length?list.map(id=>equipmentCard(id,view,inventory,attribute,id===selected[view][scope])).join(''):`<div class="stock-empty"><strong>${local('保有スキルはありません','No skills in stock')}</strong><p>${local('マップのカプセルから入手できます。図鑑ですべての効果を確認できます。','Collect capsules on the map. Explore every effect in the catalog.')}</p><button type="button" data-empty-catalog>${local('スキル図鑑を見る','Explore skill catalog')} →</button></div>`}</div><section class="equipment-inspector equipment-detail-panel" aria-live="polite" data-collection-scroll>${equipmentDetail(id,view,inventory)}</section></div></div>`;
  }
  pane.innerHTML=body;pane.dataset.collectionState=key();
  if(view==='characters'){
   decorateCompanions(pane,data,character);
   pane.querySelector('.ch-copy-body').dataset.collectionScroll='';const abilities=pane.querySelector('.ch-abilities');if(abilities)abilities.open=!!expanded[character];
   A.paintAll(pane);root.ArcCharacterHero.hydrate(pane);
  }
  [...pane.querySelectorAll('[data-collection-scroll]')].forEach((e,i)=>e.scrollTop=positions[key()]?.[i]||0);
  bindTabs('[data-collection-tab]',b=>{const next=b.dataset.collectionTab;switchView(next);focus('[data-collection-tab="'+next+'"]');});
  bindTabs('[data-collection-scope]',b=>{const next=b.dataset.collectionScope;switchView(view,next,true);focus('[data-collection-scope="'+next+'"]');});
  for(const b of pane.querySelectorAll('[data-equipment-id]'))b.onclick=()=>{
   selected[view][scope]=b.dataset.equipmentId;
   for(const card of pane.querySelectorAll('[data-equipment-id]')){const active=card===b;card.setAttribute('aria-pressed',String(active));card.querySelector('.equipment-item-status').textContent=active?'✓':'';}
   const detail=pane.querySelector('.equipment-inspector');detail.innerHTML=equipmentDetail(b.dataset.equipmentId,view,inventory);detail.scrollTop=0;
  };
  pane.querySelector('[data-empty-catalog]')?.addEventListener('click',()=>{switchView(view,'all');focus('#collectionCatalog');});
  for(const b of pane.querySelectorAll('[data-inspect-character]'))b.onclick=()=>{remember();character=b.dataset.inspectCharacter;if(positions.characters)positions.characters[1]=0;paint();focus('[data-inspect-character="'+character+'"]');};
  const confirm=pane.querySelector('[data-confirm-character]');
  if(confirm){
   if(root.ArcCrewUsage?.blocked(data,character)){confirm.disabled=true;confirm.textContent=local('補充あと'+root.ArcCrewUsage.remaining(data,character)+'面','Resupply: '+root.ArcCrewUsage.remaining(data,character)+' stages');}
   else if(!confirm.disabled)confirm.textContent=local('この仲間を選ぶ','Choose this companion');
   confirm.onclick=()=>{if(!Crew.owned(data,character)||root.ArcCrewUsage?.blocked(data,character))return;if(onEquip({characterId:character})===false)return;closeCollection();};
  }
 }
 collectionRefresh=()=>{const active=document.activeElement,selector=active?.dataset.equipmentId?'[data-equipment-id="'+active.dataset.equipmentId+'"]':active?.dataset.inspectCharacter?'[data-inspect-character="'+active.dataset.inspectCharacter+'"]':active?.id?'#'+active.id:null;remember();paint();if(selector)focus(selector);};
 root.ArcScreens.open('collectionPanel',{trigger:options.trigger,block:['lobby','battle'],cycleFocus:true,onEscape:closeCollection});pane.removeAttribute('data-collection-state');paint();focus('[data-collection-tab="'+view+'"]');
}
root.addEventListener('arcline-language',()=>{if(!$('collectionPanel').hidden)collectionRefresh?.();if(!$('weaponPicker').hidden)weaponRefresh?.();});
function closeCollection(){root.ArcScreens.close('collectionPanel');}
let weaponRefresh=null;
function closeWeapons(){root.ArcScreens.close('weaponPicker');}
function showWeapons(choices,current,onSelect,options={}){
 const aux=choices.filter(c=>c.id!=='W01'&&!((c.weapon||W.get(c.id)).special)&&c.ammo>0),total=aux.reduce((n,c)=>n+c.ammo,0),scroller=$('weaponStockScroll');
 $('weaponPicker').dataset.stockLibrary='false';
 $('weaponChoices').setAttribute('role','group');$('weaponChoices').setAttribute('aria-labelledby','weaponPickerTitle');
 let category=null;
 $('weaponChoices').innerHTML=choices.map(choice=>{const heading=options.grouped&&choice.category!==category?`<h3 class="weapon-group-heading">${choice.category==='machine'?'Machine weapons':'Picked auxiliary'}</h3>`:'';category=choice.category;const w=choice.weapon||W.get(choice.id),selected=choice.id===current,empty=!!choice.disabled||choice.ammo<=0,stock=choice.id==='W01'?'Unlimited':`${choice.ammo} ${choice.ammo===1?'shot':'shots'}`,source=choice.id==='W01'?'Always available':choice.source||'Carries across chapters';return heading+`<button type="button" data-choose-weapon="${choice.id}" class="${selected?'selected ':''}${empty?'empty':''}" ${empty?'disabled':''} aria-pressed="${selected}" aria-label="${escape(w.name)}, ${stock}, ${empty?'empty':selected?'selected':source}" style="--weapon-color:${w.appearance.color}"><i aria-hidden="true">${W.iconMarkup(choice.id)}</i><span class="weapon-choice-copy"><strong>${escape(itemInfo(choice.id).name)}</strong><small>${escape(source)}</small></span><span class="weapon-choice-stock"><span>${stock}</span><small>${empty?'Empty':selected?'Selected':'Select'}</small></span></button>`;}).join('');
 weaponRefresh=()=>{
  $('weaponPickerTitle').textContent=options.title||'Choose weapon';document.querySelector('.weapon-picker-note').textContent=options.note||'Unused ammunition and skills carry across chapters. Each map capsule can be claimed once per difficulty.';
  $('weaponInventorySummary').textContent=local(`補助武器${aux.length}種類・残数${total}発`,`${aux.length} auxiliary types · ${total} shots`);
  for(const card of $('weaponChoices').querySelectorAll('[data-choose-weapon]')){const i=itemInfo(card.dataset.chooseWeapon);card.querySelector('strong').textContent=i.name;card.querySelector('.weapon-choice-copy small').textContent=i.note;card.setAttribute('aria-label',i.name+', '+stockLabel(card.dataset.chooseWeapon,'weapons',{weapons:Object.fromEntries(choices.map(c=>[c.id,c.ammo]))}));}
 };
 weaponRefresh();
 for(const button of $('weaponChoices').querySelectorAll('[data-choose-weapon]'))button.onclick=()=>{if(button.disabled)return;closeWeapons();onSelect(button.dataset.chooseWeapon);};
 $('closeWeapons').onclick=closeWeapons;root.ArcScreens.open('weaponPicker',{trigger:$('weaponToggle'),block:['lobby','battle'],cycleFocus:true,onEscape:closeWeapons});scroller.scrollTop=0;const selected=$('weaponChoices').querySelector('.selected:not(:disabled)')||$('weaponChoices').querySelector('button:not(:disabled)');selected?.focus({preventScroll:true});if(selected&&options.grouped&&selected.dataset.chooseWeapon!=='W01'&&!W.get(selected.dataset.chooseWeapon).special)selected.scrollIntoView({block:'nearest'});
}
root.ArcPresentation={itemInfo,syncLobby,renderJourney,showCollection,closeCollection,showWeapons,closeWeapons};
})(globalThis);
