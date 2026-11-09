'use strict';
// Reverse only the reviewed 0.29.3 attack delta when older byte-pinned tests
// verify their own historical scope. Live behavior is checked by damage-sync.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const manifest=require('../../design/attacks/damage-sync-0293-scope.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function source(file,bytes){
 bytes=require("./damage-display-preservation.cjs").source(file,bytes);
 const patch=manifest.sourcePatches[file];if(!patch)return bytes;
 assert.equal(sha(bytes),patch.afterSha256,'exact authorized0.29.3 attack delta '+file);
 let text=bytes.toString();for(const edit of [...patch.edits].reverse()){
  assert.equal(text.split(edit.after).length-1,1,'unique attack source edit '+file);
  text=text.replace(edit.after,()=>edit.before);
 }
 assert.equal(sha(text),patch.beforeSha256,'all other source bytes preserved '+file);
 return Buffer.from(text);
}
const key=r=>[r.stage,r.id,r.difficulty,r.seed].join(':');
function replay(row,type='MAP_REPLAYS'){
 const rows=require('../../evidence/damage-sync-0293/'+type+'.json').rows;
 return rows.find(r=>key(r)===key(row))||row;
}
module.exports={source,replay,manifest};
