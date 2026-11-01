"""Optional developer audit with ffprobe/ffmpeg; never rewrites the approved audio."""
import argparse,hashlib,json,subprocess
from pathlib import Path
from release import ROOT
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);args=p.parse_args()
data=json.loads((ROOT/'assets/ending/manifest.json').read_text());rows=[]
for id,track in data['tracks'].items():
    file=ROOT/track['src'];digest=hashlib.sha256(file.read_bytes()).hexdigest();assert digest==track['sha256']
    info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(file)]));stream=info['streams'][0]
    assert stream['codec_name']=='aac' and abs(float(info['format']['duration'])-track['duration'])<0.01
    subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(file),'-f','null','-'],check=True,capture_output=True)
    rows.append({'id':id,'sha256':digest,'duration':track['duration'],'codec':stream['codec_name'],'fullDecode':'PASS'})
assert len({r['sha256'] for r in rows})==7
args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps({'status':'PASS','tracks':rows,'listening':'Not performed; metadata and complete decoder validation are distinct from perceptual approval.'},indent=2)+'\n')
print('PASS: seven distinct approved AAC files decoded completely without errors')
