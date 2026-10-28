'use strict';
// Safari may retain a visual-page scale despite the viewport meta tag. Keep the
// playable surface fitted to the visible viewport, without reloading or losing a duel.
(function(root){
 function point(x,y,app){
  const r=app.getBoundingClientRect(),sx=r.width?app.clientWidth/r.width:1,sy=r.height?app.clientHeight/r.height:1;
  return {x:(x-r.left)*sx,y:(y-r.top)*sy};
 }
 function rect(element,app){
  const r=element.getBoundingClientRect(),a=point(r.left,r.top,app),b=point(r.right,r.bottom,app);
  return {x:a.x,y:a.y,left:a.x,top:a.y,right:b.x,bottom:b.y,width:b.x-a.x,height:b.y-a.y};
 }
 function install(app,onChange=()=>{}){
  let state=null;
  const viewport=root.visualViewport,options={passive:false,capture:true};
  function fit(){
   const scale=Math.max(.1,viewport?.scale||1),width=(viewport?.width||root.innerWidth)*scale,height=(viewport?.height||root.innerHeight)*scale,
    left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0;
   const next={width,height,scale,left,top};
   if(state&&Object.keys(next).every(k=>Math.abs(next[k]-state[k])<.01))return false;
   state=next;Object.assign(app.style,{position:'fixed',left:'0px',top:'0px',right:'auto',bottom:'auto',width:width+'px',height:height+'px',transformOrigin:'0 0',transform:`translate(${left}px,${top}px) scale(${1/scale})`});
   app.dataset.viewportFitted=scale>1.01?'true':'false';onChange(next);return true;
  }
  const inside=e=>app.contains(e.target),gameplay=e=>e.target?.closest?.('#world,#stick,#aimStick,#fire');
  function touch(e){
   if(!inside(e))return;
   // Pointer events still drive independent movement, aim and firing fingers.
   // Only these surfaces lack click actions; panel buttons keep native clicks
   // and one-finger panel scrolling is deliberately left to the browser.
   if(e.touches.length>1||gameplay(e))e.preventDefault();
  }
  for(const event of ['touchstart','touchmove','touchend'])app.addEventListener(event,touch,options);
  for(const event of ['gesturestart','gesturechange','gestureend'])app.addEventListener(event,e=>e.preventDefault(),options);
  app.addEventListener('dblclick',e=>e.preventDefault());
  viewport?.addEventListener('resize',fit);viewport?.addEventListener('scroll',fit);
  root.addEventListener('resize',fit);root.addEventListener('pageshow',fit);
  fit();return {fit,point:(x,y)=>point(x,y,app),rect:element=>rect(element,app),get state(){return {...state};}};
 }
 root.ArcViewport={install,point,rect};
})(globalThis);
