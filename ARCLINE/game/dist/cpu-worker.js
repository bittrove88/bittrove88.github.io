'use strict';
importScripts('crew.js?v=0.28.2','crew-usage.js?v=0.28.2','levels.js?v=0.28.2','combat.js?v=0.28.2','battle-catalog.js?v=0.28.2','skills.js?v=0.28.2','weapons.js?v=0.28.2','inventory.js?v=0.28.2','geometry.js?v=0.28.2','physics.js?v=0.28.2','encounters.js?v=0.28.2','final-team.js?v=0.28.2','enemy-actions.js?v=0.28.2','engine.js?v=0.28.2');
onmessage=e=>{
 const {id,state,seed}=e.data,start=performance.now();
 try{state.random=ArcEngine.seeded(seed);const result=ArcEngine.planEnemyAction(state,state.random);postMessage({id,...result,elapsed:performance.now()-start});}
 catch(error){postMessage({id,error:String(error)});}
};
