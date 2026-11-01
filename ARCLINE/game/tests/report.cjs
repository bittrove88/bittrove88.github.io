'use strict';
// Keep one complete native match per line so large generated evidence stays reviewable.
const fs=require('node:fs');
module.exports=(file,report)=>{
 const fields=Object.entries(report).map(([key,value])=>'  '+JSON.stringify(key)+': '+(key==='rows'&&Array.isArray(value)?'[\n'+value.map(row=>'    '+JSON.stringify(row)).join(',\n')+'\n  ]':JSON.stringify(value,null,2).replace(/\n/g,'\n  ')));
 fs.writeFileSync(file,'{\n'+fields.join(',\n')+'\n}\n');
};
