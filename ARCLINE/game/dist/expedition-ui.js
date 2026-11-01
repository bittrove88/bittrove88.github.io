(function(root){'use strict';
const $=id=>document.getElementById(id),local=(ja,en)=>root.ArcI18n.language==='en'?en:ja;
let hooks=null,active=null,after=null,busy=false,replayInfo=null;
function open(done=()=>{},replayId=null){
 if(active)return false;const d=hooks.data();replayInfo=replayId?root.ArcCrew.get(replayId):null;if(replayId&&(!replayInfo||replayInfo.stage>d.cleared||!replayInfo.stage))return false;const pending=replayInfo||d.pendingRecruit;
 if(!replayInfo&&!d.updateNoticePending&&!pending){done();return false;}
 active=replayInfo?'replay':d.updateNoticePending?'update':'join';after=done;hooks.clearInput();
 root.ArcScreens.open('expeditionDialog',{block:['lobby','battle','overlay','collectionPanel','journalPanel','lobbySettings'],onEscape:()=>finish(false),cycleFocus:true});
 document.querySelector('.expedition-copy').scrollTop=0;document.querySelector('.expedition-copy details').open=false;$('expeditionError').hidden=true;
 const c=['join','replay'].includes(active)?root.ArcCrew.get(pending.id):null;
 $('expeditionTitle').textContent=active==='update'?local('新しい旅が始まります','A new adventure begins'):local(pending.alreadyOwned?'仲間と合流':'新しい仲間',pending.alreadyOwned?'A companion rejoins':'A new companion');
 $('expeditionDialog').dataset.recruit=String(!!c);$('expeditionDialog').classList.remove('reveal-complete');$('expeditionArt').hidden=!c;document.querySelector('.expedition-copy details').hidden=!c;
 if(c){$('expeditionArt').innerHTML=root.ArcCharacterHero.art(c.id,{lang:root.ArcI18n.language});root.ArcCharacterHero.hydrate($('expeditionArt'),{reveal:true});const machine=root.ArcCharacters.get(c.id);$('expeditionMachineName').textContent=machine.name;$('expeditionName').textContent=machine.nameJa;$('expeditionRole').textContent=local(machine.roleJa,machine.role);$('expeditionMotto').textContent=local(machine.mottoJa,machine.motto);$('expeditionRevealSkip').textContent=local('演出をスキップ','Skip reveal');const p=root.ArcCombat.get(c.id);$('expeditionText').textContent=root.ArcStory.pick(c.reason,root.ArcI18n.language)+'\n'+local('「','“')+root.ArcStory.joinLine(c.id,root.ArcI18n.language)+local('」','”');$('expeditionAbilitySummary').textContent=local('必殺：','SPECIAL: ')+root.ArcI18n.t(p.special.name);$('expeditionAbility').textContent=root.ArcI18n.t(p.special.name)+' · '+root.ArcI18n.t(p.specialNote);$('expeditionQuestion').textContent=local('新しい仲間に切り替えますか？','Switch to this companion?');}
 else{$('expeditionMachineName').textContent='';$('expeditionRole').textContent='';$('expeditionMotto').textContent='';$('expeditionName').textContent='';$('expeditionText').textContent=local('攻略記録はプロローグから再スタートします。これまで所有したキャラクターと設定は、そのまま引き継げます。','Campaign progress restarts from the prologue. All previously owned machines and your settings are retained.');$('expeditionAbility').textContent='';$('expeditionQuestion').textContent='';}
 $('expeditionUse').hidden=!c||active==='replay';$('expeditionStay').textContent=c?local('今のキャラで続ける','Keep my current machine'):local('確認して進む','Continue');$('expeditionUse').textContent=local('このキャラに変更','Use this companion');if(active==='replay'){$('expeditionQuestion').textContent=local('出会いの記録','A remembered encounter');$('expeditionStay').textContent=local('ストーリーに戻る','Back to stories');}$('expeditionStay').focus({preventScroll:true});return true;
}
async function finish(change=false){
 if(!active||busy)return;if(active==='replay'){dismiss();return;}busy=true;$('expeditionUse').disabled=$('expeditionStay').disabled=true;
 const d=hooks.data(),pending=d.pendingRecruit,notice=d.updateNoticePending,equipped=d.equippedCharacterId;
 if(active==='update')d.updateNoticePending=false;else{if(change&&root.ArcCrew.owned(d,pending.id))d.equippedCharacterId=pending.id;d.pendingRecruit=null;}
 const ok=await hooks.persist();busy=false;$('expeditionUse').disabled=$('expeditionStay').disabled=false;
 if(!ok){d.pendingRecruit=pending;d.updateNoticePending=notice;d.equippedCharacterId=equipped;$('expeditionError').textContent=local('保存できませんでした。もう一度選択してください。','Could not save. Please choose again to retry.');$('expeditionError').hidden=false;return;}
 dismiss();
}
function dismiss(){active=null;replayInfo=null;root.ArcScreens.close('expeditionDialog');const done=after;after=null;hooks.changed();done();}
function install(options){hooks=options;$('expeditionRevealSkip').onclick=()=>root.ArcCharacterHero.skip($('expeditionDialog'));$('expeditionUse').onclick=()=>finish(true);$('expeditionStay').onclick=()=>finish(false);
}
root.addEventListener('arcline-language',()=>{
 if(!active)return;const d=hooks.data(),pending=replayInfo||d.pendingRecruit,c=['join','replay'].includes(active)?root.ArcCrew.get(pending.id):null;
 $('expeditionTitle').textContent=c?local(pending.alreadyOwned?'仲間と合流':'新しい仲間',pending.alreadyOwned?'A companion rejoins':'A new companion'):local('新しい旅が始まります','A new adventure begins');
 if(c){root.ArcCharacterHero.localizeArt($('expeditionArt'),root.ArcI18n.language);const a=root.ArcCharacters.get(c.id),p=root.ArcCombat.get(c.id);$('expeditionRole').textContent=local(a.roleJa,a.role);$('expeditionMotto').textContent=local(a.mottoJa,a.motto);$('expeditionText').textContent=root.ArcStory.pick(c.reason,root.ArcI18n.language)+'\n'+local('「','“')+root.ArcStory.joinLine(c.id,root.ArcI18n.language)+local('」','”');$('expeditionAbilitySummary').textContent=local('必殺：','SPECIAL: ')+root.ArcI18n.t(p.special.name);$('expeditionAbility').textContent=root.ArcI18n.t(p.specialNote);$('expeditionQuestion').textContent=local('新しい仲間に切り替えますか？','Switch to this companion?');}
 else $('expeditionText').textContent=local('攻略記録はプロローグから再スタートします。これまで所有したキャラクターと設定は、そのまま引き継げます。','Campaign progress restarts from the prologue. All previously owned machines and your settings are retained.');
 $('expeditionUse').textContent=local('このキャラに変更','Use this companion');$('expeditionStay').textContent=c?local('今のキャラで続ける','Keep my current machine'):local('確認して進む','Continue');$('expeditionRevealSkip').textContent=local('演出をスキップ','Skip reveal');if(active==='replay'){$('expeditionQuestion').textContent=local('出会いの記録','A remembered encounter');$('expeditionStay').textContent=local('ストーリーに戻る','Back to stories');}
});

root.ArcExpeditionUi={install,open,replay:(id,done)=>open(done,id),get active(){return !!active;}};
})(globalThis);
