#!/usr/bin/env python3
"""Real-browser audit for mobile specification action touch targets."""

from __future__ import annotations

import argparse
import json
import re
import shutil
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

VIEWPORT = {"width": 390, "height": 844, "pixelRatio": 1}
QUERY = "DLSB-5-30"
MIN_TARGET_PX = 44


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=".")
    parser.add_argument("--json", default="mobile_spec_touch_targets_audit.json")
    parser.add_argument("--markdown", default="mobile_spec_touch_targets_audit.md")
    return parser.parse_args()


def browser_binary() -> tuple[str, str | None]:
    chrome = next(
        (
            path
            for name in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser")
            if (path := shutil.which(name))
        ),
        None,
    )
    if not chrome:
        raise RuntimeError("No Chrome/Chromium binary found")
    driver = next(
        (path for name in ("chromedriver", "chromium-driver") if (path := shutil.which(name))),
        None,
    )
    return chrome, driver


def new_driver(chrome: str, driver: str | None) -> webdriver.Chrome:
    options = Options()
    options.binary_location = chrome
    options.add_experimental_option(
        "mobileEmulation",
        {
            "deviceMetrics": {
                "width": VIEWPORT["width"],
                "height": VIEWPORT["height"],
                "pixelRatio": VIEWPORT["pixelRatio"],
                "touch": True,
                "mobile": True,
            }
        },
    )
    for flag in (
        "--headless=new",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--allow-file-access-from-files",
    ):
        options.add_argument(flag)
    service = Service(executable_path=driver) if driver else Service()
    return webdriver.Chrome(service=service, options=options)


def compact(value: str) -> str:
    return re.sub(r"[\s_/.．／‐‑‒–—―·-]+", "", str(value or "").lower())


def rect(driver: webdriver.Chrome, element: Any) -> dict[str, float]:
    raw = driver.execute_script(
        "const r=arguments[0].getBoundingClientRect(); return {width:r.width,height:r.height};",
        element,
    )
    return {"width": float(raw["width"]), "height": float(raw["height"])}


def repo_file(root: Path, href: str) -> Path:
    parsed = urlparse(href)
    if parsed.scheme != "file":
        raise AssertionError(f"Expected local file URL, got {href!r}")
    target = Path(unquote(parsed.path)).resolve()
    try:
        target.relative_to(root.resolve())
    except ValueError as exc:
        raise AssertionError(f"Link escapes repository root: {target}") from exc
    if not target.is_file():
        raise AssertionError(f"Linked file is missing: {target}")
    return target


def load_page(driver: webdriver.Chrome, page: Path) -> None:
    driver.get(page.resolve().as_uri())
    wait = WebDriverWait(driver, 20)
    wait.until(lambda d: d.execute_script("return document.readyState") == "complete")
    wait.until(lambda d: d.execute_script("return (window.SPECS||[]).length > 0"))
    wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "#specBody tr")) > 0)


def emulation_state(driver: webdriver.Chrome) -> dict[str, Any]:
    state = driver.execute_script(
        """
        return {
          innerWidth: innerWidth,
          innerHeight: innerHeight,
          devicePixelRatio: devicePixelRatio,
          maxTouchPoints: navigator.maxTouchPoints || 0,
          pointerCoarse: matchMedia('(pointer: coarse)').matches,
          hoverNone: matchMedia('(hover: none)').matches
        };
        """
    )
    return {
        "inner_width": int(state["innerWidth"]),
        "inner_height": int(state["innerHeight"]),
        "device_pixel_ratio": float(state["devicePixelRatio"]),
        "max_touch_points": int(state["maxTouchPoints"]),
        "pointer_coarse": bool(state["pointerCoarse"]),
        "hover_none": bool(state["hoverNone"]),
    }


def search_spec(driver: webdriver.Chrome) -> str:
    field = driver.find_element(By.ID, "specSearch")
    driver.execute_script(
        "arguments[0].scrollIntoView({block:'center',inline:'nearest'}); arguments[0].focus();",
        field,
    )
    WebDriverWait(driver, 5).until(
        lambda d: d.execute_script(
            "const r=arguments[0].getBoundingClientRect(); return r.top>=0 && r.bottom<=innerHeight;",
            field,
        )
    )
    field.clear()
    field.send_keys(QUERY)

    def top_match(d: webdriver.Chrome) -> str | bool:
        rows = d.find_elements(By.CSS_SELECTOR, "#specBody tr td.model")
        if not rows:
            return False
        model = rows[0].text.strip()
        return model if compact(model) == compact(QUERY) else False

    return str(WebDriverWait(driver, 10).until(top_match))


def action_info(driver: webdriver.Chrome, root: Path, selector: str) -> dict[str, Any]:
    element = driver.find_element(By.CSS_SELECTOR, selector)
    size = rect(driver, element)
    href = element.get_attribute("href")
    target = repo_file(root, href)
    computed = driver.execute_script(
        """
        const s=getComputedStyle(arguments[0]);
        return {display:s.display, minHeight:s.minHeight, paddingTop:s.paddingTop, paddingBottom:s.paddingBottom};
        """,
        element,
    )
    if size["width"] < MIN_TARGET_PX or size["height"] < MIN_TARGET_PX:
        raise AssertionError(
            f"Mobile spec action {selector!r} is below {MIN_TARGET_PX}px usability target: {size}"
        )
    return {
        "size_px": size,
        "target": target.relative_to(root).as_posix(),
        "computed_display": str(computed["display"]),
        "computed_min_height": str(computed["minHeight"]),
        "computed_padding_top": str(computed["paddingTop"]),
        "computed_padding_bottom": str(computed["paddingBottom"]),
    }


def render_markdown(report: dict[str, Any]) -> str:
    online = report["actions"]["online"]["size_px"]
    download = report["actions"]["download"]["size_px"]
    return "\n".join(
        [
            "# Yuhua mobile specification touch-target audit",
            "",
            "- Result: **PASS**",
            f"- Emulated viewport: `{report['emulation']['inner_width']}×{report['emulation']['inner_height']}`",
            f"- Coarse pointer active: `{report['emulation']['pointer_coarse']}`; maxTouchPoints: `{report['emulation']['max_touch_points']}`",
            f"- Tested specification: `{report['query']}` → `{report['top_model']}`",
            f"- Online action: `{online['width']:.1f}×{online['height']:.1f}px`",
            f"- Download action: `{download['width']:.1f}×{download['height']:.1f}px`",
            f"- Usability target: at least `{report['min_target_px']}×{report['min_target_px']}px` for these primary mobile actions.",
            "",
            "Audit only: no product facts, model meanings, prices, specification contents, or contact details are changed.",
            "",
        ]
    )


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()
    page = root / "index.html"
    if not page.is_file():
        raise SystemExit(f"Missing homepage: {page}")

    chrome, driver_bin = browser_binary()
    driver = new_driver(chrome, driver_bin)
    try:
        load_page(driver, page)
        emulation = emulation_state(driver)
        if not emulation["pointer_coarse"] or emulation["max_touch_points"] < 1:
            raise AssertionError(f"Browser is not actually emulating a coarse touch pointer: {emulation}")

        top_model = search_spec(driver)
        row_selector = "#specBody tr"
        online = action_info(driver, root, f"{row_selector} a.spec-btn.rich")
        download = action_info(driver, root, f"{row_selector} a.spec-btn[download]")
    finally:
        driver.quit()

    report = {
        "ok": True,
        "policy": "只读移动端触控目标审计：不修改产品事实、型号含义、价格、规格书内容或联系方式。",
        "browser": chrome,
        "requested_viewport": VIEWPORT,
        "emulation": emulation,
        "query": QUERY,
        "top_model": top_model,
        "min_target_px": MIN_TARGET_PX,
        "actions": {"online": online, "download": download},
    }
    (root / args.json).write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (root / args.markdown).write_text(render_markdown(report), encoding="utf-8")
    print(
        "Mobile specification touch-target audit: PASS "
        f"(model={top_model}; online={online['size_px']}; download={download['size_px']})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
