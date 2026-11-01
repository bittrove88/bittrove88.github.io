(function(root){'use strict';
const records=[],cache=new Map();
const resolve=(src,prefix=root.ArcAssetBase||'../../')=>{
 const url=new URL(String(src).replace(/^\/+/,''),new URL(prefix,document.baseURI));
 // The edited master retains its public path, but cannot reuse the old sealed JPEG cache.
 const plate=root.ArcCinematicData?.shots?.find(shot=>shot.id==='P03-01'&&shot.src===src);
 if(plate?.sha256)url.searchParams.set('v',plate.sha256.slice(0,12));
 return url.href;
};
const log=(kind,src,url,detail={})=>{const record={at:new Date().toISOString(),kind,src,url,...detail};records.push(record);if(records.length>150)records.shift();return record;};
function load(src,options={}){
 const url=resolve(src,options.assetBase),key=url;
 if(cache.has(key)){const p=cache.get(key);cache.delete(key);cache.set(key,p);return p;}
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
    if(cache.get(key)===promise)cache.delete(key);resolvePromise({ok:false,image:null,url,attempt,reason});
   };
   const timer=setTimeout(()=>finish(false,'timeout'),timeout);
   img.onload=()=>finish(true,'load');img.onerror=()=>finish(false,'error');
   img.src=url;
  };run();
 });
 cache.set(key,promise);while(cache.size>3)cache.delete(cache.keys().next().value);return promise;
}
function clear(src){if(src)cache.delete(resolve(src));else cache.clear();}
root.ArcAssetLoader=Object.freeze({resolve,load,clear,records,log,get cacheSize(){return cache.size;},diagnose:async()=>{const d=root.ArcCinematicData;if(!d)return {error:'cinematic-data missing'};const items=[...d.shots.map(s=>({id:s.id,src:s.src})),...d.characters.filter(c=>c.verified&&c.src).map(c=>({id:c.id,src:c.src}))];const results=[];for(let i=0;i<items.length;i+=4){const batch=items.slice(i,i+4);results.push(...await Promise.all(batch.map(async item=>({id:item.id,...await load(item.src,{retries:1,timeout:12000})})).map(async p=>{const x=await p;return {id:x.id,ok:x.ok,url:x.url,attempt:x.attempt,reason:x.reason||null};})));}return {total:results.length,passed:results.filter(x=>x.ok).length,results};}});
})(globalThis);
