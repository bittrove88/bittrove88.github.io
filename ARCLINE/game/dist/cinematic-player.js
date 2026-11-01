(function(root){'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const restricted=()=>!!(root.navigator?.connection?.saveData||root.navigator?.deviceMemory&&root.navigator.deviceMemory<=2||root.navigator?.hardwareConcurrency&&root.navigator.hardwareConcurrency<=2);
function framing(shot,w,h,t,reduced=false){
 const box=shot.protectedBox,progress=reduced?.5:clamp(t,0,1),a=shot.camera.start,b=shot.camera.end;
 const base=Math.max(w/shot.width,h/shot.height),bw=shot.width*base,bh=shot.height*base;
 const z=Math.max(1.04,Math.min(1.1,a.scale)),iw=bw*z,ih=bh*z;
 const focal=shot.focalPoint[w/h<1?'mobile':'desktop'],dx=b.focus[0]-a.focus[0],dy=b.focus[1]-a.focus[1],horizontal=Math.abs(dx)>=Math.abs(dy);
 // A bounded linear pan, centred on this shot's subject. Cover is never reduced.
 const travel=Math.min(.075,Math.abs(horizontal?dx:dy));
 const baseX=clamp(w/2-focal[0]*iw,w-iw,0),baseY=clamp(h/2-focal[1]*ih,h-ih,0);
 // Clamp endpoints before interpolation: edge compositions still pan at constant speed.
 const distance=Math.min((horizontal?iw-w:ih-h)*.8,(horizontal?iw:ih)*travel),sign=Math.sign(horizontal?dx:dy);
 const interpolate=(center,min,pan)=>{if(!pan||reduced)return center;const start=clamp(center+sign*distance/2,min,0),end=clamp(center-sign*distance/2,min,0);return start+(end-start)*progress;};
 const x=interpolate(baseX,w-iw,horizontal),y=interpolate(baseY,h-ih,!horizontal);
 return {x,y,scale:z,baseWidth:bw,baseHeight:bh,protected:{left:x+box[0]*iw,top:y+box[1]*ih,right:x+box[2]*iw,bottom:y+box[3]*ih}};
}
function create(host,options={}){
 let current=null,prior=null,token=0,age=0,closed=false;const cache=new Map(),timers=new Set(),stats={loads:0,failures:0,maxCached:0,frames:0},prefix=options.assetBase||root.ArcAssetBase||'../../';host.classList.add('cinematic-plate');
 const url=src=>root.ArcAssetLoader?root.ArcAssetLoader.resolve(src,prefix):new URL(prefix+src,document.baseURI).href,reduced=()=>options.reducedMotion?.()||root.matchMedia?.('(prefers-reduced-motion: reduce)').matches,cheap=()=>restricted()||options.lowPerformance===true;
 function load(shot){if(cache.has(shot.id))return cache.get(shot.id);
  const entry={image:null,shot,ok:false,done:false};stats.loads++;
  entry.promise=root.ArcAssetLoader.load(shot.src,{retries:2,timeout:10000,assetBase:prefix}).then(result=>{
   entry.ok=result.ok;entry.done=true;entry.image=result.image;
   if(!result.ok){stats.failures++;cache.delete(shot.id);}
   return entry;
  });cache.set(shot.id,entry);trim(shot.id);stats.maxCached=Math.max(stats.maxCached,cache.size);return entry;}

 function trim(keep){const protectedIds=new Set([keep,current?.shot.id,prior?.shot.id]);for(const [id,e]of cache){if(cache.size<=3)break;if(!protectedIds.has(id)){cache.delete(id);}}}
 function image(src,cls){const e=document.createElement('img');e.className=cls;e.alt='';e.setAttribute('aria-hidden','true');e.decoding='async';e.src=src;return e;}
 function build(shot){const el=document.createElement('div');el.className='cp-shot';el.dataset.shot=shot.id;el.dataset.transition=shot.transition.kind;el.setAttribute('role','img');el.setAttribute('aria-label',shot.scene==='E02'?(shot.locale==='en'?'The homecoming':'帰還を伝える場面'):shot.title);const ambient=image(url(shot.src),'cp-ambient'),plane=document.createElement('div');plane.className='cp-plane';plane.append(image(url(shot.src),'cp-master'));el.append(ambient,plane);
  const atmosphere=document.createElement('div');atmosphere.className='cp-atmosphere';atmosphere.setAttribute('aria-hidden','true');for(const [i,name]of shot.effects.entries()){const e=document.createElement('i');e.className='cp-effect fx-'+name;e.dataset.effect=name;e.dataset.depth=i%2?'.45':'.15';if(shot.light){e.style.left=shot.light[0]*100+'%';e.style.top=shot.light[1]*100+'%';}atmosphere.append(e);}plane.append(atmosphere);
  if(shot.homecoming){const centres=[[.300,.382],[.416,.411],[.524,.448],[.625,.478],[.713,.507],[.311,.603],[.431,.636],[.540,.667],[.645,.692],[.736,.711]];for(let i=0;i<10;i++){const e=document.createElement('i');e.className='cp-return-signal';e.dataset.signal=i;e.dataset.machine=root.ArcCinematicData.returnOrder[i];e.style.left=centres[i][0]*100+'%';e.style.top=centres[i][1]*100+'%';e.style.width=(7.2-(i%5)*.4)+'%';e.style.height=(10.8-(i%5)*.6)+'%';plane.append(e);}}
  if(shot.answerBeatsMs)for(let i=0;i<2;i++){const e=document.createElement('i');e.className='cp-answer-light';e.dataset.answer=i;e.style.left=(shot.light[0]-.04*i)*100+'%';e.style.top=(shot.light[1]-.10*i)*100+'%';plane.append(e);}
  let fragment=null;if(shot.fragment){fragment=document.createElement('figure');fragment.className='cp-fragment';fragment.setAttribute('aria-hidden','true');const crop=document.createElement('div');crop.className='cp-fragment-crop';const im=image(url(shot.src),'cp-fragment-image');crop.append(im);const c=shot.fragment.crop;im.style.width=100/(c[2]-c[0])+'%';im.style.height=100/(c[3]-c[1])+'%';im.style.left=-c[0]/(c[2]-c[0])*100+'%';im.style.top=-c[1]/(c[3]-c[1])*100+'%';fragment.style.aspectRatio=String((c[2]-c[0])*shot.width/((c[3]-c[1])*shot.height));if(shot.effects.includes('seal')){const seal=plane.querySelector('.cp-seal').cloneNode(true);seal.style.left=(.495-c[0])/(c[2]-c[0])*100+'%';seal.style.top=(.555-c[1])/(c[3]-c[1])*100+'%';seal.style.width=.055/(c[2]-c[0])*100+'%';seal.style.height=.085/(c[3]-c[1])*100+'%';crop.append(seal);}fragment.append(crop);el.append(fragment);}
  return {el,plane,ambient,atmosphere,fragment,shot,geometry:null};
 }
 function dispose(frame){if(!frame)return;for(const img of frame.el.querySelectorAll('img'))img.removeAttribute('src');frame.el.remove();}
 function show(shot,next=null){const ticket=++token;closed=false;age=0;if(prior)dispose(prior);prior=current;current=build(shot);current.el.style.opacity='0';host.append(current.el);host.dataset.shot=shot.id;host.dataset.asset='loading';host.dataset.lowPerformance=String(cheap());const own=current;load(shot).promise.then(e=>{if(ticket!==token||closed)return;host.dataset.asset=e.ok?'ready':'missing';own.el.hidden=!e.ok;options.onStatus?.(e.ok?'ready':'missing',shot);if(next)load(next);update(age);});trim(shot.id);update(0);}
 function update(seconds){if(!current||closed)return;age=seconds;const s=current.shot,w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;const rm=reduced(),low=cheap(),time=root.ArcCinematicData.clock(s,age*1000),motionAge=time.cameraMs/1000,effectAge=time.effectsMs/1000,t=clamp(motionAge/(s.durationMs/1000),0,1),g=framing(s,w,h,t,rm||low);current.geometry=g;stats.frames++;host.dataset.phase=time.phase;current.plane.style.width=g.baseWidth+'px';current.plane.style.height=g.baseHeight+'px';current.plane.style.transform=`translate3d(${g.x}px,${g.y}px,0) scale(${g.scale})`;
  const ready=host.dataset.asset==='ready',fade=rm?1:ease(age/(s.transition.durationMs/1000));current.el.style.opacity=ready?String(fade):'0';if(prior){prior.el.style.opacity=String(ready?1-fade:0);if(fade===1){dispose(prior);prior=null;trim(s.id);}}
  for(const e of current.atmosphere.children){let alpha=.28,move=0;const type=e.dataset.effect;if(type==='fog'){alpha=.26;move=rm||low?0:ease(t)*10;}if(['signal','answer','connection','reply'].includes(type))alpha=rm?.24:.12+.25*Math.sin(Math.PI*clamp(effectAge/5,0,1));if(type==='answer'&&s.answerBeatsMs)alpha=0;if(type==='shutdown')alpha=.3*(1-ease((effectAge-1)/8));if(type==='dim')alpha=.3;if(type==='core')alpha=.22;if(type==='emblem'||type==='seal')alpha=0;e.style.opacity=String(alpha);e.style.transform=`translate3d(${move*(+e.dataset.depth||.15)}px,0,0)`;}
  for(const e of current.plane.querySelectorAll('[data-signal]')){const on=+e.dataset.signal<time.litCount;e.style.opacity=on?'.6':'0';e.dataset.lit=String(on);}
  for(const e of current.plane.querySelectorAll('[data-answer]'))e.style.opacity=String(.32*ease((effectAge-s.answerBeatsMs[+e.dataset.answer]/1000)/.45));
  if(current.fragment){const f=s.fragment,on=!rm&&!low&&!time.quiet&&effectAge>f.start&&effectAge<f.end,opacity=on?Math.sin(Math.PI*(effectAge-f.start)/(f.end-f.start)):0;current.fragment.style.opacity=String(opacity);current.fragment.style.left=(w/h<1?Math.min(.65,f.at[0]):f.at[0])*100+'%';current.fragment.style.top=f.at[1]*100+'%';current.fragment.style.transform=`translate3d(0,${on?-6*Math.sin(Math.PI*(effectAge-f.start)/(f.end-f.start)):0}px,0)`;}
 }
 function destroy(){closed=true;token++;for(const t of timers)clearTimeout(t);timers.clear();cache.clear();dispose(current);dispose(prior);host.replaceChildren();current=prior=null;delete host.dataset.shot;delete host.dataset.asset;}
 return {show,update,destroy,get state(){return {shot:current?.shot.id,age,status:host.dataset.asset,geometry:current?.geometry,cached:cache.size,lowPerformance:cheap(),...stats};}};
}
const api={create,framing,ease,restricted};if(typeof module!=='undefined')module.exports=api;else root.ArcCinematicPlayer=api;
})(globalThis);
