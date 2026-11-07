import json, html
from pathlib import Path

D = Path(__file__).resolve().parent
p = json.loads((D / 'stage_062_proposal_v2.json').read_text())

def text(x, y, content, size=18, color='#e4e4dc'):
    return f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}">{html.escape(content)}</text>'

def line(points, ox, base, scale, color, dash='', width=2.5):
    pts = ' '.join(f'{ox+x*scale},{base-h*scale}' for x, h in points)
    return f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="{width}" stroke-dasharray="{dash}"/>'

def scene(v, ox, base, scale, paths=False):
    out = ''
    for floor in v['floors']:
        pts = floor + [[floor[-1][0], -3], [floor[0][0], -3]]
        points = ' '.join(f'{ox+x*scale},{base-h*scale}' for x, h in pts)
        out += f'<polygon points="{points}" fill="#4c4b43"/>'
        out += line(floor, ox, base, scale, '#d1ccb7')
    for q in v['parts']:
        points = ' '.join(f'{ox+x*scale},{base-h*scale}' for x, h in q['poly'])
        out += f'<polygon points="{points}" fill="#777360" stroke="#d1ccb7" stroke-width="1.5"/>'
    if paths:
        for q in v['transferSpaces']:
            out += line(q['points'], ox, base, scale, '#bfc8d2', '2 7')
        for q in v['attacks']:
            out += line(q['points'], ox, base, scale, '#b2c8ff' if q['kind'].startswith('shoulder') else '#86e3db', '8 7')
        walk = [[x, h + .8] for x, h in v['walkingSpace']['surfacePoints']]
        out += line(walk, ox, base, scale, '#9de0bb', '5 4', 3)
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
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="{html.escape(title)}"><title>{html.escape(title)}</title><rect width="100%" height="100%" fill="#151e29"/><g font-family="Noto Sans CJK JP, sans-serif">{body}</g></svg>\n'

b = text(40, 46, 'ARCLINE 062 v2｜逆勾配の退避帯と庇の入口', 30)
b += text(40, 82, '長い山腹の肩を出入りする。R→Aは120px、射撃後の退避は次手番以降。', 19, '#b8c2cc')
b += scene(p['after'], 60, 860, 8.6, True)
labels = [
    (135, 315, 'P0：開始高所', '#76e0c4'),
    (302, 245, '試用W02（1手番）', '#eed386'),
    (545, 615, 'R：逆勾配の準備・退避帯', '#9de0bb'),
    (770, 565, 'A：肩上の射点', '#b2c8ff'),
    (665, 650, 'R↔A：120px／同手番の射撃後退避なし', '#b8c2cc'),
    (975, 712, 'B：麓の低い弧', '#86e3db'),
    (1170, 385, 'F01：右端で支える敵側の庇', '#e4e4dc'),
    (1120, 770, '床の低い岩背：直射を遮り、弧は上へ', '#d1ccb7'),
    (1280, 808, 'enemy:slate', '#ffadbd'),
]
for x, y, s, c in labels:
    b += text(x, y, s, 18, c)
b += text(40, 940, '主攻略：Rで準備し、肩上Aから庇下へ。近い肩の遮蔽と、開いた射出空間を選ぶ。', 20)
b += text(40, 978, '別の選択：麓Bへ移り、入口から床の岩背を越す低い弧を狙う。', 19, '#86e3db')
b += text(40, 1016, 'Aで撃った手番はAで反撃。Rへ戻る手番も通常の行動・反撃規則に従う。', 18, '#ffb6aa')
b += text(40, 1054, 'P0/R/A/Bの頭上は開放。破線は構想空間。低所や退避帯の安全性は未測定。', 18, '#b8c2cc')
b += text(40, 1092, '必要最低限の形状・データ・描画確認のみ。実動作・16行動勝利は最後に一括検証。', 17, '#b8c2cc')
(D / 'stage_062_full_v2.svg').write_text(svg(1600, 1130, b, p['name']))

b = text(40, 46, '62面：旧v1と新v2の同縮尺比較', 30)
b += text(40, 94, '旧案：下り続ける山腹、射点の高度と距離の違い', 21)
b += text(820, 94, '新案：逆勾配と肩上の出入り、庇下への二つの弧', 21)
b += scene(p['before'], 55, 590, 4.1)
b += scene(p['after'], 835, 590, 4.1)
b += text(40, 640, '中腹と麓への移動が射距離の違いへ寄っていた', 17, '#b8c2cc')
b += text(820, 640, '近い肩の遮蔽を使う準備位置と、射出位置を分ける', 17, '#b8c2cc')
b += text(40, 700, '長い山腹・庇・敵条件と既存W02を継承。実際の被弾・命中の比較は最後の一括検証へ。', 18, '#b8c2cc')
(D / 'stage_062_compare_v2.svg').write_text(svg(1600, 755, b, '62面の旧v1・新v2比較'))
