'use strict';
// Safari may retain a visual-page scale despite the viewport meta tag. Keep the
// playable surface fitted to the visible viewport, without reloading or losing a duel.
(function(root){
 function rotationFor(width,height,angle){
  // The physical right edge is always the top. Native screen rotation has
  // already compensated for 90/-90/180 degrees, so compensate exactly once.
  const a=((Number(angle)||0)%360+360)%360;
  if(width<height)return a===180?-90:90;
  return a===270||a===180?180:0;
 }
 function point(x,y,app){
  const r=app.getBoundingClientRect(),sx=r.width?app.clientWidth/r.width:1,sy=r.height?app.clientHeight/r.height:1;
  const rotation=Number(app.dataset.viewRotation)||0;
  if(rotation===90)return {x:(y-r.top)*app.clientWidth/r.height,y:(r.right-x)*app.clientHeight/r.width};
  if(rotation===-90)return {x:(r.bottom-y)*app.clientWidth/r.height,y:(x-r.left)*app.clientHeight/r.width};
  if(rotation===180)return {x:(r.right-x)*sx,y:(r.bottom-y)*sy};
  return {x:(x-r.left)*sx,y:(y-r.top)*sy};
 }
 function rect(element,app){
  const r=element.getBoundingClientRect(),points=[[r.left,r.top],[r.right,r.top],[r.left,r.bottom],[r.right,r.bottom]].map(([x,y])=>point(x,y,app));
  const left=Math.min(...points.map(p=>p.x)),right=Math.max(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y)),bottom=Math.max(...points.map(p=>p.y));
  return {x:left,y:top,left,top,right,bottom,width:right-left,height:bottom-top};
 }
 function install(app,onChange=()=>{}){
  let state=null,mirrors=[],scrollGesture=null;
  const viewport=root.visualViewport,options={passive:false,capture:true};
  function cancelGesture(){
   const id=scrollGesture?.id;scrollGesture=null;
   if(id!==undefined)try{if(app.hasPointerCapture(id))app.releasePointerCapture(id);}catch{}
  }
  const excluded=e=>e.target?.closest?.('#world,#stick,#aimStick,#fire,#mapCameraPan,input,select,textarea');
  function scrollParents(target){
   const rows=[];
   for(let node=target;node&&node!==app;node=node.parentElement)if(node instanceof Element&&/auto|scroll/.test(getComputedStyle(node).overflowY)&&node.scrollHeight>node.clientHeight+1)rows.push(node);
   return rows;
  }
  function preventTrailingClick(){
   let timer;const cleanup=()=>{document.removeEventListener('click',click,true);document.removeEventListener('pointerdown',cleanup,true);root.clearTimeout(timer);},click=e=>{if(e.detail===0)return;cleanup();e.preventDefault();e.stopImmediatePropagation();};
   document.addEventListener('click',click,true);document.addEventListener('pointerdown',cleanup,true);timer=root.setTimeout(cleanup,400);
  }
  app.addEventListener('pointerdown',e=>{
   if(!state?.rotation||e.pointerType!=='touch'||scrollGesture||app.inert||excluded(e))return;
   const parents=scrollParents(e.target);if(!parents.length)return;
   const p=point(e.clientX,e.clientY,app);scrollGesture={id:e.pointerId,start:p,last:p,parents,dragged:false};
  },true);
  app.addEventListener('pointermove',e=>{
   const g=scrollGesture;if(g?.id!==e.pointerId)return;if(app.inert){cancelGesture();return;}
   const p=point(e.clientX,e.clientY,app),dx=p.x-g.start.x,dy=p.y-g.start.y;
   if(!g.dragged){if(Math.abs(dy)<8||Math.abs(dy)<Math.abs(dx))return;g.dragged=true;try{app.setPointerCapture(e.pointerId);}catch{}}
   e.preventDefault();e.stopImmediatePropagation();let delta=g.last.y-p.y;g.last=p;
   for(const node of g.parents){const old=node.scrollTop;node.scrollTop=Math.max(0,Math.min(node.scrollHeight-node.clientHeight,old+delta));delta-=node.scrollTop-old;if(Math.abs(delta)<.5)break;}
  },true);
  app.addEventListener('pointerup',e=>{
   const g=scrollGesture;if(g?.id!==e.pointerId)return;
   if(g.dragged){e.preventDefault();e.stopImmediatePropagation();preventTrailingClick();}cancelGesture();
  },true);
  app.addEventListener('pointercancel',e=>{if(scrollGesture?.id===e.pointerId)cancelGesture();},true);
  app.addEventListener('wheel',e=>{
   if(!state?.rotation||e.ctrlKey||excluded(e))return;const parents=scrollParents(e.target);if(!parents.length)return;
   e.preventDefault();let delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?app.clientHeight:1);
   for(const node of parents){const old=node.scrollTop;node.scrollTop=Math.max(0,Math.min(node.scrollHeight-node.clientHeight,old+delta));delta-=node.scrollTop-old;if(Math.abs(delta)<.5)break;}
  },{passive:false});
  // CSS media queries use the browser viewport. In fixed mode, evaluate their
  // dimensions against our landscape surface while retaining each sheet's cascade
  // position, device/input queries, reduced-motion rules and original assets.
  function responsiveSheets(width,height){
   if(!mirrors.length)for(const sheet of [...document.styleSheets]){
    const owner=sheet.ownerNode;if(!owner||owner.dataset?.viewportMirror)continue;
    try{void sheet.cssRules;}catch{continue;}
    const copy=document.createElement('style');copy.dataset.viewportMirror='true';owner.after(copy);mirrors.push({sheet,copy,disabled:sheet.disabled});sheet.disabled=true;
   }
   const matches=query=>root.matchMedia(query.replace(/\((min|max)-(width|height):\s*([\d.]+)px\)/g,(_,limit,axis,n)=>'('+((limit==='min'?(axis==='width'?width:height)>=Number(n):(axis==='width'?width:height)<=Number(n))?'min-width:0px':'min-width:1000000px')+')').replace(/\(orientation:\s*(landscape|portrait)\)/g,(_,orientation)=>'('+((orientation==='landscape'?width>=height:width<height)?'min-width:0px':'min-width:1000000px')+')')).matches;
   const serialize=rules=>[...rules].map(rule=>rule.type===4?(matches(rule.conditionText)?serialize(rule.cssRules):''):rule.cssText).join('\n');
   const sides=['top','right','bottom','left'],turn=state.rotation/90;
   const virtualCSS=text=>text.replace(/([\d.]+)(dvh|svh|lvh|vh|dvw|svw|lvw|vw|vmin|vmax)\b/g,(_,n,unit)=>(Number(n)*(unit==='vmin'?Math.min(width,height):unit==='vmax'?Math.max(width,height):unit.endsWith('vw')?width:height)/100)+'px').replace(/env\(safe-area-inset-(top|right|bottom|left)([^)]*)\)/g,(_,side,tail)=>'env(safe-area-inset-'+sides[(sides.indexOf(side)+turn+4)%4]+tail+')');
   for(const row of mirrors)row.copy.textContent=row.disabled?'':virtualCSS(serialize(row.sheet.cssRules));
  }
  function fit(){
   const scale=Math.max(.1,viewport?.scale||1),nativeWidth=(viewport?.width||root.innerWidth)*scale,nativeHeight=(viewport?.height||root.innerHeight)*scale,
    left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0;
   const portrait=nativeWidth<nativeHeight,nativeAngle=typeof root.orientation==='number'?root.orientation:root.screen?.orientation?.angle,rotation=rotationFor(nativeWidth,nativeHeight,nativeAngle),width=portrait?nativeHeight:nativeWidth,height=portrait?nativeWidth:nativeHeight;
   const next={width,height,scale,left,top,rotation};
   if(state&&Object.keys(next).every(k=>Math.abs(next[k]-state[k])<.01))return false;
   cancelGesture();
   state=next;const x=left+([90,180].includes(rotation)?nativeWidth/scale:0),y=top+([-90,180].includes(rotation)?nativeHeight/scale:0);
   Object.assign(app.style,{position:'fixed',left:'0px',top:'0px',right:'auto',bottom:'auto',width:width+'px',height:height+'px',touchAction:rotation?'none':'',transformOrigin:'0 0',transform:`translate(${x}px,${y}px) rotate(${rotation}deg) scale(${1/scale})`});
   app.dataset.viewRotation=String(rotation);responsiveSheets(width,height);
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
  root.addEventListener('resize',fit);root.addEventListener('orientationchange',fit);root.screen?.orientation?.addEventListener?.('change',fit);root.addEventListener('pageshow',fit);
  fit();return {fit,cancelGesture,point:(x,y)=>point(x,y,app),rect:element=>rect(element,app),get state(){return {...state};}};
 }
 root.ArcViewport={install,point,rect,rotationFor};
})(globalThis);
