#!/usr/bin/env python3
"""Guard homepage video poster fallbacks against the current manifests.

The homepage intentionally suppresses poster URLs that are referenced by the video
manifests but are not present in the repository. Keep that fallback set exactly in
sync with the evidence: no missing poster may be omitted, and no stale fallback may
remain after a manifest cleanup or after a poster is restored.
"""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRIMARY = ROOT / "assets" / "videos.js"
CATALOG = ROOT / "videos.json"
INDEX = ROOT / "index.html"


def load_manifest(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8")
    if path.suffix.lower() == ".js":
        start = text.find("[")
        end = text.rfind("]")
        if start < 0 or end < start:
            raise ValueError(f"cannot find video array in {path}")
        text = text[start : end + 1]
    data = json.loads(text)
    if not isinstance(data, list):
        raise ValueError(f"{path} must contain a list")
    return data


def tracked_paths() -> set[str]:
    raw = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT)
    return {
        item.decode("utf-8", "surrogateescape").replace("\\", "/")
        for item in raw.split(b"\0")
        if item
    }


def poster_refs(items: list[dict]) -> set[str]:
    refs: set[str] = set()
    for item in items:
        if not isinstance(item, dict):
            continue
        poster = item.get("poster")
        if isinstance(poster, str) and poster.strip():
            refs.add(poster.strip().replace("\\", "/"))
    return refs


def fallback_paths() -> set[str]:
    text = INDEX.read_text(encoding="utf-8")
    match = re.search(
        r"const\s+missingPosters\s*=\s*new\s+Set\s*\(\s*\[(.*?)\]\s*\)\s*;",
        text,
        flags=re.DOTALL,
    )
    if not match:
        raise ValueError("index.html missingPosters fallback set was not found")
    return {
        value.replace("\\", "/")
        for value in re.findall(r"['\"]([^'\"]+)['\"]", match.group(1))
    }


def main() -> int:
    tracked = tracked_paths()
    primary_refs = poster_refs(load_manifest(PRIMARY))
    catalog_refs = poster_refs(load_manifest(CATALOG))
    primary_missing = {path for path in primary_refs if path not in tracked}
    catalog_missing = {path for path in catalog_refs if path not in tracked}
    fallback = fallback_paths()

    errors: list[str] = []
    if primary_missing != catalog_missing:
        errors.append(
            "assets/videos.js and videos.json disagree about missing poster paths"
        )
    if fallback != primary_missing:
        missing_from_fallback = sorted(primary_missing - fallback)
        stale_fallbacks = sorted(fallback - primary_missing)
        if missing_from_fallback:
            errors.append(
                "missing poster paths not covered by index.html fallback: "
                + ", ".join(missing_from_fallback)
            )
        if stale_fallbacks:
            errors.append(
                "stale/unreferenced poster fallbacks in index.html: "
                + ", ".join(stale_fallbacks)
            )

    print(f"primary poster refs: {len(primary_refs)}")
    print(f"catalog poster refs: {len(catalog_refs)}")
    print(f"missing poster refs: {len(primary_missing)}")
    print(f"index fallback paths: {len(fallback)}")
    for path in sorted(primary_missing):
        print(f"missing poster: {path}")

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    print("homepage video poster fallback parity verified")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
