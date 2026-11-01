(function(root){'use strict';
const $=id=>document.getElementById(id),local=(ja,en)=>root.ArcI18n.language==='en'?en:ja;
let hooks=null,active=null,after=null,busy=false,previousFocus=null,inert=[];
function open(done=()=>{}){
 if(active)return false;const d=hooks.data(),pending=d.pendingRecruit;
 if(!d.updateNoticePending&&!pending){done();return false;}
 active=d.updateNoticePending?'update':'join';after=done;previousFocus=document.activeElement;inert=[];hooks.clearInput();
 for(const id of ['lobby','battle','overlay','collectionPanel','journalPanel','lobbySettings']){const e=$(id);inert.push([e,e.inert]);e.inert=true;}
 $('expeditionDialog').hidden=false;document.querySelector('.expedition-copy').scrollTop=0;document.querySelector('.expedition-copy details').open=false;$('expeditionError').hidden=true;
 const c=active==='join'?root.ArcCrew.get(pending.id):null;
 $('expeditionTitle').textContent=active==='update'?local('新しい旅が始まります','A new adventure begins'):local(pending.alreadyOwned?'仲間と合流':'新しい仲間',pending.alreadyOwned?'A companion rejoins':'A new companion');
 $('expeditionArt').hidden=!c;document.querySelector('.expedition-copy details').hidden=!c;
 if(c){root.ArcCharacters.paint($('expeditionArt'),c.id);const p=root.ArcCombat.get(c.id);$('expeditionName').textContent=root.ArcStory.pick(c.name,root.ArcI18n.language);$('expeditionText').textContent=root.ArcStory.pick(c.reason,root.ArcI18n.language)+'\n'+local('「','“')+root.ArcStory.pick(c.line,root.ArcI18n.language)+local('」','”');$('expeditionAbilitySummary').textContent=local('必殺：','SPECIAL: ')+root.ArcI18n.t(p.special.name);$('expeditionAbility').textContent=root.ArcI18n.t(p.special.name)+' · '+root.ArcI18n.t(p.specialNote);$('expeditionQuestion').textContent=local('新しい仲間に切り替えますか？','Switch to this companion?');}
 else{$('expeditionName').textContent='';$('expeditionText').textContent=local('攻略記録はプロローグから再スタートします。これまで所有したキャラクターと設定は、そのまま引き継げます。','Campaign progress restarts from the prologue. All previously owned machines and your settings are retained.');$('expeditionAbility').textContent='';$('expeditionQuestion').textContent='';}
 $('expeditionUse').hidden=!c;$('expeditionStay').textContent=c?local('今のキャラで続ける','Keep my current machine'):local('確認して進む','Continue');$('expeditionUse').textContent=local('このキャラに変更','Use this companion');$('expeditionStay').focus({preventScroll:true});return true;
}
async function finish(change=false){
 if(!active||busy)return;busy=true;$('expeditionUse').disabled=$('expeditionStay').disabled=true;
 const d=hooks.data(),pending=d.pendingRecruit,notice=d.updateNoticePending,equipped=d.equippedCharacterId;
 if(active==='update')d.updateNoticePending=false;else{if(change&&root.ArcCrew.owned(d,pending.id))d.equippedCharacterId=pending.id;d.pendingRecruit=null;}
 const ok=await hooks.persist();busy=false;$('expeditionUse').disabled=$('expeditionStay').disabled=false;
 if(!ok){d.pendingRecruit=pending;d.updateNoticePending=notice;d.equippedCharacterId=equipped;$('expeditionError').textContent=local('保存できませんでした。もう一度選択してください。','Could not save. Please choose again to retry.');$('expeditionError').hidden=false;return;}
 active=null;$('expeditionDialog').hidden=true;for(const[e,value]of inert)e.inert=value;inert=[];const done=after;after=null;hooks.changed();done();if(previousFocus?.isConnected&&!previousFocus.closest('[hidden]'))previousFocus.focus({preventScroll:true});previousFocus=null;
}
function install(options){hooks=options;$('expeditionUse').onclick=()=>finish(true);$('expeditionStay').onclick=()=>finish(false);
 document.addEventListener('keydown',e=>{if(!active||$('gameSurface').inert||$('app').inert)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();finish(false);}if(e.key==='Tab'){e.preventDefault();e.stopImmediatePropagation();const list=[...$('expeditionDialog').querySelectorAll('button:not(:disabled),summary')].filter(e=>!e.hidden&&e.getClientRects().length);if(list.length)list[(list.indexOf(document.activeElement)+(e.shiftKey?-1:1)+list.length)%list.length].focus();}},true);
}
root.ArcExpeditionUi={install,open,get active(){return !!active;}};
})(globalThis);
