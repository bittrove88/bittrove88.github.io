'use strict';
importScripts('crew.js?v=0.29.7','crew-usage.js?v=0.29.7','levels.js?v=0.29.7','attack-catalog.js?v=0.29.7','combat.js?v=0.29.7','battle-catalog.js?v=0.29.7','skills.js?v=0.29.7','weapons.js?v=0.29.7','inventory.js?v=0.29.7','geometry.js?v=0.29.7','physics.js?v=0.29.7','encounters.js?v=0.29.7','final-team.js?v=0.29.7','enemy-attacks.js?v=0.29.7','enemy-actions.js?v=0.29.7','engine.js?v=0.29.7');
onmessage=e=>{
 const {id,state,seed}=e.data,start=performance.now();
 try{state.random=ArcEngine.seeded(seed);const result=ArcEngine.planEnemyAction(state,state.random);postMessage({id,...result,elapsed:performance.now()-start});}
 catch(error){postMessage({id,error:String(error)});}
};
