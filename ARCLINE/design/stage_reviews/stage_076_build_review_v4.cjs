const fs=require('fs'),path=require('path'),assert=require('assert');
const G=require(process.argv[2]||path.resolve(__dirname,'../../game/dist/geometry.js'));
const dir=__dirname,p=JSON.parse(fs.readFileSync(path.join(dir,'stage_076_proposal_v4.json'))),old=JSON.parse(fs.readFileSync(path.join(dir,fs.existsSync(path.join(dir,'source'))?'source/stage_076_proposal_v3.json':'stage_076_proposal_v3.json'))),a=p.after;
assert.deepStrictEqual(p.blueprintCandidate,old.blueprintCandidate);
for(const k of ['floor','floors','parts','features','player','enemy','width'])assert.deepStrictEqual(a[k],old.after[k]);
assert.deepStrictEqual(p.difficulty,old.difficulty);
const spec={id:76,floors:a.floors,components:[],features:a.features,worldWidth:a.width},w=G.world(spec);
const report={stage:76,version:4,scope:'static geometry only; no actual input, projectile or combat simulation',sourceCommit:p.source.commit,geometryAndBlueprintUnchanged:true,conditionsUnchanged:true};
const checkPoint=q=>{const pos=G.point(q.x,q.h),support=G.support(w,pos.x,pos.y);return {id:q.id,supported:!!support,heightErrorPx:support?Math.abs(support.y-pos.y):null,bodyClear:!!support&&G.clearBody(w,support),slopeDeg:support?support.slope*180/Math.PI:null};};
report.supports=[{id:'P0',...a.player},{id:'enemy',...a.enemy},...a.anchors].map(checkPoint);
assert(report.supports.every(q=>q.supported&&q.bodyClear&&q.heightErrorPx<1e-6));
report.selfIntersections=[];
for(const o of w.solids)for(let i=0;i<o.poly.length;i++)for(let j=i+2;j<o.poly.length;j++){if(i===0&&j===o.poly.length-1)continue;if(G.segment(o.poly[i],o.poly[(i+1)%o.poly.length],o.poly[j],o.poly[(j+1)%o.poly.length]))report.selfIntersections.push([o.id,i,j]);}
assert.equal(report.selfIntersections.length,0);
const m=w.regions[0];const distance=(q,c,d)=>{const dx=d.x-c.x,dy=d.y-c.y,t=Math.max(0,Math.min(1,((q.x-c.x)*dx+(q.y-c.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(q.x-c.x-t*dx,q.y-c.y-t*dy);};
report.magnet={minimumGroundClearancePx:Math.min(...w.solids.flatMap(o=>o.poly.map((c,i)=>distance(m,c,o.poly[(i+1)%o.poly.length]))))-m.radius,lowerCircleToFloorGapPx:(500-12*10)-(m.y+m.radius),count:w.regions.filter(r=>r.kind==='M').length,initial:m.direction};
assert(report.magnet.minimumGroundClearancePx>0);
report.schematicPaths=a.attacks.map(q=>({kind:q.kind,clear:q.points.slice(1).every((b,i)=>G.lineClear(w,G.point(...q.points[i]),G.point(...b)))}));
assert(report.schematicPaths.every(q=>q.clear));
report.terminalLineClear=G.lineClear(w,G.point(35,45),G.point(45,55));assert(report.terminalLineClear);
report.barrelClearance=[];
for(const [id,x,facing]of [['L',35,1],['R',145,-1],['L-back',29,1],['R-back',153,-1]]){
 const support=G.support(w,x*10,80),s={units:[{...support,facing},{}]},blocked=[];
 for(let angle=0;angle<=80;angle++){const mu=G.muzzle(s,0,angle);if(!G.lineClear(w,mu.pivot,mu))blocked.push(angle);}
 report.barrelClearance.push({id,model:'current default player pivot and 35px barrel',sampledAnglesDeg:[0,80],stepDeg:1,blockedAnglesDeg:blocked});assert.equal(blocked.length,0);
}
report.supportBands=[{id:'L',xRangePx:[260,520],height:42},{id:'R',xRangePx:[1280,1560],height:42}];
report.setbacks=p.preparation.localSetbacks.map(q=>({...q,within140PxBudget:q.horizontalPx<=140,clearRepresentativeBodyAlongBand:true}));
for(const [x1,x2]of [[290,350],[1450,1530]])for(let x=x1;x<=x2;x+=2){const pos=G.support(w,x,80);assert(pos&&G.clearBody(w,pos)&&Math.abs(pos.slope)<1e-6);}
report.geometryBlob='7b797e8e03a9193682211837c35b706e67748f83';report.rendering='separate Chromium step; see stage_076_review_v4.md';report.notTested=['actual walking and facing input','transfer equipment availability and teleport flight/landing/action count','T projectile hit and boundary switching','M trajectory and target hit','enemy AI/movement/counterattack','16-action victory','device rendering'];
fs.writeFileSync(path.join(dir,'stage_076_static_check_v4.json'),JSON.stringify(report,null,2)+'\n');
const X=x=>100+x*7,Y=h=>680-h*7,P=pts=>pts.map(([x,h])=>`${X(x)},${Y(h)}`).join(' ');
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1460" height="1160" viewBox="0 0 1460 1160" role="img" aria-labelledby="title desc"><title id="title">76面 精査版：両岸から撃ち込む磁気降下槽</title><desc id="desc">v3の地形を保持。左岸のT操作を主経路、右岸は転移を要する任意候補。全ての破線は構想で実弾道ではない。射撃後はその場で反撃を受ける。</desc><defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#e6d5ff"/></marker></defs><rect width="1460" height="1160" fill="#0c1424"/><g font-family="Noto Sans CJK JP, sans-serif">`;
const text=(x,y,s,size=18,c='#dce7f7')=>svg+=`<text x="${x}" y="${y}" font-size="${size}" fill="${c}">${esc(s)}</text>`;
text(40,48,'ARCLINE 076｜両岸から撃ち込む磁気降下槽',30);text(40,84,'v3の地形・M/T・出現位置を保持した精査版 / 設計承認待ち・動作未検証',17,'#aabbd1');
text(100,138,'主経路 L：Tを一射 → 手番境界で＋1 → 右向きに入射',19,'#a9c6ff');
text(100,173,'任意候補 R：初期−1を保持 → 右岸へ転移 → 左へ歩き向き直る',19,'#83e9c7');
text(100,204,'転移の必要回数・着地・装備残数は未確認。二経路を同手数・同安全性とは扱わない。',16,'#aabbd1');
svg+=`<polygon points="${P([...a.floor,[180,-8],[0,-8]])}" fill="#343e5b"/><polyline points="${P(a.floor)}" fill="none" stroke="#b9bcdb" stroke-width="2"/>`;
svg+=`<circle cx="${X(90)}" cy="${Y(48)}" r="140" fill="#b69bea" fill-opacity=".1" stroke="#c6a1ef" stroke-width="2" stroke-dasharray="6 5"/>`;
for(const q of a.attacks)svg+=`<polyline points="${P(q.points)}" fill="none" stroke="${q.kind==='main'?'#a9c6ff':'#83e9c7'}" stroke-width="2.5" stroke-dasharray="8 7" opacity=".85"/>`;
svg+=`<path d="M${X(83)},${Y(51)} q25,-15 40,20" fill="none" stroke="#e6d5ff" stroke-width="2" marker-end="url(#arrow)"/>`;
text(X(89),Y(48)+5,'M',22,'#dcc3ff');text(X(82),Y(40),'＋1 ↻ / −1 ↺',16,'#dcc3ff');text(X(82),Y(62),'入射方向 × 極性',18,'#dcc3ff');
for(const [lo,hi]of [[26,52],[128,156]])svg+=`<line x1="${X(lo)}" y1="${Y(42)+3}" x2="${X(hi)}" y2="${Y(42)+3}" stroke="#83e9c7" stroke-width="4"/>`;
svg+=`<rect x="${X(35)-17}" y="${Y(42)-30}" width="34" height="26" rx="4" fill="#28564f" stroke="#83e9c7" stroke-width="2"/><ellipse cx="${X(90)}" cy="${Y(12)-20}" rx="25" ry="19" fill="#623c50" stroke="#ff8e94" stroke-width="2"/>`;
svg+=`<circle cx="${X(45)}" cy="${Y(55)}" r="14" fill="#59492c" stroke="#f3ce83" stroke-width="2"/><polyline points="${P([[35,45],[45,55]])}" stroke="#f3ce83" stroke-dasharray="3 5" fill="none"/>`;
text(X(45)-6,Y(55)+6,'T',16,'#ffe0a3');text(X(35)-35,Y(42)+34,'L / P0',19,'#83e9c7');text(X(145)-10,Y(42)+34,'R',19,'#83e9c7');
for(const [id,x]of [['L-back',29],['R-back',153]]){svg+=`<circle cx="${X(x)}" cy="${Y(42)-5}" r="5" fill="#f3ce83"/>`;text(X(x)-25,Y(42)+61,id,15,'#f3ce83');}
svg+=`<circle cx="${X(145)}" cy="${Y(42)-22}" r="14" fill="none" stroke="#83e9c7" stroke-dasharray="3 4"/><path d="M${X(148)},${Y(42)-22} H${X(140)}" stroke="#83e9c7" stroke-width="2"/>`;
text(X(81),Y(12)+28,'低い敵 / HP欄5',18,'#ff9fa5');text(X(74),Y(28)-10,'退出 → 下降の空間',17,'#dcc3ff');
text(100,775,'緑の線＝固定の支持面。左260px / 右280px。後方候補までL:60px、R:80px。',18);
text(100,807,'後方支持面は射撃前に選ぶ位置。射撃後は同じ手番に戻れず、その位置で反撃を受ける。',17,'#ffb1ad');
for(const [x,title,lines]of [[40,'保持した核',['左右とも高さ420px・敵まで水平550px。','Tで変える／入射側を変える、の判断。','岸肩は代表的な直線の撃ち下ろしを遮る。']],[510,'空中障害を追加しない理由',['Mの円全体・左右の入口・下降帯を残す。','庇や浮岩を足しても新しい判断にならず、','旧Aの作用空間閉塞を再発させるため。']],[980,'準備と反撃の扱い',['Tへの一射でも敵の手番が入る。','右岸は転移・向き直りが必要な任意候補。','退避位置の支持確認 ≠ 安全性の確認。']]]){svg+=`<rect x="${x}" y="846" width="440" height="169" rx="10" fill="#152239" stroke="#34465f"/>`;text(x+18,879,title,21);lines.forEach((s,i)=>text(x+18,916+i*28,s,16,'#b8c9de'));}
text(40,1060,'破線＝想定射撃空間。命中軌道・単発転移・安全な着地・勝利の実績を示さない。',17,'#f3ce83');
text(40,1095,'静的確認：データ一致、支持、自己交差、Mの空間、代表砲身。詳細動作は全49面の設計承認後。',16,'#aabbd1');
svg+='</g></svg>';fs.writeFileSync(path.join(dir,'stage_076_full_v4.svg'),svg+'\n');console.log(JSON.stringify(report,null,2));
