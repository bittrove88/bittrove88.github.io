"""Rebuild authored outputs twice without changing committed native-test evidence."""
from pathlib import Path
import argparse,json,hashlib,subprocess
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);a=p.parse_args()
root=Path(__file__).resolve().parents[2];tools=root/'game/tools'
names=['game/dist/cinematic-data.js','assets/cinematics/manifest.json','assets/cinematics/manifest.csv','game/dist/crew.js','game/dist/levels.js','game/dist/lessons.js','game/dist/story.js','characters/index.html','characters/ARCLINE_Characters_Preview.html','site/scenes.js','design/runtime_campaign_20x5.json','design/preview_curriculum.json','design/expedition_013/stage_design.json','design/expedition_013/index.html','design/expedition_013/STAGES_JA.md','design/expedition_013/STORY_JA.md','design/expedition_013/CREW_STORY.md']
def snapshot():return {n:hashlib.sha256((root/n).read_bytes()).hexdigest() for n in names}
def rebuild():
    for name in ['extract_cinematics.py','build_cinematic_data.py','build_crew.py','build_campaign.py','build_levels.py','build_lessons.py','build_story.py','build_public_assets.py','export_expedition_story.py','build_stage_guide.py']:subprocess.run(['python3',str(tools/name)],check=True,stdout=subprocess.DEVNULL)
    subprocess.run(['node',str(tools/'build_site_scenes.cjs')],check=True,stdout=subprocess.DEVNULL)
before=snapshot();rebuild();after=snapshot();changed=[n for n in names if before[n]!=after[n]]
report={'status':'FAIL' if changed else 'PASS','generatedFiles':len(names),'changedAfterRebuild':changed,'sha256':after,'scope':'Rebuilt17 outputs from authored crew,stage,lesson runtime and story sources; exact equality includes per-stage verification and native site scenes. Browser screenshots are captured separately.'}
a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(report,indent=2)+'\n')
print(report['status'],len(names),'generated files',changed)
if changed:raise SystemExit(1)
