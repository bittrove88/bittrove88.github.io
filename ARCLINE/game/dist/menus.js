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
  [local('移動と照準','Move and aim'),control+local('発射を押したまま、移動と照準を切り替えられます。',' Keep FIRE held while switching between movement and aim.')],
  [local('ためる・撃つ・取り消す','Charge, fire, cancel'),local('発射を長押し、離して発射。指をボタンの外へずらして離すと取消。キーボードは矢印とSpace、取消はEsc。','Hold FIRE and release to shoot. Slide outside the button and release to cancel. Keyboard: arrows and Space; Esc cancels.')],
  [local('通常弾と必殺','Normal and special'),local('通常弾は無制限。機体の必殺は各面3回。チャージは飛距離を変え、威力は増やしません。','Normal fire is unlimited. Each machine has three special uses per stage. Charge changes range, not damage.')],
  [local('転移と行動数','Teleport and actions'),local('転移弾は4面から。着弾先へ移り、1行動を使います。攻撃・転移・修理が残り行動を使い、歩行と照準は使いません。','Teleport unlocks at stage 4. Its contact moves you and costs one action. Attacking, teleporting and repairing use actions; walking and aiming do not.')],
  [local('章の持ち物','Chapter stock'),local('武器箱で3発まで補充。武器3種類・スキル2種類を持てます。5面ごとではなく、10面ごとの章ボスを倒すまで持ち越します。','Weapon boxes refill to three shots. Carry up to three weapon types and two skill types until the chapter boss every ten stages, including across the fifth stage.')],
  [local('やり直しと保存','Retry and saving'),local('やり直し・中断復帰は面開始時のHPと持ち物へ戻ります。練習の取得は本編へ持ち帰りません。','Retrying or returning after interruption restores the level-entry HP and stock. Practice pickups never enter the campaign.')]
 ];
 $('settingsGuide').innerHTML=guide.map(([title,body])=>`<article><h3>${escape(title)}</h3><p>${escape(body)}</p></article>`).join('');
 root.ArcI18n.apply();
}
function openSettings(trigger=$('openSettings')){if(!prepare('lobbySettings',trigger))return;settingsTab='options';renderSettings();$('closeSettings').focus({preventScroll:true});}
function note(title,body){return `<section class="record-section"><h3>${escape(title)}</h3><p>${escape(body)}</p></section>`;}
function renderMachine(){
 const data=hooks.data(),n=J.progress(data),m=J.machines.find(m=>m.id===machine)||J.machines[0];machine=m.id;
 $('recordNavigation').innerHTML=J.machines.map(item=>{const current=item.id===machine,keys=['machine:'+item.id+':profile',...(n>=item.chapter*10?['machine:'+item.id+':choice']:[]),...(n===100?['machine:'+item.id+':ending']:[])];return `<button type="button" data-record-machine="${item.id}" aria-pressed="${current}"><span>${escape(t(item.name))}</span>${J.unread(data,keys)?'<i class="unread-dot" aria-label="Unread"></i>':''}</button>`;}).join('');
 let body=`<p class="record-kicker">${escape(local('機体の記録','MACHINE RECORD'))}</p><h3 class="record-title">${escape(t(m.name))}</h3><blockquote>${escape(t(m.line))}</blockquote>`;
 body+=note(local('届けたいもの','What drives them'),t(m.desire))+note(local('これまで','Before the journey'),t(m.past))+note(local('弱さと向き合う','A weakness to face'),t(m.flaw));
 const readIds=['machine:'+m.id+':profile'];
 if(n>=m.chapter*10){body+=note(local('選んだ一歩','A step they chose'),t(m.choice));readIds.push('machine:'+m.id+':choice');}
 else body+=`<p class="record-locked">${escape(local('成長の記録は第'+m.chapter+'章クリア後に開きます。','Their next step opens after chapter '+m.chapter+'.'))}</p>`;
 if(n===100){body+=note(local('旅の、その先','After the journey'),t(m.ending));readIds.push('machine:'+m.id+':ending');}
 else body+=`<p class="record-locked">${escape(local('後日談は100面クリア後に開きます。','The afterword opens after stage 100.'))}</p>`;
 $('recordBody').innerHTML=body;read(readIds);
 for(const b of $('recordNavigation').querySelectorAll('[data-record-machine]')){b.onclick=()=>{machine=b.dataset.recordMachine;renderJournal();$('recordBody').scrollTop=0;$('recordBody').focus({preventScroll:true});};touchTap(b);}
}
function renderJourney(){
 const data=hooks.data(),n=J.progress(data),c=J.chapters.find(c=>c.id===chapter)||J.chapters[0];chapter=c.id;
 $('recordNavigation').innerHTML=J.chapters.map(item=>{const unlocked=n>=item.start-1,keys=['chapter:'+item.id+':opening',...(n>=item.end?['chapter:'+item.id+':cleared']:[])];return `<button type="button" data-record-chapter="${item.id}" aria-pressed="${item.id===chapter}" ${unlocked?'':'disabled'}><span>${escape(local('第'+item.id+'章','Chapter '+item.id))}</span><small>${item.start}–${item.end}</small>${unlocked&&J.unread(data,keys)?'<i class="unread-dot" aria-label="Unread"></i>':''}</button>`;}).join('');
 const act=J.acts.find(a=>c.start>=a.start&&c.start<a.start+20),readIds=['chapter:'+c.id+':opening','act:'+act.id];
 let body=`<p class="record-kicker">${escape(local('第'+act.id+'幕','ACT '+act.id))} · ${escape(t(act.title))}</p><h3 class="record-title">${escape(t(c.title))}</h3><p class="record-lead">${escape(t(c.opening))}</p><blockquote>${escape(t(c.question))}</blockquote>`;
 if(c.id===1){body+=note(t(J.introduction.title),J.introduction.lines.map(t).join(' '));readIds.push('introduction');}
 body+=note(local('旅の中で','Along the way'),t(act.body));
 if(n>=c.end){body+=note(local('この章の記録','Chapter reflection'),t(c.reflection));readIds.push('chapter:'+c.id+':cleared');}
 else body+=`<p class="record-locked">${escape(local('この章をクリアすると、旅の記録が続きます。','Complete this chapter to open its reflection.'))}</p>`;
 if(c.id===10&&n===100){body+=note(t(J.epilogue.title),J.epilogue.lines.map(t).join(' '));readIds.push('epilogue');}
 $('recordBody').innerHTML=body;read(readIds);
 for(const b of $('recordNavigation').querySelectorAll('[data-record-chapter]')){b.onclick=()=>{chapter=Number(b.dataset.recordChapter);renderJournal();$('recordBody').scrollTop=0;$('recordBody').focus({preventScroll:true});};touchTap(b);}
}
function renderJournal(){
 for(const b of document.querySelectorAll('[data-record-tab]')){const selected=b.dataset.recordTab===tab;b.setAttribute('aria-selected',selected);b.tabIndex=selected?0:-1;}
 if(tab==='machines')renderMachine();else renderJourney();root.ArcI18n.apply();
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
 hooks=options;$('openSettings').onclick=()=>openSettings();$('openJournal').onclick=()=>openJournal();$('closeSettings').onclick=$('closeJournal').onclick=()=>close();$('settingsMirror').onclick=()=>{hooks.toggleControls();renderSettings();};
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
