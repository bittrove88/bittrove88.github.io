'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const E=require('../dist/engine.js'),C=E.combat,P=require('../dist/preview.js'),W=require('../dist/weapons.js'),K=require('../dist/skills.js'),M=require('../dist/sfx-manager.js'),D=require('../dist/sfx-data.js');
let checks=0;const ok=(v,m)=>{assert(v,m);checks++;},eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};
function arena(id){const s=E.campaign(1,{equippedCharacterId:id});s.spec={...s.spec,floors:[[[0,5],[100,5]]],components:[],features:[],staticFeatures:[],phaseFeatures:null};s.world=E.geometry.world(s.spec);s.units=[150,950].map(x=>({...E.geometry.safePosition(s.world,x,450),hp:50,maxHp:50,parts:[],range:[35,965]}));s.pickups=[];return s;}
// Compare real paths, not only profile constants. Explicit weapon/skill effects
// remain in effect, but switching machines cannot change a given action's path.
const ids=C.profiles.map(p=>p.id);let trajectoryCases=0;
for(const weaponId of [...W.weapons.map(w=>w.id),'TELEPORT'])for(const power of[20,60,100])for(const skill of[null,...W.skills]){
 const paths=ids.map(id=>E.trajectory(arena(id),0,48,power,{weaponId,skill}).bullets.map(b=>({start:b.start,path:b.path})));
 for(let i=1;i<paths.length;i++)eq(paths[i],paths[0],'same character-independent path '+weaponId+'/'+power+'/'+skill+'/'+ids[i]);trajectoryCases+=ids.length;
}
const plans={};for(const id of ids){const demo=P.create(arena(id),'S_'+id.toUpperCase());ok(demo?.proof.valid,'real special preview '+id);plans[id]=demo.plan;}
const cues=id=>M.timeline(plans[id]).cues;
eq(cues('hana').filter(c=>c.kind==='fire').map(c=>[c.id,c.t]),[['SP_HANA_1',0],['SP_HANA_2',.18],['SP_HANA_3',.36]],'Hana distinct physical starts');
eq(cues('mogu').filter(c=>c.kind==='impact').map(c=>c.id),['I04','I04','I04'],'Mogu exactly three main explosions');
ok(Math.abs(cues('mogu').filter(c=>c.kind==='impact')[1].t-cues('mogu').filter(c=>c.kind==='impact')[0].t-.22)<1e-6,'actual .22 pulse delay');
eq(cues('sora').filter(c=>c.kind==='fire').length,1,'split children never fire');eq(cues('sora').filter(c=>c.id==='S02').length,1,'one split sound');ok(cues('sora').filter(c=>c.kind==='impact').every(c=>c.id==='I01'&&c.gainDb===-11),'quiet child contacts');
eq(cues('ban').filter(c=>c.id==='S01').length,1,'one wave');eq(cues('ban').filter(c=>c.id==='I05').length,0,'no doubled wave main');
eq(cues('yui').filter(c=>c.id==='S04').length,1,'actual pull coalesced');eq(cues('yui').filter(c=>c.id==='S05').length,1,'one compression');eq(cues('yui').filter(c=>c.id==='I05').length,0,'no doubled compression');
eq(cues('rico').filter(c=>c.kind==='bounce').map(c=>c.id),['R1','R2','R3','R4'],'actual bounce escalation');ok(cues('rico').some(c=>c.id==='I_RICO'),'four-bounce final blend');
ok(cues('hibari').filter(c=>c.kind==='impact').every(c=>c.id==='I03_HIBARI'),'exclusive airburst variant');ok(cues('rin').some(c=>c.id==='S06'),'special center accent');
const normalCritical=E.trajectory(arena('rin'),0,0,100,{weaponId:'W01',origin:{x:902,y:428,theta:0,dx:1,dy:0,dir:1}});ok(!M.timeline(normalCritical).cues.some(c=>c.id==='S06'),'no normal critical accent');
for(const span of M.timeline(plans.koro).rolls){ok(span.end>span.start,'positive rolling span');ok(!cues('koro').some(c=>c.kind==='impact'&&c.t>span.start&&c.t<span.end),'no impact during roll');}
const before=JSON.stringify(plans);for(const id of ids)M.timeline(plans[id]);eq(JSON.stringify(plans),before,'sound planning never mutates physical cursors or plan');
eq(Object.keys(D.assets).length,37,'37 adopted assets');eq(Object.values(D.assets).filter(a=>a.version==='r1').length,7,'seven r1 replacements');
for(const a of Object.values(D.assets)){eq(crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'../../',a.src))).digest('hex'),a.sha256,'byte-identical WAV '+a.id);ok(!/J-01|Ricochet_v|archive\//.test(a.src),'no excluded material');}
// Instrumented WebAudio lifecycle checks include async decode failures and
// cancellation. Real WAV decode and actual node graph are covered in browser.
function audio(){const sources=[],nodes=[];const node=()=>({connect(n){return n;},disconnect(){},gain:{value:0}});return {state:'running',currentTime:1,destination:node(),sources,nodes,createGain:node,createDynamicsCompressor:()=>Object.assign(node(),Object.fromEntries(['threshold','knee','ratio','attack','release'].map(k=>[k,{value:0}]))),createBufferSource(){const n={...node(),stopped:false,start(t,offset){this.at=t;this.offset=offset;},stop(){this.stopped=true;}};sources.push(n);return n;},decodeAudioData:async()=>({duration:1.2})};}
(async()=>{
 const ctx=audio(),played=[],warnings=[],fetched=[];const manager=M.create({context:()=>ctx,fetch:async url=>{fetched.push(url);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};},played:c=>played.push(c),warn:(...a)=>warnings.push(a)});
 manager.sync({token:1,paused:false});await manager.prepare('hana');ok(fetched.length<37,'lazy current machine plus common prefetch only');
 manager.begin(plans.hana);manager.update(.17);eq(played.filter(c=>c.kind==='fire').length,1,'no early delayed fire');manager.update(.18);manager.update(.18);eq(played.filter(c=>c.kind==='fire').length,2,'cursor never repeats a frame');manager.sync({token:1,paused:true});ok(ctx.sources.every(s=>s.stopped),'pause releases every active source');manager.update(.36);manager.sync({token:1,paused:false});manager.update(.36);eq(played.filter(c=>c.kind==='fire').length,2,'muted events not backlogged');
 await manager.prepare('koro');manager.begin(plans.koro);const span=M.timeline(plans.koro).rolls[0];manager.update(span.start+.05);ok(manager.state().rolling,'loop on actual roll');manager.sync({token:1,paused:true});ok(!manager.state().rolling,'loop stops on pause');manager.sync({token:1,paused:false});ok(manager.state().rolling,'loop resumes same roll');ok(Math.abs(played.at(-1).offset-.05)<1e-6,'resume offset follows physical roll age');manager.update(span.end);ok(!manager.state().rolling,'roll fall stops loop');manager.sync({token:2,paused:false});eq(manager.state().voices,0,'token transition releases voices');
 manager.begin(plans.sora);manager.update(plans.sora.duration);ok(manager.state().voices<=D.mix.maxVoices,'polyphony bounded after frame jump');manager.finish();ok(!manager.state().rolling,'finish frees loop');manager.stop();eq(manager.state().voices,0,'title/stop frees all nodes');
 const badCtx=audio(),bad=M.create({context:()=>badCtx,fetch:async()=>{throw Error('missing');},warn:(...args)=>warnings.push(args)});bad.sync({token:1,paused:false});await bad.load('F01');await bad.load('F01');eq(warnings.length,1,'warn once and fail silent');bad.begin(plans.gun);bad.finish();
 const simple={weaponId:'W01',power:50,side:0,bullets:[],events:[{type:'break',t:1,x:30,y:40,bullet:0},{type:'break',t:1,x:31,y:40,bullet:0}],impacts:[],duration:1};const debris=M.timeline(simple).cues;eq(debris.length,1,'same-frame fragments coalesced');eq([debris[0].id,debris[0].delay,debris[0].gainDb],['D01',.015,-3],'debris timing and mix');
 const noPull={...plans.yui,events:plans.yui.events.filter(e=>e.type!=='pull')};ok(!M.timeline(noPull).cues.some(c=>c.id==='S04'),'no synthetic pull without event');
 const out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-0190';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'COMBAT_SFX_UNIT.json'),JSON.stringify({status:'PASS',checks,trajectoryCases,sounds:37,r1:7,scope:'Real paths across10 machines/21 actions/3 powers/skills;10 real special event mappings; immutable plan; bounded WebAudio nodes, lazy loading, pause/mute/token/roll offset, failures, asset hashes.'},null,2));console.log({status:'PASS',checks,trajectoryCases});
})().catch(e=>{console.error(e);process.exitCode=1;});
