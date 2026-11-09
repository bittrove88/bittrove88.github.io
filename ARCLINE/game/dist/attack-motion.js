(function(root){
'use strict';
// Presentation time is independent of the immutable physical trajectory.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function create(plan,options={}){
 const end=Math.max(0,plan?.duration||0),id=plan?.weaponId||'',special=id.startsWith('S_')&&!['S_GUARD','S_BREACH'].includes(id),enemy=!!plan?.specialTechnique;
 const identity=()=>({duration:end,physicalDuration:end,cues:[],segments:[],at:t=>clamp(t,0,end),timeAt:t=>clamp(t,0,end),done:t=>t>=end});
 if(!end||options.reducedMotion||!special&&!enemy)return identity();
 const events=plan.events||[],first=type=>events.find(e=>e.type===type),impact=plan.impacts?.[0]?.t??end,last=plan.impacts?.at(-1)?.t??end;
 const windows=[],holds=[],cues=[];let base=1.15;
 const hold=(t,seconds,label)=>{t=clamp(t,0,end);if(seconds>0){holds.push({t,seconds,label});cues.push({t,hold:seconds,label});}};
 const focus=(t,before,after,rate,label)=>{const from=clamp(t-before,0,end),to=clamp(t+after,0,end);if(to>from)windows.push({from,to,rate,label,ease:'focus',pivot:t});cues.push({t,label,rate});};
 const fast=(from,rate,label)=>{if(from<end)windows.push({from:clamp(from,0,end),to:end,rate,label,ease:'accelerate'});};
 if(id==='S_GUN'){base=1.15;focus(impact,.045,0,.4,'着弾へ減速');hold(impact,.04,'重い命中');fast(impact+.025,1.35,'外周へ解放');}
 else if(id==='S_HANA'){return identity();}
 else if(id==='S_KORO'){base=1;const roll=first('roll')?.t??impact;focus(roll,.02,.02,.7,'接地の重み');fast(roll+.08,1.25,'爆走');}
 else if(id==='S_BAN'){base=1.15;focus(impact,.04,0,.35,'衝撃を溜める');hold(impact,.045,'接触');fast(impact+.02,1.4,'三段の解放');}
 else if(id==='S_SORA'){base=1.15;const t=first('split')?.t??impact;focus(t,.075,0,.25,'頂点へ減速');hold(t,.075,'分裂の静止');fast(t+.015,1.7,'流星の加速');}
 else if(id==='S_RICO'){base=1;const final=events.filter(e=>e.type==='bounce').at(-1);if(final&&final.count===3){focus(final.t,.018,0,.55,'虹への成長');hold(final.t,.02,'虹色の輪郭');fast(final.t+.015,1.2,'最終反射');}}
 else if(id==='S_HIBARI'){base=1;const ring=first('ring');if(ring)windows.push({from:ring.t,to:Math.min(end,ring.t+ring.duration),rate:.85,label:'しなやかな二回転'});}
 else if(id==='S_MOGU'){return identity();}
 else if(id==='S_RIN'){base=1;const t=first('converge')?.t??.14;focus(t,.035,0,.5,'収束');hold(t,.025,'一点の静止');fast(t+.003,1.35,'閃光の加速');}
 else if(id==='S_YUI'){base=1.1;const pull=first('pull'),compression=first('compression');if(pull)windows.push({from:pull.t,to:Math.min(end,pull.t+pull.duration),rate:.68,label:'吸引の減速'});if(compression){hold(compression.t,.055,'圧縮の静止');fast(compression.t+.005,1.7,'核の消滅');}}
 else if(id==='E_30'){base=1;const t=first('split')?.t;if(t!==undefined){focus(t,.04,0,.5,'雲核の開放');hold(t,.035,'三分裂');fast(t+.015,1.2,'落下');}}
 else if(id==='E_40'){base=1;const t=first('reflect-split')?.t;if(t!==undefined){hold(t,.03,'反射面の分光');fast(t+.015,1.2,'三色の射出');}}
 else if(id==='E_FINAL_1'){base=1;fast(.45,1.2,'衛星の解放');}
 else if(id==='E_FINAL_2'){base=1;const t=first('redirect')?.t;if(t!==undefined){focus(t,.025,0,.55,'折れ点');hold(t,.025,'転軌');fast(t+.01,1.2,'新しい軌道');}}
 else if(id==='E_FINAL_4'){return identity();}
 else{return identity();}
 const boundaries=new Set([0,end]);for(let i=1;i<64;i++)boundaries.add(end*i/64);for(const w of windows){boundaries.add(w.from);boundaries.add(w.to);}for(const h of holds)boundaries.add(h.t);
 const points=[...boundaries].sort((a,b)=>a-b),segments=[];let real=0;
 for(let i=0;i<points.length;i++){
  const t=points[i];for(const h of holds.filter(h=>Math.abs(h.t-t)<1e-8)){segments.push({from:t,to:t,start:real,end:real+h.seconds,rate:0,label:h.label});real+=h.seconds;}
  if(i===points.length-1)break;const to=points[i+1],middle=(t+to)/2;let rate=base,label='飛翔';for(const w of windows)if(middle>=w.from&&middle<w.to){let q=1;if(w.ease==='focus')q=middle<=w.pivot?(middle-w.from)/Math.max(.001,w.pivot-w.from):(w.to-middle)/Math.max(.001,w.to-w.pivot);else if(w.ease==='accelerate')q=Math.min(1,(middle-w.from)/.065);q=clamp(q,0,1);q=q*q*(3-2*q);rate=base+(w.rate-base)*q;label=w.label;}
  const duration=(to-t)/rate;segments.push({from:t,to,start:real,end:real+duration,rate,label});real+=duration;
 }
 function at(t){t=clamp(t,0,real);const s=segments.find(s=>t<s.end-1e-10)||segments.at(-1);return s?clamp(s.from+(t-s.start)*s.rate,0,end):end;}
 function timeAt(t){t=clamp(t,0,end);const s=segments.find(s=>t>=s.from-1e-8&&t<=s.to+1e-8);return s?s.start+(s.rate?(t-s.from)/s.rate:0):real;}
 return {duration:real,physicalDuration:end,cues,segments,at,timeAt,done:t=>t>=real-1e-8};
}
const api={create};if(typeof module!=='undefined')module.exports=api;else root.ArcAttackMotion=api;
})(globalThis);
