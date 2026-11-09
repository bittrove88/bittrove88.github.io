'use strict';
importScripts('crew.js?v=0.30.1','crew-usage.js?v=0.30.1','levels.js?v=0.30.1','attack-catalog.js?v=0.30.1','combat.js?v=0.30.1','battle-catalog.js?v=0.30.1','skills.js?v=0.30.1','weapons.js?v=0.30.1','inventory.js?v=0.30.1','geometry.js?v=0.30.1','physics.js?v=0.30.1','encounters.js?v=0.30.1','final-team.js?v=0.30.1','enemy-attacks.js?v=0.30.1','enemy-actions.js?v=0.30.1','engine.js?v=0.30.1');
onmessage=e=>{
 const {id,state,seed}=e.data,start=performance.now();
 try{state.random=ArcEngine.seeded(seed);const result=ArcEngine.planEnemyAction(state,state.random);postMessage({id,...result,elapsed:performance.now()-start});}
 catch(error){postMessage({id,error:String(error)});}
};
