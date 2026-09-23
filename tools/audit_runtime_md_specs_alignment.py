#!/usr/bin/env python3
"""Append a read-only alignment audit for runtime-only models and md_specs.json.

The customer-facing catalog lives in ``assets/data.js``. Some model rows were
introduced alongside ``md_specs.json`` and are absent from ``products.json``.
This audit compares only models that currently exist in both the runtime-only
set and as exact normalized top-level keys in ``md_specs.json``.

The comparison is intentionally narrow and reporting-only. It checks current
values for the directly shared structures ``key``, ``specs`` and ``selling``
and, separately, same-named top-level fields that also occur inside ``specs``.
For ``specs`` differences it also classifies whether fields exist only on one
side or whether the same field has conflicting values. Differences are audit
findings, never instructions to rewrite product facts.
"""
from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Any


def clean(value: Any) -> str:
    return str(value or "").strip()


def norm_model(value: Any) -> str:
    return re.sub(r"\s+", "", clean(value).upper())


def normalized(value: Any) -> Any:
    """Normalize containers conservatively while preserving factual strings."""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        return [normalized(item) for item in value]
    if isinstance(value, dict):
        return {str(key): normalized(item) for key, item in value.items()}
    return value


def load_window_array(path: Path, variable: str) -> list[dict[str, Any]]:
    text = path.read_text(encoding="utf-8")
    for marker in (f"window.{variable}=", f"window.{variable} ="):
        pos = text.find(marker)
        if pos >= 0:
            payload = text[pos + len(marker):].lstrip()
            try:
                value, _ = json.JSONDecoder().raw_decode(payload)
            except json.JSONDecodeError as exc:
                raise SystemExit(f"Could not parse window.{variable} from {path}: {exc}") from exc
            if not isinstance(value, list) or any(not isinstance(item, dict) for item in value):
                raise SystemExit(f"window.{variable} in {path} must be an array of objects")
            return value
    raise SystemExit(f"Could not find window.{variable} in {path}")


def load_json_object(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise SystemExit(f"{path} must contain a JSON object")
    return value


def compact_diff(expected: Any, actual: Any) -> dict[str, Any]:
    return {
        "expected_md_specs": expected,
        "actual_runtime": actual,
    }


def dict_field_diff(expected: dict[str, Any], actual: dict[str, Any]) -> dict[str, Any]:
    """Describe dict differences without assigning authority to either side."""
    expected_keys = set(expected)
    actual_keys = set(actual)
    only_md_specs = sorted(expected_keys - actual_keys)
    only_runtime = sorted(actual_keys - expected_keys)
    shared_value_mismatches = []
    for field in sorted(expected_keys & actual_keys):
        if expected[field] != actual[field]:
            shared_value_mismatches.append({
                "field": field,
                **compact_diff(expected[field], actual[field]),
            })

    kinds = []
    if only_runtime:
        kinds.append("runtime_only_fields")
    if only_md_specs:
        kinds.append("md_specs_only_fields")
    if shared_value_mismatches:
        kinds.append("shared_value_mismatch")

    return {
        "kind": "+".join(kinds) if kinds else "exact",
        "runtime_only_field_count": len(only_runtime),
        "runtime_only_fields": only_runtime,
        "md_specs_only_field_count": len(only_md_specs),
        "md_specs_only_fields": only_md_specs,
        "shared_value_mismatch_count": len(shared_value_mismatches),
        "shared_value_mismatches": shared_value_mismatches,
    }


def compare_row(row: dict[str, Any], md_entry: dict[str, Any]) -> dict[str, Any]:
    runtime_key = normalized(row.get("key"))
    md_key = normalized(md_entry.get("key"))
    runtime_specs = normalized(row.get("specs") if isinstance(row.get("specs"), dict) else {})
    md_specs = normalized(md_entry.get("specs") if isinstance(md_entry.get("specs"), dict) else {})
    runtime_selling = normalized(row.get("selling") if isinstance(row.get("selling"), list) else [])
    md_selling = normalized(md_entry.get("selling") if isinstance(md_entry.get("selling"), list) else [])

    component_equal = {
        "key": runtime_key == md_key,
        "specs": runtime_specs == md_specs,
        "selling": runtime_selling == md_selling,
    }
    component_diffs: dict[str, Any] = {}
    if not component_equal["key"]:
        component_diffs["key"] = compact_diff(md_key, runtime_key)
    if not component_equal["specs"]:
        component_diffs["specs"] = compact_diff(md_specs, runtime_specs)
    if not component_equal["selling"]:
        component_diffs["selling"] = compact_diff(md_selling, runtime_selling)

    specs_field_diff = dict_field_diff(md_specs, runtime_specs)

    same_named_fields = []
    same_named_mismatches = []
    for field, expected in md_specs.items():
        if field not in row:
            continue
        actual = normalized(row.get(field))
        expected_norm = normalized(expected)
        item = {
            "field": field,
            "matches": actual == expected_norm,
        }
        same_named_fields.append(item)
        if actual != expected_norm:
            same_named_mismatches.append({
                "field": field,
                **compact_diff(expected_norm, actual),
            })

    return {
        "component_equal": component_equal,
        "all_shared_components_exact": all(component_equal.values()),
        "component_diffs": component_diffs,
        "specs_field_diff": specs_field_diff,
        "same_named_top_level_spec_field_count": len(same_named_fields),
        "same_named_top_level_spec_fields": same_named_fields,
        "same_named_top_level_spec_mismatch_count": len(same_named_mismatches),
        "same_named_top_level_spec_mismatches": same_named_mismatches,
    }


def build_alignment(
    runtime_rows: list[dict[str, Any]],
    runtime_only_models: list[str],
    md_payload: dict[str, Any],
) -> dict[str, Any]:
    rows_by_model: defaultdict[str, list[tuple[int, dict[str, Any]]]] = defaultdict(list)
    for index, row in enumerate(runtime_rows, start=1):
        model = norm_model(row.get("型号"))
        if model:
            rows_by_model[model].append((index, row))

    md_by_model: dict[str, tuple[str, dict[str, Any]]] = {}
    duplicate_md_keys: defaultdict[str, list[str]] = defaultdict(list)
    for raw_model, entry in md_payload.items():
        model = norm_model(raw_model)
        if not model or not isinstance(entry, dict):
            continue
        duplicate_md_keys[model].append(raw_model)
        md_by_model.setdefault(model, (raw_model, entry))

    duplicate_normalized_md_models = [
        {"normalized_model": model, "raw_keys": keys}
        for model, keys in sorted(duplicate_md_keys.items())
        if len(keys) > 1
    ]

    targets = sorted({norm_model(model) for model in runtime_only_models if norm_model(model)})
    exact_md_targets = sorted(model for model in targets if model in md_by_model)
    rows = []
    missing_runtime_models = []
    ambiguous_runtime_models = []
    models_with_any_component_difference = []
    models_with_same_named_top_level_mismatch = []
    exact_all_components = []
    specs_exact_models = []
    selling_exact_models = []
    key_exact_models = []
    models_with_key_component_difference = []
    models_with_selling_component_difference = []
    models_with_specs_runtime_only_fields = []
    models_with_specs_md_specs_only_fields = []
    models_with_specs_shared_value_mismatch = []
    models_with_product_name_only_runtime_addition = []

    for model in exact_md_targets:
        raw_md_model, md_entry = md_by_model[model]
        runtime_matches = rows_by_model.get(model, [])
        if not runtime_matches:
            missing_runtime_models.append(model)
            rows.append({
                "model": model,
                "md_specs_raw_key": raw_md_model,
                "runtime_row_count": 0,
                "runtime_rows": [],
            })
            continue
        if len(runtime_matches) > 1:
            ambiguous_runtime_models.append(model)

        comparisons = []
        for row_index, row in runtime_matches:
            comparison = compare_row(row, md_entry)
            comparisons.append({
                "runtime_row_index": row_index,
                **comparison,
            })

        single = comparisons[0] if len(comparisons) == 1 else None
        if single and single["component_equal"]["key"]:
            key_exact_models.append(model)
        if single and single["component_equal"]["specs"]:
            specs_exact_models.append(model)
        if single and single["component_equal"]["selling"]:
            selling_exact_models.append(model)
        if single and single["all_shared_components_exact"]:
            exact_all_components.append(model)
        if any(not item["all_shared_components_exact"] for item in comparisons):
            models_with_any_component_difference.append(model)
        if any(item["same_named_top_level_spec_mismatch_count"] for item in comparisons):
            models_with_same_named_top_level_mismatch.append(model)
        if any(not item["component_equal"]["key"] for item in comparisons):
            models_with_key_component_difference.append(model)
        if any(not item["component_equal"]["selling"] for item in comparisons):
            models_with_selling_component_difference.append(model)
        if any(item["specs_field_diff"]["runtime_only_field_count"] for item in comparisons):
            models_with_specs_runtime_only_fields.append(model)
        if any(item["specs_field_diff"]["md_specs_only_field_count"] for item in comparisons):
            models_with_specs_md_specs_only_fields.append(model)
        if any(item["specs_field_diff"]["shared_value_mismatch_count"] for item in comparisons):
            models_with_specs_shared_value_mismatch.append(model)

        if single:
            specs_diff = single["specs_field_diff"]
            if (
                single["component_equal"]["key"]
                and single["component_equal"]["selling"]
                and specs_diff["runtime_only_fields"] == ["产品名称"]
                and specs_diff["md_specs_only_field_count"] == 0
                and specs_diff["shared_value_mismatch_count"] == 0
            ):
                models_with_product_name_only_runtime_addition.append(model)

        rows.append({
            "model": model,
            "md_specs_raw_key": raw_md_model,
            "runtime_row_count": len(runtime_matches),
            "runtime_rows": comparisons,
        })

    return {
        "status": "ok",
        "runtime_only_model_count": len(targets),
        "runtime_only_models_with_exact_md_specs_key_count": len(exact_md_targets),
        "runtime_only_models_with_exact_md_specs_key": exact_md_targets,
        "compared_model_count": len(rows),
        "missing_runtime_model_count": len(missing_runtime_models),
        "missing_runtime_models": missing_runtime_models,
        "ambiguous_runtime_model_count": len(ambiguous_runtime_models),
        "ambiguous_runtime_models": ambiguous_runtime_models,
        "single_row_all_shared_components_exact_model_count": len(exact_all_components),
        "single_row_all_shared_components_exact_models": exact_all_components,
        "single_row_key_exact_model_count": len(key_exact_models),
        "single_row_key_exact_models": key_exact_models,
        "single_row_specs_exact_model_count": len(specs_exact_models),
        "single_row_specs_exact_models": specs_exact_models,
        "single_row_selling_exact_model_count": len(selling_exact_models),
        "single_row_selling_exact_models": selling_exact_models,
        "models_with_any_shared_component_difference_count": len(models_with_any_component_difference),
        "models_with_any_shared_component_difference": models_with_any_component_difference,
        "models_with_same_named_top_level_spec_mismatch_count": len(models_with_same_named_top_level_mismatch),
        "models_with_same_named_top_level_spec_mismatch": models_with_same_named_top_level_mismatch,
        "models_with_key_component_difference_count": len(models_with_key_component_difference),
        "models_with_key_component_difference": models_with_key_component_difference,
        "models_with_selling_component_difference_count": len(models_with_selling_component_difference),
        "models_with_selling_component_difference": models_with_selling_component_difference,
        "models_with_specs_runtime_only_fields_count": len(models_with_specs_runtime_only_fields),
        "models_with_specs_runtime_only_fields": models_with_specs_runtime_only_fields,
        "models_with_specs_md_specs_only_fields_count": len(models_with_specs_md_specs_only_fields),
        "models_with_specs_md_specs_only_fields": models_with_specs_md_specs_only_fields,
        "models_with_specs_shared_value_mismatch_count": len(models_with_specs_shared_value_mismatch),
        "models_with_specs_shared_value_mismatch": models_with_specs_shared_value_mismatch,
        "models_with_product_name_only_runtime_addition_count": len(models_with_product_name_only_runtime_addition),
        "models_with_product_name_only_runtime_addition": models_with_product_name_only_runtime_addition,
        "duplicate_normalized_md_specs_key_count": len(duplicate_normalized_md_models),
        "duplicate_normalized_md_specs_keys": duplicate_normalized_md_models,
        "models": rows,
        "comparison_rule": (
            "Reporting only. Models are compared only when runtime 型号 and a top-level md_specs.json key match "
            "after case/whitespace normalization. Directly shared key/specs/selling structures are compared after "
            "trimming only leading/trailing string whitespace. specs differences are structurally classified into "
            "runtime-only fields, md_specs-only fields, and shared-field value mismatches; a separate convenience "
            "bucket identifies the narrow case where the only runtime addition is the literal 产品名称 field. "
            "Same-named runtime top-level fields that also occur inside md_specs specs are reported separately. "
            "No fuzzy matching, repair, deletion, merge, rename, or parameter overwrite is performed."
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", default="data_quality_report.json")
    parser.add_argument("--data-js", default="assets/data.js")
    parser.add_argument("--md-specs", default="md_specs.json")
    args = parser.parse_args()

    report_path = Path(args.report)
    report = json.loads(report_path.read_text(encoding="utf-8"))
    if not isinstance(report, dict):
        raise SystemExit(f"{report_path} must contain a JSON object")

    runtime_audit = report.get("public_catalog_runtime")
    if not isinstance(runtime_audit, dict) or not isinstance(runtime_audit.get("public_only_models"), list):
        raise SystemExit("Run audit_public_catalog_runtime.py first; public_only_models is missing")

    runtime_rows = load_window_array(Path(args.data_js), "PRODUCTS")
    md_payload = load_json_object(Path(args.md_specs))
    alignment = build_alignment(runtime_rows, runtime_audit["public_only_models"], md_payload)
    report["public_catalog_md_specs_alignment"] = alignment
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print("=== runtime-only 型号与 md_specs 当前值对齐审计（只读） ===")
    print(f"runtime 独有型号: {alignment['runtime_only_model_count']}")
    print(f"其中 md_specs 顶层型号精确匹配: {alignment['runtime_only_models_with_exact_md_specs_key_count']}")
    print(f"单行且 key/specs/selling 全部一致: {alignment['single_row_all_shared_components_exact_model_count']}")
    print(f"存在共享结构差异: {alignment['models_with_any_shared_component_difference_count']}")
    print(f"  - specs 仅 runtime 多字段: {alignment['models_with_specs_runtime_only_fields_count']}")
    print(f"  - specs 仅 md_specs 多字段: {alignment['models_with_specs_md_specs_only_fields_count']}")
    print(f"  - specs 同字段值冲突: {alignment['models_with_specs_shared_value_mismatch_count']}")
    print(f"  - 仅 runtime 增加 产品名称: {alignment['models_with_product_name_only_runtime_addition_count']}")
    print(f"存在同名顶层字段差异: {alignment['models_with_same_named_top_level_spec_mismatch_count']}")
    print(f"runtime 同型号多行: {alignment['ambiguous_runtime_model_count']}")
    print(f"Updated report: {report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
