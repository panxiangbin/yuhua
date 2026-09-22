#!/usr/bin/env python3
"""Add a read-only audit of the customer-facing window.PRODUCTS payload.

The homepage renders assets/data.js rather than products.json directly. This
script makes that public/runtime payload visible in the main data-quality
artifact without changing, inferring, or repairing any product facts.

Runtime-only models are also cross-referenced against specs_index.json using
exact normalized model matches only. Those matches are evidence for review,
not permission to merge, rename, delete, or otherwise repair product data.
"""
from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


def clean(value: Any) -> str:
    return str(value or "").strip()


def norm_model(value: Any) -> str:
    return re.sub(r"\s+", "", clean(value).upper())


def load_window_array(path: Path, variable: str) -> list[dict[str, Any]]:
    text = path.read_text(encoding="utf-8")
    marker = f"window.{variable}="
    pos = text.find(marker)
    if pos < 0:
        marker = f"window.{variable} ="
        pos = text.find(marker)
    if pos < 0:
        raise SystemExit(f"Could not find window.{variable} in {path}")

    payload = text[pos + len(marker):].lstrip()
    try:
        value, _ = json.JSONDecoder().raw_decode(payload)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Could not parse window.{variable} from {path}: {exc}") from exc
    if not isinstance(value, list):
        raise SystemExit(f"window.{variable} in {path} must be an array")
    if any(not isinstance(item, dict) for item in value):
        raise SystemExit(f"window.{variable} in {path} must contain objects only")
    return value


def load_json_object_array(path: Path) -> list[dict[str, Any]]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, list) or any(not isinstance(item, dict) for item in value):
        raise SystemExit(f"{path} must contain an array of objects")
    return value


def model_set(rows: list[dict[str, Any]]) -> set[str]:
    return {norm_model(row.get("型号")) for row in rows if norm_model(row.get("型号"))}


def summarize(rows: list[dict[str, Any]]) -> dict[str, Any]:
    empty_model_rows: list[int] = []
    empty_name_rows: list[int] = []
    empty_identity_rows: list[int] = []
    model_rows: defaultdict[str, list[int]] = defaultdict(list)
    categories = Counter()

    for index, row in enumerate(rows, start=1):
        model = clean(row.get("型号"))
        name = clean(row.get("产品名称"))
        category = clean(row.get("类别")) or "未分类"
        categories[category] += 1
        if not model:
            empty_model_rows.append(index)
        else:
            model_rows[norm_model(model)].append(index)
        if not name:
            empty_name_rows.append(index)
        if not model and not name and not clean(row.get("类别")):
            empty_identity_rows.append(index)

    duplicates = [
        {"model": model, "count": len(indices), "rows": indices}
        for model, indices in model_rows.items()
        if model and len(indices) > 1
    ]
    duplicates.sort(key=lambda item: (-item["count"], item["model"]))

    return {
        "total": len(rows),
        "modeled_count": len(rows) - len(empty_model_rows),
        "named_count": len(rows) - len(empty_name_rows),
        "empty_model_count": len(empty_model_rows),
        "empty_model_rows": empty_model_rows,
        "empty_name_count": len(empty_name_rows),
        "empty_name_rows": empty_name_rows,
        "empty_model_name_category_count": len(empty_identity_rows),
        "empty_model_name_category_rows": empty_identity_rows,
        "duplicate_model_group_count": len(duplicates),
        "duplicate_models": duplicates,
        "category_counts": dict(categories.most_common()),
    }


def compact_spec_match(spec: dict[str, Any]) -> dict[str, str]:
    fields = ("title", "model", "series", "key", "page", "dl")
    return {field: clean(spec.get(field)) for field in fields if clean(spec.get(field))}


def build_public_only_evidence(
    public_rows: list[dict[str, Any]],
    public_only_models: list[str],
    specs: list[dict[str, Any]],
) -> dict[str, Any]:
    rows_by_model: defaultdict[str, list[tuple[int, dict[str, Any]]]] = defaultdict(list)
    for index, row in enumerate(public_rows, start=1):
        model = norm_model(row.get("型号"))
        if model:
            rows_by_model[model].append((index, row))

    specs_by_model: defaultdict[str, list[dict[str, Any]]] = defaultdict(list)
    for spec in specs:
        model = norm_model(spec.get("model"))
        if model:
            specs_by_model[model].append(spec)

    entries: list[dict[str, Any]] = []
    with_exact_spec: list[str] = []
    without_exact_spec: list[str] = []

    for model in public_only_models:
        runtime_rows = rows_by_model.get(model, [])
        categories = sorted({clean(row.get("类别")) for _, row in runtime_rows if clean(row.get("类别"))})
        names = sorted({clean(row.get("产品名称")) for _, row in runtime_rows if clean(row.get("产品名称"))})
        exact_matches = specs_by_model.get(model, [])
        if exact_matches:
            with_exact_spec.append(model)
        else:
            without_exact_spec.append(model)
        entries.append(
            {
                "model": model,
                "runtime_row_indices": [index for index, _ in runtime_rows],
                "runtime_categories": categories,
                "runtime_names": names,
                "exact_spec_match_count": len(exact_matches),
                "exact_spec_matches": [compact_spec_match(spec) for spec in exact_matches],
            }
        )

    return {
        "exact_spec_evidence_model_count": len(with_exact_spec),
        "models_with_exact_spec_evidence": with_exact_spec,
        "no_exact_spec_evidence_model_count": len(without_exact_spec),
        "models_without_exact_spec_evidence": without_exact_spec,
        "models": entries,
        "matching_rule": (
            "Only exact normalized matches between runtime 型号 and specs_index.json model are counted. "
            "No fuzzy/prefix inference is used, and matches are audit evidence only."
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-js", default="assets/data.js")
    parser.add_argument("--source", default="products.json")
    parser.add_argument("--spec-index", default="specs_index.json")
    parser.add_argument("--report", default="data_quality_report.json")
    args = parser.parse_args()

    source_path = Path(args.source)
    spec_index_path = Path(args.spec_index)
    report_path = Path(args.report)
    source = load_json_object_array(source_path)
    specs = load_json_object_array(spec_index_path)

    public_rows = load_window_array(Path(args.data_js), "PRODUCTS")
    public_summary = summarize(public_rows)
    source_models = model_set(source)
    public_models = model_set(public_rows)

    public_only_models = sorted(public_models - source_models)
    source_only_models = sorted(source_models - public_models)
    public_only_evidence = build_public_only_evidence(public_rows, public_only_models, specs)
    audit = {
        **public_summary,
        "source_total": len(source),
        "record_count_delta_vs_source": len(public_rows) - len(source),
        "distinct_model_count": len(public_models),
        "source_distinct_model_count": len(source_models),
        "public_only_model_count": len(public_only_models),
        "public_only_models": public_only_models,
        "public_only_model_evidence": public_only_evidence,
        "source_only_model_count": len(source_only_models),
        "source_only_models": source_only_models,
        "note": (
            "Read-only comparison of the customer-facing assets/data.js window.PRODUCTS payload "
            "against products.json. Differences are audit findings only and are not treated as errors "
            "or repaired automatically. Exact specs_index.json model matches are attached only as "
            "traceability evidence for runtime-only models."
        ),
    }

    report = json.loads(report_path.read_text(encoding="utf-8"))
    if not isinstance(report, dict):
        raise SystemExit(f"{report_path} must contain a JSON object")
    report["public_catalog_runtime"] = audit
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print("=== 客户实际加载目录审计（只读） ===")
    print(f"assets/data.js 产品记录: {audit['total']}")
    print(f"products.json 产品记录: {audit['source_total']}")
    print(f"记录数差异(runtime-source): {audit['record_count_delta_vs_source']:+d}")
    print(f"runtime 空型号: {audit['empty_model_count']}")
    print(f"runtime 空产品名: {audit['empty_name_count']}")
    print(f"runtime 重复型号组: {audit['duplicate_model_group_count']}")
    print(f"runtime 独有型号: {audit['public_only_model_count']}")
    print(f"source 独有型号: {audit['source_only_model_count']}")
    print(
        "runtime 独有型号中有规格书精确证据: "
        f"{public_only_evidence['exact_spec_evidence_model_count']}"
    )
    print(
        "runtime 独有型号中无规格书精确证据: "
        f"{public_only_evidence['no_exact_spec_evidence_model_count']}"
    )
    if public_only_models:
        print("runtime 独有型号（前30项，仅审计）:", public_only_models[:30])
    if source_only_models:
        print("source 独有型号（前30项，仅审计）:", source_only_models[:30])
    print(f"Updated report: {report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
