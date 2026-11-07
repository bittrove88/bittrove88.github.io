"""STG packaging boundaries and integrity; optional assembled-artifact verification."""
import importlib.util
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'tools/build_staging.py'
spec = importlib.util.spec_from_file_location('build_staging', SCRIPT)
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class StagingPackagingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.output = Path(self.temp.name) / 'site'
        self.head = subprocess.check_output(['git', '-C', str(builder.ROOT), 'rev-parse', 'HEAD'], text=True).strip()

    def test_source_tree_cannot_be_an_output(self):
        with self.assertRaisesRegex(ValueError, 'outside'):
            builder.build(builder.ROOT / 'game/dist', self.head)

    def test_commit_must_be_fixed_and_match_checkout(self):
        for sha in ['main', 'a' * 40]:
            with self.assertRaises(ValueError):
                builder.build(self.output, sha)

    def test_cannot_publish_into_production_or_owner_root(self):
        for path in ['/', '/ARCLINE/', '/arcline/', '/../', '/arcline-staging/game/']:
            with self.assertRaisesRegex(ValueError, 'dedicated'):
                builder.build(self.output, self.head, path)

    def test_existing_output_is_not_overwritten(self):
        self.output.mkdir()
        sentinel = self.output / 'keep'
        sentinel.write_text('untouched')
        with self.assertRaisesRegex(ValueError, 'empty'):
            builder.build(self.output, self.head)
        self.assertEqual(sentinel.read_text(), 'untouched')

    @unittest.skipUnless(os.environ.get('ARCLINE_STAGING_SITE'), 'requires assembled artifact')
    def test_artifact_hashes_and_unchanged_game_runtime(self):
        site = Path(os.environ['ARCLINE_STAGING_SITE'])
        report = json.loads((site / 'STAGING_BUILD.json').read_text())
        self.assertFalse(report['persistentSave'])
        for name, digest in report['files'].items():
            self.assertEqual(hashlib.sha256((site / name).read_bytes()).hexdigest(), digest, name)
        for source in (builder.ROOT / 'game/dist').iterdir():
            if source.suffix in ['.js', '.css', '.svg']:
                self.assertEqual(source.read_bytes(), (site / 'game' / source.name).read_bytes(), source.name)
        self.assertFalse((site / 'game/app.webmanifest').exists())
        self.assertFalse(list(site.rglob('*.zip')))
        self.assertFalse((site / 'catalog').exists())
        entry = (site / 'game/index.html').read_text()
        self.assertNotIn('runtime:scripts:start', entry)
        self.assertNotIn('src="game.js', entry)
        self.assertIn('src="staging-loader.js?v=', entry)


if __name__ == '__main__':
    unittest.main()
