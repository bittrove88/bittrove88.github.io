'use strict';
const assert=require('node:assert/strict');
// The approved UI changes two entry-point bindings and adds two known lesson IDs.
// Shared skill art changes only the three drawing helpers. Remove only these
// additions before older byte-for-byte preservation checks.
module.exports=function beforeUi(file,bytes){let text=bytes.toString();if(file==='game.js'){
 const bridge=/\/\/ The UI owns presentation and inspection gestures; combat and persistence stay native\.\nArcBattleUi\.install\(\{[\s\S]*?\n\}\);\n/g;
 assert.equal([...text.matchAll(bridge)].length,1,'one explicit presentation bridge');text=text.replace(bridge,'');
 assert.equal(text.split('changed:()=>hud(),previewing:').length-1,1,'one live HUD callback');text=text.replace('changed:()=>hud(),previewing:','changed:hud,previewing:');
 }else if(file==='save.js'){assert.ok(text.includes("const previewIds=['v7:touch-controls','v7:character-change','v6:special-charge',"));text=text.replace("const previewIds=['v7:touch-controls','v7:character-change',","const previewIds=[");}
 if(file==='skills.js'){
 const baseline=require('node:child_process').execFileSync('git',['show','939c4a6ee2004ea806462df4ee9d04f7ff12c2b8:ARCLINE/game/dist/skills.js'],{encoding:'utf8',cwd:require('node:path').resolve(__dirname,'../..')});
 text=text.replace("const Art=typeof module!=='undefined'?require('./battle-catalog.js'):root.ArcBattleCatalog;\n",'');
 for(const name of ['iconPath','markup','draw']){const pattern=new RegExp('^function '+name+'\\([^\\n]*\\n','m'),old=baseline.match(pattern);assert.ok(old,'baseline visual helper '+name);assert.ok(pattern.test(text),'current visual helper '+name);text=text.replace(pattern,()=>old[0]);}
 }
 return Buffer.from(text);
};
