#!/usr/bin/env python3
"""Browser audit for homepage keyboard navigation and focus management.

This audit is intentionally read-only. It renders the checked-out homepage locally
and verifies a few high-value keyboard journeys at desktop and mobile viewports:

* first Tab exposes the skip link and activating it moves focus to main content;
* a product parameter button opens the dialog from the keyboard, focus stays in
  the dialog, Escape closes it, and focus returns to the opener;
* the mobile menu can be opened with the keyboard and its first link follows the
  menu button in sequential focus order;
* inquiry form controls retain their DOM keyboard order on a narrow viewport.

No product facts, specification content, prices, models, or contact data are
modified by this script.
"""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path
from typing import Any

from selenium import webdriver
from selenium.webdriver import ActionChains
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait


VIEWPORTS = {
    "desktop": (1280, 900),
    "mobile": (390, 844),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=".", help="Repository root")
    parser.add_argument(
        "--json",
        default="homepage_keyboard_focus_audit.json",
        help="JSON report path",
    )
    parser.add_argument(
        "--markdown",
        default="homepage_keyboard_focus_audit.md",
        help="Markdown report path",
    )
    return parser.parse_args()


def locate_browser() -> tuple[str, str | None]:
    chrome = next(
        (
            path
            for name in (
                "google-chrome",
                "google-chrome-stable",
                "chromium",
                "chromium-browser",
            )
            if (path := shutil.which(name))
        ),
        None,
    )
    if not chrome:
        raise RuntimeError("No Chrome/Chromium binary found for keyboard audit")
    driver = next(
        (
            path
            for name in ("chromedriver", "chromium-driver")
            if (path := shutil.which(name))
        ),
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
        "--allow-file-access-from-files",
        "--force-device-scale-factor=1",
    ):
        options.add_argument(flag)
    service = Service(executable_path=driver) if driver else Service()
    return webdriver.Chrome(service=service, options=options)


def element_summary(driver: webdriver.Chrome) -> dict[str, Any]:
    return driver.execute_script(
        r"""
        const el = document.activeElement;
        if (!el) return null;
        return {
          tag: el.tagName.toLowerCase(),
          id: el.id || '',
          className: typeof el.className === 'string' ? el.className : '',
          text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100),
          ariaLabel: el.getAttribute('aria-label') || '',
        };
        """
    )


def visible_focus(driver: webdriver.Chrome) -> dict[str, Any]:
    return driver.execute_script(
        """
        const el = document.activeElement;
        if (!el) return {visible: false};
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const outlineVisible = s.outlineStyle !== 'none' && s.outlineWidth !== '0px';
        const shadowVisible = s.boxShadow && s.boxShadow !== 'none';
        return {
          visible: Boolean(outlineVisible || shadowVisible),
          outlineStyle: s.outlineStyle,
          outlineWidth: s.outlineWidth,
          boxShadow: s.boxShadow,
          rect: {
            x: r.x,
            y: r.y,
            top: r.top,
            right: r.right,
            bottom: r.bottom,
            left: r.left,
            width: r.width,
            height: r.height,
          },
        };
        """
    )


def wait_ready(driver: webdriver.Chrome) -> None:
    wait = WebDriverWait(driver, 20)
    wait.until(lambda d: d.execute_script("return document.readyState") == "complete")
    wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "#tableBody .spec-btn")) > 0)
    wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "#specBody tr")) > 0)


def load(driver: webdriver.Chrome, page: Path, viewport: tuple[int, int]) -> None:
    driver.set_window_size(*viewport)
    driver.get(page.resolve().as_uri())
    wait_ready(driver)


def assert_active_matches(driver: webdriver.Chrome, selector: str, message: str) -> None:
    ok = driver.execute_script(
        "return !!(document.activeElement && document.activeElement.matches(arguments[0]));",
        selector,
    )
    if not ok:
        raise AssertionError(f"{message}; active={element_summary(driver)!r}")


def desktop_checks(driver: webdriver.Chrome, page: Path) -> dict[str, Any]:
    load(driver, page, VIEWPORTS["desktop"])
    wait = WebDriverWait(driver, 10)
    result: dict[str, Any] = {}

    # Start a genuine sequential-navigation journey from the document.
    driver.execute_script(
        "if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); window.scrollTo(0, 0);"
    )
    ActionChains(driver).send_keys(Keys.TAB).perform()
    assert_active_matches(driver, ".skip-link", "First Tab must expose the skip link")
    skip_focus = visible_focus(driver)
    skip_rect = skip_focus["rect"]
    if not skip_focus["visible"] or skip_rect["width"] <= 0 or skip_rect["height"] <= 0:
        raise AssertionError(f"Skip link has no visible keyboard focus: {skip_focus!r}")
    if skip_rect["bottom"] <= 0:
        raise AssertionError(f"Focused skip link remains outside the viewport: {skip_focus!r}")
    result["first_tab"] = {
        "active": element_summary(driver),
        "focus_indicator": skip_focus,
    }

    driver.switch_to.active_element.send_keys(Keys.ENTER)
    wait.until(
        lambda d: d.execute_script(
            "return document.activeElement && document.activeElement.id === 'main-content';"
        )
    )
    result["skip_link_activation"] = {"active": element_summary(driver)}

    search = driver.find_element(By.ID, "searchInput")
    search.clear()
    search.send_keys("YRE-2020Z")
    wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "#tableBody .spec-btn")) > 0)
    opener = driver.find_element(By.CSS_SELECTOR, "#tableBody .spec-btn")
    driver.execute_script("arguments[0].focus();", opener)
    if not driver.execute_script("return document.activeElement === arguments[0];", opener):
        raise AssertionError("Could not focus product parameter opener")
    opener.send_keys(Keys.ENTER)

    wait.until(lambda d: not d.find_element(By.ID, "modalMask").get_attribute("hidden"))
    wait.until(
        lambda d: d.execute_script(
            "return document.activeElement && document.activeElement.id === 'modalClose';"
        )
    )
    modal_initial = element_summary(driver)

    ActionChains(driver).key_down(Keys.SHIFT).send_keys(Keys.TAB).key_up(Keys.SHIFT).perform()
    if not driver.execute_script(
        "return !!(document.activeElement && document.activeElement.closest('.modal'));"
    ):
        raise AssertionError(
            f"Shift+Tab escaped the open product dialog: {element_summary(driver)!r}"
        )
    modal_reverse = element_summary(driver)

    ActionChains(driver).send_keys(Keys.TAB).perform()
    if not driver.execute_script(
        "return !!(document.activeElement && document.activeElement.closest('.modal'));"
    ):
        raise AssertionError(
            f"Tab escaped the open product dialog: {element_summary(driver)!r}"
        )
    modal_forward = element_summary(driver)

    ActionChains(driver).send_keys(Keys.ESCAPE).perform()
    wait.until(lambda d: d.find_element(By.ID, "modalMask").get_attribute("hidden") is not None)
    wait.until(lambda d: d.execute_script("return document.activeElement === arguments[0];", opener))
    result["product_dialog"] = {
        "initial_focus": modal_initial,
        "reverse_tab_focus": modal_reverse,
        "forward_tab_focus": modal_forward,
        "focus_restored_to_opener": True,
    }
    return result


def mobile_checks(driver: webdriver.Chrome, page: Path) -> dict[str, Any]:
    load(driver, page, VIEWPORTS["mobile"])
    wait = WebDriverWait(driver, 10)
    result: dict[str, Any] = {}

    toggle = driver.find_element(By.ID, "navToggle")
    if not toggle.is_displayed():
        raise AssertionError("Mobile navigation toggle is not visible at 390px")
    driver.execute_script("arguments[0].focus();", toggle)
    toggle.send_keys(Keys.ENTER)
    wait.until(lambda d: d.find_element(By.ID, "navToggle").get_attribute("aria-expanded") == "true")
    if driver.find_element(By.ID, "navMobile").get_attribute("aria-hidden") != "false":
        raise AssertionError("Mobile navigation is expanded but remains aria-hidden")

    ActionChains(driver).send_keys(Keys.TAB).perform()
    if not driver.execute_script(
        "return !!(document.activeElement && document.activeElement.closest('#navMobile'));"
    ):
        raise AssertionError(
            "After opening the mobile menu, Tab must reach a mobile navigation link; "
            f"active={element_summary(driver)!r}"
        )
    result["mobile_menu"] = {
        "expanded": True,
        "first_tab_after_toggle": element_summary(driver),
    }

    controls = [
        el
        for el in driver.find_elements(
            By.CSS_SELECTOR,
            "#selectionForm select, #selectionForm input, #selectionForm textarea, #selectionForm button",
        )
        if el.is_displayed() and el.is_enabled()
    ]
    if len(controls) < 9:
        raise AssertionError(f"Expected at least 9 inquiry controls, found {len(controls)}")

    driver.execute_script(
        "arguments[0].scrollIntoView({block:'center'}); arguments[0].focus();",
        controls[0],
    )
    visited = [element_summary(driver)]
    focus_indicators = [visible_focus(driver)]
    for expected in controls[1:]:
        ActionChains(driver).send_keys(Keys.TAB).perform()
        if not driver.execute_script("return document.activeElement === arguments[0];", expected):
            raise AssertionError(
                "Inquiry form Tab order diverged from rendered control order; "
                f"expected={expected.get_attribute('id') or expected.tag_name}, "
                f"active={element_summary(driver)!r}"
            )
        visited.append(element_summary(driver))
        focus_indicators.append(visible_focus(driver))

    if not all(item["visible"] for item in focus_indicators):
        raise AssertionError(
            "At least one inquiry control lacks a visible keyboard focus indicator: "
            + repr(focus_indicators)
        )

    result["inquiry_form"] = {
        "control_count": len(controls),
        "tab_order": visited,
        "all_controls_have_visible_focus": True,
    }
    return result


def write_markdown(report: dict[str, Any], path: Path) -> None:
    mobile = report["mobile"]
    lines = [
        "# Yuhua homepage keyboard focus audit",
        "",
        f"- Result: **{'PASS' if report['ok'] else 'FAIL'}**",
        f"- Desktop viewport: {VIEWPORTS['desktop'][0]}×{VIEWPORTS['desktop'][1]}",
        f"- Mobile viewport: {VIEWPORTS['mobile'][0]}×{VIEWPORTS['mobile'][1]}",
        f"- Inquiry controls checked in order: {mobile['inquiry_form']['control_count']}",
        "- Desktop journey: first-Tab skip link → main content → product dialog focus trap → Escape focus restoration",
        "- Mobile journey: keyboard-opened menu → first mobile link → sequential inquiry form controls",
        "",
        "This audit is read-only and does not rewrite product facts, specification content, models, prices, or contact data.",
    ]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()
    page = root / "index.html"
    if not page.is_file():
        raise SystemExit(f"Missing homepage: {page}")

    chrome, driver_bin = locate_browser()
    browser = make_driver(chrome, driver_bin)
    try:
        report = {
            "ok": True,
            "policy": (
                "只读键盘与焦点审计：不会修改产品事实、规格书内容、型号、价格或联系方式。"
            ),
            "browser": chrome,
            "desktop": desktop_checks(browser, page),
            "mobile": mobile_checks(browser, page),
        }
    finally:
        browser.quit()

    json_path = root / args.json
    markdown_path = root / args.markdown
    json_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    write_markdown(report, markdown_path)
    print(
        "Homepage keyboard focus audit: PASS "
        f"(desktop dialog + mobile menu + {report['mobile']['inquiry_form']['control_count']} inquiry controls)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
