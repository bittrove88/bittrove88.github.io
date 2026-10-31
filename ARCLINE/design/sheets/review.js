'use strict';
(()=>{
 const data=JSON.parse(document.getElementById('reviewData').textContent),sheets=data.sheets,byId=new Map(sheets.map(s=>[s.id,s]));
 const left=document.getElementById('compareLeft'),right=document.getElementById('compareRight');
 for(const select of [left,right])for(const sheet of sheets){const option=document.createElement('option');option.value=sheet.id;option.textContent=sheet.id+' · '+sheet.title;select.append(option);}
 function update(){
  for(const [select,side,label] of [[left,'left','A'],[right,'right','B']]){
   const sheet=byId.get(select.value),img=document.getElementById(side+'Image'),link=document.getElementById(side+'Link');
   document.getElementById(side+'Caption').textContent=label+' / '+sheet.id+' · '+sheet.title;
   img.src=sheet.filename;img.alt=sheet.id+' '+sheet.title;img.width=sheet.width;img.height=sheet.height;link.href=sheet.filename;link.setAttribute('aria-label',sheet.id+' 原本を開く');
   document.getElementById(side+'Note').textContent=sheet.observation;
  }
  document.getElementById('compareNotice').textContent=left.value===right.value?'同じ原本が選ばれています。':'AとBは別の原本です。画像を開くと高解像度で確認できます。';
 }
 left.value='S01';right.value='S02';left.onchange=right.onchange=update;
 document.getElementById('swapCompare').onclick=()=>{const value=left.value;left.value=right.value;right.value=value;update();};
 for(const button of document.querySelectorAll('.compare-preset'))button.onclick=()=>{left.value=button.dataset.left;right.value=button.dataset.right;update();const heading=document.getElementById('compareHeading');heading.focus({preventScroll:true});document.getElementById('compare').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});};
 document.getElementById('categoryFilter').onchange=event=>{const category=event.target.value;let count=0;for(const card of document.querySelectorAll('.sheet-card')){const show=category==='all'||card.dataset.category===category;card.hidden=!show;if(show)count++;}document.getElementById('inventoryCount').textContent=count+'点を表示';};
 update();
})();
