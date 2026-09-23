#!/usr/bin/env python3
"""Browser-check the *actual* Base64 -> shared-image diff for specification pages.

This guard consumes ``spec_externalization_integrity_report.json`` produced by
``verify_spec_externalization_integrity.py``. When that report contains a
verified externalization, it renders the exact base revision and the current
tracked page at desktop and mobile viewports, then compares geometry and the
changed image element pixel-for-pixel.

The check is read-only: tracked files are never modified. Temporary HTML
copies are created next to the real specification page so relative shared-image
references resolve exactly as they do in the current tree, then removed.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

from audit_top_spec_inline_render_equivalence import (
    AUDIT_ATTR,
    IMG_TAG_RE,
    SRC_ATTR_RE,
    VIEWPORTS,
    compare_pngs,
    compare_values,
    locate_browser,
    make_driver,
    render,
)
from verify_spec_externalization_integrity import (
    decode_data_image,
    git_bytes,
    resolve_shared_target,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=".", help="Repository root")
    parser.add_argument(
        "--integrity-json",
        default="spec_externalization_integrity_report.json",
        help="Input integrity report JSON",
    )
    parser.add_argument(
        "--json",
        default="spec_externalization_render_equivalence.json",
        help="JSON output path",
    )
    parser.add_argument(
        "--markdown",
        default="spec_externalization_render_equivalence.md",
        help="Markdown output path",
    )
    parser.add_argument(
        "--screenshots-dir",
        default="spec_externalization_render_equivalence_screenshots",
        help="Directory for separate evidence screenshots",
    )
    return parser.parse_args()


def image_tag(raw: bytes, image_index: int) -> tuple[bytes, bytes]:
    matches = list(IMG_TAG_RE.finditer(raw))
    if image_index < 1 or image_index > len(matches):
        raise AssertionError(
            f"image index {image_index} is outside 1..{len(matches)}"
        )
    tag = matches[image_index - 1].group(0)
    src_match = SRC_ATTR_RE.search(tag)
    if not src_match:
        raise AssertionError(f"image #{image_index} has no src attribute")
    src = next((value for value in src_match.groups() if value is not None), None)
    if src is None:
        raise AssertionError(f"image #{image_index} src could not be parsed")
    return tag, src


def mark_image(raw: bytes, image_index: int) -> bytes:
    matches = list(IMG_TAG_RE.finditer(raw))
    if image_index < 1 or image_index > len(matches):
        raise AssertionError(
            f"image index {image_index} is outside 1..{len(matches)}"
        )
    match = matches[image_index - 1]
    tag = match.group(0)
    if AUDIT_ATTR in tag:
        raise AssertionError("render-audit marker unexpectedly exists in tracked HTML")
    insert_at = tag.rfind(b">")
    if insert_at < 0:
        raise AssertionError("malformed img tag")
    marked = tag[:insert_at] + AUDIT_ATTR + tag[insert_at:]
    return raw[: match.start()] + marked + raw[match.end() :]


def source_text(src: bytes) -> str:
    try:
        return src.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise AssertionError("img src is not valid UTF-8") from exc


def validate_replacement(
    root: Path,
    page: str,
    base_raw: bytes,
    current_raw: bytes,
    replacement: dict[str, Any],
) -> Path:
    image_index = int(replacement["image_index"])
    _, base_src = image_tag(base_raw, image_index)
    _, current_src = image_tag(current_raw, image_index)

    mime, decoded = decode_data_image(source_text(base_src))
    decoded_sha = hashlib.sha256(decoded).hexdigest()
    if decoded_sha != replacement["decoded_sha256"]:
        raise AssertionError(
            f"{page} image #{image_index}: decoded SHA differs from integrity report"
        )
    if mime != replacement["mime"].lower():
        raise AssertionError(
            f"{page} image #{image_index}: MIME differs from integrity report"
        )

    target = resolve_shared_target(page, source_text(current_src))
    if target != replacement["target"]:
        raise AssertionError(
            f"{page} image #{image_index}: current src resolves to {target!r}, "
            f"expected {replacement['target']!r}"
        )
    shared_path = root / target
    if not shared_path.is_file():
        raise AssertionError(f"{page} image #{image_index}: shared file is missing")
    shared_bytes = shared_path.read_bytes()
    if shared_bytes != decoded:
        raise AssertionError(
            f"{page} image #{image_index}: shared file bytes differ from base Base64"
        )
    return shared_path


def audit(
    root: Path,
    integrity_path: Path,
    screenshots_dir: Path,
) -> dict[str, Any]:
    integrity = json.loads(integrity_path.read_text(encoding="utf-8"))
    if not integrity.get("ok"):
        raise AssertionError("input externalization integrity report is not OK")

    pages = integrity.get("pages", [])
    replacement_count = sum(len(page.get("replacements", [])) for page in pages)
    common = {
        "policy": (
            "只读浏览器验证：仅对完整性检查已确认的真实规格书外置差异，"
            "逐一比较基准提交中的 Base64 页面与当前提交中的共享图片页面；"
            "不会修改任何受版本控制的规格书、图片、型号、参数或产品数据。"
        ),
        "source_integrity_report": integrity_path.as_posix(),
        "base_ref": integrity["base_ref"],
        "head": integrity["head"],
        "externalized_spec_page_count": len(pages),
        "verified_replacement_count": replacement_count,
        "viewport_count": len(VIEWPORTS),
    }

    if replacement_count == 0:
        return {
            **common,
            "skipped": True,
            "skip_reason": "No verified Base64 -> shared-image externalization exists in this diff.",
            "comparison_case_count": 0,
            "all_geometry_equivalent": True,
            "all_element_screenshots_pixel_identical": True,
            "cases": [],
        }

    chrome, driver_bin = locate_browser()
    browser = make_driver(chrome, driver_bin)
    cases: list[dict[str, Any]] = []
    screenshots_dir.mkdir(parents=True, exist_ok=True)

    try:
        sequence = 0
        for page in pages:
            page_path_text = page["path"]
            page_path = root / page_path_text
            current_raw = page_path.read_bytes()
            base_raw = git_bytes("show", f"{integrity['base_ref']}:{page_path_text}")

            for replacement in page.get("replacements", []):
                sequence += 1
                image_index = int(replacement["image_index"])
                shared_path = validate_replacement(
                    root,
                    page_path_text,
                    base_raw,
                    current_raw,
                    replacement,
                )
                base_marked = mark_image(base_raw, image_index)
                current_marked = mark_image(current_raw, image_index)
                temp_page = page_path.parent / (
                    f".__yuhua_externalization_actual_render_{sequence}_{image_index}.html"
                )
                try:
                    for viewport in VIEWPORTS:
                        viewport_name, _, _ = viewport
                        stem = Path(page_path_text).stem
                        shot_stem = (
                            f"{sequence:02d}_{stem}_img{image_index}_{viewport_name}"
                        )
                        base_shot = screenshots_dir / f"{shot_stem}_base.png"
                        current_shot = screenshots_dir / f"{shot_stem}_current.png"

                        base_metrics = render(
                            browser,
                            temp_page,
                            base_marked,
                            viewport,
                            base_shot,
                            expect_external=False,
                            shared_path=shared_path,
                        )
                        current_metrics = render(
                            browser,
                            temp_page,
                            current_marked,
                            viewport,
                            current_shot,
                            expect_external=True,
                            shared_path=shared_path,
                        )
                        metric_differences = compare_values(
                            base_metrics, current_metrics
                        )
                        pixel = compare_pngs(base_shot, current_shot)
                        case = {
                            "page": page_path_text,
                            "image_index": image_index,
                            "target": replacement["target"],
                            "viewport": viewport_name,
                            "viewport_width": viewport[1],
                            "viewport_height": viewport[2],
                            "base_screenshot": base_shot.name,
                            "current_screenshot": current_shot.name,
                            "geometry_identical_with_tolerance": not metric_differences,
                            "geometry_differences": metric_differences,
                            **pixel,
                        }
                        cases.append(case)
                        if metric_differences or not pixel["pixel_identical"]:
                            raise AssertionError(
                                f"actual render mismatch for {page_path_text} image "
                                f"#{image_index} at {viewport_name}: "
                                f"geometry={metric_differences}, pixel={pixel}"
                            )
                finally:
                    temp_page.unlink(missing_ok=True)
    finally:
        browser.quit()

    expected_cases = replacement_count * len(VIEWPORTS)
    if len(cases) != expected_cases:
        raise AssertionError(
            f"unexpected comparison case count: {len(cases)} != {expected_cases}"
        )

    return {
        **common,
        "skipped": False,
        "skip_reason": "",
        "comparison_case_count": len(cases),
        "browser_binary": chrome,
        "driver_binary": driver_bin or "selenium-manager",
        "all_geometry_equivalent": all(
            case["geometry_identical_with_tolerance"] for case in cases
        ),
        "all_element_screenshots_pixel_identical": all(
            case["pixel_identical"] for case in cases
        ),
        "cases": cases,
    }


def markdown(report: dict[str, Any]) -> str:
    lines = [
        "# 规格书真实外置差异：浏览器渲染等价检查",
        "",
        "> 本检查只读；比较基准提交中的原 Base64 页面与当前提交中的真实共享图片引用。",
        "",
        "## 结果",
        "",
        f"- 基准：`{report['base_ref']}`",
        f"- 当前提交：`{report['head']}`",
        f"- 外置规格书页面：{report['externalized_spec_page_count']}",
        f"- 已验证替换：{report['verified_replacement_count']}",
        f"- 视口：{report['viewport_count']} 个（桌面 + 手机）",
        f"- 独立比较：{report['comparison_case_count']} 组",
    ]
    if report["skipped"]:
        lines += ["- 状态：跳过（本次差异没有真实 Base64 图片外置）"]
    else:
        lines += [
            f"- DOM/布局几何等价：{'是' if report['all_geometry_equivalent'] else '否'}",
            "- 目标图片元素截图逐像素一致："
            f"{'是' if report['all_element_screenshots_pixel_identical'] else '否'}",
            "",
            "## 逐项验证",
            "",
        ]
        for case in report["cases"]:
            lines += [
                f"### `{case['page']}` · 图片 #{case['image_index']} · {case['viewport']}",
                "",
                f"- 共享目标：`{case['target']}`",
                f"- 视口：{case['viewport_width']} × {case['viewport_height']}",
                f"- 几何等价：{'是' if case['geometry_identical_with_tolerance'] else '否'}",
                f"- 截图像素一致：{'是' if case['pixel_identical'] else '否'}",
                f"- 基准截图：`{case['base_screenshot']}`",
                f"- 当前截图：`{case['current_screenshot']}`",
                "",
            ]
    lines += [
        "## 边界说明",
        "",
        "- 只验证已通过字节完整性检查的外置差异，不扩大到其他规格书。",
        "- 每张证据截图均为独立文件，不做拼图或合成。",
        "- 若当前差异没有真实外置，检查会明确跳过，而不是伪造通过案例。",
    ]
    return "\n".join(lines) + "\n"


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()
    report = audit(
        root,
        Path(args.integrity_json),
        Path(args.screenshots_dir),
    )
    Path(args.json).write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    Path(args.markdown).write_text(markdown(report), encoding="utf-8")
    print(
        "spec externalization actual render equivalence: "
        f"pages={report['externalized_spec_page_count']} "
        f"replacements={report['verified_replacement_count']} "
        f"cases={report['comparison_case_count']} "
        f"skipped={report['skipped']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
