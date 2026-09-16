#!/usr/bin/env python3
"""Read-only audit for large tracked assets in the Yuhua customer-site repository.

The report measures Git blob sizes rather than modifying, deleting, compressing, or
relocating any customer-facing asset. It is intentionally evidence-only so large
or duplicate-looking source files can be reviewed before any irreversible action.
"""

from __future__ import annotations

import argparse
from collections import defaultdict
import json
from pathlib import Path
import subprocess
from typing import Iterable

MIB = 1024 * 1024

VIDEO_EXTS = {".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"}
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"}
DOCUMENT_EXTS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"}
ARCHIVE_EXTS = {".zip", ".rar", ".7z", ".tar", ".gz", ".tgz"}
AUDIO_EXTS = {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"}
FONT_EXTS = {".woff", ".woff2", ".ttf", ".otf", ".eot"}


def run_git(args: list[str], *, input_text: str | None = None) -> str:
    completed = subprocess.run(
        ["git", *args],
        input=input_text,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError(
            f"git {' '.join(args)} failed with exit code {completed.returncode}: "
            f"{completed.stderr.strip()}"
        )
    return completed.stdout


def tracked_entries() -> list[tuple[str, str]]:
    """Return (blob oid, path) pairs for regular tracked files."""
    raw = subprocess.run(
        ["git", "ls-files", "--stage", "-z"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if raw.returncode != 0:
        raise RuntimeError(
            "git ls-files failed: " + raw.stderr.decode("utf-8", errors="replace").strip()
        )

    entries: list[tuple[str, str]] = []
    for record in raw.stdout.split(b"\0"):
        if not record:
            continue
        metadata, sep, path_bytes = record.partition(b"\t")
        if not sep:
            continue
        parts = metadata.split()
        if len(parts) < 3:
            continue
        mode = parts[0].decode("ascii", errors="replace")
        oid = parts[1].decode("ascii", errors="replace")
        stage = parts[2].decode("ascii", errors="replace")
        # Ignore unresolved merge stages and gitlinks/submodules. The audit is
        # about blobs stored directly in this repository.
        if stage != "0" or mode == "160000":
            continue
        path = path_bytes.decode("utf-8", errors="replace")
        entries.append((oid, path))
    return entries


def blob_sizes(oids: Iterable[str]) -> dict[str, int]:
    unique = list(dict.fromkeys(oids))
    if not unique:
        return {}
    output = run_git(
        ["cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)"],
        input_text="\n".join(unique) + "\n",
    )
    sizes: dict[str, int] = {}
    for line in output.splitlines():
        parts = line.split()
        if len(parts) != 3:
            continue
        oid, object_type, raw_size = parts
        if object_type != "blob":
            continue
        try:
            sizes[oid] = int(raw_size)
        except ValueError:
            continue
    return sizes


def asset_category(path: str) -> str:
    ext = Path(path).suffix.lower()
    if ext in VIDEO_EXTS:
        return "video"
    if ext in IMAGE_EXTS:
        return "image"
    if ext in DOCUMENT_EXTS:
        return "document"
    if ext in ARCHIVE_EXTS:
        return "archive"
    if ext in AUDIO_EXTS:
        return "audio"
    if ext in FONT_EXTS:
        return "font"
    return "other"


def summarize_group(items: list[dict]) -> dict:
    total = sum(item["bytes"] for item in items)
    return {
        "count": len(items),
        "bytes": total,
        "mib": round(total / MIB, 2),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--json-output",
        default="large_asset_report.json",
        help="Path for the machine-readable report.",
    )
    parser.add_argument(
        "--top",
        type=int,
        default=100,
        help="Number of largest tracked blobs to include (default: 100).",
    )
    args = parser.parse_args()

    entries = tracked_entries()
    sizes = blob_sizes(oid for oid, _ in entries)

    files: list[dict] = []
    missing_size: list[dict] = []
    for oid, path in entries:
        size = sizes.get(oid)
        if size is None:
            missing_size.append({"path": path, "oid": oid})
            continue
        ext = Path(path).suffix.lower() or "(none)"
        files.append(
            {
                "path": path,
                "oid": oid,
                "bytes": size,
                "mib": round(size / MIB, 2),
                "extension": ext,
                "category": asset_category(path),
            }
        )

    files.sort(key=lambda item: (-item["bytes"], item["path"].lower()))
    tracked_bytes = sum(item["bytes"] for item in files)

    thresholds_mib = [1, 5, 25, 50]
    thresholds = {}
    for threshold in thresholds_mib:
        selected = [item for item in files if item["bytes"] >= threshold * MIB]
        thresholds[f"gte_{threshold}_mib"] = summarize_group(selected)

    by_category: dict[str, list[dict]] = defaultdict(list)
    by_extension: dict[str, list[dict]] = defaultdict(list)
    for item in files:
        by_category[item["category"]].append(item)
        by_extension[item["extension"]].append(item)

    category_totals = {
        key: summarize_group(value)
        for key, value in sorted(by_category.items())
    }
    extension_totals = {
        key: summarize_group(value)
        for key, value in sorted(
            by_extension.items(),
            key=lambda pair: (-sum(item["bytes"] for item in pair[1]), pair[0]),
        )
    }

    videos = [item for item in files if item["category"] == "video"]
    very_large = [item for item in files if item["bytes"] >= 25 * MIB]

    report = {
        "schema_version": 1,
        "measurement": "Git blob size for files tracked at the checked-out revision",
        "policy": {
            "mode": "audit_only",
            "notes": [
                "No file is deleted, compressed, renamed, or moved by this audit.",
                "Large or duplicate-looking files require evidence and review before remediation.",
            ],
        },
        "summary": {
            "tracked_file_count": len(files),
            "tracked_bytes": tracked_bytes,
            "tracked_mib": round(tracked_bytes / MIB, 2),
            "video_file_count": len(videos),
            "video_bytes": sum(item["bytes"] for item in videos),
            "video_mib": round(sum(item["bytes"] for item in videos) / MIB, 2),
            "files_gte_25_mib": len(very_large),
            "unmeasured_tracked_file_count": len(missing_size),
        },
        "thresholds": thresholds,
        "category_totals": category_totals,
        "extension_totals": extension_totals,
        "top_files": files[: max(0, args.top)],
        "files_gte_25_mib": very_large,
        "videos": videos,
        "unmeasured_tracked_files": missing_size,
    }

    output_path = Path(args.json_output)
    output_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(
        "Large-asset audit: "
        f"{len(files)} tracked blobs, {tracked_bytes / MIB:.2f} MiB total, "
        f"{len(very_large)} files >=25 MiB, {len(videos)} video files."
    )
    for item in files[:20]:
        print(f"  {item['mib']:9.2f} MiB  {item['category']:8s}  {item['path']}")
    if missing_size:
        print(f"Warning: {len(missing_size)} tracked entries could not be measured.")
    print(f"JSON report: {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
