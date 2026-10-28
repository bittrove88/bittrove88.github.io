'use strict';
importScripts('levels.js?v=0.6.1','weapons.js?v=0.6.1','geometry.js?v=0.6.1','physics.js?v=0.6.1','engine.js?v=0.6.1');
onmessage=e=>{
 const {id,state,seed}=e.data,start=performance.now();
 try{state.random=ArcEngine.seeded(seed);const target=ArcEngine.enemyMoveTarget(state);ArcEngine.geometry.move(state,1,target-state.units[1].x);const plan=ArcEngine.cpuPlan(state,state.random);postMessage({id,target,plan,elapsed:performance.now()-start});}
 catch(error){postMessage({id,error:String(error)});}
};
