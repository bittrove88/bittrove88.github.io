'use strict';
importScripts('crew.js?v=0.29.6','crew-usage.js?v=0.29.6','levels.js?v=0.29.6','attack-catalog.js?v=0.29.6','combat.js?v=0.29.6','battle-catalog.js?v=0.29.6','skills.js?v=0.29.6','weapons.js?v=0.29.6','inventory.js?v=0.29.6','geometry.js?v=0.29.6','physics.js?v=0.29.6','encounters.js?v=0.29.6','final-team.js?v=0.29.6','enemy-attacks.js?v=0.29.6','enemy-actions.js?v=0.29.6','engine.js?v=0.29.6');
onmessage=e=>{
 const {id,state,seed}=e.data,start=performance.now();
 try{state.random=ArcEngine.seeded(seed);const result=ArcEngine.planEnemyAction(state,state.random);postMessage({id,...result,elapsed:performance.now()-start});}
 catch(error){postMessage({id,error:String(error)});}
};
