'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const art = require('../dist/atmosphere.js');

// Minimal Canvas 2D instrumentation. It forbids gradients and image loading,
// tracks the matte color fields, and checks that draw() restores its state.
function makeContext() {
  let saves = 0;
  const calls = [];
  const state = {fillStyle:'#000000', sx:1, sy:1};
  const stack = [];
  let pathCommands = [];
  const ctx = {
    get fillStyle() {return state.fillStyle;},
    set fillStyle(v) {assert.match(v,/^#[0-9a-f]{6}$/i);state.fillStyle=v;},
    save() {saves++;stack.push({...state});},
    restore() {assert.ok(stack.length,'unpaired restore');Object.assign(state,stack.pop());saves--;},
    scale(x,y) {state.sx*=x;state.sy*=y;},
    beginPath(){pathCommands=[];},
    moveTo(x,y){pathCommands.push(['M',x,y]);},
    lineTo(x,y){pathCommands.push(['L',x,y]);},
    bezierCurveTo(...args){assert.equal(args.length,6);pathCommands.push(['C',...args]);},
    closePath(){pathCommands.push(['Z']);},
    arc(x,y,r,a,b){assert.ok(r>0&&b>a);pathCommands.push(['circle',x,y,r]);},
    fill(){assert.ok(pathCommands.length,'empty fill');calls.push({type:'path',style:state.fillStyle,sx:state.sx,sy:state.sy,path:pathCommands});},
    fillRect(x,y,w,h){calls.push({type:'rect',style:state.fillStyle,sx:state.sx,sy:state.sy,x,y,w,h});},
    createLinearGradient(){throw Error('gradient banned');},
    createRadialGradient(){throw Error('gradient banned');},
    drawImage(){throw Error('raster image banned');}
  };
  return {ctx,calls,check(){assert.equal(saves,0,'context not restored');}};
}

for (const [w,h] of [[568,240],[844,390],[393,852],[1000,540]]) {
  const {ctx,calls,check} = makeContext();
  assert.equal(art.draw(ctx,w,h,4),true);
  check();
  assert.ok(calls.length>=17,`${w}x${h}: missing design layers`);
  assert.ok(new Set(calls.map(c=>c.style)).size>=12,`${w}x${h}: too few color fields`);
  const active = calls.length;
  assert.equal(art.draw(ctx,w,h,0),false,'unrelated themes must not be touched');
  assert.equal(calls.length,active);
  for (const c of calls) assert.match(c.style,/^#[0-9a-f]{6}$/i);
}
assert.deepEqual(art.supportedThemes,[4]);
const src=fs.readFileSync(path.resolve(__dirname,'../dist/atmosphere.js'),'utf8');
for (const bad of ['createLinearGradient','createRadialGradient','drawImage','shadowBlur']) {
  assert.doesNotMatch(src,new RegExp('\\.'+bad+'\\s*\\('));
}
console.log('PASS: Mist Valley artwork, 4 sizes, single theme, opaque colors, no gradients/images, context restored');
