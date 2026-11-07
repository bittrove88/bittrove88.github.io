import json,math,html
from pathlib import Path
D=Path(__file__).resolve().parent;p=json.loads((D/'stage_087_proposal_v2.json').read_text());a=p['after']
def t(x,y,s,n=18,c='#dce8f5'):return f'<text x="{x}" y="{y}" font-size="{n}" fill="{c}">{html.escape(s)}</text>'
def pl(ps,ox,base,s,c,dash=''):
 return f'<polyline points="'+' '.join(f'{ox+x*s},{base-h*s}' for x,h in ps)+f'" fill="none" stroke="{c}" stroke-width="2.5" stroke-dasharray="{dash}"/>'
def bridge(v,ox,base,s,up,ghost=False):
 f=next(q for q in v['features']if q['type']=='B');x,h,length,op=f['v'];ang=math.radians(f.get('openAngleDeg',75)if up else 0);xe=x+math.cos(ang)*length;he=h+math.sin(ang)*length
 pts=' '.join(f'{ox+xx*s},{base-hh*s}'for xx,hh in [[x,h],[xe,he],[xe,he-1.2],[x,h-1.2]])
 return f'<polygon points="{pts}" fill="{"none" if ghost else "#c4a66a"}" stroke="#e6ba6f" stroke-width="1.5" stroke-dasharray="{("4 5"if ghost else "")}"/>'
def view(v,ox,base,s,arrows=False,up=False):
 out=''
 for f in v.get('floors',[v['floor']]):
  pts=' '.join(f'{ox+x*s},{base-h*s}'for x,h in f+[[f[-1][0],-2],[f[0][0],-2]]);out+=f'<polygon points="{pts}" fill="#314551"/>'+pl(f,ox,base,s,'#b9cfc5')
 for q in v['parts']:
  pts=' '.join(f'{ox+x*s},{base-h*s}'for x,h in q['poly']);c='#b28a56'if q['breakable']else'#536878';out+=f'<polygon points="{pts}" fill="{c}" stroke="#b6c6ce" stroke-width="1.5"/>'
 out+=bridge(v,ox,base,s,up)
 for q in v['features']:
  if q['type']=='C':
   x1,x2,h1,h2=q['v'];out+=f'<rect x="{ox+x1*s}" y="{base-h2*s}" width="{(x2-x1)*s}" height="{(h2-h1)*s}" fill="#a5b7c9" fill-opacity=".13" stroke="#a5b7c9" stroke-dasharray="5 5"/>'
 if arrows:
  for q in v['attacks']:out+=pl(q['points'],ox,base,s,'#76e0c4'if q['kind']=='P0-through-C'else'#9dc9f6','8 7')
  for q in v['transferSpaces']:out+=pl(q['points'],ox,base,s,'#aabccf','2 7')
 for key,c in [('player','#76e0c4'),('enemy','#ff9caa')]:
  q=v[key];out+=f'<ellipse cx="{ox+q["x"]*s}" cy="{base-q["h"]*s-12}" rx="{max(9,s*2.2)}" ry="12" fill="{c}"/>'
 return out
def svg(w,h,b,title):return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{title}"><title>{title}</title><rect width="100%" height="100%" fill="#101b2b"/><g font-family="Noto Sans CJK JP, sans-serif">{b}</g></svg>\n'
b=t(40,46,'ARCLINE 087 v2｜荷役板の陰と雲外の貨物棚',30)+t(40,82,'橋の上を歩く面から、固定射点前の遮蔽状態とC内外を選ぶ面へ',20,'#adc0d7')
b+=view(a,80,900,8,True,True)+bridge(a,80,900,8,False,True)
b+=pl([[100,40],[62,28]],80,900,8,'#e6ba6f','4 7')
b+=t(520,167,'P0側：Bの上を越してCへ入れる構想',18,'#76e0c4')+t(1040,191,'A側：Cを避ける山越しの構想',18,'#9dc9f6')
b+=t(350,760,'P0：橋手前の固定甲板',18,'#76e0c4')
b+=t(815,545,'C：速度減衰',23,'#b7c8db')+t(815,575,'視界・弾を遮る壁ではない',17,'#b7c8db')
b+=t(575,445,'B 起立時（実線）',18,'#e6ba6f')+t(575,474,'水平時は点線／初期は水平',16,'#e6ba6f')
b+=t(1008,697,'A：Cの外の固定貨物棚',18,'#9dc9f6')
b+=t(1240,352,'D04：独立遮板',18,'#e6ba6f')+t(1240,381,'破壊で低めの弧を開く',16,'#e6ba6f')
b+=t(1270,629,'直射は固定船体が遮る',18)+t(1350,546,'enemy:volt',17,'#ff9caa')
b+='<circle cx="1104" cy="591" r="5" fill="#9dc9f6"/>'
q=a['pickups'][0];x=80+q['x']*8;y=900-q['h']*8;b+=f'<path d="M{x},{y-7}l7,7l-7,7l-7,-7z" fill="#ffe59a"/>'+t(350,600,'W11（既存試用・任意）',16,'#ffe59a')
b+=t(40,864,'橙の低い入射線の例：起立Bで遮断／水平では開く。実際の全反撃を防ぐ保証ではない。',18,'#e6ba6f')
b+=t(40,938,'主構想：固定P0からCを通す。橋上を必須射点にせず、姿勢変更時の接地に依存しない。',21)
b+=t(40,978,'別の選択：C外のAへ転移し、速度減衰を避ける。準備手数・着地・反撃を受け入れる。',19,'#9dc9f6')
b+=t(40,1017,'Cは物理的な遮蔽ではない。初期敵への代表直射は、BやD04がなくても固定船体が遮る。',18,'#adc0d7')
b+=t(40,1056,'P0/Aの頭上は開放。射撃後は同じ位置で反撃を受け、無償の橋待ち・同手番の退避はない。',18,'#ffb8ad')
b+=t(40,1098,'破線は構想。実射への防御・C命中・転移着地・敵AI・20行動勝利は未検証。設計承認待ち。',17,'#adc0d7')
(D/'stage_087_full_v2.svg').write_text(svg(1600,1145,b,'87面v2 荷役板の陰と雲外の貨物棚'))
b=t(40,45,'87面：旧案と新案の同縮尺比較',28)
b+=t(40,92,'旧v1：長い連絡橋と似た上下貨物島',21)+view(p['before'],55,500,3.8)
b+=t(820,92,'新v2：固定P0前の可動遮蔽と、C外の固定棚',21)+view(a,845,500,3.8,False,True)
b+=t(40,560,'橋の開閉を待ち、上下の棚へ移る構成',17,'#adc0d7')+t(820,560,'渡らずにBの遮蔽を読む／準備してCを避ける',17,'#adc0d7')
b+=t(40,620,'B水平／起立×D04温存／除去を静的確認。Cの速度作用と実体の遮蔽を区別する。',18,'#adc0d7')
(D/'stage_087_compare_v2.svg').write_text(svg(1600,665,b,'87面旧v1と新v2の比較'))
