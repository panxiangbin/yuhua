#!/usr/bin/env python3
"""Read-only desktop/mobile browser audit for homepage product and spec search."""

from __future__ import annotations

import argparse
import json
import re
import shutil
from pathlib import Path
from typing import Any, Callable
from urllib.parse import unquote, urlparse

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait

VIEWPORTS = {"desktop": (1280, 900), "mobile": (390, 844)}
NO_RESULT = "ZZZ-NO-SUCH-YUHUA-9F7E"
SEP_LITERAL = "DLSB-5-30"
SEP_VARIANT = "DLSB-5/30"


def args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--root", default=".")
    p.add_argument("--json", default="homepage_search_flow_audit.json")
    p.add_argument("--markdown", default="homepage_search_flow_audit.md")
    return p.parse_args()


def browser_binary() -> tuple[str, str | None]:
    chrome = next((p for n in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser") if (p := shutil.which(n))), None)
    if not chrome:
        raise RuntimeError("No Chrome/Chromium binary found")
    driver = next((p for n in ("chromedriver", "chromium-driver") if (p := shutil.which(n))), None)
    return chrome, driver


def new_driver(chrome: str, driver: str | None) -> webdriver.Chrome:
    o = Options()
    o.binary_location = chrome
    for flag in ("--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--allow-file-access-from-files", "--force-device-scale-factor=1"):
        o.add_argument(flag)
    return webdriver.Chrome(service=Service(executable_path=driver) if driver else Service(), options=o)


def load(d: webdriver.Chrome, page: Path, viewport: tuple[int, int]) -> None:
    d.set_window_size(*viewport)
    d.get(page.resolve().as_uri())
    w = WebDriverWait(d, 20)
    w.until(lambda x: x.execute_script("return document.readyState") == "complete")
    w.until(lambda x: x.execute_script("return (window.PRODUCTS||[]).length > 0 && (window.SPECS||[]).length > 0"))
    w.until(lambda x: len(x.find_elements(By.CSS_SELECTOR, "#tableBody tr")) > 0)
    w.until(lambda x: len(x.find_elements(By.CSS_SELECTOR, "#specBody tr")) > 0)


def compact(value: str) -> str:
    return re.sub(r"[\s_/.．／‐‑‒–—―·-]+", "", str(value or "").lower())


def scroll_visible(d: webdriver.Chrome, el: Any, inline: str = "nearest") -> None:
    d.execute_script("arguments[0].scrollIntoView({block:'center',inline:arguments[1]});", el, inline)
    WebDriverWait(d, 10).until(
        lambda x: x.execute_script(
            "const r=arguments[0].getBoundingClientRect(); return r.top>=0 && r.bottom<=innerHeight && r.left<innerWidth && r.right>0;",
            el,
        )
    )


def search(d: webdriver.Chrome, input_id: str, query: str) -> None:
    el = d.find_element(By.ID, input_id)
    scroll_visible(d, el)
    el.click()
    el.send_keys(Keys.CONTROL, "a")
    el.send_keys(Keys.BACKSPACE)
    el.send_keys(query)


def wait_count(d: webdriver.Chrome, count_id: str, test: Callable[[int], bool]) -> int:
    def read(x: webdriver.Chrome) -> int | None:
        try:
            n = int(x.find_element(By.ID, count_id).text.strip())
        except ValueError:
            return None
        return n if test(n) else None
    return int(WebDriverWait(d, 10).until(read))


def models(d: webdriver.Chrome, body: str) -> list[str]:
    values = d.execute_script(
        "return Array.from(document.querySelectorAll(arguments[0] + ' tr td.model')).map(x => (x.textContent || '').trim()).filter(Boolean);",
        body,
    )
    return [str(value) for value in values]


def wait_top_match(d: webdriver.Chrome, body: str, expected: str) -> list[str]:
    def ready(x: webdriver.Chrome) -> list[str] | bool:
        found = models(x, body)
        if found and compact(found[0]) == compact(expected):
            return found
        return False

    return list(WebDriverWait(d, 10).until(ready))


def choose_models(d: webdriver.Chrome) -> dict[str, str]:
    picked = d.execute_script(
        """
        const p=(window.PRODUCTS||[]).map(x=>String(x['型号']||'').trim()).filter(Boolean);
        const s=(window.SPECS||[]).map(x=>String(x.model||'').trim()).filter(Boolean);
        const pick=(a,w)=>a.includes(w)?w:(a.find(x=>x.includes('-'))||a[0]||'');
        return {product:pick(p,'YRE-2020Z'), productSlash:p.find(x=>x.includes('/'))||'', spec:pick(s,'DLSB-5-30')};
        """
    )
    if not picked.get("product") or not picked.get("spec"):
        raise AssertionError(f"No suitable real models found: {picked!r}")
    return {k: str(v) for k, v in picked.items()}


def exact_search(d: webdriver.Chrome, input_id: str, count_id: str, body: str, query: str) -> dict[str, Any]:
    search(d, input_id, query)
    found = wait_top_match(d, body, query)
    count = int(d.find_element(By.ID, count_id).text.strip())
    if count <= 0 or query not in found:
        raise AssertionError(f"Exact search ranking failed: query={query!r}, count={count}, rows={found[:10]!r}")
    return {"query": query, "count": count, "top_model": found[0]}


def optional_slash_product(d: webdriver.Chrome, query: str) -> dict[str, Any] | None:
    if not query:
        return None
    return exact_search(d, "searchInput", "resultCount", "#tableBody", query)


def no_result(d: webdriver.Chrome, input_id: str, count_id: str, body: str, empty_id: str) -> dict[str, Any]:
    search(d, input_id, NO_RESULT)
    count = wait_count(d, count_id, lambda n: n == 0)
    WebDriverWait(d, 10).until(lambda x: x.find_element(By.ID, empty_id).is_displayed())
    if d.find_elements(By.CSS_SELECTOR, f"{body} tr"):
        raise AssertionError(f"No-result query still has rows in {body}")
    return {"query": NO_RESULT, "count": count, "message": d.find_element(By.ID, empty_id).text.strip()}


def repo_file(root: Path, href: str) -> Path:
    u = urlparse(href)
    if u.scheme != "file":
        raise AssertionError(f"Expected file URL, got {href!r}")
    p = Path(unquote(u.path)).resolve()
    try:
        p.relative_to(root.resolve())
    except ValueError as exc:
        raise AssertionError(f"Link escapes repository root: {p}") from exc
    if not p.is_file():
        raise AssertionError(f"Linked file is missing: {p}")
    return p


def rect(d: webdriver.Chrome, el: Any) -> dict[str, float]:
    r = d.execute_script("const r=arguments[0].getBoundingClientRect(); return {width:r.width,height:r.height};", el)
    return {"width": float(r["width"]), "height": float(r["height"])}


def open_online(d: webdriver.Chrome, link: Any, expected: Path) -> dict[str, Any]:
    scroll_visible(d, link, "center")
    before = list(d.window_handles)
    link.click()
    WebDriverWait(d, 10).until(lambda x: len(x.window_handles) == len(before) + 1)
    new = next(h for h in d.window_handles if h not in before)
    d.switch_to.window(new)
    try:
        WebDriverWait(d, 10).until(lambda x: x.execute_script("return document.readyState") == "complete")
        loaded = Path(unquote(urlparse(d.current_url).path)).resolve()
        if loaded != expected.resolve() or not d.title.strip():
            raise AssertionError(f"Online specification did not open expected titled page: {loaded}")
        title = d.title.strip()
    finally:
        d.close()
        d.switch_to.window(before[0])
    return {"opened": True, "title": title}


def click_download_probe(d: webdriver.Chrome, link: Any) -> dict[str, Any]:
    d.execute_script(
        """window.__dl=null; arguments[0].addEventListener('click',e=>{e.preventDefault();window.__dl={href:e.currentTarget.href,download:e.currentTarget.getAttribute('download')||''};},{once:true,capture:true});""",
        link,
    )
    scroll_visible(d, link, "center")
    link.click()
    captured = WebDriverWait(d, 10).until(lambda x: x.execute_script("return window.__dl;"))
    if captured["href"] != link.get_attribute("href"):
        raise AssertionError("Download click target changed unexpectedly")
    return {"clicked": True, **captured}


def spec_journey(d: webdriver.Chrome, root: Path, query: str, mobile: bool) -> dict[str, Any]:
    base = exact_search(d, "specSearch", "specResultCount", "#specBody", query)
    row = d.find_element(By.CSS_SELECTOR, "#specBody tr")
    online = row.find_element(By.CSS_SELECTOR, "a.spec-btn.rich")
    download = row.find_element(By.CSS_SELECTOR, "a.spec-btn[download]")
    online_path = repo_file(root, online.get_attribute("href"))
    download_path = repo_file(root, download.get_attribute("href"))
    if download_path.suffix.lower() not in {".doc", ".docx"}:
        raise AssertionError(f"Download is not Word format: {download_path}")
    metrics = {"online": rect(d, online), "download": rect(d, download)}
    opened = open_online(d, online, online_path)
    download = d.find_element(By.CSS_SELECTOR, "#specBody tr a.spec-btn[download]")
    clicked = click_download_probe(d, download)
    return {
        **base,
        "online_target": online_path.relative_to(root).as_posix(),
        "download_target": download_path.relative_to(root).as_posix(),
        "online_click": opened,
        "download_click": clicked,
        "action_target_px": metrics,
        "mobile": mobile,
    }


def separator_search(d: webdriver.Chrome) -> dict[str, Any]:
    out = {}
    for q in (SEP_LITERAL, SEP_VARIANT):
        search(d, "specSearch", q)
        found = wait_top_match(d, "#specBody", SEP_LITERAL)
        count = int(d.find_element(By.ID, "specResultCount").text.strip())
        if count <= 0:
            raise AssertionError(f"Separator search returned non-positive count: {q!r} -> {count}")
        out[q] = {"count": count, "top_model": found[0]}
    return {
        "literal": SEP_LITERAL,
        "variant": SEP_VARIANT,
        "normalized_token": compact(SEP_LITERAL),
        "observations": out,
        "note": "Search behavior only; stored model facts are not rewritten or declared equivalent.",
    }


def mobile_controls(d: webdriver.Chrome) -> dict[str, Any]:
    out = {}
    for element_id in ("searchInput", "specSearch"):
        size = rect(d, d.find_element(By.ID, element_id))
        if min(size.values()) < 44:
            raise AssertionError(f"Mobile search target #{element_id} is under 44px: {size}")
        out[element_id] = size
    return {"min_touch_target_px": 44, "controls": out}


def static_contract(root: Path) -> dict[str, bool]:
    html = (root / "index.html").read_text(encoding="utf-8")
    js = (root / "app.js").read_text(encoding="utf-8")
    for token in ('id="searchInput"', 'aria-describedby="catalogResultStatus"', 'id="specSearch"', 'aria-describedby="specResultStatus"', 'id="emptyTip"', 'id="specEmptyTip"'):
        if token not in html:
            raise AssertionError(f"Missing search/status contract: {token}")
    for token in ("function normalizeSearchText(value)", "function searchMatchRank(", "rankSearchResults("):
        if token not in js:
            raise AssertionError(f"Missing shared search contract: {token}")
    return {"product_search_status_wiring": True, "spec_search_status_wiring": True, "shared_ranking_helper": True, "separator_normalization": True}


def viewport_run(d: webdriver.Chrome, root: Path, page: Path, name: str) -> dict[str, Any]:
    load(d, page, VIEWPORTS[name])
    picked = choose_models(d)
    result = {
        "viewport": dict(zip(("width", "height"), VIEWPORTS[name])),
        "chosen_models": picked,
        "product_exact": exact_search(d, "searchInput", "resultCount", "#tableBody", picked["product"]),
        "product_slash": optional_slash_product(d, picked["productSlash"]),
        "product_no_result": no_result(d, "searchInput", "resultCount", "#tableBody", "emptyTip"),
    }
    load(d, page, VIEWPORTS[name])
    result["spec_exact"] = spec_journey(d, root, picked["spec"], name == "mobile")
    result["spec_separator_variant"] = separator_search(d)
    result["spec_no_result"] = no_result(d, "specSearch", "specResultCount", "#specBody", "specEmptyTip")
    if name == "mobile":
        result["mobile_search_controls"] = mobile_controls(d)
    return result


def markdown(report: dict[str, Any]) -> str:
    sep = report["desktop"]["spec_separator_variant"]["observations"][SEP_VARIANT]["top_model"]
    return "\n".join([
        "# Yuhua homepage search flow audit", "",
        f"- Result: **{'PASS' if report['ok'] else 'FAIL'}**",
        f"- Desktop product query: `{report['desktop']['product_exact']['query']}` → `{report['desktop']['product_exact']['top_model']}`",
        f"- Desktop spec query: `{report['desktop']['spec_exact']['query']}` → `{report['desktop']['spec_exact']['top_model']}`",
        f"- Separator search observation: `{SEP_VARIANT}` → stored result `{sep}` (search behavior only).",
        "- Product/spec no-result states verified on desktop and mobile.",
        "- Online specification link opened in a real browser tab; Word download action was real-clicked with navigation prevented after its target file was verified.",
        "- Mobile search inputs meet the 44px touch-target floor; spec action sizes are recorded as observations.", "",
        "Read-only audit: no product facts, specifications, prices, model meanings, or specification contents are changed.", ""
    ])


def main() -> int:
    a = args()
    root = Path(a.root).resolve()
    page = root / "index.html"
    if not page.is_file():
        raise SystemExit(f"Missing homepage: {page}")
    chrome, driver_bin = browser_binary()
    d = new_driver(chrome, driver_bin)
    try:
        desktop = viewport_run(d, root, page, "desktop")
        mobile = viewport_run(d, root, page, "mobile")
    finally:
        d.quit()
    report = {
        "ok": True,
        "policy": "只读搜索流程审计：不修改、猜测或覆盖产品型号、参数、价格、规格书内容；分隔符测试只验证现有搜索行为。",
        "browser": chrome,
        "desktop": desktop,
        "mobile": mobile,
        "static_contract": static_contract(root),
    }
    (root / a.json).write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (root / a.markdown).write_text(markdown(report), encoding="utf-8")
    print(f"Homepage search flow audit: PASS (product={desktop['product_exact']['query']}; spec={desktop['spec_exact']['query']}; separator={SEP_VARIANT})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
