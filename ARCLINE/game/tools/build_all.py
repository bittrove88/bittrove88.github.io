"""Intentionally write all generated output. Checks use a temporary tree instead."""
from release import ROOT
from generation import rebuild
rebuild(ROOT,ROOT.parent)
print('Rebuilt runtime,generated data,public previews and guides')
