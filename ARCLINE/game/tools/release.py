"""Shared release metadata and runtime dependency order. No runtime dependencies."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[2]
CONFIG=json.loads((ROOT/'game/runtime.json').read_text())
def validate():
    scripts=CONFIG['scripts']
    assert len(scripts)==len(set(scripts))
    for script, dependencies in CONFIG['requires'].items():
        assert script in scripts
        for dependency in dependencies:
            assert scripts.index(dependency)<scripts.index(script),(script,dependency)
    for name in scripts+CONFIG['styles']:
        assert (ROOT/'game/dist'/name).is_file(),name
