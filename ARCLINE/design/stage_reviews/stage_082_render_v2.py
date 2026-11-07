import json,math,html
from pathlib import Path
D=Path(__file__).resolve().parent;p=json.loads((D/'stage_082_proposal_v2.json').read_text());a=p['after']
def t(x,y,s,n=18,c='#dce8f5'):return f'<text x="{x}" y="{y}" font-size="{n}" fill="{c}">{html.escape(s)}</text>'
def pl(ps,ox,base,s,c,dash=''):
 return f'<polyline points="'+' '.join(f'{ox+x*s},{base-h*s}' for x,h in ps)+f'" fill="none" stroke="{c}" stroke-width="2.5" stroke-dasharray="{dash}"/>'
def view(v,ox,base,s,arrows=False):
 out=''
 for f in v.get('floors',[v['floor']]):
  ps=f+[[f[-1][0],-2],[f[0][0],-2]];pts=' '.join(f'{ox+x*s},{base-h*s}' for x,h in ps);out+=f'<polygon points="{pts}" fill="#314551"/>'+pl(f,ox,base,s,'#b9cfc5')
 for q in v['parts']:
  pts=' '.join(f'{ox+x*s},{base-h*s}' for x,h in q['poly']);c='#b28a56' if q['breakable'] else '#4b7168';out+=f'<polygon points="{pts}" fill="{c}" stroke="#b5ccaa" stroke-width="1.5"/>'
 for q in v['features']:
  if q['type']=='M':
   x,h,r,dr=q['v'];out+=f'<circle cx="{ox+x*s}" cy="{base-h*s}" r="{r*s}" fill="#b397e8" fill-opacity=".12" stroke="#c1a8eb" stroke-dasharray="6 5"/>'
  if q['type']=='W':
   x1,x2=q['v'][:2]
   for f in v.get('floors',[v['floor']]):
    for left,right in zip(f,f[1:]):
     lo=max(left[0],x1);hi=min(right[0],x2)
     if hi>lo:
      height=lambda x:left[1]+(right[1]-left[1])*(x-left[0])/(right[0]-left[0])
      out+=pl([[lo,height(lo)],[hi,height(hi)]],ox,base,s,'#83d9ee')
 if arrows:
  for q in v['attacks']:out+=pl(q['points'],ox,base,s,'#83d9ee' if q['kind']=='floor-W' else '#d4b6ff','8 7')
  for q in v['transferSpaces']:out+=pl(q['points'],ox,base,s,'#b3c7d7','2 7')
 for key,c in [('player','#76e0c4'),('enemy','#ff9caa')]:
  q=v[key];out+=f'<ellipse cx="{ox+q["x"]*s}" cy="{base-q["h"]*s-12}" rx="{max(9,s*2.2)}" ry="12" fill="{c}"/>'
 return out
def svg(w,h,b,title):return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{title}"><title>{title}</title><rect width="100%" height="100%" fill="#101b2b"/><g font-family="Noto Sans CJK JP, sans-serif">{b}</g></svg>\n'
b=t(40,46,'ARCLINE 082 v2｜根間の床鏡と開いた磁場台',30)+t(40,82,'固定根を残し、低い窓から床Wへ入れる ／ 開いたAからMへ入れる',19,'#adc0d7')
b+=view(a,80,900,8,True)
# Root veins are visual annotations, not extra collision geometry.
b+=pl([[53,56],[60,61],[69,59],[74,53]],80,900,8,'#789389')+pl([[128,55],[134,60],[141,58],[148,46]],80,900,8,'#789389')
b+=t(360,296,'F01 左の固定根：低い入射帯の上に張り出す',18)+t(1070,316,'F02 右の返し根：敵側へ接続',18)
b+=t(220,710,'P0：左根より手前。頭上は開放',18,'#76e0c4')
b+=t(680,880,'W：支持された床面の一段だけ',18,'#83d9ee')
b+=t(830,794,'A：頭上の開いた固定台',18,'#d4b6ff')
b+=t(986,655,'M −1',23,'#d4b6ff')
b+=t(425,758,'D03：窓の下部',17,'#e6ba6f')+t(425,787,'上側は壊さず通す',16,'#e6ba6f')
b+=t(1260,563,'enemy:gust',18,'#ff9caa')
b+=t(730,224,'W反射後はMの上を回す構想',18,'#83d9ee')
b+='<circle cx="880" cy="751" r="5" fill="#d4b6ff"/>'
q=a['pickups'][0];x=80+q['x']*8;y=900-q['h']*8;b+=f'<path d="M{x},{y-7}l7,7l-7,7l-7,-7z" fill="#ffe59a"/>'+t(190,582,'W10（既存試用・任意）',16,'#ffe59a')
b+=t(40,965,'主攻略：根下の常設開口を通し、床Wへ落として一回反射。反射下面は新設しない。',21)
b+=t(40,1003,'別の選択：Aへ転移し初期−1のMへ入れる。WとMの一発連鎖は必須にしない。',19,'#d4b6ff')
b+=t(40,1041,'D03を壊すと窓の下部も開く。根・床・支持は残り、代表直射も固定地形が遮る。',18,'#adc0d7')
b+=t(40,1079,'P0/Aの頭上を開き、Aへ上から進入する空間を確保。射撃後はその位置で反撃を受ける。',18,'#ffb8ad')
b+=t(40,1119,'破線は構想空間。W反射・M命中・転移着地・敵AI・20行動勝利は未検証。設計承認待ち。',17,'#adc0d7')
(D/'stage_082_full_v2.svg').write_text(svg(1600,1160,b,'82面v2 根間の床鏡と開いた磁場台'))
b=t(40,45,'82面：旧案と新案の同縮尺比較',28)
b+=t(40,92,'旧v1：巨大な一枚根とM・必須の窓破壊',21)+view(p['before'],55,500,3.8)
b+=t(820,92,'新v2：左右の根と開放部・W/Mの役割分担',21)+view(a,845,500,3.8)
b+=t(40,558,'根の下の低棚からW/Mを連鎖させる狙い',17,'#adc0d7')+t(820,558,'Wは床へ。Mは頭上の開いた射点へ。破壊は任意',17,'#adc0d7')
b+=t(40,617,'Wの実体接触・Mとの非交差・窓温存／除去を静的確認。旧案の実射記録は新案へ流用しない。',18,'#adc0d7')
(D/'stage_082_compare_v2.svg').write_text(svg(1600,660,b,'82面旧v1と新v2の比較'))
