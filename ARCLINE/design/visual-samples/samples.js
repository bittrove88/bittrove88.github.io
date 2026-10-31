(function(root){
'use strict';
const $=id=>document.getElementById(id),S=root.ArcVisualSamples,E=root.ArcEngine,canvas=$('world'),matte=root.ArcRender.create(canvas,{artStyle:'matte'}),legacy=root.ArcRender.create(canvas),cache=new Map();
let sceneId='shore',variant=0,style='matte',sample=null,age=0,clock=0,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,last=0,raf=0,diagnostic=null;
const freeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.freeze(o);for(const v of Object.values(o))freeze(v);}return o;};
function getSample(id,index){const key=id+':'+index;if(!cache.has(key))cache.set(key,freeze(S.make(id,index)));return cache.get(key);}
function portraits(){
 for(const c of document.querySelectorAll('[data-portrait]')){
  const id=c.dataset.portrait,w=c.clientWidth,h=c.clientHeight;if(!w||!h)continue;const dpr=Math.min(3,devicePixelRatio||1);c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const m=getSample(id,0),small=w<160,items=id==='shore'?[['player:gun',small?40:w*.27,1,1.25],['enemy:pebble',small?82:w*.73,-1,1.15]]:id==='cave'?[['midboss:harbor-knot',w*.51,1,1.45]]:[['player:yui',small?27:w*.22,1,1.05],['boss:polaris-core',small?76:w*.7,-1,.93]];
  const factor=small?.46:1,base=h*.86;ctx.fillStyle='#9cafa33b';ctx.beginPath();ctx.ellipse(w*.5,base+2,w*.39,3,0,0,Math.PI*2);ctx.fill();
  for(const [actor,x,dir,scale]of items){ctx.save();ctx.translate(x,base);ctx.scale(scale*factor,scale*factor);const boss=actor.startsWith('boss:'),unit={...m.before.units[boss?1:0],x:0,y:0,slope:0,parts:boss?m.before.units[1].parts:[]},pose=ArcCharacters.pose({x:0,y:0,dir,angle:16});root.ArcVisualArt.drawActor(ctx,actor,unit,{kind:actor.split(':')[0],dir,muzzle:pose,dpr,detail:small?'distant':'battle'});ctx.restore();}
 }
}
function choose(id,index=0){
 sceneId=S.definitions.some(d=>d.id===id)?id:'shore';variant=index;sample=getSample(sceneId,variant);age=0;
 for(const b of document.querySelectorAll('[data-scene]')){const on=b.dataset.scene===sceneId;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;}
 $('samplePanel').setAttribute('aria-labelledby','scene-tab-'+sceneId);$('sceneNumber').textContent='SCENE '+String(S.definitions.indexOf(sample.def)+1).padStart(2,'0');$('sceneTitle').textContent=sample.def.title;$('sceneSubtitle').textContent=sample.def.subtitle;$('sceneCaption').textContent=sample.def.caption;$('variantLabel').textContent=sample.def.states[sample.index];
 $('playerName').textContent=ArcCharacters.get(sample.before.characterId).nameJa;$('enemyName').textContent=ArcVisualRegistry.get(sample.def.enemy).nameJa;$('weaponLabel').textContent=sample.def.weaponName;$('ammoLabel').textContent=sample.def.weapon==='TELEPORT'?'1行動':'3';$('angleLabel').textContent=String(sample.before.angle)+'°';
 $('sourceLinks').replaceChildren();for(const id of sample.def.sources){const a=document.createElement('a');a.href='../sheets/#sheet-'+id;a.textContent=id+' 原本';$('sourceLinks').append(a);}render();
}
function render(){
 if(!sample)return;const frame=S.at(sample,age),h=canvas.clientHeight,field={top:h<=260?42:54,bottom:h-114};
 diagnostic=matte.draw(sample.before,{...frame,actors:['player:'+sample.before.characterId,sample.def.enemy],theme:sample.def.theme,time:clock,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,debug:$('showContracts').checked,presentationFrame:field,framingPoints:sample.def.id==='cave'?[{x:480,y:212}]:[]});
 if(style==='legacy'){
  legacy.draw(frame.display,{time:clock,characterId:sample.before.characterId,canAim:false,reducedMotion:true,cameraLock:matte.view,presentationFrame:field,shot:frame.shot,flight:frame.flight});
  if($('showContracts').checked){const ctx=canvas.getContext('2d'),dpr=Math.min(2,devicePixelRatio||1),v=legacy.view;ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.translate(v.x,v.y);ctx.scale(v.scale,v.scale);ArcVisualArt.drawContracts(ctx,frame.display,['player:'+sample.before.characterId,sample.def.enemy],{dpr});ctx.restore();}
 }
 $('phaseLabel').textContent=frame.phase;$('powerLabel').textContent=String(sample.before.power)+'%';$('powerBar').style.width=sample.before.power+'%';
 const units=frame.display.units;$('playerHP').textContent=E.combat.points(units[0].hp);$('playerBar').style.width=100*units[0].hp/units[0].maxHp+'%';$('enemyHP').textContent=sample.def.enemy.startsWith('midboss:')?'見本':E.combat.points(units[1].hp);$('enemyBar').style.width=sample.def.enemy.startsWith('midboss:')?'100%':100*units[1].hp/units[1].maxHp+'%';
 if(sample.def.weapon!=='TELEPORT'){let quantity=sample.before.weaponStock[sample.def.weapon]||0;if(frame.shot)quantity=Math.max(0,quantity-1);if(sample.plan.events.some(e=>e.type==='pickup'&&e.t<=frame.flight))quantity=3;$('ammoLabel').textContent=String(quantity);}
 $('contractNote').hidden=!$('showContracts').checked;canvas.dataset.scene=sceneId;canvas.dataset.style=style;canvas.dataset.variant=String(sample.index);
}
function setPaused(value){paused=!!value;$('pausePlayback').textContent=paused?'再開':'一時停止';$('pausePlayback').setAttribute('aria-pressed',String(paused));}
for(const b of document.querySelectorAll('[data-scene]'))b.onclick=()=>choose(b.dataset.scene);
for(const b of document.querySelectorAll('[data-style]'))b.onclick=()=>{style=b.dataset.style;for(const x of document.querySelectorAll('[data-style]'))x.setAttribute('aria-pressed',String(x===b));render();};
document.querySelector('.scene-tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const all=[...document.querySelectorAll('[data-scene]')],i=all.findIndex(b=>b.dataset.scene===sceneId),n=e.key==='Home'?0:e.key==='End'?all.length-1:(i+(e.key==='ArrowRight'?1:-1)+all.length)%all.length;choose(all[n].dataset.scene);all[n].focus();});
$('displaySize').onchange=()=>{const size=$('displaySize').value;$('app').dataset.size=size==='fit'?'fit':'phone'+size;render();};
$('pausePlayback').onclick=()=>setPaused(!paused);$('nextState').onclick=()=>choose(sceneId,(sample.index+1)%sample.def.states.length);$('showContracts').onchange=render;$('replayShot').onclick=()=>{age=.75;setPaused(false);render();};
function tick(t){const dt=last?Math.min(.05,(t-last)/1000):0;last=t;if(!paused&&document.visibilityState==='visible'){clock+=dt;age+=dt*.7;const length=.75+sample.plan.duration+1.2;if(age>=length)age%=length;render();}raf=requestAnimationFrame(tick);}
addEventListener('resize',()=>{portraits();render();});document.addEventListener('visibilitychange',()=>{last=0;});
choose('shore');setPaused(paused);portraits();raf=requestAnimationFrame(tick);
root.ArcVisualSampleView=Object.freeze({select:(id,index=0)=>choose(id,index),renderFixed:(id,index,time,appearance='matte')=>{choose(id,index);style=appearance;age=time;setPaused(true);render();return diagnostic;},get sample(){return sample;},get diagnostic(){return diagnostic;},get view(){return matte.view;},pause:setPaused});
})(globalThis);
