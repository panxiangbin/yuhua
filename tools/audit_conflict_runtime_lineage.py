#!/usr/bin/env python3
"""Classify runtime lineage for source models that already have conflicting rows.

This audit exists to separate three different situations that the stricter full-row
comparison intentionally conflates:

1. a runtime row exactly mirrors a current source row;
2. a runtime row mirrors every current source field except that the source product
   name is empty and the runtime row carries a non-empty display name;
3. a runtime row still differs from every current same-model source row after that
   narrow name-enrichment check.

The second case is reported only as lineage evidence. It does NOT validate the runtime
product name, technical parameters, model meaning, category, specification content, or
any other product fact. No data is edited by this tool.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from audit_conflicting_model_evidence_trace import (
    SOURCE_FIELDS,
    clean_text,
    discover_conflicting_models,
    literal_key,
    load_sources,
)

NAME_FIELD = "产品名称"
NON_NAME_SOURCE_FIELDS = tuple(field for field in SOURCE_FIELDS if field != NAME_FIELD)


def row_differences(runtime_row: dict[str, Any], source_row: dict[str, Any]) -> dict[str, dict[str, str]]:
    """Return literal source/runtime differences across the original source fields."""
    differences: dict[str, dict[str, str]] = {}
    for field in SOURCE_FIELDS:
        source_value = clean_text(source_row.get(field))
        runtime_value = clean_text(runtime_row.get(field))
        if source_value != runtime_value:
            differences[field] = {
                "source": source_value,
                "runtime": runtime_value,
            }
    return differences


def exact_source_matches(
    runtime_row: dict[str, Any], source_rows: list[tuple[int, dict[str, Any]]]
) -> list[int]:
    matches: list[int] = []
    for source_index, source_row in source_rows:
        if all(
            clean_text(runtime_row.get(field)) == clean_text(source_row.get(field))
            for field in SOURCE_FIELDS
        ):
            matches.append(source_index)
    return matches


def name_enrichment_source_matches(
    runtime_row: dict[str, Any], source_rows: list[tuple[int, dict[str, Any]]]
) -> list[int]:
    """Match only a runtime-only product-name enrichment over an otherwise exact row.

    This deliberately requires the current source name to be empty and the runtime name
    to be non-empty. A different non-empty source/runtime name is never treated as an
    enrichment match.
    """
    runtime_name = clean_text(runtime_row.get(NAME_FIELD))
    if not runtime_name:
        return []

    matches: list[int] = []
    for source_index, source_row in source_rows:
        if clean_text(source_row.get(NAME_FIELD)):
            continue
        if all(
            clean_text(runtime_row.get(field)) == clean_text(source_row.get(field))
            for field in NON_NAME_SOURCE_FIELDS
        ):
            matches.append(source_index)
    return matches


def classify_runtime_row(
    runtime_index: int,
    runtime_row: dict[str, Any],
    source_rows: list[tuple[int, dict[str, Any]]],
) -> dict[str, Any]:
    exact_matches = exact_source_matches(runtime_row, source_rows)
    enrichment_matches = [] if exact_matches else name_enrichment_source_matches(runtime_row, source_rows)

    if exact_matches:
        status = "exact_current_source"
    elif enrichment_matches:
        status = "current_source_plus_runtime_name_enrichment"
    else:
        status = "unresolved_current_source_delta"

    candidate_differences = [
        {
            "source_row": source_index,
            "differing_fields": sorted(row_differences(runtime_row, source_row)),
        }
        for source_index, source_row in source_rows
    ]

    return {
        "runtime_row": runtime_index,
        "model": clean_text(runtime_row.get("型号")),
        "runtime_product_name": clean_text(runtime_row.get(NAME_FIELD)),
        "runtime_metadata": {
            "key": clean_text(runtime_row.get("key")),
            "rich": runtime_row.get("rich"),
        },
        "status": status,
        "exact_source_row_matches": exact_matches,
        "name_enrichment_source_row_matches": enrichment_matches,
        "same_model_source_differences": candidate_differences,
    }


def audit_model(
    model: str,
    products: list[dict[str, Any]],
    runtime_products: list[dict[str, Any]],
) -> dict[str, Any]:
    target_key = literal_key(model)
    source_rows = [
        (index, row)
        for index, row in enumerate(products, start=1)
        if literal_key(row.get("型号")) == target_key
    ]
    runtime_rows = [
        (index, row)
        for index, row in enumerate(runtime_products, start=1)
        if literal_key(row.get("型号")) == target_key
    ]

    rows = [classify_runtime_row(index, row, source_rows) for index, row in runtime_rows]
    exact_count = sum(row["status"] == "exact_current_source" for row in rows)
    name_enrichment_count = sum(
        row["status"] == "current_source_plus_runtime_name_enrichment" for row in rows
    )
    unresolved_count = sum(row["status"] == "unresolved_current_source_delta" for row in rows)

    return {
        "model": model,
        "summary": {
            "source_row_count": len(source_rows),
            "runtime_row_count": len(runtime_rows),
            "exact_current_source_row_count": exact_count,
            "runtime_name_enrichment_row_count": name_enrichment_count,
            "unresolved_current_source_delta_row_count": unresolved_count,
            "automatic_fix_authorized": False,
        },
        "runtime_rows": rows,
    }


def build_report(root: Path) -> dict[str, Any]:
    products, runtime_products, _specs = load_sources(root)
    models = discover_conflicting_models(products)
    model_reports = [audit_model(model, products, runtime_products) for model in models]

    runtime_row_count = sum(report["summary"]["runtime_row_count"] for report in model_reports)
    exact_count = sum(
        report["summary"]["exact_current_source_row_count"] for report in model_reports
    )
    name_enrichment_count = sum(
        report["summary"]["runtime_name_enrichment_row_count"] for report in model_reports
    )
    unresolved_count = sum(
        report["summary"]["unresolved_current_source_delta_row_count"] for report in model_reports
    )

    strict_gap_models = [
        report["model"]
        for report in model_reports
        if report["summary"]["runtime_row_count"]
        != report["summary"]["exact_current_source_row_count"]
    ]
    name_enrichment_models = [
        report["model"]
        for report in model_reports
        if report["summary"]["runtime_name_enrichment_row_count"] > 0
    ]
    unresolved_models = [
        report["model"]
        for report in model_reports
        if report["summary"]["unresolved_current_source_delta_row_count"] > 0
    ]

    return {
        "policy": {
            "selection_scope": "current literal duplicate source models with conflicting non-empty values",
            "literal_model_identity": "trim outer whitespace + case-insensitive only; preserve internal whitespace and punctuation",
            "name_enrichment_rule": "source 产品名称 must be empty, runtime 产品名称 must be non-empty, and every other original source field must match literally",
            "name_enrichment_meaning": "lineage evidence only; the runtime product name is not validated or promoted into source truth",
            "unresolved_delta_meaning": "a runtime row still differs from every current same-model source row outside the narrow empty-source-name enrichment rule",
            "automatic_fix_authorized": False,
        },
        "summary": {
            "source_product_count": len(products),
            "conflicting_model_count": len(models),
            "runtime_row_count": runtime_row_count,
            "exact_current_source_row_count": exact_count,
            "runtime_name_enrichment_row_count": name_enrichment_count,
            "unresolved_current_source_delta_row_count": unresolved_count,
            "strict_full_row_gap_model_count": len(strict_gap_models),
            "name_enrichment_model_count": len(name_enrichment_models),
            "unresolved_runtime_model_count": len(unresolved_models),
            "automatic_fix_authorized": False,
        },
        "strict_full_row_gap_models": strict_gap_models,
        "name_enrichment_models": name_enrichment_models,
        "unresolved_runtime_models": unresolved_models,
        "models": model_reports,
        "review_notes": [
            "A name-enrichment classification explains provenance shape only; it does not prove the added display name is factually correct.",
            "Any difference in model, material, power supply, power, temperature, vacuum, speed, capacity, dimensions, weight, category, description, or another original source field remains unresolved.",
            "No source row is preferred, merged, deleted, overwritten, or normalized by this audit.",
        ],
    }


def self_test() -> None:
    source_rows = [
        (
            7,
            {
                "型号": "X-1",
                "产品名称": "",
                "材质": "玻璃",
                "电源": "220V",
                "类别": "测试",
            },
        )
    ]

    exact_runtime = {
        "型号": "X-1",
        "产品名称": "",
        "材质": "玻璃",
        "电源": "220V",
        "类别": "测试",
    }
    named_runtime = {**exact_runtime, "产品名称": "运行时展示名"}
    technical_delta = {**named_runtime, "电源": "200V"}

    assert classify_runtime_row(1, exact_runtime, source_rows)["status"] == "exact_current_source"
    named = classify_runtime_row(2, named_runtime, source_rows)
    assert named["status"] == "current_source_plus_runtime_name_enrichment"
    assert named["name_enrichment_source_row_matches"] == [7]
    assert classify_runtime_row(3, technical_delta, source_rows)["status"] == "unresolved_current_source_delta"

    nonempty_name_source = [(8, {**exact_runtime, "产品名称": "源名称"})]
    changed_name_runtime = {**exact_runtime, "产品名称": "另一个名称"}
    assert (
        classify_runtime_row(4, changed_name_runtime, nonempty_name_source)["status"]
        == "unresolved_current_source_delta"
    )

    assert literal_key(" X-1 ") == literal_key("x-1")
    assert literal_key("X-1") != literal_key("X/1")
    print("self-test: ok")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--output", type=Path)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return

    report = build_report(args.root.resolve())
    rendered = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
    else:
        print(rendered, end="")


if __name__ == "__main__":
    main()
