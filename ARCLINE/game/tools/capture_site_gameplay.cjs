'use strict';
// Capture current production UI. This isolated browser never opens a user's save.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {chromium}=require('playwright'),Save=require('../dist/save.js'),release=require('../runtime.json');
const root=path.resolve(__dirname,'../../..'),site=path.join(root,'ARCLINE/site');
const types={'.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.m4a':'audio/mp4','.wav':'audio/wav'};
const server=http.createServer((q,r)=>{
 let f=path.resolve(root,'.'+new URL(q.url,'http://local').pathname);
 if(!f.startsWith(root+path.sep))return r.writeHead(403).end();
 if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f+='/index.html';
 fs.readFile(f,(e,b)=>{if(e)return r.writeHead(404).end();r.setHeader('Content-Type',types[path.extname(f)]||'text/html');r.end(b);});
});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.ARCLINE_CHROMIUM||process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:720},reducedMotion:'reduce'});
  await context.addInitScript(profile=>{
   localStorage.setItem('arcline-campaign-v1',JSON.stringify(profile));
   localStorage.setItem('arcline-install-guide-v1','{"state":"closed"}');
  },Save.decode(JSON.stringify({schemaVersion:8,campaignResetVersion:2,cleared:99,difficulty:'normal',difficultyConfirmed:true,journeyStarted:true,unlockedCharacterIds:Save.characterIds,seenPreviewIds:Save.previewIds,onboarding:{step:'done'},journal:{moviesSeen:['prologue','30','60']}})));
  const p=await context.newPage(),errors=[],captures=[];
  p.on('pageerror',e=>errors.push(String(e)));
  await p.goto('http://127.0.0.1:'+server.address().port+'/ARCLINE/game/dist/');
  await p.waitForFunction('save.ready&&!document.getElementById("play").disabled');
  for(const [name,stage,id,angle]of[['shore',1,'gun',42],['volcano',61,'rin',12],['garden',84,'sora',48],['fortress',91,'yui',36]]){
   const state=await p.evaluate(async({stage,id,angle})=>{
    await save.pending;cancelAnimationFrame(raf);raf=0;lobby();save.data.pendingRecruit=null;save.data.equippedCharacterId=id;
    selectedMap=stage-1;start({skipStory:true});endDemo();encounter=null;document.getElementById('encounterBanner').hidden=true;
    cancelAnimationFrame(raf);raf=0;s.angle=angle;s.power=55;clock=1.5;renderer.resetCamera();hud();draw();
    return {stage:s.stage,character:s.characterId,name:s.spec.name,scene:ArcBackgrounds.sceneFor(s).id,battleVisible:!document.getElementById('battle').hidden};
   },{stage,id,angle});
   if(state.stage!==stage||state.character!==id||!state.battleVisible)throw Error('Unexpected capture state '+JSON.stringify(state));
   const file='gameplay-'+name+'.jpg';
   await p.screenshot({path:path.join(site,file),type:'jpeg',quality:90});
   captures.push({file,stage,character:id,stageName:state.name,scene:state.scene,viewport:[1280,720],sha256:sha(fs.readFileSync(path.join(site,file))),source:'Current production UI and renderer; staged view, not a recorded victory'});
  }
  if(errors.length)throw Error(errors.join('\n'));
  const sourceHashes=Object.fromEntries(['levels.js','backgrounds.js','component-art.js','render.js','skills.js','battle-ui.js','battle-ui.css','battle-catalog.js','battle-aim.js','i18n.js'].map(name=>['game/dist/'+name,sha(fs.readFileSync(path.join(root,'ARCLINE/game/dist',name)))]));
  fs.writeFileSync(path.join(site,'gameplay-captures.json'),JSON.stringify({implementation:release.version,siteRevision:'game-'+release.version,sourceHashes,captures},null,2)+'\n');
  console.log('Captured4 current native game screens for '+release.version);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
