(function(root){'use strict';
let locked=false;const active=()=>!!(document.fullscreenElement||document.webkitFullscreenElement);
function sync(){for(const b of document.querySelectorAll('[data-fullscreen]'))b.textContent=active()?'Exit fullscreen':'Fullscreen';root.ArcI18n?.apply();root.dispatchEvent(new Event('arcline-fullscreen'));}
function help(){document.getElementById('screenHelp').hidden=false;document.getElementById('closeScreenHelp').focus({preventScroll:true});}
async function toggle(){
 try{if(active()){await(document.exitFullscreen?.()||document.webkitExitFullscreen?.());return;}
 const el=document.documentElement,fn=el.requestFullscreen||el.webkitRequestFullscreen;
 if(!fn){help();return;}await fn.call(el,{navigationUI:'hide'});
 if(active())try{await screen.orientation?.lock('landscape');locked=true;}catch{}
 }catch{help();}
 sync();
}
for(const b of document.querySelectorAll('[data-fullscreen]'))b.onclick=toggle;
document.getElementById('closeScreenHelp').onclick=()=>{document.getElementById('screenHelp').hidden=true;};
for(const e of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(e,()=>{if(!active()&&locked){try{screen.orientation?.unlock();}catch{}locked=false;}sync();});
root.ArcFullscreen={toggle,active};sync();
})(globalThis);
