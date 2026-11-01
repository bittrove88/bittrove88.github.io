(function(){
'use strict';
const $=id=>document.getElementById(id),A=globalThis.ArcCharacters,scenes=globalThis.ArcSiteScenes;
if(!A||!scenes)return;
let language='ja',machineId='gun',featureId='reflection',paused=matchMedia('(prefers-reduced-motion: reduce)').matches,clock=0,previous=0,raf=0;
try{if(localStorage.getItem('arcline-language')==='en')language='en';}catch{}
const captions={reflection:{ja:'地面を使って、回り込む。',en:'Let the ground open a new angle.',index:'01 / REFLECT'},destruction:{ja:'遮蔽物を壊して、道をひらく。',en:'Break the cover. Open the way.',index:'02 / BREAK'},teleport:{ja:'着弾した場所が、次の射点。',en:'Your impact becomes your next position.',index:'03 / TELEPORT'}};
function translate(){
 ArcI18n.setLanguage(language);
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
 const c=A.get(machineId),n=ArcCrew.rows.findIndex(r=>r.id===c.id)+1;$('machineName').textContent=c.name;$('machineJapanese').textContent=c.nameJa;
 $('machineRole').textContent=language==='ja'?c.roleJa:c.role;$('machineMotto').textContent=language==='ja'?c.mottoJa:c.motto;
 const crew=ArcCrew.get(machineId),profile=ArcCombat.get(machineId);$('machinePersonality').textContent=ArcStory.pick(crew.charm,language)+' '+ArcStory.pick(crew.desire,language);$('machineNormal').textContent=language==='ja'?ArcI18n.t(profile.normalNote):profile.normalNote;$('machineSpecial').textContent=(language==='ja'?ArcI18n.t(profile.special.name):profile.special.name)+' — '+(language==='ja'?ArcI18n.t(profile.specialNote):profile.specialNote);$('machineTerrain').textContent=language==='ja'?({gun:'近い射点・破壊可能な遮蔽',hana:'狙いやすい中距離・幅のある目標',koro:'連続する床・低い天井',ban:'前方へ続く道・押し出す空間',sora:'高い壁・山の裏・上からの着弾',hibari:'開けた射線・届きにくい相手の近く',rico:'安全な反射路・角度を読める鏡面',mogu:'ひび割れた壁・掘る順番のある地形',rin:'遮蔽を外した長い射線・狭い弱点',yui:'有利な着弾点へ引き寄せる位置取り'})[machineId]:({gun:'Close positions and breakable cover',hana:'Broad targets at medium range',koro:'Continuous floors and low roofs',ban:'Forward lanes and room to push',sora:'High walls, mountain shadows and overhead impacts',hibari:'Clear routes toward distant opponents',rico:'Readable mirror angles and safe ricochet routes',mogu:'Cracked walls and ordered excavation',rin:'Long open lanes and narrow weak points',yui:'Positions that pull a rival toward a useful impact'})[machineId];$('machineJoin').textContent=crew.stage===0?(language==='ja'?'最初の相棒':'Your first companion'):(language==='ja'?crew.stage+'面クリアで合流':'Joins after stage '+crew.stage);
 $('machineCounter').textContent=String(n).padStart(2,'0')+' / 10';$('machineFeature').style.setProperty('--machine-color',c.shade);
 $('machineCanvas').setAttribute('aria-label',language==='ja'?c.nameJa+'のゲーム内キャラクター描画':c.name+' in-game machine drawing');
 $('machinePalette').replaceChildren(...[c.color,c.trim,'#40525b',c.accent].map(color=>{const e=document.createElement('i');e.style.background=color;return e;}));
 for(const b of $('machinePicker').querySelectorAll('button')){b.setAttribute('aria-pressed',String(b.dataset.machine===c.id));b.setAttribute('aria-label',language==='ja'?A.get(b.dataset.machine).nameJa:A.get(b.dataset.machine).name);}
 if(repaint)A.paint($('machineCanvas'),machineId,{angle:machineId==='sora'?58:20});
}
for(const r of ArcCrew.rows){const c=A.get(r.id),b=document.createElement('button');b.className='machine-thumb';b.type='button';b.dataset.machine=c.id;b.setAttribute('aria-pressed',String(c.id===machineId));b.innerHTML=A.markup(c.id)+'<strong>'+c.name+'</strong>';b.onclick=()=>{machineId=c.id;updateMachine();};$('machinePicker').append(b);}
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

 // Small registration marks echo an arcade field guide, without changing the game.
 ctx.strokeStyle='#436c633f';ctx.lineWidth=1;for(const [xx,yy]of[[24,h*.4],[w-24,h*.74]]){ctx.beginPath();ctx.moveTo(xx-5,yy);ctx.lineTo(xx+5,yy);ctx.moveTo(xx,yy-5);ctx.lineTo(xx,yy+5);ctx.stroke();}
}
function drawFeature(){
 const surf=surface($('featureCanvas'));if(!surf)return;const {ctx,w,h}=surf,scene=scenes[featureId],length=step=>.9+step.plan.duration/.75+1.2,total=scene.steps.reduce((n,s)=>n+length(s),0);let time=paused&&clock===0?total-.01:clock%total,index=0;
 while(index<scene.steps.length-1&&time>=length(scene.steps[index]))time-=length(scene.steps[index++]);const step=scene.steps[index],flight=Math.max(0,(time-.9)*.75),result=flight>=step.plan.duration,state=result?step.after:step.before;
 const caption=scene.reason[language]+' '+step.label[language];if($('demoCaption').textContent!==caption)$('demoCaption').textContent=caption;
 $('demoIndex').textContent=captions[featureId].index+' · '+(index+1)+'/'+scene.steps.length;
 ctx.fillStyle='#173f50';ctx.fillRect(0,0,w,h);ctx.save();ctx.beginPath();ctx.rect(0,43,w,h-99);ctx.clip();
 const points=scene.steps.flatMap(s=>[...s.plan.path,...s.before.units.map(u=>({x:u.x,y:u.y-95})),...s.after.units.map(u=>({x:u.x,y:u.y}))]);
 const minX=Math.min(...points.map(p=>p.x))-60,maxX=Math.max(...points.map(p=>p.x))+60,minY=Math.min(...points.map(p=>p.y))-24,maxY=Math.max(...points.map(p=>p.y))+30,scale=Math.min((w-28)/(maxX-minX),(h-112)/(maxY-minY));
 ctx.translate(w/2-(minX+maxX)*scale/2,48+(h-108)/2-(minY+maxY)*scale/2);ctx.scale(scale,scale);
 for(const solid of state.world.solids)ArcVisualArt.drawSolid(ctx,solid,state.world,{theme:state.spec.theme,dpr:Math.min(devicePixelRatio||1,2)});
 if(featureId==='teleport'&&index>0){const origin=scene.steps[0].before.units[0];dot(ctx,origin.x,origin.y-20,24,null,'#a9d8c978',2/scale);line(ctx,[{x:origin.x,y:origin.y-14},{x:scene.steps[0].after.units[0].x,y:scene.steps[0].after.units[0].y-14}],'#8ac6b45c',1/scale,[4/scale,7/scale]);}
 for(let side=0;side<2;side++){
  let u={...state.units[side]};if(step.walkFrom&&step.walkSide===side&&time<.9){const t=time/.9;u.x=step.walkFrom.x+(u.x-step.walkFrom.x)*t;u.y=step.walkFrom.y+(u.y-step.walkFrom.y)*t;}
  if(side===0&&featureId==='teleport'&&index===0&&result){const end=step.after.units[0],from=end.animation?.from||end,t=Math.min(1,(flight-step.plan.duration)*3);u={...end,x:from.x+(end.x-from.x)*t,y:from.y+(end.y-from.y)*t};}
  const facing=u.facing||(side?-1:1),angle=step.plan.side===side?step.plan.angle:(state.angle||32),drawState={...state,units:state.units.map((v,i)=>i===side?u:v)},muzzle=ArcEngine.geometry.muzzle(drawState,side,angle);
  if(side)ArcVisualArt.drawActor(ctx,state.spec.encounterId,u,{state:drawState,side,kind:'enemy',muzzle,dir:facing,dpr:Math.min(devicePixelRatio||1,2)});else A.draw(ctx,state.characterId,{x:u.x,y:u.y,slope:u.slope||0,dir:facing,muzzle});
  ctx.font='650 '+(12/scale)+'px system-ui';ctx.textAlign='center';ctx.fillStyle=side?'#ffd7b0':'#e8efbc';ctx.fillText(language==='ja'?(side?'敵':'自機'):(side?'RIVAL':'YOU'),u.x,u.y-73);
 }
 ArcEffects.forContext(ctx).draw(step.plan,flight,{scale,reducedMotion:paused});
 for(const event of step.plan.events.filter(e=>e.type==='bounce'&&e.t<=flight))dot(ctx,event.x,event.y,6/scale,null,'#e5edbc',1.5/scale);
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
