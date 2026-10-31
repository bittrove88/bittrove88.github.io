'use strict';
importScripts('levels.js?v=0.9.0','combat.js?v=0.9.0','skills.js?v=0.9.0','weapons.js?v=0.9.0','inventory.js?v=0.7.3','geometry.js?v=0.9.0','physics.js?v=0.9.0','engine.js?v=0.9.0');
onmessage=e=>{
 const {id,state,seed}=e.data,start=performance.now();
 try{state.random=ArcEngine.seeded(seed);const target=ArcEngine.enemyMoveTarget(state);ArcEngine.geometry.move(state,1,target-state.units[1].x);const plan=ArcEngine.cpuPlan(state,state.random);postMessage({id,target,plan,elapsed:performance.now()-start});}
 catch(error){postMessage({id,error:String(error)});}
};
