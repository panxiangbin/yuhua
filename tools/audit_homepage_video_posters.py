#!/usr/bin/env python3
"""Audit homepage video poster weight, dimensions, and exact duplicates.

Read-only: this script never edits, compresses, deletes, or replaces media.
"""

from __future__ import annotations

import argparse
import json
import re
import statistics
import struct
import subprocess
from collections import defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "assets" / "videos.js"

POSTER_RE = re.compile(r'"poster"\s*:\s*"([^"]*)"')
HIGH_RES_MAX_EDGE = 1920
HIGH_RES_PIXELS = 2_500_000
LARGE_POSTER_BYTES = 512 * 1024
VERY_LARGE_POSTER_BYTES = 1024 * 1024


def git_tracked_entries() -> dict[str, dict[str, Any]]:
    proc = subprocess.run(
        ["git", "ls-tree", "-r", "-l", "-z", "HEAD"],
        cwd=ROOT,
        check=True,
        capture_output=True,
    )
    entries: dict[str, dict[str, Any]] = {}
    for raw in proc.stdout.split(b"\0"):
        if not raw:
            continue
        header, path_raw = raw.split(b"\t", 1)
        mode, obj_type, oid, size_raw = header.split(b" ", 3)
        path = path_raw.decode("utf-8", errors="surrogateescape")
        size = None if size_raw == b"-" else int(size_raw)
        entries[path] = {
            "mode": mode.decode(),
            "type": obj_type.decode(),
            "oid": oid.decode(),
            "size_bytes": size,
        }
    return entries


def jpeg_dimensions(data: bytes) -> tuple[int, int] | None:
    if not data.startswith(b"\xff\xd8"):
        return None
    sof_markers = {
        0xC0, 0xC1, 0xC2, 0xC3,
        0xC5, 0xC6, 0xC7,
        0xC9, 0xCA, 0xCB,
        0xCD, 0xCE, 0xCF,
    }
    pos = 2
    length = len(data)
    while pos < length:
        while pos < length and data[pos] != 0xFF:
            pos += 1
        while pos < length and data[pos] == 0xFF:
            pos += 1
        if pos >= length:
            break

        marker = data[pos]
        pos += 1
        if marker in (0xD8, 0xD9):
            continue
        if marker == 0xDA:
            break
        if pos + 2 > length:
            break

        segment_length = int.from_bytes(data[pos:pos + 2], "big")
        if segment_length < 2 or pos + segment_length > length:
            break

        if marker in sof_markers and segment_length >= 7:
            height = int.from_bytes(data[pos + 3:pos + 5], "big")
            width = int.from_bytes(data[pos + 5:pos + 7], "big")
            if width > 0 and height > 0:
                return width, height
            return None

        pos += segment_length
    return None


def image_dimensions(path: Path) -> tuple[int, int, str] | None:
    data = path.read_bytes()
    if data.startswith(b"\x89PNG\r\n\x1a\n") and len(data) >= 24:
        width, height = struct.unpack(">II", data[16:24])
        return width, height, "png"
    if data[:6] in (b"GIF87a", b"GIF89a") and len(data) >= 10:
        width, height = struct.unpack("<HH", data[6:10])
        return width, height, "gif"
    jpeg = jpeg_dimensions(data)
    if jpeg:
        return jpeg[0], jpeg[1], "jpeg"
    if len(data) >= 30 and data[:4] == b"RIFF" and data[8:12] == b"WEBP" and data[12:16] == b"VP8X":
        width = 1 + int.from_bytes(data[24:27], "little")
        height = 1 + int.from_bytes(data[27:30], "little")
        return width, height, "webp-vp8x"
    return None


def mib(value: int) -> float:
    return round(value / (1024 * 1024), 3)


def build_report() -> dict[str, Any]:
    manifest_text = MANIFEST.read_text(encoding="utf-8")
    refs = [ref.strip() for ref in POSTER_RE.findall(manifest_text)]
    non_empty_refs = [ref for ref in refs if ref]
    unique_refs = list(dict.fromkeys(non_empty_refs))
    tracked = git_tracked_entries()

    posters: list[dict[str, Any]] = []
    oid_groups: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for ref in unique_refs:
        git_entry = tracked.get(ref)
        local_path = ROOT / ref
        exists = bool(git_entry and git_entry["type"] == "blob" and local_path.is_file())
        item: dict[str, Any] = {
            "path": ref,
            "exists": exists,
            "size_bytes": int(git_entry["size_bytes"]) if git_entry and git_entry["size_bytes"] is not None else None,
            "git_oid": git_entry["oid"] if git_entry else None,
            "width": None,
            "height": None,
            "pixel_count": None,
            "format": None,
            "dimension_readable": False,
            "large_file_signal": False,
            "very_large_file_signal": False,
            "high_resolution_signal": False,
        }
        if exists:
            dimensions = image_dimensions(local_path)
            if dimensions:
                width, height, image_format = dimensions
                pixels = width * height
                item.update(
                    {
                        "width": width,
                        "height": height,
                        "pixel_count": pixels,
                        "format": image_format,
                        "dimension_readable": True,
                        "high_resolution_signal": (
                            max(width, height) > HIGH_RES_MAX_EDGE or pixels > HIGH_RES_PIXELS
                        ),
                    }
                )
            size = item["size_bytes"] or 0
            item["large_file_signal"] = size > LARGE_POSTER_BYTES
            item["very_large_file_signal"] = size > VERY_LARGE_POSTER_BYTES
            if item["git_oid"]:
                oid_groups[item["git_oid"]].append(item)
        posters.append(item)

    existing = [item for item in posters if item["exists"]]
    missing = [item for item in posters if not item["exists"]]
    readable = [item for item in existing if item["dimension_readable"]]
    sizes = [int(item["size_bytes"] or 0) for item in existing]

    duplicate_groups = []
    redundant_bytes = 0
    for oid, members in oid_groups.items():
        if len(members) < 2:
            continue
        size = int(members[0]["size_bytes"] or 0)
        redundant = size * (len(members) - 1)
        redundant_bytes += redundant
        duplicate_groups.append(
            {
                "git_oid": oid,
                "size_bytes_each": size,
                "copies": len(members),
                "materialized_redundant_bytes": redundant,
                "paths": [member["path"] for member in members],
            }
        )
    duplicate_groups.sort(key=lambda group: group["materialized_redundant_bytes"], reverse=True)

    high_res = sorted(
        [item for item in readable if item["high_resolution_signal"]],
        key=lambda item: int(item["pixel_count"] or 0),
        reverse=True,
    )
    large = sorted(
        [item for item in existing if item["large_file_signal"]],
        key=lambda item: int(item["size_bytes"] or 0),
        reverse=True,
    )

    total_bytes = sum(sizes)
    summary = {
        "manifest_poster_entry_count": len(refs),
        "non_empty_poster_entry_count": len(non_empty_refs),
        "unique_non_empty_poster_count": len(unique_refs),
        "existing_unique_poster_count": len(existing),
        "missing_unique_poster_count": len(missing),
        "dimension_readable_count": len(readable),
        "dimension_unreadable_count": len(existing) - len(readable),
        "total_existing_poster_bytes": total_bytes,
        "total_existing_poster_mib": mib(total_bytes),
        "average_poster_kib": round((sum(sizes) / len(sizes) / 1024), 2) if sizes else 0,
        "median_poster_kib": round((statistics.median(sizes) / 1024), 2) if sizes else 0,
        "over_512kib_count": sum(size > LARGE_POSTER_BYTES for size in sizes),
        "over_1mib_count": sum(size > VERY_LARGE_POSTER_BYTES for size in sizes),
        "high_resolution_signal_count": len(high_res),
        "exact_duplicate_blob_group_count": len(duplicate_groups),
        "materialized_duplicate_redundant_bytes": redundant_bytes,
        "materialized_duplicate_redundant_mib": mib(redundant_bytes),
    }

    return {
        "policy": {
            "mode": "audit_only",
            "auto_fix_count": 0,
            "notes": [
                "No poster, video, product data, specification, or page content is modified.",
                "Large-file and high-resolution flags are review signals only, not proof that an image should be compressed.",
                "Exact-duplicate metrics use Git blob OIDs; materialized redundant bytes describe duplicate published paths, not Git object-store savings.",
            ],
        },
        "thresholds": {
            "large_file_bytes": LARGE_POSTER_BYTES,
            "very_large_file_bytes": VERY_LARGE_POSTER_BYTES,
            "high_resolution_max_edge_px": HIGH_RES_MAX_EDGE,
            "high_resolution_pixel_count": HIGH_RES_PIXELS,
        },
        "summary": summary,
        "missing_posters": missing,
        "large_file_candidates": large,
        "high_resolution_candidates": high_res,
        "exact_duplicate_blob_groups": duplicate_groups,
        "top_by_size": sorted(existing, key=lambda item: int(item["size_bytes"] or 0), reverse=True)[:25],
        "top_by_pixel_count": sorted(readable, key=lambda item: int(item["pixel_count"] or 0), reverse=True)[:25],
        "posters": posters,
    }


def render_markdown(report: dict[str, Any]) -> str:
    s = report["summary"]
    t = report["thresholds"]
    lines = [
        "# 予华首页视频封面体积与分辨率审计",
        "",
        "> 只读审计：不压缩、不删除、不替换任何封面或视频，也不修改产品/规格书事实。",
        "",
        "## 汇总",
        "",
        f"- 视频清单中的 poster 字段：{s['manifest_poster_entry_count']} 条",
        f"- 非空 poster：{s['non_empty_poster_entry_count']} 条；去重后：{s['unique_non_empty_poster_count']} 个",
        f"- 已存在：{s['existing_unique_poster_count']} 个；缺失：{s['missing_unique_poster_count']} 个",
        f"- 可读取尺寸：{s['dimension_readable_count']} 个；尺寸无法读取：{s['dimension_unreadable_count']} 个",
        f"- 已存在封面总大小：{s['total_existing_poster_mib']} MiB",
        f"- 平均 / 中位大小：{s['average_poster_kib']} / {s['median_poster_kib']} KiB",
        f"- >512 KiB：{s['over_512kib_count']} 个；>1 MiB：{s['over_1mib_count']} 个",
        f"- 高分辨率审计信号：{s['high_resolution_signal_count']} 个（长边 > {t['high_resolution_max_edge_px']} px 或像素数 > {t['high_resolution_pixel_count']:,}）",
        f"- 字节级完全相同的封面组：{s['exact_duplicate_blob_group_count']} 组；重复发布路径理论占用：{s['materialized_duplicate_redundant_mib']} MiB",
        "",
        "这些阈值仅用于排序和人工复核，不能据此自动压缩或删除文件。",
        "",
        "## 体积最大的封面（前 25）",
        "",
        "| 大小 KiB | 尺寸 | 路径 |",
        "| ---: | ---: | --- |",
    ]
    for item in report["top_by_size"]:
        dims = (
            f"{item['width']}×{item['height']}"
            if item["dimension_readable"]
            else "未读取"
        )
        lines.append(f"| {(item['size_bytes'] or 0) / 1024:.1f} | {dims} | `{item['path']}` |")

    lines += [
        "",
        "## 分辨率最高的封面（前 25）",
        "",
        "| 像素 | 尺寸 | 大小 KiB | 路径 |",
        "| ---: | ---: | ---: | --- |",
    ]
    for item in report["top_by_pixel_count"]:
        lines.append(
            f"| {item['pixel_count']:,} | {item['width']}×{item['height']} | {(item['size_bytes'] or 0) / 1024:.1f} | `{item['path']}` |"
        )

    if report["exact_duplicate_blob_groups"]:
        lines += ["", "## 字节级完全重复封面", ""]
        for group in report["exact_duplicate_blob_groups"]:
            lines.append(
                f"- {group['copies']} 份 × {group['size_bytes_each'] / 1024:.1f} KiB；重复路径占用 {group['materialized_redundant_bytes'] / 1024:.1f} KiB"
            )
            for path in group["paths"]:
                lines.append(f"  - `{path}`")

    if report["missing_posters"]:
        lines += ["", "## 仍缺失的 poster 引用", ""]
        for item in report["missing_posters"]:
            lines.append(f"- `{item['path']}`")

    lines += [
        "",
        "## 安全边界",
        "",
        "- 报告不会把“大图”自动等同于“可压缩”，更不会替换原文件。",
        "- 缺失 poster 继续只报告；没有现有可靠素材证据时不猜测封面。",
        "- 后续若要优化，只应从明确可逆、视觉质量可验证的小批次开始，并单独走 PR。",
        "",
    ]
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", default="artifacts/homepage-video-posters.json")
    parser.add_argument("--md", default="artifacts/homepage-video-posters.md")
    args = parser.parse_args()

    report = build_report()
    json_path = ROOT / args.json
    md_path = ROOT / args.md
    json_path.parent.mkdir(parents=True, exist_ok=True)
    md_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    md_path.write_text(render_markdown(report), encoding="utf-8")
    print(json.dumps(report["summary"], ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
