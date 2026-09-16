#!/usr/bin/env python3
"""Read-only audit for missing product names and existing evidence.

This script never writes product facts. It explains how many rows with an empty
`产品名称` still have a safe category fallback in the current UI, and which rows
have exact-model matches in the existing specification index that can be used as
manual evidence in a future review.
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


def norm_model(value: Any) -> str:
    """Normalize common model separators for evidence matching only.

    This mirrors the site's tolerant model search. A match is evidence for
    manual review, not permission to rewrite product facts automatically.
    """
    return re.sub(r"[^A-Z0-9]+", "", clean(value).upper())


def build_report(products: list[dict[str, Any]], specs: list[dict[str, Any]]) -> dict[str, Any]:
    specs_by_model: defaultdict[str, list[dict[str, str]]] = defaultdict(list)
    for row, spec in enumerate(specs, start=1):
        model = clean(spec.get("model"))
        key = norm_model(model)
        if not key:
            continue
        specs_by_model[key].append({
            "row": row,
            "model": model,
            "title": clean(spec.get("title")),
            "page": clean(spec.get("page")),
            "download": clean(spec.get("dl")),
        })

    empty_name_rows: list[int] = []
    category_fallback_rows: list[int] = []
    missing_effective_name_rows: list[int] = []
    empty_model_and_name_rows: list[int] = []
    evidence_rows: list[dict[str, Any]] = []
    no_evidence_rows: list[dict[str, Any]] = []
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

        matches = specs_by_model.get(norm_model(model), [])
        if matches:
            unique_titles = sorted({item["title"] for item in matches if item["title"]})
            evidence_rows.append({
                "product_row": row,
                "product_model": model,
                "product_category": category,
                "spec_match_count": len(matches),
                "spec_titles": unique_titles,
                "spec_rows": [item["row"] for item in matches],
            })
        else:
            no_evidence_rows.append({
                "product_row": row,
                "product_model": model,
                "product_category": category,
            })

    return {
        "summary": {
            "product_total": len(products),
            "empty_product_name_count": len(empty_name_rows),
            "category_fallback_count": len(category_fallback_rows),
            "missing_effective_display_name_count": len(missing_effective_name_rows),
            "empty_model_and_name_count": len(empty_model_and_name_rows),
            "empty_name_with_exact_spec_evidence_count": len(evidence_rows),
            "empty_name_without_exact_spec_evidence_count": len(no_evidence_rows),
        },
        "name_gap_by_category": dict(gaps_by_category.most_common()),
        "empty_product_name_rows": empty_name_rows,
        "category_fallback_rows": category_fallback_rows,
        "missing_effective_display_name_rows": missing_effective_name_rows,
        "empty_model_and_name_rows": empty_model_and_name_rows,
        "exact_spec_evidence": evidence_rows,
        "without_exact_spec_evidence": no_evidence_rows,
        "notes": [
            "Category fallback reflects the current catalogue UI behavior when 产品名称 is empty.",
            "Exact spec matches are evidence for manual review only; specification titles are not automatically treated as product names.",
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
    print(f"空名称且存在精确型号规格书证据: {s['empty_name_with_exact_spec_evidence_count']}")
    print(f"空名称且暂无精确型号规格书证据: {s['empty_name_without_exact_spec_evidence_count']}")

    if report["name_gap_by_category"]:
        print("\n空产品名称按类别分布:")
        for category, count in report["name_gap_by_category"].items():
            print(f"  {category}: {count}")

    if report["exact_spec_evidence"]:
        print("\n可供人工核对的精确型号规格书证据（前30条，不自动写回）:")
        for item in report["exact_spec_evidence"][:30]:
            titles = " | ".join(item["spec_titles"][:4]) or "（规格书标题为空）"
            print(
                f"  product#{item['product_row']} {item['product_model']} "
                f"[{item['product_category']}] -> {item['spec_match_count']}份: {titles}"
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
