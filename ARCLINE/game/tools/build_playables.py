"""Package buildless production files. Never writes a ZIP into the repository."""
from pathlib import Path
import argparse,hashlib,json,re,zipfile
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--output',required=True,type=Path);args=p.parse_args()
out=args.output.resolve()
if out.is_relative_to(ROOT.parents[1]):raise SystemExit('Choose an output directory outside the repository')
out.mkdir(parents=True,exist_ok=True)
files=sorted((ROOT/'dist').glob('*'))
assert all(x.is_file() and x.suffix in ['.html','.js','.css','.webmanifest','.svg'] for x in files)
html=(ROOT/'dist/index.html').read_text()
for ref in re.findall(r'(?:src|href)="([^"]+)"',html):
 assert not ref.startswith(('https://','http://')), 'Standalone files must use local assets'
 assert (ROOT/'dist'/ref.split('?',1)[0]).is_file(),ref
assert not re.search(r'<script[^>]+src=[\"\']https?://',html)
assert html.index('src="engine.js')<html.index('src="lessons.js')<html.index('src="preview.js')<html.index('src="game.js')
manifest={'implementation':'0.7.1','design':'4.1 integrated finite-terrain campaign; ten matte machine appearances','files':{f.name:{'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in files},'youtubeCertification':'not performed; standalone distribution omits external SDK bootstrap'}
zip_path=out/'ARCLINE_0.7.1_Playables.zip'
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED) as z:
 for f in files:
  info=zipfile.ZipInfo(f.name,date_time=(2026,10,31,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,f.read_bytes())
with zipfile.ZipFile(zip_path) as z:
 assert z.testzip() is None and 'index.html' in z.namelist()
 for name,x in manifest['files'].items():assert hashlib.sha256(z.read(name)).hexdigest()==x['sha256']
manifest['zip']={'name':zip_path.name,'bytes':zip_path.stat().st_size,'sha256':hashlib.sha256(zip_path.read_bytes()).hexdigest()}
(out/'BUNDLE_CHECK.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'status':'PASS','files':len(files),'zip':str(zip_path),'bytes':zip_path.stat().st_size}))
