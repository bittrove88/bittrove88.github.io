"""Render review movies from native takes and a declarative editorial timeline.

The sources are frame-stepped native gameplay; SFX are an editorial mix aligned
to the captured production event timeline, not a live browser audio recording.
"""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
WORK = Path(sys.argv[1] if len(sys.argv) > 1 else '/workspace/work/arcline-video/production')
os.environ.setdefault('XDG_CACHE_HOME', str(WORK / 'cache'))
(WORK / 'cache').mkdir(parents=True, exist_ok=True)
DEST = ROOT / 'promo/media'
DEST.mkdir(parents=True, exist_ok=True)
TIMELINE = json.loads((ROOT / 'promo/edit/timeline.json').read_text())
CAPTURE = json.loads((WORK / 'capture.json').read_text())
TAKES = {t['id']: t for t in CAPTURE['takes']}
FOLLOW = TAKES['L01']['secondAim']['t']
if not any(s['side'] == 0 and s['damage'][1] > 0 for s in TAKES['L01']['shots']):
    raise RuntimeError('The same native take must include the successful follow-up.')


def run(args):
    subprocess.run([str(a) for a in args], check=True)


def ff(args):
    run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-threads', '2', *args])


def stamp(t):
    ms = round(t * 1000)
    return f'{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02},{ms % 1000:03}'


def ass_stamp(t):
    return f'{int(t // 3600)}:{int(t // 60) % 60:02}:{int(t) % 60:02}.{round(t * 100) % 100:02}'


def captions(seconds, lang):
    return TIMELINE['captions' if seconds == 30 else 'shortCaptions']


def make_captions(seconds, lang, vertical):
    rows = captions(seconds, lang)
    stem = f'arcline-play-{seconds}-{lang}'
    srt = ''.join(f'{i+1}\n{stamp(r["start"])} --> {stamp(r["end"])}\n{r[lang]}\n\n' for i, r in enumerate(rows))
    end_copy = 'ARCLINE\nその一発で、道をひらけ。\nゲームを遊ぶ' if lang == 'ja' else 'ARCLINE\nOne shot. A new way.\nPlay ARCLINE'
    srt += f'{len(rows)+1}\n{stamp(seconds-4)} --> {stamp(seconds)}\n{end_copy}\n'
    (DEST / (stem + '.srt')).write_text(srt)
    (DEST / (stem + '.vtt')).write_text('WEBVTT\n\n' + srt.replace(',', '.'))
    width, height = (1080, 1920) if vertical else (1920, 1080)
    font = 49 if vertical else 50
    # Above gameplay in portrait; below the native top HUD in landscape.
    y = 500 if vertical else 126
    lines = [f'[Script Info]\nPlayResX: {width}\nPlayResY: {height}\nWrapStyle: 0\n', '[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n', f'Style: Default,Noto Sans CJK JP,{font},&H00FFFFFF,&H00FFFFFF,&H00373C2D,&H80373C2D,-1,0,0,0,100,100,0,0,3,12,0,8,60,60,0,1\n', '[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n']
    for r in rows:
        text = r[lang]
        if vertical and len(text) > (17 if lang == 'ja' else 34):
            if lang == 'ja':
                text = text.replace('、', '、\\N', 1)
            elif '. ' in text:
                text = text.replace('. ', '.\\N', 1)
            elif ' as ' in text:
                text = text.replace(' as ', '\\Nas ', 1)
        lines.append(f'Dialogue: 0,{ass_stamp(r["start"])},{ass_stamp(r["end"])},Default,,0,0,0,,{{\\an8\\pos({width//2},{y})\\fad(100,100)}}{text}\n')
    ass = WORK / (stem + ('-v' if vertical else '-h') + '.ass')
    ass.write_text(''.join(lines))
    return ass


def audio(seconds):
    data = json.loads(subprocess.check_output(['node', '-e', 'console.log(JSON.stringify(require(process.argv[1])))', str(ROOT / 'game/dist/sfx-data.js')]))
    clips = [('L01', 0, 5.3, 0), ('L01', FOLLOW, FOLLOW + 5.7, 5.3)]
    if seconds == 30:
        clips.append(('L02', 0, 6.5, 11))
    cues = []
    for take_id, start, end, offset in clips:
        for shot in TAKES[take_id]['shots']:
            for cue in shot['cues']:
                at = shot['t'] + cue['presentationTime'] + cue.get('delay', 0)
                if start <= at < end and cue['id'] in data['assets']:
                    asset = data['assets'][cue['id']]
                    cues.append((ROOT / asset['src'], offset + at - start, asset.get('gainDb', 0) + cue.get('gainDb', 0) - 9))
    inputs = ['-stream_loop', '-1', '-i', ROOT / TIMELINE['audio']['music']]
    filters = [f'[0:a]atrim=duration={seconds},asetpts=PTS-STARTPTS,volume=0.15,afade=t=in:d=0.4,afade=t=out:st={seconds-2}:d=2[a0]']
    labels = ['[a0]']
    for i, (file, t, gain) in enumerate(cues, 1):
        inputs += ['-i', file]
        filters.append(f'[{i}:a]volume={10 ** (gain/20)},adelay={round(t*1000)}|{round(t*1000)}[a{i}]')
        labels.append(f'[a{i}]')
    filters.append(''.join(labels) + f'amix=inputs={len(labels)}:normalize=0:duration=first,alimiter=limit=0.89:level=false,atrim=duration={seconds}[mix]')
    target = WORK / f'mix-{seconds}.wav'
    ff([*inputs, '-filter_complex', ';'.join(filters), '-map', '[mix]', '-ar', '48000', '-ac', '2', target])
    return target


def compose(seconds, lang, vertical=False):
    inputs = ['-i', WORK / 'L01.mp4', '-i', WORK / 'L02.mp4']
    for image in [WORK / 'world-61.png', WORK / 'world-84.png', ROOT / 'assets/cinematics/P03-01.jpeg', WORK / f'end-{lang}-{"v" if vertical else "h"}.png']:
        inputs += ['-loop', '1', '-framerate', '30', '-i', image]
    if vertical:
        def picture(label, duration):
            return f'scale=1080:608:force_original_aspect_ratio=decrease,pad=1080:1920:0:656:color=0xf3efdf,setsar=1,fps=30,trim=duration={duration},setpts=PTS-STARTPTS,format=yuv420p[{label}]'
    else:
        def picture(label, duration):
            return f'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0xf3efdf,setsar=1,fps=30,trim=duration={duration},setpts=PTS-STARTPTS,format=yuv420p[{label}]'
    filters = ['[0:v]split=2[first][next]', '[first]trim=start=0:end=5.3,setpts=PTS-STARTPTS,' + picture('a', 5.3), f'[next]trim=start={FOLLOW}:end={FOLLOW+5.7},setpts=PTS-STARTPTS,' + picture('b', 5.7)]
    if seconds == 30:
        filters += ['[1:v]trim=start=0:end=6.5,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=0.5,' + picture('c', 7), '[2:v]' + picture('d', 2), '[3:v]' + picture('e', 2), '[4:v]' + picture('f', 4)]
        labels = '[a][b][c][d][e][f][g]'
    else:
        labels = '[a][b][g]'
    filters += [f'[5:v]scale={1080 if vertical else 1920}:{1920 if vertical else 1080},setsar=1,fps=30,trim=duration=4,setpts=PTS-STARTPTS,format=yuv420p[g]', labels + f'concat=n={7 if seconds == 30 else 3}:v=1:a=0[clean]']
    ass = make_captions(seconds, lang, vertical)
    if vertical:
        # Typography in the portrait margins; the full horizontal battlefield stays visible.
        footer = '狙う。ためる。地形を味方にする。' if lang == 'ja' else 'Aim. Charge. Make the terrain your ally.'
        filters.append("[clean]drawtext=font='Noto Sans CJK JP':text='ARCLINE':fontsize=34:fontcolor=0x173c47:x=68:y=88:enable='lt(t," + str(seconds-4) + ")',drawtext=font='Noto Sans CJK JP':text='" + footer + "':fontsize=28:fontcolor=0x173c47:x=68:y=1400:enable='lt(t," + str(seconds-4) + ")',ass=" + str(ass) + '[video]')
    else:
        filters.append('[clean]ass=' + str(ass) + '[video]')
    target = DEST / f'arcline-play-{seconds}-{lang}-{"vertical" if vertical else "1080p"}.mp4'
    ff([*inputs, '-i', WORK / f'mix-{seconds}.wav', '-filter_complex_threads', '2', '-filter_complex', ';'.join(filters), '-map', '[video]', '-map', '6:a', '-t', str(seconds), '-r', '30', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', target])
    print('Rendered', target.name, flush=True)
    return target


for seconds in [30, 15]:
    audio(seconds)
    for lang in ['ja', 'en']:
        for vertical in [False, True]:
            compose(seconds, lang, vertical)
    for lang in ['ja', 'en']:
        ff(['-i', DEST / f'arcline-play-{seconds}-{lang}-1080p.mp4', '-vf', 'scale=1280:720', '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-c:a', 'copy', '-movflags', '+faststart', DEST / f'arcline-play-{seconds}-{lang}-720p.mp4'])

ff(['-ss', '1.2', '-i', WORK / 'L01.mp4', '-frames:v', '1', '-q:v', '2', DEST / 'poster.jpg'])
shutil.copyfile(WORK / 'capture.json', ROOT / 'promo/edit/capture.json')
shutil.copyfile(WORK / 'end-ja-h.png', ROOT / 'promo/edit/end-card.png')
metadata = {'revision': TIMELINE['revision'], 'status': 'review-draft', 'gameVersion': CAPTURE['version'], 'gameCommit': CAPTURE['commit'], 'fps': 30, 'note': CAPTURE['method'], 'audio': TIMELINE['audio'], 'assets': []}
for file in sorted(DEST.iterdir()):
    if file.is_file():
        metadata['assets'].append({'file': file.name, 'bytes': file.stat().st_size, 'sha256': hashlib.sha256(file.read_bytes()).hexdigest()})
(ROOT / 'promo/edit/manifest.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n')
media_path = ROOT / 'promo/media.json'
legacy_path = ROOT / 'promo/edit/legacy-media.json'
if not legacy_path.exists():
    shutil.copyfile(media_path, legacy_path)
primary = {'title': 'ARCLINE — その一発で、道をひらけ。', 'status': 'review-draft', 'revision': TIMELINE['revision'], 'gameVersion': CAPTURE['version'], 'gameCommit': CAPTURE['commit'], 'seconds': 30, 'legacy': 'edit/legacy-media.json', 'videos': []}
for quality in [720, 1080]:
    entry = next(a for a in metadata['assets'] if a['file'] == f'arcline-play-30-ja-{quality}p.mp4')
    primary['videos'].append({'quality': quality, 'src': 'media/' + entry['file'], 'bytes': entry['bytes'], 'sha256': entry['sha256'], 'seconds': 30, 'width': 1280 if quality == 720 else 1920, 'height': quality})
media_path.write_text(json.dumps(primary, ensure_ascii=False, indent=2) + '\n')
