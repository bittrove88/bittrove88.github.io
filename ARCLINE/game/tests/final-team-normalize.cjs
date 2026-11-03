'use strict';
const patches=require('./final-team-patches.json');
module.exports=(path,text)=>{for(const p of [...(patches[path]||[])].reverse()){const count=text.split(p.after).length-1;if(count!==p.count)throw Error('Patch normalization mismatch '+path+' '+count+'/'+p.count);text=text.split(p.after).join(p.before);}return text;};
