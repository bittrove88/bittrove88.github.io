"""Create a deterministic offline review bundle after build.py / validate.cjs."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

root=Path(__file__).resolve().parent
target=root/'ARCLINE_Background_Collection.zip'
files=[p for p in root.rglob('*') if p.is_file() and p!=target and '__pycache__' not in p.parts and p.name!='.gitignore']
with ZipFile(target,'w',compression=ZIP_DEFLATED,compresslevel=9) as archive:
    for p in sorted(files):
        entry=ZipInfo(p.relative_to(root).as_posix(),date_time=(2026,11,7,0,0,0))
        entry.compress_type=ZIP_DEFLATED
        entry.external_attr=0o644<<16
        archive.writestr(entry,p.read_bytes())
print(f'Packaged {len(files)} files / {target.stat().st_size} bytes')
