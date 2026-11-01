"""Build an offline preview with the exact canonical identity, save decoder and Canvas fallback."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[2];p=root/'characters/index.html';source=p.read_text();source=re.sub(r'v=0\.\d+\.\d+','v=0.14.1',source);p.write_text(source)
def script(m):
 name=m.group(1);code=(root/'game/dist'/name).read_text();return '<script>\n'+code.replace('</script','<\\/script')+'\n</script>'
offline=re.sub(r'<script src="../game/dist/([^?"/]+)\?v=[^"]+"></script>',script,source)
offline=re.sub(r'<link rel="stylesheet" href="../game/dist/cinematics.css\?v=[^"]+">',lambda m:'<style>\n'+(root/'game/dist/cinematics.css').read_text()+'\n</style>',offline)
offline=offline.replace('<title>ARCLINE — 10機のキャラ確認</title>','<title>ARCLINE 0.14 — 10機のキャラ確認（オフライン対応）</title>')
assert not re.search(r'<script[^>]+src=',offline)
(root/'characters/ARCLINE_Characters_Preview.html').write_text(offline)
print('Built canonical character UI and self-contained offline Canvas fallback')
