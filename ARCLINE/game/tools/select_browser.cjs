'use strict';
// Native AAC is part of the acceptance test. Select a locally installed browser
// by decoding the approved bytes, rather than assuming bundled codecs exist.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{chromium}=require('playwright');
module.exports=async function selectBrowser(output){
 const candidates=process.env.ARCLINE_CHROMIUM?[process.env.ARCLINE_CHROMIUM]:['/usr/bin/chromium','/usr/bin/google-chrome',chromium.executablePath()];
 const track=fs.readFileSync(path.resolve(__dirname,'../../assets/audio/bgm/bgm_title.m4a')),rows=[];
 const server=http.createServer((q,r)=>{if(q.url==='/track.m4a'){r.setHeader('Content-Type','audio/mp4');r.end(track);}else{r.setHeader('Content-Type','text/html');r.end('<button id="play">Play</button>');}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{for(const executablePath of [...new Set(candidates)].filter(f=>fs.existsSync(f))){
  let browser;const row={executablePath,ok:false};
  try{browser=await chromium.launch({executablePath,args:['--no-sandbox']});row.version=browser.version();const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);await page.evaluate(()=>{window.probeAudio=new Audio('/track.m4a');probeAudio.muted=true;window.probeError=null;document.getElementById('play').onclick=()=>probeAudio.play().catch(e=>probeError=String(e));});await page.click('#play');await page.waitForFunction('probeAudio.currentTime>.1||probeAudio.error||probeError',{},{timeout:7000});Object.assign(row,await page.evaluate(()=>({position:probeAudio.currentTime,duration:probeAudio.duration,codec:probeAudio.canPlayType('audio/mp4; codecs="mp4a.40.2"'),error:probeAudio.error?.message||probeError})));row.ok=row.position>.1&&!row.error;
  }catch(error){row.error=String(error);}finally{await browser?.close();}
  rows.push(row);if(row.ok){fs.writeFileSync(path.join(output,'BROWSER_AAC_PROBE.json'),JSON.stringify({status:'PASS',selected:executablePath,rows},null,2)+'\n');console.log('Native AAC browser: '+executablePath+' / '+row.version);return executablePath;}
 }
 fs.writeFileSync(path.join(output,'BROWSER_AAC_PROBE.json'),JSON.stringify({status:'FAIL',rows},null,2)+'\n');throw Error('No installed browser decoded approved AAC: '+JSON.stringify(rows));
 }finally{server.close();}
};
