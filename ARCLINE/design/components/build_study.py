from pathlib import Path
import argparse,hashlib,json,math,html,re,xml.etree.ElementTree as ET
P=Path(__file__).parent
art=json.loads((P/'component-art.json').read_text())
shared=art['sharedMaterials']
for source in json.loads((P/'sources.json').read_text())['references']:
 data=(P/source['file']).read_bytes()
 if hashlib.sha256(data).hexdigest()!=source['sha256']:raise ValueError('Reference hash mismatch: '+source['file'])
 if 'gitBlob' in source and hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()!=source['gitBlob']:raise ValueError('Git blob mismatch: '+source['file'])
for key,theme in art['themeMaterials'].items():
 if not {'face','shade','light','cap','ink'}<=theme['material'].keys():raise ValueError('Incomplete theme material: '+key)
 if set(theme['material'])-{'face','shade','light','cap','ink','accent'}:raise ValueError('Theme must not override shared functional materials: '+key)
for values in [*(t['material'] for t in art['themeMaterials'].values()),*shared.values()]:
 if not all(re.fullmatch(r'#[0-9A-Fa-f]{6}',v) for v in values.values()):raise ValueError('All component colors must be opaque hex colors')
maps=json.loads((P/'map-geometry.json').read_text())
out=[];defs=[]
def add(s):out.append(s)
def text(x,y,s,size=16,fill='#423F42',weight=400):return f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{weight}" fill="{fill}">{html.escape(s)}</text>'
def rect(x,y,w,h,c,rx=0):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{c}"/>'
def path(d,c,stroke=None,width=1):return f'<path d="{d}" fill="{c}"'+(f' stroke="{stroke}" stroke-width="{width}" stroke-linejoin="round"' if stroke else '')+'/>'
def poly(points,c,stroke=None,width=1):return path('M'+' L'.join(f'{x:.2f} {y:.2f}' for x,y in points)+' Z',c,stroke,width)
def line(points,c,w=1):return path('M'+' L'.join(f'{x:.2f} {y:.2f}' for x,y in points),'none',c,w)
palettes={key:theme['material'] for key,theme in art['themeMaterials'].items()}
counter=0
def solid(points,p,fragile=False,cap=None):
 global counter
 counter+=1;key=f'clip-{counter}';defs.append(f'<clipPath id="{key}">'+poly(points,'#fff')+'</clipPath>')
 x=min(a for a,b in points);r=max(a for a,b in points);y=min(b for a,b in points);bottom=max(b for a,b in points);w=r-x;h=bottom-y
 a=shared['breakable'] if fragile else p
 s=poly(points,a['face'],a['ink'],1.6)+f'<g clip-path="url(#{key})">'
 s+=poly([(x+w*.55,y-5),(r+4,y),(r+4,bottom+4),(x+w*.45,bottom+4),(x+w*.63,y+h*.45)],a['shade'])
 s+=poly([(x-2,y-2),(x+w*.35,y-2),(x+w*.49,y+h*.27),(x+w*.12,y+h*.38),(x-2,y+h*.23)],a['light'])
 if not fragile and a.get('accent'):
  s+=poly([(x+w*.04,y+h*.58),(x+w*.27,y+h*.46),(x+w*.42,y+h*.67),(x+w*.28,y+h*.88),(x+w*.06,y+h*.82)],a['accent'])
 if cap:s+=line(cap,a['cap'],5)
 if fragile:
  mid=x+w*.51
  s+=line([(mid+3,y+h*.14),(mid-5,y+h*.39),(mid+4,y+h*.57),(mid-4,y+h*.84)],a['cap'],2.5)
  s+=line([(mid-5,y+h*.39),(x+w*.27,y+h*.46)],a['cap'],1.8)
 s+='</g>'+poly(points,'none',a['ink'],1.6)
 return s
def background(name,x,y,w,h):
 raw=(P/'references'/name).read_text();body=re.sub(r'^.*?<svg\b[^>]*>','',raw,flags=re.S);body=re.sub(r'</svg>\s*$','',body)
 vb='0 0 1120 604' if 'cove' in name else '0 0 1000 540'
 return f'<svg x="{x}" y="{y}" width="{w}" height="{h}" viewBox="{vb}" preserveAspectRatio="xMidYMid slice">{body}</svg>'
add(rect(0,0,1440,1135,'#F2EFE7'))
add(text(48,47,'ARCLINE  /  COMPONENT STUDY',17,'#766B64',600))
add(text(48,88,'風景に馴染み、遊べる輪郭が読める。',32,'#37383C',600))
add(text(48,119,'改訂 0.3  ·  テーマの素材から配色を設計  ·  ゲーム未実装',15,'#756B68'))
for i,row in enumerate(maps):
 x=48+i*696;y=150;w=648;h=300;p=palettes['cove' if i==0 else 'volcano']
 add(background('first-cove.svg' if i==0 else 'volcanic-rim.svg',x,y,w,h))
 key='map-window-'+str(i);defs.append(f'<clipPath id="{key}">'+rect(x,y,w,h,'#fff')+'</clipPath>')
 add(f'<g clip-path="url(#{key})">')
 scale=.602;ox=x+22;oy=y-3
 conv=lambda pt:(ox+pt['x']*scale,oy+pt['y']*scale)
 for o in row['world']['solids']:
  points=[conv(pt) for pt in o['poly']]
  supports=[s for s in row['world']['surfaces'] if (s.get('solidId') or s.get('id'))==o['id']]
  caps=[]
  for s in supports:
   for a,b in zip(s['points'],s['points'][1:]):
    if abs(math.atan2(b['y']-a['y'],b['x']-a['x']))<=math.radians(70)+1e-7:caps.append([conv(a),conv(b)])
  add(solid(points,p,o['kind']=='fragile'))
  # Paint the contact band inside the original polygon only.
  shapeclip=f'cap-{i}-{len(defs)}';defs.append(f'<clipPath id="{shapeclip}">'+poly(points,'#fff')+'</clipPath>')
  add(f'<g clip-path="url(#{shapeclip})">'+''.join(line(c,p['cap'] if o['kind']!='fragile' else shared['breakable']['cap'],4) for c in caps)+'</g>')
 for j,u in enumerate(row['units']):
  px,py=conv(u);add(f'<circle cx="{px}" cy="{py-8}" r="6" fill="#F1E4BF" stroke="#3C4547" stroke-width="2"/>');add(text(px-14,py-20,'自機' if j==0 else '敵',12,'#273A41',600))
 add('</g>')
 add(text(x,y+h+27,('01  はじまりの入江  /  4面「弾で渡る船着場」' if i==0 else '02  火山の外縁  /  61面「長い射線の第一扉」'),17,weight=600))
 add(text(x,y+h+51,('砂色の岩・淡い砂岩色・海を感じる青緑の暗面' if i==0 else '炭黒の玄武岩・鉄錆の赤褐色・焼けた黄土色'),15,'#756B68'))
add(text(48,550,'テーマごとの素材・配色 ＋ 共通の機能部品',23,weight=600))
add(text(48,578,'入江＝砂岩・海色。火山＝玄武岩・鉄錆。描き方を揃え、素材に適した独立した配色を使う。',15,'#756B68'))
names=['固定地盤・浮岩','破壊可能な壁・屋根','反射面 W / 反射板 K','可動橋 B','風・磁場などの状態表示','端子 T']
notes=['入江は砂色と青緑、火山は炭黒と赤褐色。','紫味・亀裂・破壊単位の見せ方は両テーマ共通。','反射面と縁は共通。下の支持材をテーマへ合わせる。','橋板・支点・接地縁は共通。基礎の材質を調整。','方向・極性・ON/OFFの意味と表示を共通化。','操作部と記号は共通。台座の素材で景色へ馴染ませる。']
for i in range(6):
 x=48+(i%3)*464;y=603+(i//3)*222
 add(rect(x,y,440,201,'#FCFAF5',8));add(text(x+20,y+28,names[i],18,weight=600))
 for j,key in enumerate(['cove','volcano']):
  xx=x+22+j*210;p=palettes[key]
  add(text(xx,y+55,'入江' if j==0 else '火山',12,'#8C7B70',600))
  if i==0:
   pts=[(xx+8,y+101),(xx+74,y+85),(xx+170,y+108),(xx+145,y+141),(xx+37,y+143)]
   add(solid(pts,p,cap=pts[:3]))
  if i==1:
   add(solid([(xx+40,y+72),(xx+129,y+72),(xx+129,y+146),(xx+40,y+146)],p,True))
  if i==2:
   add(solid([(xx,y+117),(xx+183,y+117),(xx+183,y+147),(xx,y+147)],p))
   add(rect(xx+15,y+106,151,11,shared['reflector']['body']));add(rect(xx+15,y+106,151,4,shared['reflector']['edge']))
   for k in range(3):add(line([(xx+39+k*43,y+119),(xx+47+k*43,y+128)],shared['reflector']['marks'],2))
  if i==3:
   add(solid([(xx+3,y+126),(xx+38,y+126),(xx+38,y+147),(xx+3,y+147)],p))
   add(poly([(xx+15,y+110),(xx+174,y+110),(xx+174,y+124),(xx+15,y+124)],shared['bridge']['body'],shared['bridge']['ink'],1.6))
   add(line([(xx+15,y+110),(xx+174,y+110)],shared['bridge']['contact'],4))
   add(f'<circle cx="{xx+19}" cy="{y+117}" r="10" fill="#B89B74" stroke="#44474A" stroke-width="2"/>')
  if i==4:
   add(path(f'M{xx+20} {y+76} h-14 v63 h14 M{xx+157} {y+76} h14 v63 h-14','none',shared['field']['active'],2))
   add(text(xx+45,y+119,'→',40,shared['field']['active'],600));add(text(xx+101,y+112,'ON',16,shared['field']['active'],600))
  if i==5:
   add(solid([(xx+32,y+126),(xx+145,y+126),(xx+145,y+145),(xx+32,y+145)],p))
   add(rect(xx+57,y+78,64,49,shared['terminal']['body'],5));add(rect(xx+65,y+88,48,26,shared['terminal']['display'],2));add(text(xx+79,y+109,'＋',24,shared['terminal']['symbol'],600))
 add(text(x+20,y+177,notes[i],13,'#756B68'))
add(text(48,1080,'制作範囲：描画用部品。座標・当たり判定・破壊単位・70度の接地条件を維持。',16,weight=600))
add(text(48,1107,'上段は現行マップの輪郭を使った美術構想。下段はテーマ比較用の独立見本。実戦・実機の視認性は未検証。',13,'#756B68'))
svg='<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1135" viewBox="0 0 1440 1135"><defs>'+''.join(defs)+'</defs><g font-family="Noto Sans CJK JP,Arial,sans-serif">'+''.join(out)+'</g></svg>'
root=ET.fromstring(svg)
for node in root.iter():
 tag=node.tag.rsplit('}',1)[-1]
 if tag in {'image','filter','linearGradient','radialGradient','script','foreignObject'}:raise ValueError('Forbidden SVG element: '+tag)
 if any(k.rsplit('}',1)[-1] in {'href','filter'} for k in node.attrib):raise ValueError('External/effect SVG reference')
 for attr in ('opacity','fill-opacity','stroke-opacity'):
  if attr in node.attrib and float(node.attrib[attr])!=1:raise ValueError('Translucent SVG fill')
page='<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ARCLINE 地形とオブジェクトの美術方針</title><style>body{margin:0;padding:24px;background:#F2EFE7;color:#423F42;font-family:system-ui,sans-serif}header{max-width:1100px;margin:0 auto 20px}h1{font-size:24px}p{line-height:1.7}.study{overflow:auto;border:1px solid #D9D2C8;max-width:1440px;margin:auto}.study svg{display:block;width:100%;min-width:960px;height:auto}a{color:#355F60}</style><header><h1>承認済み 地形とオブジェクトの美術方針</h1><p>テーマの素材から配色を設計し、破壊材・反射面などの機能部品を共通化するv0.3見本です。ゲーム未実装。小さい画面では見本を横にスクロールできます。</p><p><a href="README.md">制作入口</a> · <a href="ART_DIRECTION.md">制作ルール</a> · <a href="IMPLEMENTATION_HANDOFF.md">実装引き継ぎ</a> · <a href="component-art.json">編集データ</a> · <a href="component-study.svg">SVG単体</a></p></header><main class="study">'+svg+'</main></html>'
parser=argparse.ArgumentParser(description='Build the approved component art study from palette JSON and pinned geometry/background snapshots.')
parser.add_argument('--check',action='store_true',help='Verify SVG and HTML without writing.')
args=parser.parse_args()
for name,content in [('component-study.svg',svg),('component-study.html',page)]:
 target=P/name
 if args.check:
  if not target.exists() or target.read_text()!=content:raise SystemExit('OUT OF DATE: '+name)
 else:target.write_text(content)
print('PASS: pinned sources, opaque palettes, SVG constraints and '+('SVG/HTML synchronization' if args.check else 'SVG/HTML generation'))
