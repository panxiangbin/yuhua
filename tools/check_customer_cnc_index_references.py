#!/usr/bin/env python3
"""Prevent customer-facing site files from loading heavyweight CNC indexes.

The CNC knowledge area may legitimately use these files. This guard scans tracked
HTML/CSS/JS/JSON files outside CNC/tooling directories and fails if a customer
site file references either large index by name.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

HEAVY_INDEX_NAMES = (
    b"kb-readme-index.js",
    b"knowledge-index-master.json",
)
TEXT_SUFFIXES = {".html", ".htm", ".css", ".js", ".mjs", ".json"}
SKIP_TOP_LEVEL = {".github", "cnc", "tools"}


def tracked_files() -> list[Path]:
    raw = subprocess.run(
        ["git", "ls-files", "-z"],
        check=True,
        stdout=subprocess.PIPE,
    ).stdout
    return [
        Path(item.decode("utf-8", "surrogateescape"))
        for item in raw.split(b"\0")
        if item
    ]


def is_customer_site_text(path: Path) -> bool:
    if not path.parts or path.parts[0] in SKIP_TOP_LEVEL:
        return False
    return path.suffix.lower() in TEXT_SUFFIXES and path.is_file()


def find_forbidden_references(path: Path) -> list[str]:
    content = path.read_bytes().lower()
    return [
        needle.decode("ascii")
        for needle in HEAVY_INDEX_NAMES
        if needle in content
    ]


def main() -> int:
    findings: list[tuple[str, list[str]]] = []
    scanned = 0

    for path in tracked_files():
        if not is_customer_site_text(path):
            continue
        scanned += 1
        matches = find_forbidden_references(path)
        if matches:
            findings.append((path.as_posix(), matches))

    print(f"Scanned {scanned} customer-facing HTML/CSS/JS/JSON files.")

    if findings:
        print("ERROR: customer-facing files reference heavyweight CNC indexes:")
        for path, matches in findings:
            print(f"  - {path}: {', '.join(matches)}")
        print(
            "Keep these heavyweight indexes inside the CNC knowledge area only; "
            "do not load them from the main Yuhua customer site."
        )
        return 1

    print("OK: no customer-facing file references the heavyweight CNC indexes.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
