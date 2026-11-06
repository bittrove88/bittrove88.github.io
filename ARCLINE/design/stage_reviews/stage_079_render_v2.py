import json,math,html
from pathlib import Path
D=Path(__file__).resolve().parent;p=json.loads((D/'stage_079_proposal_v2.json').read_text());a=p['after']
def t(x,y,s,n=18,c='#dce8f5'):return f'<text x="{x}" y="{y}" font-size="{n}" fill="{c}">{html.escape(s)}</text>'
def pl(ps,ox,base,s,c,dash=''):
 return f'<polyline points="'+ ' '.join(f'{ox+x*s},{base-h*s}' for x,h in ps)+f'" fill="none" stroke="{c}" stroke-width="2.5" stroke-dasharray="{dash}"/>'
def bridge(v,ox,base,s,down=False,color='#e6ba6f',dash=''):
 f=next(q for q in v['features'] if q['type']=='B');x,h,length,op=f['v'];ang=math.radians(f.get('openAngleDeg',75) if down else 0)
 return pl([[x,h],[x+math.cos(ang)*length,h+math.sin(ang)*length]],ox,base,s,color,dash)
def view(v,ox,base,s,down=False,arrows=False):
 out=''
 for f in v.get('floors',[v['floor']]):
  ps=f+[[f[-1][0],-2],[f[0][0],-2]];pts=' '.join(f'{ox+x*s},{base-h*s}' for x,h in ps);out+=f'<polygon points="{pts}" fill="#384b5b"/>'+pl(f,ox,base,s,'#bdd1cb')
 for q in v['parts']:
  pts=' '.join(f'{ox+x*s},{base-h*s}' for x,h in q['poly']);out+=f'<polygon points="{pts}" fill="#5c7181" stroke="#b7c9d4" stroke-width="1.5"/>'
 out+=bridge(v,ox,base,s,down)
 for q in v['features']:
  if q['type']=='M':
   x,h,r,dr=q['v'];out+=f'<circle cx="{ox+x*s}" cy="{base-h*s}" r="{r*s}" fill="#b397e8" fill-opacity=".12" stroke="#c1a8eb" stroke-dasharray="6 5"/>'
  if q['type']=='T':
   x,h=q['v'];out+=f'<circle cx="{ox+x*s}" cy="{base-h*s}" r="{max(6,s*2)}" fill="#59492c" stroke="#e6ba6f"/>'+t(ox+x*s-5,base-h*s+5,'T',15,'#ffe5a2')
 if arrows:
  for q in v['attacks']:out+=pl(q['points'],ox,base,s,'#76e0c4' if q['kind']=='bridge-primary' else '#e6ba6f','8 7')
 for key,c in [('player','#76e0c4'),('enemy','#ff9caa')]:
  q=v[key];out+=f'<ellipse cx="{ox+q["x"]*s}" cy="{base-q["h"]*s-12}" rx="{max(9,s*2.2)}" ry="12" fill="{c}"/>'
 return out
def svg(w,h,b,title):return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{title}"><title>{title}</title><rect width="100%" height="100%" fill="#101b2b"/><g font-family="Noto Sans CJK JP, sans-serif">{b}</g></svg>\n'
b=t(40,46,'ARCLINE 079 v2｜折り下げ橋と固定保守台',30)+t(40,82,'水平橋から固定Aへ渡る ／ 橋下の固定LでTを撃ち、M側へ切り替える',19,'#adc0d7')
b+=view(a,80,830,7.7,False,True)+bridge(a,80,830,7.7,True,'#e6ba6f','3 4')
for q in a['anchors'][1:]:
 x=80+q['x']*7.7;y=830-q['h']*7.7;b+=f'<circle cx="{x}" cy="{y-6}" r="5" fill="#76e0c4"/>'
b+=t(460,473,'P0',18,'#76e0c4')+t(645,394,'A：橋から降りて固定射点へ',18,'#76e0c4')
b+=t(550,687,'L：谷底に接続する固定保守台',18,'#e6ba6f')+t(550,718,'T操作 → 境界で−1 → 右向きにMへ',17,'#e6ba6f')
b+=t(865,578,'M：初期＋1',20,'#d5c3ff')+t(865,608,'L側はT切替後の−1を使う構想',16,'#d5c3ff')
b+=t(90,329,'F03 短い整備アーム（左地盤に接続）',16)+t(90,356,'P0の高角帯を限定。Aへ出ると頭上が開く',16,'#76e0c4')
b+=t(1160,456,'enemy:volt',18,'#ff9caa')
q=a['pickups'][0];x=80+q['x']*7.7;y=830-q['h']*7.7;b+=f'<path d="M{x},{y-7}l7,7l-7,7l-7,-7z" fill="#ffe59a"/>'+t(290,389,'SK079（任意）',16,'#ffe59a')
b+=t(790,255,'A側はMを外す通常の弧',18,'#76e0c4')
# Detail view of the actual 80px bridge, with the same fixed rock in each pose.
b+='<rect x="40" y="118" width="690" height="185" rx="9" fill="#17283c" stroke="#354b62"/>'
b+=t(58,145,'Bの姿勢比較（局所拡大）',18)
for j,down in enumerate([False,True]):
 ox=70+j*335;s=11.5;yy=256
 b+=pl([[0,0],[3,0]],ox,yy,s,'#bdd1cb')
 b+=bridge({'features':[{'type':'B','v':[3,0,8,0],'openAngleDeg':-30}]},ox,yy,s,down)
 b+=pl([[11,0],[23,0]],ox,yy,s,'#b7c9d4')
 b+=t(ox,183,'水平：右の固定岩へ接続' if not down else '−30°：接続を外す',16,'#e6ba6f')
b+=t(40,900,'主攻略：P0→Aへ120px渡り、整備アームの外へ。固定Aから高角帯を使う設計。',21)
b+=t(40,938,'別の選択：固定Lへ転移しTを一射、既存境界で極性反転後にMを使う。Bの上は歩かない。',18,'#e6ba6f')
b+=t(40,976,'Bは既存の手番周期で折り下がる。TがBを操作する前提や、無償の待機手番は置かない。',18,'#adc0d7')
b+=t(40,1014,'A・Lとも橋の両姿勢で支持を保持。支持が残ることは、反撃に安全という意味ではない。',18,'#adc0d7')
b+=t(40,1055,'破線は構想。実歩行・橋の姿勢変更時の接地・転移着地・T/M命中・16行動勝利は未検証。',17,'#ffb8ad')
b+=t(40,1095,'設計承認待ち・ゲーム未適用。詳細動作検証は全49面の設計承認後。',17,'#adc0d7')
(D/'stage_079_full_v2.svg').write_text(svg(1460,1140,b,'79面v2 折り下げ橋と固定保守台'))
b=t(40,45,'79面：旧案と新案の同縮尺比較',28)
b+=t(40,92,'旧v1：長い橋と上下の同形島',21)+view(p['before'],60,490,3.8)
b+=t(780,92,'新v2：短い接続橋と固定射点・固定保守台',21)+view(a,790,490,3.8)
b+=t(40,553,'640pxの橋を渡る準備と、上段／低棚の比較が中心',17,'#adc0d7')+t(780,553,'120pxの固定Aへの通過帯と、別のT/M経路',17,'#adc0d7')
b+=t(40,610,'B水平／折り下げ、M初期／反転を静的確認。旧案の歩行・命中記録は新案へ流用しない。',18,'#e6ba6f')
(D/'stage_079_compare_v2.svg').write_text(svg(1460,650,b,'79面旧v1と新v2の比較'))
