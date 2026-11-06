"""Render the selected Stage 75 A design and its destruction comparison."""
import argparse
import copy
import json
from pathlib import Path

from stage_075_render_roughs_r2 import COLORS, line, map_view, svg, t

HERE=Path(__file__).resolve().parent

def document(width,height,body,title):
    return svg(width,height,body,title).replace('75面の方向性レビュー用ラフ。全景と攻略意図を示す。','75面A案の詳細設計図。固定地形と一時防御ブロックの役割を示す。')

def direct_reference(a,ox,base,scale):
    p=a['player'];e=a['enemy'];origin=[p['x'],p['h']+3];target=[e['x']-3.4,e['h']+4]
    return line([origin,target],scale,ox,base,fill='none',stroke='#ee8f9c',stroke_width=1.8,stroke_dasharray='3 5',opacity='.78')

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    proposal=json.loads((HERE/'stage_075_proposal_v4.json').read_text());a=proposal['after']
    old=json.loads((HERE/'stage_075_roughs_r2.json').read_text())['candidates'][0]
    removed=copy.deepcopy(a);removed['parts']=[p for p in removed['parts'] if not p['breakable']]

    out=[t(38,44,'ARCLINE 075 A v4  /  岩肩を越えて入る、横穴の切羽',29,weight=700),t(40,78,'Aの方向性を採用した詳細設計候補　｜　直射の制御＝固定岩肩　　一時防御＝D　｜　設計承認待ち・動作未検証',17,COLORS['muted'])]
    out.append(f'<rect x="24" y="101" width="1552" height="790" rx="18" fill="{COLORS["card"]}" stroke="#2e415d"/>')
    out += [t(48,139,'Dを残した状態で、両方の攻略を計画',25,weight=700),t(49,171,'主：岩肩を越えてCへ入り、Dの上を越し撃ち　／　別解：坑外RからMを経て坑口へ通す',18,COLORS['muted'])]
    out.append(map_view(a,125,780,7.5,True,True));out.append(direct_reference(a,125,780,7.5))
    out += [t(780,245,'F01：背面の岩盤に接続する固定天井',17),t(515,681,'固定の岩肩',20,'#d5dcf0',700),t(287,712,'破壊後も坑外からの直線を遮る',17,'#eea5b1'),t(880,710,'D：一時的な防御',18,'#f3c68e',700),t(1040,462,'CからDを残して越し撃ち',17,COLORS['main']),t(228,320,'R → M → 岩肩の上 → 坑口',17,COLORS['alternate'])]
    out.append(f'<rect x="25" y="839" width="1550" height="42" fill="{COLORS["card"]}"/>')
    out.append(t(48,865,'Dの破壊は攻略の前提にしない。固定の岩肩を越えるか、Mを経由するかという判断が残る。',18))
    out += [t(40,924,'灰紫＝固定床　灰青＝固定天井　橙の斜線＝一時防御D　赤い点線＝P0から敵への比較用直線',16,COLORS['muted']),t(40,951,'緑・青の破線は攻略の模式線。実弾道、実移動、反撃への防御効果、24行動勝利は未検証。',16,COLORS['muted'])]
    products={'stage_075_full_v4.svg':document(1600,980,''.join(out),'75面A v4 岩肩と一時防御の役割を分けた全景')}

    out=[t(37,43,'75面A：元ラフと、修正版のDあり／Dなし',29,weight=700),t(38,77,'すべて同じ縮尺。Dを除去しても床・天井・P0・敵・Mの位置は同一。赤点線は弾道ではなく比較用の直線。',17,COLORS['muted'])]
    cells=[('元ラフA r2｜履歴',old,'浅い床のままDに直線遮断を任せていた。今回、この役割を見直した。'),('修正版A v4｜Dを温存',a,'固定岩肩が坑外の直射を遮る。DはCの前方にある一時防御。破壊は不要。'),('修正版A v4｜Dをすべて除去',removed,'岩肩・天井・坑口は残る。Dがなくても、P0/Rから敵への代表直線は固定床が遮る。')]
    for i,(title,view,caption) in enumerate(cells):
        cy=105+i*622
        out.append(f'<rect x="24" y="{cy}" width="1552" height="601" rx="15" fill="{COLORS["card"]}" stroke="#2e415d"/>')
        out.append(t(47,cy+36,title,25,weight=700))
        out.append(map_view(view,270,cy+510,5.4,arrows=True))
        if i:out.append(direct_reference(view,270,cy+510,5.4))
        out.append(f'<rect x="25" y="{cy+550}" width="1550" height="40" fill="{COLORS["card"]}"/>')
        out.append(t(48,cy+579,caption,18))
    out.append(t(40,2018,'Dの有無は防御の持続を変える。坑外から攻める際の固定地形の課題と、坑内への接近判断は消えない。',18))
    products['stage_075_compare_r2_v4.svg']=document(1600,2050,''.join(out),'75面A 元ラフと詳細設計DありDなしの同縮尺比較')

    old75=json.loads((HERE/'stage_075_proposal_v1.json').read_text())
    cells=[('75 A v4｜今回の設計候補',a,'固定岩肩と採掘斜面／Dは一時防御'),('75 PR #74 v1｜未承認の元案',old75['after'],'長い水平梁の下と上を使う案')]
    for n,v,caption in [(65,3,'火口・噴出と反射'),(66,4,'独立屋根・炉底と稜線'),(67,4,'S字山裾と逆向きの庇'),(69,2,'凹形退避島'),(71,5,'小型浮遊ブロックと4分割鉱脈'),(72,4,'断層越えと逆向き射撃')]:
        data=json.loads((HERE/f'stage_{n:03}_proposal_v{v}.json').read_text())
        cells.append((f'{n} v{v}｜設計承認済み',data['after'],caption))
    out=[t(37,43,'75面A v4：元案・承認済み6面との比較',29,weight=700),t(38,77,'同じ縮尺。承認版のJSONから輪郭を再描画。既承認の地形・配置は変更していません。',17,COLORS['muted'])]
    for i,(title,view,caption) in enumerate(cells):
        x=24+(i%2)*788;cy=103+(i//2)*354
        out.append(f'<rect x="{x}" y="{cy}" width="764" height="336" rx="13" fill="{COLORS["card"]}" stroke="#2e415d"/>')
        out.append(t(x+18,cy+29,title,21,weight=700));out.append(map_view(view,x+111,cy+284,2.7,arrows=i==0));out.append(t(x+18,cy+320,caption,16,COLORS['muted']))
    products['stage_075_diversity_v4.svg']=document(1600,1530,''.join(out),'75面A v4と元案および承認済み6面の同縮尺比較')
    for name,content in products.items():
        if args.check:assert (HERE/name).read_text()==content+'\n',name+' out of sync'
        else:(HERE/name).write_text(content+'\n')
    print('3 v4 SVGs '+('match their sources' if args.check else 'generated'))

if __name__=='__main__':main()
