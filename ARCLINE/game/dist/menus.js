(function(root){
'use strict';
const $=id=>document.getElementById(id),J=root.ArcJournal,escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let hooks=null,active=null,returnTo=null,tab='journey',machine='gun',chapter=1,settingsTab='options';
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
 for(const other of ['levelPicker','collectionPanel','weaponPicker','lobbySettings','journalPanel'])$(other).hidden=true;
 hooks.clearInput();active=id;returnTo=trigger||document.activeElement;$(id).hidden=false;$('app').dataset.utilityOpen=id;
 return true;
}
function close(focus=true){if(!active)return;$(active).hidden=true;active=null;delete $('app').dataset.utilityOpen;if(focus&&returnTo?.isConnected&&returnTo.getClientRects().length)returnTo.focus({preventScroll:true});returnTo=null;}
function renderSettings(){
 $('settingsOptions').hidden=settingsTab!=='options';$('settingsGuide').hidden=settingsTab!=='guide';
 for(const b of document.querySelectorAll('[data-settings-tab]')){const selected=b.dataset.settingsTab===settingsTab;b.setAttribute('aria-selected',selected);b.tabIndex=selected?0:-1;}
 $('settingsControlState').textContent=hooks.controls()==='left'?local('移動・照準は左側','Move and aim on the left'):local('移動・照準は右側','Move and aim on the right');
 const control=hooks.controls()==='left'?local('左で移動・照準、右で発射。','Move and aim on the left; fire on the right.'):local('右で移動・照準、左で発射。','Move and aim on the right; fire on the left.');
 const guide=[
  [local('移動と照準','Move and aim'),control+local('歩いた方向へ車体が向きます。停止中も向きを保ち、砲身だけ後ろへ狙えます。',' Walking sets chassis direction; stopping preserves it. Aim past90° to fire backward without turning the chassis.')],
  [local('ためる・撃つ・取り消す','Charge, fire, cancel'),local('発射を長押し、離して発射。指をボタンの外へずらして離すと取消。キーボードは矢印とSpace、取消はEsc。','Hold FIRE and release to shoot. Slide outside the button and release to cancel. Keyboard: arrows and Space; Esc cancels.')],
  [local('通常弾と必殺','Normal and special'),local('通常弾は無制限。通常戦の必殺は自分の第2・4・6ターンに1発ずつ。中ボス・大ボスは最初から3発。機体を変えても残数は共通です。','Normal fire is unlimited. Normal battles unlock one special on player turns2,4,6. Guardians start with3. Switching machines shares the same ammo.')],
  [local('転移と行動数','Teleport and actions'),local('転移弾は4面から。着弾先へ移り、1行動を使います。攻撃・転移・修理が残り行動を使い、歩行と照準は使いません。','Teleport unlocks at stage 4. Its contact moves you and costs one action. Attacking, teleporting and repairing use actions; walking and aiming do not.')],
  [local('章の持ち物','Chapter stock'),local('武器箱で3発まで補充。武器3種類・スキル2種類を持てます。5面ごとではなく、10面ごとの章ボスを倒すまで持ち越します。','Weapon boxes refill to three shots. Carry up to three weapon types and two skill types until the chapter boss every ten stages, including across the fifth stage.')],
  [local('やり直しと保存','Retry and saving'),local('やり直し・中断復帰は面開始時のHPと持ち物へ戻ります。練習の取得は本編へ持ち帰りません。','Retrying or returning after interruption restores the level-entry HP and stock. Practice pickups never enter the campaign.')]
 ];
 $('settingsGuide').innerHTML=guide.map(([title,body])=>`<details><summary>${escape(title)}</summary><p>${escape(body)}</p></details>`).join('');$('saveVersionInfo').textContent='ARCLINE 0.13.0 · Campaign5.0 · schema'+root.ArcSave.schemaVersion+' · '+$('saveStatus').textContent;
 root.ArcI18n.apply();
}
function openSettings(trigger=$('openSettings')){if(!prepare('lobbySettings',trigger))return;settingsTab='options';renderSettings();$('settingsOptions').scrollTop=0;$('closeSettings').focus({preventScroll:true});}
function note(title,body){return `<section class="record-section"><h3>${escape(title)}</h3><p>${escape(body)}</p></section>`;}
function disclosure(title,body,readIds=[]){return `<details class="record-detail" data-read-ids="${readIds.join(',')}"><summary>${escape(title)}</summary>${body}</details>`;}
function renderMachine(){
 const data=hooks.data(),n=J.progress(data),m=J.machines.find(m=>m.id===machine)||J.machines[0],crew=root.ArcCrew.get(m.id),owned=root.ArcCrew.owned(data,m.id),joined=(data.joinedCharacterIds||[]).includes(m.id);machine=m.id;
 $('recordNavigation').innerHTML=root.ArcCrew.rows.map(r=>`<button type="button" data-record-machine="${r.id}" aria-pressed="${r.id===machine}">${escape(t(r.name))}<small>${root.ArcCrew.owned(data,r.id)?local('所有','Owned'):local(r.stage+'面','LV '+r.stage)}</small></button>`).join('');
 let body=`<p class="record-kicker">${escape(local(joined?'この旅で合流済み':owned?'以前から所有':crew.stage+'面で合流',joined?'Joined this journey':owned?'Previously owned':'Joins at stage '+crew.stage))}</p><h3 class="record-title">${escape(t(m.name))}</h3><blockquote>${escape(t(m.line))}</blockquote><p>${escape(t(m.desire))}</p>`;
 if(owned){body+=disclosure(local('背景と個性','Background and personality'),note(local('これまで','Before the journey'),t(J.story.past(m,n)))+note(local('弱さと向き合う','Facing a weakness'),t(m.flaw)),['machine:'+m.id+':profile']);if(n>=m.growthStage)body+=disclosure(local('旅で選んだこと','A choice on the journey'),`<p>${escape(t(m.choice))}</p>`,['machine:'+m.id+':choice']);if(n===100)body+=disclosure(local('旅の、その先','After the journey'),`<p>${escape(t(m.ending))}</p>`,['machine:'+m.id+':ending']);}
 else body+=`<p class="record-locked">${escape(local(crew.stage+'面をクリアすると、仲間の背景と旅の出来事が開きます。','Clear stage '+crew.stage+' to open this companion’s story.'))}</p>`;
 const relation=J.story.relations.find(r=>r.machines.includes(m.id)&&r.machines.every(id=>(data.joinedCharacterIds||[]).includes(id)));if(relation)body+=disclosure(t(relation.title),`<p>${escape(t(relation.body))}</p>`,['relation:'+J.story.relations.indexOf(relation)]);
 $('recordBody').innerHTML=body;
 for(const b of $('recordNavigation').querySelectorAll('[data-record-machine]')){b.onclick=()=>{machine=b.dataset.recordMachine;renderJournal();$('recordBody').scrollTop=0;};touchTap(b);}
}
function renderJourney(){
 const data=hooks.data(),n=J.progress(data),c=J.chapters.find(c=>c.id===chapter)||J.chapters[0];chapter=c.id;const act=J.acts.find(a=>c.start>=a.start&&c.start<a.start+20);
 $('recordNavigation').innerHTML=J.chapters.map(c=>`<button type="button" data-record-chapter="${c.id}" aria-pressed="${c.id===chapter}" ${n<c.start-1?'disabled':''}>${escape(local('第'+c.id+'章','Chapter '+c.id))}<small>${c.start}–${c.end}</small></button>`).join('');
 let body=`<p class="record-kicker">${escape(local(n+' / 100 面クリア',n+' / 100 stages cleared'))}</p><h3 class="record-title">${escape(t(c.title))}</h3><p class="record-lead">${escape(t(J.story.chapter(c.start).opening))}</p><blockquote>${escape(t(c.question))}</blockquote>`;
 const recent=root.ArcCrew.rows.filter(r=>r.stage>0&&r.stage<=n).slice(-3);if(recent.length)body+=`<section class="record-section"><h3>${local('最近の出会い','Recent companions')}</h3>${recent.map(r=>`<p>${r.stage} · ${escape(t(r.name))}</p>`).join('')}</section>`;
 body+=disclosure(local('この章の物語を読む','Read this chapter'),`<p>${escape(t(n>=c.end?c.opening:J.story.chapter(c.start).opening))}</p><p>${escape(J.story.actBody(act,n,language()))}</p>`+(n>=c.end?`<blockquote>${escape(t(c.reflection))}</blockquote>`:''),['chapter:'+c.id+':opening','act:'+act.id,...(n>=c.end?['chapter:'+c.id+':cleared']:[])]);
 const guardians=J.story.guardians.filter(g=>g.chapter===c.id&&n>=g.stage);for(const g of guardians)body+=disclosure(local(g.stage+'面 · '+t(g.name),'LEVEL '+g.stage+' · '+t(g.name)),`<p>${escape(t(g.work))}</p><p>${escape(t(g.background))}</p><blockquote>${escape(t(g.aftermath))}</blockquote>`,['guardian:'+g.stage]);
 if(n===100&&c.id===10)body+=disclosure(t(J.epilogue.title),J.epilogue.lines.map(line=>`<p>${escape(t(line))}</p>`).join(''),['epilogue']);
 $('recordBody').innerHTML=body;
 for(const b of $('recordNavigation').querySelectorAll('[data-record-chapter]')){b.onclick=()=>{chapter=+b.dataset.recordChapter;renderJournal();$('recordBody').scrollTop=0;};touchTap(b);}
}
function renderJournal(){
 $('replay30').hidden=J.progress(hooks.data())<30;$('replay60').hidden=J.progress(hooks.data())<60;$('replay30').textContent=local('30面の幕間','Stage30 scene');$('replay60').textContent=local('60面の幕間','Stage60 scene');$('replayEpilogue').hidden=J.progress(hooks.data())<100;
 for(const b of document.querySelectorAll('[data-record-tab]')){const selected=b.dataset.recordTab===tab;b.setAttribute('aria-selected',selected);b.tabIndex=selected?0:-1;}
 if(tab==='machines')renderMachine();else renderJourney();for(const d of $('recordBody').querySelectorAll('[data-read-ids]'))d.addEventListener('toggle',()=>{if(d.open)read(d.dataset.readIds.split(','));});root.ArcI18n.apply();
 // Repaint the selected record's unread mark without rebuilding its content.
 const data=hooks.data();for(const b of $('recordNavigation').querySelectorAll('button[aria-pressed="true"]'))b.querySelector('.unread-dot')?.remove();
 hooks.summary?.(data);
}
function openJournal(machineId=null,trigger=$('openJournal')){
 if(!prepare('journalPanel',trigger))return;
 tab=machineId?'machines':'journey';machine=machineId||hooks.data().equippedCharacterId||'gun';chapter=Math.min(10,Math.floor(J.progress(hooks.data())/10)+1);
 renderJournal();$('recordBody').scrollTop=0;$('closeJournal').focus({preventScroll:true});
}
function bindTabs(selector,attribute,choose){
 const buttons=[...document.querySelectorAll(selector)];for(const b of buttons){b.onclick=()=>choose(b.getAttribute(attribute));b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const i=buttons.indexOf(b),next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowLeft'?-1:1)+buttons.length)%buttons.length;buttons[next].click();buttons[next].focus();};}
}
function install(options){
 document.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'){touchPointers.add(e.pointerId);if(touchPointers.size>1)touchBatch++;}},true);
 for(const event of ['pointerup','pointercancel'])document.addEventListener(event,e=>touchPointers.delete(e.pointerId),true);
 root.addEventListener('blur',()=>{touchPointers.clear();touchBatch++;});
 hooks=options;for(const [id,movie,unlock] of [['replayPrologue','prologue',0],['replay30','30',30],['replay60','60',60],['replayEpilogue','epilogue',100]])$(id).onclick=()=>{if(J.progress(hooks.data())<unlock)return;const panel=active;$('journalPanel').hidden=true;active=null;hooks.playMovie(movie,$(id),()=>{active=panel;$('journalPanel').hidden=false;$(id).focus({preventScroll:true});});};$('openSettings').onclick=()=>openSettings();$('openJournal').onclick=()=>openJournal();$('closeSettings').onclick=$('closeJournal').onclick=()=>close();$('settingsMirror').onclick=()=>{hooks.toggleControls();renderSettings();};
 for(const b of document.querySelectorAll('#lobbySettings button,#journalPanel button,#openSettings,#openJournal'))touchTap(b);
 document.addEventListener('click',e=>{const a=touchActivation;if(!a||!e.isTrusted||e.detail===0||performance.now()-a.time>500)return;const samePointer=e.pointerType==='touch'&&e.pointerId===a.id,sameLegacyTouch=!e.pointerType&&Math.hypot(e.clientX-a.x,e.clientY-a.y)<4;if(samePointer||sameLegacyTouch){touchActivation=null;e.preventDefault();e.stopImmediatePropagation();}},true);
 bindTabs('[data-settings-tab]','data-settings-tab',value=>{settingsTab=value;renderSettings();});bindTabs('[data-record-tab]','data-record-tab',value=>{tab=value;renderJournal();$('recordBody').scrollTop=0;});
 document.addEventListener('keydown',e=>{
  if(!active||!$('screenHelp').hidden)return;
  if(e.key==='Escape'&&(document.fullscreenElement||document.webkitFullscreenElement))return;
  if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();return;}
  if(e.key==='Tab'){const targets=[...$(active).querySelectorAll('button:not(:disabled):not([tabindex="-1"]),[tabindex="0"]')].filter(b=>b.getClientRects().length),first=targets[0],last=targets.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
 },true);
 root.addEventListener('arcline-language',()=>{if(active==='lobbySettings')renderSettings();if(active==='journalPanel')renderJournal();});
}
root.ArcMenus={install,openSettings,openJournal,close,get active(){return active;}};
})(globalThis);
