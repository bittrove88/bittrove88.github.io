import json,math,html
from pathlib import Path
D=Path(__file__).resolve().parent;p=json.loads((D/'stage_081_proposal_v2.json').read_text());a=p['after']
def t(x,y,s,n=18,c='#dce8f5'):return f'<text x="{x}" y="{y}" font-size="{n}" fill="{c}">{html.escape(s)}</text>'
def pl(ps,ox,base,s,c,dash=''):
 return f'<polyline points="'+' '.join(f'{ox+x*s},{base-h*s}' for x,h in ps)+f'" fill="none" stroke="{c}" stroke-width="2.5" stroke-dasharray="{dash}"/>'
def view(v,ox,base,s,arrows=False):
 out=''
 for f in v.get('floors',[v['floor']]):
  ps=f+[[f[-1][0],-2],[f[0][0],-2]];pts=' '.join(f'{ox+x*s},{base-h*s}' for x,h in ps);out+=f'<polygon points="{pts}" fill="#314551"/>'+pl(f,ox,base,s,'#b9cfc5')
 for q in v['parts']:
  pts=' '.join(f'{ox+x*s},{base-h*s}' for x,h in q['poly']);color='#b28a56' if q['breakable'] else '#4b7168' if q.get('kind')=='root-ring' else '#4d6865';out+=f'<polygon points="{pts}" fill="{color}" stroke="#b5ccaa" stroke-width="1.5"/>'
 for q in v['features']:
  if q['type']=='F':
   x1,x2,h1,h2=q['v'];out+=f'<rect x="{ox+x1*s}" y="{base-h2*s}" width="{(x2-x1)*s}" height="{(h2-h1)*s}" fill="#7cc9db" fill-opacity=".14" stroke="#8cd9e5" stroke-dasharray="5 5"/>'
  if q['type']=='K':
   x,h,ang=q['v'];aa=math.radians(ang);dx=math.cos(aa)*5.5;dy=math.sin(aa)*5.5;out+=pl([[x-dx,h+dy],[x+dx,h-dy]],ox,base,s,'#d4b6ff')
 if arrows:
  for q in v['attacks']:out+=pl(q['points'],ox,base,s,'#d4b6ff' if q['kind']=='outer-K' else '#8cd9e5','8 7')
  for q in v['transferSpaces']:out+=pl(q['points'],ox,base,s,'#b3c7d7','2 7')
 for key,c in [('player','#76e0c4'),('enemy','#ff9caa')]:
  q=v[key];out+=f'<ellipse cx="{ox+q["x"]*s}" cy="{base-q["h"]*s-12}" rx="{max(9,s*2.2)}" ry="12" fill="{c}"/>'
 return out
def svg(w,h,b,title):return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{title}"><title>{title}</title><rect width="100%" height="100%" fill="#101b2b"/><g font-family="Noto Sans CJK JP, sans-serif">{b}</g></svg>\n'
b=t(40,46,'ARCLINE 081 v2｜割れた根輪の内と外',30)+t(40,82,'同形島3段を廃止。外からK／内側でFを使う。開始点と内側の頭上は開放。',19,'#adc0d7')
b+=view(a,100,890,7,True)
b+=t(640,137,'外の主攻略：Kで一回反射し、根の上を回す構想',18,'#d4b6ff')
b+=t(280,412,'K −55°',21,'#d4b6ff')+t(280,443,'入射方向で右上へ反射を狙う',17,'#d4b6ff')
b+=t(100,711,'P0：外庭園／頭上は開放',18,'#76e0c4')
b+=t(700,697,'A：輪の内側の固定足場',18,'#8cd9e5')+t(700,726,'着地候補の頭上に屋根を置かない',16,'#adc0d7')
b+=t(705,423,'F ↔',24,'#8cd9e5')+t(720,451,'手番周期の左右風',17,'#8cd9e5')
b+=t(910,262,'上が割れた根輪',18)+t(1000,404,'enemy:hang',18,'#ff9caa')
b+=t(150,580,'D03：側面だけの枯れ枝',17,'#e6ba6f')+t(150,609,'残してKへ。破壊は必須にしない',16,'#e6ba6f')
b+='<circle cx="765" cy="645" r="5" fill="#8cd9e5"/>'
b+=t(40,959,'主攻略：外のP0からKへ入れ、Fの上側を回す。一発にKとFを両方使わせない。',21)
b+=t(40,997,'別の選択：輪の内側のAへ転移し、今の風向きを読んでFの窓を通す。',19,'#8cd9e5')
b+=t(40,1035,'直射は固定根で遮る。D03を除いても、P0/Aから初期敵位置への代表直射は開かない。',18,'#adc0d7')
b+=t(40,1073,'屋根で移動を強制しない。射撃後はその位置で反撃を受け、同手番の退避はできない。',18,'#ffb8ad')
b+=t(40,1113,'破線は構想空間。K反射・F弾道・転移着地・敵AI・20行動勝利は未検証。設計承認待ち。',17,'#adc0d7')
(D/'stage_081_full_v2.svg').write_text(svg(1460,1155,b,'81面v2 割れた根輪の内と外'))
b=t(40,45,'81面：旧案と新案の同縮尺比較',28)
b+=t(40,92,'旧v1：似た浮島を3高度に配置',21)+view(p['before'],55,495,3.8)
b+=t(780,92,'新v2：外庭園と、内側足場を持つ一体の根輪',21)+view(a,785,495,3.8)
b+=t(40,550,'高さと距離による射点比較が中心',17,'#adc0d7')+t(780,550,'根の外のK入射／根の内側のF入射を選ぶ',17,'#adc0d7')
b+=t(40,610,'開始点と内側の上方を開放。D03温存／除去、風向き左右の4状態で静的確認。',18,'#adc0d7')
(D/'stage_081_compare_v2.svg').write_text(svg(1460,650,b,'81面旧v1と新v2の比較'))
