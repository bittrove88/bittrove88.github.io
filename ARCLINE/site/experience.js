(function(){
'use strict';
const $=id=>document.getElementById(id),opening=$('worldOpening');if(!opening||!globalThis.ArcSite)return;
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),local=(ja,en)=>ArcSite.language==='en'?en:ja;
let age=0,previous=0,raf=0;
function phase(t){return t<2.8?'daily':t<3.55?'black':t<6.8?'broken':'title';}
function paint(){const current=reduced.matches?'title':phase(age);opening.dataset.phase=current;$('openingCaption').textContent=current==='daily'?local('荷物と灯りが、行き交う日常。','Cargo and light. Another ordinary day.'):current==='broken'?local('ある日、その道が途切れた。','Then, the routes fell silent.'):'';opening.setAttribute('aria-label',local('日常が途切れ、仲間と道をつなぎ直す物語','An ordinary world falls silent. Reconnect its routes with your companions.'));opening.dataset.paused=String(ArcSite.paused);}
function frame(time){raf=0;const visible=opening.getBoundingClientRect().bottom>0&&opening.getBoundingClientRect().top<innerHeight;if(!document.hidden&&!ArcSite.paused&&!reduced.matches&&visible&&age<8)age+=previous?Math.min(.08,(time-previous)/1000):0;previous=time;paint();if(!document.hidden&&age<8&&!reduced.matches&&!ArcSite.paused)raf=requestAnimationFrame(frame);}
function schedule(){if(!raf&&!document.hidden&&age<8&&!reduced.matches&&!ArcSite.paused){previous=0;raf=requestAnimationFrame(frame);}paint();}
document.addEventListener('visibilitychange',()=>{previous=0;if(document.hidden){cancelAnimationFrame(raf);raf=0;}else schedule();});reduced.addEventListener('change',schedule);$('motionButton').addEventListener('click',schedule);
$('languageButton').addEventListener('click',()=>{paint();landscape(selected,false);});
const regions={shore:['site/gameplay-shore.jpg?v=20261108','01 — 05','はじまりの入江','First Inlet'],volcano:['site/gameplay-volcano.jpg?v=20261108','61 — 65','火山の外縁','Volcanic Rim'],garden:['site/gameplay-garden.jpg?v=20261108','81 — 85','空中庭園','Sky Gardens'],fortress:['site/gameplay-fortress.jpg?v=20261108','91 — 95','要塞の重層門','Fortress Gates']};let selected='shore';
function landscape(id,animate=true){const data=regions[id];if(!data)return;selected=id;const host=document.querySelector('.main-shot'),image=host.querySelector('img');image.src=data[0];image.alt=local(data[2]+'の実際のゲーム画面','Actual gameplay: '+data[3]);const captions=host.querySelectorAll('figcaption span');captions[0].textContent=data[1];captions[1].textContent=local(data[2],data[3]);for(const b of document.querySelectorAll('[data-landscape]'))b.setAttribute('aria-pressed',String(b.dataset.landscape===id));if(animate&&!reduced.matches&&!ArcSite.paused)host.animate([{opacity:.3,transform:'translateX(16px)'},{opacity:1,transform:'translateX(0)'}],{duration:350,easing:'ease-out'});}
for(const b of document.querySelectorAll('[data-landscape]'))b.onclick=()=>landscape(b.dataset.landscape);
const art=document.querySelector('.machine-art'),name=$('machineName');let machine=name.textContent;
new MutationObserver(()=>{if(name.textContent===machine)return;machine=name.textContent;if(!reduced.matches&&!ArcSite.paused)art.animate([{opacity:0,transform:'translate(34px,-12px) rotate(-3deg)'},{opacity:1,transform:'translate(0,0) rotate(0)'}],{duration:650,easing:'cubic-bezier(.16,1,.3,1)'});}).observe(name,{childList:true,subtree:true,characterData:true});
if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){e.target.classList.add('journey-visible');observer.unobserve(e.target);}},{threshold:.08});for(const e of document.querySelectorAll('.section-heading,.world-copy,.machines-heading')){e.classList.add('journey-reveal');observer.observe(e);}}
globalThis.ArcSiteExperience={phase,get age(){return age;},get landscape(){return selected;}};landscape('shore',false);schedule();
})();
