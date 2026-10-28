'use strict';
importScripts('levels.js?v=0.6.2','weapons.js?v=0.6.2','geometry.js?v=0.6.2','physics.js?v=0.6.2','engine.js?v=0.6.2');
onmessage=e=>{
 const {id,state,seed}=e.data,start=performance.now();
 try{state.random=ArcEngine.seeded(seed);const target=ArcEngine.enemyMoveTarget(state);ArcEngine.geometry.move(state,1,target-state.units[1].x);const plan=ArcEngine.cpuPlan(state,state.random);postMessage({id,target,plan,elapsed:performance.now()-start});}
 catch(error){postMessage({id,error:String(error)});}
};
