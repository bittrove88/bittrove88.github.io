'use strict';
importScripts('crew.js?v=0.22.1','crew-usage.js?v=0.22.1','levels.js?v=0.22.1','combat.js?v=0.22.1','skills.js?v=0.22.1','weapons.js?v=0.22.1','inventory.js?v=0.22.1','geometry.js?v=0.22.1','physics.js?v=0.22.1','encounters.js?v=0.22.1','final-team.js?v=0.22.1','engine.js?v=0.22.1');
onmessage=e=>{
 const {id,state,seed}=e.data,start=performance.now();
 try{state.random=ArcEngine.seeded(seed);const target=ArcEngine.enemyMoveTarget(state);ArcEngine.geometry.move(state,1,target-state.units[1].x);const plan=ArcEngine.cpuPlan(state,state.random);postMessage({id,target,plan,elapsed:performance.now()-start});}
 catch(error){postMessage({id,error:String(error)});}
};
