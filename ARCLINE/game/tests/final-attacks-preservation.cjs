'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),manifest=require('../../design/attacks/final-attacks-0301-scope.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function source(file,bytes){bytes=require("./rico-direction-preservation.cjs").source(file,bytes);const patch=manifest.sourcePatches[file];if(!patch)return bytes;assert.equal(sha(bytes),patch.afterSha256,'exact authorized0.30.1 delta '+file);let text=bytes.toString();for(const e of [...patch.edits].reverse()){assert.equal(text.split(e.after).length-1,1,'unique final attack source delta '+file);text=text.replace(e.after,()=>e.before);}assert.equal(sha(text),patch.beforeSha256,'other runtime bytes preserved '+file);return Buffer.from(text);}
module.exports={source,manifest};
