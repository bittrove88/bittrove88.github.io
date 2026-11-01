"""Canonical regeneration plan shared by writing builds and isolated checks."""
from pathlib import Path
import os,subprocess
from release import CONFIG
SCRIPTS=['build_runtime.py','extract_cinematics.py','build_cinematic_data.py','build_crew.py','build_campaign.py','build_levels.py','build_lessons.py','build_story.py','build_public_assets.py','export_expedition_story.py','export_story_revision.py','build_stage_guide.py']
OUTPUTS=['game/dist/cinematic-data.js','assets/cinematics/manifest.json','assets/cinematics/manifest.csv','game/dist/crew.js','game/dist/levels.js','game/dist/lessons.js','game/dist/story.js','characters/index.html','characters/ARCLINE_Characters_Preview.html','site/scenes.js','design/runtime_campaign_20x5.json','design/preview_curriculum.json','design/expedition_013/stage_design.json','design/expedition_013/index.html','design/expedition_013/STAGES_JA.md','design/expedition_013/STORY_JA.md','design/expedition_013/CREW_STORY.md','design/story_emotion_0141/TEXT_DIFF.json','design/story_emotion_0141/TEXT_DIFF.md',*[f'game/dist/{name}' for name in CONFIG['generated']],'game/dist/release-info.js','game/dist/index.html','game/dist/app.webmanifest','index.html']
def rebuild(root,history_repo):
    tools=root/'game/tools';env={**os.environ,'ARCLINE_HISTORY_REPO':str(history_repo)}
    for name in SCRIPTS:subprocess.run(['python3',str(tools/name)],check=True,env=env,stdout=subprocess.DEVNULL)
    subprocess.run(['node',str(tools/'build_site_scenes.cjs')],check=True,stdout=subprocess.DEVNULL)
