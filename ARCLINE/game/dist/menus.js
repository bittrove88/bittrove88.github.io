(function(root){
'use strict';
const $=id=>document.getElementById(id),J=root.ArcJournal,escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let hooks=null,active=null,tab='scenes',machine='gun',chapter=1,settingsTab='options',storyView='home',listPosition=0;
const touchBound=new WeakSet();
let touchActivation=null;
const touchPointers=new Set();let touchBatch=0;
function touchTap(button){
 if(touchBound.has(button))return;touchBound.add(button);let start=null;
 // Momentum scrolling can swallow the following compatibility click. Activate
 // a stationary touch on pointer-up; a real pan still receives pointercancel.
 button.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')start={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,batch:touchBatch,multiple:touchPointers.size>1};});
 button.addEventListener('pointermove',e=>{if(start?.id===e.pointerId&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>10)start.moved=true;});
 button.addEventListener('pointercancel',()=>{start=null;});
 button.addEventListener('pointerup',e=>{if(start?.id!==e.pointerId)return;const tap=start;start=null;const r=button.getBoundingClientRect();if(tap.moved||tap.multiple||tap.batch!==touchBatch||button.disabled||e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return;e.preventDefault();touchActivation={id:e.pointerId,x:e.clientX,y:e.clientY,time:performance.now()};button.click();});
}
const language=()=>root.ArcI18n.language,local=(ja,en)=>language()==='en'?en:ja,t=value=>J.pick(value,language());
function read(ids){if(J.markRead(hooks.data(),ids))hooks.persist();}
function prepare(id,trigger){
 if(!hooks.allowed())return false;
 for(const other of ['levelPicker','collectionPanel','weaponPicker','lobbySettings','journalPanel'])root.ArcScreens.close(other,false);
 hooks.clearInput();active=id;root.ArcScreens.open(id,{trigger,block:['lobby','battle'],cycleFocus:true,onEscape:()=>id==='journalPanel'&&storyView!=='home'?backStory():close()});$('app').dataset.utilityOpen=id;
 return true;
}
function close(focus=true){if(!active)return;root.ArcScreens.close(active,focus);active=null;delete $('app').dataset.utilityOpen;}
function renderSettings(){
 for(const [name,id] of Object.entries({options:'settingsOptions',difficulty:'settingsDifficulty',guide:'settingsGuide',data:'settingsData'}))$(id).hidden=settingsTab!==name;
 for(const b of document.querySelectorAll('[data-settings-tab]')){const selected=b.dataset.settingsTab===settingsTab;b.setAttribute('aria-selected',selected);b.tabIndex=selected?0:-1;}
 const sections={
  options:[local('プレイ環境','Play preferences'),local('言語・操作・表示','Language, controls, display'),local('遊びやすい環境に整える','Make yourself comfortable'),local('表示と言語、操作の左右配置を変更できます。','Choose your language, control layout and display.')],
  difficulty:[local('難易度','Difficulty'),local('射線と敵の狙い','Guides and enemy aim'),local('自分に合う難易度を選ぶ','Choose your difficulty'),local('変わるのは射線の長さと敵の狙い。各モードの進行は個別に保存されます。','Trajectory guides and enemy aim change. Each mode keeps its own progress.')],
  guide:[local('操作ガイド','How to play'),local('操作と道具を調べる','Controls and equipment'),local('知りたい操作を選ぶ','Find the help you need'),local('項目を開くと、基本操作や道具の使い方を確認できます。','Open a topic to read about controls and equipment.')],
  data:[local('セーブデータ','Save data'),local('保存状況・やり直し','Save status and reset'),local('進行状況を管理する','Manage your progress'),local('自動保存の状態を確認できます。最初からやり直す操作もここにあります。','Check your automatic save or start a new journey.')]
 };
 for(const button of document.querySelectorAll('[data-settings-tab]')){const row=sections[button.dataset.settingsTab];button.querySelector('strong').textContent=row[0];button.querySelector('small').textContent=row[1];}
 $('settingsSectionTitle').textContent=sections[settingsTab][2];$('settingsSectionDescription').textContent=sections[settingsTab][3];
 for(const [id,ja,en] of [['settingsLanguageNote','メニューと物語の表示言語','Language for menus and stories'],['settingsControlsTitle','操作配置','Control layout'],['settingsDisplayNote','画面を広く使ってプレイ','Use the full screen to play'],['settingsInstallTitle','ホーム画面に追加','Home-screen app'],['settingsInstallNote','アイコンからすぐに起動','Launch from your home screen'],['settingsSaveTitle','進行状況は自動保存','Your progress saves automatically'],['settingsSaveNote','クリア記録・仲間・持ち物は難易度ごとに保持されます。','Cleared stages, companions and stock are kept for each difficulty.'],['settingsDeleteTitle','セーブデータを削除','Delete save data'],['settingsDeleteNote','すべての難易度の進行と持ち物が対象です。次の画面で確認してから削除します。','This affects progress and stock in every difficulty. Confirm on the next screen to delete.'],['settingsDifficultyNote','選んだ難易度にすぐ切り替わります。現在の進行と持ち物は保存してから切り替えます。','Your selection takes effect immediately. Current progress and stock are saved before switching.']])$(id).textContent=local(ja,en);
 for(const [i,input] of [...document.querySelectorAll('input[name="difficulty"]')].entries()){const label=input.closest('label');let guide=label.querySelector('.difficulty-guide'),badge=label.querySelector('.difficulty-current');if(!guide){guide=document.createElement('span');guide.className='difficulty-guide';guide.dataset.storyRaw='';input.nextElementSibling.append(guide);badge=document.createElement('b');badge.className='difficulty-current';badge.dataset.storyRaw='';input.nextElementSibling.append(badge);}guide.textContent=local(['射線：着弾まで全表示','射線：前半の半分','射線：発射方向のみ'][i],['Guide: full trajectory','Guide: first half','Guide: firing direction'][i]);badge.textContent=local('選択中','Selected');}
 $('installationGuide').textContent=local('ホーム画面への追加案内','Home-screen installation guide');
 $('settingsControlState').textContent=hooks.controls()==='left'?local('移動・照準は左側','Move and aim on the left'):local('移動・照準は右側','Move and aim on the right');
 const control=hooks.controls()==='left'?local('左で移動・照準、右で発射。','Move and aim on the left; fire on the right.'):local('右で移動・照準、左で発射。','Move and aim on the right; fire on the left.');
 const guide=[
  [local('移動と照準','Move and aim'),control+local('歩いた方向へ車体が向きます。停止中も向きを保ち、砲身だけ後ろへ狙えます。',' Walking sets chassis direction; stopping preserves it. Aim past90° to fire backward without turning the chassis.')],
  [local('ためる・撃つ・取り消す','Charge, fire, cancel'),local('発射を長押し、離して発射。指をボタンの外へずらして離すと取消。キーボードは矢印とSpace、取消はEsc。','Hold FIRE and release to shoot. Slide outside the button and release to cancel. Keyboard: arrows and Space; Esc cancels.')],
  [local('通常弾と必殺','Normal and special'),local('通常弾は無制限。通常戦の必殺は自分の第2・4・6ターンに1発ずつ。中ボス・大ボスは最初から3発。機体を変えても残数は共通です。','Normal fire is unlimited. Normal battles unlock one special on player turns2,4,6. Guardians start with3. Switching machines shares the same ammo.')],
  [local('転移と行動数','Teleport and actions'),local('転移弾は4面から。着弾先へ移り、1行動を使います。攻撃・転移・修理が残り行動を使い、歩行と照準は使いません。','Teleport unlocks at stage 4. Its contact moves you and costs one action. Attacking, teleporting and repairing use actions; walking and aiming do not.')],
  [local('章の持ち物','Chapter stock'),local('道中のカプセルから武器・スキルを入手します。未使用の残数は章を越えて持ち越せます。カプセルは難易度ごとに一度だけ取得できます。','Collect weapons and skills from capsules along the route. Unused stock carries across chapters. Each capsule can be claimed once per difficulty.')],
  [local('やり直しと保存','Retry and saving'),local('やり直し・中断復帰は面開始時のHPと持ち物へ戻ります。選んだ面をクリアすると次の面へ進み、物語が続きます。','Retrying or returning after interruption restores the level-entry HP and stock. Clear the selected stage to continue to the next stage and its story.')]
 ];
 $('settingsGuide').innerHTML=guide.map(([title,body])=>`<details><summary>${escape(title)}</summary><p>${escape(body)}</p></details>`).join('');$('saveVersionInfo').textContent='ARCLINE '+root.ArcRelease.version+' · '+$('saveStatus').textContent;
 root.ArcI18n.apply();
}
function openSettings(trigger=$('openSettings'),category='options'){if(!prepare('lobbySettings',trigger))return;settingsTab=['options','difficulty','guide','data'].includes(category)?category:'options';renderSettings();document.querySelector('#lobbySettings [role="tabpanel"]:not([hidden])').scrollTop=0;$('closeSettings').focus({preventScroll:true});}
function note(title,body){return `<section class="record-section"><h3>${escape(title)}</h3><p>${escape(body)}</p></section>`;}
function disclosure(title,body,readIds=[]){return `<details class="record-detail" data-read-ids="${readIds.join(',')}"><summary>${escape(title)}</summary>${body}</details>`;}
function renderMachine(){
 const data=hooks.data(),n=J.progress(data),m=J.machines.find(m=>m.id===machine)||J.machines[0],crew=root.ArcCrew.get(m.id),owned=root.ArcCrew.owned(data,m.id),joined=(data.joinedCharacterIds||[]).includes(m.id);machine=m.id;
 let body=`<p class="record-kicker">${escape(local(joined?'この旅で合流済み':owned?'以前から所有':crew.stage+'面で合流',joined?'Joined this journey':owned?'Previously owned':'Joins at stage '+crew.stage))}</p><h3 class="record-title">${escape(t(m.name))}</h3><blockquote>${escape(t(m.line))}</blockquote><p>${escape(t(m.desire))}</p>`;
 if(owned){body+=disclosure(local('背景と個性','Background and personality'),note(local('これまで','Before the journey'),t(J.story.past(m,n)))+note(local('弱さと向き合う','Facing a weakness'),t(m.flaw)),['machine:'+m.id+':profile']);if(n>=m.growthStage)body+=disclosure(local('旅で選んだこと','A choice on the journey'),`<p>${escape(t(m.choice))}</p>`,['machine:'+m.id+':choice']);if(n===100)body+=disclosure(local('旅の、その先','After the journey'),`<p>${escape(t(m.ending))}</p>`,['machine:'+m.id+':ending']);}
 else body+=`<p class="record-locked">${escape(local(crew.stage+'面をクリアすると、仲間の背景と旅の出来事が開きます。','Clear stage '+crew.stage+' to open this companion’s story.'))}</p>`;
 const relation=J.story.relations.find(r=>r.machines.includes(m.id)&&r.machines.every(id=>(data.joinedCharacterIds||[]).includes(id)));if(relation)body+=disclosure(t(relation.title),`<p>${escape(t(relation.body))}</p>`,['relation:'+J.story.relations.indexOf(relation)]);
 $('recordBody').innerHTML=body;
}
function renderJourney(){
 const data=hooks.data(),n=J.progress(data),c=J.chapters.find(c=>c.id===chapter)||J.chapters[0];chapter=c.id;const act=J.acts.find(a=>c.start>=a.start&&c.start<a.start+20);
 let body=`<p class="record-kicker">${escape(local(n+' / 100 面クリア',n+' / 100 stages cleared'))}</p><h3 class="record-title">${escape(t(c.title))}</h3><p class="record-lead">${escape(t(J.story.chapter(c.start).opening))}</p><blockquote>${escape(t(c.question))}</blockquote>`;
 const recent=root.ArcCrew.rows.filter(r=>r.stage>0&&r.stage<=n).slice(-3);if(recent.length)body+=`<section class="record-section"><h3>${local('最近の出会い','Recent companions')}</h3>${recent.map(r=>`<p>${r.stage} · ${escape(t(r.name))}</p>`).join('')}</section>`;
 body+=disclosure(local('この章の物語を読む','Read this chapter'),`<p>${escape(t(n>=c.end?c.opening:J.story.chapter(c.start).opening))}</p><p>${escape(J.story.actBody(act,n,language()))}</p>`+(n>=c.end?`<blockquote>${escape(t(c.reflection))}</blockquote>`:''),['chapter:'+c.id+':opening','act:'+act.id,...(n>=c.end?['chapter:'+c.id+':cleared']:[])]);
 const guardians=J.story.guardians.filter(g=>g.chapter===c.id&&n>=g.stage);for(const g of guardians)body+=disclosure(local(g.stage+'面 · '+t(g.name),'LEVEL '+g.stage+' · '+t(g.name)),`<p>${escape(t(g.work))}</p><p>${escape(t(g.background))}</p><blockquote>${escape(t(g.aftermath))}</blockquote>`,['guardian:'+g.stage]);
 if(n===100&&c.id===10)body+=disclosure(t(J.epilogue.title),J.epilogue.lines.map(line=>`<p>${escape(t(line))}</p>`).join(''),['epilogue']);
 $('recordBody').innerHTML=body;
}
let memory=null,memoryTyper=null;
function replayMovie(id,trigger){if(!hooks.data().journeyStarted)return;const panel=active;$('journalPanel').hidden=true;active=null;hooks.playMovie(id,trigger,()=>{active=panel;$('journalPanel').hidden=false;trigger?.focus({preventScroll:true});});}
function renderScenes(){
 const data=hooks.data(),n=J.progress(data),c=J.chapters.find(c=>c.id===chapter)||J.chapters[0];chapter=c.id;memoryTyper=null;memory=null;
 const available=n>=c.start||chapter===1&&data.journeyStarted;
 const cleared=Math.max(0,Math.min(10,n-c.start+1)),nodes=root.ArcChapterPlayback.plan(data,chapter),scenes=nodes.filter(node=>node.kind==='clear').length,meetings=nodes.filter(node=>node.kind==='recruit').length,films=nodes.filter(node=>node.kind==='movie').length;
 $('recordBody').innerHTML=`<section class="story-chapter-card story-detail-layout" data-story-raw><div class="chapter-summary"><p class="record-kicker">${local('第'+chapter+'章','Chapter '+chapter)} · ${c.start}–${c.end}</p><h3 class="record-title">${escape(t(c.title))}</h3><p>${escape(t(c.question))}</p><div class="story-chapter-progress" aria-label="${local('クリア済み','Cleared')} ${cleared}/10">${Array.from({length:10},(_,i)=>`<i class="${i<cleared?'complete':''}"></i>`).join('')}</div><p class="story-progress-label">${local(cleared+' / 10 面クリア',cleared+' / 10 stages cleared')}</p></div><div class="chapter-replay"><small>${local('クリア済みの物語を続けて見る','REPLAY YOUR CLEARED STORIES')}</small><button type="button" id="playStoryChapter" data-play-chapter="${chapter}" ${available?'':'disabled'}>${local('この章を再生','Play this chapter')} ▶</button><div class="story-content-counts"><span>${local('台詞 '+scenes+'場面',scenes+' dialogue scenes')}</span><span>${local('出会い '+meetings+'場面',meetings+' meetings')}</span><span>${local('映像 '+films+'本',films+' films')}</span></div><p class="story-replay-note">${available?local('進行と持ち物は変わりません。','Progress and inventory stay unchanged.'):local(c.start+'面をクリアすると再生できます。','Clear stage '+c.start+' to unlock playback.')}</p></div></section>`;
 const b=$('playStoryChapter');b.onclick=()=>{root.ArcFullscreen?.enter?.();const panel=active;active=null;$('journalPanel').hidden=true;const done=()=>{active=panel;$('journalPanel').hidden=false;b.focus({preventScroll:true});};if(!hooks.playChapter(chapter,b,done))done();};touchTap(b);
}

const categoryTitle=()=>tab==='scenes'?local('章を再生','Play chapters'):tab==='journey'?local('旅の記録','Journey records'):local('仲間の記録','Companion records');
function chooseRecord(id){
 listPosition=storyView==='list'?$('recordNavigation').scrollTop:null;
 if(tab==='machines')machine=id;else chapter=Number(id);
 storyView='detail';renderJournal();$('recordBody').scrollTop=0;$('recordBody').focus({preventScroll:true});
}
function showStoryList(category){tab=category;storyView='list';listPosition=0;renderJournal();$('recordNavigation').scrollTop=0;$('recordNavigation').focus({preventScroll:true});}
function backStory(){
 if(storyView==='detail'){storyView='list';renderJournal();$('recordNavigation').scrollTop=listPosition||0;const selected=$('recordNavigation').querySelector('[aria-current="true"]:not(:disabled)');if(selected&&listPosition===null){const area=root.ArcViewport.rect($('recordNavigation'),$('app')),r=root.ArcViewport.rect(selected,$('app'));if(r.top<area.top)$('recordNavigation').scrollTop+=r.top-area.top;else if(r.bottom>area.bottom)$('recordNavigation').scrollTop+=r.bottom-area.bottom;}(selected||$('recordNavigation')).focus({preventScroll:true});}
 else{storyView='home';renderJournal();$('storyHub').querySelector('[data-record-tab="'+tab+'"]').focus({preventScroll:true});}
}
function renderStoryHub(){
 const data=hooks.data(),n=J.progress(data),current=J.chapters.find(c=>c.id===chapter)||J.chapters[0];
 $('storyHub').innerHTML=`<section class="story-current"><div><small>${local('これまでの旅','YOUR JOURNEY')}</small><h3>${local(n+'面までクリア',n+' stages cleared')}</h3><p>${local('第'+chapter+'章','Chapter '+chapter)} · ${escape(t(current.title))}</p></div><div class="story-current-action"><span>${n}<small> / 100</small></span><button type="button" id="storyCurrentChapter">${local('この章を振り返る','Revisit this chapter')} <b aria-hidden="true">↗</b></button></div></section><div class="story-category-grid">${[
 ['scenes','sceneRecordTab','01',local('章を再生','Play chapters'),local('台詞・映像・仲間との出会いを続けて見る','Watch dialogue, films and meetings in order')],
 ['journey','journeyRecordTab','02',local('旅の記録','Journey records'),local('章の物語や、守護者との出来事を読む','Read chapter stories and encounters with guardians')],
 ['machines','machineRecordTab','03',local('仲間の記録','Companion records'),local('仲間の背景・個性・旅での変化を読む','Read about your companions and their growth')]
 ].map(([key,id,number,title,note])=>`<button type="button" id="${id}" data-record-tab="${key}" class="story-category"><span class="category-number">${number}</span><strong>${title}</strong><p>${note}</p><span class="category-action">${local('一覧を開く','Browse')} <b aria-hidden="true">→</b></span></button>`).join('')}</div>`;
 $('storyCurrentChapter').onclick=()=>{tab='scenes';chooseRecord(chapter);};touchTap($('storyCurrentChapter'));
 for(const button of $('storyHub').querySelectorAll('[data-record-tab]')){button.onclick=()=>showStoryList(button.dataset.recordTab);touchTap(button);}
}
function renderRecordList(){
 const data=hooks.data(),n=J.progress(data),machines=tab==='machines';$('recordNavigation').dataset.recordKind=machines?'companions':'chapters';
 $('recordNavigation').innerHTML=machines?root.ArcCrew.rows.map((r,i)=>{const owned=root.ArcCrew.owned(data,r.id);return `<button type="button" class="story-record-card companion-record" data-record-machine="${r.id}" data-record-id="${r.id}" aria-current="${r.id===machine}" ${owned?'':'disabled'}><span class="record-card-number">${String(i+1).padStart(2,'0')}</span><span class="record-card-copy"><strong>${escape(t(r.name))}</strong><small>${owned?local('背景・個性・旅の記録','Background, personality and journey'):local(r.stage+'面クリアで解放','Clear stage '+r.stage+' to unlock')}</small></span><span class="record-card-arrow" aria-hidden="true">${owned?'→':'—'}</span></button>`;}).join(''):J.chapters.map(c=>{const open=n>=c.start-1,done=Math.max(0,Math.min(10,n-c.start+1)),state=done===10?'complete':open?'current':'locked',status=done===10?local('クリア','Cleared'):open?done+' / 10':local('未解放','Locked');return `<button type="button" class="story-record-card chapter-record" ${tab==='scenes'?'data-story-chapter':'data-record-chapter'}="${c.id}" data-record-id="${c.id}" aria-current="${c.id===chapter}" ${open?'':'disabled'}><span class="record-card-number">${String(c.id).padStart(2,'0')}</span><span class="record-card-copy"><strong>${open?escape(t(c.title)):local('未解放の章','Locked chapter')}</strong><small>${local(c.start+'–'+c.end+'面','Stages '+c.start+'–'+c.end)}${open?'':local(' · '+(c.start-1)+'面クリアで解放',' · Clear stage '+(c.start-1)+' to unlock')}</small><span class="record-card-progress"><i style="width:${done*10}%"></i></span></span><span class="chapter-status ${state}">${done===10?'<b aria-hidden="true">✓</b> ':''}${status}</span></button>`;}).join('');
 for(const button of $('recordNavigation').querySelectorAll('[data-record-id]')){button.onclick=()=>{if(!button.disabled)chooseRecord(button.dataset.recordId);};touchTap(button);}
}
function renderJournal(){
 for(const id of ['replayPrologue','replay30','replay60','replayEpilogue'])$(id).hidden=true;
 const home=storyView==='home',detail=storyView==='detail';$('storyHub').hidden=!home;$('storyToolbar').hidden=home;$('recordsLayout').hidden=home;$('recordNavigation').hidden=home||detail;$('recordBody').hidden=home||!detail;
 $('journalPanel').dataset.storyView=storyView;
 if(home)renderStoryHub();else{
  $('storyBack').textContent=detail?local('← 一覧','← Back to list'):local('← ストーリー','← Story home');
  $('storyBreadcrumb').textContent=detail?categoryTitle():local('ストーリーモード','Story mode');
  $('storyLocation').textContent=detail?(tab==='machines'?t(root.ArcCrew.get(machine).name):local('第'+chapter+'章','Chapter '+chapter)):categoryTitle();
  $('storyTotalProgress').textContent=J.progress(hooks.data())+' / 100';
  if(!detail)renderRecordList();else{
   if(tab==='scenes')renderScenes();else if(tab==='machines')renderMachine();else renderJourney();
   for(const d of $('recordBody').querySelectorAll('[data-read-ids]'))d.addEventListener('toggle',()=>{if(storyView==='detail'&&d.open)read(d.dataset.readIds.split(','));});
  }
 }
 root.ArcI18n.apply();hooks.summary?.(hooks.data());
}
function openJournal(machineId=null,trigger=$('openJournal')){
 if(!hooks.data().journeyStarted||!prepare('journalPanel',trigger))return;
 tab=machineId?'machines':'scenes';storyView=machineId?'detail':'home';listPosition=0;memory=null;machine=machineId||hooks.data().equippedCharacterId||'gun';chapter=Math.min(10,Math.max(1,Math.ceil(J.progress(hooks.data())/10)));
 renderJournal();$('storyHub').scrollTop=$('recordBody').scrollTop=0;$('closeJournal').focus({preventScroll:true});
}
function bindTabs(selector,attribute,choose){
 const buttons=[...document.querySelectorAll(selector)];for(const b of buttons){b.onclick=()=>choose(b.getAttribute(attribute));b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();const i=buttons.indexOf(b),next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(['ArrowLeft','ArrowUp'].includes(e.key)?-1:1)+buttons.length)%buttons.length;buttons[next].click();buttons[next].focus();};}
}
function install(options){
 document.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'){touchPointers.add(e.pointerId);if(touchPointers.size>1)touchBatch++;}},true);
 for(const event of ['pointerup','pointercancel'])document.addEventListener(event,e=>touchPointers.delete(e.pointerId),true);
 root.addEventListener('blur',()=>{touchPointers.clear();touchBatch++;});
 hooks=options;$('installationGuide').onclick=()=>root.ArcDevice.offer(()=>{},true);for(const [id,movie,unlock] of [['replayPrologue','prologue',0],['replay30','30',30],['replay60','60',60],['replayEpilogue','epilogue',100]])$(id).onclick=()=>{if(J.progress(hooks.data())<unlock)return;replayMovie(movie,$(id));};$('openSettings').onclick=()=>openSettings();$('openJournal').onclick=()=>openJournal();$('closeSettings').onclick=$('closeJournal').onclick=()=>close();$('settingsMirror').onclick=()=>{hooks.toggleControls();renderSettings();};
 for(const b of document.querySelectorAll('#lobbySettings button,#journalPanel button,#openSettings,#openJournal'))touchTap(b);
 document.addEventListener('click',e=>{const a=touchActivation;if(!a||!e.isTrusted||e.detail===0||performance.now()-a.time>500)return;const samePointer=e.pointerType==='touch'&&e.pointerId===a.id,sameLegacyTouch=!e.pointerType&&Math.hypot(e.clientX-a.x,e.clientY-a.y)<4;if(samePointer||sameLegacyTouch){touchActivation=null;e.preventDefault();e.stopImmediatePropagation();}},true);
 bindTabs('[data-settings-tab]','data-settings-tab',value=>{settingsTab=value;renderSettings();});$('storyBack').onclick=backStory;
 root.addEventListener('arcline-language',()=>{if(active==='lobbySettings')renderSettings();if(active==='journalPanel')renderJournal();});
}
root.ArcMenus={update:dt=>{if(active==='journalPanel')memoryTyper?.update(dt);},install,openSettings,openJournal,close,get active(){return active;}};
})(globalThis);
