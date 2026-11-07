import json, html
from pathlib import Path
D=Path(__file__).resolve().parent
p=json.loads((D/'stage_078_proposal_v2.json').read_text());a=p['after']
def text(x,y,s,size=18,c='#dce8f5'):
 return f'<text x="{x}" y="{y}" font-size="{size}" fill="{c}">{html.escape(s)}</text>'
def line(ps,ox,base,s,color,dash=''):
 pts=' '.join(f'{ox+x*s},{base-h*s}' for x,h in ps)
 return f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="2.5" stroke-dasharray="{dash}"/>'
def view(v,ox,base,s,arrows=False):
 out=''
 for f in v.get('floors',[v['floor']]):
  pts=' '.join(f'{ox+x*s},{base-h*s}' for x,h in f+[[f[-1][0],-2],[f[0][0],-2]])
  out+=f'<polygon points="{pts}" fill="#384b5b"/>'+line(f,ox,base,s,'#bdd1cb')
 for q in v['parts']:
  pts=' '.join(f'{ox+x*s},{base-h*s}' for x,h in q['poly'])
  out+=f'<polygon points="{pts}" fill="{chr(35)+"bf9154" if q["breakable"] else chr(35)+"5c7181"}" stroke="#d5c9ad" stroke-width="1.5"/>'
 for q in v['features']:
  if q['type']=='M':
   x,h,r,dr=q['v'];out+=f'<circle cx="{ox+x*s}" cy="{base-h*s}" r="{r*s}" fill="#b397e8" fill-opacity=".12" stroke="#c1a8eb" stroke-dasharray="6 5"/>'
 for key,color in [('player','#76e0c4'),('enemy','#ff9caa')]:
  q=v[key];out+=f'<ellipse cx="{ox+q["x"]*s}" cy="{base-q["h"]*s-12}" rx="{max(9,s*2.2)}" ry="12" fill="{color}"/>'
 if arrows:
  for q in v['attacks']:out+=line(q['points'],ox,base,s,'#76e0c4' if q['kind'].startswith('main') else '#e5be7d','8 7')
 return out
def svg(w,h,body,title):
 return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{title}"><title>{title}</title><rect width="100%" height="100%" fill="#101b2b"/><g font-family="Noto Sans CJK JP, sans-serif">{body}</g></svg>\n'
body=text(40,48,'ARCLINE 078 v2｜えぐれた内壁と監視の岩嘴',30)+text(40,82,'坑の内から磁場で回す ／ 場の外へ移って遮板を開く',20,'#adc0d7')
body+=view(a,90,860,7.8,True)
for q in a['pickups']:
 x=90+q['x']*7.8;y=860-q['h']*7.8
 body+=f'<path d="M{x},{y-7}l7,7l-7,7l-7,-7z" fill="#ffe59a"/>'
body+=text(305,549,'SK078：既存補助（任意）',16,'#ffe59a')
body+='<circle cx="963.6" cy="442.4" r="10" fill="none" stroke="#e5be7d" stroke-width="2"/>'
body+=text(560,185,'主攻略：初期−1のMで上へ回し、D02の上を狙う',18,'#76e0c4')
body+=text(635,455,'M −1',25,'#d5c3ff')+text(640,487,'円内に実体を置かない',16,'#d5c3ff')
body+=text(400,663,'P0：左内壁のえぐれ',18,'#76e0c4')+text(400,695,'同じ支持面を70px歩いて調整',16,'#76e0c4')
body+=text(925,505,'B：右岩盤につながる監視棚',18)+text(925,535,'Mの外でD02へ一射',17,'#e5be7d')
body+=text(1067,144,'D02：独立遮板1片',18,'#e5be7d')+text(1067,173,'上方は常設の開放帯',17,'#e5be7d')
body+=text(1210,407,'保全室の敵',17,'#ff9caa')
body+=line([[57,32],[64,32]],90,866,7.8,'#76e0c4')
body+=text(40,924,'主攻略：遮板を残してMの曲射。開始地点から利用を探れる配置にする。',21)
body+=text(40,960,'任意の方針変更：Bへ転移し、D02を開いて浅い射線へ。転移回数・破壊回数は未検証。',18,'#e5be7d')
body+=text(40,997,'高所＝攻撃／低所＝安全ではなく、Mを使うか、移動と破壊に準備を使うかを選ぶ。',18,'#adc0d7')
body+=text(40,1034,'左右の支持面は岩盤に接続。D02は支持材ではなく、除去しても床・棚は残る。',18,'#adc0d7')
body+=text(40,1071,'破線は想定空間。転移・M命中・敵の反撃・16行動勝利の実績ではない。射撃後はその場で反撃を受ける。',16,'#ffb8ad')
body+=text(40,1110,'設計承認待ち・ゲーム未適用。詳細動作検証は全49面の設計承認後。',17,'#adc0d7')
(D/'stage_078_full_v2.svg').write_text(svg(1460,1150,body,'78面v2 えぐれた内壁と監視の岩嘴'))
body=text(40,45,'78面：旧案と新案の同縮尺比較',28)
body+=text(40,95,'旧v1：上下に似た浮島＋両経路で窓破壊',21)+view(p['before'],60,500,3.9)
body+=text(770,95,'新v2：内壁のえぐれ＋岩盤から張り出す監視棚',21)+view(a,785,500,3.9)
body+=text(40,570,'低棚へ転移 → 窓破壊 → M射撃、または高棚へ転移',17,'#adc0d7')
body+=text(770,570,'P0からM越し撃ち ／ 任意に場外へ移り遮板を開く',17,'#adc0d7')
body+=text(40,623,'新案の支持・通過帯・D02除去前後を静的確認。旧案の命中・転移記録を新案の成功へ流用しない。',18,'#e5be7d')
(D/'stage_078_compare_v2.svg').write_text(svg(1460,660,body,'78面旧v1と新v2の比較'))
