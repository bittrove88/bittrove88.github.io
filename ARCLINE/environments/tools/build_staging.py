#!/usr/bin/env python3
"""Build an isolated-in-memory STG artifact; do not edit production outputs."""
from pathlib import Path
import argparse
import hashlib
import html
import json
import re
import shutil
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[2]
ENV = ROOT / 'environments/staging'


def build(output, source_commit, site_path='/arcline-staging/', require_clean=False):
    output = Path(output).resolve()
    if output == ROOT or output.is_relative_to(ROOT.parent):
        raise ValueError('Choose an output outside the source repository')
    if not re.fullmatch(r'[0-9a-f]{40}', source_commit):
        raise ValueError('source_commit must be a full Git commit SHA')
    head = subprocess.check_output(['git', '-C', str(ROOT), 'rev-parse', 'HEAD'], text=True).strip()
    dirty = bool(subprocess.check_output(['git', '-C', str(ROOT), 'status', '--porcelain'], text=True).strip())
    if source_commit != head:
        raise ValueError('source_commit does not match the checked-out source')
    if require_clean and dirty:
        raise ValueError('Refuse to publish uncommitted source changes')
    if not re.fullmatch(r'/[a-z0-9][a-z0-9-]*/', site_path) or site_path.lower() == '/arcline/':
        raise ValueError('Use a dedicated STG repository path')
    if output.exists() and any(output.iterdir()):
        raise ValueError('STG output must be empty; never overwrite an existing site')
    output.mkdir(parents=True, exist_ok=True)
    config = json.loads((ROOT / 'game/runtime.json').read_text())
    with tempfile.TemporaryDirectory(prefix='stg-package-', dir=output.parent) as temp:
        package = Path(temp)
        subprocess.run(['python3', str(ROOT / 'game/tools/build_playables.py'), '--output', str(package)], check=True, stdout=subprocess.DEVNULL)
        archive = package / f"ARCLINE_{config['version']}_Playables.zip"
        game = output / 'game'
        game.mkdir()
        with zipfile.ZipFile(archive) as source:
            for name in source.namelist():
                if Path(name).is_absolute() or '..' in Path(name).parts:
                    raise ValueError('Unsafe archive path')
                if name == 'app.webmanifest':
                    continue
                target = game / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(source.read(name))
    metadata = {
        'environment': 'staging', 'version': config['version'],
        'cacheVersion': config['cacheVersion'], 'sourceCommit': source_commit,
        'sitePath': site_path, 'scripts': config['scripts'], 'fixture': 'stage-entry-v1', 'sourceDirty': dirty,
    }
    environment_revision = hashlib.sha256(b''.join((ENV / name).read_bytes() for name in ['session.js', 'loader.js', 'staging.css'])).hexdigest()[:12]
    metadata['environmentRevision'] = environment_revision
    metadata['runtimeCacheVersion'] = config['cacheVersion'] + '-stg-' + source_commit[:12]
    entry = game / 'index.html'
    text = entry.read_text()
    scripts = re.findall(r'<script src="([^?\"]+)', text)
    if scripts != config['scripts']:
        raise ValueError('Runtime script order changed; refuse an unverified package')
    text = re.sub(r'<link rel="manifest"[^>]*>', '', text)
    text = text.replace('</head>', '<meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="staging.css?v=' + environment_revision + '"></head>')
    block = '<script id="staging-config" type="application/json">' + json.dumps(metadata, separators=(',', ':')).replace('<', '\\u003c') + '</script>\n<script src="staging-session.js?v=' + environment_revision + '"></script>\n<script src="staging-loader.js?v=' + environment_revision + '"></script>'
    text, count = re.subn(r'<!-- runtime:scripts:start -->[\s\S]*?<!-- runtime:scripts:end -->', lambda _: block, text)
    if count != 1 or [src.split('?', 1)[0] for src in re.findall(r'<script src="([^"]+)', text)] != ['staging-session.js', 'staging-loader.js']:
        raise ValueError('Unexpected executable scripts in STG HTML')
    entry.write_text(text)
    for source, name in [('session.js', 'staging-session.js'), ('loader.js', 'staging-loader.js'), ('staging.css', 'staging.css')]:
        shutil.copyfile(ENV / source, game / name)
    release = f"{config['version']} / {source_commit[:12]}{' + local changes' if dirty else ''} / stage-entry-v1"
    (output / 'index.html').write_text((ENV / 'index.html').read_text().replace('__STAGING_RELEASE__', html.escape(release)))
    (output / '.nojekyll').touch()
    files = {p.relative_to(output).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(output.rglob('*')) if p.is_file()}
    report = {**metadata, 'files': files, 'fileCount': len(files), 'bytes': sum(p.stat().st_size for p in output.rglob('*') if p.is_file()), 'persistentSave': False}
    (output / 'STAGING_BUILD.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--source-commit', required=True)
    parser.add_argument('--site-path', default='/arcline-staging/')
    parser.add_argument('--require-clean', action='store_true')
    args = parser.parse_args()
    result = build(args.output, args.source_commit, args.site_path, args.require_clean)
    print(json.dumps({k: result[k] for k in ['version', 'sourceCommit', 'fileCount', 'bytes', 'persistentSave']}))
