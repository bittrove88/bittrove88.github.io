(function(){
'use strict';
const $=id=>document.getElementById(id),A=globalThis.ArcCharacters,scenes=globalThis.ArcSiteScenes;
if(!A||!scenes)return;
let language='ja',machineId='gun',featureId='reflection',paused=matchMedia('(prefers-reduced-motion: reduce)').matches,clock=0,previous=0,raf=0;
try{if(localStorage.getItem('arcline-language')==='en')language='en';}catch{}
const captions={reflection:{ja:'地面を使って、回り込む。',en:'Let the ground open a new angle.',index:'01 / REFLECT'},destruction:{ja:'遮蔽物を壊して、道をひらく。',en:'Break the cover. Open the way.',index:'02 / BREAK'},teleport:{ja:'着弾した場所が、次の射点。',en:'Your impact becomes your next position.',index:'03 / TELEPORT'}};
function translate(){
 document.documentElement.lang=language;for(const e of document.querySelectorAll('[data-ja][data-en]'))e.textContent=e.dataset[language];
 $('languageButton').textContent=language==='ja'?'EN ↗':'日本語 ↗';$('languageButton').setAttribute('aria-label',language==='ja'?'Switch to English':'日本語に切り替え');
 $('menuButton').setAttribute('aria-label',language==='ja'?'メニューを開く':'Open navigation');
 $('demoCaption').textContent=captions[featureId][language];$('motionButton').setAttribute('aria-label',language==='ja'?(paused?'プレビューを再生':'プレビューを一時停止'):(paused?'Play preview':'Pause preview'));
 $('featureCanvas').setAttribute('aria-label',captions[featureId][language]);
 $('heroCanvas').setAttribute('aria-label',language==='ja'?'重戦車ガンと丘を越える弾道':'GUN, a heavy tank, fires across a valley');
 $('mainNav').setAttribute('aria-label',language==='ja'?'メインナビゲーション':'Main navigation');$('machinePicker').setAttribute('aria-label',language==='ja'?'紹介する機体を選ぶ':'Choose a machine to explore');
 updateMachine(false);
}
function updateMachine(repaint=true){
 const c=A.get(machineId),n=A.characters.indexOf(c)+1;$('machineName').textContent=c.name;$('machineJapanese').textContent=c.nameJa;
 $('machineRole').textContent=language==='ja'?c.roleJa:c.role;$('machineMotto').textContent=language==='ja'?c.mottoJa:c.motto;
 $('machineCounter').textContent=String(n).padStart(2,'0')+' / 10';$('machineFeature').style.setProperty('--machine-color',c.shade);
 $('machineCanvas').setAttribute('aria-label',language==='ja'?c.nameJa+'のゲーム内キャラクター描画':c.name+' in-game machine drawing');
 $('machinePalette').replaceChildren(...[c.color,c.trim,'#40525b',c.accent].map(color=>{const e=document.createElement('i');e.style.background=color;return e;}));
 for(const b of $('machinePicker').querySelectorAll('button')){b.setAttribute('aria-pressed',String(b.dataset.machine===c.id));b.setAttribute('aria-label',language==='ja'?A.get(b.dataset.machine).nameJa:A.get(b.dataset.machine).name);}
 if(repaint)A.paint($('machineCanvas'),machineId,{angle:machineId==='sora'?58:20});
}
for(const c of A.characters){const b=document.createElement('button');b.className='machine-thumb';b.type='button';b.dataset.machine=c.id;b.setAttribute('aria-pressed',String(c.id===machineId));b.innerHTML=A.markup(c.id)+'<strong>'+c.name+'</strong>';b.onclick=()=>{machineId=c.id;updateMachine();};$('machinePicker').append(b);}
$('languageButton').onclick=()=>{language=language==='ja'?'en':'ja';try{localStorage.setItem('arcline-language',language);}catch{}translate();};
function closeMenu(){$('menuButton').setAttribute('aria-expanded','false');document.querySelector('.site-header').classList.remove('menu-open');}
$('menuButton').onclick=()=>{const open=$('menuButton').getAttribute('aria-expanded')!=='true';$('menuButton').setAttribute('aria-expanded',String(open));document.querySelector('.site-header').classList.toggle('menu-open',open);};
for(const a of $('mainNav').querySelectorAll('a'))a.addEventListener('click',closeMenu);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('menuButton').getAttribute('aria-expanded')==='true'){closeMenu();$('menuButton').focus();}});
function selectFeature(id){featureId=id;clock=0;for(const b of document.querySelectorAll('[data-feature]')){const selected=b.dataset.feature===id;b.classList.toggle('active',selected);b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;}$('featurePanel').setAttribute('aria-labelledby','feature-'+id);$('demoIndex').textContent=captions[id].index;$('featureCanvas').setAttribute('aria-label',language==='ja'?captions[id].ja:captions[id].en);$('demoCaption').textContent=captions[id][language];drawFeature();}
for(const b of document.querySelectorAll('[data-feature]')){b.onclick=()=>selectFeature(b.dataset.feature);b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowDown','ArrowUp','Home','End'].includes(e.key))return;e.preventDefault();const items=[...document.querySelectorAll('[data-feature]')],index=items.indexOf(b),next=e.key==='Home'?0:e.key==='End'?items.length-1:(index+(['ArrowRight','ArrowDown'].includes(e.key)?1:-1)+items.length)%items.length;selectFeature(items[next].dataset.feature);items[next].focus();};}
$('motionButton').onclick=()=>{paused=!paused;$('motionButton').setAttribute('aria-pressed',String(paused));$('motionButton').classList.toggle('is-paused',paused);translate();drawHero();drawFeature();schedule();};
function surface(canvas){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return null;const dpr=Math.min(devicePixelRatio||1,2);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.lineCap='round';ctx.lineJoin='round';return {ctx,w,h};}
function poly(ctx,points,fill,stroke=null,width=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function dot(ctx,x,y,r,fill,stroke=null,width=1){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function line(ctx,points,color,width=2,dash=[]){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);}
function rival(ctx,x,y,scale,dir=-1){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);const u={x:0,y:0,slope:0,hp:3,parts:[]};ArcVisualArt.drawActor(ctx,'enemy:pebble',u,{dir,muzzle:A.pose({dir,angle:32}),dpr:Math.min(devicePixelRatio||1,2),kind:'enemy'});ctx.restore();}
function drawHero(){const s=surface($('heroCanvas'));if(!s)return;const {ctx,w,h}=s;ctx.fillStyle='#d5dfd1';ctx.fillRect(0,0,w,h);dot(ctx,w*.8,h*.25,Math.min(w,h)*.105,'#f1ecd3');
 for(let layer=0;layer<4;layer++){const p=[{x:0,y:h}];for(let x=0;x<=w+10;x+=10)p.push({x,y:h*(.38+layer*.1)+Math.sin(x/w*7+layer*1.8)*h*.055+Math.cos(x/w*14+layer)*h*.025});p.push({x:w,y:h});poly(ctx,p,['#b6cbbe','#94b6ab','#78a199','#5c8c88'][layer]);}
 const left=[{x:-10,y:h*.78},{x:w*.46,y:h*.63},{x:w*.51,y:h*.7},{x:w*.52,y:h},{x:-10,y:h}],right=[{x:w*.67,y:h*.62},{x:w*1.04,y:h*.5},{x:w*1.04,y:h},{x:w*.75,y:h*.83}];
 poly(ctx,left,'#386c73','#d9e8cb',2);poly(ctx,right,'#426f72','#d9e8cb',2);line(ctx,[{x:w*.03,y:h*.8},{x:w*.33,y:h*.67},{x:w*.48,y:h*.72}],'#a5c5b14d',1);
 for(let i=0;i<10;i++)line(ctx,[{x:w*.07,y:h*(.83+i*.016)},{x:w*.47,y:h*(.76+i*.018)}],'#a5c5b11c',1);
 const x=w*.28,slope=Math.atan2(-h*.15,w*.46+10),y=h*.78+(x+10)*Math.tan(slope),scale=Math.min(w/200,h/210,2.8),angle=34,m=A.pose({angle,slope});ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);A.draw(ctx,'gun',{angle,slope,muzzle:m});ctx.restore();
 rival(ctx,w*.87,h*.56,scale*.57);const start={x:x+m.x*scale,y:y+m.y*scale},end={x:w*.87,y:h*.52},control={x:start.x+w*.18,y:start.y+w*.18*Math.tan(m.theta)};
 const points=[];for(let i=0;i<=60;i++){const t=i/60;points.push({x:(1-t)**2*start.x+2*(1-t)*t*control.x+t*t*end.x,y:(1-t)**2*start.y+2*(1-t)*t*control.y+t*t*end.y});}line(ctx,points,'#f2dec4',2,[5,7]);const p=points[paused&&clock===0?42:Math.floor(clock*14)%61];dot(ctx,p.x,p.y,4,'#d66a3c','#f7ecd1',1.5);
 // Small registration marks echo an arcade field guide, without changing the game.
 ctx.strokeStyle='#436c633f';ctx.lineWidth=1;for(const [xx,yy]of[[24,h*.4],[w-24,h*.74]]){ctx.beginPath();ctx.moveTo(xx-5,yy);ctx.lineTo(xx+5,yy);ctx.moveTo(xx,yy-5);ctx.lineTo(xx,yy+5);ctx.stroke();}
}
function drawFeature(){
 const surf=surface($('featureCanvas'));if(!surf)return;const {ctx,w,h}=surf,s=scenes[featureId],duration=s.duration/.68+2.3,t=paused&&clock===0?s.duration/.68+1.2:clock%duration,flight=Math.max(0,(t-.65)*.68),result=flight>=s.duration;
 ctx.fillStyle='#163f50';ctx.fillRect(0,0,w,h);ctx.save();ctx.beginPath();ctx.rect(0,43,w,h-97);ctx.clip();
 const xs=[s.before.units[0].x,...s.path.map(p=>p.x)],ys=[s.before.units[0].y-80,...s.path.map(p=>p.y)];if(featureId==='reflection'){xs.push(s.before.units[1].x);ys.push(s.before.units[1].y-60);}
 const minX=Math.min(...xs)-65,maxX=Math.max(...xs)+65,minY=Math.min(...ys)-18,maxY=Math.max(...ys,s.before.units[0].y)+28,scale=Math.min((w-35)/Math.max(350,maxX-minX),(h-112)/Math.max(165,maxY-minY),1.65);
 const ox=w/2-(minX+maxX)*.5*scale,oy=48+(h-106)/2-(minY+maxY)*.5*scale;ctx.translate(ox,oy);ctx.scale(scale,scale);
 const display=result&&featureId==='destruction'?s.after:s.before;
 for(const solid of display.solids)ArcVisualArt.drawSolid(ctx,solid,display.world,{theme:display.spec.theme,dpr:Math.min(devicePixelRatio||1,2)});
 let u={...s.before.units[0]};if(featureId==='teleport'&&result){const after=s.after.units[0],k=Math.min(1,(flight-s.duration)*3),from=after.animation?.from||after;u={...after,x:from.x+(after.x-from.x)*k,y:from.y+(after.y-from.y)*k};dot(ctx,s.before.units[0].x,s.before.units[0].y-20,25,null,'#a0d6d15e',2/scale);}
 A.draw(ctx,'gun',{x:u.x,y:u.y,slope:u.slope||0,angle:s.angle});if(featureId==='reflection')rival(ctx,s.before.units[1].x,s.before.units[1].y,1);
 ArcEffects.forContext(ctx).draw(s.plan,flight,{scale,reducedMotion:paused});
 ctx.restore();
}
const visible=new Set();if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{for(const e of entries)e.isIntersecting?visible.add(e.target.id):visible.delete(e.target.id);schedule();},{rootMargin:'80px'});observer.observe($('heroCanvas'));observer.observe($('featureCanvas'));}else{visible.add('heroCanvas');visible.add('featureCanvas');}
function frame(t){raf=0;if(document.hidden||paused)return;if(t-previous>=32||!previous){clock+=previous?Math.min(.08,(t-previous)/1000):0;previous=t;if(visible.has('heroCanvas'))drawHero();if(visible.has('featureCanvas'))drawFeature();}schedule();}
function schedule(){if(!raf&&!paused&&!document.hidden&&visible.size)raf=requestAnimationFrame(frame);}
document.addEventListener('visibilitychange',()=>{previous=0;if(document.hidden){cancelAnimationFrame(raf);raf=0;}else schedule();});
let resize=0;addEventListener('resize',()=>{cancelAnimationFrame(resize);resize=requestAnimationFrame(()=>{drawHero();drawFeature();A.paintAll($('machinePicker'));updateMachine();});});
$('motionButton').setAttribute('aria-pressed',String(paused));$('motionButton').classList.toggle('is-paused',paused);selectFeature('reflection');translate();A.paintAll($('machinePicker'));updateMachine();drawHero();drawFeature();schedule();
globalThis.ArcSite={get language(){return language;},get machine(){return machineId;},get feature(){return featureId;},get paused(){return paused;},selectFeature};
})();
