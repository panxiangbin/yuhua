#!/usr/bin/env python3
"""Classify suspicious specification-model values without changing source data.

The main data-quality check deliberately reports suspicious values broadly. This
script makes that list actionable by separating obvious file-extension leakage,
placeholder tokens, brand/generic tokens, and by attaching existing catalogue
and title evidence to possible review candidates.

Important: candidates in this report are evidence for manual review only. The
script never rewrites specs_index.json or products.json.
"""
from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from check_product_data import clean, is_suspicious_model, norm_model

EXTENSION_PLACEHOLDERS = {"DOC", "DOCX", "PDF", "JPG", "JPEG", "PNG", "XLS", "XLSX"}
BRAND_TOKENS = {"YUHUA"}
GENERIC_TOKENS = {"WORD", "FACTORY", "PARAMETER", "PARAMETERS", "说明书", "参数", "产品参数", "技术参数"}
DOC_SUFFIX_RE = re.compile(r"(?i)\.docx?$")
CAPACITY_ONLY_RE = re.compile(r"^\d+(?:\.\d+)?L$", re.I)


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def compact(value: Any) -> str:
    return re.sub(r"[^A-Z0-9]+", "", clean(value).upper())


def classify(model: str) -> str:
    normalized = norm_model(model)
    if normalized in EXTENSION_PLACEHOLDERS:
        return "extension_placeholder"
    if DOC_SUFFIX_RE.search(model):
        return "filename_extension_suffix"
    if normalized in BRAND_TOKENS:
        return "brand_token"
    if normalized in GENERIC_TOKENS:
        return "generic_token"
    return "other_suspicious"


def candidate_without_doc_extension(model: str) -> str:
    if not DOC_SUFFIX_RE.search(model):
        return ""
    return DOC_SUFFIX_RE.sub("", model).strip()


def build_product_model_index(products: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    index: defaultdict[str, list[dict[str, Any]]] = defaultdict(list)
    for row, product in enumerate(products, start=1):
        model = clean(product.get("型号"))
        if not model:
            continue
        index[norm_model(model)].append({
            "row": row,
            "model": model,
            "category": clean(product.get("类别")),
        })
    return dict(index)


def audit(products: list[dict[str, Any]], specs: list[dict[str, Any]]) -> dict[str, Any]:
    product_models = build_product_model_index(products)
    category_counts: Counter[str] = Counter()
    evidence_counts: Counter[str] = Counter()
    records: list[dict[str, Any]] = []

    for row, spec in enumerate(specs, start=1):
        model = clean(spec.get("model"))
        if not is_suspicious_model(model):
            continue

        category = classify(model)
        category_counts[category] += 1
        title = clean(spec.get("title"))
        series = clean(spec.get("series"))
        candidate = candidate_without_doc_extension(model)
        candidate_key = norm_model(candidate) if candidate else ""
        candidate_compact = compact(candidate)
        exact_product_matches = product_models.get(candidate_key, []) if candidate_key else []
        title_support = bool(candidate_compact and candidate_compact in compact(title))
        series_support = bool(candidate_compact and candidate_compact in compact(series))
        capacity_only = bool(candidate and CAPACITY_ONLY_RE.fullmatch(candidate))

        if exact_product_matches:
            evidence_level = "exact_product_model_match"
        elif title_support and series_support:
            evidence_level = "title_and_series_support"
        elif title_support:
            evidence_level = "title_support_only"
        elif series_support:
            evidence_level = "series_support_only"
        else:
            evidence_level = "no_candidate_evidence"
        evidence_counts[evidence_level] += 1

        records.append({
            "row": row,
            "model": model,
            "title": title,
            "series": series,
            "category": category,
            "review_candidate": candidate,
            "candidate_is_capacity_only": capacity_only,
            "candidate_in_title": title_support,
            "candidate_in_series": series_support,
            "exact_product_model_matches": exact_product_matches,
            "evidence_level": evidence_level,
            "page": clean(spec.get("page")),
            "download": clean(spec.get("dl")),
        })

    suffix_records = [r for r in records if r["category"] == "filename_extension_suffix"]
    strong_suffix = [r for r in suffix_records if r["evidence_level"] == "exact_product_model_match"]
    capacity_only = [r for r in suffix_records if r["candidate_is_capacity_only"]]
    unresolved_placeholders = [r for r in records if r["category"] == "extension_placeholder"]
    token_records = [r for r in records if r["category"] in {"brand_token", "generic_token", "other_suspicious"}]

    return {
        "policy": {
            "read_only": True,
            "auto_fix_count": 0,
            "note": "Review candidates are evidence only; no model value is rewritten automatically.",
        },
        "summary": {
            "total_specs": len(specs),
            "suspicious_model_count": len(records),
            "category_counts": dict(sorted(category_counts.items())),
            "evidence_counts": dict(sorted(evidence_counts.items())),
            "filename_extension_suffix_count": len(suffix_records),
            "suffix_candidate_exact_product_match_count": len(strong_suffix),
            "suffix_candidate_title_supported_count": sum(1 for r in suffix_records if r["candidate_in_title"]),
            "capacity_only_suffix_count": len(capacity_only),
            "extension_placeholder_count": len(unresolved_placeholders),
        },
        "review_groups": {
            "suffix_candidates_with_exact_product_match": strong_suffix,
            "capacity_only_suffix_candidates": capacity_only,
            "extension_placeholders_without_model": unresolved_placeholders,
            "brand_generic_or_other_tokens": token_records,
        },
        "all_suspicious_records": records,
    }


def print_human(report: dict[str, Any]) -> None:
    summary = report["summary"]
    print("=== 规格书疑似异常型号分类审计（只读） ===")
    print(f"规格书总数: {summary['total_specs']}")
    print(f"疑似异常型号: {summary['suspicious_model_count']}")
    print("分类:")
    for key, count in summary["category_counts"].items():
        print(f"  {key}: {count}")
    print(f"带 .DOC/.DOCX 后缀: {summary['filename_extension_suffix_count']}")
    print(f"  其中与产品目录精确型号一致: {summary['suffix_candidate_exact_product_match_count']}")
    print(f"  其中候选值可在规格书标题中找到: {summary['suffix_candidate_title_supported_count']}")
    print(f"  其中仅容量样式候选: {summary['capacity_only_suffix_count']}")
    print(f"仅扩展名占位: {summary['extension_placeholder_count']}")
    print("自动修复: 0（全部保留为人工核对证据）")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--products", default="products.json")
    parser.add_argument("--specs", default="specs_index.json")
    parser.add_argument("--json-output", default="")
    args = parser.parse_args()

    products = load_json(Path(args.products))
    specs = load_json(Path(args.specs))
    if not isinstance(products, list) or not isinstance(specs, list):
        raise SystemExit("products.json and specs_index.json must both contain JSON arrays")

    report = audit(products, specs)
    print_human(report)
    if args.json_output:
        Path(args.json_output).write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
