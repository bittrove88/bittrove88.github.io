'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../dist/engine.js');globalThis.ArcEngine=E;
const C=require('../ui/map-camera.js');let checks=0;
const ok=(value,message)=>{checks++;assert(value,message);};
for(let stage=1;stage<=100;stage++){
 const state=E.campaign(stage),before=JSON.stringify(state),area=C.bounds(state);
 for(const [width,height]of[[544,98],[820,248],[1420,748],[366,650]]){
  const frame={left:12,top:64,width,height},view=C.fit(area,frame);
  ok(Number.isFinite(view.scale)&&view.scale>0,'finite overview '+stage);
  ok(area.left*view.scale+view.x>=frame.left-1e-7&&area.right*view.scale+view.x<=frame.left+width+1e-7&&area.top*view.scale+view.y>=frame.top-1e-7&&area.bottom*view.scale+view.y<=frame.top+height+1e-7,'whole map fits '+stage);
  let moved=C.zoom(view,3,{x:frame.left+width/2,y:frame.top+height/2},area,frame);
  moved=C.constrain({...moved,x:1e8,y:-1e8},area,frame);
  const spanX=(area.right-area.left)*moved.scale,spanY=(area.bottom-area.top)*moved.scale;
  ok(spanX<=width+1e-7||area.left*moved.scale+moved.x<=frame.left+1e-7&&area.right*moved.scale+moved.x>=frame.left+width-1e-7,'pan never loses map horizontally '+stage);
  ok(spanY<=height+1e-7||area.top*moved.scale+moved.y<=frame.top+1e-7&&area.bottom*moved.scale+moved.y>=frame.top+height-1e-7,'pan never loses map vertically '+stage);
  const fitBack=C.zoom(moved,1e-9,{x:0,y:0},area,frame);
  ok(Math.abs(fitBack.x-view.x)<1e-7&&Math.abs(fitBack.y-view.y)<1e-7&&fitBack.scale===view.scale,'minimum zoom returns whole map '+stage);
 }
 ok(JSON.stringify(state)===before,'camera never mutates campaign '+stage);
}
const state=E.campaign(37),area=C.bounds(state),frame={left:12,top:64,width:820,height:248};
let view=C.fit(area,frame);const center={x:422,y:188};view=C.zoom(view,2,center,area,frame);
const anchor={x:center.x+25,y:center.y+8},world={x:(anchor.x-view.x)/view.scale,y:(anchor.y-view.y)/view.scale};
const next=C.zoom(view,1.2,anchor,area,frame);
ok(Math.hypot(world.x*next.scale+next.x-anchor.x,world.y*next.scale+next.y-anchor.y)<1e-7,'wheel zoom preserves cursor world point away from edges');
const out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-map-camera';fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'MAP_CAMERA_UNIT.json'),JSON.stringify({status:'PASS',checks,stages:100,scope:'All maps and four frames; full bounds, pan limits, zoom recovery/anchor and no engine state mutation.'},null,2));
console.log({status:'PASS',checks});
