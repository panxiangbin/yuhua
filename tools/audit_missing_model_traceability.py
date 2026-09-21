#!/usr/bin/env python3
"""Read-only traceability audit for product rows whose model field is empty.

This script never changes products.json or any specification content. It only
compares an incomplete catalogue row with existing repository evidence:
1) an exact match on factual profile fields to a same-category row that already
   has a model; and
2) whether that candidate model already exists in the specification index.

A candidate is deliberately labelled as audit evidence only and must never be
auto-written back into the catalogue.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
PRODUCTS_PATH = ROOT / "products.json"
DATA_JS_PATH = ROOT / "assets" / "data.js"
SPECS_JS_PATH = ROOT / "assets" / "specs.js"
PAGES_PATH = ROOT / "pages.json"

MODEL_FIELD = "型号"
CATEGORY_FIELD = "类别"
PROFILE_FIELDS = (
    "材质",
    "电源",
    "功率",
    "控温范围",
    "真空度",
    "转速",
    "容量",
    "尺寸",
    "重量",
)
TARGET_CATEGORIES = {"其他设备", "高压反应釜"}


def text(value: Any) -> str:
    return str(value or "").strip()


def norm(value: Any) -> str:
    return re.sub(r"\s+", " ", text(value)).casefold()


def norm_model(value: Any) -> str:
    value = text(value).upper()
    value = re.sub(r"\.DOCX?$", "", value, flags=re.I)
    value = value.replace("（", "(").replace("）", ")")
    return re.sub(r"\s+", "", value)


def profile(row: dict[str, Any]) -> tuple[str, ...]:
    return tuple(norm(row.get(field)) for field in PROFILE_FIELDS)


def load_js_array(path: Path, variable: str) -> list[dict[str, Any]]:
    raw = path.read_text(encoding="utf-8")
    match = re.search(
        rf"window\.{re.escape(variable)}\s*=\s*(\[.*?\])\s*;",
        raw,
        flags=re.S,
    )
    if not match:
        raise RuntimeError(f"Cannot find window.{variable} array in {path}")
    value = json.loads(match.group(1))
    if not isinstance(value, list):
        raise TypeError(f"window.{variable} must be an array")
    return value


def build_category_keys() -> dict[str, str]:
    rows = load_js_array(DATA_JS_PATH, "CATEGORIES")
    return {text(row.get("name")): text(row.get("key")) for row in rows}


def build_spec_models() -> dict[str, set[str]]:
    specs = load_js_array(SPECS_JS_PATH, "SPECS")
    by_key: dict[str, set[str]] = defaultdict(set)
    for spec in specs:
        model = norm_model(spec.get("model"))
        key = text(spec.get("key"))
        if model and key:
            by_key[key].add(model)
    return by_key


def build_series_pages() -> dict[str, list[dict[str, Any]]]:
    pages = json.loads(PAGES_PATH.read_text(encoding="utf-8"))
    by_key: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for page in pages:
        key = text(page.get("key"))
        if key:
            by_key[key].append(page)
    return by_key


def series_page_support(
    model: str, category_key: str, pages_by_key: dict[str, list[dict[str, Any]]]
) -> list[str]:
    normalized_model = norm_model(model)
    supported: list[str] = []
    for page in pages_by_key.get(category_key, []):
        prefixes = [norm_model(prefix) for prefix in page.get("prefixes", [])]
        if any(prefix and normalized_model.startswith(prefix) for prefix in prefixes):
            path = text(page.get("path"))
            if path:
                supported.append(path)
    return sorted(set(supported))


def audit() -> dict[str, Any]:
    rows = json.loads(PRODUCTS_PATH.read_text(encoding="utf-8"))
    if not isinstance(rows, list):
        raise TypeError("products.json must contain an array")

    category_keys = build_category_keys()
    spec_models = build_spec_models()
    pages_by_key = build_series_pages()

    modeled_by_profile: dict[tuple[str, tuple[str, ...]], list[tuple[int, dict[str, Any]]]] = defaultdict(list)
    missing: list[tuple[int, dict[str, Any]]] = []

    for row_index, row in enumerate(rows, start=1):
        category = text(row.get(CATEGORY_FIELD))
        model = text(row.get(MODEL_FIELD))
        if model:
            modeled_by_profile[(category, profile(row))].append((row_index, row))
        else:
            missing.append((row_index, row))

    results: list[dict[str, Any]] = []
    strength_counts: Counter[str] = Counter()
    category_counts: Counter[str] = Counter()
    target_strength_counts: Counter[str] = Counter()

    for row_index, row in missing:
        category = text(row.get(CATEGORY_FIELD))
        category_key = category_keys.get(category, "")
        matches = modeled_by_profile.get((category, profile(row)), [])
        candidate_models = sorted({text(match.get(MODEL_FIELD)) for _, match in matches if text(match.get(MODEL_FIELD))})

        if not candidate_models:
            strength = "no_exact_profile_evidence"
            candidate = ""
            spec_supported = False
            page_support: list[str] = []
        elif len(candidate_models) > 1:
            strength = "ambiguous_exact_profile"
            candidate = ""
            spec_supported = False
            page_support = []
        else:
            candidate = candidate_models[0]
            spec_supported = bool(category_key and norm_model(candidate) in spec_models.get(category_key, set()))
            page_support = series_page_support(candidate, category_key, pages_by_key)
            strength = "exact_profile_plus_spec_index" if spec_supported else "exact_profile_catalog_only"

        candidate_rows = [
            {"row": match_index, "model": text(match.get(MODEL_FIELD))}
            for match_index, match in matches
        ]
        populated_profile = {
            field: text(row.get(field))
            for field in PROFILE_FIELDS
            if text(row.get(field))
        }

        item = {
            "row": row_index,
            "category": category,
            "category_key": category_key,
            "target_category": category in TARGET_CATEGORIES,
            "evidence_strength": strength,
            "candidate_model": candidate,
            "candidate_rows": candidate_rows,
            "candidate_models": candidate_models,
            "candidate_in_spec_index": spec_supported,
            "series_page_support": page_support,
            "populated_profile": populated_profile,
        }
        results.append(item)
        strength_counts[strength] += 1
        category_counts[category or "(空类别)"] += 1
        if category in TARGET_CATEGORIES:
            target_strength_counts[strength] += 1

    strong = [item for item in results if item["evidence_strength"] == "exact_profile_plus_spec_index"]
    target_rows = [item for item in results if item["target_category"]]

    return {
        "policy": {
            "mode": "read_only_audit",
            "autofill_allowed": False,
            "note": "Candidate models are evidence for manual review only; never auto-fill product facts from this report.",
        },
        "summary": {
            "total_product_rows": len(rows),
            "missing_model_rows": len(missing),
            "target_category_missing_rows": len(target_rows),
            "strong_evidence_rows": len(strong),
            "evidence_strength_counts": dict(sorted(strength_counts.items())),
            "target_evidence_strength_counts": dict(sorted(target_strength_counts.items())),
            "missing_by_category": dict(sorted(category_counts.items(), key=lambda pair: (-pair[1], pair[0]))),
        },
        "strong_evidence": strong,
        "target_category_rows": target_rows,
        "all_missing_model_rows": results,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json-out", type=Path)
    args = parser.parse_args()

    report = audit()
    summary = report["summary"]
    print(f"Products: {summary['total_product_rows']}")
    print(f"Missing model rows: {summary['missing_model_rows']}")
    print(f"Target-category missing rows: {summary['target_category_missing_rows']}")
    print(f"Strong evidence rows: {summary['strong_evidence_rows']}")
    print("Evidence strengths:")
    for label, count in summary["evidence_strength_counts"].items():
        print(f"  {label}: {count}")

    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"Report: {args.json_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
