(function(root){'use strict';
const base=new URL('../../',document.baseURI);
const records=[],cache=new Map();
const resolve=src=>new URL(String(src).replace(/^\/+/,''),base).href;
const log=(kind,src,url,detail={})=>{const record={at:new Date().toISOString(),kind,src,url,...detail};records.push(record);if(records.length>150)records.shift();return record;};
function load(src,options={}){
 const url=resolve(src),key=url;
 if(cache.has(key))return cache.get(key);
 const retries=options.retries??2,timeout=options.timeout??10000;
 const promise=new Promise(resolvePromise=>{
  let attempt=0;
  const run=()=>{
   attempt++;const img=new Image();img.decoding='async';const started=Date.now();let finished=false;
   const finish=(ok,reason)=>{
    if(finished)return;finished=true;clearTimeout(timer);img.onload=null;img.onerror=null;
    log(ok?'loaded':'failed',src,url,{attempt,ms:Date.now()-started,reason});
    if(ok){resolvePromise({ok:true,image:img,url,attempt});return;}
    img.removeAttribute('src');
    if(attempt<=retries){setTimeout(run,Math.min(1500,250*attempt));return;}
    cache.delete(key);resolvePromise({ok:false,image:null,url,attempt,reason});
   };
   const timer=setTimeout(()=>finish(false,'timeout'),timeout);
   img.onload=()=>finish(true,'load');img.onerror=()=>finish(false,'error');
   img.src=url;
  };run();
 });
 cache.set(key,promise);return promise;
}
function clear(src){if(src)cache.delete(resolve(src));else cache.clear();}
root.ArcAssetLoader=Object.freeze({resolve,load,clear,records,log,diagnose:async()=>{const d=root.ArcCinematicData;if(!d)return {error:'cinematic-data missing'};const items=[...d.shots.map(s=>({id:s.id,src:s.src})),...d.characters.filter(c=>c.verified&&c.src).map(c=>({id:c.id,src:c.src}))];const results=[];for(let i=0;i<items.length;i+=4){const batch=items.slice(i,i+4);results.push(...await Promise.all(batch.map(async item=>({id:item.id,...await load(item.src,{retries:1,timeout:12000})})).map(async p=>{const x=await p;return {id:x.id,ok:x.ok,url:x.url,attempt:x.attempt,reason:x.reason||null};})));}return {total:results.length,passed:results.filter(x=>x.ok).length,results};}});
})(globalThis);
