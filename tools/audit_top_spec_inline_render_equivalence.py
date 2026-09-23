#!/usr/bin/env python3
"""Read-only browser equivalence audit for the largest inline spec image candidate.

The script creates temporary copies of the affected specification pages in-place,
renders one target occurrence at a time with its original data URI and with the
exact decoded bytes referenced as a temporary shared file, and compares browser
geometry plus element screenshots at desktop and mobile viewports.

It never edits a tracked specification page or persistent image. Temporary HTML
files and the temporary shared image are removed before exit.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import re
import shutil
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

from PIL import Image, ImageChops
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait


IMG_TAG_RE = re.compile(rb"<img\b[^>]*>", re.IGNORECASE | re.DOTALL)
SRC_ATTR_RE = re.compile(
    rb"\bsrc\s*=\s*(?:\"([^\"]*)\"|'([^']*)'|([^\s>]+))",
    re.IGNORECASE | re.DOTALL,
)
DATA_IMAGE_VALUE_RE = re.compile(
    rb"^data:(image/[A-Za-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$",
    re.IGNORECASE,
)
AUDIT_ATTR = b' data-yuhua-render-audit-target="true"'
VIEWPORTS = (
    ("desktop", 1280, 900),
    ("mobile", 390, 844),
)
NUMERIC_TOLERANCE = 0.25


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=".", help="Repository root")
    parser.add_argument(
        "--context-json",
        default="spec_inline_top_candidate_context_audit.json",
        help="Input context audit JSON",
    )
    parser.add_argument(
        "--json",
        default="spec_inline_top_candidate_render_equivalence.json",
        help="JSON output path",
    )
    parser.add_argument(
        "--markdown",
        default="spec_inline_top_candidate_render_equivalence.md",
        help="Markdown output path",
    )
    parser.add_argument(
        "--screenshots-dir",
        default="spec_inline_render_equivalence_screenshots",
        help="Directory for separate evidence screenshots",
    )
    return parser.parse_args()


def locate_browser() -> tuple[str, str | None]:
    chrome = next(
        (
            path
            for name in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser")
            if (path := shutil.which(name))
        ),
        None,
    )
    if not chrome:
        raise RuntimeError("No Chrome/Chromium binary found for render-equivalence audit")
    driver = next(
        (path for name in ("chromedriver", "chromium-driver") if (path := shutil.which(name))),
        None,
    )
    return chrome, driver


def make_driver(chrome: str, driver: str | None) -> webdriver.Chrome:
    options = Options()
    options.binary_location = chrome
    for flag in (
        "--headless=new",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--hide-scrollbars",
        "--allow-file-access-from-files",
        "--force-device-scale-factor=1",
        "--font-render-hinting=none",
    ):
        options.add_argument(flag)
    service = Service(executable_path=driver) if driver else Service()
    return webdriver.Chrome(service=service, options=options)


def target_tags(raw: bytes, target_sha: str) -> list[tuple[re.Match[bytes], bytes, bytes]]:
    found: list[tuple[re.Match[bytes], bytes, bytes]] = []
    for tag_match in IMG_TAG_RE.finditer(raw):
        tag = tag_match.group(0)
        src_match = SRC_ATTR_RE.search(tag)
        if not src_match:
            continue
        src = next((value for value in src_match.groups() if value is not None), b"")
        data_match = DATA_IMAGE_VALUE_RE.match(src)
        if not data_match:
            continue
        payload = data_match.group(2)
        if hashlib.sha256(payload).hexdigest() == target_sha:
            found.append((tag_match, src, payload))
    return found


def mark_tag_and_optionally_externalize(tag: bytes, relative_ref: str | None) -> bytes:
    src_match = SRC_ATTR_RE.search(tag)
    if not src_match:
        raise AssertionError("Target img tag lost its src attribute")

    result = tag
    if relative_ref is not None:
        selected_group = next(
            (index for index in (1, 2, 3) if src_match.group(index) is not None),
            None,
        )
        if selected_group is None:
            raise AssertionError("Could not identify target src value span")
        start, end = src_match.span(selected_group)
        result = tag[:start] + relative_ref.encode("utf-8") + tag[end:]

    insert_at = result.rfind(b">")
    if insert_at < 0:
        raise AssertionError("Malformed img tag")
    return result[:insert_at] + AUDIT_ATTR + result[insert_at:]


def build_variant(
    raw: bytes,
    target_sha: str,
    occurrence_index: int,
    relative_ref: str | None,
) -> tuple[bytes, bytes]:
    matches = target_tags(raw, target_sha)
    if occurrence_index < 1 or occurrence_index > len(matches):
        raise AssertionError(
            f"Target occurrence {occurrence_index} is outside 1..{len(matches)}"
        )
    tag_match, _, payload = matches[occurrence_index - 1]
    replacement = mark_tag_and_optionally_externalize(
        tag_match.group(0), relative_ref
    )
    output = raw[: tag_match.start()] + replacement + raw[tag_match.end() :]
    return output, payload


def wait_for_target(driver: webdriver.Chrome) -> Any:
    wait = WebDriverWait(driver, 15)
    element = wait.until(
        lambda d: d.find_element(
            By.CSS_SELECTOR, 'img[data-yuhua-render-audit-target="true"]'
        )
    )
    wait.until(
        lambda d: d.execute_script(
            "return arguments[0].complete && arguments[0].naturalWidth > 0 "
            "&& arguments[0].naturalHeight > 0;",
            element,
        )
    )
    decoded = driver.execute_async_script(
        """
        const img = arguments[0];
        const done = arguments[arguments.length - 1];
        if (!img.decode) { done(img.complete); return; }
        img.decode().then(() => done(true)).catch(() => done(false));
        """,
        element,
    )
    if decoded is False:
        raise AssertionError("Browser could not decode target image")
    return element


def geometry(driver: webdriver.Chrome, element: Any) -> dict[str, Any]:
    return driver.execute_script(
        """
        const img = arguments[0];
        const rect = (el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return {
            x: r.x, y: r.y, width: r.width, height: r.height,
            top: r.top, right: r.right, bottom: r.bottom, left: r.left
          };
        };
        const style = getComputedStyle(img);
        return {
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          complete: img.complete,
          target: rect(img),
          parent: rect(img.parentElement),
          previous: rect(img.previousElementSibling),
          next: rect(img.nextElementSibling),
          document: {
            scrollWidth: document.documentElement.scrollWidth,
            scrollHeight: document.documentElement.scrollHeight,
            bodyScrollWidth: document.body ? document.body.scrollWidth : null,
            bodyScrollHeight: document.body ? document.body.scrollHeight : null,
          },
          computed: {
            display: style.display,
            width: style.width,
            height: style.height,
            maxWidth: style.maxWidth,
            maxHeight: style.maxHeight,
            objectFit: style.objectFit,
            objectPosition: style.objectPosition,
          }
        };
        """,
        element,
    )


def compare_values(left: Any, right: Any, path: str = "") -> list[str]:
    problems: list[str] = []
    if isinstance(left, dict) and isinstance(right, dict):
        if set(left) != set(right):
            problems.append(f"{path or 'root'} keys differ")
            return problems
        for key in sorted(left):
            child = f"{path}.{key}" if path else key
            problems.extend(compare_values(left[key], right[key], child))
        return problems
    if isinstance(left, (int, float)) and isinstance(right, (int, float)):
        if abs(float(left) - float(right)) > NUMERIC_TOLERANCE:
            problems.append(f"{path}: {left!r} != {right!r}")
        return problems
    if left != right:
        problems.append(f"{path}: {left!r} != {right!r}")
    return problems


def compare_pngs(left_path: Path, right_path: Path) -> dict[str, Any]:
    with Image.open(left_path) as left_image, Image.open(right_path) as right_image:
        left = left_image.convert("RGBA")
        right = right_image.convert("RGBA")
        same_size = left.size == right.size
        if not same_size:
            return {
                "pixel_identical": False,
                "same_dimensions": False,
                "inline_dimensions": list(left.size),
                "external_dimensions": list(right.size),
                "different_pixel_bbox": None,
            }
        diff = ImageChops.difference(left, right)
        bbox = diff.getbbox()
        return {
            "pixel_identical": bbox is None,
            "same_dimensions": True,
            "inline_dimensions": list(left.size),
            "external_dimensions": list(right.size),
            "different_pixel_bbox": list(bbox) if bbox else None,
        }


def render(
    driver: webdriver.Chrome,
    page_path: Path,
    variant_bytes: bytes,
    viewport: tuple[str, int, int],
    screenshot_path: Path,
    *,
    expect_external: bool,
    shared_path: Path,
) -> dict[str, Any]:
    _, width, height = viewport
    page_path.write_bytes(variant_bytes)
    driver.set_window_size(width, height)
    driver.execute_cdp_cmd("Network.clearBrowserCache", {})
    driver.get(page_path.resolve().as_uri())
    element = wait_for_target(driver)
    resolved_src = element.get_attribute("src") or ""
    if expect_external:
        parsed = urlparse(resolved_src)
        if parsed.scheme != "file":
            raise AssertionError(f"External variant did not load a file URL: {resolved_src[:80]}")
        loaded_path = Path(unquote(parsed.path)).resolve()
        if loaded_path != shared_path.resolve():
            raise AssertionError(
                f"External variant resolved to {loaded_path}, expected {shared_path.resolve()}"
            )
    elif not resolved_src.lower().startswith("data:image/"):
        raise AssertionError("Inline variant no longer uses an image data URI")
    metrics = geometry(driver, element)
    screenshot_path.parent.mkdir(parents=True, exist_ok=True)
    element.screenshot(str(screenshot_path))
    return metrics


def audit(
    root: Path,
    context_path: Path,
    screenshots_dir: Path,
) -> dict[str, Any]:
    context = json.loads(context_path.read_text(encoding="utf-8"))
    target_sha = context["selected_candidate_sha256"]
    shared_rel = context["candidate_shared_path"]
    shared_path = root / shared_rel
    if shared_path.exists():
        raise RuntimeError(
            f"Candidate shared path already exists; refusing to overwrite: {shared_rel}"
        )

    chrome, driver_bin = locate_browser()
    cases: list[dict[str, Any]] = []
    created_shared = False
    created_dirs: list[Path] = []

    browser = make_driver(chrome, driver_bin)
    try:
        recovered_payload: bytes | None = None
        decoded: bytes | None = None

        for sequence, row in enumerate(context["occurrences"], start=1):
            source_path = root / row["page"]
            raw = source_path.read_bytes()
            occurrence_index = int(row["page_occurrence_index"])

            inline_bytes, payload = build_variant(
                raw, target_sha, occurrence_index, None
            )
            external_bytes, payload_again = build_variant(
                raw,
                target_sha,
                occurrence_index,
                row["relative_reference_if_externalized"],
            )
            if payload != payload_again:
                raise AssertionError("Inline/external temporary variants recovered different payloads")
            if recovered_payload is None:
                recovered_payload = payload
                decoded = base64.b64decode(payload, validate=True)
                if hashlib.sha256(decoded).hexdigest() != context["decoded_image_sha256"]:
                    raise AssertionError("Decoded image SHA256 differs from context audit")
                missing_dirs: list[Path] = []
                parent = shared_path.parent
                while not parent.exists() and parent != root:
                    missing_dirs.append(parent)
                    parent = parent.parent
                shared_path.parent.mkdir(parents=True, exist_ok=True)
                created_dirs.extend(missing_dirs)
                shared_path.write_bytes(decoded)
                created_shared = True
            elif payload != recovered_payload:
                raise AssertionError("Target encoded payload changed between occurrences")

            temp_name = (
                f".__yuhua_render_equivalence_{sequence}_{occurrence_index}.html"
            )
            temp_page = source_path.parent / temp_name
            try:
                for viewport in VIEWPORTS:
                    viewport_name, _, _ = viewport
                    base_name = (
                        f"{sequence:02d}_{Path(row['page']).stem}"
                        f"_occ{occurrence_index}_{viewport_name}"
                    )
                    inline_shot = screenshots_dir / f"{base_name}_inline.png"
                    external_shot = screenshots_dir / f"{base_name}_external.png"

                    inline_metrics = render(
                        browser,
                        temp_page,
                        inline_bytes,
                        viewport,
                        inline_shot,
                        expect_external=False,
                        shared_path=shared_path,
                    )
                    external_metrics = render(
                        browser,
                        temp_page,
                        external_bytes,
                        viewport,
                        external_shot,
                        expect_external=True,
                        shared_path=shared_path,
                    )
                    metric_differences = compare_values(
                        inline_metrics, external_metrics
                    )
                    pixel = compare_pngs(inline_shot, external_shot)

                    case = {
                        "page": row["page"],
                        "page_occurrence_index": occurrence_index,
                        "viewport": viewport_name,
                        "viewport_width": viewport[1],
                        "viewport_height": viewport[2],
                        "relative_reference_if_externalized": row[
                            "relative_reference_if_externalized"
                        ],
                        "inline_screenshot": inline_shot.name,
                        "external_screenshot": external_shot.name,
                        "geometry_identical_with_tolerance": not metric_differences,
                        "geometry_differences": metric_differences,
                        **pixel,
                    }
                    cases.append(case)

                    if metric_differences or not pixel["pixel_identical"]:
                        raise AssertionError(
                            f"Render mismatch for {row['page']} occurrence "
                            f"{occurrence_index} at {viewport_name}: "
                            f"geometry={metric_differences}, pixel={pixel}"
                        )
            finally:
                temp_page.unlink(missing_ok=True)

        if recovered_payload is None or decoded is None:
            raise AssertionError("No target payload was rendered")
        if len(cases) != len(context["occurrences"]) * len(VIEWPORTS):
            raise AssertionError("Unexpected number of render-equivalence cases")

        return {
            "policy": (
                "只读浏览器验证：不会修改任何受版本控制的规格书、图片、型号或技术参数。"
                "仅在运行环境中创建临时页面和一份由现有 Base64 精确解码的临时共享图片，"
                "逐次、逐视口渲染并保存彼此独立的截图；运行结束即清理临时页面和共享图片。"
            ),
            "source_context_report": context_path.as_posix(),
            "selected_candidate_sha256": target_sha,
            "decoded_image_sha256": context["decoded_image_sha256"],
            "candidate_shared_path": shared_rel,
            "occurrence_count": len(context["occurrences"]),
            "viewport_count": len(VIEWPORTS),
            "comparison_case_count": len(cases),
            "browser_binary": chrome,
            "driver_binary": driver_bin or "selenium-manager",
            "numeric_geometry_tolerance_px": NUMERIC_TOLERANCE,
            "all_geometry_equivalent": all(
                case["geometry_identical_with_tolerance"] for case in cases
            ),
            "all_element_screenshots_pixel_identical": all(
                case["pixel_identical"] for case in cases
            ),
            "cases": cases,
        }
    finally:
        browser.quit()
        if created_shared:
            shared_path.unlink(missing_ok=True)
        for directory in created_dirs:
            try:
                directory.rmdir()
            except OSError:
                pass


def markdown(report: dict[str, Any]) -> str:
    lines = [
        "# 最大规格书内嵌图片候选：浏览器渲染等价审计",
        "",
        "> 本报告只读，不改写任何规格书、产品事实或持久图片。",
        "",
        "## 结果",
        "",
        f"- 目标引用：{report['occurrence_count']} 次",
        f"- 视口：{report['viewport_count']} 个（桌面 + 手机）",
        f"- 独立比较：{report['comparison_case_count']} 组",
        f"- DOM/布局几何等价：{'是' if report['all_geometry_equivalent'] else '否'}",
        "- 目标图片元素截图逐像素一致："
        f"{'是' if report['all_element_screenshots_pixel_identical'] else '否'}",
        f"- 几何容差：{report['numeric_geometry_tolerance_px']} px",
        "",
        "## 逐次验证",
        "",
    ]
    for case in report["cases"]:
        lines.extend(
            [
                f"### `{case['page']}` · 第 {case['page_occurrence_index']} 次 · {case['viewport']}",
                "",
                f"- 视口：{case['viewport_width']} × {case['viewport_height']}",
                f"- 几何等价：{'是' if case['geometry_identical_with_tolerance'] else '否'}",
                f"- 截图像素一致：{'是' if case['pixel_identical'] else '否'}",
                f"- 原 Base64 截图：`{case['inline_screenshot']}`",
                f"- 临时共享图片截图：`{case['external_screenshot']}`",
                "",
            ]
        )
    lines.extend(
        [
            "## 边界说明",
            "",
            "- 每张证据截图都是独立文件，没有拼图、九宫格或合并图。",
            "- 临时外置图片的二进制内容必须与现有 Base64 解码结果 SHA256 完全一致。",
            "- 本审计只证明当前候选在当前浏览器环境中的渲染与布局等价，不代表批准修改规格书。",
            "- 若未来做真实外置试点，仍需单独验证 Pages 部署、缓存、断链、打印与可回滚性。",
        ]
    )
    return "\n".join(lines) + "\n"


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()
    context_path = Path(args.context_json).resolve()
    screenshots_dir = Path(args.screenshots_dir).resolve()

    report = audit(root, context_path, screenshots_dir)
    Path(args.json).write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    Path(args.markdown).write_text(markdown(report), encoding="utf-8")

    print(
        "render-equivalence audit: "
        f"{report['comparison_case_count']} cases; "
        f"geometry={report['all_geometry_equivalent']}; "
        f"pixels={report['all_element_screenshots_pixel_identical']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
