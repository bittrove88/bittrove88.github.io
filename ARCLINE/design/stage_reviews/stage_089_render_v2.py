import json,math,html
from pathlib import Path
D=Path(__file__).resolve().parent;p=json.loads((D/'stage_089_proposal_v2.json').read_text());a=p['after']
def t(x,y,s,n=18,c='#dce8f5'):return f'<text x="{x}" y="{y}" font-size="{n}" fill="{c}">{html.escape(s)}</text>'
def pl(ps,ox,base,s,c,dash=''):
 return f'<polyline points="'+' '.join(f'{ox+x*s},{base-h*s}'for x,h in ps)+f'" fill="none" stroke="{c}" stroke-width="2.5" stroke-dasharray="{dash}"/>'
def view(v,ox,base,s,arrows=False):
 out=''
 for f in v.get('floors',[v['floor']]):
  pts=' '.join(f'{ox+x*s},{base-h*s}'for x,h in f+[[f[-1][0],-2],[f[0][0],-2]]);out+=f'<polygon points="{pts}" fill="#314551"/>'+pl(f,ox,base,s,'#b9cfc5')
 for q in v['parts']:
  pts=' '.join(f'{ox+x*s},{base-h*s}'for x,h in q['poly']);c='#b28a56'if q['breakable']else'#536878';out+=f'<polygon points="{pts}" fill="{c}" stroke="#b6c6ce" stroke-width="1.5"/>'
 for q in v['features']:
  if q['type']=='C':
   x1,x2,h1,h2=q['v'];out+=f'<rect x="{ox+x1*s}" y="{base-h2*s}" width="{(x2-x1)*s}" height="{(h2-h1)*s}" fill="#a5b7c9" fill-opacity=".13" stroke="#a5b7c9" stroke-dasharray="5 5"/>'
  if q['type']=='W':
   keel=next((k for k in v['parts']if k['id']=='089-RETURN-KEEL'),None)
   if keel:out+=pl(keel['poly'][1:3],ox,base,s,'#83d9ee')
   else:
    x1,x2=q['v'][:2]
    for f in v.get('floors',[v['floor']]):
     for left,right in zip(f,f[1:]):
      lo=max(left[0],x1);hi=min(right[0],x2)
      if hi>lo:
       h=lambda x:left[1]+(right[1]-left[1])*(x-left[0])/(right[0]-left[0])
       out+=pl([[lo,h(lo)],[hi,h(hi)]],ox,base,s,'#83d9ee')
 if arrows:
  for q in v['attacks']:out+=pl(q['points'],ox,base,s,'#76e0c4'if q['kind']=='outer-C'else'#83d9ee','8 7')
  out+=pl(v['optionalOpenShot'],ox,base,s,'#e6ba6f','4 8')
  for q in v['transferSpaces']:out+=pl(q['points'],ox,base,s,'#aabccf','2 7')
 for key,c in [('player','#76e0c4'),('enemy','#ff9caa')]:
  q=v[key];out+=f'<ellipse cx="{ox+q["x"]*s}" cy="{base-q["h"]*s-12}" rx="{max(9,s*2.2)}" ry="12" fill="{c}"/>'
 return out
def svg(w,h,b,title):return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{title}"><title>{title}</title><rect width="100%" height="100%" fill="#101b2b"/><g font-family="Noto Sans CJK JP, sans-serif">{b}</g></svg>\n'
b=t(40,46,'ARCLINE 089 v2｜船底から返す装甲の切欠き',30)+t(40,82,'外甲板のC越し弧 ／ 任意の装甲開口 ／ 船底から逆向きW反射',19,'#adc0d7')
b+=view(a,80,920,7.5,True)
b+=pl([[136,48],[146,43],[173,43]],80,920,7.5,'#8299a5')
b+=t(170,652,'P0：外甲板／頭上は開放',18,'#76e0c4')
b+=t(630,457,'C：速度減衰',23,'#b7c8db')+t(630,486,'実体遮蔽ではない',17,'#b7c8db')
b+=t(975,314,'D04：装甲の独立片',18,'#e6ba6f')+t(975,343,'橙の弧は破壊後のみ',17,'#e6ba6f')
b+=t(935,705,'B：船底の固定足場',18,'#83d9ee')+t(905,735,'← 10px歩いて左へ向き直る',17,'#83d9ee')
b+=t(670,888,'W：船底に支持された下降斜面',18,'#83d9ee')+t(670,916,'左へ撃ち込み、右上へ返す構想',17,'#83d9ee')
b+='<circle cx="980" cy="765" r="5" fill="#83d9ee"/>'
b+=t(1260,615,'固定船首：直射遮断は残る',18)+t(1290,568,'enemy:volt',17,'#ff9caa')
q=a['pickups'][0];x=80+q['x']*7.5;y=920-q['h']*7.5;b+=f'<path d="M{x},{y-7}l7,7l-7,7l-7,-7z" fill="#ffe59a"/>'+t(170,488,'SK089（既存・任意）',16,'#ffe59a')
b+=t(40,1010,'外甲板はCを読む。装甲を開けば低めの弧へ。船底は転移と向き直りを使いWで返す。',21)
b+=t(40,1049,'三経路を同時に使わず、必須破壊・必須転移ゼロの外甲板経路も残す。',19,'#adc0d7')
b+=t(40,1088,'D04を除いても固定船首は残り、初期敵への代表直射は遮断。P0/Bの頭上は開放。',18,'#adc0d7')
b+=t(40,1127,'図の折れ線は構想。実W反射のbounce付き命中・C命中・転移着地・20行動勝利は未検証。',17,'#ffb8ad')
b+=t(40,1166,'船底の反射は静的な接触と方向だけを確認。実戦の成立は全49面の設計承認後に検証。',17,'#adc0d7')
(D/'stage_089_full_v2.svg').write_text(svg(1600,1210,b,'89面v2 船底から返す装甲の切欠き'))
b=t(40,45,'89面：旧案と新案の同縮尺比較',28)
b+=t(40,92,'旧v1：上下棚と装甲・大型船首屋根',21)+view(p['before'],55,500,3.8)
b+=t(820,92,'新v2：外甲板・切欠き・逆向きWを持つ船底',21)+view(a,845,500,3.8)
b+=t(40,558,'鏡路の命中にbounceが未確認だった案',17,'#adc0d7')+t(820,558,'Wへ左からではなく右から入れ、右上へ返す構想',17,'#83d9ee')
b+=t(40,620,'接触は支持されたW面、反射方向は左→右上を静的確認。実弾のbounce付き命中は未検証。',18,'#adc0d7')
(D/'stage_089_compare_v2.svg').write_text(svg(1600,665,b,'89面旧v1と新v2の比較'))
