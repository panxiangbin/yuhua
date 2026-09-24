#!/usr/bin/env python3
"""Read-only real-browser audit for Yuhua homepage product/spec search flows."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import time
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

VIEWPORTS = {"desktop": (1280, 900), "mobile": (390, 844)}
NO_RESULT = "ZZZ-NO-SUCH-YUHUA-9F7E"
SEP_LITERAL = "DLSB-5-30"
SEP_VARIANT = "DLSB-5/30"


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--root", default=".")
    p.add_argument("--json", default="homepage_search_flow_audit.json")
    p.add_argument("--markdown", default="homepage_search_flow_audit.md")
    return p.parse_args()


def browser_binary() -> tuple[str, str | None]:
    chrome = next(
        (p for n in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser") if (p := shutil.which(n))),
        None,
    )
    if not chrome:
        raise RuntimeError("No Chrome/Chromium binary found")
    driver = next((p for n in ("chromedriver", "chromium-driver") if (p := shutil.which(n))), None)
    return chrome, driver


def new_driver(chrome: str, driver: str | None) -> webdriver.Chrome:
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


def load_page(d: webdriver.Chrome, page: Path, viewport: tuple[int, int]) -> None:
    d.set_window_size(*viewport)
    d.get(page.resolve().as_uri())
    wait = WebDriverWait(d, 20)
    wait.until(lambda x: x.execute_script("return document.readyState") == "complete")
    wait.until(lambda x: x.execute_script("return (window.PRODUCTS||[]).length > 0 && (window.SPECS||[]).length > 0"))
    wait.until(lambda x: len(x.find_elements(By.CSS_SELECTOR, "#tableBody tr")) > 0)
    wait.until(lambda x: len(x.find_elements(By.CSS_SELECTOR, "#specBody tr")) > 0)


def compact(value: str) -> str:
    return re.sub(r"[\s_/.．／‐‑‒–—―·-]+", "", str(value or "").lower())


def hit_info(d: webdriver.Chrome, el: Any) -> dict[str, Any]:
    return dict(
        d.execute_script(
            """
            const el=arguments[0], r=el.getBoundingClientRect();
            const cx=r.left+r.width/2, cy=r.top+r.height/2;
            const hit=document.elementFromPoint(cx,cy);
            const wrap=el.closest('.table-wrap');
            return {
              visible:r.top>=8 && r.bottom<=innerHeight-8 && r.left>=0 && r.right<=innerWidth,
              hittable:!!hit && (hit===el || el.contains(hit)),
              top:r.top,bottom:r.bottom,left:r.left,right:r.right,
              scrollY:window.scrollY,
              wrapScrollLeft:wrap?wrap.scrollLeft:0,
              blocker:hit?`${hit.tagName}.${hit.className||''}`:'none'
            };
            """,
            el,
        )
    )


def instant_scroll_by(d: webdriver.Chrome, dy: float) -> None:
    d.execute_script(
        """
        const de=document.documentElement, body=document.body;
        const oldDe=de.style.scrollBehavior, oldBody=body.style.scrollBehavior;
        de.style.scrollBehavior='auto'; body.style.scrollBehavior='auto';
        window.scrollBy(0, arguments[0]);
        de.style.scrollBehavior=oldDe; body.style.scrollBehavior=oldBody;
        """,
        float(dy),
    )


def make_clickable(d: webdriver.Chrome, el: Any) -> dict[str, Any]:
    """Expose an element without scrollIntoView side effects.

    The specs table has sticky headers and a horizontal scroller. Native
    scrollIntoView can move overflow ancestors and park a one-row filtered
    result underneath its sticky <th>. This helper uses instant document-only
    scrolling plus real horizontal wrapper scrolling; Selenium still performs
    the actual pointer click.
    """
    for _ in range(10):
        info = hit_info(d, el)
        if info["visible"] and info["hittable"]:
            return info

        inner_w = float(d.execute_script("return innerWidth"))
        if info["left"] < 8 or info["right"] > inner_w - 8:
            d.execute_script(
                """
                const el=arguments[0], wrap=el.closest('.table-wrap');
                if(wrap){
                  const old=wrap.style.scrollBehavior; wrap.style.scrollBehavior='auto';
                  const r=el.getBoundingClientRect();
                  if(r.right>innerWidth-8) wrap.scrollLeft += r.right-(innerWidth-24);
                  if(r.left<8) wrap.scrollLeft += r.left-24;
                  wrap.style.scrollBehavior=old;
                }
                """,
                el,
            )
            time.sleep(0.03)
            continue

        inner_h = float(d.execute_script("return innerHeight"))
        if info["bottom"] > inner_h - 16:
            instant_scroll_by(d, info["bottom"] - (inner_h - 32))
        elif info["top"] < 110:
            instant_scroll_by(d, info["top"] - 150)
        elif str(info["blocker"]).startswith("TH"):
            # Near document bottom, a sticky header may be constrained by a
            # short filtered table and cover its only row. Moving upward is
            # the same recovery available to a real user.
            instant_scroll_by(d, -240)
        else:
            instant_scroll_by(d, -120)
        time.sleep(0.03)

    raise AssertionError(f"Element could not be exposed for a real click: {hit_info(d, el)}")


def type_search(d: webdriver.Chrome, input_id: str, query: str) -> None:
    el = d.find_element(By.ID, input_id)
    make_clickable(d, el)
    el.click()
    el.clear()
    el.send_keys(query)
    if el.get_attribute("value") != query:
        raise AssertionError(f"Search input #{input_id} did not accept {query!r}")


def models(d: webdriver.Chrome, body: str) -> list[str]:
    values = d.execute_script(
        "return Array.from(document.querySelectorAll(arguments[0]+' tr td.model')).map(x=>(x.textContent||'').trim()).filter(Boolean);",
        body,
    )
    return [str(v) for v in values]


def wait_top_match(d: webdriver.Chrome, body: str, expected: str) -> list[str]:
    def ready(x: webdriver.Chrome) -> list[str] | bool:
        found = models(x, body)
        return found if found and compact(found[0]) == compact(expected) else False

    return list(WebDriverWait(d, 10).until(ready))


def choose_models(d: webdriver.Chrome) -> dict[str, str]:
    picked = d.execute_script(
        """
        const p=(window.PRODUCTS||[]).map(x=>String(x['型号']||'').trim()).filter(Boolean);
        const s=(window.SPECS||[]).map(x=>String(x.model||'').trim()).filter(Boolean);
        const pick=(a,w)=>a.includes(w)?w:(a.find(x=>x.includes('-'))||a[0]||'');
        return {product:pick(p,'YRE-2020Z'),productSlash:p.find(x=>x.includes('/'))||'',spec:pick(s,'DLSB-5-30')};
        """
    )
    if not picked.get("product") or not picked.get("spec"):
        raise AssertionError(f"No suitable real models found: {picked!r}")
    return {k: str(v) for k, v in picked.items()}


def exact_search(d: webdriver.Chrome, input_id: str, count_id: str, body: str, query: str) -> dict[str, Any]:
    type_search(d, input_id, query)
    found = wait_top_match(d, body, query)
    count = int(d.find_element(By.ID, count_id).text.strip())
    if count <= 0 or query not in found:
        raise AssertionError(f"Exact search ranking failed: query={query!r}, count={count}, rows={found[:10]!r}")
    return {"query": query, "count": count, "top_model": found[0]}


def no_result(d: webdriver.Chrome, input_id: str, count_id: str, body: str, empty_id: str) -> dict[str, Any]:
    type_search(d, input_id, NO_RESULT)
    WebDriverWait(d, 10).until(lambda x: x.find_element(By.ID, count_id).text.strip() == "0")
    found = models(d, body)
    empty = d.find_element(By.ID, empty_id)
    if found or not empty.is_displayed():
        raise AssertionError(f"No-result state mismatch: rows={found[:5]!r}, empty={empty.is_displayed()}")
    return {"query": NO_RESULT, "count": 0, "message": empty.text.strip()}


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


def rect(d: webdriver.Chrome, el: Any) -> dict[str, float]:
    r = d.execute_script("const r=arguments[0].getBoundingClientRect(); return {width:r.width,height:r.height};", el)
    return {"width": float(r["width"]), "height": float(r["height"])}


def open_online(d: webdriver.Chrome, link: Any, expected: Path) -> dict[str, Any]:
    position = make_clickable(d, link)
    before = list(d.window_handles)
    link.click()
    WebDriverWait(d, 10).until(lambda x: len(x.window_handles) == len(before) + 1)
    new_handle = next(h for h in d.window_handles if h not in before)
    d.switch_to.window(new_handle)
    try:
        WebDriverWait(d, 10).until(lambda x: x.execute_script("return document.readyState") == "complete")
        loaded = Path(unquote(urlparse(d.current_url).path)).resolve()
        title = d.title.strip()
        if loaded != expected.resolve() or not title:
            raise AssertionError(f"Online spec did not open expected titled page: {loaded}")
    finally:
        d.close()
        d.switch_to.window(before[0])
    return {"opened": True, "title": title, "click_position": position}


def click_download_probe(d: webdriver.Chrome, link: Any) -> dict[str, Any]:
    d.execute_script(
        """window.__dl=null;arguments[0].addEventListener('click',e=>{e.preventDefault();window.__dl={href:e.currentTarget.href,download:e.currentTarget.getAttribute('download')||''};},{once:true,capture:true});""",
        link,
    )
    position = make_clickable(d, link)
    expected_href = link.get_attribute("href")
    link.click()
    captured = WebDriverWait(d, 10).until(lambda x: x.execute_script("return window.__dl;"))
    if captured["href"] != expected_href:
        raise AssertionError("Download click target changed unexpectedly")
    return {"clicked": True, "click_position": position, **captured}


def spec_journey(d: webdriver.Chrome, root: Path, query: str, mobile: bool) -> dict[str, Any]:
    base = exact_search(d, "specSearch", "specResultCount", "#specBody", query)
    row = d.find_element(By.CSS_SELECTOR, "#specBody tr")
    online = row.find_element(By.CSS_SELECTOR, "a.spec-btn.rich")
    download = row.find_element(By.CSS_SELECTOR, "a.spec-btn[download]")
    online_path = repo_file(root, online.get_attribute("href"))
    download_path = repo_file(root, download.get_attribute("href"))
    if download_path.suffix.lower() not in {".doc", ".docx"}:
        raise AssertionError(f"Download is not Word format: {download_path}")
    sizes = {"online": rect(d, online), "download": rect(d, download)}
    opened = open_online(d, online, online_path)
    download = d.find_element(By.CSS_SELECTOR, "#specBody tr a.spec-btn[download]")
    clicked = click_download_probe(d, download)
    return {
        **base,
        "online_target": online_path.relative_to(root).as_posix(),
        "download_target": download_path.relative_to(root).as_posix(),
        "online_click": opened,
        "download_click": clicked,
        "action_target_px": sizes,
        "mobile": mobile,
    }


def separator_search(d: webdriver.Chrome) -> dict[str, Any]:
    observations: dict[str, Any] = {}
    for query in (SEP_LITERAL, SEP_VARIANT):
        type_search(d, "specSearch", query)
        found = wait_top_match(d, "#specBody", SEP_LITERAL)
        count = int(d.find_element(By.ID, "specResultCount").text.strip())
        if count <= 0:
            raise AssertionError(f"Separator search returned no result: {query!r}")
        observations[query] = {"count": count, "top_model": found[0]}
    return {
        "literal": SEP_LITERAL,
        "variant": SEP_VARIANT,
        "normalized_token": compact(SEP_LITERAL),
        "observations": observations,
        "note": "Search behavior only; stored model facts are not rewritten or declared equivalent.",
    }


def mobile_controls(d: webdriver.Chrome) -> dict[str, Any]:
    controls: dict[str, Any] = {}
    for element_id in ("searchInput", "specSearch"):
        size = rect(d, d.find_element(By.ID, element_id))
        if min(size.values()) < 44:
            raise AssertionError(f"Mobile search target #{element_id} is under 44px: {size}")
        controls[element_id] = size
    return {"min_touch_target_px": 44, "controls": controls}


def static_contract(root: Path) -> dict[str, bool]:
    html = (root / "index.html").read_text(encoding="utf-8")
    js = (root / "app.js").read_text(encoding="utf-8")
    for token in (
        'id="searchInput"',
        'aria-describedby="catalogResultStatus"',
        'id="specSearch"',
        'aria-describedby="specResultStatus"',
        'id="emptyTip"',
        'id="specEmptyTip"',
    ):
        if token not in html:
            raise AssertionError(f"Missing search/status contract: {token}")
    for token in ("function normalizeSearchText(value)", "function searchMatchRank(", "rankSearchResults("):
        if token not in js:
            raise AssertionError(f"Missing shared search contract: {token}")
    return {
        "product_search_status_wiring": True,
        "spec_search_status_wiring": True,
        "shared_ranking_helper": True,
        "separator_normalization": True,
    }


def viewport_run(d: webdriver.Chrome, root: Path, page: Path, name: str) -> dict[str, Any]:
    load_page(d, page, VIEWPORTS[name])
    picked = choose_models(d)
    result: dict[str, Any] = {
        "viewport": {"width": VIEWPORTS[name][0], "height": VIEWPORTS[name][1]},
        "chosen_models": picked,
        "product_exact": exact_search(d, "searchInput", "resultCount", "#tableBody", picked["product"]),
    }
    result["product_slash"] = (
        exact_search(d, "searchInput", "resultCount", "#tableBody", picked["productSlash"])
        if picked["productSlash"]
        else None
    )
    result["product_no_result"] = no_result(d, "searchInput", "resultCount", "#tableBody", "emptyTip")

    load_page(d, page, VIEWPORTS[name])
    result["spec_exact"] = spec_journey(d, root, picked["spec"], name == "mobile")
    result["spec_separator_variant"] = separator_search(d)
    result["spec_no_result"] = no_result(d, "specSearch", "specResultCount", "#specBody", "specEmptyTip")
    if name == "mobile":
        result["mobile_search_controls"] = mobile_controls(d)
    return result


def render_markdown(report: dict[str, Any]) -> str:
    sep = report["desktop"]["spec_separator_variant"]["observations"][SEP_VARIANT]["top_model"]
    return "\n".join(
        [
            "# Yuhua homepage search flow audit",
            "",
            "- Result: **PASS**",
            f"- Desktop product query: `{report['desktop']['product_exact']['query']}` → `{report['desktop']['product_exact']['top_model']}`",
            f"- Desktop spec query: `{report['desktop']['spec_exact']['query']}` → `{report['desktop']['spec_exact']['top_model']}`",
            f"- Separator search observation: `{SEP_VARIANT}` → stored result `{sep}` (search behavior only).",
            "- Product/spec no-result states verified on desktop and mobile.",
            "- Online spec link opened by a real Selenium click; Word download action was real-clicked after its target file was verified.",
            "- Mobile search inputs meet the 44px touch-target floor; spec action sizes are recorded as observations.",
            "",
            "Read-only audit: no product facts, specifications, prices, model meanings, or specification contents are changed.",
            "",
        ]
    )


def main() -> int:
    a = parse_args()
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
    (root / a.markdown).write_text(render_markdown(report), encoding="utf-8")
    print(
        "Homepage search flow audit: PASS "
        f"(product={desktop['product_exact']['query']}; spec={desktop['spec_exact']['query']}; separator={SEP_VARIANT})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
