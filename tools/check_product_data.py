#!/usr/bin/env python3
"""Read-only data quality checks for the Yuhua product catalogue.

This script NEVER modifies product/spec data. It only reports records that need
manual review before they are published or merged.
"""
from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

SUSPICIOUS_MODELS = {
    "DOCX", "WORD", "FACTORY", "YUHUA", "PARAMETER", "PARAMETERS",
    "说明书", "参数", "产品参数", "技术参数",
}


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def clean(value: Any) -> str:
    return str(value or "").strip()


def norm_model(value: Any) -> str:
    s = clean(value).upper()
    s = re.sub(r"\s+", "", s)
    return s


def is_suspicious_model(value: Any) -> bool:
    raw = clean(value)
    normalized = norm_model(value)
    if not normalized:
        return False
    if normalized in SUSPICIOUS_MODELS:
        return True
    if normalized.endswith(".DOCX") or normalized.endswith(".DOC"):
        return True
    if normalized in {"PDF", "JPG", "JPEG", "PNG", "XLS", "XLSX"}:
        return True
    return False


def product_report(products: list[dict[str, Any]]) -> dict[str, Any]:
    empty_model = []
    empty_name = []
    suspicious_model = []
    models: defaultdict[str, list[int]] = defaultdict(list)
    categories = Counter()

    for i, p in enumerate(products, start=1):
        model = clean(p.get("型号"))
        name = clean(p.get("产品名称"))
        category = clean(p.get("类别")) or "未分类"
        categories[category] += 1

        if not model:
            empty_model.append(i)
        else:
            models[norm_model(model)].append(i)
        if not name:
            empty_name.append(i)
        if is_suspicious_model(model):
            suspicious_model.append({"row": i, "model": model, "name": name, "category": category})

    duplicates = [
        {"model": m, "count": len(rows), "rows": rows}
        for m, rows in models.items() if m and len(rows) > 1
    ]
    duplicates.sort(key=lambda x: (-x["count"], x["model"]))

    return {
        "total": len(products),
        "empty_model_count": len(empty_model),
        "empty_model_rows": empty_model,
        "empty_name_count": len(empty_name),
        "empty_name_rows": empty_name,
        "suspicious_model_count": len(suspicious_model),
        "suspicious_models": suspicious_model,
        "duplicate_model_group_count": len(duplicates),
        "duplicate_models": duplicates,
        "category_counts": dict(categories.most_common()),
    }


def spec_report(specs: list[dict[str, Any]]) -> dict[str, Any]:
    missing_model = []
    suspicious_model = []
    missing_page = []
    missing_download = []
    model_groups: defaultdict[str, list[int]] = defaultdict(list)

    for i, s in enumerate(specs, start=1):
        model = clean(s.get("model"))
        title = clean(s.get("title"))
        if not model:
            missing_model.append(i)
        else:
            model_groups[norm_model(model)].append(i)
        if is_suspicious_model(model):
            suspicious_model.append({"row": i, "model": model, "title": title})
        if not clean(s.get("page")):
            missing_page.append(i)
        if not clean(s.get("dl")):
            missing_download.append(i)

    duplicates = [
        {"model": m, "count": len(rows), "rows": rows}
        for m, rows in model_groups.items() if m and len(rows) > 1
    ]
    duplicates.sort(key=lambda x: (-x["count"], x["model"]))

    return {
        "total": len(specs),
        "missing_model_count": len(missing_model),
        "missing_model_rows": missing_model,
        "suspicious_model_count": len(suspicious_model),
        "suspicious_models": suspicious_model,
        "missing_page_count": len(missing_page),
        "missing_page_rows": missing_page,
        "missing_download_count": len(missing_download),
        "missing_download_rows": missing_download,
        "duplicate_model_group_count": len(duplicates),
        "duplicate_models": duplicates,
    }


def print_human(report: dict[str, Any]) -> None:
    p = report["products"]
    s = report["specs"]

    print("=== 予华仪器数据质量检查（只读，不修改数据） ===")
    print(f"产品记录: {p['total']}")
    print(f"  空型号: {p['empty_model_count']}")
    print(f"  空产品名: {p['empty_name_count']}")
    print(f"  疑似异常型号: {p['suspicious_model_count']}")
    print(f"  重复型号组: {p['duplicate_model_group_count']}")
    print(f"规格书记录: {s['total']}")
    print(f"  空型号: {s['missing_model_count']}")
    print(f"  疑似异常型号: {s['suspicious_model_count']}")
    print(f"  缺在线页面: {s['missing_page_count']}")
    print(f"  缺下载路径: {s['missing_download_count']}")
    print(f"  重复型号组: {s['duplicate_model_group_count']}")

    if p["suspicious_models"]:
        print("\n产品疑似异常型号（前30条）:")
        for item in p["suspicious_models"][:30]:
            print(f"  #{item['row']} model={item['model']!r} name={item['name']!r} category={item['category']!r}")

    if s["suspicious_models"]:
        print("\n规格书疑似异常型号（前30条）:")
        for item in s["suspicious_models"][:30]:
            print(f"  #{item['row']} model={item['model']!r} title={item['title']!r}")

    if p["duplicate_models"]:
        print("\n产品重复型号组（前30组；重复不等于错误，需人工判断不同配置/年份）:")
        for item in p["duplicate_models"][:30]:
            print(f"  {item['model']}: {item['count']} 条，rows={item['rows'][:12]}")



def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--products", default="products.json")
    ap.add_argument("--specs", default="specs_index.json")
    ap.add_argument("--json-output", default="")
    args = ap.parse_args()

    products = load_json(Path(args.products))
    specs = load_json(Path(args.specs))
    if not isinstance(products, list) or not isinstance(specs, list):
        raise SystemExit("products.json and specs_index.json must both contain JSON arrays")

    report = {
        "products": product_report(products),
        "specs": spec_report(specs),
    }
    print_human(report)

    if args.json_output:
        Path(args.json_output).write_text(
            json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"\nJSON report written to: {args.json_output}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
