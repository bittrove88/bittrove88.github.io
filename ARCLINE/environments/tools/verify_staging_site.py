#!/usr/bin/env python3
"""Fail closed if a staging-only Pages deployment changes any non-staging file.

Compare assembled site artifacts, not Git working trees. The baseline MUST be a
trusted snapshot of the currently approved deployed site, not merely main HEAD.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import pathlib
import sys

STAGING = pathlib.PurePosixPath("ARCLINE-staging")
STAGING_ENTRY = pathlib.PurePosixPath("ARCLINE-staging/game/dist/index.html")


def snapshot(root: pathlib.Path) -> dict[str, str]:
    if not root.is_dir() or root.is_symlink():
        raise ValueError(f"Invalid artifact directory: {root}")
    files: dict[str, str] = {}
    for path in root.rglob("*"):
        if path.is_symlink():
            raise ValueError(f"Symbolic links are forbidden in Pages artifacts: {path}")
        if path.is_dir():
            continue
        if not path.is_file():
            raise ValueError(f"Unsupported artifact entry: {path}")
        rel = path.relative_to(root).as_posix()
        digest = hashlib.sha256()
        with path.open("rb") as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                digest.update(chunk)
        files[rel] = digest.hexdigest()
    return files


def is_staging(path: str) -> bool:
    p = pathlib.PurePosixPath(path)
    return p == STAGING or STAGING in p.parents


def verify(baseline: pathlib.Path, candidate: pathlib.Path) -> dict:
    before = snapshot(baseline)
    after = snapshot(candidate)
    missing_entry = STAGING_ENTRY.as_posix() not in after
    original = {p: sha for p, sha in before.items() if not is_staging(p)}
    preserved = {p: sha for p, sha in after.items() if not is_staging(p)}
    modified = sorted(p for p in original.keys() & preserved.keys() if original[p] != preserved[p])
    removed = sorted(original.keys() - preserved.keys())
    added = sorted(preserved.keys() - original.keys())
    ok = not (missing_entry or modified or removed or added)
    return {
        "status": "PASS" if ok else "FAIL",
        "baseline_files": len(before),
        "candidate_files": len(after),
        "staging_files": len(after) - len(preserved),
        "missing_staging_entry": missing_entry,
        "modified_non_staging": modified,
        "removed_non_staging": removed,
        "added_non_staging": added,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baseline", type=pathlib.Path, required=True,
                        help="Exact snapshot of the approved, currently published Pages content")
    parser.add_argument("--candidate", type=pathlib.Path, required=True,
                        help="Assembled full-site artifact after inserting the staging candidate")
    parser.add_argument("--report", type=pathlib.Path, help="Optional JSON evidence output")
    args = parser.parse_args()
    try:
        result = verify(args.baseline, args.candidate)
    except (OSError, ValueError) as error:
        result = {"status": "FAIL", "error": str(error)}
    result_json = json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True)
    print(result_json)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(result_json + "\n", encoding="utf-8")
    return 0 if result["status"] == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
