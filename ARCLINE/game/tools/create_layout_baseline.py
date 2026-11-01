"""Extract a review baseline outside Git without creating another repository."""
from pathlib import Path
import argparse,subprocess,tarfile,io,json
ROOT=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);a=p.parse_args();out=a.output.resolve()
assert not out.is_relative_to(ROOT.parent),'Baseline must stay outside Git'
config=json.loads((ROOT/'game/tests/layout-baseline.json').read_text())
blob=subprocess.check_output(['git','archive',config['commit'],'ARCLINE/game/dist'],cwd=ROOT.parent)
out.mkdir(parents=True,exist_ok=True)
with tarfile.open(fileobj=io.BytesIO(blob)) as archive:archive.extractall(out,filter='data')
assets=out/'ARCLINE/assets'
if not assets.exists():assets.symlink_to(ROOT/'assets',target_is_directory=True)
print('Baseline',config['commit'],'->',out)
