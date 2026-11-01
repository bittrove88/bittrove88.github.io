"""Rebuild twice in a temporary tree; leave source and production files untouched."""
from pathlib import Path
import argparse,hashlib,json,shutil,tempfile
from release import ROOT
from generation import OUTPUTS,rebuild
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);args=p.parse_args()
def snapshot(root):return {n:hashlib.sha256((root/n).read_bytes()).hexdigest() for n in OUTPUTS}
before=snapshot(ROOT)
with tempfile.TemporaryDirectory(prefix='arcline-generated-') as temporary:
    isolated=Path(temporary)/'ARCLINE'
    shutil.copytree(ROOT,isolated,ignore=shutil.ignore_patterns('node_modules','.git','.cache','__pycache__','evidence','ARCLINE_Codex_Transfer_*.zip'))
    rebuild(isolated,ROOT.parent);after=snapshot(isolated)
    rebuild(isolated,ROOT.parent);second=snapshot(isolated)
changed=[n for n in OUTPUTS if before[n]!=after[n]]
unstable=[n for n in OUTPUTS if after[n]!=second[n]]
assert snapshot(ROOT)==before,'Check modified the source tree'
report={'status':'FAIL' if changed or unstable else 'PASS','generatedFiles':len(OUTPUTS),'changedAfterRebuild':changed,'unstableAfterSecondRebuild':unstable,'sourceTreeUntouched':True,'sha256':after,'scope':'Two isolated regenerations,canonical UI/style/release resources,data,previews and guides; original production tree unchanged.'}
args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(report,indent=2)+'\n')
print(report['status'],len(OUTPUTS),'generated files',changed,unstable)
if changed or unstable:raise SystemExit(1)
