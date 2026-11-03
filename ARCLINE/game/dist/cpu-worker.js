'use strict';
importScripts('crew.js?v=0.21.3','crew-usage.js?v=0.21.3','levels.js?v=0.21.3','combat.js?v=0.21.3','skills.js?v=0.21.3','weapons.js?v=0.21.3','inventory.js?v=0.21.3','geometry.js?v=0.21.3','physics.js?v=0.21.3','encounters.js?v=0.21.3','final-team.js?v=0.21.3','engine.js?v=0.21.3');
onmessage=e=>{
 const {id,state,seed}=e.data,start=performance.now();
 try{state.random=ArcEngine.seeded(seed);const target=ArcEngine.enemyMoveTarget(state);ArcEngine.geometry.move(state,1,target-state.units[1].x);const plan=ArcEngine.cpuPlan(state,state.random);postMessage({id,target,plan,elapsed:performance.now()-start});}
 catch(error){postMessage({id,error:String(error)});}
};
