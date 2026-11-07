'use strict';
importScripts('crew.js?v=0.23.2','crew-usage.js?v=0.23.2','levels.js?v=0.23.2','combat.js?v=0.23.2','skills.js?v=0.23.2','weapons.js?v=0.23.2','inventory.js?v=0.23.2','geometry.js?v=0.23.2','physics.js?v=0.23.2','encounters.js?v=0.23.2','final-team.js?v=0.23.2','engine.js?v=0.23.2');
onmessage=e=>{
 const {id,state,seed}=e.data,start=performance.now();
 try{state.random=ArcEngine.seeded(seed);const target=ArcEngine.enemyMoveTarget(state);ArcEngine.geometry.move(state,1,target-state.units[1].x);const plan=ArcEngine.cpuPlan(state,state.random);postMessage({id,target,plan,elapsed:performance.now()-start});}
 catch(error){postMessage({id,error:String(error)});}
};
