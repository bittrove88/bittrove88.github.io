'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),suites=require('../tests/suites.json'),mode=process.argv[2]||'unit';
if(!suites[mode])throw Error('Choose '+Object.keys(suites).join(', '));
const output=process.env.ARCLINE_EVIDENCE_DIR||path.join(os.tmpdir(),'arcline-'+mode);fs.mkdirSync(output,{recursive:true});
(async()=>{
const browserPath=mode==='unit'?'':await require('./select_browser.cjs')(output);
const rows=[];
for(const name of suites[mode]){
 const script=name.startsWith('../site-tests/')?path.join(root,'site-tests',path.basename(name)+'.test.cjs'):path.join(root,'game/tests',name+'.test.cjs');
 const started=Date.now(),result=spawnSync(process.execPath,[script],{cwd:path.dirname(root),env:{...process.env,ARCLINE_EVIDENCE_DIR:output,ARCLINE_CHROMIUM:browserPath},encoding:'utf8',timeout:mode==='unit'?120000:300000,maxBuffer:8*1024*1024});
 const log=(result.stdout||'')+(result.stderr||'')+(result.error?'\n'+result.error.message:'');const logfile=path.basename(name)+'.log';fs.writeFileSync(path.join(output,logfile),log);
 const row={name,status:result.status===0?'PASS':'FAIL',ms:Date.now()-started,log:logfile};rows.push(row);console.log(row.status+' '+name+' ('+row.ms+'ms)');if(row.status==='FAIL')console.error(log.slice(-2400));
}
const report={status:rows.every(r=>r.status==='PASS')?'PASS':'FAIL',mode,rows};fs.writeFileSync(path.join(output,'SUITE_'+mode.toUpperCase()+'.json'),JSON.stringify(report,null,2)+'\n');
process.exitCode=report.status==='PASS'?0:1;
})().catch(error=>{console.error(error);process.exitCode=1;});
