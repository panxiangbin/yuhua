#!/usr/bin/env python3
"""Read-only audit for missing product names and existing evidence.

This script never writes product facts. It explains how many rows with an empty
`产品名称` still have a safe category fallback in the current UI, which rows have
literal same-model matches in the existing specification index, and which rows
only have separator-normalized model candidates that require manual review.
"""
from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def clean(value: Any) -> str:
    return str(value or "").strip()


def exact_model_key(value: Any) -> str:
    """Case-insensitive literal model key.

    Leading/trailing whitespace and letter case are ignored, but punctuation,
    separators and internal whitespace are preserved. This is the safe key used
    when the report labels a specification match as exact same-model evidence.
    """
    return clean(value).upper()


def normalized_model_key(value: Any) -> str:
    """Loose model key used only to surface manual-review candidates.

    Separator/punctuation removal mirrors tolerant site search, but a match on
    this key alone is never labelled exact evidence and never authorizes a data
    rewrite. For example, DLSB-5/30 and DLSB-5-30 remain distinct models in the
    exact-evidence classification.
    """
    return re.sub(r"[^A-Z0-9]+", "", exact_model_key(value))


def build_report(products: list[dict[str, Any]], specs: list[dict[str, Any]]) -> dict[str, Any]:
    specs_by_exact_model: defaultdict[str, list[dict[str, str]]] = defaultdict(list)
    specs_by_normalized_model: defaultdict[str, list[dict[str, str]]] = defaultdict(list)

    for row, spec in enumerate(specs, start=1):
        model = clean(spec.get("model"))
        exact_key = exact_model_key(model)
        normalized_key = normalized_model_key(model)
        if not exact_key:
            continue

        item = {
            "row": row,
            "model": model,
            "title": clean(spec.get("title")),
            "page": clean(spec.get("page")),
            "download": clean(spec.get("dl")),
        }
        specs_by_exact_model[exact_key].append(item)
        if normalized_key:
            specs_by_normalized_model[normalized_key].append(item)

    empty_name_rows: list[int] = []
    category_fallback_rows: list[int] = []
    missing_effective_name_rows: list[int] = []
    empty_model_and_name_rows: list[int] = []
    exact_evidence_rows: list[dict[str, Any]] = []
    normalized_only_candidate_rows: list[dict[str, Any]] = []
    no_candidate_rows: list[dict[str, Any]] = []
    without_exact_rows: list[dict[str, Any]] = []
    gaps_by_category: Counter[str] = Counter()

    for row, product in enumerate(products, start=1):
        name = clean(product.get("产品名称"))
        model = clean(product.get("型号"))
        category = clean(product.get("类别"))

        if name:
            continue

        empty_name_rows.append(row)
        gaps_by_category[category or "未分类"] += 1

        if category:
            category_fallback_rows.append(row)
        else:
            missing_effective_name_rows.append(row)

        if not model:
            empty_model_and_name_rows.append(row)
            continue

        exact_matches = specs_by_exact_model.get(exact_model_key(model), [])
        if exact_matches:
            unique_titles = sorted({item["title"] for item in exact_matches if item["title"]})
            exact_evidence_rows.append({
                "product_row": row,
                "product_model": model,
                "product_category": category,
                "spec_match_count": len(exact_matches),
                "spec_models": sorted({item["model"] for item in exact_matches if item["model"]}),
                "spec_titles": unique_titles,
                "spec_rows": [item["row"] for item in exact_matches],
            })
            continue

        normalized_matches = specs_by_normalized_model.get(normalized_model_key(model), [])
        without_exact_item = {
            "product_row": row,
            "product_model": model,
            "product_category": category,
        }

        if normalized_matches:
            candidate_models = sorted({item["model"] for item in normalized_matches if item["model"]})
            unique_titles = sorted({item["title"] for item in normalized_matches if item["title"]})
            candidate_item = {
                **without_exact_item,
                "candidate_match_count": len(normalized_matches),
                "candidate_models": candidate_models,
                "candidate_titles": unique_titles,
                "candidate_spec_rows": [item["row"] for item in normalized_matches],
                "reason": (
                    "Model strings match only after removing punctuation/separators; "
                    "manual review is required before treating them as the same model."
                ),
            }
            normalized_only_candidate_rows.append(candidate_item)
            without_exact_rows.append({
                **without_exact_item,
                "classification": "normalized_only_candidate",
                "candidate_models": candidate_models,
            })
        else:
            no_candidate_rows.append(without_exact_item)
            without_exact_rows.append({
                **without_exact_item,
                "classification": "no_spec_candidate",
                "candidate_models": [],
            })

    return {
        "summary": {
            "product_total": len(products),
            "empty_product_name_count": len(empty_name_rows),
            "category_fallback_count": len(category_fallback_rows),
            "missing_effective_display_name_count": len(missing_effective_name_rows),
            "empty_model_and_name_count": len(empty_model_and_name_rows),
            "empty_name_with_exact_spec_evidence_count": len(exact_evidence_rows),
            "empty_name_without_exact_spec_evidence_count": len(without_exact_rows),
            "empty_name_with_normalized_only_spec_candidate_count": len(normalized_only_candidate_rows),
            "empty_name_without_any_spec_candidate_count": len(no_candidate_rows),
        },
        "name_gap_by_category": dict(gaps_by_category.most_common()),
        "empty_product_name_rows": empty_name_rows,
        "category_fallback_rows": category_fallback_rows,
        "missing_effective_display_name_rows": missing_effective_name_rows,
        "empty_model_and_name_rows": empty_model_and_name_rows,
        "exact_spec_evidence": exact_evidence_rows,
        "normalized_only_spec_candidates": normalized_only_candidate_rows,
        "without_exact_spec_evidence": without_exact_rows,
        "without_any_spec_candidate": no_candidate_rows,
        "notes": [
            "Category fallback reflects the current catalogue UI behavior when 产品名称 is empty.",
            "Exact same-model evidence ignores only surrounding whitespace and letter case; punctuation, separators and internal whitespace remain significant.",
            "Separator-normalized matches are manual-review candidates only and are never labelled exact evidence.",
            "Specification titles are evidence for manual review only; they are not automatically treated as product names.",
            "No source product, model, parameter, price, specification text, or mapping is modified by this audit.",
        ],
    }


def print_human(report: dict[str, Any]) -> None:
    s = report["summary"]
    print("=== 予华仪器产品名称证据审计（只读） ===")
    print(f"产品记录: {s['product_total']}")
    print(f"空产品名称: {s['empty_product_name_count']}")
    print(f"当前前台可用类别名安全兜底: {s['category_fallback_count']}")
    print(f"连类别名也没有，前台可能真正缺显示名称: {s['missing_effective_display_name_count']}")
    print(f"型号和产品名称同时为空: {s['empty_model_and_name_count']}")
    print(f"空名称且存在字面精确型号规格书证据: {s['empty_name_with_exact_spec_evidence_count']}")
    print(
        "空名称且只有分隔符归一化候选（仅供人工复核）: "
        f"{s['empty_name_with_normalized_only_spec_candidate_count']}"
    )
    print(f"空名称且没有任何规格书候选: {s['empty_name_without_any_spec_candidate_count']}")

    if report["name_gap_by_category"]:
        print("\n空产品名称按类别分布:")
        for category, count in report["name_gap_by_category"].items():
            print(f"  {category}: {count}")

    if report["exact_spec_evidence"]:
        print("\n可供人工核对的字面精确型号规格书证据（前30条，不自动写回）:")
        for item in report["exact_spec_evidence"][:30]:
            titles = " | ".join(item["spec_titles"][:4]) or "（规格书标题为空）"
            print(
                f"  product#{item['product_row']} {item['product_model']} "
                f"[{item['product_category']}] -> {item['spec_match_count']}份: {titles}"
            )

    if report["normalized_only_spec_candidates"]:
        print("\n仅分隔符归一化后相同的候选（前30条，禁止自动等同）:")
        for item in report["normalized_only_spec_candidates"][:30]:
            models = " | ".join(item["candidate_models"][:6]) or "（候选型号为空）"
            print(
                f"  product#{item['product_row']} {item['product_model']} "
                f"[{item['product_category']}] -> 候选写法: {models}"
            )


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

    report = build_report(products, specs)
    print_human(report)

    if args.json_output:
        Path(args.json_output).write_text(
            json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"\nJSON report written to: {args.json_output}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
