#!/usr/bin/env python3
"""Read-only evidence audit for the literal YRE-2012 power-supply conflict."""

from __future__ import annotations
import argparse, html, json, re
from pathlib import Path

MODEL = "YRE-2012"

def key(v):
    return str(v or "").strip().casefold()

def text_of(doc):
    doc = re.sub(r"<script\b[^>]*>.*?</script>", " ", doc, flags=re.I|re.S)
    doc = re.sub(r"<style\b[^>]*>.*?</style>", " ", doc, flags=re.I|re.S)
    doc = re.sub(r"<[^>]+>", " ", doc, flags=re.S)
    return re.sub(r"\s+", " ", html.unescape(doc)).strip()

def runtime_rows(path):
    raw = path.read_text(encoding="utf-8")
    marker = "window.PRODUCTS="
    pos = raw.find(marker)
    if pos < 0:
        raise ValueError("window.PRODUCTS not found")
    rows, _ = json.JSONDecoder().raw_decode(raw[pos + len(marker):].lstrip())
    return rows

def explicit_supply_hits(body):
    # Important: 200VA is input power, not a 200V supply value.
    pattern = re.compile(r"额定电源\s*[:：]?\s*(?:AC\s*)?(\d{2,4})\s*V", re.I)
    return sorted({f"{int(m.group(1))}V" for m in pattern.finditer(body)})

def audit(root):
    products = json.loads((root/"products.json").read_text(encoding="utf-8"))
    specs = json.loads((root/"specs_index.json").read_text(encoding="utf-8"))
    runtime = runtime_rows(root/"assets"/"data.js")
    source = [r for r in products if key(r.get("型号")) == key(MODEL)]
    live = [r for r in runtime if key(r.get("型号")) == key(MODEL)]
    indexed = [r for r in specs if key(r.get("model")) == key(MODEL)]
    pages = []
    rated = set()
    for item in indexed:
        rel = str(item.get("page") or "").strip()
        path = root/rel
        record = {"page": rel, "exists": path.is_file(), "read_error": "", "rated_supply_values": []}
        if not path.is_file():
            record["read_error"] = "missing specification page"
        else:
            try:
                body = text_of(path.read_text(encoding="utf-8"))
                record["rated_supply_values"] = explicit_supply_hits(body)
                rated.update(record["rated_supply_values"])
                record["contains_200va_input_power"] = bool(re.search(r"200\s*VA", body, re.I))
            except (OSError, UnicodeError) as exc:
                record["read_error"] = f"{type(exc).__name__}: {exc}"
        pages.append(record)
    source_values = sorted({str(r.get("电源") or "").strip() for r in source if str(r.get("电源") or "").strip()})
    runtime_values = sorted({str(r.get("电源") or "").strip() for r in live if str(r.get("电源") or "").strip()})
    return {
        "target_model": MODEL,
        "policy": {
            "literal_model_identity": "trim outer whitespace and fold case only",
            "evidence_scope": "exact-model spec index rows and explicitly labeled rated-supply values only",
            "automatic_fix_authorized": False,
        },
        "summary": {
            "source_exact_row_count": len(source),
            "runtime_exact_row_count": len(live),
            "exact_spec_index_row_count": len(indexed),
            "spec_page_read_error_count": sum(bool(p["read_error"]) for p in pages),
            "source_power_values": source_values,
            "runtime_power_values": runtime_values,
            "spec_rated_supply_values": sorted(rated),
            "unanimous_spec_rated_supply": next(iter(rated)) if len(rated) == 1 else "",
            "automatic_fix_authorized": False,
        },
        "spec_pages": pages,
        "review_notes": [
            "Both exact YRE-2012 specification pages are evaluated independently.",
            "A 200VA input-power statement is not interpreted as a 200V supply statement.",
            "Any product-data correction remains a reviewable product-fact change and is not performed by this audit.",
        ],
    }

def self_test():
    sample = "电源输入功率 2A、200VA 额定电源 AC220V、50Hz"
    assert explicit_supply_hits(sample) == ["220V"]
    assert key(" YRE-2012 ") == key("yre-2012")
    assert key("YRE-2012") != key("YRE2012")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    ap.add_argument("--output", type=Path)
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        self_test()
        print("self-test: ok")
        return
    report = audit(args.root.resolve())
    out = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(out, encoding="utf-8")
    else:
        print(out, end="")

if __name__ == "__main__":
    main()
