"""Deterministic offline review package. Run after build and browser rendering."""
from pathlib import Path
import argparse,io,zipfile
P=Path(__file__).parent
def content():
 out=io.BytesIO()
 with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  for f in sorted(P.rglob('*')):
   if not f.is_file() or any(x.startswith('.') or x=='__pycache__' for x in f.relative_to(P).parts) or f.suffix=='.zip':continue
   info=zipfile.ZipInfo('ARCLINE_Component_Collection/'+f.relative_to(P).as_posix(),date_time=(2026,11,7,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,f.read_bytes(),compresslevel=9)
 return out.getvalue()
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args();data=content();target=P/'ARCLINE_Component_Collection.zip'
 if args.check:
  if not target.exists() or target.read_bytes()!=data:raise SystemExit('OUT OF DATE: review ZIP')
 else:target.write_bytes(data)
 with zipfile.ZipFile(io.BytesIO(data)) as z:
  assert z.testzip() is None
  print('PASS: '+str(len(z.namelist()))+' files in '+str(len(data))+'-byte deterministic review ZIP'+(' synchronized' if args.check else ' written'))
if __name__=='__main__':main()
