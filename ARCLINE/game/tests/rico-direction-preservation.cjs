'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),manifest=require('../../design/attacks/rico-direction-0302-scope.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function source(file,bytes){bytes=require("./final-projectiles-preservation.cjs").source(file,bytes);const patch=manifest.sourcePatches[file];if(!patch)return bytes;assert.equal(sha(bytes),patch.afterSha256,'exact authorized Rico direction delta '+file);let text=bytes.toString();for(const edit of [...patch.edits].reverse()){assert.equal(text.split(edit.after).length-1,1,'unique Rico edit '+file);text=text.replace(edit.after,()=>edit.before);}assert.equal(sha(text),patch.beforeSha256,'other runtime bytes retained '+file);return Buffer.from(text);}
module.exports={source,manifest};
