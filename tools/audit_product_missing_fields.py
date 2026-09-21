#!/usr/bin/env python3
"""Read-only audit for missing product fields and exact duplicate catalogue rows.

This script never edits products.json. It reports only evidence that can be
verified from the current catalogue, so incomplete records can be reviewed
without guessing product facts.
"""
from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


def clean(value: Any) -> str:
    return str(value or "").strip()


def canonical_row(row: dict[str, Any]) -> str:
    """Return an exact, deterministic representation of one source record."""
    return json.dumps(row, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def build_report(products: list[dict[str, Any]]) -> dict[str, Any]:
    empty_model_rows: list[int] = []
    empty_name_rows: list[int] = []
    empty_model_by_category: Counter[str] = Counter()
    empty_name_by_category: Counter[str] = Counter()
    exact_groups: defaultdict[str, list[int]] = defaultdict(list)

    for row_number, product in enumerate(products, start=1):
        model = clean(product.get("型号"))
        name = clean(product.get("产品名称"))
        category = clean(product.get("类别")) or "未分类"

        if not model:
            empty_model_rows.append(row_number)
            empty_model_by_category[category] += 1
        if not name:
            empty_name_rows.append(row_number)
            empty_name_by_category[category] += 1

        exact_groups[canonical_row(product)].append(row_number)

    exact_duplicate_groups = []
    exact_empty_model_duplicate_groups = []
    exact_duplicate_row_count = 0
    exact_empty_model_duplicate_row_count = 0

    for signature, rows in exact_groups.items():
        if len(rows) < 2:
            continue
        source = json.loads(signature)
        item = {
            "count": len(rows),
            "rows": rows,
            "model": clean(source.get("型号")),
            "name": clean(source.get("产品名称")),
            "category": clean(source.get("类别")) or "未分类",
        }
        exact_duplicate_groups.append(item)
        exact_duplicate_row_count += len(rows)
        if not item["model"]:
            exact_empty_model_duplicate_groups.append(item)
            exact_empty_model_duplicate_row_count += len(rows)

    exact_duplicate_groups.sort(key=lambda x: (-x["count"], x["rows"][0]))
    exact_empty_model_duplicate_groups.sort(key=lambda x: (-x["count"], x["rows"][0]))

    empty_name_with_model_count = sum(
        1 for product in products
        if not clean(product.get("产品名称")) and clean(product.get("型号"))
    )
    empty_name_without_model_count = sum(
        1 for product in products
        if not clean(product.get("产品名称")) and not clean(product.get("型号"))
    )

    return {
        "total": len(products),
        "empty_model_count": len(empty_model_rows),
        "empty_model_rows": empty_model_rows,
        "empty_model_by_category": dict(empty_model_by_category.most_common()),
        "empty_name_count": len(empty_name_rows),
        "empty_name_rows": empty_name_rows,
        "empty_name_by_category": dict(empty_name_by_category.most_common()),
        "all_product_names_empty": bool(products) and len(empty_name_rows) == len(products),
        "empty_name_with_model_count": empty_name_with_model_count,
        "empty_name_without_model_count": empty_name_without_model_count,
        "exact_duplicate_group_count": len(exact_duplicate_groups),
        "exact_duplicate_row_count": exact_duplicate_row_count,
        "exact_duplicate_groups": exact_duplicate_groups,
        "exact_empty_model_duplicate_group_count": len(exact_empty_model_duplicate_groups),
        "exact_empty_model_duplicate_row_count": exact_empty_model_duplicate_row_count,
        "exact_empty_model_duplicate_groups": exact_empty_model_duplicate_groups,
        "policy": "audit-only; exact duplicate evidence is not authorization to delete or merge records",
    }


def print_human(report: dict[str, Any]) -> None:
    print("=== 予华产品缺失字段 / 精确重复行审计（只读） ===")
    print(f"产品记录: {report['total']}")
    print(f"空型号: {report['empty_model_count']}")
    print(f"空产品名: {report['empty_name_count']}")
    print(f"  其中有型号: {report['empty_name_with_model_count']}")
    print(f"  同时无型号: {report['empty_name_without_model_count']}")
    print(f"全部产品名均为空: {report['all_product_names_empty']}")
    print(f"完全相同记录组: {report['exact_duplicate_group_count']}（涉及 {report['exact_duplicate_row_count']} 行）")
    print(
        "空型号且完全相同记录组: "
        f"{report['exact_empty_model_duplicate_group_count']}"
        f"（涉及 {report['exact_empty_model_duplicate_row_count']} 行）"
    )

    if report["empty_model_by_category"]:
        print("\n空型号按类别:")
        for category, count in report["empty_model_by_category"].items():
            print(f"  {category}: {count}")

    if report["exact_duplicate_groups"]:
        print("\n完全相同记录（前30组；仅审计，不自动删除/合并）:")
        for item in report["exact_duplicate_groups"][:30]:
            print(
                f"  rows={item['rows']} count={item['count']} "
                f"model={item['model']!r} category={item['category']!r}"
            )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--products", default="products.json")
    parser.add_argument("--json-out", default="")
    args = parser.parse_args()

    products_path = Path(args.products)
    products = json.loads(products_path.read_text(encoding="utf-8"))
    if not isinstance(products, list) or not all(isinstance(item, dict) for item in products):
        raise SystemExit(f"{products_path} must contain a JSON array of objects")

    report = build_report(products)
    print_human(report)

    if args.json_out:
        out = Path(args.json_out)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\nJSON report: {out}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
