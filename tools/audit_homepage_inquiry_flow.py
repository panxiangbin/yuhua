#!/usr/bin/env python3
"""Read-only browser audit for the homepage inquiry/mail workflow."""

from __future__ import annotations

import argparse
import json
import re
import shutil
from pathlib import Path
from typing import Any

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select, WebDriverWait

SALES_EMAIL = "smxpxb008@gmail.com"
VIEWPORTS = {"desktop": (1280, 900), "mobile": (390, 844)}
TEST_VALUES = {
    "category": "高低温循环装置",
    "model": "TEST-MODEL-42",
    "capacity": "TEST-5L",
    "temperature": "TEST--20~100℃",
    "pressure": "TEST-0.08MPa",
    "power": "TEST-220V-50Hz",
    "notes": "TEST-316L；防爆；仅用于浏览器审计",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=".")
    parser.add_argument("--json", default="homepage_inquiry_flow_audit.json")
    parser.add_argument("--markdown", default="homepage_inquiry_flow_audit.md")
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
        raise RuntimeError("No Chrome/Chromium binary found for inquiry audit")
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


def load(driver: webdriver.Chrome, page: Path, viewport: tuple[int, int]) -> None:
    driver.set_window_size(*viewport)
    driver.get(page.resolve().as_uri())
    wait = WebDriverWait(driver, 20)
    wait.until(lambda d: d.execute_script("return document.readyState") == "complete")
    wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "#tableBody .spec-btn")) > 0)
    wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "#specBody tr")) > 0)
    wait.until(lambda d: len(d.find_elements(By.ID, "copySelectionInquiry")) == 1)


def install_copy_probe(driver: webdriver.Chrome) -> None:
    driver.execute_script(
        """
        window.__yuhuaCapturedCopy = '';
        try {
          Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: {
              writeText: function (text) {
                window.__yuhuaCapturedCopy = String(text);
                return Promise.resolve();
              }
            }
          });
        } catch (e) {}
        document.execCommand = function (command) {
          if (String(command).toLowerCase() !== 'copy') return false;
          const el = document.activeElement;
          window.__yuhuaCapturedCopy = el && typeof el.value === 'string' ? el.value : '';
          return true;
        };
        """
    )


def fill_inquiry(driver: webdriver.Chrome) -> None:
    Select(driver.find_element(By.ID, "inqCategory")).select_by_visible_text(TEST_VALUES["category"])
    field_map = {
        "inqModel": "model",
        "inqCapacity": "capacity",
        "inqTemperature": "temperature",
        "inqPressure": "pressure",
        "inqPower": "power",
        "inqNotes": "notes",
    }
    for element_id, key in field_map.items():
        element = driver.find_element(By.ID, element_id)
        element.clear()
        element.send_keys(TEST_VALUES[key])


def assert_copy_content(text: str) -> dict[str, Any]:
    expected_subject = f"予华仪器选型/询价 - {TEST_VALUES['model']}"
    required_lines = [
        f"收件人：{SALES_EMAIL}",
        f"主题：{expected_subject}",
        f"产品类别：{TEST_VALUES['category']}",
        f"参考型号：{TEST_VALUES['model']}",
        f"容量/处理量：{TEST_VALUES['capacity']}",
        f"温度范围：{TEST_VALUES['temperature']}",
        f"真空/压力要求：{TEST_VALUES['pressure']}",
        f"电源/使用地区：{TEST_VALUES['power']}",
        f"材质、防爆、物料与其他要求：{TEST_VALUES['notes']}",
    ]
    missing = [line for line in required_lines if line not in text]
    if missing:
        raise AssertionError(f"Copied inquiry is missing expected lines: {missing!r}\nCaptured={text!r}")
    if not text.startswith(f"收件人：{SALES_EMAIL}\n主题：{expected_subject}\n\n"):
        raise AssertionError("Copied inquiry recipient/subject header is not in the expected safe order")
    return {
        "recipient": SALES_EMAIL,
        "subject": expected_subject,
        "required_field_lines": len(required_lines) - 2,
        "captured_length": len(text),
    }


def mailto_recipients(driver: webdriver.Chrome) -> list[dict[str, str]]:
    return driver.execute_script(
        """
        return Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(function (a) {
          const u = new URL(a.href);
          return {text: (a.textContent || '').trim(), recipient: u.pathname, href: a.href};
        });
        """
    )


def verify_runtime_mailto_links(driver: webdriver.Chrome) -> dict[str, Any]:
    wait = WebDriverWait(driver, 10)
    opener = driver.find_element(By.CSS_SELECTOR, "#tableBody .spec-btn")
    driver.execute_script("arguments[0].click();", opener)
    wait.until(lambda d: not d.find_element(By.ID, "modalMask").get_attribute("hidden"))
    wait.until(lambda d: d.find_element(By.ID, "emailInquiry").get_attribute("href").startswith("mailto:"))

    links = mailto_recipients(driver)
    if len(links) < 4:
        raise AssertionError(f"Expected multiple runtime mailto links, found {len(links)}")
    bad = [item for item in links if item["recipient"].lower() != SALES_EMAIL]
    if bad:
        raise AssertionError(f"Unexpected public mailto recipient(s): {bad!r}")
    if not any(item["text"] == "邮件咨询" for item in links):
        raise AssertionError("Runtime specification/model email inquiry links were not created")

    driver.find_element(By.ID, "modalClose").click()
    wait.until(lambda d: d.find_element(By.ID, "modalMask").get_attribute("hidden") is not None)
    return {
        "mailto_link_count": len(links),
        "unique_recipients": sorted({item["recipient"].lower() for item in links}),
    }


def verify_form_flow(driver: webdriver.Chrome) -> dict[str, Any]:
    wait = WebDriverWait(driver, 10)
    install_copy_probe(driver)
    fill_inquiry(driver)

    submit = driver.find_element(By.CSS_SELECTOR, "#selectionForm .send-email-btn")
    copy_button = driver.find_element(By.ID, "copySelectionInquiry")
    clear_button = driver.find_element(By.ID, "clearInquiry")
    if submit.get_attribute("type") != "submit":
        raise AssertionError("Open-mail action must remain the inquiry form submit action")
    if copy_button.get_attribute("aria-describedby") != "selectionCopyStatus":
        raise AssertionError("Copy inquiry button must describe its live status region")

    copy_button.click()
    wait.until(lambda d: bool(d.execute_script("return window.__yuhuaCapturedCopy;")))
    captured = driver.execute_script("return window.__yuhuaCapturedCopy;")
    copy_summary = assert_copy_content(captured)
    wait.until(lambda d: "完整询价内容已复制" in d.find_element(By.ID, "selectionCopyStatus").text)

    clear_button.click()
    wait.until(lambda d: d.execute_script("return document.activeElement && document.activeElement.id === 'inqCategory';"))
    values = driver.execute_script(
        """
        return ['inqCategory','inqModel','inqCapacity','inqTemperature','inqPressure','inqPower','inqNotes']
          .map(function (id) { return [id, document.getElementById(id).value]; });
        """
    )
    uncleared = {key: value for key, value in values if value}
    if uncleared:
        raise AssertionError(f"Clear inquiry action left values behind: {uncleared!r}")
    if driver.find_element(By.ID, "selectionCopyStatus").text.strip():
        raise AssertionError("Clear inquiry action must clear the copy status message")

    return {
        "copy": copy_summary,
        "clear_reset_all_fields": True,
        "clear_focus_target": "inqCategory",
        "submit_button_text": submit.text.strip(),
        "copy_button_text": copy_button.text.strip(),
        "clear_button_text": clear_button.text.strip(),
    }


def verify_mobile_targets(driver: webdriver.Chrome) -> dict[str, Any]:
    ids = ["copySelectionInquiry", "clearInquiry"]
    elements = [driver.find_element(By.CSS_SELECTOR, "#selectionForm .send-email-btn")]
    elements.extend(driver.find_element(By.ID, item) for item in ids)
    targets = []
    for element in elements:
        rect = driver.execute_script(
            "const r=arguments[0].getBoundingClientRect(); return {width:r.width,height:r.height};",
            element,
        )
        if rect["width"] < 44 or rect["height"] < 44:
            raise AssertionError(f"Inquiry action target is smaller than 44px: {element.text!r} {rect!r}")
        targets.append({"text": element.text.strip(), **rect})
    return {"min_target_px": 44, "actions": targets}


def static_wiring_checks(root: Path) -> dict[str, Any]:
    js_path = root / "assets" / "customer-tools.js"
    source = js_path.read_text(encoding="utf-8")
    emails = sorted({item.lower() for item in re.findall(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", source, flags=re.I)})
    if emails != [SALES_EMAIL]:
        raise AssertionError(f"customer-tools.js contains unexpected email literals: {emails!r}")
    required = [
        f'var SALES_EMAIL = "{SALES_EMAIL}";',
        "window.location.href = mailto(inquiryContent.subject, inquiryContent.body);",
        '"收件人：" + SALES_EMAIL',
        'copySelectionInquiry.textContent = "复制完整询价内容";',
    ]
    missing = [token for token in required if token not in source]
    if missing:
        raise AssertionError(f"Inquiry mail/copy wiring contract changed unexpectedly: {missing!r}")
    return {
        "email_literals": emails,
        "open_mail_uses_shared_mailto_helper": True,
        "copy_uses_shared_sales_email": True,
    }


def write_markdown(report: dict[str, Any], path: Path) -> None:
    mobile_targets = report["mobile"]["touch_targets"]["actions"]
    target_text = ", ".join(f"{item['text']} {item['width']:.0f}×{item['height']:.0f}px" for item in mobile_targets)
    lines = [
        "# Yuhua homepage inquiry flow audit",
        "",
        f"- Result: **{'PASS' if report['ok'] else 'FAIL'}**",
        f"- Allowed sales recipient: `{SALES_EMAIL}`",
        f"- Runtime mailto links checked: **{report['desktop']['runtime_mailto']['mailto_link_count']}**",
        f"- Copied inquiry recipient: `{report['desktop']['form_flow']['copy']['recipient']}`",
        f"- Mobile inquiry actions: {target_text}",
        "- Clear action: resets every inquiry field, clears copy status, and returns focus to product category.",
        "- Open-mail source contract: selection form submit continues to use the shared mailto helper and the single allowed sales email.",
        "",
        "This audit uses synthetic TEST-* values only. It does not change product facts, specifications, models, prices, or public contact data.",
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
        load(browser, page, VIEWPORTS["desktop"])
        desktop = {
            "runtime_mailto": verify_runtime_mailto_links(browser),
            "form_flow": verify_form_flow(browser),
        }
        load(browser, page, VIEWPORTS["mobile"])
        mobile = {
            "touch_targets": verify_mobile_targets(browser),
            "form_flow": verify_form_flow(browser),
        }
    finally:
        browser.quit()

    report = {
        "ok": True,
        "policy": "只读询价流程审计：公开收件人只能是 smxpxb008@gmail.com，不修改产品事实、规格书、型号或价格。",
        "browser": chrome,
        "desktop": desktop,
        "mobile": mobile,
        "static_wiring": static_wiring_checks(root),
    }
    (root / args.json).write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_markdown(report, root / args.markdown)
    print(
        "Homepage inquiry flow audit: PASS "
        f"({desktop['runtime_mailto']['mailto_link_count']} mailto links; copy/clear desktop+mobile; recipient={SALES_EMAIL})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
