#!/usr/bin/env python3
"""Read-only audit for the homepage video runtime manifest.

This audit compares assets/videos.js with tracked assets/videos/ files. It is
intentionally evidence-only: a tracked video that is not present in the homepage
manifest may still be used by product pages, sub-sites, downloads, or dynamic
code, so no file is changed or classified as unused.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from collections import Counter
from pathlib import Path

MIB = 1024 * 1024
VIDEO_EXTS = {".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default="assets/videos.js")
    parser.add_argument("--output-dir", default="audit_reports/homepage-video-runtime")
    parser.add_argument("--top", type=int, default=100)
    return parser.parse_args()


def tracked_sizes() -> dict[str, int]:
    raw = subprocess.check_output(["git", "ls-tree", "-r", "-l", "-z", "HEAD"])
    result: dict[str, int] = {}
    for item in raw.split(b"\0"):
        if not item or b"\t" not in item:
            continue
        meta, path_bytes = item.split(b"\t", 1)
        parts = meta.decode("utf-8", "replace").split()
        if len(parts) != 4:
            continue
        _mode, kind, _oid, size_text = parts
        if kind != "blob" or not size_text.isdigit():
            continue
        path = path_bytes.decode("utf-8", "surrogateescape").replace("\\", "/")
        result[path] = int(size_text)
    return result


def extract_refs(text: str, key: str) -> list[str]:
    pattern = re.compile(r'["\']' + re.escape(key) + r'["\']\s*:\s*["\']([^"\']+)["\']')
    return [value.replace("\\", "/") for value in pattern.findall(text)]


def mib(value: int) -> float:
    return round(value / MIB, 2)


def main() -> int:
    args = parse_args()
    manifest_path = Path(args.manifest)
    text = manifest_path.read_text(encoding="utf-8")
    sizes = tracked_sizes()

    file_refs = extract_refs(text, "file")
    poster_refs = extract_refs(text, "poster")
    unique_files = list(dict.fromkeys(file_refs))
    unique_posters = list(dict.fromkeys(poster_refs))
    file_counts = Counter(file_refs)

    duplicate_paths = [
        {"path": path, "entry_count": count}
        for path, count in sorted(file_counts.items())
        if count > 1
    ]
    missing_files = sorted(path for path in unique_files if path not in sizes)
    missing_posters = sorted(path for path in unique_posters if path not in sizes)

    tracked_video_paths = sorted(
        path for path in sizes
        if path.startswith("assets/videos/") and Path(path).suffix.lower() in VIDEO_EXTS
    )
    manifest_set = set(unique_files)
    not_in_manifest = sorted(
        (path for path in tracked_video_paths if path not in manifest_set),
        key=lambda path: (-sizes[path], path),
    )

    manifest_tracked_bytes = sum(sizes[path] for path in unique_files if path in sizes)
    assets_video_bytes = sum(sizes[path] for path in tracked_video_paths)
    outside_bytes = sum(sizes[path] for path in not_in_manifest)
    share = round((manifest_tracked_bytes / assets_video_bytes * 100), 2) if assets_video_bytes else 0.0

    outside_items = [
        {"path": path, "size_bytes": sizes[path], "size_mib": mib(sizes[path])}
        for path in not_in_manifest
    ]

    summary = {
        "mode": "audit_only",
        "auto_fix_count": 0,
        "manifest_entry_count": len(file_refs),
        "manifest_unique_video_path_count": len(unique_files),
        "manifest_duplicate_video_path_count": len(duplicate_paths),
        "manifest_missing_video_path_count": len(missing_files),
        "manifest_video_bytes": manifest_tracked_bytes,
        "manifest_video_mib": mib(manifest_tracked_bytes),
        "assets_video_file_count": len(tracked_video_paths),
        "assets_video_bytes": assets_video_bytes,
        "assets_video_mib": mib(assets_video_bytes),
        "not_in_homepage_manifest_count": len(not_in_manifest),
        "not_in_homepage_manifest_bytes": outside_bytes,
        "not_in_homepage_manifest_mib": mib(outside_bytes),
        "homepage_manifest_share_percent": share,
        "poster_ref_count": len(poster_refs),
        "unique_poster_ref_count": len(unique_posters),
        "missing_poster_count": len(missing_posters),
    }

    report = {
        "policy": {
            "mode": "audit_only",
            "auto_fix_count": 0,
            "meaning": "Not present in the homepage runtime manifest does not mean unused. Other pages, sub-sites, downloads, or dynamic code may still require the asset. This report performs no deletion, move, compression, rename, or content rewrite.",
        },
        "summary": summary,
        "manifest_missing_video_paths": missing_files,
        "manifest_duplicate_video_paths": duplicate_paths,
        "missing_poster_paths": missing_posters,
        "not_in_homepage_manifest": outside_items,
    }

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    json_path = output_dir / "homepage-video-runtime-audit.json"
    md_path = output_dir / "homepage-video-runtime-audit.md"
    json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md = [
        "# Yuhua homepage video runtime audit",
        "",
        "This is a read-only audit. No asset or product data is modified.",
        "",
        "**Important:** 未列入首页运行时清单 ≠ 未使用。产品页、子站、下载入口或动态代码仍可能引用这些文件。",
        "",
        "## Summary",
        "",
    ]
    for key, value in summary.items():
        md.append(f"- **{key}**: {value}")

    md += ["", "## Manifest paths missing from tracked files", ""]
    if missing_files:
        md.extend(f"- `{path}`" for path in missing_files)
    else:
        md.append("- None")

    md += ["", "## Missing poster paths", ""]
    if missing_posters:
        md.extend(f"- `{path}`" for path in missing_posters)
    else:
        md.append("- None")

    md += [
        "",
        f"## Largest tracked assets/videos files not in homepage manifest (top {args.top})",
        "",
        "| Size | Path |",
        "|---:|---|",
    ]
    for item in outside_items[: args.top]:
        md.append(f"| {item['size_mib']:.2f} MiB | `{item['path']}` |")

    md_path.write_text("\n".join(md) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
