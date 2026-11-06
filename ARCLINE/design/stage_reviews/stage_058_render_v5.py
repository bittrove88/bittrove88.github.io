import json,html
from pathlib import Path
D=Path(__file__).resolve().parent;p=json.loads((D/'stage_058_proposal_v5.json').read_text());a=p['after']
def t(x,y,s,n=18,c='#dce8f5'):return f'<text x="{x}" y="{y}" font-size="{n}" fill="{c}">{html.escape(s)}</text>'
def pl(ps,ox,base,s,c,dash=''):
 return f'<polyline points="'+' '.join(f'{ox+x*s},{base-h*s}'for x,h in ps)+f'" fill="none" stroke="{c}" stroke-width="2.5" stroke-dasharray="{dash}"/>'
def view(v,ox,base,s,arrows=False):
 out=''
 for f in v.get('floors',[v['floor']]):
  pts=' '.join(f'{ox+x*s},{base-h*s}'for x,h in f+[[f[-1][0],-3],[f[0][0],-3]]);out+=f'<polygon points="{pts}" fill="#314f68"/>'+pl(f,ox,base,s,'#afdaea')
 for q in v['parts']:
  pts=' '.join(f'{ox+x*s},{base-h*s}'for x,h in q['poly']);c='#b39468'if q['breakable']else'#426f8c';out+=f'<polygon points="{pts}" fill="{c}" stroke="#b7d7e8" stroke-width="1.5"/>'
 for q in v['features']:
  if q['type']=='F':
   x1,x2,h1,h2=q['v'];out+=f'<rect x="{ox+x1*s}" y="{base-h2*s}" width="{(x2-x1)*s}" height="{(h2-h1)*s}" fill="#7cc9db" fill-opacity=".13" stroke="#8cd9e5" stroke-dasharray="5 5"/>'
 if arrows:
  for q in v['attacks']:out+=pl(q['points'],ox,base,s,'#86e3db'if q['kind']=='middle-F'else'#b2c8ff','8 7')
  for q in v['transferSpaces']:out+=pl(q['points'],ox,base,s,'#c4cfdf','2 7')
 for key,c in [('player','#76e0c4'),('enemy','#ff9caa')]:
  q=v[key];out+=f'<ellipse cx="{ox+q["x"]*s}" cy="{base-q["h"]*s-12}" rx="{max(9,s*2.2)}" ry="12" fill="{c}"/>'
 return out
def svg(w,h,b,title):return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{title}"><title>{title}</title><rect width="100%" height="100%" fill="#101b2b"/><g font-family="Noto Sans CJK JP, sans-serif">{b}</g></svg>\n'
b=t(40,46,'ARCLINE 058 v5｜ずれた氷裂の三層洞',30)+t(40,82,'破壊を進行条件にしない。常設開口から中層へ、さらに上層へ回る選択を残す。',19,'#adc0d7')
b+=view(a,80,900,7.8,True)
for q in a['anchors'][1:]:
 x=80+q['x']*7.8;y=900-q['h']*7.8;b+=f'<circle cx="{x}" cy="{y-5}" r="5" fill="#a2e6f0"/>'
b+=t(510,872,'P0：下層の開いた氷裂',18,'#76e0c4')
b+=t(770,649,'A：中層の支持面',18,'#86e3db')
b+=t(1014,409,'B：風の外の上層',18,'#b2c8ff')
b+=t(1270,390,'enemy:mist',18,'#ff9caa')
b+=t(888,481,'F ↔',24,'#8cd9e5')+t(888,510,'現在の風向きを読む',16,'#8cd9e5')
b+=t(420,721,'常設の下側開口',18)+t(420,750,'温存時も260px',16,'#e6c692')
b+=t(590,342,'ずれた上側開口',18)+t(590,371,'温存時も560px',16,'#e6c692')
b+=t(270,646,'D05：開口端の氷片',16,'#e6c692')
b+=t(1030,461,'D06：開口端の氷片',16,'#e6c692')
b+=t(90,530,'中層西の固定氷棚',17)+t(90,254,'上層西の固定氷盤',17)
b+=t(40,971,'主攻略：破壊ゼロでAへ移り、F越しに氷背を越す構想。',21)
b+=t(40,1010,'別の選択：常設開口からBへ移り、Fを外す。追加の移動手数と反撃を受け入れる。',19,'#b2c8ff')
b+=t(40,1049,'D05/D06は開口の端だけ。破壊は余白を広げる任意の選択で、支持を失わせない。',18,'#adc0d7')
b+=t(40,1088,'P0/Aの頭上は開放。射撃後は同位置で反撃を受け、同手番の退避・無償の風待ちはない。',18,'#ffb8ad')
b+=t(40,1127,'破線は構想空間。最低限の形状確認のみ実施。実転移・弾道・敵AI・16行動勝利は一括検証へ。',17,'#adc0d7')
(D/'stage_058_full_v5.svg').write_text(svg(1600,1170,b,'58面v5 ずれた氷裂の三層洞'))
b=t(40,45,'58面：旧v3と新v5の同縮尺比較',28)
b+=t(40,92,'旧案：層を塞ぐ窓と大氷蓋、多数の必須破壊',21)+view(p['before'],55,590,3.8)
b+=t(820,92,'新案：ずれた常設開口、端だけの任意破壊',21)+view(a,845,590,3.8)
b+=t(40,652,'旧案の座標・入力証跡は採用版として転用しない',17,'#adc0d7')+t(820,652,'P0→中層→上層の空間を先に残して描く',17,'#adc0d7')
b+=t(40,713,'データ整合・支持・明白な形状と空間を最小限に確認。実歩行・転移・命中・勝敗は最後に一括検証。',18,'#adc0d7')
(D/'stage_058_compare_v5.svg').write_text(svg(1600,755,b,'58面元案と新案の比較'))
