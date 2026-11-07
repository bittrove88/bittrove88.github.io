"""Canonical regeneration plan shared by writing builds and isolated checks."""
from pathlib import Path
import json,os,subprocess
from release import CONFIG,ROOT
SCRIPTS=['extract_cinematics.py','build_media.py','build_ending_roll.py','build_sfx.py','build_backgrounds.py','build_runtime.py','build_cinematic_data.py','build_crew.py','build_campaign.py','build_levels.py','build_lessons.py','build_story.py','build_public_assets.py','export_expedition_story.py','export_story_revision.py','build_stage_guide.py','build_map_atlas.py']
OUTPUTS=['game/dist/media-data.js','assets/ending/manifest.json','assets/ending/cutouts/enemies/enemy_pebble.png','assets/ending/cutouts/midbosses/midboss_harbor_knot.png','assets/ending/cutouts/bosses/boss_tideclaw.png','assets/ending/cutouts/brand/logo_arcline.png','game/dist/cinematic-data.js','assets/cinematics/manifest.json','assets/cinematics/manifest.csv','game/dist/crew.js','game/dist/levels.js','game/dist/lessons.js','game/dist/story.js','characters/index.html','characters/ARCLINE_Characters_Preview.html','site/scenes.js','design/runtime_campaign_20x5.json','design/preview_curriculum.json','design/expedition_013/stage_design.json','design/expedition_013/index.html','design/expedition_013/STAGES_JA.md','design/expedition_013/STORY_JA.md','design/expedition_013/CREW_STORY.md','design/story_emotion_0141/TEXT_DIFF.json','design/story_emotion_0141/TEXT_DIFF.md',*[f'game/dist/{name}' for name in CONFIG['generated']],'game/dist/release-info.js','game/dist/index.html','game/dist/app.webmanifest','index.html']
OUTPUTS += ['game/dist/backgrounds.js']
OUTPUTS += ['game/dist/ending-roll-data.js', 'assets/ending/roll-manifest.json', 'assets/ending/player-cutouts.json']
OUTPUTS += [f'assets/ending/roll-cutouts/players/{name}.png' for name in ['gun','hana','koro','ban','sora','rico','hibari','mogu','rin','yui']]
OUTPUTS += [row['output'] for row in json.loads((ROOT/'design/ending-roll-preparation/cutouts.json').read_text())['rows']]
OUTPUTS += ['game/dist/sfx-data.js', 'assets/audio/sfx/manifest.json']
OUTPUTS += [row['src'] for row in json.loads((ROOT/'design/audio/sfx/runtime.json').read_text())['assets'].values()]
OUTPUTS += ['design/expedition_013/arcline_100_maps_atlas.html','game/dist/cpu-worker.js']
def rebuild(root,history_repo):
    tools=root/'game/tools';env={**os.environ,'ARCLINE_HISTORY_REPO':str(history_repo)}
    for name in SCRIPTS:subprocess.run(['python3',str(tools/name)],check=True,env=env,stdout=subprocess.DEVNULL)
    subprocess.run(['node',str(tools/'build_site_scenes.cjs')],check=True,stdout=subprocess.DEVNULL)
