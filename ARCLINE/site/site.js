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
 $('heroCanvas').setAttribute('aria-label',language==='ja'?'白石と淡い青緑の空中庭園81面のゲーム内地形':'Stage81: the pale stone and jade terrain of the Sky Gardens');
 for(const e of document.querySelectorAll('[data-alt-ja]'))e.alt=language==='ja'?e.dataset.altJa:e.dataset.altEn;
 $('mainNav').setAttribute('aria-label',language==='ja'?'メインナビゲーション':'Main navigation');$('machinePicker').setAttribute('aria-label',language==='ja'?'紹介する機体を選ぶ':'Choose a machine to explore');
 if($('siteVersion'))$('siteVersion').textContent='ARCLINE · '+ArcRelease.version;
 updateMachine(false);
 for(const canvas of document.querySelectorAll("canvas[data-site-stage]")){const name=canvas.closest("article").querySelector("h3").dataset[language];canvas.setAttribute("aria-label",language==="ja"?canvas.dataset.siteStage+"面 "+name+"のマップ":"Stage "+canvas.dataset.siteStage+": "+name);}
 drawHero();drawFeature();drawMaps();
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
$('motionButton').onclick=()=>{paused=!paused;$('motionButton').setAttribute('aria-pressed',String(paused));$('motionButton').classList.toggle('is-paused',paused);translate();schedule();};
const E=globalThis.ArcEngine,Camera=globalThis.ArcMapCamera;
const renderers=new WeakMap();
// The production renderer annotates this HUD host on touch screens.
const hudHost=document.createElement('div');hudHost.id='battle';hudHost.hidden=true;hudHost.setAttribute('inert','');document.body.append(hudHost);
const heroState=E.campaign(81,{equippedCharacterId:'gun',matchSeed:77,difficulty:'normal',battleInventory:{}});
const mapPreviews=[...document.querySelectorAll('canvas[data-site-stage]')].map(canvas=>({canvas,state:E.campaign(Number(canvas.dataset.siteStage),{equippedCharacterId:'gun',matchSeed:77,difficulty:'normal',battleInventory:{}})}));
function drawNative(canvas,state,{area,inset={left:10,right:10,top:10,bottom:10},...options}={}){
 const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
 let renderer=renderers.get(canvas);if(!renderer){renderer=ArcRender.create(canvas);renderers.set(canvas,renderer);}
 const cameraView=Camera.fit(area||Camera.bounds(state),{left:inset.left,top:inset.top,width:Math.max(1,w-inset.left-inset.right),height:Math.max(1,h-inset.top-inset.bottom)});
 renderer.draw(state,{cameraView,presentationFrame:{top:0,bottom:h},canAim:false,reducedMotion:paused,time:clock,...options});
 canvas.dataset.stage=state.stage;canvas.dataset.scene=ArcBackgrounds.sceneFor(state).id;
}
function drawHero(){drawNative($('heroCanvas'),heroState);}
function drawMaps(){for(const entry of mapPreviews)drawNative(entry.canvas,entry.state,{time:0,reducedMotion:true});}
const sceneAreas=new Map();
function sceneArea(scene){
 if(sceneAreas.has(scene.id))return sceneAreas.get(scene.id);
 const points=scene.steps.flatMap(step=>[
  ...step.plan.path.filter(p=>p.x>=0&&p.x<=(step.before.spec.worldWidth||1000)),
  ...[step.before,step.after].flatMap(state=>state.units.flatMap(u=>[{x:u.x-85,y:u.y-110},{x:u.x+85,y:u.y+45}]))
 ]);
 const area={left:Math.min(...points.map(p=>p.x))-24,right:Math.max(...points.map(p=>p.x))+24,top:Math.min(...points.map(p=>p.y))-24,bottom:Math.max(...points.map(p=>p.y))+24};
 sceneAreas.set(scene.id,area);return area;
}
function drawFeature(){
 const scene=scenes[featureId],length=step=>.9+step.plan.duration/.75+1.2,total=scene.steps.reduce((n,s)=>n+length(s),0);
 let time=paused&&clock===0?total-.01:clock%total,index=0;
 while(index<scene.steps.length-1&&time>=length(scene.steps[index]))time-=length(scene.steps[index++]);
 const step=scene.steps[index],flight=Math.max(0,(time-.9)*.75),result=flight>=step.plan.duration,source=result?step.after:step.before;
 const state={...source,angle:step.plan.side===0?step.plan.angle:source.angle,power:step.plan.power,units:source.units.map(u=>({...u}))};
 if(step.walkFrom&&time<.9){const u=state.units[step.walkSide],t=time/.9;u.x=step.walkFrom.x+(u.x-step.walkFrom.x)*t;u.y=step.walkFrom.y+(u.y-step.walkFrom.y)*t;}
 if(featureId==='teleport'&&index===0&&result){const end=step.after.units[0],from=end.animation?.from||end,t=Math.min(1,(flight-step.plan.duration)*3);Object.assign(state.units[0],{x:from.x+(end.x-from.x)*t,y:from.y+(end.y-from.y)*t});}
 const caption=scene.reason[language]+' '+step.label[language];
 if($('demoCaption').textContent!==caption)$('demoCaption').textContent=caption;
 $('demoIndex').textContent=captions[featureId].index+' · STAGE '+String(scene.stage).padStart(2,'0')+' · '+(index+1)+'/'+scene.steps.length;
 drawNative($('featureCanvas'),state,{area:sceneArea(scene),inset:{left:12,right:12,top:49,bottom:66},shot:time>=.9&&!result?step.plan:null,flight,tail:result?{shot:step.plan,age:flight-step.plan.duration}:null});
}

const visible=new Set();if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{for(const e of entries)e.isIntersecting?visible.add(e.target.id):visible.delete(e.target.id);schedule();},{rootMargin:'80px'});observer.observe($('heroCanvas'));observer.observe($('featureCanvas'));}else{visible.add('heroCanvas');visible.add('featureCanvas');}
function frame(t){raf=0;if(document.hidden||paused)return;if(t-previous>=32||!previous){clock+=previous?Math.min(.08,(t-previous)/1000):0;previous=t;if(visible.has('heroCanvas'))drawHero();if(visible.has('featureCanvas'))drawFeature();}schedule();}
function schedule(){if(!raf&&!paused&&!document.hidden&&visible.size)raf=requestAnimationFrame(frame);}
document.addEventListener('visibilitychange',()=>{previous=0;if(document.hidden){cancelAnimationFrame(raf);raf=0;}else schedule();});
let resize=0;addEventListener('resize',()=>{cancelAnimationFrame(resize);resize=requestAnimationFrame(()=>{drawHero();drawFeature();drawMaps();A.paintAll($('machinePicker'));updateMachine();});});
$('motionButton').setAttribute('aria-pressed',String(paused));$('motionButton').classList.toggle('is-paused',paused);selectFeature('reflection');translate();A.paintAll($('machinePicker'));updateMachine();schedule();
globalThis.ArcSite={get version(){return ArcRelease.version;},get heroStage(){return heroState.stage;},get maps(){return mapPreviews.map(e=>e.state.stage);},get language(){return language;},get machine(){return machineId;},get feature(){return featureId;},get paused(){return paused;},selectFeature};
})();
