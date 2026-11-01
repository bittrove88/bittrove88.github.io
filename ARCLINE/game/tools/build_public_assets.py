"""Synchronize the offline character viewer from the shared production renderer."""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[2]
p=ROOT/'characters/index.html';s=p.read_text()
if '<script>(function(root)' in s or re.search(r'<script>\s*\(function\(root\)',s):
 s=re.sub(r'<script>\s*\(function\(root\)[\s\S]*?</script>', '<script src="../game/dist/visual-style.js?v=0.12.0"></script><script src="../game/dist/characters.js?v=0.12.0"></script>', s,count=1)
s=re.sub(r'v=0\.\d+\.\d+','v=0.12.0',s);p.write_text(s)
standalone=s
for name in ['visual-style.js','characters.js']:
 code=(ROOT/'game/dist'/name).read_text()
 standalone=re.sub(r'<script src="../game/dist/'+re.escape(name)+r'\?v=[^"]+"></script>',lambda m:'<script>\n'+code+'\n</script>',standalone)
standalone=standalone.replace('<title>ARCLINE — 10機のキャラ確認</title>','<title>ARCLINE 0.12 — 10機のキャラ確認（オフライン対応）</title>')
(ROOT/'characters/ARCLINE_Characters_Preview.html').write_text(standalone)
print('Shared online viewer and generated offline HTML synchronized')
