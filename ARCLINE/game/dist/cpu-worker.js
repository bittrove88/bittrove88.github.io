'use strict';
importScripts('crew.js?v=0.29.4','crew-usage.js?v=0.29.4','levels.js?v=0.29.4','attack-catalog.js?v=0.29.4','combat.js?v=0.29.4','battle-catalog.js?v=0.29.4','skills.js?v=0.29.4','weapons.js?v=0.29.4','inventory.js?v=0.29.4','geometry.js?v=0.29.4','physics.js?v=0.29.4','encounters.js?v=0.29.4','final-team.js?v=0.29.4','enemy-attacks.js?v=0.29.4','enemy-actions.js?v=0.29.4','engine.js?v=0.29.4');
onmessage=e=>{
 const {id,state,seed}=e.data,start=performance.now();
 try{state.random=ArcEngine.seeded(seed);const result=ArcEngine.planEnemyAction(state,state.random);postMessage({id,...result,elapsed:performance.now()-start});}
 catch(error){postMessage({id,error:String(error)});}
};
