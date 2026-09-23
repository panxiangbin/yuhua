#!/usr/bin/env python3
"""Read-only feasibility audit for deduplicating inline specification images.

This tool does not extract, rewrite, compress, delete, or replace specification
content. It only identifies exact duplicate Base64 image payloads and classifies
whether their current HTML placement is mechanically suitable for a future,
separately reviewed shared-file experiment.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import posixpath
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

DATA_IMAGE_RE = re.compile(
    rb"data:(image/[A-Za-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)", re.IGNORECASE
)
IMG_TAG_RE = re.compile(rb"<img\b[^>]*>", re.IGNORECASE | re.DOTALL)
SRC_ATTR_RE = re.compile(
    rb"\bsrc\s*=\s*(?:\"([^\"]*)\"|'([^']*)'|([^\s>]+))",
    re.IGNORECASE | re.DOTALL,
)
DATA_IMAGE_VALUE_RE = re.compile(
    rb"^data:(image/[A-Za-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$", re.IGNORECASE
)

MIME_EXTENSIONS = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
}
SHARED_DIR = "assets/spec-inline-shared"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=".", help="Repository root")
    parser.add_argument(
        "--json", default="spec_inline_externalization_audit.json", help="JSON output path"
    )
    parser.add_argument(
        "--markdown",
        default="spec_inline_externalization_audit.md",
        help="Markdown output path",
    )
    return parser.parse_args()


def digest_payload(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def display_mib(value: int) -> str:
    return f"{value / (1024 * 1024):.2f} MiB"


def safe_relative_reference(page_path: str, target_path: str) -> tuple[str, bool]:
    page_dir = posixpath.dirname(page_path)
    relative = posixpath.relpath(target_path, page_dir or ".")
    resolved = posixpath.normpath(posixpath.join(page_dir, relative))
    return relative, resolved == target_path


def audit(root: Path) -> dict[str, Any]:
    spec_root = root / "specs"
    pages = sorted(p for p in spec_root.rglob("*.html") if p.is_file())

    groups: dict[str, dict[str, Any]] = {}
    total_inline_occurrences = 0
    total_img_src_occurrences = 0

    for path in pages:
        raw = path.read_bytes()
        rel = path.relative_to(root).as_posix()

        # Count every Base64 image data URI, regardless of HTML context.
        for match in DATA_IMAGE_RE.finditer(raw):
            mime = match.group(1).decode("ascii", "replace").lower()
            payload = match.group(2)
            digest = digest_payload(payload)
            group = groups.setdefault(
                digest,
                {
                    "sha256": digest,
                    "mimes": set(),
                    "encoded_payload_bytes": len(payload),
                    "occurrences": 0,
                    "img_src_occurrences": 0,
                    "page_occurrences": defaultdict(int),
                    "img_src_page_occurrences": defaultdict(int),
                },
            )
            group["mimes"].add(mime)
            group["occurrences"] += 1
            group["page_occurrences"][rel] += 1
            total_inline_occurrences += 1

        # Separately prove which occurrences are actually an <img src="data:...">.
        for tag_match in IMG_TAG_RE.finditer(raw):
            tag = tag_match.group(0)
            src_match = SRC_ATTR_RE.search(tag)
            if not src_match:
                continue
            src = next((value for value in src_match.groups() if value is not None), b"")
            data_match = DATA_IMAGE_VALUE_RE.match(src)
            if not data_match:
                continue
            mime = data_match.group(1).decode("ascii", "replace").lower()
            payload = data_match.group(2)
            digest = digest_payload(payload)
            group = groups.get(digest)
            if group is None:
                # Defensive only: the general data URI scan above should have found it.
                continue
            group["mimes"].add(mime)
            group["img_src_occurrences"] += 1
            group["img_src_page_occurrences"][rel] += 1
            total_img_src_occurrences += 1

    duplicate_groups: list[dict[str, Any]] = []
    strict_candidates: list[dict[str, Any]] = []
    rejection_reasons = Counter()

    for digest, raw_group in groups.items():
        if raw_group["occurrences"] < 2:
            continue

        mimes = sorted(raw_group["mimes"])
        pages_for_group = sorted(raw_group["page_occurrences"])
        non_img_src_occurrences = raw_group["occurrences"] - raw_group["img_src_occurrences"]
        reasons: list[str] = []

        if len(mimes) != 1:
            reasons.append("mime_mismatch")
        extension = MIME_EXTENSIONS.get(mimes[0]) if len(mimes) == 1 else None
        if len(mimes) == 1 and extension is None:
            reasons.append("unsupported_mime")
        if non_img_src_occurrences:
            reasons.append("non_img_src_occurrence")
        if any(not p.startswith("specs/") or not p.endswith(".html") for p in pages_for_group):
            reasons.append("path_outside_specs")

        candidate_path = None
        relative_references: dict[str, str] = {}
        if extension:
            candidate_path = f"{SHARED_DIR}/{digest}.{extension}"
            for page in pages_for_group:
                relative, ok = safe_relative_reference(page, candidate_path)
                relative_references[page] = relative
                if not ok and "relative_path_resolution_failed" not in reasons:
                    reasons.append("relative_path_resolution_failed")

        strict = not reasons
        for reason in reasons:
            rejection_reasons[reason] += 1

        page_occurrences = dict(sorted(raw_group["page_occurrences"].items()))
        img_src_page_occurrences = dict(sorted(raw_group["img_src_page_occurrences"].items()))
        encoded_bytes = raw_group["encoded_payload_bytes"]
        row = {
            "sha256": digest,
            "mimes": mimes,
            "encoded_payload_bytes_each": encoded_bytes,
            "occurrences": raw_group["occurrences"],
            "page_count": len(pages_for_group),
            "pages": pages_for_group,
            "page_occurrences": page_occurrences,
            "img_src_occurrences": raw_group["img_src_occurrences"],
            "img_src_page_occurrences": img_src_page_occurrences,
            "non_img_src_occurrences": non_img_src_occurrences,
            "pages_with_multiple_occurrences": [
                page for page, count in page_occurrences.items() if count > 1
            ],
            "potential_repeated_encoded_bytes": encoded_bytes * (raw_group["occurrences"] - 1),
            "strict_mechanical_candidate": strict,
            "rejection_reasons": reasons,
            "candidate_shared_path": candidate_path,
            "candidate_relative_references": relative_references,
        }
        duplicate_groups.append(row)
        if strict:
            strict_candidates.append(row)

    duplicate_groups.sort(
        key=lambda row: (row["potential_repeated_encoded_bytes"], row["occurrences"]),
        reverse=True,
    )
    strict_candidates.sort(
        key=lambda row: (row["potential_repeated_encoded_bytes"], row["occurrences"]),
        reverse=True,
    )

    total_repeated = sum(row["potential_repeated_encoded_bytes"] for row in duplicate_groups)
    strict_repeated = sum(row["potential_repeated_encoded_bytes"] for row in strict_candidates)

    return {
        "policy": (
            "只读审计：不会提取、压缩、删除、重写、替换任何规格书或图片。"
            "strict_mechanical_candidate 仅表示当前字节与 HTML 引用位置满足机械外置前提，"
            "不代表已获准修改资料，也不证明各页面语义用途相同；正式改动前仍需逐页人工核对与渲染验证。"
        ),
        "tracked_spec_html_count": len(pages),
        "total_inline_image_occurrences": total_inline_occurrences,
        "inline_img_src_occurrence_count": total_img_src_occurrences,
        "inline_non_img_src_occurrence_count": total_inline_occurrences - total_img_src_occurrences,
        "exact_duplicate_payload_group_count": len(duplicate_groups),
        "strict_mechanical_candidate_group_count": len(strict_candidates),
        "rejected_duplicate_group_count": len(duplicate_groups) - len(strict_candidates),
        "rejection_reason_counts": dict(sorted(rejection_reasons.items())),
        "potential_repeated_encoded_bytes_all_duplicate_groups": total_repeated,
        "potential_repeated_encoded_bytes_strict_candidates": strict_repeated,
        "duplicate_groups": duplicate_groups,
        "strict_candidates": strict_candidates,
    }


def markdown(report: dict[str, Any]) -> str:
    lines = [
        "# 规格书内嵌图片外置可行性审计",
        "",
        "> 本报告只做字节级与 HTML 引用位置审计，不修改任何规格书、图片或产品事实。",
        "",
        "## 汇总",
        "",
        f"- 已跟踪规格书 HTML：{report['tracked_spec_html_count']}",
        f"- Base64 图片出现次数：{report['total_inline_image_occurrences']}",
        f"- 其中位于 `<img src>`：{report['inline_img_src_occurrence_count']}",
        f"- 非 `<img src>` 上下文：{report['inline_non_img_src_occurrence_count']}",
        f"- 精确重复 payload 组：{report['exact_duplicate_payload_group_count']}",
        f"- 满足严格机械前提的候选组：{report['strict_mechanical_candidate_group_count']}",
        f"- 被机械规则拒绝的重复组：{report['rejected_duplicate_group_count']}",
        "- 全部重复组的重复编码字节上限参考："
        f"{display_mib(report['potential_repeated_encoded_bytes_all_duplicate_groups'])}",
        "- 严格候选组的重复编码字节上限参考："
        f"{display_mib(report['potential_repeated_encoded_bytes_strict_candidates'])}",
        "",
        "## 严格机械候选（按重复编码体积排序）",
        "",
    ]

    candidates = report["strict_candidates"][:20]
    if not candidates:
        lines.append("当前没有重复组同时满足全部机械前提。")
    else:
        lines.append("| SHA256 | MIME | 次数 / 页面 | 重复编码字节参考 | 候选共享路径 |")
        lines.append("|---|---|---:|---:|---|")
        for row in candidates:
            lines.append(
                "| `{}…` | {} | {} / {} | {} | `{}` |".format(
                    row["sha256"][:16],
                    ", ".join(row["mimes"]),
                    row["occurrences"],
                    row["page_count"],
                    display_mib(row["potential_repeated_encoded_bytes"]),
                    row["candidate_shared_path"],
                )
            )

    if report["rejection_reason_counts"]:
        lines.extend(["", "## 机械拒绝原因", ""])
        for reason, count in report["rejection_reason_counts"].items():
            lines.append(f"- `{reason}`：{count} 组")

    if candidates:
        top = candidates[0]
        lines.extend(
            [
                "",
                "## 最大严格候选组逐页引用",
                "",
                f"- SHA256：`{top['sha256']}`",
                f"- MIME：{', '.join(top['mimes'])}",
                f"- 出现次数 / 页面数：{top['occurrences']} / {top['page_count']}",
                f"- 候选共享路径：`{top['candidate_shared_path']}`",
                "",
            ]
        )
        for page in top["pages"]:
            lines.append(
                f"- `{page}`：出现 {top['page_occurrences'][page]} 次；"
                f"候选相对引用 `{top['candidate_relative_references'][page]}`"
            )

    lines.extend(
        [
            "",
            "## 边界说明",
            "",
            "- 精确重复只说明 Base64 payload 字节完全一致，不自动证明文档语义用途一致。",
            "- `strict_mechanical_candidate` 只验证：单一受支持 MIME、全部出现都位于 `<img src>`、"
            "路径位于 `specs/`，且候选相对路径可逆解析。",
            "- 本报告不会创建共享图片，也不会修改任何 HTML。后续若试点，必须逐页检查视觉、"
            "相对路径、GitHub Pages 发布、缓存以及回滚能力。",
        ]
    )
    return "\n".join(lines) + "\n"


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()
    report = audit(root)

    json_path = Path(args.json)
    md_path = Path(args.markdown)
    json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    md_path.write_text(markdown(report), encoding="utf-8")

    print(
        "spec inline externalization audit: "
        f"pages={report['tracked_spec_html_count']} "
        f"inline={report['total_inline_image_occurrences']} "
        f"duplicates={report['exact_duplicate_payload_group_count']} "
        f"strict_candidates={report['strict_mechanical_candidate_group_count']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
