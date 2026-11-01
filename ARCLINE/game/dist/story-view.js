(function(root){'use strict';
const $=id=>document.getElementById(id),S=root.ArcStory,A=root.ArcCharacters,D=root.ArcCinematicData;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
let plate=null;
let hooks=null,film=null,result=null,returnFocus=null,inertBefore=[],filmTyper=null,resultTyper=null,resultClock=0;
const language=()=>root.ArcI18n.language,local=(ja,en)=>language()==='en'?en:ja;
const reduced=()=>root.matchMedia('(prefers-reduced-motion: reduce)').matches;
function graphemes(text){return root.Intl?.Segmenter?[...new Intl.Segmenter(language(),{granularity:'grapheme'}).segment(text)].map(x=>x.segment):Array.from(text);}
function typer(container,lines){
 container.replaceChildren();const chars=[],full=lines.filter(Boolean).join('\n');
 const sr=document.createElement('span');sr.className='story-sr';sr.textContent=full;container.append(sr);
 for(const line of lines.filter(Boolean)){const p=document.createElement('p');p.setAttribute('aria-hidden','true');for(const word of language()==='en'?line.split(/(\s+)/):[line]){const target=language()==='en'&&!/^\s+$/.test(word)?document.createElement('span'):p;if(target!==p){target.className='story-word';p.append(target);}for(const char of graphemes(word)){const span=document.createElement('span');span.className='story-char';span.textContent=char;target.append(span);chars.push(span);}}container.append(p);}
 container.scrollTop=0;
 let time=0,shown=0;function update(dt){time+=dt;const n=reduced()?chars.length:Math.min(chars.length,Math.floor(time*32));const previous=shown;for(;shown<n;shown++)chars[shown].classList.add('is-visible');if(container.id==='filmText'&&shown>previous){const bottom=chars[shown-1].getBoundingClientRect().bottom-container.getBoundingClientRect().bottom;if(bottom>0)container.scrollTop+=bottom+3;}return shown===chars.length;}
 function complete(){for(;shown<chars.length;shown++)chars[shown].classList.add('is-visible','instant');time=chars.length/32;container.scrollTop=0;}
 function seek(seconds){update(Math.max(0,seconds-time));}
 if(reduced())complete();return {update,seek,complete,get done(){return shown===chars.length;},get full(){return full;},get duration(){return chars.length/32;}};
}
function showResult(stage){
 const age=result?.stage===stage?resultClock:0;result=S.result(stage,language());resultClock=age;resultTyper=null;
 const box=$('clearNarrative');box.hidden=false;box.dataset.tier=result.kind;
 $('clearStoryTitle').textContent=result.title;$('clearStoryArea').textContent=result.area;$('clearStoryArea').hidden=!result.area;
 $('chapterMessage').replaceChildren();$('chapterMessage').hidden=false;
 let discovery=$('clearDiscovery');if(!discovery){discovery=document.createElement('div');discovery.id='clearDiscovery';$('chapterMessage').before(discovery);}discovery.replaceChildren();discovery.hidden=!result.discovery;
 if(result.discovery){discovery.dataset.kind=result.discovery.kind;
  if(['blanks','names'].includes(result.discovery.kind)){discovery.setAttribute('aria-label',local('十の帰還記録','Ten return entries'));for(let i=0;i<10;i++){const cell=document.createElement('span');cell.dataset.entry=i;cell.textContent='—';discovery.append(cell);}}
  if(result.discovery.kind==='signal')for(const text of [local('緊急停止','Emergency stop'),local('安全の返事','Safety replies')]){const row=document.createElement('span');row.textContent=text;discovery.append(row);}
  if(result.discovery.kind==='letter'){discovery.setAttribute('aria-label',local('古い便りと同じ封蝋','The same wax seal on the old letter'));discovery.innerHTML='<i class="discovery-letter" aria-hidden="true"><i class="cp-seal"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="20"/><path d="M50 10V24M50 76V90M10 50H24M76 50H90"/></svg></i></i>';}
 }syncResult();
 $('overlay').dataset.storyTier=result.kind;
 $('replayClearMovie').hidden=!([30,60,100].includes(stage));$('replayClearMovie').textContent=local('演出をもう一度','Replay scene');drawResult();
}
function syncResult(){if(!result)return;const d=result.discovery,box=$('clearDiscovery');
 if(d?.kind==='names')for(const [i,e]of [...box.children].entries()){const on=resultClock*1000>=d.matchStartMs+i*d.intervalMs,id=S.presentation.returnOrder[i],name=on?S.pick(S.machines.find(m=>m.id===id).name,language()):'—';if(e.textContent!==name)e.textContent=name;e.classList.toggle('matched',on);}
 if(d?.kind==='signal')for(const [i,e]of [...box.children].entries())e.classList.toggle('matched',resultClock>=.45+i*.6);
 const start=(d?.textStartMs||0)/1000;if(resultClock<start)return;
 if(!resultTyper){const person=root.ArcJournal.machines.find(m=>m.id===result.focus),name=S.pick(person.name,language());resultTyper=typer($('chapterMessage'),[result.aftermath,result.response?name+' '+result.response:'']);}resultTyper.seek(resultClock-start);
}
function finishResultText(){if(result&&!resultTyper){resultClock=Math.max(resultClock,(result.discovery?.textStartMs||0)/1000);syncResult();}if(resultTyper&&!resultTyper.done){resultTyper.complete();return false;}return true;}
function hideResult(){result=null;resultTyper=null;$('clearNarrative').hidden=true;delete $('overlay').dataset.storyTier;$('replayClearMovie').hidden=true;}
function open(id,done=()=>{},replay=false,trigger=null){
 if(film)return false;const access=hooks.progress?{cleared:hooks.progress()}:null,frames=D.movie(String(id),language(),access);if(!frames.length)return false;
 hooks.clearInput();returnFocus=trigger||document.activeElement;inertBefore=[];
 for(const name of ['lobby','battle','overlay','journalPanel','lobbySettings','levelPicker','collectionPanel']){const e=$(name);inertBefore.push([e,e.inert]);e.inert=true;}
 film={id:String(id),frames,index:0,age:0,paused:false,done,replay};$('storyCinema').hidden=false;$('app').dataset.cinematic='true';enterFrame();$('filmNext').focus({preventScroll:true});return true;
}
function enterFrame(){
 const f=film.frames[film.index];film.age=0;$('filmTitle').textContent=f.title;$('filmCount').textContent=(film.index+1)+' / '+film.frames.length;
 $('filmSkip').textContent=local('スキップ','Skip');$('filmPause').textContent=local('一時停止','Pause');$('filmPause').setAttribute('aria-pressed','false');film.paused=false;
 film.cueKey=null;filmTyper=null;$('filmText').replaceChildren();if(!plate)plate=root.ArcCinematicPlayer.create($('filmPlate'),{onStatus:status=>{const e=$('filmImageStatus');e.hidden=status==='ready';e.textContent=local('イラストを読み込めませんでした。物語と操作は続けられます。','Illustration unavailable. The story and controls still work.');}});$('filmImageStatus').hidden=true;plate.show(f,film.frames[film.index+1]);hooks.cue?.(film.index,film.id,f);syncFilm();drawFilm();
}
function syncFilm(){if(!film)return;const f=film.frames[film.index],t=D.clock(f,film.age*1000),cue=t.cue;film.timeline=t;
 if((cue?.textKey||null)!==film.cueKey){film.cueKey=cue?.textKey||null;filmTyper=cue?typer($('filmText'),[cue.text]):null;if(!cue)$('filmText').replaceChildren();else if(cue.mode==='full')filmTyper.complete();}
 if(cue)filmTyper.seek(Math.max(0,film.age-cue.startMs/1000));
 const caption=$('filmText').closest('.film-caption');caption.dataset.shot=f.id;caption.dataset.emphasis=cue?.emphasis||'';caption.classList.toggle('film-silence',t.quiet);$('storyCinema').dataset.phase=t.phase;updateNext();
}
function updateNext(){if(!film)return;const f=film.frames[film.index],next=(film.timeline?.cueIndex??-1)+1;$('filmNext').textContent=filmTyper&&!filmTyper.done?local('全文を表示','Show all'):next<f.cues.length?local('次の文へ','Next line'):film.index<film.frames.length-1?local('次の場面へ','Next scene'):local(film.id==='prologue'?'旅をはじめる':'旅へ戻る',film.id==='prologue'?'Begin the journey':'Return to the journey');}
function advance(){if(!film)return;if(filmTyper&&!filmTyper.done){filmTyper.complete();updateNext();return;}const f=film.frames[film.index],next=(film.timeline?.cueIndex??-1)+1;if(next<f.cues.length){film.age=f.cues[next].startMs/1000;syncFilm();drawFilm();return;}if(film.index+1<film.frames.length){film.index++;enterFrame();}else close(false);}
function close(skipped){if(!film)return;const previous=film;film=null;filmTyper=null;plate?.destroy();plate=null;$('storyCinema').hidden=true;delete $('app').dataset.cinematic;
 for(const[e,value]of inertBefore)e.inert=value;inertBefore=[];hooks.finished?.(previous.id,{skipped,replay:previous.replay});
 const target=returnFocus;returnFocus=null;previous.done();if(target?.isConnected&&target.getClientRects().length&&!target.closest('[hidden]'))target.focus({preventScroll:true});
}
function togglePause(){if(!film)return;film.paused=!film.paused;$('filmPause').setAttribute('aria-pressed',String(film.paused));$('filmPause').textContent=film.paused?local('再生','Play'):local('一時停止','Pause');}
function update(dt){
 if(film){if(!film.paused&&plate?.state.status!=='loading'){const f=film.frames[film.index];film.age+=dt;syncFilm();if(film.age*1000>=f.durationMs&&(!filmTyper||filmTyper.done))advance();}drawFilm();return;}
 if(result){resultClock+=dt;syncResult();drawResult();}
}
function surface(canvas){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return null;const dpr=Math.min(2,root.devicePixelRatio||1);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.lineCap='round';ctx.lineJoin='round';return {ctx,w,h,dpr};}
function poly(ctx,pts,color,stroke=null){ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}}
function line(ctx,pts,color,width=2){ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function dot(ctx,x,y,r,color){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
function unit(ctx,id,x,y,scale,options={}){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);A.draw(ctx,id,{angle:id==='sora'?58:16,artStyle:'matte',detail:scale<.7?'distant':'battle',dpr:options.dpr||1,...options});ctx.restore();}
function letter(ctx,x,y,size,age,open=false){ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(age*.5)*.025);poly(ctx,[[-size,-size*.58],[size,-size*.58],[size,size*.58],[-size,size*.58]],'#e7ddbd','#344c55');line(ctx,[[-size,-size*.58],[0,open?-size*.94:0],[size,-size*.58]],'#a99572',1.5);line(ctx,[[-size,size*.58],[0,0],[size,size*.58]],'#c4b18d',1);poly(ctx,[[-size*.22,-size*.08],[0,-size*.28],[size*.22,-size*.08],[0,size*.15]],'#7d9d93');ctx.restore();}
function background(ctx,w,h,age,night=false){const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,night?'#102a3b':'#1c485b');g.addColorStop(1,night?'#31515c':'#a7beb2');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);dot(ctx,w*.79,h*.22,h*.075,night?'#c3c8ad88':'#e9e4c1b0');for(let n=0;n<3;n++){const pts=[[0,h]];for(let x=-20;x<w+25;x+=20)pts.push([x,h*(.38+n*.14)+Math.sin(x/w*6+n*2+age*.015)*h*.055]);pts.push([w+20,h]);poly(ctx,pts,['#648f9028','#3f727264','#204c5fa0'][n]);}}
function route(ctx,w,h,age,mode){const floor=h*(h<=340?.48:.66),left=w*.28,right=w*.7,gap=right-left;
 poly(ctx,[[0,floor],[left,floor],[left-22,h],[0,h]],'#728e80','#c9d2ad');poly(ctx,[[right,floor],[w,floor],[w,h],[right+18,h]],'#728e80','#c9d2ad');
 const lift=mode==='divide'?ease((age-1)/3):mode==='restored'?1-ease(age/4):0,tipY=floor-Math.sin(lift*1.1)*gap*.8;
 poly(ctx,[[left,floor-5],[right,tipY-5],[right,tipY+5],[left,floor+5]],'#b3b498','#1d3b49');dot(ctx,left,floor,6,'#e2cf9f');
 for(let i=0;i<7;i++){const x=w*(.07+i*.145),lit=mode!=='divide'||age<1+i*.33;ctx.fillStyle='#2e5660';ctx.fillRect(x-7,floor-42,14,42);dot(ctx,x,floor-37,3,lit?'#e9d58e':'#5a7374');}
 if(mode==='moving'||mode==='restored'){for(let i=0;i<3;i++){const x=((age*25+i*w*.3)%(w+80))-40;ctx.fillStyle='#b9b69b';ctx.fillRect(x,floor-15,21,12);ctx.fillStyle='#405965';ctx.fillRect(x+4,floor-20,13,6);}}
 return floor;}
function heart(ctx,x,y,scale,dim,dpr){const def=root.ArcEncounters.get('boss:archeart'),u={x:0,y:0,slope:0,hp:10,core:def.core,parts:[]};ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.globalAlpha=1-dim*.6;root.ArcVisualArt.drawActor(ctx,def.id,u,{kind:'boss',dir:-1,dpr,muzzle:A.pose({dir:-1,angle:32}),state:{spec:{boss:true},bossPhase:2}});ctx.restore();}
function drawFilm(){if(!film)return;syncFilm();plate?.update(film.age);$('storyFilm').hidden=plate?.state.status==='ready';if($('storyFilm').hidden)return;drawFallbackFilm();}
function drawFallbackFilm(){
 if(!film)return;const surf=surface($('storyFilm'));if(!surf)return;const{ctx,w,h,dpr}=surf,f=film.frames[film.index],age=reduced()?5:(film.timeline?.cameraMs||0)/1000,scene=f.scene,scale=Math.min(w/1000,h/530),drift=reduced()?0:ease(age/10)*w*.018;
 background(ctx,w,h,age,['P02','E01','E02','E03'].includes(scene));ctx.save();ctx.translate(-drift,0);
 if(['P01','P02','I30','I60','E04'].includes(scene)){
  const mode=scene==='P02'?'divide':scene==='P01'?'moving':'restored',floor=route(ctx,w*1.05,h,age,mode);
  if(scene==='I30'){unit(ctx,'rico',w*.4,floor,Math.max(.8,scale*1.7),{dpr});for(let i=0;i<5;i++)dot(ctx,w*(.15+i*.16),h*.42,3+ease(age/4)*2,'#e6dc9c');unit(ctx,'hibari',w*.23,floor,Math.max(.8,scale*1.7),{dpr});}
  if(scene==='I60'){for(let i=0;i<8;i++){const x=w*(.4+i*.06),y=h*.5+Math.sin(i+age)*8;line(ctx,[[x,y],[x+16,y-3]],'#d7ddbc75',1);}unit(ctx,'rin',w*.22,floor,Math.max(.8,scale*1.7),{dpr});}
  if(scene==='E04'){unit(ctx,'gun',w*.22,floor,Math.max(.8,scale*1.7),{dpr});letter(ctx,w*.48,h*.38,Math.min(65,w*.07),age,true);for(let i=0;i<5;i++)unit(ctx,A.characters[i+5].id,w*(.58+i*.075),floor,.65,{travel:age*10,dpr});}
 }else if(scene==='P03'){
  const floor=h*(h<=340?.48:.64);poly(ctx,[[0,floor],[w,floor],[w,h],[0,h]],'#567b73','#c9d2ad');const unitScale=clamp(w/820,.55,1.2);unit(ctx,'gun',w*.23+(reduced()?0:ease(age/8)*w*.12),floor,Math.max(.8,unitScale*1.8),{travel:age*8,dpr});letter(ctx,w*.49,h*.33,Math.min(55,w*.06),age);
 }else{
  const floor=h*(h<=340?.48:.64);poly(ctx,[[0,floor],[w,floor],[w,h],[0,h]],'#46665f','#9bb9a3');const dim=scene==='E03'?ease((age-2)/5):0;heart(ctx,w*(scene==='E02'?.85:.72),floor,Math.max(.65,scale*(h<=340?1.6:2.3)),dim,dpr);
  if(scene!=='E02'){unit(ctx,'yui',w*.48,floor,Math.max(.65,scale*1.5),{dpr});unit(ctx,'gun',w*.23,floor,Math.max(.7,scale*1.8),{dpr});}
  if(scene==='E01'){letter(ctx,w*.36,h*.36,Math.min(55,w*.06),age,true);line(ctx,[[w*.49,floor-30],[w*.57,floor-35],[w*.64,floor-56]],'#87c7b8',2);}
  if(scene==='E02'){const lit=f.id==='E02-01'?film.timeline.litCount:10;for(let i=0;i<10;i++){const x=w*(.08+(i%5)*.115),y=h*.24+Math.floor(i/5)*27;dot(ctx,x,y,Math.max(3,scale*7),i<lit?'#e5eeb5':'#526d72');if(i<lit){const c=A.get(S.presentation.returnOrder[i]);ctx.font=`${Math.max(10,scale*13)}px system-ui`;ctx.fillStyle='#e1e8c8';ctx.textAlign='center';ctx.fillText(language()==='en'?c.name:c.nameJa,x,y+16);}}}
  if(scene==='E03')for(let i=0;i<10;i++){const x=w*(.1+i*.09),y=h*.28;dot(ctx,x,y,3+ease(age/5)*3,'#e5eeb5');line(ctx,[[w*.7,h*.4],[x,y]],'#acd8bd28',1);}
 }
 ctx.restore();ctx.fillStyle='#0d273a';ctx.fillRect(0,0,w,h*.07);ctx.fillRect(0,h*.94,w,h*.06);
}
function drawResult(){if(!result)return;const surf=surface($('resultStoryArt'));if(!surf)return;const{ctx,w,h,dpr}=surf;ctx.clearRect(0,0,w,h);ctx.save();ctx.translate(w*.5,h*.86);const scale=Math.min(w/100,h/82);ctx.scale(scale,scale);A.draw(ctx,result.focus,{angle:result.focus==='sora'?58:18,artStyle:'matte',dpr});ctx.restore();
 const progress=$('clearAreaProgress');progress.hidden=!['boss','final'].includes(result.kind);if(!progress.hidden){if(progress.childElementCount!==10)progress.replaceChildren(...Array.from({length:10},()=>document.createElement('i')));const n=Math.min(10,Math.floor(resultClock*10));[...progress.children].forEach((e,i)=>e.classList.toggle('lit',i<n));}}
function install(options){hooks=options;$('filmNext').onclick=advance;$('filmSkip').onclick=()=>close(true);$('filmPause').onclick=togglePause;$('filmText').onclick=()=>{filmTyper?.complete();updateNext();};$('chapterMessage').onclick=()=>resultTyper?.complete();
 document.addEventListener('keydown',e=>{if(!film||$('gameSurface').inert||$('app').inert)return;if(['Tab','Escape',' ','Enter','ArrowRight'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();if(e.key==='Escape'){close(true);return;}if(e.key==='Tab'){const list=[$('filmSkip'),$('filmPause'),$('filmNext')],i=list.indexOf(document.activeElement);list[(i+(e.shiftKey?2:1))%3].focus();return;}if(e.key!=='ArrowRight'&&document.activeElement===$('filmPause'))togglePause();else if(e.key!=='ArrowRight'&&document.activeElement===$('filmSkip'))close(true);else advance();}},true);
 root.addEventListener('arcline-language',()=>{if(film){const age=film.age,paused=film.paused,oldCue=film.timeline?.cue,key=oldCue?.textKey,progress=oldCue?clamp((age*1000-oldCue.startMs)/(oldCue.endMs-oldCue.startMs),0,1):0;film.frames=D.movie(film.id,language());const translated=film.frames[film.index].cues.find(c=>c.textKey===key),mappedAge=translated&&!film.timeline?.quiet?(translated.startMs+progress*(translated.endMs-translated.startMs))/1000:age;enterFrame();film.age=mappedAge;film.paused=paused;syncFilm();$('filmPause').setAttribute('aria-pressed',String(paused));$('filmPause').textContent=paused?local('再生','Play'):local('一時停止','Pause');}if(result)showResult(result.stage);});
}
root.ArcStoryView=Object.freeze({install,open,advance,close,update,showResult,hideResult,finishResultText,drawFilm,drawResult,graphemes,get active(){return !!film;},get state(){return film?{id:film.id,index:film.index,age:film.age,paused:film.paused,textDone:!filmTyper||filmTyper.done,shot:film.frames[film.index].id,cueIndex:film.timeline?.cueIndex,cueKey:film.cueKey,phase:film.timeline?.phase,quiet:film.timeline?.quiet,litCount:film.timeline?.litCount,plate:plate?.state}:null;},get resultDone(){return !result||!!resultTyper?.done;}});
})(globalThis);
