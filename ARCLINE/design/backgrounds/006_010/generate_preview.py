"""Regenerate SVG and embedded preview data/code from the local sources.

Run: python3 generate_preview.py
Standard library only. PNG is an optional Canvas export, not a runtime asset.
"""
from pathlib import Path
import html
import json
import re

root = Path(__file__).resolve().parent
scene = json.loads((root / 'mirror_cliffs.json').read_text())
renderer = (root / 'mirror_cliffs_canvas.js').read_text()
assert scene['schema'] == 'arcline.colorfield-background/v2'
assert scene['themeIndex'] == 1 and scene['stageRange'] == [6, 10]
assert all(re.fullmatch(r'#[0-9A-Fa-f]{6}', c) for c in scene['palette'].values())
assert len({s['id'] for s in scene['shapes']}) == len(scene['shapes'])
assert all(s['layer'] in scene['layerOrder'] for s in scene['shapes'])
svg = ['<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="604" viewBox="0 0 1120 604" role="img" aria-labelledby="title desc">',
       '<title id="title">鏡の岸壁 — 6〜10面 共通背景</title>',
       '<desc id="desc">淡い石灰岩の岸壁と海食アーチが青緑の静かな水面に映る。単色の不透明な色面による背景デザイン。デザイン確認待ち・ゲーム未統合。</desc>']
for layer in scene['layerOrder']:
    svg.append(f'<g id="{html.escape(layer, quote=True)}">')
    for shape in scene['shapes']:
        if shape['layer'] != layer:
            continue
        assert shape['kind'] == 'path'
        ident = html.escape(shape['id'], quote=True)
        path = html.escape(shape['d'], quote=True)
        fill = scene['palette'][shape['fill']]
        svg.append(f'<path id="{ident}" fill="{fill}" d="{path}"/>')
    svg.append('</g>')
svg.append('</svg>')
(root / 'mirror_cliffs.svg').write_text('\n'.join(svg) + '\n')
preview_path = root / 'mirror_cliffs_preview.html'
preview = preview_path.read_text()
for ident, source in [('scene-data', json.dumps(scene, ensure_ascii=False, indent=2)),
                       ('background-renderer', renderer)]:
    pattern = rf'(<script id="{ident}"[^>]*>)[\s\S]*?(</script>)'
    assert '</script' not in source.lower()
    preview, count = re.subn(pattern, lambda m: m[1] + source + m[2], preview)
    assert count == 1, f'Expected exactly one {ident} script'
preview_path.write_text(preview)
print(f"Generated SVG / HTML: {len(scene['shapes'])} shapes, {len(scene['layerOrder'])} layers")
