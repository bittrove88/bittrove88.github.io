'use strict';
importScripts('crew.js?v=0.30.5','crew-usage.js?v=0.30.5','levels.js?v=0.30.5','attack-catalog.js?v=0.30.5','combat.js?v=0.30.5','battle-catalog.js?v=0.30.5','skills.js?v=0.30.5','weapons.js?v=0.30.5','inventory.js?v=0.30.5','geometry.js?v=0.30.5','physics.js?v=0.30.5','encounters.js?v=0.30.5','final-team.js?v=0.30.5','enemy-attacks.js?v=0.30.5','enemy-actions.js?v=0.30.5','engine.js?v=0.30.5');
onmessage=e=>{
 const {id,state,seed}=e.data,start=performance.now();
 try{state.random=ArcEngine.seeded(seed);const result=ArcEngine.planEnemyAction(state,state.random);postMessage({id,...result,elapsed:performance.now()-start});}
 catch(error){postMessage({id,error:String(error)});}
};
