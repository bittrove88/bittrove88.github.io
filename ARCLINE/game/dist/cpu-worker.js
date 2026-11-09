'use strict';
importScripts('crew.js?v=0.31.3','crew-usage.js?v=0.31.3','levels.js?v=0.31.3','attack-catalog.js?v=0.31.3','combat.js?v=0.31.3','battle-catalog.js?v=0.31.3','skills.js?v=0.31.3','weapons.js?v=0.31.3','inventory.js?v=0.31.3','geometry.js?v=0.31.3','physics.js?v=0.31.3','encounters.js?v=0.31.3','final-team.js?v=0.31.3','enemy-attacks.js?v=0.31.3','boss-actions.js?v=0.31.3','enemy-actions.js?v=0.31.3','engine.js?v=0.31.3');
onmessage=e=>{
 const {id,state,seed}=e.data,start=performance.now();
 try{state.random=ArcEngine.seeded(seed);const result=ArcEngine.planEnemyAction(state,state.random);postMessage({id,...result,elapsed:performance.now()-start});}
 catch(error){postMessage({id,error:String(error)});}
};
