#!/usr/bin/env python3
"""Read-only audit of large tracked files that may inflate a GitHub Pages publish.

This audit is deliberately conservative. It does not call any asset unused and it
never deletes, moves, compresses, renames, or rewrites files. Instead it measures
Git blobs, groups them by directory/category, and checks whether large files have
obvious textual references from customer-site source files. The output is evidence
for a later human-reviewed slimming decision.
"""

from __future__ import annotations

import argparse
from collections import defaultdict
import json
from pathlib import Path
import subprocess
from urllib.parse import quote

MIB = 1024 * 1024
REFERENCE_EXTS = {".html", ".htm", ".css", ".js", ".mjs", ".json", ".xml"}
VIDEO_EXTS = {".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"}
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"}
DOCUMENT_EXTS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"}
ARCHIVE_EXTS = {".zip", ".rar", ".7z", ".tar", ".gz", ".tgz"}
AUDIO_EXTS = {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"}
FONT_EXTS = {".woff", ".woff2", ".ttf", ".otf", ".eot"}


def run_git(args: list[str], *, input_text: str | None = None) -> str:
    completed = subprocess.run(
        ["git", *args], input=input_text, text=True, stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError(
            f"git {' '.join(args)} failed with exit code {completed.returncode}: "
            f"{completed.stderr.strip()}"
        )
    return completed.stdout


def tracked_entries() -> list[tuple[str, str]]:
    raw = subprocess.run(
        ["git", "ls-files", "--stage", "-z"], stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, check=False,
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
        if stage != "0" or mode == "160000":
            continue
        entries.append((oid, path_bytes.decode("utf-8", errors="replace")))
    return entries


def blob_sizes(oids: list[str]) -> dict[str, int]:
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
        if len(parts) != 3 or parts[1] != "blob":
            continue
        try:
            sizes[parts[0]] = int(parts[2])
        except ValueError:
            pass
    return sizes


def category(path: str) -> str:
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


def top_level(path: str) -> str:
    parts = Path(path).parts
    return parts[0] if len(parts) > 1 else "(root)"


def summarize(items: list[dict]) -> dict:
    total = sum(item["bytes"] for item in items)
    return {"count": len(items), "bytes": total, "mib": round(total / MIB, 2)}


def load_reference_sources(paths: list[str], max_source_mib: float) -> list[tuple[str, str]]:
    sources: list[tuple[str, str]] = []
    limit = int(max_source_mib * MIB)
    for path in paths:
        p = Path(path)
        if p.suffix.lower() not in REFERENCE_EXTS or not p.is_file():
            continue
        try:
            if p.stat().st_size > limit:
                continue
            sources.append((path, p.read_text(encoding="utf-8", errors="ignore")))
        except OSError:
            continue
    return sources


def reference_evidence(asset_path: str, sources: list[tuple[str, str]]) -> dict:
    normalized = asset_path.replace("\\", "/")
    encoded = quote(normalized, safe="/-_.~")
    exact_needles = list(dict.fromkeys([
        normalized,
        f"/{normalized}",
        f"./{normalized}",
        encoded,
        f"/{encoded}",
    ]))
    basename = Path(normalized).name
    encoded_basename = quote(basename, safe="-_.~")

    exact_sources: list[str] = []
    basename_sources: list[str] = []
    for source_path, text in sources:
        if source_path == asset_path:
            continue
        if any(needle and needle in text for needle in exact_needles):
            exact_sources.append(source_path)
            continue
        if basename and (basename in text or encoded_basename in text):
            basename_sources.append(source_path)

    return {
        "exact_path_reference": bool(exact_sources),
        "exact_reference_sources": exact_sources[:10],
        "basename_reference": bool(basename_sources),
        "basename_reference_sources": basename_sources[:10],
        "reference_class": (
            "exact_path_reference"
            if exact_sources
            else "basename_only_reference"
            if basename_sources
            else "not_obviously_referenced"
        ),
    }


def markdown_report(report: dict, limit: int) -> str:
    summary = report["summary"]
    lines = [
        "# Yuhua Pages publish-scope audit",
        "",
        "> Read-only evidence report. No file is deleted, moved, compressed, renamed, or rewritten.",
        "> `not_obviously_referenced` is a heuristic finding, **not** proof that a file is unused.",
        "",
        "## Summary",
        "",
        f"- Tracked blobs: **{summary['tracked_file_count']}** / **{summary['tracked_mib']:.2f} MiB**",
        f"- Video: **{summary['video_file_count']}** / **{summary['video_mib']:.2f} MiB**",
        f"- Large files audited (>= {report['policy']['large_file_threshold_mib']} MiB): **{summary['large_file_count']}** / **{summary['large_file_mib']:.2f} MiB**",
        f"- Large files with no obvious source reference: **{summary['not_obviously_referenced_large_count']}** / **{summary['not_obviously_referenced_large_mib']:.2f} MiB**",
        f"- Automatic fixes performed: **{report['policy']['auto_fix_count']}**",
        "",
        "## Top-level directory totals",
        "",
        "| Directory | Files | MiB |",
        "|---|---:|---:|",
    ]
    for name, item in report["top_level_totals"].items():
        lines.append(f"| `{name}` | {item['count']} | {item['mib']:.2f} |")

    lines.extend([
        "",
        "## Largest files with no obvious source reference",
        "",
        "| MiB | Category | Path |",
        "|---:|---|---|",
    ])
    for item in report["not_obviously_referenced_large_files"][:limit]:
        safe_path = item["path"].replace("|", "\\|")
        lines.append(f"| {item['mib']:.2f} | {item['category']} | `{safe_path}` |")
    if not report["not_obviously_referenced_large_files"]:
        lines.append("| — | — | None |")

    lines.extend([
        "",
        "## Interpretation guardrails",
        "",
        "- Exact-path references are only evidence that a tracked text source mentions the asset.",
        "- Basename-only references can be ambiguous and are reported separately.",
        "- Missing textual references do not prove that an asset is safe to remove; dynamic/runtime references may exist.",
        "- Any deletion, migration, compression, or Pages publish-scope change requires a separate reviewed change.",
        "",
    ])
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json-output", default="pages_publish_scope_report.json")
    parser.add_argument("--markdown-output", default="pages_publish_scope_report.md")
    parser.add_argument("--large-mib", type=float, default=5.0)
    parser.add_argument("--max-source-mib", type=float, default=8.0)
    parser.add_argument("--top", type=int, default=100)
    args = parser.parse_args()
    if args.large_mib <= 0 or args.max_source_mib <= 0:
        parser.error("size thresholds must be positive")

    entries = tracked_entries()
    sizes = blob_sizes([oid for oid, _ in entries])
    all_paths = [path for _, path in entries]
    sources = load_reference_sources(all_paths, args.max_source_mib)

    files: list[dict] = []
    missing_size: list[str] = []
    for oid, path in entries:
        size = sizes.get(oid)
        if size is None:
            missing_size.append(path)
            continue
        files.append({
            "path": path,
            "oid": oid,
            "bytes": size,
            "mib": round(size / MIB, 2),
            "extension": Path(path).suffix.lower() or "(none)",
            "category": category(path),
            "top_level": top_level(path),
        })
    files.sort(key=lambda item: (-item["bytes"], item["path"].lower()))

    large_threshold = int(args.large_mib * MIB)
    large_files: list[dict] = []
    for item in files:
        if item["bytes"] < large_threshold:
            continue
        enriched = dict(item)
        enriched.update(reference_evidence(item["path"], sources))
        large_files.append(enriched)

    by_top: dict[str, list[dict]] = defaultdict(list)
    by_category: dict[str, list[dict]] = defaultdict(list)
    for item in files:
        by_top[item["top_level"]].append(item)
        by_category[item["category"]].append(item)

    top_totals = {
        key: summarize(value)
        for key, value in sorted(
            by_top.items(), key=lambda pair: (-sum(x["bytes"] for x in pair[1]), pair[0].lower())
        )
    }
    category_totals = {
        key: summarize(value)
        for key, value in sorted(
            by_category.items(), key=lambda pair: (-sum(x["bytes"] for x in pair[1]), pair[0])
        )
    }

    no_ref = [item for item in large_files if item["reference_class"] == "not_obviously_referenced"]
    videos = [item for item in files if item["category"] == "video"]
    tracked_bytes = sum(item["bytes"] for item in files)
    large_bytes = sum(item["bytes"] for item in large_files)
    no_ref_bytes = sum(item["bytes"] for item in no_ref)

    report = {
        "schema_version": 1,
        "measurement": "Git blob size at checked-out revision plus conservative text-reference evidence",
        "policy": {
            "mode": "audit_only",
            "auto_fix_count": 0,
            "large_file_threshold_mib": args.large_mib,
            "reference_source_extensions": sorted(REFERENCE_EXTS),
            "notes": [
                "No file is deleted, compressed, moved, renamed, or rewritten.",
                "not_obviously_referenced is a heuristic finding, not proof that a file is unused.",
                "Any publish-scope change requires a separate reviewed change.",
            ],
        },
        "summary": {
            "tracked_file_count": len(files),
            "tracked_bytes": tracked_bytes,
            "tracked_mib": round(tracked_bytes / MIB, 2),
            "reference_source_count": len(sources),
            "video_file_count": len(videos),
            "video_bytes": sum(item["bytes"] for item in videos),
            "video_mib": round(sum(item["bytes"] for item in videos) / MIB, 2),
            "large_file_count": len(large_files),
            "large_file_bytes": large_bytes,
            "large_file_mib": round(large_bytes / MIB, 2),
            "not_obviously_referenced_large_count": len(no_ref),
            "not_obviously_referenced_large_bytes": no_ref_bytes,
            "not_obviously_referenced_large_mib": round(no_ref_bytes / MIB, 2),
            "unmeasured_tracked_file_count": len(missing_size),
        },
        "top_level_totals": top_totals,
        "category_totals": category_totals,
        "large_files": large_files[: max(args.top, 0)],
        "not_obviously_referenced_large_files": no_ref[: max(args.top, 0)],
        "unmeasured_tracked_files": missing_size,
    }

    Path(args.json_output).write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    Path(args.markdown_output).write_text(markdown_report(report, max(args.top, 0)), encoding="utf-8")

    print(
        "Pages publish-scope audit: "
        f"{len(files)} tracked blobs / {tracked_bytes / MIB:.2f} MiB; "
        f"{len(large_files)} files >= {args.large_mib:g} MiB; "
        f"{len(no_ref)} large files have no obvious textual source reference."
    )
    for item in no_ref[:20]:
        print(f"  {item['mib']:9.2f} MiB  {item['category']:8s}  {item['path']}")
    print(f"JSON report: {args.json_output}")
    print(f"Markdown report: {args.markdown_output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
