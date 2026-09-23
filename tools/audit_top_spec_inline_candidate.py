#!/usr/bin/env python3
"""Read-only context and size audit for the largest inline-image deduplication candidate.

The feasibility audit proves only byte identity and mechanically safe HTML placement.
This follow-up inspects the largest strict candidate more closely: image metadata,
per-occurrence non-src attributes, nearby text context, and a no-write size projection
for replacing the inline data URI with one shared binary file. It does not modify any
specification page, image, product fact, or source dataset.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import html
import json
import re
import struct
from collections import Counter
from pathlib import Path
from typing import Any

IMG_TAG_RE = re.compile(rb"<img\b[^>]*>", re.IGNORECASE | re.DOTALL)
SRC_ATTR_RE = re.compile(
    rb"\bsrc\s*=\s*(?:\"([^\"]*)\"|'([^']*)'|([^\s>]+))",
    re.IGNORECASE | re.DOTALL,
)
DATA_IMAGE_VALUE_RE = re.compile(
    rb"^data:(image/[A-Za-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$",
    re.IGNORECASE,
)
TITLE_RE = re.compile(rb"<title\b[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)
TAG_RE_TEXT = re.compile(r"<[^>]+>", re.DOTALL)
SPACE_RE = re.compile(r"\s+")
ATTR_RE_TEXT = re.compile(
    r"([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*(?:\"([^\"]*)\"|'([^']*)'|([^\s>]+))",
    re.DOTALL,
)
CONTEXT_WINDOW_BYTES = 700
CONTEXT_TEXT_LIMIT = 220


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=".", help="Repository root")
    parser.add_argument(
        "--feasibility-json",
        default="spec_inline_externalization_audit.json",
        help="Input feasibility audit JSON",
    )
    parser.add_argument(
        "--json",
        default="spec_inline_top_candidate_context_audit.json",
        help="JSON output path",
    )
    parser.add_argument(
        "--markdown",
        default="spec_inline_top_candidate_context_audit.md",
        help="Markdown output path",
    )
    return parser.parse_args()


def display_kib(value: int) -> str:
    return f"{value / 1024:.1f} KiB"


def display_mib(value: int) -> str:
    return f"{value / (1024 * 1024):.2f} MiB"


def clean_text(raw: bytes, *, tail: bool = False) -> str:
    text = raw.decode("utf-8", "ignore")
    text = TAG_RE_TEXT.sub(" ", text)
    text = html.unescape(text)
    text = SPACE_RE.sub(" ", text).strip()
    if len(text) <= CONTEXT_TEXT_LIMIT:
        return text
    return text[-CONTEXT_TEXT_LIMIT:] if tail else text[:CONTEXT_TEXT_LIMIT]


def page_title(raw: bytes) -> str:
    match = TITLE_RE.search(raw)
    return clean_text(match.group(1)) if match else ""


def parse_attrs_without_src(tag: bytes) -> dict[str, str]:
    src_match = SRC_ATTR_RE.search(tag)
    safe_tag = tag
    if src_match:
        safe_tag = tag[: src_match.start()] + b'src="[inline-image]"' + tag[src_match.end() :]
    text = safe_tag.decode("utf-8", "ignore")
    attrs: dict[str, str] = {}
    for match in ATTR_RE_TEXT.finditer(text):
        name = match.group(1).lower()
        value = next((v for v in match.groups()[1:] if v is not None), "")
        if name == "src":
            continue
        attrs[name] = SPACE_RE.sub(" ", html.unescape(value)).strip()
    return dict(sorted(attrs.items()))


def png_metadata(decoded: bytes) -> dict[str, Any]:
    signature = b"\x89PNG\r\n\x1a\n"
    if not decoded.startswith(signature) or len(decoded) < 33:
        return {}
    if decoded[12:16] != b"IHDR":
        return {}
    width, height, bit_depth, color_type, compression, filter_method, interlace = struct.unpack(
        ">IIBBBBB", decoded[16:29]
    )
    return {
        "format": "png",
        "width": width,
        "height": height,
        "bit_depth": bit_depth,
        "color_type": color_type,
        "compression": compression,
        "filter": filter_method,
        "interlace": interlace,
    }


def digest_dict(value: dict[str, str]) -> str:
    serialized = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def audit(root: Path, feasibility_path: Path) -> dict[str, Any]:
    feasibility = json.loads(feasibility_path.read_text(encoding="utf-8"))
    candidates = feasibility.get("strict_candidates", [])
    if not candidates:
        raise RuntimeError("No strict mechanical externalization candidate is available")

    top = candidates[0]
    target_sha = top["sha256"]
    target_pages = list(top["pages"])
    expected_occurrences = int(top["occurrences"])
    candidate_refs = top["candidate_relative_references"]

    details: list[dict[str, Any]] = []
    decoded_payload: bytes | None = None
    decoded_sha = ""
    encoded_payload: bytes | None = None
    mime_seen: set[str] = set()
    current_total = 0
    projected_pages_total = 0

    for page in target_pages:
        path = root / page
        raw = path.read_bytes()
        current_total += len(raw)
        title = page_title(raw)
        page_savings = 0
        page_occurrence_index = 0
        relative_ref = candidate_refs[page]

        for tag_match in IMG_TAG_RE.finditer(raw):
            tag = tag_match.group(0)
            src_match = SRC_ATTR_RE.search(tag)
            if not src_match:
                continue
            src = next((v for v in src_match.groups() if v is not None), b"")
            data_match = DATA_IMAGE_VALUE_RE.match(src)
            if not data_match:
                continue
            mime = data_match.group(1).decode("ascii", "replace").lower()
            payload = data_match.group(2)
            sha = hashlib.sha256(payload).hexdigest()
            if sha != target_sha:
                continue

            page_occurrence_index += 1
            mime_seen.add(mime)
            if encoded_payload is None:
                encoded_payload = payload
                decoded_payload = base64.b64decode(payload, validate=True)
                decoded_sha = hashlib.sha256(decoded_payload).hexdigest()
            else:
                if payload != encoded_payload:
                    raise AssertionError("Target digest collision with non-identical encoded payload")

            # Replacing only the data URI value preserves the surrounding HTML tag/attributes.
            uri_bytes = len(src)
            ref_bytes = len(relative_ref.encode("utf-8"))
            page_savings += uri_bytes - ref_bytes

            before = raw[max(0, tag_match.start() - CONTEXT_WINDOW_BYTES) : tag_match.start()]
            after = raw[tag_match.end() : tag_match.end() + CONTEXT_WINDOW_BYTES]
            attrs = parse_attrs_without_src(tag)
            before_text = clean_text(before, tail=True)
            after_text = clean_text(after, tail=False)
            context_signature = hashlib.sha256(
                (before_text + "\n[IMAGE]\n" + after_text).encode("utf-8")
            ).hexdigest()

            details.append(
                {
                    "page": page,
                    "page_title": title,
                    "page_occurrence_index": page_occurrence_index,
                    "line": raw.count(b"\n", 0, tag_match.start()) + 1,
                    "mime": mime,
                    "encoded_payload_sha256": sha,
                    "non_src_attributes": attrs,
                    "attribute_signature": digest_dict(attrs),
                    "context_before": before_text,
                    "context_after": after_text,
                    "context_signature": context_signature,
                    "relative_reference_if_externalized": relative_ref,
                    "data_uri_bytes": uri_bytes,
                    "relative_reference_bytes": ref_bytes,
                    "projected_page_bytes_saved": uri_bytes - ref_bytes,
                }
            )

        projected_pages_total += len(raw) - page_savings

    if len(details) != expected_occurrences:
        raise AssertionError(
            f"Top candidate occurrence mismatch: expected {expected_occurrences}, found {len(details)}"
        )
    if encoded_payload is None or decoded_payload is None:
        raise AssertionError("Top candidate payload could not be recovered")

    attr_counts = Counter(row["attribute_signature"] for row in details)
    context_counts = Counter(row["context_signature"] for row in details)
    shared_file_bytes = len(decoded_payload)
    projected_combined = projected_pages_total + shared_file_bytes
    net_reduction = current_total - projected_combined

    image_metadata = png_metadata(decoded_payload)
    if not image_metadata:
        image_metadata = {"format": "unparsed"}

    return {
        "policy": (
            "只读审计：不会提取、写入、压缩、删除、重写或替换任何规格书或图片。"
            "本报告只对最大严格候选做字节、标签属性、邻近文本与体积投影检查；"
            "即使字节和属性完全一致，也不证明各页面语义用途一致，更不代表已获准外置。"
        ),
        "source_feasibility_report": feasibility_path.as_posix(),
        "selected_candidate_sha256": target_sha,
        "candidate_shared_path": top["candidate_shared_path"],
        "mimes": sorted(mime_seen),
        "page_count": len(target_pages),
        "occurrence_count": len(details),
        "expected_occurrence_count": expected_occurrences,
        "encoded_payload_bytes_each": len(encoded_payload),
        "decoded_image_bytes": shared_file_bytes,
        "decoded_image_sha256": decoded_sha,
        "image_metadata": image_metadata,
        "attribute_signature_count": len(attr_counts),
        "attribute_signature_occurrence_counts": dict(sorted(attr_counts.items())),
        "context_signature_count": len(context_counts),
        "context_signature_occurrence_counts": dict(sorted(context_counts.items())),
        "current_affected_html_bytes": current_total,
        "projected_affected_html_bytes_after_reference_swap": projected_pages_total,
        "projected_one_shared_file_bytes": shared_file_bytes,
        "projected_combined_bytes_with_one_shared_file": projected_combined,
        "projected_net_bytes_reduction": net_reduction,
        "projected_net_reduction_percent": round((net_reduction / current_total) * 100, 2)
        if current_total
        else 0.0,
        "projection_note": (
            "投影仅按未压缩仓库字节计算：假设每个目标 data URI 只替换为报告中的相对路径，"
            "并新增一份 Base64 解码后的共享二进制文件；不包含 HTTP 压缩、缓存、Git 历史或构建器影响。"
        ),
        "occurrences": details,
    }


def markdown(report: dict[str, Any]) -> str:
    meta = report["image_metadata"]
    dims = (
        f"{meta.get('width')} × {meta.get('height')} px"
        if meta.get("width") and meta.get("height")
        else "未解析"
    )
    lines = [
        "# 最大规格书内嵌图片候选：上下文与体积审计",
        "",
        "> 本报告只读，不修改任何规格书、图片、型号或技术参数。",
        "",
        "## 候选概况",
        "",
        f"- Base64 payload SHA256：`{report['selected_candidate_sha256']}`",
        f"- 解码图片 SHA256：`{report['decoded_image_sha256']}`",
        f"- MIME：{', '.join(report['mimes'])}",
        f"- 页面 / 出现次数：{report['page_count']} / {report['occurrence_count']}",
        f"- 解码图片：{dims}，{display_kib(report['decoded_image_bytes'])}",
        f"- 非 `src` 属性签名数：{report['attribute_signature_count']}",
        f"- 邻近文本上下文签名数：{report['context_signature_count']}",
        "",
        "## 不写文件的体积投影",
        "",
        f"- 当前受影响 HTML 合计：{display_mib(report['current_affected_html_bytes'])}",
        "- 仅把 data URI 换为相对路径后的 HTML 合计："
        f"{display_mib(report['projected_affected_html_bytes_after_reference_swap'])}",
        f"- 一份共享二进制图片：{display_kib(report['projected_one_shared_file_bytes'])}",
        "- HTML + 一份共享图片投影合计："
        f"{display_mib(report['projected_combined_bytes_with_one_shared_file'])}",
        "- 投影净减少："
        f"{display_mib(report['projected_net_bytes_reduction'])} "
        f"({report['projected_net_reduction_percent']:.2f}%)",
        "",
        f"> {report['projection_note']}",
        "",
        "## 逐次引用上下文",
        "",
    ]

    for row in report["occurrences"]:
        attrs = row["non_src_attributes"]
        attrs_text = ", ".join(f"{k}={v!r}" for k, v in attrs.items()) or "无"
        lines.extend(
            [
                f"### `{row['page']}` · 第 {row['page_occurrence_index']} 次",
                "",
                f"- 页面标题：{row['page_title'] or '（无 title）'}",
                f"- HTML 行号：{row['line']}",
                f"- 非 `src` 属性：{attrs_text}",
                f"- 替换后候选相对路径：`{row['relative_reference_if_externalized']}`",
                f"- 该次引用投影减少：{display_kib(row['projected_page_bytes_saved'])}",
                f"- 前文：{row['context_before'] or '（无可读文本）'}",
                f"- 后文：{row['context_after'] or '（无可读文本）'}",
                "",
            ]
        )

    lines.extend(
        [
            "## 边界说明",
            "",
            "- 本报告没有创建 `assets/spec-inline-shared/` 文件，也没有修改任何规格书 HTML。",
            "- 图片字节完全相同，不能单独证明不同文档中的语义角色完全相同。",
            "- 属性签名相同也不能代替逐页视觉核对；邻近文本仅用于审计线索，不用于推断产品事实。",
            "- 若未来进行试点，还必须单独验证 GitHub Pages 发布、浏览器渲染、缓存、回滚与断链。",
        ]
    )
    return "\n".join(lines) + "\n"


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()
    feasibility_path = Path(args.feasibility_json)
    if not feasibility_path.is_absolute():
        feasibility_path = Path.cwd() / feasibility_path

    report = audit(root, feasibility_path)
    Path(args.json).write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    Path(args.markdown).write_text(markdown(report), encoding="utf-8")

    print(
        "top inline candidate context audit: "
        f"pages={report['page_count']} occurrences={report['occurrence_count']} "
        f"attrs={report['attribute_signature_count']} contexts={report['context_signature_count']} "
        f"projected_reduction={report['projected_net_bytes_reduction']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
