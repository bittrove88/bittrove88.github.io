"""Compile independently authored material JSON into component sheets and maps."""
from pathlib import Path
import argparse,copy,hashlib,json,math,re
from vector import path,poly,line,rect,ellipse,text,group,translated,clip_path,wrap,background,svg
P=Path(__file__).parent
def read(name):return json.loads((P/name).read_text())
M=read('manifest.json');S=read('shared-materials.json')['materials'];R=read('render-style.json');W=read('worlds.json');SCENES={r['id']:read(r['data']) for r in M['scenes']};BG={k:read(v['backgroundRef']) for k,v in SCENES.items()}
def outline_color(ink,body,weight):
 # An opaque material color, not alpha over a changing background.
 return '#'+''.join(f'{round(int(ink[i:i+2],16)*weight+int(body[i:i+2],16)*(1-weight)):02X}' for i in [1,3,5])
def select(stage,map_index=None):
 if not isinstance(stage,int) or isinstance(stage,bool) or not 1<=stage<=100:return None
 if stage==100:return SCENES.get('final-100-'+str(map_index)) if type(map_index)==int and 0<=map_index<=3 else None
 if stage%10==0:return SCENES['boss-'+str(stage).zfill(3)]
 return SCENES['normal-'+str((stage-1)//5).zfill(2)]
def solid(points,mat,cap=None,fragile=False,screen=False,solid_id=None):
 p=S['breakable'] if fragile else mat['palette'];nodes=[poly(points,p['face'])];xs=[x for x,y in points];ys=[y for x,y in points];x,y=min(xs),min(ys);w,h=max(xs)-x,max(ys)-y
 if fragile:
  planes=[{'color':'shade','points':[[.55,0],[1,0],[1,1],[.45,1],[.63,.45]]},{'color':'light','points':[[0,0],[.35,0],[.49,.27],[.12,.38],[0,.23]]}]
 else:planes=mat['planes']
 for a in planes:nodes.append(poly([(x+w*u,y+h*v) for u,v in a['points']],p[a['color']]))
 if fragile:
  nodes.append(line([(x+w*.53,y+h*.15),(x+w*.45,y+h*.4),(x+w*.54,y+h*.59),(x+w*.46,y+h*.85)],p['cap'],2.2,screen));nodes.append(line([(x+w*.45,y+h*.4),(x+w*.25,y+h*.48)],p['cap'],1.5,screen))
 for a,b in cap or []:nodes.append(line([a,b],p['cap'],R['contactEdgeWidth'],screen))
 rule=R['functionalOutline' if fragile else 'naturalOutline']
 out=[group(nodes,clip=clip_path(points),role='materialFill'),poly(points,'none',outline_color(p['ink'],p['face'],rule['inkWeight']),rule['width'],screen,role='materialOutline')]
 return group(out,role='solid',solidId=solid_id,collider=points,material='shared-breakable' if fragile else mat['name'])
def reflector(points,screen=False):
 p=S['reflector'];a,b=points[:2];dx,dy=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dy) or 1
 inner=[poly(points,p['body']),line([a,b],p['edge'],R['reflectiveEdgeWidth'],screen)]
 for k in range(1,4):
  t=k/4;x,y=a[0]+dx*t,a[1]+dy*t;inner.append(line([(x-dx/length*4,y-dy/length*4),(x-dy/length*4,y+dx/length*4)],p['marks'],1.3,screen))
 rule=R['functionalOutline']
 return group([group(inner,clip=clip_path(points)),poly(points,'none',outline_color('#344E51',p['body'],rule['inkWeight']),rule['width'],screen)],role='reflector',collider=points)
def bridge(points,hinge,screen=False):
 p=S['bridge'];a,b=points[:2]
 rule=R['functionalOutline'];ink=outline_color(p['ink'],p['body'],rule['inkWeight'])
 return group([poly(points,p['body'],ink,rule['width'],screen),line([a,b],p['contact'],R['bridgeContactWidth'],screen),ellipse(*hinge,7,7,p['hinge'],outline_color(p['ink'],p['hinge'],rule['inkWeight']),rule['width'])],role='bridge',collider=points)
def field_label(r):
 active=r.get('on',True) and r.get('strength',1)>0;k=r['kind'];d=r.get('direction',1);symbol='×' if not active else {'C':'≈','F':'→' if d>0 else '←','U':'↑','V':'↑','M':'↻' if d>0 else '↺'}[k]
 color=S['fieldKinds']['off' if not active else k+('+' if d>0 else '-') if k in ['M','F'] else k]
 label={'C':'減速雲','F':'風','U':'上昇気流','V':'噴気','M':'磁場'}[k]
 state='OFF' if not active else ('弱 ON' if (k=='M' and r.get('strength',1)<1) or (k=='F' and r.get('strength',.35)<.35) else 'ON')
 if k=='C':state+=' ×'+str(r.get('slow',.72))
 if k=='M':label+=' ＋' if d>0 else ' −'
 return label+' '+symbol+' '+state,color
def badge(x,y,label,color,width=None,unit=1):
 width=(width or max(64,len(label)*10+18))*unit
 return [rect(x-width/2,y-18*unit,width,26*unit,S['fieldKinds']['ink'],role='stateBadge',bounds=[x-width/2,y-18*unit,x+width/2,y+8*unit]),text(x-width/2+8*unit,y,label,13*unit,color,600)]
def region(r,unit=1,labels=True,label_bounds=None,occupied=None):
 def label_at(x,y,label,c):
  width=max(64,len(label)*10+18)*unit
  if label_bounds:
   left,top,right,bottom=label_bounds;x=max(left+width/2,min(right-width/2,x));y=max(top+18*unit,min(bottom-8*unit,y));desired=y
   def box(yy):return (x-width/2,yy-18*unit,x+width/2,yy+8*unit)
   def overlap(a,b):return a[0]<b[2]+3*unit and a[2]>b[0]-3*unit and a[1]<b[3]+3*unit and a[3]>b[1]-3*unit
   if occupied is not None:
    candidates=[desired]+[desired+sign*n*31*unit for n in range(1,9) for sign in [1,-1]]
    y=next((yy for yy in candidates if top+18*unit<=yy<=bottom-8*unit and not any(overlap(box(yy),b) for b in occupied)),desired);occupied.append(box(y))
  return badge(x,y,label,c,unit=unit)
 label,c=field_label(r)
 if r['kind']=='M':
  x,y,rad=r['x'],r['y'],r['radius'];d=f'M{x-rad} {y} A{rad} {rad} 0 0 1 {x} {y-rad} M{x} {y+rad} A{rad} {rad} 0 0 0 {x+rad} {y}'
  nodes=[path(d,'none','#304C58',R['fieldBorderWidth'],True),path(d,'none',c,R['fieldStateWidth'],True)];nodes+=label_at(x,y-rad-5*unit,label,c) if labels else []
 else:
  x1,x2,y1,y2=r['x1'],r['x2'],r['y1'],r['y2'];q=min(18,(x2-x1)/4,(y2-y1)/4)
  d=f'M{x1+q} {y1} H{x1} V{y1+q} M{x2-q} {y1} H{x2} V{y1+q} M{x1} {y2-q} V{y2} H{x1+q} M{x2-q} {y2} H{x2} V{y2-q}'
  nodes=[path(d,'none','#304C58',R['fieldBorderWidth'],True),path(d,'none',c,R['fieldStateWidth'],True)];nodes+=label_at((x1+x2)/2,y1-7*unit,label,c) if labels else []
 return group(nodes,role='field',sourceState={k:r.get(k) for k in ['kind','direction','on','strength']})
def terminal(x,y,mat,pending=False):
 p=S['terminal'];out=[solid([(x-23,y+18),(x+23,y+18),(x+23,y+30),(x-23,y+30)],mat),rect(x-17,y-14,34,33,p['body']),rect(x-12,y-8,24,20,p['display']),text(x-8,y+9,'＋',18,p['symbol'],600)]
 if pending:out+=badge(x,y-27,'次の手番 −','#FFD389',109)
 return group(out,role='terminal')
def map_art(row,style,width=1000,height=430):
 nodes=[rect(0,0,width,height,'#EDEBE3'),background(BG[style['id']],0,0,width,height)]
 world=row['world'];allp=[q for o in world['solids'] for q in o['poly']];miny=min(p['y'] for p in allp);maxy=max(p['y'] for p in allp);span=world.get('width',1000)
 scale=min((width-34)/span,(height-50)/max(100,maxy-miny));ox=(width-span*scale)/2;oy=height-14-maxy*scale
 fore=[];debug=[]
 for o in world['solids']:
  points=[(p['x'],p['y']) for p in o['poly']];debug.append(poly(points,'none','#F0D451',1.8,True))
  if o['kind'] in ['reflector','crystal']:fore.append(reflector(points,True));continue
  if o['kind']=='bridge':fore.append(bridge(points,(o['hinge']['x'],o['hinge']['y']),True));continue
  mat=style['materials']['terrain' if o['kind'] in ['floor','bedrock'] else 'structure'];caps=[]
  for f in world['surfaces']:
   if (f.get('solidId') or f['id'])!=o['id']:continue
   for a,b in zip(f['points'],f['points'][1:]):
    if abs(math.atan2(b['y']-a['y'],b['x']-a['x']))<=math.radians(70)+1e-7:caps.append([(a['x'],a['y']),(b['x'],b['y'])])
  fore.append(solid(points,mat,caps,o['kind']=='fragile',True,o['id']))
 bounds=[(8-ox)/scale,(8-oy)/scale,(width-8-ox)/scale,(height-8-oy)/scale];occupied=[]
 for r in world['regions']:fore.append(region(r,1/scale,labels=width>=600,label_bounds=bounds,occupied=occupied))
 for t in world['terminals']:fore.append(terminal(t['x'],t['y'],style['materials']['structure']))
 for i,u in enumerate(row['units']):
  # Layout markers only; never claim these are the actual character artwork.
  fore.extend([ellipse(u['x'],u['y']-10/scale,5/scale,5/scale,'#F5E4B8','#233D44',1.3),text(u['x']-10/scale,u['y']-21/scale,'自機' if i==0 else '敵',12/scale,'#243A43',600)])
 fore.append(group(debug,role='collisionOverlay'))
 nodes.append(group(fore,[scale,0,0,scale,ox,oy],role='foreground',pivot=[row['units'][0]['x'],row['units'][0]['y']]))
 return {'schema':'arcline.vector-art/v1','id':'map-'+row['id'],'width':width,'height':height,'backgroundColor':'#EDEBE3','sceneId':style['id'],'worldId':row['id'],'nodes':[group(nodes,clip=clip_path([(0,0),(width,0),(width,height),(0,height)]))]}
FORMS=[('地盤',[(0,70),(80,64),(143,67),(240,59),(300,62),(300,153),(0,153)],False),('斜面',[(0,123),(300,48),(300,153),(0,153)],False),('有限の足場',[(0,77),(68,54),(194,57),(286,85),(255,124),(61,135)],True),('固定壁',[(35,32),(229,32),(229,153),(35,153)],True),('天井・庇',[(0,45),(298,45),(298,87),(195,103),(116,82),(0,93)],True),('装置の基礎',[(17,77),(71,61),(229,61),(283,77),(273,133),(26,133)],True)]
def sheet(style,row):
 title=style['title'];nodes=[rect(0,0,1600,1350,'#F3F0E8'),text(48,42,'ARCLINE / COMPONENT COLLECTION  '+style['id'],16,'#756F67',600),text(48,88,title,34,'#313E40',600),text(48,119,style['materials']['materialStory'][:75],17,'#6C6863')]
 ma=map_art(row,style);nodes.append(translated(ma['nodes'],48,150));nodes+=[text(48,608,'現行マップ '+row['id']+'  /  '+row['name'],19,weight=600),text(48,635,'輪郭は現行データのまま。丸印は配置マーカー。実戦・実機の視認性は未検証。',14,'#756F68')]
 for k,name in enumerate(['terrain','structure']):
  mat=style['materials'][name];x,y=1082,150+k*242;nodes.append(rect(x,y,470,222,'#FBFAF5'));nodes+=wrap(x+20,y+30,mat['name'],23,18,'#36494A',600)
  for j,(key,c) in enumerate(mat['palette'].items()):nodes.append(rect(x+20+j*61,y+71,48,22,c))
  points=[(x+25,y+154),(x+100,y+116),(x+290,y+125),(x+418,y+156),(x+358,y+193),(x+67,y+195)]
  nodes.append(solid(points,mat));nodes.append(text(x+20,y+210,'通常地盤の材質' if k==0 else '固定棚・壁・支持材の材質',13,'#756F68'))
 for i,(label,pts,constructed) in enumerate(FORMS):
  x=48+i%3*512;y=680+i//3*236;mat=style['materials']['structure' if constructed else 'terrain'];nodes.append(rect(x,y,480,216,'#FBFAF5'));nodes.append(text(x+18,y+30,label,18,weight=600));nodes.append(translated([solid(pts,mat)],x+74,y+37))
 nodes.append(text(48,1172,'共通機能部品  /  色・記号・反射辺をテーマ間で共通化。取り付け先の材質を変える。',18,weight=600))
 sm=style['materials']['structure']
 for i,label in enumerate(['破壊材','反射面 W/K','橋 B','端子 T']):
  x=48+i*384;y=1192;nodes.append(rect(x,y,352,115,'#FBFAF5'));nodes.append(text(x+14,y+24,label,15,weight=600))
  if i==0:nodes.append(solid([(x+37,y+43),(x+281,y+43),(x+281,y+101),(x+37,y+101)],sm,fragile=True))
  if i==1:
   nodes.append(solid([(x+30,y+68),(x+320,y+68),(x+320,y+101),(x+30,y+101)],sm));nodes.append(reflector([(x+50,y+62),(x+302,y+62),(x+302,y+73),(x+50,y+73)]))
  if i==2:
   nodes.append(solid([(x+30,y+80),(x+67,y+80),(x+67,y+101),(x+30,y+101)],sm));nodes.append(bridge([(x+44,y+63),(x+310,y+63),(x+310,y+76),(x+44,y+76)],(x+44,y+69)))
  if i==3:nodes.append(terminal(x+174,y+68,sm))
 nodes.append(text(48,1331,'美術制作データ・ゲーム未統合。背景PR106参照。物理・配置・破壊単位・70度の接地条件を維持。',14,'#756F68'))
 return {'schema':'arcline.vector-art/v1','id':style['id'],'width':1600,'height':1350,'backgroundColor':'#F3F0E8','nodes':nodes}
def state_sheet():
 nodes=[rect(0,0,1600,1643,'#F3F0E8'),text(48,56,'ARCLINE / 共通機能部品と状態',33,weight=600),text(48,94,'全テーマで同じ定義を参照。状態・方向・極性は現行の実データを読む。',18,'#706B66')];mat=SCENES['normal-00']['materials']['structure']
 for j,label in enumerate(['破壊前','1単位除去','全除去']):
  x=48+j*512;nodes.append(rect(x,126,480,186,'#FBFAF5'));nodes.append(text(x+18,158,label,18,weight=600))
  for k in range(3):
   if j==2 or j==1 and k==1:continue
   a=x+47+k*126;nodes.append(solid([(a,180),(a+116,180),(a+116,275),(a,275)],mat,fragile=True))
 nodes.append(text(48,342,'亀裂は破壊材の共通意匠。新しい耐久段階を追加せず、実際の破壊単位を除去する。',16,'#706B66'))
 mechanics=[('反射面 W',[reflector([(25,77),(410,77),(410,91),(25,91)])]),('反射板 K',[reflector([(84,117),(329,41),(333,48),(88,124)])]),('橋 B：水平 / 開いた姿勢',[bridge([(25,89),(211,89),(211,102),(25,102)],(25,95)),bridge([(295,126),(325,35),(337,39),(307,130)],(300,128))])]
 for i,(label,children) in enumerate(mechanics):
  x=48+i*512;y=376;nodes.append(rect(x,y,480,187,'#FBFAF5'));nodes.append(text(x+18,y+29,label,18,weight=600));nodes.append(translated(children,x+20,y+28))
 examples=[({'kind':'C','direction':1,'on':True,'slow':.72},'C：減速雲'),({'kind':'F','direction':1,'on':True},'F：右へ'),({'kind':'F','direction':-1,'on':True},'F：左へ'),({'kind':'U','direction':1,'on':True},'U：上昇気流'),({'kind':'V','direction':1,'on':True},'V：噴気 ON'),({'kind':'V','direction':1,'on':False},'V：噴気 OFF'),({'kind':'M','direction':1,'on':True,'strength':1},'M：正極性'),({'kind':'M','direction':-1,'on':True,'strength':1},'M：負極性'),({'kind':'M','direction':1,'on':True,'strength':.5},'M：弱化'),({'kind':'M','direction':1,'on':True,'strength':0},'M：停止'),({'kind':'F','direction':1,'on':True,'strength':.18},'F：風の弱化'),({'kind':'F','direction':1,'on':True,'strength':0},'F：風の停止'),({'kind':'C','direction':1,'on':True,'slow':.85},'C：薄くなった雲')]
 for i,(r,title) in enumerate(examples):
  x=48+i%5*307;y=596+i//5*193;nodes.append(rect(x,y,278,171,'#FBFAF5'));nodes.append(text(x+16,y+29,title,16,weight=600));a={**r,'x':x+139,'y':y+105,'radius':43,'x1':x+42,'x2':x+237,'y1':y+80,'y2':y+145};nodes.append(region(a))
 nodes.append(rect(48,1193,736,204,'#FBFAF5'));nodes.append(text(70,1225,'T：現在の操作部と切り替え予約を分離',20,weight=600));nodes.append(terminal(220,1319,mat));nodes.append(terminal(576,1319,mat,True))
 nodes.append(rect(816,1193,736,204,'#FBFAF5'));nodes.append(text(838,1225,'重力スキル：既存の倍率表示',20,weight=600));nodes+=badge(1010,1313,'重力 ×0.5','#E6DCBA',166)+badge(1358,1313,'重力 ×2','#E6DCBA',166)
 nodes+=wrap(48,1453,'共通対象：W / K / B / C / F / U / V / M / T。風向き、磁場の正負、弱化・停止、次の手番の切り替え予約を混同しない。',68,18)
 nodes+=wrap(48,1541,'重力は既存スキルの表示見本で、新しいマップ領域ではない。デザインデータを状態や物理の正本にしない。',68,16)
 return {'schema':'arcline.vector-art/v1','id':'shared-states','width':1600,'height':1643,'backgroundColor':'#F3F0E8','nodes':nodes}
def overview(items,kind):
 cols=4 if kind=='normal' else 3 if kind=='boss' else 2;w=cols*440+48;h=112+math.ceil(len(items)/cols)*286;nodes=[rect(0,0,w,h,'#F3F0E8'),text(24,44,'ARCLINE / '+{'normal':'通常20テーマのコンポーネント','boss':'大ボス9景のコンポーネント','final':'最終4戦場のコンポーネント'}[kind],26,weight=600),text(24,76,'テーマ別の素材と配色・共通の機能部品 / 制作済み・デザイン確認待ち',15,'#6C6865')]
 for i,(style,row) in enumerate(items):
  x=24+i%cols*440;y=106+i//cols*286;ma=map_art(row,style,416,225);nodes.append(translated(ma['nodes'],x,y));nodes+=wrap(x,y+248,style['title'],27,15,'#304A4C',600)
 return {'schema':'arcline.vector-art/v1','id':'overview-'+kind,'width':w,'height':h,'backgroundColor':'#F3F0E8','nodes':nodes}
def outline_comparison(rows,maps):
 nodes=[rect(0,0,1600,1270,'#F3F0E8'),text(24,44,'ARCLINE / 輪郭の調整前・調整後',30,weight=600),text(24,78,'本体パレット・背景・形状は同一。外周線を本体色へ寄せ、足場の縁を細くする。',17,'#6C6865'),text(24,111,'前：外周1.4px / 接地辺4px',16,weight=600),text(824,111,'後：通常外周0.8px / 接地辺1.8px',16,weight=600)]
 for i,stage in enumerate(['4','61','59']):
  y=149+i*364;row=rows[stage];style=select(row['stage']);before=read('references/components-v1/'+stage+'.json');after=maps[stage]
  for x,graph in [(24,before),(824,after)]:
   nodes.append(text(x,y-12,style['title'],17,weight=600));nodes.append(group(graph['nodes'],[.752,0,0,.752,x,y]))
 nodes.append(text(24,1252,'反射辺と機能色は維持。暗い線で囲う表現から、素材の色面と控えめな輪郭で分ける表現へ。',15,'#6C6865'))
 return {'schema':'arcline.vector-art/v1','id':'outline-comparison','width':1600,'height':1270,'backgroundColor':'#F3F0E8','nodes':nodes}
def validate_inputs():
 sources=read('source-manifest.json')
 for ref in sources['references']:
  if hashlib.sha256((P/ref['file']).read_bytes()).hexdigest()!=ref['sha256']:raise ValueError('Reference changed: '+ref['file'])
 for ref in read('outline-reference.json')['maps']:
  if hashlib.sha256((P/ref['file']).read_bytes()).hexdigest()!=ref['sha256']:raise ValueError('Outline baseline changed: '+ref['file'])
 for kind in ['naturalOutline','functionalOutline']:
  assert 0<R[kind]['width']<=1 and 0<=R[kind]['inkWeight']<=1
 assert len(SCENES)==33 and len(W['worlds'])==103
 assert {s['themeIndex'] for s in SCENES.values() if s['kind']=='normal'}==set(range(20))
 assert len([s for s in SCENES.values() if s['kind']=='boss'])==9
 assert len([s for s in SCENES.values() if s['kind']=='final'])==4
 for s in SCENES.values():
  assert s['sharedRef']=='shared-materials.json'
  for key in ['terrain','structure']:
   a=s['materials'][key];assert {'face','shade','light','cap','ink'}<=a['palette'].keys()
   assert all(re.fullmatch('#[A-Fa-f0-9]{6}',v) for v in a['palette'].values())
   assert all(p['color'] in a['palette'] and all(len(v)==2 and all(0<=n<=1 for n in v) for v in p['points']) for p in a['planes'])
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args();validate_inputs();outputs={};maps={};graphs={};rows={r['id']:r for r in W['worlds']}
 for row in W['worlds']:
  style=select(row['stage'],row['mapIndex']);maps[row['id']]=map_art(row,style);outputs['maps/'+row['id']+'.json']=json.dumps(maps[row['id']],ensure_ascii=False,separators=(',',':'))
 for s in SCENES.values():
  row=rows['100-'+str(s['mapIndex']) if s['kind']=='final' else str(s['sampleStage'])];graphs[s['id']]=sheet(s,row)
 graphs['shared-states']=state_sheet()
 for kind in ['normal','boss','final']:
  items=[(s,rows['100-'+str(s['mapIndex']) if kind=='final' else str(s['sampleStage'])]) for s in SCENES.values() if s['kind']==kind];graphs['overview-'+kind]=overview(items,kind)
 graphs['outline-comparison']=outline_comparison(rows,maps)
 for name,graph in graphs.items():
  outputs['graphs/'+name+'.json']=json.dumps(graph,ensure_ascii=False,separators=(',',':'));outputs['svg/'+name+'.svg']=svg(graph)
 bundle={'manifest':M,'styles':SCENES,'renderStyle':R,'worlds':W['worlds'],'graphs':graphs,'maps':maps}
 outputs['collection.json']=json.dumps(bundle,ensure_ascii=False,separators=(',',':'))
 template=(P/'gallery.template.html').read_text();code=(P/'renderer.js').read_text();outputs['index.html']=template.replace('/* COMPONENT_RENDERER */',code).replace('/* COMPONENT_DATA */','const COLLECTION='+outputs['collection.json'].replace('</','<\\/')+';')
 changed=[]
 for name,value in outputs.items():
  target=P/name
  if args.check:
   if not target.exists() or target.read_text()!=value:changed.append(name)
  else:target.parent.mkdir(parents=True,exist_ok=True);target.write_text(value)
 if changed:raise SystemExit('OUT OF DATE: '+', '.join(changed))
 print('PASS: 33 theme sheets, common state sheet, 3 overviews, outline comparison, 103 map views; '+('generated output synchronized' if args.check else 'generated'))
if __name__=='__main__':main()
