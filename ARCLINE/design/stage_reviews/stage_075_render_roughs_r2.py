"""Render Stage 075 direction sketches; never writes runtime or approved maps."""
import argparse
import html
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
FONT = '"Noto Sans CJK JP", "Noto Sans JP", sans-serif'
COLORS = dict(bg='#0c1424',card='#121f33',land='#343e5b',edge='#b7b7df',fixed='#546987',ore='#df9954',player='#75e0c4',enemy='#ff8e94',main='#83e9c7',alternate='#a5bcff',text='#e8eef9',muted='#a6b5cf')

def t(x,y,value,size=16,fill=None,weight=400):
    return f'<text x="{x:.2f}" y="{y:.2f}" font-size="{size}" fill="{fill or COLORS["text"]}" font-weight="{weight}">{html.escape(value)}</text>'

def svg(width,height,body,title):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc">
<title id="title">{html.escape(title)}</title><desc id="desc">75面の方向性レビュー用ラフ。全景と攻略意図を示す。破線は模式線で、実弾道・通行・勝利の検証結果ではない。</desc>
<defs><pattern id="ore" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#df9954"/><path d="M-2 2L2 -2M0 9L9 0M7 11L11 7" stroke="#986739" stroke-width="1.2"/></pattern>
<marker id="mainArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#83e9c7"/></marker>
<marker id="altArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#a5bcff"/></marker></defs>
<rect width="100%" height="100%" fill="{COLORS['bg']}"/><g font-family='{FONT}'>{body}</g></svg>'''

def line(points,scale,ox,base,**attrs):
    return '<polyline points="'+ ' '.join(f'{ox+x*scale:.2f},{base-h*scale:.2f}' for x,h in points)+'" '+ ' '.join(f'{k.replace("_","-")}="{v}"' for k,v in attrs.items())+'/>'

def polygon(points,scale,ox,base,fill,stroke,width=1.5):
    return '<polygon points="'+ ' '.join(f'{ox+x*scale:.2f},{base-h*scale:.2f}' for x,h in points)+f'" fill="{fill}" stroke="{stroke}" stroke-width="{width}" stroke-linejoin="round"/>'

def map_view(a,ox,base,scale,labels=False,arrows=False):
    out=[]
    floors=a.get('floors') or [a['floor']]
    for floor in floors:
        out.append(polygon([*floor,[floor[-1][0],-6],[floor[0][0],-6]],scale,ox,base,COLORS['land'],'none'))
        out.append(line(floor,scale,ox,base,fill='none',stroke=COLORS['edge'],stroke_width=1.5))
    for f in a.get('features',[]):
        v=f['v']; kind=f['type']
        if kind=='M':
            x,h,r,d=v
            out.append(f'<circle cx="{ox+x*scale:.2f}" cy="{base-h*scale:.2f}" r="{r*scale:.2f}" fill="#b69bea" fill-opacity=".10" stroke="#bba3ec" stroke-width="1.4" stroke-dasharray="6 5"/>')
            out.append(t(ox+x*scale-8,base-h*scale+6,'M',18,'#c7b0ef',700))
        elif kind in ('U','V','C','F'):
            x1,x2,h1,h2=v[:4]
            out.append(f'<rect x="{ox+x1*scale:.2f}" y="{base-h2*scale:.2f}" width="{(x2-x1)*scale:.2f}" height="{(h2-h1)*scale:.2f}" fill="#72c6dd" fill-opacity=".13" stroke="#72c6dd" stroke-dasharray="5 4"/>')
            out.append(t(ox+(x1+x2)/2*scale-4,base-(h1+h2)/2*scale,kind,13,'#91daeb'))
        elif kind=='W':
            out.append(line([[v[0],v[2]],[v[1],v[2]]],scale,ox,base,fill='none',stroke='#73ded2',stroke_width=3))
        elif kind=='K':
            import math
            x,h,angle=v[:3]; dx=5.5*math.cos(math.radians(angle));dh=-5.5*math.sin(math.radians(angle))
            out.append(line([[x-dx,h-dh],[x+dx,h+dh]],scale,ox,base,fill='none',stroke='#8be6e1',stroke_width=3))
    for p in a['parts']:
        if p.get('renderUnits'):
            polys=[v['poly'] for v in p['renderUnits']]
        else:
            polys=[p['poly']]
        for poly in polys:
            out.append(polygon(poly,scale,ox,base,'url(#ore)' if p.get('breakable') else COLORS['fixed'],'#f7c388' if p.get('breakable') else '#a7bfd4'))
    if arrows:
        for points in a.get('movement',[]):
            out.append(line([[x,h+1] for x,h in points],scale,ox,base,fill='none',stroke='#c1cedf',stroke_width=1.6,stroke_dasharray='2 7'))
        for shot in a.get('attacks',[]):
            main=shot['kind']=='main'
            out.append(line(shot['points'],scale,ox,base,fill='none',stroke=COLORS['main'] if main else COLORS['alternate'],stroke_width=2.5,stroke_dasharray='10 6',marker_end='url(#mainArrow)' if main else 'url(#altArrow)',stroke_linejoin='round'))
    for role in ['player','enemy']:
        p=a[role];x=ox+p['x']*scale;y=base-p['h']*scale;color=COLORS[role]
        if role=='enemy':
            facing=1 if a['player']['x']>p['x'] else -1
            out.append(f'<ellipse cx="{x:.2f}" cy="{y-2.4*scale:.2f}" rx="{3.5*scale:.2f}" ry="{2.6*scale:.2f}" fill="#623c50" stroke="{color}" stroke-width="2"/>')
            if a.get('stageNumber')==75 or a.get('id') in ('A','B'):
                ax=x+facing*3.4*scale;ay=y-4*scale
                out.append(f'<line x1="{x}" y1="{y-2*scale}" x2="{ax}" y2="{ay}" stroke="{color}" stroke-width="3"/><circle cx="{ax}" cy="{ay}" r="{1.8*scale}" fill="#ffdb99" stroke="#f29a79" stroke-width="1.4"/>')
            if labels:out.append(t(x-42,y+26,'中ボス',16,color,700))
        else:
            out.append(f'<rect x="{x-2.2*scale:.2f}" y="{y-3.5*scale:.2f}" width="{4.4*scale:.2f}" height="{2.7*scale:.2f}" rx="3" fill="#28564f" stroke="{color}" stroke-width="1.7"/>')
            out.append(line([[p['x']-2.3,p['h']+.4],[p['x']+2.3,p['h']+.4]],scale,ox,base,stroke=color,stroke_width=3))
            if labels:out.append(t(x-12,y+25,'P0',16,color,700))
    if labels:
        for anchor in a.get('anchors',[]):
            x=ox+anchor['x']*scale;y=base-anchor['h']*scale
            color=COLORS['main'] if (a['id']=='A' and anchor['id']=='C') or (a['id']=='B' and anchor['id']=='R') else COLORS['alternate']
            out.append(f'<circle cx="{x}" cy="{y-3*scale}" r="8" fill="{COLORS["card"]}" stroke="{color}" stroke-width="2"/>')
            out.append(t(x-5,y-3*scale+5,anchor['id'],13,color,700))
    return ''.join(out)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    source=json.loads((HERE/'stage_075_roughs_r2.json').read_text());a,b=source['candidates']
    out=[t(38,43,'ARCLINE 075  /  新しい地形骨格 2案',30,weight=700),t(40,76,'方向性レビュー用ラフ　｜　既存M・固定地形・独立破壊片　｜　破線は構想であり実弾道ではありません',17,COLORS['muted'])]
    for sketch,cy in [(a,101),(b,852)]:
        out.append(f'<rect x="24" y="{cy}" width="1552" height="728" rx="18" fill="{COLORS["card"]}" stroke="#2e415d"/>')
        out += [t(48,cy+36,f'{sketch["id"]}  {sketch["title"]}',27,weight=700),t(49,cy+66,sketch['label'],18,COLORS['muted'])]
        out.append(map_view(sketch,125,cy+626,7.5,True,True))
        if sketch['id']=='A':
            out += [t(755,cy+112,'F01：背面の岩盤につながる固定天井',16),t(840,cy+526,'D：鉱石遮蔽',17,'#f3c68e',700),t(120,cy+333,'R → M → 坑口 → Dの上',17,COLORS['alternate']),t(730,cy+575,'C → D開口後、腕へ横射',17,COLORS['main'])]
        else:
            out += [t(650,cy+120,'RからMへ。遮蔽を残して先に腕を狙う',17,COLORS['main']),t(958,cy+344,'F01：右岸に定着した固定斜桟橋',17),t(670,cy+587,'F02：坑底の橋脚',16),t(370,cy+245,'D：両側の低い射線を遮る',17,'#f3c68e',700),t(310,cy+494,'D開口後、Cから近射',17,COLORS['alternate'])]
        out.append(f'<rect x="25" y="{cy+650}" width="1550" height="67" fill="{COLORS["card"]}"/>')
        out += [t(48,cy+676,sketch['decision'],17),t(48,cy+705,'仮寸法・全景模式図。腕の位置は既存値を参照。移動・転移・弾道・反撃・24行動攻略は未検証。',15,COLORS['muted'])]
    out += [t(40,1621,'灰青＝固定地形・支持体　橙の斜線＝破壊可能な鉱石　P0＝開始　C/R＝射点候補　細い点線＝再配置の方向',16,COLORS['muted'])]
    products={'stage_075_roughs_r2.svg':svg(1600,1645,''.join(out),'ARCLINE 75面 新しい地形骨格ラフ A/B')}

    old=json.loads((HERE/'stage_075_proposal_v1.json').read_text())
    cells=[('75 A｜横穴の切羽',a,'天井下へ接近し、鉱石だけを開口'),('75 B｜斜桟橋と鉱石遮蔽',b,'腕の弱体化と開口の順を選ぶ'),('75 現行ゲーム｜参考',old['before'],'浅い谷と短い壁・M'),('75 PR #74 v1｜未承認の元案',old['after'],'水平梁の下と上を使う案')]
    approved=[(65,3,'火口・噴出と反射'),(66,4,'独立屋根・炉底と稜線'),(67,4,'S字山裾と逆向きの庇'),(69,2,'凹形退避島の中で位置を変える'),(71,5,'小型浮遊ブロックと4分割鉱脈'),(72,4,'断層越えと敵背面からの逆向き射撃')]
    for number,version,caption in approved:
        v=json.loads((HERE/f'stage_{number:03}_proposal_v{version}.json').read_text())
        cells.append((f'{number} v{version}｜設計承認済み',v['after'],caption))
    out=[t(35,42,'75面の新ラフと、元案・承認済み6面',29,weight=700),t(36,74,'同じ縮尺：1単位 = 2.7px　｜　新案は仮寸法、参照面は保存済み設計JSONの輪郭　｜　承認済み面は変更していません',16,COLORS['muted'])]
    for i,(title,data,caption) in enumerate(cells):
        col=i%2;row=i//2;x=24+col*788;y=99+row*354
        out.append(f'<rect x="{x}" y="{y}" width="764" height="336" rx="13" fill="{COLORS["card"]}" stroke="#2e415d"/>')
        out.append(t(x+18,y+29,title,21,weight=700))
        out.append(map_view(data,x+111,y+284,2.7,arrows=i<2))
        out.append(t(x+18,y+320,caption,16,COLORS['muted']))
    out.append(t(36,1893,'75 A：敵は坑内、屋根は恒久的な支持体。75 B：屋根のない固定斜桟橋、開口の順序を判断。旧75の上下二択から骨格を変更。',16))
    products['stage_075_roughs_context_r2.svg']=svg(1600,1920,''.join(out),'75面ラフと元案および承認済み6面の同縮尺比較')
    for name,content in products.items():
        path=HERE/name
        if args.check:
            assert path.read_text()==content+'\n', f'out of sync: {path.name}'
        else:path.write_text(content+'\n')
    if args.check:print('2 SVGs match source and protected reference JSONs')

if __name__=='__main__':main()
