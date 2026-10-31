(function(root){
'use strict';
const rows=[
 {id:'S_GUARD',name:'Guard',note:'Halve the next rival attack.',path:'M12 2 21 6v7c0 5-5 8-9 10-4-2-9-5-9-10V6Z M7 12l4 4 7-8'},
 {id:'S_BREACH',name:'Breach',note:'Break one more nearby cover piece.',path:'M3 3h18v18H3Z M13 3l-4 7 7 3-5 8 M3 12h5 M17 16h4'},
 {id:'S_REPAIR',name:'Field Repair',shortName:'Repair',note:'Restore 30 HP. Costs one action.',path:'M15 3a6 6 0 0 0-6 8L2 18l4 4 7-7a6 6 0 0 0 8-6l-5 3-4-4Z'}
].map(Object.freeze),ids=Object.freeze(rows.map(s=>s.id));Object.freeze(rows);
const get=id=>rows.find(s=>s.id===id)||null;
function compatible(id,weapon){return id==='S_GUARD'||id==='S_BREACH'&&!weapon.special&&!weapon.teleport;}
function markup(id){const s=get(id);return s?`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${s.path}"/></svg>`:'';}
function draw(ctx,id,x,y,size=22){ctx.save();ctx.translate(x-size/2,y-size/2);ctx.scale(size/24,size/24);ctx.strokeStyle='#e9f5cc';ctx.lineWidth=1.7;ctx.lineCap='round';ctx.lineJoin='round';const p=get(id);if(p&&typeof Path2D!=='undefined')ctx.stroke(new Path2D(p.path));ctx.restore();}
const api={rows,ids,get,compatible,markup,draw};if(typeof module!=='undefined')module.exports=api;else root.ArcSkills=api;
})(globalThis);
