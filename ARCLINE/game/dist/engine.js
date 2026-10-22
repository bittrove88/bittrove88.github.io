(function(root){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rigs=[{name:'KESTREL',hp:100,damage:30,blast:65,move:64},{name:'BASALT',hp:120,damage:36,blast:82,move:40}];
const biomes=[
{name:'Tidal Flats',tag:'ROLLING SHORE',sky:['#245c76','#8cc0bd','#376e7d'],land:'#457f80',edge:'#c5d8ac'},
{name:'Amber Dunes',tag:'SHIFTING RIDGES',sky:['#725346','#eac093','#986e54'],land:'#ad835b',edge:'#ffe0a3'},
{name:'Frost Steps',tag:'TERRACED ICE',sky:['#304c78','#b6d6ea','#617e9c'],land:'#6b9cba',edge:'#e3fcff'},
{name:'Twin Spires',tag:'DOUBLE SUMMIT',sky:['#433b6b','#bda6c5','#635475'],land:'#6c6686',edge:'#e0caeb'},
{name:'Red Mesa',tag:'HIGH PLATEAU',sky:['#683d52','#e9a684','#88535c'],land:'#a56b64',edge:'#ffcfaa'},
{name:'Crystal Garden',tag:'SHARP CRESTS',sky:['#273f62','#98d7cc','#457d8c'],land:'#4f9698',edge:'#b9ffee'},
{name:'Lunar Basin',tag:'DEEP CRATER',sky:['#242d53','#7d8caf','#454e76'],land:'#646c91',edge:'#c8d4ff'},
{name:'Emerald Rise',tag:'CROSSING SLOPES',sky:['#234f51','#a1c9a0','#437961'],land:'#527f5f',edge:'#ddeda5'},
{name:'Storm Divide',tag:'THE GREAT WALL',sky:['#30384d','#94a2b7','#4c5c74'],land:'#586d80',edge:'#d5e8ef'},
{name:'Sky Citadel',tag:'TRIPLE DEFENCE',sky:['#452f62','#cc9cb8','#725577'],land:'#85688b',edge:'#f3d0ed'}];
function terrain(x,map){const n=clamp(Math.floor(map),0,99),type=n%10,tier=Math.floor(n/10),a=12+n*.95,c=500+Math.sin(n*1.73)*45;const bump=(mid,width)=>Math.exp(-(((x-mid)/width)**2));let y=355;
switch(type){case 0:y+=Math.sin(x/(145-tier*4)+n*.2)*(5+tier*3);break;
case 1:y-=a*(.6*bump(350,110)+bump(650,140));break;
case 2:y-=a*(Math.tanh((x-310)/38)-Math.tanh((x-710)/38))*.6;y+=Math.sin(x/75)*6;break;
case 3:y-=a*(bump(390,65)+1.15*bump(610,70));break;
case 4:y-=a*(Math.tanh((x-330)/45)-Math.tanh((x-680)/45))*.8;break;
case 5:y-=a*bump(c,210)*(.35+Math.abs(Math.sin((x-240)/70)));break;
case 6:y+=a*.5*bump(c,140);y-=a*.6*(bump(290,80)+bump(730,80));break;
case 7:y-=a*(bump(370,110)-.4*bump(520,90)+bump(670,110));break;
case 8:y-=a*1.5*bump(c,70-tier*2);break;
case 9:y-=a*(.65*bump(300,50)+bump(500,60)+.85*bump(700,50));break;}
if(tier>0)y-=tier*5*bump(c+Math.sin(n)*95,90);if(tier>3)y-=((tier-3)*7)*bump(420+Math.sin(n*.8)*110,45);y+=Math.sin(x/83+n)*Math.min(9,n*.13);return clamp(y,130,405);}
const terrainCache=new Map();
function ground(x,map){const n=clamp(Math.floor(map),0,99);let data=terrainCache.get(n);if(!data){data=Float64Array.from({length:1001},(_,i)=>terrain(i,n));terrainCache.set(n,data);}const v=clamp(x,0,1000),i=Math.floor(v);return data[i]+((data[Math.min(1000,i+1)]-data[i])*(v-i));}
function campaign(stage=1,rig=0){const n=clamp(Math.floor(stage),1,100),s=create(rig,n-1,n>=81?2:n>=51?1:0);s.stage=n;s.units[0].x=155+Math.sin(n*.7)*28;s.units[1].x=845+Math.cos(n*.9)*28;s.angle=n<5?48:60;return s;}
function chargePower(seconds){const t=(Math.max(0,seconds)/.72)%2;return 20+80*(t<=1?t:2-t);}
function create(rig=0,map=0,level=0){return {rig,map,level,round:1,turn:0,phase:'aim',time:0,move:100,units:[{rig,x:155,hp:rigs[rig].hp},{rig:1-rig,x:845,hp:rigs[1-rig].hp}],last:[null,null],angle:48,power:70,result:null};}
function trajectory(s,side,angle,power){const u=s.units[side],dir=side===0?1:-1,a=angle*Math.PI/180,v=power*6.7;let x=u.x+dir*Math.cos(a)*25,y=ground(u.x,s.map)-23-Math.sin(a)*25,vx=Math.cos(a)*v*dir,vy=-Math.sin(a)*v;const path=[{x,y}];let hit=-1;for(let i=0;i<1600;i++){x+=vx/120;y+=vy/120;vy+=300/120;path.push({x,y});for(let j=0;j<2;j++){if(i>5&&Math.hypot(x-s.units[j].x,y-(ground(s.units[j].x,s.map)-18))<22){hit=j;break;}}if(hit>=0||x<0||x>1000||y>470||(y>=ground(x,s.map)))break;}return {path,hit,end:path[path.length-1],angle,power};}
function damage(s,shot,side){const r=rigs[s.units[side].rig];return s.units.map((u,i)=>{const d=Math.hypot(shot.end.x-u.x,shot.end.y-(ground(u.x,s.map)-15));return shot.hit===i?r.damage:d<r.blast?Math.max(1,Math.round(r.damage*(1-d/r.blast))):0;});}
function resolve(s,shot,side){const ds=damage(s,shot,side);s.units.forEach((u,i)=>u.hp=Math.max(0,u.hp-ds[i]));s.last[side]=shot;check(s);return ds;}
function check(s){if(s.units.some(u=>u.hp<=0)){s.result=s.units[0].hp<=0?(s.units[1].hp<=0?'draw':'lose'):'win';s.phase='over';return true;}return false;}
function next(s){if(check(s))return;s.turn=1-s.turn;if(s.turn===0){s.round++;if(s.round>10){s.units.forEach(u=>u.hp=Math.max(0,u.hp-20));if(check(s))return;}}s.phase=s.turn?'cpu':'aim';s.time=s.turn?1.1:0;s.move=100;}
function move(s,side,amount){if(s.phase==='over'||side!==s.turn)return 0;const u=s.units[side],x=clamp(u.x+amount,side?560:50,side?950:440),spent=Math.abs(x-u.x);u.x=x;return spent;}
function solve(s,side){let best={score:-Infinity};for(let angle=25;angle<=80;angle+=3)for(let power=30;power<=100;power+=2){const shot=trajectory(s,side,angle,power),d=damage(s,shot,side),score=d[1-side]-d[side]*2-Math.abs(shot.end.x-s.units[1-side].x)*.001;if(score>best.score)best={angle,power,score};}return best;}
function cpu(s,random=Math.random){const lv=s.level; if(lv>0&&s.round>1){const original=s.units[1].x,options=[0,-rigs[s.units[1].rig].move,rigs[s.units[1].rig].move];let best={score:-Infinity,dx:0};for(const dx of options){s.units[1].x=clamp(original+dx,570,945);const shot=solve(s,1),incoming=s.last[0],avoid=incoming?Math.min(90,Math.abs(incoming.end.x-s.units[1].x))*.08:0,score=shot.score+avoid;if(score>best.score)best={score,dx};}s.units[1].x=original;move(s,1,best.dx);}const b=solve(s,1),err=[14,8,4][lv];return trajectory(s,1,clamp(b.angle+(random()-.5)*err,15,85),clamp(b.power+(random()-.5)*err,20,100));}
const api={biomes,campaign,chargePower,rigs,ground,create,trajectory,damage,resolve,next,move,solve,cpu,clamp};if(typeof module!=='undefined')module.exports=api;else root.ArcEngine=api;
})(globalThis);
