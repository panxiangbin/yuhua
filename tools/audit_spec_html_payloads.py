#!/usr/bin/env python3
"""Read-only audit for generated specification HTML payload size.

The report focuses on specification pages referenced by specs_index.json and
quantifies embedded base64 image payloads without changing any product facts,
specification content, or files.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import statistics
import subprocess
from collections import defaultdict
from pathlib import Path
from typing import Any

KIB = 1024
MIB = 1024 * 1024
DATA_IMAGE_RE = re.compile(
    rb"data:(image/[A-Za-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)",
    re.IGNORECASE,
)
IMG_SRC_RE = re.compile(
    r"<img\b[^>]*\bsrc\s*=\s*([\"'])(.*?)\1",
    re.IGNORECASE | re.DOTALL,
)


def fmt_bytes(value: int) -> str:
    if value >= MIB:
        return f"{value / MIB:.2f} MiB"
    if value >= KIB:
        return f"{value / KIB:.1f} KiB"
    return f"{value} B"


def estimated_decoded_size(payload: bytes) -> int:
    """Estimate decoded bytes from a conventional unwrapped base64 payload."""
    if not payload:
        return 0
    padding = 2 if payload.endswith(b"==") else 1 if payload.endswith(b"=") else 0
    return max(0, (len(payload) * 3) // 4 - padding)


def tracked_spec_html() -> set[str]:
    raw = subprocess.run(
        ["git", "ls-files", "-z", "specs"],
        check=True,
        stdout=subprocess.PIPE,
    ).stdout
    return {
        item.decode("utf-8", "surrogateescape")
        for item in raw.split(b"\0")
        if item and item.lower().endswith(b".html")
    }


def percentile(values: list[int], fraction: float) -> int:
    if not values:
        return 0
    ordered = sorted(values)
    index = max(0, min(len(ordered) - 1, int(round((len(ordered) - 1) * fraction))))
    return ordered[index]


def load_index(path: Path) -> list[dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("specs_index.json must contain a JSON list")
    return data


def audit(index_path: Path) -> dict[str, Any]:
    entries = load_index(index_path)
    tracked_html = tracked_spec_html()

    indexed_pages: list[str] = []
    rows: list[dict[str, Any]] = []
    missing_pages: list[dict[str, Any]] = []
    payload_groups: dict[str, dict[str, Any]] = {}

    for index_row, entry in enumerate(entries, start=1):
        page = str(entry.get("page") or "").strip()
        if not page:
            missing_pages.append({
                "index_row": index_row,
                "model": str(entry.get("model") or ""),
                "title": str(entry.get("title") or ""),
                "page": "",
                "reason": "empty_page_path",
            })
            continue
        indexed_pages.append(page)
        path = Path(page)
        if not path.is_file():
            missing_pages.append({
                "index_row": index_row,
                "model": str(entry.get("model") or ""),
                "title": str(entry.get("title") or ""),
                "page": page,
                "reason": "missing_file",
            })
            continue

        raw = path.read_bytes()
        data_matches = list(DATA_IMAGE_RE.finditer(raw))
        data_uri_bytes = sum(len(match.group(0)) for match in data_matches)
        payload_bytes = sum(len(match.group(2)) for match in data_matches)
        decoded_bytes = sum(estimated_decoded_size(match.group(2)) for match in data_matches)

        mime_counts: dict[str, int] = defaultdict(int)
        for match in data_matches:
            mime = match.group(1).decode("ascii", "replace").lower()
            payload = match.group(2)
            mime_counts[mime] += 1
            digest = hashlib.sha256(payload).hexdigest()
            group = payload_groups.setdefault(
                digest,
                {
                    "sha256": digest,
                    "mime": mime,
                    "encoded_payload_bytes_each": len(payload),
                    "estimated_decoded_bytes_each": estimated_decoded_size(payload),
                    "occurrences": 0,
                    "pages": set(),
                },
            )
            group["occurrences"] += 1
            group["pages"].add(page)

        text = raw.decode("utf-8", errors="ignore")
        srcs = [match.group(2).strip() for match in IMG_SRC_RE.finditer(text)]
        local_image_src_count = sum(
            1
            for src in srcs
            if src
            and not src.lower().startswith("data:")
            and not src.startswith(("http://", "https://", "//"))
        )
        remote_image_src_count = sum(
            1 for src in srcs if src.startswith(("http://", "https://", "//"))
        )

        size = len(raw)
        rows.append({
            "index_row": index_row,
            "model": str(entry.get("model") or ""),
            "title": str(entry.get("title") or ""),
            "page": page,
            "html_bytes": size,
            "img_tag_count": len(srcs),
            "inline_image_count": len(data_matches),
            "inline_mime_counts": dict(sorted(mime_counts.items())),
            "inline_data_uri_bytes": data_uri_bytes,
            "inline_encoded_payload_bytes": payload_bytes,
            "estimated_inline_decoded_bytes": decoded_bytes,
            "inline_data_uri_ratio": round(data_uri_bytes / size, 6) if size else 0.0,
            "local_image_src_count": local_image_src_count,
            "remote_image_src_count": remote_image_src_count,
        })

    html_sizes = [row["html_bytes"] for row in rows]
    inline_sizes = [row["inline_data_uri_bytes"] for row in rows]
    inline_rows = [row for row in rows if row["inline_image_count"] > 0]

    duplicate_payloads: list[dict[str, Any]] = []
    for group in payload_groups.values():
        if group["occurrences"] < 2:
            continue
        duplicate_payloads.append({
            "sha256": group["sha256"],
            "mime": group["mime"],
            "encoded_payload_bytes_each": group["encoded_payload_bytes_each"],
            "estimated_decoded_bytes_each": group["estimated_decoded_bytes_each"],
            "occurrences": group["occurrences"],
            "page_count": len(group["pages"]),
            "pages": sorted(group["pages"]),
            "potential_repeated_encoded_bytes": (
                group["encoded_payload_bytes_each"] * (group["occurrences"] - 1)
            ),
        })
    duplicate_payloads.sort(
        key=lambda item: (-item["potential_repeated_encoded_bytes"], item["sha256"])
    )

    indexed_page_set = set(indexed_pages)
    unindexed_html = sorted(tracked_html - indexed_page_set)
    indexed_not_tracked = sorted(indexed_page_set - tracked_html)

    thresholds = [256 * KIB, 512 * KIB, 1 * MIB, 2 * MIB, 5 * MIB]
    report = {
        "policy": (
            "只读规格书 HTML 体积审计：仅测量 specs_index.json 已索引页面、内嵌 data:image;base64 负载、"
            "图片引用形式和完全相同的内嵌图片重复情况；不会压缩、删除、提取、重写或替换任何规格书、"
            "图片、型号、技术参数或下载文件。重复负载仅是后续治理线索，不代表可直接去重。"
        ),
        "index_entry_count": len(entries),
        "indexed_page_path_count": len(indexed_pages),
        "indexed_unique_page_count": len(indexed_page_set),
        "audited_existing_page_count": len(rows),
        "missing_indexed_page_count": len(missing_pages),
        "missing_indexed_pages": missing_pages,
        "tracked_spec_html_count": len(tracked_html),
        "unindexed_spec_html_count": len(unindexed_html),
        "unindexed_spec_html": unindexed_html,
        "indexed_but_untracked_html_count": len(indexed_not_tracked),
        "indexed_but_untracked_html": indexed_not_tracked,
        "indexed_html_total_bytes": sum(html_sizes),
        "indexed_html_average_bytes": int(statistics.mean(html_sizes)) if html_sizes else 0,
        "indexed_html_median_bytes": int(statistics.median(html_sizes)) if html_sizes else 0,
        "indexed_html_p95_bytes": percentile(html_sizes, 0.95),
        "indexed_html_max_bytes": max(html_sizes, default=0),
        "pages_with_inline_images": len(inline_rows),
        "pages_without_inline_images": len(rows) - len(inline_rows),
        "total_inline_image_occurrences": sum(row["inline_image_count"] for row in rows),
        "total_inline_data_uri_bytes": sum(inline_sizes),
        "total_inline_encoded_payload_bytes": sum(
            row["inline_encoded_payload_bytes"] for row in rows
        ),
        "estimated_total_inline_decoded_bytes": sum(
            row["estimated_inline_decoded_bytes"] for row in rows
        ),
        "pages_with_local_image_sources": sum(row["local_image_src_count"] > 0 for row in rows),
        "pages_with_remote_image_sources": sum(row["remote_image_src_count"] > 0 for row in rows),
        "html_size_threshold_counts": {
            str(threshold): sum(row["html_bytes"] >= threshold for row in rows)
            for threshold in thresholds
        },
        "inline_data_uri_threshold_counts": {
            str(threshold): sum(row["inline_data_uri_bytes"] >= threshold for row in rows)
            for threshold in thresholds
        },
        "duplicate_inline_payload_group_count": len(duplicate_payloads),
        "potential_repeated_inline_encoded_bytes": sum(
            group["potential_repeated_encoded_bytes"] for group in duplicate_payloads
        ),
        "largest_pages": sorted(rows, key=lambda row: (-row["html_bytes"], row["page"]))[:50],
        "largest_inline_payload_pages": sorted(
            inline_rows,
            key=lambda row: (-row["inline_data_uri_bytes"], row["page"]),
        )[:50],
        "duplicate_inline_payload_groups": duplicate_payloads[:100],
    }

    assert report["audited_existing_page_count"] + report["missing_indexed_page_count"] == report["index_entry_count"]
    assert report["indexed_unique_page_count"] <= report["indexed_page_path_count"]
    assert report["indexed_html_total_bytes"] == sum(row["html_bytes"] for row in rows)
    assert report["total_inline_data_uri_bytes"] == sum(row["inline_data_uri_bytes"] for row in rows)
    assert report["total_inline_image_occurrences"] == sum(row["inline_image_count"] for row in rows)
    assert report["pages_with_inline_images"] + report["pages_without_inline_images"] == len(rows)
    assert report["potential_repeated_inline_encoded_bytes"] == sum(
        group["potential_repeated_encoded_bytes"] for group in duplicate_payloads
    )
    return report


def markdown(report: dict[str, Any]) -> str:
    threshold_counts = report["html_size_threshold_counts"]
    inline_threshold_counts = report["inline_data_uri_threshold_counts"]
    lines = [
        "# 予华规格书 HTML 负载体积审计",
        "",
        "> 只读审计：不压缩、不删除、不提取、不改写任何规格书内容或产品事实。",
        "",
        "## 汇总",
        "",
        f'- 规格书索引记录：{report["index_entry_count"]} 条；实际读取页面：{report["audited_existing_page_count"]} 个',
        f'- 索引缺失页面：{report["missing_indexed_page_count"]} 个；索引外 tracked HTML：{report["unindexed_spec_html_count"]} 个',
        f'- 已索引 HTML 总体积：{fmt_bytes(report["indexed_html_total_bytes"])}；平均 {fmt_bytes(report["indexed_html_average_bytes"])}；中位数 {fmt_bytes(report["indexed_html_median_bytes"])}；P95 {fmt_bytes(report["indexed_html_p95_bytes"])}；最大 {fmt_bytes(report["indexed_html_max_bytes"])}',
        f'- 含内嵌 base64 图片页面：{report["pages_with_inline_images"]} 个；内嵌图片出现次数：{report["total_inline_image_occurrences"]}',
        f'- 内嵌 data URI 总字符负载：{fmt_bytes(report["total_inline_data_uri_bytes"])}；估算解码后图片数据：{fmt_bytes(report["estimated_total_inline_decoded_bytes"])}',
        f'- 完全相同的内嵌图片负载重复组：{report["duplicate_inline_payload_group_count"]} 组；理论重复编码负载：{fmt_bytes(report["potential_repeated_inline_encoded_bytes"])}（仅为审计线索）',
        f'- 使用本地图片路径的页面：{report["pages_with_local_image_sources"]} 个；使用远程图片 URL 的页面：{report["pages_with_remote_image_sources"]} 个',
        "",
        "## 页面体积阈值",
        "",
        "| 阈值 | HTML 页面达到阈值 | 其中内嵌 data URI 达到阈值 |",
        "|---:|---:|---:|",
    ]
    for threshold in [256 * KIB, 512 * KIB, 1 * MIB, 2 * MIB, 5 * MIB]:
        key = str(threshold)
        lines.append(
            f'| {fmt_bytes(threshold)} | {threshold_counts[key]} | {inline_threshold_counts[key]} |'
        )

    lines.extend([
        "",
        "## 最大规格书页面（前 30）",
        "",
        "| 页面 | 型号 | HTML | 内嵌图片 | data URI 负载 | 占页面 |",
        "|---|---|---:|---:|---:|---:|",
    ])
    for row in report["largest_pages"][:30]:
        page = row["page"].replace("|", "\\|")
        model = row["model"].replace("|", "\\|") or "—"
        lines.append(
            f'| `{page}` | {model} | {fmt_bytes(row["html_bytes"])} | {row["inline_image_count"]} | '
            f'{fmt_bytes(row["inline_data_uri_bytes"])} | {row["inline_data_uri_ratio"]:.1%} |'
        )

    lines.extend([
        "",
        "## 最大内嵌图片负载页面（前 30）",
        "",
        "| 页面 | 型号 | 内嵌图片 | data URI 负载 | 估算解码图片 |",
        "|---|---|---:|---:|---:|",
    ])
    for row in report["largest_inline_payload_pages"][:30]:
        page = row["page"].replace("|", "\\|")
        model = row["model"].replace("|", "\\|") or "—"
        lines.append(
            f'| `{page}` | {model} | {row["inline_image_count"]} | {fmt_bytes(row["inline_data_uri_bytes"])} | '
            f'{fmt_bytes(row["estimated_inline_decoded_bytes"])} |'
        )

    lines.extend(["", "## 完全相同的内嵌图片负载重复组（前 20）", ""])
    groups = report["duplicate_inline_payload_groups"][:20]
    if not groups:
        lines.append("未发现。")
    else:
        for idx, group in enumerate(groups, start=1):
            lines.append(
                f'### {idx}. {group["mime"]} · {group["occurrences"]} 次 · '
                f'{fmt_bytes(group["encoded_payload_bytes_each"])} / 次 · '
                f'理论重复 {fmt_bytes(group["potential_repeated_encoded_bytes"])}'
            )
            for page in group["pages"][:10]:
                lines.append(f'- `{page}`')
            if group["page_count"] > 10:
                lines.append(f'- …另有 {group["page_count"] - 10} 个页面')
            lines.append("")

    if report["missing_indexed_pages"]:
        lines.extend(["## 索引缺失页面", ""])
        for item in report["missing_indexed_pages"]:
            lines.append(
                f'- 第 {item["index_row"]} 条 · {item["model"] or "—"} · `{item["page"] or "(empty)"}` · {item["reason"]}'
            )
        lines.append("")

    lines.extend([
        "## 解释边界",
        "",
        "- data URI / base64 体积高仅说明页面传输和 HTML 解析负载较高，不等于资料内容错误。",
        "- 重复图片哈希只说明内嵌编码内容完全一致，不代表可直接删除；若后续外置图片，仍需验证页面相对路径、缓存策略、GitHub Pages 部署和历史深链。",
        "- 本报告不会修改任何型号、技术参数、价格、规格书正文或下载文件。",
    ])
    return "\n".join(lines).rstrip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--index", default="specs_index.json")
    parser.add_argument("--json", dest="json_path", default="spec_html_payload_audit.json")
    parser.add_argument("--markdown", dest="markdown_path", default="spec_html_payload_audit.md")
    args = parser.parse_args()

    report = audit(Path(args.index))
    Path(args.json_path).write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    Path(args.markdown_path).write_text(markdown(report), encoding="utf-8")

    print("=== 予华规格书 HTML 负载体积审计（只读） ===")
    print(f'索引: {report["index_entry_count"]}; 实际页面: {report["audited_existing_page_count"]}; 缺失: {report["missing_indexed_page_count"]}')
    print(f'规格书 HTML 总体积: {fmt_bytes(report["indexed_html_total_bytes"])}; 最大: {fmt_bytes(report["indexed_html_max_bytes"])}; P95: {fmt_bytes(report["indexed_html_p95_bytes"])}')
    print(f'含 base64 图片页面: {report["pages_with_inline_images"]}; 图片出现次数: {report["total_inline_image_occurrences"]}; data URI 总负载: {fmt_bytes(report["total_inline_data_uri_bytes"])}')
    print(f'重复内嵌图片组: {report["duplicate_inline_payload_group_count"]}; 理论重复编码负载: {fmt_bytes(report["potential_repeated_inline_encoded_bytes"])}')
    print("注意：本工具只生成审计报告，不改写任何规格书或产品数据。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
