"""Build an offline preview with the exact canonical identity, save decoder and Canvas fallback."""
from pathlib import Path
import re
from release import CONFIG
root=Path(__file__).resolve().parents[2];p=root/'characters/index.html';source=p.read_text();source=re.sub(r'v=0\.\d+\.\d+','v='+CONFIG['cacheVersion'],source);p.write_text(source)
def script(m):
 name=m.group(1);code=(root/'game/dist'/name).read_text();return '<script>\n'+code.replace('</script','<\\/script')+'\n</script>'
offline=re.sub(r'<script src="../game/dist/([^?"/]+)\?v=[^"]+"></script>',script,source)
offline=re.sub(r'(<script\b)',lambda m:'<script>globalThis.ArcOfflinePreview=true;</script>'+m[1],offline,count=1)
offline=re.sub(r'(<main\b[^>]*>)',lambda m:m[1]+'<p class="offline-art-label" style="margin:0;padding:8px 20px;background:#163b4b;color:#e5e9ce;font-size:13px">オフライン版：ゲーム内デザインで表示 / Offline: in-game designs</p>',offline,count=1)
assert 'globalThis.ArcOfflinePreview=true;' in offline
offline=re.sub(r'<link rel="stylesheet" href="../game/dist/cinematics.css\?v=[^"]+">',lambda m:'<style>\n'+(root/'game/dist/cinematics.css').read_text()+'\n</style>',offline)
offline=offline.replace('<title>ARCLINE — 10機のキャラ確認</title>','<title>ARCLINE 0.14.3 — 10機のキャラ確認（オフライン対応）</title>')
assert not re.search(r'<script[^>]+src=',offline)
(root/'characters/ARCLINE_Characters_Preview.html').write_text(offline)
print('Built canonical character UI and self-contained offline Canvas fallback')
