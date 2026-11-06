import json,math,html
from pathlib import Path
D=Path(__file__).resolve().parent;p=json.loads((D/'stage_079_proposal_v3.json').read_text());a=p['after']
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
b=t(40,46,'ARCLINE 079 v3｜開放保守台と岩脊越しの接続橋',30)+t(40,82,'P0の屋根を撤去。Lの頭上も開き、敵前の岩脊で直射を遮る。',20,'#adc0d7')
b+=view(a,90,850,8,False,False)+bridge(a,90,850,8,True,'#e6ba6f','3 4')
for q in a['attacks']:b+=pl(q['points'],90,850,8,'#76e0c4' if q['kind']=='bridge-over-ridge' else '#e6ba6f','8 7')
for q in a['transferSpaces']:b+=pl(q['points'],90,850,8,'#93b9df','2 6')
for q in a['anchors'][1:]:
 x=90+q['x']*8;y=850-q['h']*8;b+=f'<circle cx="{x}" cy="{y-5}" r="5" fill="#76e0c4"/>'
b+=t(490,472,'P0：頭上に実体なし',18,'#93b9df')+t(680,475,'A：固定浮岩',18,'#76e0c4')
b+=t(750,715,'新L：橋・浮岩の真下から移す',18,'#e6ba6f')+t(750,746,'上方からの着地を狙う空間を開く',17,'#93b9df')
b+=t(1000,570,'M 初期＋1',21,'#d5c3ff')+t(1000,600,'L側はT切替後の−1',17,'#d5c3ff')
b+=t(1245,212,'敵前の固定岩脊',18)+t(1350,451,'enemy:volt',18,'#ff9caa')
b+=t(835,132,'岩脊の上は開放：M曲射／通常の山越し弧を探る',18,'#76e0c4')
for ps in [[[63,55],[144,57]],[[96,27],[143,48]]]:
 b+=pl(ps,90,850,8,'#e68e93','5 7');x=90+ps[-1][0]*8;y=850-ps[-1][1]*8;b+=f'<path d="M{x-6},{y-6}l12,12m-12,0l12,-12" stroke="#ff9caa" stroke-width="3"/>'
b+=t(1200,518,'代表直射を岩盤で遮断',17,'#ff9caa')
q=a['pickups'][0];x=90+q['x']*8;y=850-q['h']*8;b+=f'<path d="M{x},{y-7}l7,7l-7,7l-7,-7z" fill="#ffe59a"/>'+t(310,352,'SK079（任意）',16,'#ffe59a')
b+=t(40,942,'修正① 整備アームを全撤去。P0から上向きに出す帯と、A/Lへの転移構想空間を残す。',21)
b+=t(40,980,'修正② Lを右へ移し、橋と浮岩の下を避ける。固定支持面の幅は100px。',19,'#93b9df')
b+=t(40,1018,'修正③ 敵を岩脊の裏へ。初期敵位置へのP0/A/Lの代表直射は、両橋姿勢とも岩盤で遮断。',18,'#ffb8ad')
b+=t(40,1056,'橋からAへ渡る／Aへ転移する／LでT/Mを使う選択を残す。P0からの山越しも禁止しない。',18,'#adc0d7')
b+=t(40,1097,'青点線＝転移の構想空間、緑・橙破線＝射撃の構想。実弾道・実着地の記録ではない。',17,'#adc0d7')
b+=t(40,1138,'静的確認のみ。転移・実歩行・T/M命中・敵AI・反撃・16行動勝利は未検証。設計承認待ち。',17,'#adc0d7')
(D/'stage_079_full_v3.svg').write_text(svg(1600,1180,b,'79面v3 屋根撤去と岩脊による直射遮断'))
b=t(40,45,'79面：指摘を受けたv2と修正版v3（同縮尺）',28)
b+=t(40,92,'旧v2：P0の屋根・橋下のL・開いた直射',21)+view(p['before'],60,490,3.8)
b+=t(820,92,'新v3：開いた出発点と着地先・岩脊裏の敵',21)+view(a,840,490,3.8)
b+=t(40,555,'屋根で転移の選択を狭め、受け側への直射が残った',17,'#ffb8ad')+t(820,555,'屋根撤去／L移設／敵岸の輪郭とM/Tを再配置',17,'#93b9df')
b+=t(40,620,'代表直射は初期敵位置の検査。転移着地・命中・敵移動後の射線は未検証。',18,'#adc0d7')
(D/'stage_079_compare_v3.svg').write_text(svg(1600,665,b,'79面v2と修正版v3の比較'))
