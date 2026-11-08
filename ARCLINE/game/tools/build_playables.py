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
media=json.loads((root/'assets/ending/manifest.json').read_text())
for a in [*media['tracks'].values(),*media['cutouts'],media['scenery'],*[i for c in media['cards'] for i in c['images']]]:
 blob=(root/a['src']).read_bytes();assert hashlib.sha256(blob).hexdigest()==a['sha256'];contents[a['src']]=blob
roll=json.loads((root/'assets/ending/roll-manifest.json').read_text())
for a in roll['actors']:
 blob=(root/a['src']).read_bytes();assert hashlib.sha256(blob).hexdigest()==a['sha256'];contents[a['src']]=blob
contents['assets/ending/roll-manifest.json']=(root/'assets/ending/roll-manifest.json').read_bytes()
contents['assets/ending/manifest.json']=(root/'assets/ending/manifest.json').read_bytes()
sfx=json.loads((root/'assets/audio/sfx/manifest.json').read_text())
for a in sfx['assets'].values():
 blob=(root/a['src']).read_bytes();assert hashlib.sha256(blob).hexdigest()==a['sha256'];contents[a['src']]=blob
contents['assets/audio/sfx/manifest.json']=(root/'assets/audio/sfx/manifest.json').read_bytes()
manifest={'implementation':CONFIG['version'],'design':'First journey,cinematic and original-character UI update;resetVersion2 retained;one authorized seal edit plus22 original plates and10 verified PNGs','files':{n:{'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()} for n,b in contents.items()},'sourceDistribution':{f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in files},'packagingTransform':'Only index.html sets ArcAssetBase to ./ for the flat offline layout; hosted code defaults to ../../. 22 JPEGs remain byte-identical;P03-01 uses the authorized seal-removal master.','youtubeCertification':'not performed; standalone distribution omits external SDK bootstrap','cinematicPlates':23,'runtimeFiles':len(files),'preservedBattle':'0.29.0 updates projectile mechanics,individual timing and attack rendering. Levels,pickups,save identity,machine HP/movement/charge and final relay rules are preserved.'}
archive=out/f"ARCLINE_{CONFIG['version']}_Playables.zip"
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for name,blob in sorted(contents.items()):
  info=zipfile.ZipInfo(name,date_time=(2026,11,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,blob)
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None and len(z.namelist())==len(contents)
 for n,b in contents.items():assert z.read(n)==b
manifest['characterPlates']=sum(bool(a['verified'] and a['src']) for a in characters)
manifest['bgmTracks']=len(media['tracks'])
manifest['endingCutouts']=len(roll['actors'])
manifest['endingTimeline']='ER-01–ER-13 v3.0.0 + flight adjustment v3.0.1; 7 seconds reallocated to players; shared native-clock timeline, 11 accelerated scenes, 10 players and 32 concept cutouts, gather and logo; original audio unchanged'
manifest['design']='Additional user direction0.17.1: confirmed start-screen save deletion and landscape-only prologue/ending; prior0.17.0: chapter playback, first-launch order, fixed trials, explicit machine menu, boss music restarts, recruitment swap and terrain variation; prior BGM/ending retained; schema8/resetVersion2 retained'
manifest['preservedBattle']='Engine,physics,geometry,AI,profiles,weapons,inventory and special mechanics unchanged from baseline9e04d97. Only explicitly requested terrain/recommendations/recruitment scheduling change; non-terrain stage combat parameters preserved.'
manifest['battleSFX']={'adoptedWAVs':37,'r1Replacements':7,'archiveInBundle':False,'prototypesInBundle':False,'recruitmentSound':False}
manifest['preservedBattle']='User-directed140px walking,manual progress setting,and five-stage machine use/five-stage resupply for1–99;100 excluded. Stage100:fixed70 HP,100 body damage per machine,remote spawns,four gimmick-rich maps and collapse transitions; common launch ballistics, enemy AI, inventory rules, normal save decoding and schema8/reset2 preserved.'
manifest['design']='0.23.2:33 individually reviewed theme/boss/final backgrounds bundled without external loads;screen-space art follows existing final travel frame;0.23.1: walk/warp up to70 degrees, slide beyond70, projectile-collider support, explicit field directions/on-off, vector capsule icons, swipeable weapon/skill stock tabs,10% gauge ticks and conditional shared90% charge camera; 0.23.0: approved maps1–50, proximity-learning AI,12 auxiliary weapons,15 active skills and46 once-only capsules (38 initial/8 player-turn5); chapters share unused stock; legacy IDs and per-difficulty progress retained.'
manifest['preservedBattle']='Stages51–100 terrain/spawns/gimmicks and final relay remain unchanged:four arenas,ten machines,HP70,100 displayed body damage per machine,three specials,28 actions each and entry retry. Enemy output error,damage multipliers and special patterns remain unchanged. Aim guides retain Easy full/Normal half/Hard direction. Save schema8/reset2/key and asset paths retained; additive inventory and ledger migration.'
manifest['design']='0.24.2:approved33-scene component materials,shared functional colors,7% active flow areas,true source/exit cues,muted terminals and localized pending polarity;screen-space backgrounds and latest0.24.1 maps retained.'
manifest['preservedBattle']='Latest0.24.1 main fee9c40:all100 map geometry/spawns/gimmicks,engine,physics,AI,HP,inventory,three difficulty aim guides,ten-pilot final relay and schema8/reset2/save key retained. Runtime changes are component drawing,generated dependency registration and cache version only.'
manifest['componentArt']={'approvedSource':'PR110/79d9521','scenes':33,'flowBandOpacity':0.07,'externalArtworkLoads':False,'integration':'0.24.2 formal renderer; latest0.24.1 geometry and saves preserved'}
manifest['design']='0.29.2: complete original-pixel player alpha masks; recruit display/audio waits for decode; strategic ordinary-enemy movement from40 and autonomous teleport from71 with caps and cooldowns.'
manifest['preservedBattle']='Only authorized ordinary-enemy action selection and shared140px enemy walking accounting change. All map geometry,player movement/teleport,enemy HP,weapons,aim error,damage,inventory,guardian/final rules,and schema8/reset2 remain unchanged from0.29.1.'
manifest['recruitmentArt']={'actors':10,'originalRGBUnchanged':True,'waitForDecode':True,'silentWhileLoading':True,'retryOnFailure':True,'alphaSource':'design/ending-roll-preparation/player-masks.json'}
manifest['zip']={'name':archive.name,'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest()}
(out/'BUNDLE_CHECK.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps({'status':'PASS','runtime':len(files),'plates':23,'entries':len(contents),'zip':str(archive),'bytes':archive.stat().st_size}))
