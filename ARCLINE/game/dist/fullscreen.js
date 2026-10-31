(function(root){'use strict';
let locked=false,helpReturn=null;const active=()=>!!(document.fullscreenElement||document.webkitFullscreenElement);
function sync(){for(const b of document.querySelectorAll('[data-fullscreen]'))b.textContent=active()?'Exit fullscreen':'Fullscreen';root.ArcI18n?.apply();root.dispatchEvent(new Event('arcline-fullscreen'));}
function help(trigger){helpReturn=trigger;document.getElementById('screenHelp').hidden=false;document.getElementById('closeScreenHelp').focus({preventScroll:true});}
async function toggle(event){
 const trigger=event?.currentTarget||document.activeElement;
 try{if(active()){await(document.exitFullscreen?.()||document.webkitExitFullscreen?.());return;}
 const el=document.documentElement,fn=el.requestFullscreen||el.webkitRequestFullscreen;
 if(!fn){help(trigger);return;}await fn.call(el,{navigationUI:'hide'});
 if(active())try{await screen.orientation?.lock('landscape');locked=true;}catch{}
 }catch{help(trigger);}
 sync();
}
for(const b of document.querySelectorAll('[data-fullscreen]'))b.onclick=toggle;
document.getElementById('closeScreenHelp').onclick=()=>{document.getElementById('screenHelp').hidden=true;if(helpReturn?.isConnected&&helpReturn.getClientRects().length)helpReturn.focus({preventScroll:true});helpReturn=null;};
for(const e of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(e,()=>{if(!active()&&locked){try{screen.orientation?.unlock();}catch{}locked=false;}sync();});
root.ArcFullscreen={toggle,active};sync();
})(globalThis);
