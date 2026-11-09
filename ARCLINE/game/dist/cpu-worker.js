'use strict';
importScripts('crew.js?v=0.31.0','crew-usage.js?v=0.31.0','levels.js?v=0.31.0','attack-catalog.js?v=0.31.0','combat.js?v=0.31.0','battle-catalog.js?v=0.31.0','skills.js?v=0.31.0','weapons.js?v=0.31.0','inventory.js?v=0.31.0','geometry.js?v=0.31.0','physics.js?v=0.31.0','encounters.js?v=0.31.0','final-team.js?v=0.31.0','enemy-attacks.js?v=0.31.0','boss-actions.js?v=0.31.0','enemy-actions.js?v=0.31.0','engine.js?v=0.31.0');
onmessage=e=>{
 const {id,state,seed}=e.data,start=performance.now();
 try{state.random=ArcEngine.seeded(seed);const result=ArcEngine.planEnemyAction(state,state.random);postMessage({id,...result,elapsed:performance.now()-start});}
 catch(error){postMessage({id,error:String(error)});}
};
