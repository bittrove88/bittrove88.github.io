'use strict';
const assert=require('node:assert/strict'),C=require('../dist/enemy-camera.js'),E=require('../dist/engine.js');
let checks=0;const ok=(v,m)=>{checks++;assert.ok(v,m);},eq=(a,b,m)=>{checks++;assert.deepEqual(a,b,m);};
const frame={left:24,right:544,top:90,bottom:202},normal={scale:.52,x:-300,y:200};
for(const stage of [1,41,58,85,90,92,95,100]){
 const s=E.campaign(stage,{matchSeed:42});s.turn=1;s.phase='cpu';const plan=E.cpuPlan(s,E.seeded(42)),before=JSON.stringify({s,plan}),box=C.bounds(s,plan),focus=C.prepare(s,plan,normal,frame);
 const from=C.view(normal,focus,s,frame),close=C.view(normal,{...focus,age:C.timing.lead},s,frame);
 eq(from,normal,'preparation starts at the displayed view '+stage);
 ok(C.visible(close,box,frame),'whole shooter and emitted origins fit '+stage);
 ok(close.scale<=normal.scale,'only shrink when needed '+stage);
 eq(C.view(normal,focus,s,frame,null,true),close,'reduced motion immediately frames shooter '+stage);
 for(const t of [0,box.lastStart,box.lastStart+C.timing.flash])ok(C.visible(C.view(normal,focus,s,frame,t),box,frame),'hold through every emission '+stage+' '+t);
 eq(C.view(normal,focus,s,frame,box.lastStart+C.timing.flash+C.timing.release+.01),normal,'return to current tracking camera '+stage);
 ok(C.visible(C.view(normal,focus,s,frame,box.lastStart+C.timing.flash+1e-10,true),box,frame),'reduced-motion emission boundary is inclusive '+stage);
 eq(JSON.stringify({s,plan}),before,'framing cannot mutate combat or the plan '+stage);
 const ready=C.prepare(s,plan,close,frame);ok(!ready.needed,'visible shooter needs no lead '+stage);eq(C.fit(close,box,frame),close,'visible framing is unchanged '+stage);
 const guarded={...s,get world(){throw Error('camera must not inspect collision world');}};eq(C.bounds(guarded,plan),box,'no collision simulation '+stage);
}
const s=E.campaign(90);s.turn=1;const p=E.cpuPlan(s,E.seeded(42)),m=E.geometry.muzzle(s,1,p.angle);
const volley={...p,bullets:[{primary:true,start:0,path:[{...m,t:0}]},{primary:false,start:.25,path:[{...m,t:.25}]},{primary:false,start:3,path:[{x:9000,y:-9000,t:3}]}]};
const b=C.bounds(s,volley);eq(b.lastStart,.25,'second barrel counts but remote split children do not');ok(b.right<9000&&b.top>-9000,'future split does not frame the whole trajectory');
const rain={...p,bullets:[{primary:true,start:.8,path:[{x:50,y:-800,t:.8}]}]};ok(C.bounds(s,rain).top<=-810,'real rain origin is included separately from cannon');
const beam={...p,bullets:[{effect:'beam',primary:true,start:0,path:[{x:9000,y:9000,t:0}]}],events:[{type:'final-beam',t:.5,from:{x:m.x,y:m.y}}]};
eq(C.bounds(s,beam).lastStart,.5,'beam focus lasts through the charge');ok(C.bounds(s,beam).right<9000,'beam target placeholder is not its source');
eq(C.prepare(s,{...p,echo:true},normal,frame),null,'existing echo presentation retains ownership');eq(C.prepare(s,{...p,side:0},normal,frame),null,'player charge and shots retain ownership');
const echo={...p,echo:true,echoUnit:{...s.units[1],x:300,y:700}};const ef=C.prepare(s,echo,normal,frame,true);ok(!!ef,'light-motion echo uses the common source frame');ok(C.visible(C.view(normal,ef,s,frame,0,true),C.bounds(s,echo),frame),'light-motion echo frames old position rather than main body');
console.log('PASS enemy-camera '+checks+' focused checks');
