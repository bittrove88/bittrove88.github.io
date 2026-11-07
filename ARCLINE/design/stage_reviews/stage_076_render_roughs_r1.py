"""Stage 76 direction sketches. Reads approved references without changing them."""
import argparse
import copy
import json
from pathlib import Path
from stage_075_render_roughs_r2 import COLORS,line,map_view,svg,t

HERE=Path(__file__).resolve().parent

def document(w,h,body,title):
 return svg(w,h,body,title).replace('75面の方向性レビュー用ラフ。全景と攻略意図を示す。','76面の方向性レビュー用ラフ。既存の磁場と端子、射点の選択を示す。')

def draw(a,ox,base,scale,labels=False,arrows=False):
 v=copy.deepcopy(a)
 if a.get('stageNumber')==76:v['id']='076-'+str(a.get('id','reference'))
 out=[map_view(v,ox,base,scale,labels=False,arrows=arrows)]
 for f in a.get('features',[]):
  if f['type']=='T':
   x,h=f['v'][:2];cx=ox+x*scale;cy=base-h*scale
   out.append(f'<circle cx="{cx}" cy="{cy}" r="{max(7,2*scale)}" fill="#584b2f" stroke="#f2ca7d" stroke-width="1.8"/>')
   out.append(t(cx-5,cy+5,'T',15,'#ffe0a3',700))
 if arrows and a.get('terminalOperation'):
  out.append(line(a['terminalOperation'],scale,ox,base,fill='none',stroke='#f2ca7d',stroke_width=2,stroke_dasharray='4 5'))
 if labels:
  p=a['player'];e=a['enemy']
  out += [t(ox+p['x']*scale-23,base-p['h']*scale+27,'P0 / R',16,COLORS['player'],700),t(ox+e['x']*scale-17,base-e['h']*scale+26,'敵',16,COLORS['enemy'],700)]
  for anchor in a.get('anchors',[]):
   if anchor['id']=='R':continue
   x=ox+anchor['x']*scale;y=base-(anchor['h']+3)*scale
   out.append(f'<circle cx="{x}" cy="{y}" r="9" fill="{COLORS["card"]}" stroke="{COLORS["main"]}" stroke-width="2"/>')
   out.append(t(x-5,y+5,anchor['id'],14,COLORS['main'],700))
 return ''.join(out)

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
 source=json.loads((HERE/'stage_076_roughs_r1.json').read_text());A,B=source['candidates']
 out=[t(38,44,'ARCLINE 076  /  地形と攻略が異なるラフ2案',29,weight=700),t(40,78,'方向性レビュー用。初期Mは−1、Tで次の手番境界に極性反転。破線は構想で、実弾道ではありません。',17,COLORS['muted'])]
 for a,cy in [(A,101),(B,877)]:
  out.append(f'<rect x="24" y="{cy}" width="1552" height="750" rx="18" fill="{COLORS["card"]}" stroke="#2e415d"/>')
  out += [t(48,cy+38,a['id']+'  '+a['title'],27,weight=700),t(49,cy+69,a['choice'],18,COLORS['muted'])]
  out.append(draw(a,125,cy+612,7.2,True,True))
  if a['id']=='A':
   out += [t(610,cy+135,'M：移動すると想定銃口が場の内側へ',17,'#d3b9f7'),t(150,cy+335,'T切替後、外側Rから入れる',17,COLORS['alternate']),t(790,cy+460,'C：初期極性のまま、内側から射撃',17,COLORS['main']),t(480,cy+587,'固定の曲面試射路と、地盤に接続する支持柱',17)]
  else:
   out += [t(170,cy+291,'まず敵と逆側のTへ',17,'#f2ca7d'),t(1100,cy+175,'T切替後、右へ向き直ってM経由',17,COLORS['main']),t(965,cy+531,'Tを使わずCへ再配置し、Mの下縁の外から',17,COLORS['alternate']),t(445,cy+618,'固定の制御台と前面防爆立ち上がり',17)]
  out.append(f'<rect x="25" y="{cy+667}" width="1550" height="72" fill="{COLORS["card"]}"/>')
  out += [t(48,cy+691,'発見：'+a['discovery'],17),t(48,cy+725,'固定構造・M1個・T1個。実歩行、転移、端子操作、極性と命中、敵反撃、16行動攻略は未検証。',15,COLORS['muted'])]
 out += [t(40,1670,'灰紫＝地盤　灰青＝固定実験設備　紫の円＝M　橙の円＝T　橙破線＝端子操作の構想　細点線＝再配置の構想',16,COLORS['muted'])]
 products={'stage_076_roughs_r1.svg':document(1600,1700,''.join(out),'ARCLINE 76面 曲面試射路と制御棟のラフ2案')}
 old=json.loads((HERE/'stage_076_proposal_v2.json').read_text())['after']
 stage75=json.loads((HERE/'stage_075_proposal_v4.json').read_text())['after']
 cells=[('76 A｜磁場を抱く曲面試射路',A,'歩いて磁場内へ／外側に残って極性変更'),('76 B｜背中合わせの制御棟',B,'逆向き端子操作／前へ転移して磁場回避'),('76 PR #74 v2｜最新の未承認元案',old,'同形の上下発射台と敵側の浮いたフード'),('75 A v4｜設計承認済み',stage75,'固定岩肩と横穴／Dは一時防御')]
 for n,v,caption in [(65,3,'火口・噴出と反射'),(66,4,'独立屋根・炉底と稜線'),(67,4,'S字山裾と逆向きの庇'),(69,2,'凹形退避島'),(71,5,'小型浮遊ブロックと4分割鉱脈'),(72,4,'断層越えと逆向き射撃')]:
  item=json.loads((HERE/f'stage_{n:03}_proposal_v{v}.json').read_text());cells.append((f'{n} v{v}｜設計承認済み',item['after'],caption))
 out=[t(36,43,'76面の新ラフと、最新元案・承認済み7面',29,weight=700),t(37,77,'同縮尺：1単位=2.7px。新案は仮寸法。参照面は各保存版のJSONから再描画し、座標は変更していません。',16,COLORS['muted'])]
 for i,(title,a,caption) in enumerate(cells):
  x=24+(i%2)*788;cy=101+(i//2)*354
  out.append(f'<rect x="{x}" y="{cy}" width="764" height="336" rx="13" fill="{COLORS["card"]}" stroke="#2e415d"/>')
  out += [t(x+18,cy+29,title,21,weight=700),draw(a,x+111,cy+284,2.7,arrows=i<2),t(x+18,cy+320,caption,16,COLORS['muted'])]
 out.append(t(37,1901,'ラフA/Bの方向性を確認してから採用1案を詳細化します。M/Tは既存仕様。構造の移動・崩壊・新しい機構は追加しません。',16,COLORS['muted']))
 products['stage_076_roughs_context_r1.svg']=document(1600,1930,''.join(out),'76面ラフと元案および承認済み7面の同縮尺比較')
 for name,content in products.items():
  if args.check:assert (HERE/name).read_text()==content+'\n',name+' is out of sync'
  else:(HERE/name).write_text(content+'\n')
 print('2 Stage 76 SVGs '+('match source data' if args.check else 'generated'))

if __name__=='__main__':main()
