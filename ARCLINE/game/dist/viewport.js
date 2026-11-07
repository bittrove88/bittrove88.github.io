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
  let state=null,mirrors=[],scrollGesture=null,fitFrame=0;
  const scrollTouches=new Set();
  const safeProbe=document.createElement('div');safeProbe.dataset.viewportSafeArea='true';safeProbe.setAttribute('aria-hidden','true');safeProbe.style.cssText='position:fixed;visibility:hidden;pointer-events:none;width:0;height:0;padding-top:env(safe-area-inset-top,0px);padding-right:env(safe-area-inset-right,0px);padding-bottom:env(safe-area-inset-bottom,0px);padding-left:env(safe-area-inset-left,0px)';document.body.append(safeProbe);
  const viewport=root.visualViewport,options={passive:false,capture:true};
  function cancelGesture(){
   const id=scrollGesture?.id;for(const row of scrollGesture?.snaps||[])row.node.style.scrollSnapType=row.snap;scrollGesture=null;
   if(id!==undefined)try{if(app.hasPointerCapture(id))app.releasePointerCapture(id);}catch{}
  }
  const excluded=e=>e.target?.closest?.('#world,#stick,#aimStick,#fire,#mapCameraPan,input,select,textarea');
  function scrollParents(target){
   const rows=[];
   for(let node=target;node&&node!==app;node=node.parentElement)if(node instanceof Element){
    const css=getComputedStyle(node),x=/auto|scroll/.test(css.overflowX)&&node.scrollWidth>node.clientWidth+1,y=/auto|scroll/.test(css.overflowY)&&(node.scrollHeight>node.clientHeight+1||node.matches('.stock-scroll'));
    if(x||y)rows.push({node,x,y});
   }
   return rows;
  }
  function preventTrailingClick(){
   let timer;const cleanup=()=>{document.removeEventListener('click',click,true);document.removeEventListener('pointerdown',cleanup,true);root.clearTimeout(timer);},click=e=>{if(e.detail===0)return;cleanup();e.preventDefault();e.stopImmediatePropagation();};
   document.addEventListener('click',click,true);document.addEventListener('pointerdown',cleanup,true);timer=root.setTimeout(cleanup,400);
  }
  app.addEventListener('pointerdown',e=>{
   if(e.pointerType!=='touch')return;scrollTouches.add(e.pointerId);
   if(scrollTouches.size>1){if(scrollGesture?.dragged)preventTrailingClick();cancelGesture();return;}
   if(!state?.rotation||scrollGesture||app.inert||excluded(e))return;
   const parents=scrollParents(e.target);if(!parents.length)return;
   const p=point(e.clientX,e.clientY,app);scrollGesture={id:e.pointerId,start:p,last:p,parents,dragged:false,snaps:[]};
  },true);
  app.addEventListener('pointermove',e=>{
   const g=scrollGesture;if(g?.id!==e.pointerId)return;if(app.inert){cancelGesture();return;}
   const p=point(e.clientX,e.clientY,app),dx=p.x-g.start.x,dy=p.y-g.start.y;
   if(!g.dragged){
    if(Math.max(Math.abs(dx),Math.abs(dy))<8)return;
    const axis=Math.abs(dx)>Math.abs(dy)?'x':'y';if(!g.parents.some(row=>row[axis]))return;
    g.axis=axis;g.dragged=true;
    for(const {node}of g.parents.filter(row=>row[axis])){g.snaps.push({node,snap:node.style.scrollSnapType});node.style.scrollSnapType='none';}
    try{app.setPointerCapture(e.pointerId);}catch{}
   }
   e.preventDefault();e.stopImmediatePropagation();let delta=g.last[g.axis]-p[g.axis];g.last=p;
   const position=g.axis==='x'?'scrollLeft':'scrollTop',extent=g.axis==='x'?'scrollWidth':'scrollHeight',size=g.axis==='x'?'clientWidth':'clientHeight';
   for(const row of g.parents){if(!row[g.axis])continue;const node=row.node,old=node[position];node[position]=Math.max(0,Math.min(node[extent]-node[size],old+delta));delta-=node[position]-old;if(Math.abs(delta)<.5)break;}
  },true);
  app.addEventListener('pointerup',e=>{
   scrollTouches.delete(e.pointerId);const g=scrollGesture;if(g?.id!==e.pointerId)return;
   if(g.dragged){e.preventDefault();e.stopImmediatePropagation();preventTrailingClick();}cancelGesture();
  },true);
  app.addEventListener('pointercancel',e=>{scrollTouches.delete(e.pointerId);if(scrollGesture?.id===e.pointerId)cancelGesture();},true);
  app.addEventListener('wheel',e=>{
   if(!state?.rotation||e.ctrlKey||excluded(e))return;const parents=scrollParents(e.target);if(!parents.length)return;
   const axis=e.shiftKey||Math.abs(e.deltaX)>Math.abs(e.deltaY)||parents[0].x&&!parents[0].y?'x':'y';
   const position=axis==='x'?'scrollLeft':'scrollTop',extent=axis==='x'?'scrollWidth':'scrollHeight',size=axis==='x'?'clientWidth':'clientHeight';
   e.preventDefault();let delta=(axis==='x'?e.deltaX||e.deltaY:e.deltaY)*(e.deltaMode===1?16:e.deltaMode===2?app[size]:1);
   for(const row of parents){if(!row[axis])continue;const node=row.node,old=node[position];node[position]=Math.max(0,Math.min(node[extent]-node[size],old+delta));delta-=node[position]-old;if(Math.abs(delta)<.5)break;}
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
   // The outer app frame already excludes the native safe area. Do not apply
   // the same inset again inside rotated panels.

   const virtualCSS=text=>text.replace(/([\d.]+)(dvh|svh|lvh|vh|dvw|svw|lvw|vw|vmin|vmax)\b/g,(_,n,unit)=>(Number(n)*(unit==='vmin'?Math.min(width,height):unit==='vmax'?Math.max(width,height):unit.endsWith('vw')?width:height)/100)+'px').replace(/env\(safe-area-inset-(top|right|bottom|left)([^)]*)\)/g,()=> '0px');
   for(const row of mirrors)row.copy.textContent=row.disabled?'':virtualCSS(serialize(row.sheet.cssRules));
  }
  function fit(){
   const scale=Math.max(.1,viewport?.scale||1),editing=document.activeElement?.matches?.('input,textarea,select,[contenteditable="true"]');
   // iOS standalone can retain Safari's shorter visualViewport after launch or
   // resume. Its unzoomed layout viewport is the actual application window.
   const standalone=!!root.navigator?.standalone||root.matchMedia('(display-mode: standalone)').matches;
   const layout=standalone&&Math.abs(scale-1)<.01&&!editing;
   const fullWidth=layout?root.innerWidth:(viewport?.width||root.innerWidth)*scale,fullHeight=layout?root.innerHeight:(viewport?.height||root.innerHeight)*scale;
   const css=getComputedStyle(safeProbe),inset=side=>Math.max(0,parseFloat(css.getPropertyValue('padding-'+side))||0);
   const safeLeft=inset('left'),safeRight=inset('right'),safeTop=inset('top'),safeBottom=editing&&fullHeight<root.innerHeight-80?0:inset('bottom');
   const nativeWidth=Math.max(1,fullWidth-safeLeft-safeRight),nativeHeight=Math.max(1,fullHeight-safeTop-safeBottom),left=(layout?0:viewport?.offsetLeft||0)+safeLeft/scale,top=(layout?0:viewport?.offsetTop||0)+safeTop/scale;
   const portrait=fullWidth<fullHeight,nativeAngle=typeof root.orientation==='number'?root.orientation:root.screen?.orientation?.angle,rotation=rotationFor(fullWidth,fullHeight,nativeAngle),width=portrait?nativeHeight:nativeWidth,height=portrait?nativeWidth:nativeHeight;
   const next={width,height,scale,left,top,rotation};
   if(state&&Object.keys(next).every(k=>Math.abs(next[k]-state[k])<.01))return false;
   cancelGesture();scrollTouches.clear();
   state=next;const x=left+([90,180].includes(rotation)?nativeWidth/scale:0),y=top+([-90,180].includes(rotation)?nativeHeight/scale:0);
   Object.assign(app.style,{position:'fixed',left:'0px',top:'0px',right:'auto',bottom:'auto',width:width+'px',height:height+'px',touchAction:rotation?'none':'',transformOrigin:'0 0',transform:`translate(${x}px,${y}px) rotate(${rotation}deg) scale(${1/scale})`});
   app.dataset.viewRotation=String(rotation);responsiveSheets(width,height);
   app.dataset.viewportFitted=scale>1.01?'true':'false';onChange(next);return true;
  }
  function scheduleFit(){if(!fitFrame)fitFrame=root.requestAnimationFrame(()=>{fitFrame=0;fit();});}
  function resumeFit(){scheduleFit();root.setTimeout(scheduleFit,120);}
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
  viewport?.addEventListener('resize',scheduleFit);viewport?.addEventListener('scroll',scheduleFit);
  root.addEventListener('resize',scheduleFit);root.addEventListener('orientationchange',resumeFit);root.screen?.orientation?.addEventListener?.('change',resumeFit);root.addEventListener('pageshow',resumeFit);root.addEventListener('blur',()=>{cancelGesture();scrollTouches.clear();});
  fit();return {fit,cancelGesture,point:(x,y)=>point(x,y,app),rect:element=>rect(element,app),get state(){return {...state};}};
 }
 root.ArcViewport={install,point,rect,rotationFor};
})(globalThis);
