import json,copy,sys
from pathlib import Path
D=Path(__file__).resolve().parent
sys.path.insert(0,str(D))
from stage_075_render_roughs_r2 import svg,t,map_view,line,COLORS
p=json.loads((D/"stage_076_proposal_v3.json").read_text())
after=p["after"]
old=json.loads((D/"stage_076_proposal_v2.json").read_text())
def draw(a,ox,base,s,arrows=False):
 v=copy.deepcopy(a)
 if v.get("stageNumber")==76:v["id"]="076-reference"
 out=map_view(v,ox,base,s,arrows=arrows)
 for f in a.get('features',[]):
  if f['type']=='T':
   x,h=f['v'];cx=ox+x*s;cy=base-h*s;out+=f'<circle cx="{cx}" cy="{cy}" r="{max(6,2*s)}" fill="#59492c" stroke="#f3ce83"/>'+t(cx-5,cy+5,'T',15,'#ffe0a3')
 return out
body=[t(38,44,'ARCLINE 076 v3  /  両岸から撃ち込む磁気降下槽',29,weight=700),t(40,78,'完成設計案・承認待ち。Mの速度回転と入射方向を組み合わせ、中央の敵へ弾を落とす。',17,COLORS['muted'])]
body.append(draw(after,100,725,7.6,True))
body += [t(245,457,'L / P0',20,COLORS['player'],700),t(1170,457,'R',20,COLORS['player'],700),t(440,230,'左岸：T切替後 +1 ／ 右向きに入射',18,COLORS['alternate']),t(855,230,'右岸：初期 −1 ／ 左向きに入射',18,COLORS['main']),t(670,390,'M：円内を固定物で塞がない',18,'#dab9ef'),t(725,666,'低い敵',18,COLORS['enemy']),t(155,790,'初期配置で両岸は同高度42、敵までの水平距離55。違いは距離ではなく、入射方向と必要な操作。',18),t(155,824,'Tへの操作射撃は左岸から。Tは次の手番境界でMの極性だけを反転する。',17,COLORS['muted']),t(40,900,'緑・青の破線＝射撃の構想　白の点線＝右岸への再配置構想。実弾道・転移着地・16行動勝利は未検証。',16,COLORS['muted'])]
body.append(line([[35,45],[45,55]],7.6,100,725,stroke='#f3ce83',stroke_width=2,stroke_dasharray='3 5'))
content=svg(1600,935,''.join(body),'76面v3 両岸から撃ち込む磁気降下槽').replace('75面の方向性レビュー用ラフ。全景と攻略意図を示す。','76面の完成設計候補。左右の入射方向と磁場の極性の組合せを示す。')
(D/'stage_076_full_v3.svg').write_text(content+'\n')
views=[('旧A｜作用空間を塞ぐ曲面構造',json.loads((D/'stage_076_roughs_r1.json').read_text())['candidates'][0]),('旧B｜前後移動と距離が中心',json.loads((D/'stage_076_roughs_r1.json').read_text())['candidates'][1]),('新v3｜磁場と下降空間を先に確保',after),('PR #74 最新v2｜参照元',old['after'])]
body=[t(35,43,'76面 個別レビュー：旧A/Bと新v3の同縮尺比較',28,weight=700)]
for i,(title,a) in enumerate(views):
 x=30+(i%2)*790;y=90+(i//2)*370;body += [t(x,y+25,title,21,weight=700),draw(a,x+90,y+302,2.9)]
(D/'stage_076_compare_v3.svg').write_text(svg(1640,850,''.join(body),'76面旧A Bと新設計の比較').replace('75面の方向性レビュー用ラフ。全景と攻略意図を示す。','76面の不採用案と完成設計候補の比較。')+'\n')
print('One completed candidate and two SVGs written')
