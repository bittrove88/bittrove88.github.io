'use strict';
const patches=require('./final-team-patches.json'),retryPatches=require('./final-retry-patches.json');
function retry(path,text){for(const p of [...(retryPatches[path]||[])].reverse()){const count=text.split(p.after).length-1;if(count!==p.count)throw Error('Final retry patch mismatch '+path+' '+count+'/'+p.count);text=text.split(p.after).join(p.before);}return text;}
module.exports=(path,text)=>{text=retry(path,text);for(const p of [...(patches[path]||[])].reverse()){const count=text.split(p.after).length-1;if(count!==p.count)throw Error('Patch normalization mismatch '+path+' '+count+'/'+p.count);text=text.split(p.after).join(p.before);}return text;};

module.exports.retry=retry;
