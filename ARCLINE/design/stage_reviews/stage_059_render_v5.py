import json, html
from pathlib import Path

D = Path(__file__).resolve().parent
p = json.loads((D / 'stage_059_proposal_v5.json').read_text())

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
        out += f'<polygon points="{points}" fill="#426f8c" stroke="#b7d7e8" stroke-width="1.5"/>'
    for f in v['features']:
        if f['type'] == 'F':
            x1, x2, h1, h2 = f['v']
            out += f'<rect x="{ox+x1*scale}" y="{base-h2*scale}" width="{(x2-x1)*scale}" height="{(h2-h1)*scale}" fill="#7cc9db" fill-opacity=".13" stroke="#8cd9e5" stroke-dasharray="5 5"/>'
        if f['type'] == 'W':
            # W follows the existing supported top; no independent floating plane.
            x1, x2 = f['v'][:2]
            for q in v['parts']:
                if q['id'] != '059-LOW-MIRROR':
                    continue
                for a, b in zip(q['poly'], q['poly'][1:] + q['poly'][:1]):
                    if b[0] <= a[0]:
                        continue
                    l, r = max(x1, a[0]), min(x2, b[0])
                    if r <= l:
                        continue
                    interp = lambda x: a[1] + (b[1]-a[1])*(x-a[0])/(b[0]-a[0])
                    out += line([[l, interp(l)], [r, interp(r)]], ox, base, scale, '#f5d27d', width=5)
    if paths:
        for q in v['transferSpaces']:
            out += line(q['points'], ox, base, scale, '#c4cfdf', '2 7')
        for q in v['attacks']:
            out += line(q['points'], ox, base, scale, '#b2c8ff' if q['kind'].startswith('crown') else '#86e3db', '8 7')
        for q in v['anchors'][1:]:
            out += f'<circle cx="{ox+q["x"]*scale}" cy="{base-q["h"]*scale-5}" r="5" fill="#a2e6f0"/>'
        for q in v['pickups']:
            x, y = ox+q['x']*scale, base-q['h']*scale
            out += f'<path d="M{x},{y-8}l8,8 -8,8 -8,-8Z" fill="#eed386"/>'
    for key, color in [('player', '#76e0c4'), ('enemy', '#ff9caa')]:
        q = v[key]
        out += f'<ellipse cx="{ox+q["x"]*scale}" cy="{base-q["h"]*scale-12}" rx="{max(9,scale*2.2)}" ry="12" fill="{color}"/>'
    return out

def svg(width, height, body, title):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="{html.escape(title)}"><title>{html.escape(title)}</title><rect width="100%" height="100%" fill="#101b2b"/><g font-family="Noto Sans CJK JP, sans-serif">{body}</g></svg>\n'

b = text(40, 46, 'ARCLINE 059 v5｜氷稜の上と鏡の下道', 30)
b += text(40, 82, 'F04の上面を射点に、下面下を下道にする。Wは氷稜の端の外へ。', 19, '#adc0d7')
b += scene(p['after'], 70, 930, 8.4, True)
labels = [
    (180, 510, 'P0：左岸の出撃棚', '#76e0c4'),
    (595, 285, 'A：F04上の平坦面130px', '#b2c8ff'),
    (570, 420, 'F04：中央の浮氷稜', '#dce8f5'),
    (480, 650, '谷底から下面まで330px以上', '#adc0d7'),
    (620, 750, 'B：下道からF03へ', '#86e3db'),
    (800, 690, 'W：F03の実体斜面', '#f5d27d'),
    (930, 325, 'F01：直射を切る西の氷背', '#dce8f5'),
    (1060, 420, 'enemy:gust', '#ff9caa'),
    (1080, 560, 'F02：右岸への氷根', '#adc0d7'),
    (345, 395, 'F ↔', '#8cd9e5'),
    (870, 540, 'F ↔', '#8cd9e5'),
    (330, 490, 'SK059（5手番）', '#eed386'),
]
for x, y, s, c in labels:
    b += text(x, y, s, 18, c)
b += text(40, 1000, '主攻略：F04上のAへ移り、風域の上方を主に通る弧で氷背を越す構想。', 20)
b += text(40, 1038, '別の選択：下道からBへ。Wに低く入射し、氷稜の端の外からF越しに跳ね上げる。', 19, '#86e3db')
b += text(40, 1076, '旧F05の高棚はF04上へ役割を統合。破壊なし。P0/Aの頭上は開放。', 18, '#adc0d7')
b += text(40, 1114, '両経路とも射撃位置で反撃を受ける。同手番の退避や、下道の安全を仮定しない。', 18, '#ffb6aa')
b += text(40, 1152, '破線は構想空間。実歩行・転移・W/F弾道・敵AI・16行動勝利は最後に一括検証。', 17, '#adc0d7')
(D / 'stage_059_full_v5.svg').write_text(svg(1600, 1190, b, p['name']))

b = text(40, 46, '59面：旧v2と新v5の同縮尺比較', 30)
b += text(40, 94, '旧案：谷底まで塞ぐF04と別の高棚', 22)
b += text(820, 94, '新案：F04上を射点に、下面下を下道に', 22)
b += scene(p['before'], 55, 590, 4.1)
b += scene(p['after'], 835, 590, 4.1)
b += text(40, 640, 'F04下の通路がなく、高い射点はF05へ分散', 17, '#adc0d7')
b += text(820, 640, '上面と下面の二つの使い方へ整理。WはF04の外', 17, '#adc0d7')
b += text(40, 700, 'v3/v4試作座標・旧入力の成功記録は転用しない。最低限の形状・全景確認のみ実施。', 18, '#adc0d7')
(D / 'stage_059_compare_v5.svg').write_text(svg(1600, 755, b, '59面の旧v2・新v5比較'))
