#!/usr/bin/env python3
"""Read-only browser audit for Yuhua homepage product/specification search flows."""

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
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait

VIEWPORTS = {"desktop": (1280, 900), "mobile": (390, 844)}
NO_RESULT_QUERY = "ZZZ-NO-SUCH-YUHUA-9F7E"
SEPARATOR_SPEC_LITERAL = "DLSB-5-30"
SEPARATOR_SPEC_VARIANT = "DLSB-5/30"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=".")
    parser.add_argument("--json", default="homepage_search_flow_audit.json")
    parser.add_argument("--markdown", default="homepage_search_flow_audit.md")
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
        raise RuntimeError("No Chrome/Chromium binary found for search-flow audit")
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
    wait.until(lambda d: d.execute_script("return Array.isArray(window.PRODUCTS) && window.PRODUCTS.length > 0"))
    wait.until(lambda d: d.execute_script("return Array.isArray(window.SPECS) && window.SPECS.length > 0"))
    wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "#tableBody tr")) > 0)
    wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "#specBody tr")) > 0)


def compact(value: str) -> str:
    return re.sub(r"[\s_/.．／‐‑‒–—―·-]+", "", str(value or "").lower())


def set_search(driver: webdriver.Chrome, element_id: str, query: str) -> None:
    element = driver.find_element(By.ID, element_id)
    driver.execute_script("arguments[0].scrollIntoView({block:'center', inline:'nearest'});", element)
    element.click()
    element.send_keys(Keys.CONTROL, "a")
    element.send_keys(Keys.BACKSPACE)
    element.send_keys(query)


def wait_count(driver: webdriver.Chrome, count_id: str, predicate: Any, timeout: int = 10) -> int:
    wait = WebDriverWait(driver, timeout)

    def current(d: webdriver.Chrome) -> int | None:
        text = d.find_element(By.ID, count_id).text.strip()
        try:
            value = int(text)
        except ValueError:
            return None
        return value if predicate(value) else None

    return int(wait.until(current))


def row_models(driver: webdriver.Chrome, body_selector: str) -> list[str]:
    return [
        cell.text.strip()
        for cell in driver.find_elements(By.CSS_SELECTOR, f"{body_selector} tr td.model")
        if cell.text.strip()
    ]


def choose_existing_models(driver: webdriver.Chrome) -> dict[str, str]:
    chosen = driver.execute_script(
        """
        const products = window.PRODUCTS || [];
        const specs = window.SPECS || [];
        const pModels = products.map(p => String(p['型号'] || '').trim()).filter(Boolean);
        const sModels = specs.map(s => String(s.model || '').trim()).filter(Boolean);
        function pick(list, preferred, regex) {
          if (list.includes(preferred)) return preferred;
          return list.find(x => regex.test(x)) || list[0] || '';
        }
        return {
          product: pick(pModels, 'YRE-2020Z', /-/),
          productSlash: pModels.find(x => x.includes('/')) || '',
          spec: pick(sModels, 'DLSB-5-30', /-/)
        };
        """
    )
    if not chosen.get("product") or not chosen.get("spec"):
        raise AssertionError(f"Unable to choose real product/spec models from runtime data: {chosen!r}")
    return {key: str(value) for key, value in chosen.items()}


def verify_product_search(driver: webdriver.Chrome, model: str) -> dict[str, Any]:
    set_search(driver, "searchInput", model)
    count = wait_count(driver, "resultCount", lambda value: value > 0)
    models = row_models(driver, "#tableBody")
    if not models:
        raise AssertionError(f"Product search {model!r} returned a positive count but no visible rows")
    if model not in models:
        raise AssertionError(f"Exact product model {model!r} is not present in visible search results: {models[:10]!r}")
    if compact(models[0]) != compact(model):
        raise AssertionError(f"Top product result is not an exact normalized model match: query={model!r}, top={models[0]!r}")
    status = driver.find_element(By.ID, "catalogResultStatus").text.strip()
    return {"query": model, "count": count, "top_model": models[0], "status": status}


def verify_product_slash_search(driver: webdriver.Chrome, model: str) -> dict[str, Any] | None:
    if not model:
        return None
    set_search(driver, "searchInput", model)
    count = wait_count(driver, "resultCount", lambda value: value > 0)
    models = row_models(driver, "#tableBody")
    if model not in models:
        raise AssertionError(f"Literal slash-model product search lost its exact record: {model!r}")
    if compact(models[0]) != compact(model):
        raise AssertionError(f"Slash-model product search did not rank a separator-equivalent model first: {models[:5]!r}")
    return {"query": model, "count": count, "top_model": models[0]}


def verify_product_no_result(driver: webdriver.Chrome) -> dict[str, Any]:
    set_search(driver, "searchInput", NO_RESULT_QUERY)
    count = wait_count(driver, "resultCount", lambda value: value == 0)
    WebDriverWait(driver, 10).until(lambda d: d.find_element(By.ID, "emptyTip").is_displayed())
    if driver.find_elements(By.CSS_SELECTOR, "#tableBody tr"):
        raise AssertionError("No-result product search still renders table rows")
    return {"query": NO_RESULT_QUERY, "count": count, "empty_message": driver.find_element(By.ID, "emptyTip").text.strip()}


def resolve_repo_file(root: Path, href: str) -> Path:
    parsed = urlparse(href)
    if parsed.scheme != "file":
        raise AssertionError(f"Expected local file URL during repository browser audit, got {href!r}")
    path = Path(unquote(parsed.path))
    try:
        path.resolve().relative_to(root.resolve())
    except ValueError as exc:
        raise AssertionError(f"Search action points outside repository root: {path}") from exc
    if not path.is_file():
        raise AssertionError(f"Search action target is missing: {path}")
    return path


def click_online_view(driver: webdriver.Chrome, link: Any, expected_path: Path) -> dict[str, Any]:
    driver.execute_script("arguments[0].scrollIntoView({block:'center', inline:'center'});", link)
    before = list(driver.window_handles)
    link.click()
    WebDriverWait(driver, 10).until(lambda d: len(d.window_handles) == len(before) + 1)
    new_handle = next(handle for handle in driver.window_handles if handle not in before)
    driver.switch_to.window(new_handle)
    try:
        WebDriverWait(driver, 10).until(lambda d: d.execute_script("return document.readyState") == "complete")
        loaded = Path(unquote(urlparse(driver.current_url).path)).resolve()
        if loaded != expected_path.resolve():
            raise AssertionError(f"Online specification opened unexpected target: expected={expected_path}, loaded={loaded}")
        if not driver.title.strip():
            raise AssertionError("Opened specification page has an empty document title")
        title = driver.title.strip()
    finally:
        driver.close()
        driver.switch_to.window(before[0])
    return {"opened": True, "target": str(expected_path), "document_title": title}


def click_download_safely(driver: webdriver.Chrome, link: Any) -> dict[str, Any]:
    driver.execute_script(
        """
        window.__yuhuaDownloadClick = null;
        arguments[0].addEventListener('click', function (event) {
          event.preventDefault();
          window.__yuhuaDownloadClick = {
            href: event.currentTarget.href,
            download: event.currentTarget.getAttribute('download') || ''
          };
        }, {once:true, capture:true});
        """,
        link,
    )
    driver.execute_script("arguments[0].scrollIntoView({block:'center', inline:'center'});", link)
    link.click()
    captured = WebDriverWait(driver, 10).until(lambda d: d.execute_script("return window.__yuhuaDownloadClick;"))
    if captured.get("href") != link.get_attribute("href"):
        raise AssertionError("Download click probe did not capture the expected specification URL")
    return {"clicked": True, "download_attribute": captured.get("download", ""), "href": captured.get("href", "")}


def target_rect(driver: webdriver.Chrome, element: Any) -> dict[str, float]:
    rect = driver.execute_script(
        "const r=arguments[0].getBoundingClientRect(); return {width:r.width,height:r.height};",
        element,
    )
    return {"width": float(rect["width"]), "height": float(rect["height"])}


def verify_spec_search(driver: webdriver.Chrome, root: Path, model: str, mobile: bool) -> dict[str, Any]:
    set_search(driver, "specSearch", model)
    count = wait_count(driver, "specResultCount", lambda value: value > 0)
    models = row_models(driver, "#specBody")
    if not models:
        raise AssertionError(f"Specification search {model!r} returned no visible rows")
    if compact(models[0]) != compact(model):
        raise AssertionError(f"Top specification result is not an exact normalized model match: query={model!r}, top={models[0]!r}")

    first_row = driver.find_element(By.CSS_SELECTOR, "#specBody tr")
    online = first_row.find_element(By.CSS_SELECTOR, "a.spec-btn.rich")
    download = first_row.find_element(By.CSS_SELECTOR, "a.spec-btn[download]")
    online_path = resolve_repo_file(root, online.get_attribute("href"))
    download_path = resolve_repo_file(root, download.get_attribute("href"))
    if download_path.suffix.lower() not in {".doc", ".docx"}:
        raise AssertionError(f"Specification download target is not Word format: {download_path}")

    action_metrics = {
        "online": target_rect(driver, online),
        "download": target_rect(driver, download),
    }
    online_result = click_online_view(driver, online, online_path)
    set_search(driver, "specSearch", model)
    wait_count(driver, "specResultCount", lambda value: value > 0)
    first_row = driver.find_element(By.CSS_SELECTOR, "#specBody tr")
    download = first_row.find_element(By.CSS_SELECTOR, "a.spec-btn[download]")
    download_result = click_download_safely(driver, download)

    status = driver.find_element(By.ID, "specResultStatus").text.strip()
    return {
        "query": model,
        "count": count,
        "top_model": models[0],
        "status": status,
        "online_target": online_path.relative_to(root).as_posix(),
        "download_target": download_path.relative_to(root).as_posix(),
        "online_click": online_result,
        "download_click": download_result,
        "action_target_px": action_metrics,
        "mobile": mobile,
    }


def verify_separator_variant(driver: webdriver.Chrome) -> dict[str, Any]:
    observations: dict[str, Any] = {}
    for query in (SEPARATOR_SPEC_LITERAL, SEPARATOR_SPEC_VARIANT):
        set_search(driver, "specSearch", query)
        count = wait_count(driver, "specResultCount", lambda value: value > 0)
        models = row_models(driver, "#specBody")
        if not models or compact(models[0]) != compact(SEPARATOR_SPEC_LITERAL):
            raise AssertionError(f"Separator-tolerant spec search failed for {query!r}: {models[:5]!r}")
        observations[query] = {"count": count, "top_model": models[0]}
    return {
        "literal": SEPARATOR_SPEC_LITERAL,
        "variant": SEPARATOR_SPEC_VARIANT,
        "normalized_token": compact(SEPARATOR_SPEC_LITERAL),
        "observations": observations,
        "note": "This verifies the existing search normalization only; it does not rewrite or assert equivalence of stored model facts.",
    }


def verify_spec_no_result(driver: webdriver.Chrome) -> dict[str, Any]:
    set_search(driver, "specSearch", NO_RESULT_QUERY)
    count = wait_count(driver, "specResultCount", lambda value: value == 0)
    WebDriverWait(driver, 10).until(lambda d: d.find_element(By.ID, "specEmptyTip").is_displayed())
    if driver.find_elements(By.CSS_SELECTOR, "#specBody tr"):
        raise AssertionError("No-result specification search still renders table rows")
    return {"query": NO_RESULT_QUERY, "count": count, "empty_message": driver.find_element(By.ID, "specEmptyTip").text.strip()}


def verify_mobile_search_controls(driver: webdriver.Chrome) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for element_id in ("searchInput", "specSearch"):
        element = driver.find_element(By.ID, element_id)
        rect = target_rect(driver, element)
        if rect["width"] < 44 or rect["height"] < 44:
            raise AssertionError(f"Mobile search control #{element_id} is smaller than a 44px touch target: {rect!r}")
        result[element_id] = rect
    return {"min_touch_target_px": 44, "controls": result}


def static_contract_checks(root: Path) -> dict[str, Any]:
    html = (root / "index.html").read_text(encoding="utf-8")
    js = (root / "app.js").read_text(encoding="utf-8")
    required_html = [
        'id="searchInput"',
        'aria-describedby="catalogResultStatus"',
        'aria-controls="catalogResultTable"',
        'id="specSearch"',
        'aria-describedby="specResultStatus"',
        'aria-controls="specResultTable"',
        'id="emptyTip"',
        'id="specEmptyTip"',
    ]
    missing_html = [token for token in required_html if token not in html]
    if missing_html:
        raise AssertionError(f"Homepage search accessibility/status contract changed: {missing_html!r}")
    required_js = [
        "function normalizeSearchText(value)",
        "function searchMatchRank(modelValue, textValue, q, qCompact)",
        "rankSearchResults(",
        'searchInput.addEventListener("input"',
        'specSearch.addEventListener("input"',
    ]
    missing_js = [token for token in required_js if token not in js]
    if missing_js:
        raise AssertionError(f"Homepage search wiring contract changed: {missing_js!r}")
    return {
        "product_search_status_wiring": True,
        "spec_search_status_wiring": True,
        "shared_ranking_helper": True,
        "separator_normalization_present": True,
    }


def run_viewport(driver: webdriver.Chrome, root: Path, page: Path, name: str) -> dict[str, Any]:
    load(driver, page, VIEWPORTS[name])
    chosen = choose_existing_models(driver)
    result: dict[str, Any] = {
        "viewport": {"width": VIEWPORTS[name][0], "height": VIEWPORTS[name][1]},
        "chosen_models": chosen,
        "product_exact": verify_product_search(driver, chosen["product"]),
        "product_slash": verify_product_slash_search(driver, chosen["productSlash"]),
        "product_no_result": verify_product_no_result(driver),
    }

    load(driver, page, VIEWPORTS[name])
    result["spec_exact"] = verify_spec_search(driver, root, chosen["spec"], mobile=name == "mobile")
    result["spec_separator_variant"] = verify_separator_variant(driver)
    result["spec_no_result"] = verify_spec_no_result(driver)
    if name == "mobile":
        result["mobile_search_controls"] = verify_mobile_search_controls(driver)
    return result


def write_markdown(report: dict[str, Any], path: Path) -> None:
    lines = [
        "# Yuhua homepage search flow audit",
        "",
        f"- Result: **{'PASS' if report['ok'] else 'FAIL'}**",
        f"- Desktop product exact query: `{report['desktop']['product_exact']['query']}` → top `{report['desktop']['product_exact']['top_model']}`",
        f"- Desktop spec exact query: `{report['desktop']['spec_exact']['query']}` → top `{report['desktop']['spec_exact']['top_model']}`",
        f"- Separator-tolerant observation: `{SEPARATOR_SPEC_VARIANT}` finds stored `{report['desktop']['spec_separator_variant']['observations'][SEPARATOR_SPEC_VARIANT]['top_model']}` without rewriting data.",
        f"- Desktop/mobile no-result states: product **{report['desktop']['product_no_result']['count']}**, spec **{report['desktop']['spec_no_result']['count']}**.",
        "- Specification online-view link is opened in a real browser tab; the Word download action is real-clicked with navigation prevented and its local target verified to exist.",
        "- Mobile product/spec search inputs meet the 44px touch-target floor; specification action sizes are reported as observations.",
        "",
        "This is a read-only interaction audit. It does not modify or infer product specifications, prices, model meanings, or specification contents.",
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
        desktop = run_viewport(browser, root, page, "desktop")
        mobile = run_viewport(browser, root, page, "mobile")
    finally:
        browser.quit()

    report = {
        "ok": True,
        "policy": "只读搜索流程审计：不修改、猜测或覆盖产品型号、参数、价格、规格书内容；分隔符测试只验证现有搜索行为。",
        "browser": chrome,
        "desktop": desktop,
        "mobile": mobile,
        "static_contract": static_contract_checks(root),
    }
    (root / args.json).write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_markdown(report, root / args.markdown)
    print(
        "Homepage search flow audit: PASS "
        f"(desktop/mobile; product={desktop['product_exact']['query']}; spec={desktop['spec_exact']['query']}; separator={SEPARATOR_SPEC_VARIANT})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
