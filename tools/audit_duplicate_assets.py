#!/usr/bin/env python3
"""Read-only audit for byte-identical tracked assets.

The audit groups tracked files by Git blob OID. Files sharing the same blob OID
are byte-for-byte identical, so the report can quantify duplicate storage
without decoding, recompressing, deleting, moving, or rewriting any asset.

Reference evidence is deliberately conservative: source-like text files up to a
bounded size are scanned for exact repository paths and basenames. Missing text
references do not prove that an asset is unused.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
from collections import defaultdict
from pathlib import Path
from typing import Iterable

MIB = 1024 * 1024
VIDEO_EXTS = {".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"}
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"}
DOC_EXTS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"}
ARCHIVE_EXTS = {".zip", ".rar", ".7z", ".tar", ".gz", ".tgz"}
TEXT_EXTS = {
    ".html", ".htm", ".css", ".js", ".mjs", ".json", ".xml", ".md",
    ".txt", ".yml", ".yaml", ".py", ".ts", ".tsx", ".jsx",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json-output", default="duplicate_assets_report.json")
    parser.add_argument("--markdown-output", default="duplicate_assets_report.md")
    parser.add_argument("--large-mib", type=float, default=1.0)
    parser.add_argument("--text-scan-mib", type=float, default=2.0)
    parser.add_argument("--top", type=int, default=100)
    return parser.parse_args()


def tracked_entries() -> list[dict]:
    raw = subprocess.check_output(["git", "ls-tree", "-r", "-l", "-z", "HEAD"])
    entries: list[dict] = []
    for item in raw.split(b"\0"):
        if not item:
            continue
        meta, path_b = item.split(b"\t", 1)
        parts = meta.decode("utf-8", "replace").split()
        if len(parts) != 4:
            continue
        _mode, kind, oid, size_text = parts
        if kind != "blob" or size_text == "-":
            continue
        path = path_b.decode("utf-8", "surrogateescape")
        entries.append({"path": path, "oid": oid, "size_bytes": int(size_text)})
    return entries


def asset_kind(path: str) -> str:
    ext = Path(path).suffix.lower()
    if ext in VIDEO_EXTS:
        return "video"
    if ext in IMAGE_EXTS:
        return "image"
    if ext in DOC_EXTS:
        return "document"
    if ext in ARCHIVE_EXTS:
        return "archive"
    return "other"


def mib(value: int) -> float:
    return round(value / MIB, 2)


def candidate_text_files(entries: Iterable[dict], max_bytes: int) -> list[str]:
    result = []
    for entry in entries:
        path = entry["path"]
        if entry["size_bytes"] > max_bytes:
            continue
        if Path(path).suffix.lower() not in TEXT_EXTS:
            continue
        if path.startswith(".git/"):
            continue
        result.append(path)
    return result


def reference_evidence(groups: list[dict], text_paths: list[str]) -> dict[str, dict]:
    duplicate_paths = [path for group in groups for path in group["paths"]]
    exact_needles = {path: path.replace("\\", "/").lower() for path in duplicate_paths}
    basenames: dict[str, list[str]] = defaultdict(list)
    for path in duplicate_paths:
        basenames[os.path.basename(path).lower()].append(path)

    refs = {
        path: {"exact_path_references": [], "basename_references": []}
        for path in duplicate_paths
    }

    for source_path in text_paths:
        try:
            text = Path(source_path).read_text(encoding="utf-8", errors="ignore").lower()
        except OSError:
            continue
        source_norm = source_path.replace("\\", "/")
        source_base = os.path.basename(source_path).lower()

        for target, needle in exact_needles.items():
            if target == source_path:
                continue
            if needle and needle in text:
                refs[target]["exact_path_references"].append(source_norm)

        # Basename evidence is weaker, but useful when references are relative.
        for basename, targets in basenames.items():
            if basename == source_base:
                continue
            if basename and basename in text:
                for target in targets:
                    if target != source_path:
                        refs[target]["basename_references"].append(source_norm)

    for item in refs.values():
        item["exact_path_references"] = sorted(set(item["exact_path_references"]))
        item["basename_references"] = sorted(set(item["basename_references"]))
    return refs


def main() -> int:
    args = parse_args()
    entries = tracked_entries()
    by_oid: dict[str, list[dict]] = defaultdict(list)
    for entry in entries:
        by_oid[entry["oid"]].append(entry)

    groups: list[dict] = []
    for oid, members in by_oid.items():
        if len(members) < 2:
            continue
        size = members[0]["size_bytes"]
        paths = sorted(member["path"] for member in members)
        kinds = sorted({asset_kind(path) for path in paths})
        groups.append({
            "oid": oid,
            "size_bytes_each": size,
            "size_mib_each": mib(size),
            "copy_count": len(paths),
            "duplicate_bytes_reclaimable": size * (len(paths) - 1),
            "duplicate_mib_reclaimable": mib(size * (len(paths) - 1)),
            "asset_kinds": kinds,
            "paths": paths,
        })

    groups.sort(key=lambda g: (g["duplicate_bytes_reclaimable"], g["size_bytes_each"]), reverse=True)
    large_threshold = int(args.large_mib * MIB)
    large_groups = [g for g in groups if g["size_bytes_each"] >= large_threshold]
    video_groups = [g for g in groups if "video" in g["asset_kinds"]]

    text_paths = candidate_text_files(entries, int(args.text_scan_mib * MIB))
    refs = reference_evidence(large_groups, text_paths)
    for group in large_groups:
        group["reference_evidence"] = {path: refs[path] for path in group["paths"]}

    duplicate_files = sum(g["copy_count"] for g in groups)
    reclaimable = sum(g["duplicate_bytes_reclaimable"] for g in groups)
    large_reclaimable = sum(g["duplicate_bytes_reclaimable"] for g in large_groups)
    video_reclaimable = sum(g["duplicate_bytes_reclaimable"] for g in video_groups)

    summary = {
        "tracked_file_count": len(entries),
        "unique_blob_count": len(by_oid),
        "duplicate_blob_group_count": len(groups),
        "duplicate_file_count": duplicate_files,
        "duplicate_mib_reclaimable_if_one_copy_kept_per_blob": mib(reclaimable),
        "large_threshold_mib": args.large_mib,
        "large_duplicate_group_count": len(large_groups),
        "large_duplicate_mib_reclaimable": mib(large_reclaimable),
        "video_duplicate_group_count": len(video_groups),
        "video_duplicate_mib_reclaimable": mib(video_reclaimable),
        "text_reference_scan_file_count": len(text_paths),
        "text_reference_scan_max_mib_each": args.text_scan_mib,
    }

    report = {
        "policy": {
            "mode": "audit_only",
            "auto_fix_count": 0,
            "meaning": "Same Git blob OID means byte-identical content. Reference scans are evidence only; no-reference does not mean unused.",
        },
        "summary": summary,
        "large_duplicate_groups": large_groups[: args.top],
        "all_duplicate_groups": groups[: args.top],
    }

    Path(args.json_output).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    md = [
        "# Yuhua duplicate tracked asset audit",
        "",
        "This report is read-only. Files sharing one Git blob OID are byte-for-byte identical.",
        "A missing text reference is not proof that a file is unused; runtime/dynamic references may exist.",
        "",
        "## Summary",
        "",
    ]
    for key, value in summary.items():
        md.append(f"- **{key}**: {value}")
    md += ["", "## Largest duplicate groups", "", "| Each | Copies | Potential duplicate MiB | Kind | Paths |", "|---:|---:|---:|---|---|"]
    for group in large_groups[: args.top]:
        paths = "<br>".join(group["paths"])
        kinds = ", ".join(group["asset_kinds"])
        md.append(f"| {group['size_mib_each']:.2f} MiB | {group['copy_count']} | {group['duplicate_mib_reclaimable']:.2f} | {kinds} | {paths} |")
    Path(args.markdown_output).write_text("\n".join(md) + "\n", encoding="utf-8")

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
