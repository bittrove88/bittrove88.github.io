"""Select approved, byte-identical WAVs from the preserved final ZIP.

Never run the archive's scripts, extract it wholesale, or publish previews,
macOS metadata, archived revisions, or the three reference ricochet prototypes.
"""
from pathlib import Path
import hashlib, io, json, wave, zipfile
from release import ROOT

def build():
    data = json.loads((ROOT/'design/audio/sfx/runtime.json').read_text())
    archive = ROOT/data['archive']['src']
    assert hashlib.sha256(archive.read_bytes()).hexdigest() == data['archive']['sha256']
    with zipfile.ZipFile(archive) as source:
        assert source.testzip() is None
        names = {}
        for info in source.infolist():
            if info.filename.startswith('__MACOSX/') or info.is_dir() or info.filename.endswith('.DS_Store'):
                continue
            name = info.filename
            if not info.flag_bits & 0x800:
                try:
                    name = name.encode('cp437').decode('utf8')
                except UnicodeError:
                    pass
            names[name.removeprefix('ARCLINE_SFX_FINAL/')] = info.filename
        manifest = json.loads(source.read(names['MANIFEST.json']))['files']
        for name, expected in manifest.items():
            blob = source.read(names[name])
            assert len(blob) == expected['size'] and hashlib.sha256(blob).hexdigest() == expected['sha256'], name
        assert len(data['assets']) == 37
        for asset in data['assets'].values():
            name = asset['source']
            assert name.startswith('sounds/') and name.endswith('.wav')
            assert 'Ricochet_v' not in name and 'J-01' not in name
            blob = source.read(names[name])
            assert len(blob) == asset['bytes'] and hashlib.sha256(blob).hexdigest() == asset['sha256']
            with wave.open(io.BytesIO(blob)) as audio:
                assert (audio.getframerate(), audio.getsampwidth(), audio.getnchannels()) == (48000, 3, 2)
                assert abs(audio.getnframes()/audio.getframerate()-asset['duration']) < 1e-9
            destination = ROOT/asset['src']
            assert destination.parent == ROOT/'assets/audio/sfx'
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(blob)
    (ROOT/'assets/audio/sfx/manifest.json').write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n')
    (ROOT/'game/dist/sfx-data.js').write_text('/* Generated from design/audio/sfx/runtime.json; approved ZIP WAVs remain byte-identical. */\n(function(root){const data='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';if(typeof module!=="undefined")module.exports=data;else root.ArcSFXData=data;})(globalThis);\n')
    print('Verified final archive and reproduced37 adopted WAVs;7 r1 revisions, no prototypes/recruitment sound')

if __name__ == '__main__':
    build()
