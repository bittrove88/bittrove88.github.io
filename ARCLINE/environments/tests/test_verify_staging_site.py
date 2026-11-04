"""Offline safety tests. Run: python3 -m unittest discover -s ARCLINE/environments/tests -v"""
import importlib.util
from pathlib import Path
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "tools" / "verify_staging_site.py"
spec = importlib.util.spec_from_file_location("verify_staging_site", SCRIPT)
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)


class StagingOnlyGuardTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        self.baseline = root / "baseline"
        self.candidate = root / "candidate"
        for rel, content in {
            "ARCLINE/game/dist/index.html": "production",
            "ARCLINE/game/dist/save.js": "stable-save",
            "catalog/index.html": "catalog",
            ".nojekyll": "",
        }.items():
            self.put(self.baseline, rel, content)
            self.put(self.candidate, rel, content)
        self.put(self.candidate, "ARCLINE-staging/game/dist/index.html", "preview")

    @staticmethod
    def put(root, path, content):
        target = root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")

    def test_staging_only_change_passes(self):
        self.assertEqual(checker.verify(self.baseline, self.candidate)["status"], "PASS")
        self.put(self.candidate, "ARCLINE-staging/game/dist/index.html", "new preview")
        self.assertEqual(checker.verify(self.baseline, self.candidate)["status"], "PASS")

    def test_modification_to_production_fails(self):
        self.put(self.candidate, "ARCLINE/game/dist/save.js", "modified")
        self.assertEqual(checker.verify(self.baseline, self.candidate)["modified_non_staging"], ["ARCLINE/game/dist/save.js"])

    def test_modification_to_other_site_fails(self):
        self.put(self.candidate, "catalog/index.html", "modified")
        self.assertEqual(checker.verify(self.baseline, self.candidate)["status"], "FAIL")

    def test_removed_non_staging_file_fails(self):
        (self.candidate / ".nojekyll").unlink()
        self.assertEqual(checker.verify(self.baseline, self.candidate)["removed_non_staging"], [".nojekyll"])

    def test_extra_file_outside_staging_fails(self):
        self.put(self.candidate, "other-project/index.html", "not allowed")
        self.assertEqual(checker.verify(self.baseline, self.candidate)["added_non_staging"], ["other-project/index.html"])

    def test_staging_entry_is_required(self):
        (self.candidate / "ARCLINE-staging/game/dist/index.html").unlink()
        self.assertTrue(checker.verify(self.baseline, self.candidate)["missing_staging_entry"])

    def test_symlink_is_rejected(self):
        path = self.candidate / "ARCLINE-staging/some-link"
        path.symlink_to("/etc/passwd")
        with self.assertRaisesRegex(ValueError, "Symbolic links"):
            checker.verify(self.baseline, self.candidate)

    def test_preexisting_staging_may_change(self):
        self.put(self.baseline, "ARCLINE-staging/game/dist/index.html", "old")
        self.put(self.candidate, "ARCLINE-staging/game/dist/index.html", "new")
        self.assertEqual(checker.verify(self.baseline, self.candidate)["status"], "PASS")


if __name__ == "__main__":
    unittest.main()
