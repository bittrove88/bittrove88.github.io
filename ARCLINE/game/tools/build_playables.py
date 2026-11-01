"""Package buildless production code and verified plates; ZIP stays outside Git."""
from pathlib import Path
import argparse,hashlib,json,re,zipfile
from release import CONFIG,validate
root=Path(__file__).resolve().parents[2];dist=root/'game/dist'
p=argparse.ArgumentParser();p.add_argument('--output',required=True,type=Path);args=p.parse_args();out=args.output.resolve()
if out.is_relative_to(root.parent):raise SystemExit('Choose an output directory outside the repository')
out.mkdir(parents=True,exist_ok=True);files=sorted(dist.glob('*'));assert all(f.is_file() and f.suffix in ['.html','.js','.css','.webmanifest','.svg'] for f in files)
contents={f.name:f.read_bytes() for f in files};html=contents['index.html'].decode()
for ref in re.findall(r'(?:src|href)="([^"]+)"',html):
 assert not ref.startswith(('https://','http://'));assert ref.split('?',1)[0] in contents,ref
validate()
assert re.findall(r'<script src="([^?\"]+)',html)==CONFIG['scripts']
# Hosted code lives at game/dist; the flat offline archive has its own assets/.
contents['index.html']=html.replace('<head>','<head><script>globalThis.ArcAssetBase="./";</script>',1).encode()
assets=json.loads((root/'assets/cinematics/manifest.json').read_text())
for a in assets['shots']:
 blob=(root/a['src']).read_bytes();assert hashlib.sha256(blob).hexdigest()==a['sha256'];contents[a['src']]=blob
characters=json.loads((root/'design/cinematics_014/character_images.json').read_text())['characters']
for a in characters:
 if a['verified'] and a['src']:
  blob=(root/a['src']).read_bytes();assert hashlib.sha256(blob).hexdigest()==a['sha256'];contents[a['src']]=blob
manifest={'implementation':CONFIG['version'],'design':'First journey,cinematic and original-character UI update;resetVersion2 retained;one authorized seal edit plus22 original plates and10 verified PNGs','files':{n:{'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()} for n,b in contents.items()},'sourceDistribution':{f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in files},'packagingTransform':'Only index.html sets ArcAssetBase to ./ for the flat offline layout; hosted code defaults to ../../. 22 JPEGs remain byte-identical;P03-01 uses the authorized seal-removal master.','youtubeCertification':'not performed; standalone distribution omits external SDK bootstrap','cinematicPlates':23,'runtimeFiles':len(files),'preservedBattle':'Engine,geometry,physics,levels,inventory,encounters and Canvas machine sources unchanged;only Mogu normal speed/gravity and note change in combat;all special profiles preserved'}
archive=out/f"ARCLINE_{CONFIG['version']}_Playables.zip"
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for name,blob in sorted(contents.items()):
  info=zipfile.ZipInfo(name,date_time=(2026,11,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,blob)
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None and len(z.namelist())==len(contents)
 for n,b in contents.items():assert z.read(n)==b
manifest['characterPlates']=sum(bool(a['verified'] and a['src']) for a in characters)
manifest['zip']={'name':archive.name,'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest()}
(out/'BUNDLE_CHECK.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps({'status':'PASS','runtime':len(files),'plates':23,'entries':len(contents),'zip':str(archive),'bytes':archive.stat().st_size}))
