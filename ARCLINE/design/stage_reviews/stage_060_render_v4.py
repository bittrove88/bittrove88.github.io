import json, html
from pathlib import Path

D = Path(__file__).resolve().parent
p = json.loads((D / 'stage_060_proposal_v4.json').read_text())

def text(x, y, content, size=18, color='#dce8f5'):
    return f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}">{html.escape(content)}</text>'

def line(points, ox, base, scale, color, dash='', width=2.5):
    pts = ' '.join(f'{ox+x*scale},{base-h*scale}' for x, h in points)
    return f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="{width}" stroke-dasharray="{dash}"/>'

def scene(v, ox, base, scale, paths=False):
    out = ''
    for floor in v['floors']:
        pts = floor + [[floor[-1][0], -3], [floor[0][0], -3]]
        points = ' '.join(f'{ox+x*scale},{base-h*scale}' for x, h in pts)
        out += f'<polygon points="{points}" fill="#314f68"/>'
        out += line(floor, ox, base, scale, '#afdaea')
    for q in v['parts']:
        points = ' '.join(f'{ox+x*scale},{base-h*scale}' for x, h in q['poly'])
        color = '#b39468' if q['breakable'] else '#426f8c'
        out += f'<polygon points="{points}" fill="{color}" stroke="#b7d7e8" stroke-width="1.5"/>'
    for f in v['features']:
        x1, x2, h1, h2 = f['v']
        out += f'<rect x="{ox+x1*scale}" y="{base-h2*scale}" width="{(x2-x1)*scale}" height="{(h2-h1)*scale}" fill="#7cc9db" fill-opacity=".13" stroke="#8cd9e5" stroke-dasharray="5 5"/>'
    if paths:
        for q in v['transferSpaces']:
            out += line(q['points'], ox, base, scale, '#c4cfdf', '2 7')
        for q in v['attacks']:
            out += line(q['points'], ox, base, scale, '#b2c8ff' if q['kind'].startswith('high') else '#86e3db', '8 7')
        for q in v['anchors'][1:]:
            out += f'<circle cx="{ox+q["x"]*scale}" cy="{base-q["h"]*scale-5}" r="5" fill="#a2e6f0"/>'
        out += line([[80, 3], [94, 3]], ox, base, scale, '#86e3db', '5 4', 2)
    q = v['player']
    out += f'<ellipse cx="{ox+q["x"]*scale}" cy="{base-q["h"]*scale-12}" rx="{max(9,scale*2.2)}" ry="12" fill="#76e0c4"/>'
    q = v['enemy']
    out += f'<ellipse cx="{ox+q["x"]*scale}" cy="{base-(q["h"]+3.3)*scale}" rx="{6.6*scale}" ry="{3.2*scale}" fill="#dd91a7"/>'
    out += f'<circle cx="{ox+q["x"]*scale}" cy="{base-(q["h"]+4.3)*scale}" r="{2.2*scale}" fill="#f0d3df"/>'
    for target in v['targets']:
        out += f'<circle cx="{ox+target["x"]*scale}" cy="{base-target["h"]*scale}" r="{2.3*scale}" fill="#f4acbd" stroke="#ffdeea" stroke-width="1.5"/>'
    return out

def svg(width, height, body, title):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="{html.escape(title)}"><title>{html.escape(title)}</title><rect width="100%" height="100%" fill="#101b2b"/><g font-family="Noto Sans CJK JP, sans-serif">{body}</g></svg>\n'

b = text(40, 46, 'ARCLINE 060 v4｜双送風機と風陰の出口', 30)
b += text(40, 82, '高所はすぐに攻め、低所は氷片を残すか開いて進む。頭上の開いた出口へ整える。', 19, '#adc0d7')
b += scene(p['after'], 80, 950, 7.8, True)
labels = [
    (120, 390, 'P0：開始高所', '#76e0c4'),
    (425, 600, 'F01：短くした西氷壁の返し', '#adc0d7'),
    (530, 898, 'B：低い準備位置', '#86e3db'),
    (810, 898, 'C：頭上の開いた出口', '#86e3db'),
    (648, 732, 'D03：前面の独立氷片', '#f1d097'),
    (698, 950, 'B→C：140px（D03開口後・次手番）', '#adc0d7'),
    (940, 340, 'D04：任意の角度改善', '#f1d097'),
    (965, 655, 'F02：固定氷肩とボス棚', '#adc0d7'),
    (1155, 535, 'WHITEHOWL', '#ffadbd'),
    (1120, 410, 'FAN A / FAN B', '#ffadbd'),
    (470, 330, 'F ↔：送風機破壊で弱体化', '#8cd9e5'),
]
for x, y, s, c in labels:
    b += text(x, y, s, 18, c)
b += text(40, 1010, '高所：P0からすぐに氷肩を越してFANを狙う構想。風と反撃を受け入れる。', 20)
b += text(40, 1048, '低所：BでD03を残して準備。開けた場合は次手番に140px先のCへ進み、撃ち上げる。', 19, '#86e3db')
b += text(40, 1086, 'D03破壊直後はBで反撃。D04は任意破壊で、風を弱めるのはボスの送風機だけ。', 18, '#ffb6aa')
b += text(40, 1124, 'P0/B/Cの頭上は開放。低所の安全性・命中・必要手数は未測定。既存の24行動を維持。', 18, '#adc0d7')
b += text(40, 1162, '破線は構想空間。最低限の整合・形状・描画のみ確認。実移動・弾道・ボス戦は一括検証へ。', 17, '#adc0d7')
(D / 'stage_060_full_v4.svg').write_text(svg(1600, 1200, b, p['name']))

b = text(40, 46, '60面：旧v3と新v4の同縮尺比較', 30)
b += text(40, 94, '旧案：長い返しと狭い出口、送風機前の覆い', 21)
b += text(820, 94, '新案：頭上を開け、前面氷片と固定氷肩を分ける', 21)
b += scene(p['before'], 55, 590, 3.8)
b += scene(p['after'], 835, 590, 3.8)
b += text(40, 640, '低い射点を置くだけでは移動の得失が弱かった', 17, '#adc0d7')
b += text(820, 640, 'Bでの遮蔽保持／開口と、Cでの反撃を区別', 17, '#adc0d7')
b += text(40, 700, 'U字形の峡谷断面と既存Whitehowlを継承。旧試験記録は新形状の成功証拠に転用しない。', 18, '#adc0d7')
(D / 'stage_060_compare_v4.svg').write_text(svg(1600, 755, b, '60面の旧v3・新v4比較'))
