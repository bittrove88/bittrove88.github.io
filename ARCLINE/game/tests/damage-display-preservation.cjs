'use strict';
// Reverse only the approved0.29.6 label/ring delta for historical source guards.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),manifest=require('../../design/attacks/damage-display-0296-scope.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function source(file,bytes){
 const patch=manifest.sourcePatches[file];if(!patch)return bytes;
 assert.equal(sha(bytes),patch.afterSha256,'exact approved0.29.6 delta '+file);
 let text=bytes.toString();for(const edit of [...patch.edits].reverse()){
  assert.equal(text.split(edit.after).length-1,1,'unique0.29.6 source edit '+file);text=text.replace(edit.after,()=>edit.before);
 }
 assert.equal(sha(text),patch.beforeSha256,'other source bytes preserved '+file);return Buffer.from(text);
}
module.exports={source,manifest};
