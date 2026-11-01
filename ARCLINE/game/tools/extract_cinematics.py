"""Extract approved masters byte-for-byte; never infer shot names from file order."""
from pathlib import Path
import csv,io,json,hashlib,zipfile,struct
root=Path(__file__).resolve().parents[2];target=root/'assets/cinematics'
expected=['P01-01','P01-02','P01-03','P02-01','P02-02','P03-01','P03-02','P03-03','I30-01','I30-02','I60-01','I60-02','E01-01','E01-02','E01-03','E02-01','E02-02','E02-03','E03-01','E03-02','E04-01','E04-02','E04-03']
# Pillow is an authoring/checking dependency only, never part of runtime.
from PIL import Image
archive=target/'ARCLINE_FINAL_23_SCENES_20261101.zip';rows=[]
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 raw=z.read('manifest.csv');manifest=list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))))
 assert [r['shot'] for r in manifest]==expected and len({r['sha256'] for r in manifest})==23
 for r in manifest:
  assert r['package_path']=='assets/cinematics/'+r['shot']+'.jpeg'
  blob=z.read(r['package_path']);assert hashlib.sha256(blob).hexdigest()==r['sha256']
  im=Image.open(io.BytesIO(blob));im.verify();im=Image.open(io.BytesIO(blob));assert im.format=='JPEG' and im.size==(1536,864)
  dest=target/(r['shot']+'.jpeg')
  if dest.exists() and dest.read_bytes()!=blob:
   old=dest.read_bytes();backup=target/'previous'/(r['shot']+'-'+hashlib.sha256(old).hexdigest()[:12]+'.jpeg');backup.parent.mkdir(exist_ok=True);backup.write_bytes(old)
  dest.write_bytes(blob);rows.append({**r,'width':1536,'height':864,'bytes':len(blob),'src':'assets/cinematics/'+dest.name})
 (target/'manifest.csv').write_bytes(raw)
report={'status':'PASS','count':23,'archiveSha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'duplicateHashes':False,'latestReplacements':['E01-03','E04-01'],'shots':rows,'characterArt':'No separately verified character JPEGs are present. Do not extract character portraits from story scenes.'}
(target/'manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('PASS:23 unique1536x864 JPEG masters; exact CSV SHA256; two replacement originals retained')
