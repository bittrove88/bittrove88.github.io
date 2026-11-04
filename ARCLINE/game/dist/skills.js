(function(root){
'use strict';
const data=[
 ['S_CHARGE_SLOW_I','Charge Slow I','チャージ減速Ⅰ','◷','Charge speed ×0.7 for 2 turns.'],
 ['S_CHARGE_SLOW_II','Charge Slow II','チャージ減速Ⅱ','◴','Charge speed ×0.4 for the next shot.'],
 ['S_POWER_UP_I','Power Up I','火力アップⅠ','↑','Damage ×1.2 for 2 turns; attack caps remain.'],
 ['S_POWER_UP_II','Power Up II','火力アップⅡ','⇈','Damage ×1.4 for the next shot; attack caps remain.'],
 ['S_SPECIAL_REFILL','Special Refill','必殺補充','↻','Refill special ammunition to 3.'],
 ['S_FREE_MOVE','Free Move','移動無制限','∞','Unlimited walking for 2 turns; terrain still blocks.'],
 ['S_BARRIER','Barrier','バリア','⬡','Halve damage for 2 enemy turns.'],
 ['S_ENEMY_WEAKEN','Enemy Weaken','敵火力低下','↓','Enemy damage ×0.6 for 2 enemy turns.'],
 ['S_ENEMY_SKIP','Enemy Skip','敵スキップ','Ⅱ','Skip the next enemy movement and attack.'],
 ['S_LOW_GRAVITY','Low Gravity','低重力','⇡','All projectile gravity ×0.5 for 2 turns.'],
 ['S_HIGH_GRAVITY','High Gravity','高重力','⇣','All projectile gravity ×2 for 2 turns.'],
 ['S_REPAIR','Field Repair','応急処理','+','Restore 30% max HP. Costs one action.'],
 ['S_FULL_REPAIR','Full Repair','完全修復','✚','Restore all HP. Costs one action.'],
 ['S_INVINCIBLE','Invincible','無敵','☆','Ignore damage from the next enemy turn.'],
 ['S_ALL_ATTACK','All Attack','全体攻撃','✹','Hit all enemies; intact boss parts protect the body. Costs one action.']
];
const rows=data.map(([id,name,nameJa,glyph,note],i)=>({id,name,nameJa,glyph,note,rare:i>=12,instant:true,path:i===11||i===12?'M12 3v18 M3 12h18':'M12 2 22 12 12 22 2 12Z M8 12h8'}));
const notesJa=['チャージ速度70%・2ターン。','チャージ速度40%・次の攻撃1射。','与ダメージ120%・2ターン。射撃上限は維持。','与ダメージ140%・次の攻撃1射。射撃上限は維持。','必殺技の残数を3へ補充。','歩行距離制限を2ターン解除。壁・谷は通れません。','敵2ターンの被ダメージを半減。','敵2ターンの与ダメージを60%へ。','次の敵の移動と攻撃をスキップ。','全弾の重力50%・2ターン。','全弾の重力200%・2ターン。','最大HPの30%回復・1行動。','HPを全回復・1行動。','次の敵ターンの被ダメージを0へ。','敵全体に攻撃。ボスの残存部位を優先・1行動。'];rows.forEach((r,i)=>r.noteJa=notesJa[i]);
const activeIds=rows.map(s=>s.id);
rows.push({id:'S_GUARD',name:'Guard',nameJa:'ガード',glyph:'⬡',note:'Legacy guard: halve the next attack.',path:'M12 2 21 6v7c0 5-5 8-9 10-4-2-9-5-9-10V6Z'}, {id:'S_BREACH',name:'Breach',nameJa:'砕路（旧）',glyph:'✧',note:'Legacy breach: break nearby cover.',path:'M3 3h18v18H3Z M13 3l-4 7 7 3-5 8'});
const ids=rows.map(s=>s.id),get=id=>rows.find(s=>s.id===id)||null;
function compatible(id,weapon){return activeIds.includes(id)||id==='S_GUARD'||id==='S_BREACH'&&!weapon.special&&!weapon.teleport;}
function markup(id){const s=get(id);return s?`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="${s.path}"/></svg>`:'';}
function draw(ctx,id,x,y,size=22){ctx.save();ctx.translate(x-size/2,y-size/2);ctx.scale(size/24,size/24);ctx.strokeStyle='#e9f5cc';ctx.lineWidth=1.7;const p=get(id);if(p&&typeof Path2D!=='undefined')ctx.stroke(new Path2D(p.path));ctx.restore();}
const api={rows,ids,activeIds,get,compatible,markup,draw};if(typeof module!=='undefined')module.exports=api;else root.ArcSkills=api;
})(globalThis);
