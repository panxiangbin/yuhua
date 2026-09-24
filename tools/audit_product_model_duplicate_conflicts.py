#!/usr/bin/env python3
"""Read-only audit for duplicate source product-model records.

This audit deliberately separates:
- literal duplicate models: model strings equal after trimming outer whitespace
  and ignoring case only; punctuation and internal whitespace remain significant;
- whitespace-normalized candidates: records that only become equal after removing
  internal whitespace. These are review hints, never automatic equivalence.

For literal duplicate groups, non-model fields are classified as:
- exact_duplicate: all records have the same normalized payload;
- complementary: no field has conflicting non-empty values, but records differ
  because some fields are absent/empty;
- conflicting: at least one field has multiple distinct non-empty values.

The report is evidence for manual review only. It never edits products.json and
never authorizes merging, deleting, or overwriting product facts.
"""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PRODUCTS = ROOT / "products.json"


def literal_model_key(value: Any) -> str:
    """Case-insensitive literal key; preserve punctuation and internal spaces."""
    return str(value or "").strip().casefold()


def whitespace_normalized_model_key(value: Any) -> str:
    """Manual-review key only; never use this to assert model identity."""
    return "".join(str(value or "").split()).casefold()


def clean_scalar(value: Any) -> Any:
    if isinstance(value, str):
        return value.strip()
    return value


def is_empty(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return value.strip() == ""
    if isinstance(value, (list, tuple, dict, set)):
        return len(value) == 0
    return False


def canonical_value(value: Any) -> str:
    """Stable representation used only to compare existing source values."""
    value = clean_scalar(value)
    if isinstance(value, (dict, list, tuple)):
        return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return str(value)


def normalized_payload(row: dict[str, Any]) -> dict[str, Any]:
    return {
        key: clean_scalar(value)
        for key, value in row.items()
        if key != "型号"
    }


def classify_literal_group(
    model: str,
    indexed_rows: list[tuple[int, dict[str, Any]]],
) -> dict[str, Any]:
    fields = sorted(
        {
            key
            for _, row in indexed_rows
            for key in row.keys()
            if key != "型号"
        }
    )

    field_evidence: list[dict[str, Any]] = []
    conflict_fields: list[str] = []

    for field in fields:
        nonempty_values: dict[str, dict[str, Any]] = {}
        nonempty_row_count = 0
        empty_row_count = 0

        for row_index, row in indexed_rows:
            value = row.get(field)
            if is_empty(value):
                empty_row_count += 1
                continue
            nonempty_row_count += 1
            canonical = canonical_value(value)
            if canonical not in nonempty_values:
                nonempty_values[canonical] = {
                    "value": clean_scalar(value),
                    "rows": [],
                }
            nonempty_values[canonical]["rows"].append(row_index)

        distinct = list(nonempty_values.values())
        if len(distinct) > 1:
            conflict_fields.append(field)

        field_evidence.append(
            {
                "field": field,
                "nonempty_row_count": nonempty_row_count,
                "empty_row_count": empty_row_count,
                "distinct_nonempty_value_count": len(distinct),
                "distinct_nonempty_values": distinct,
            }
        )

    payload_signatures = {
        json.dumps(
            normalized_payload(row),
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        )
        for _, row in indexed_rows
    }

    if conflict_fields:
        classification = "conflicting"
    elif len(payload_signatures) == 1:
        classification = "exact_duplicate"
    else:
        classification = "complementary"

    return {
        "model": model,
        "row_count": len(indexed_rows),
        "rows": [idx for idx, _ in indexed_rows],
        "classification": classification,
        "conflict_fields": conflict_fields,
        "field_evidence": field_evidence,
    }


def build_report(products: list[dict[str, Any]]) -> dict[str, Any]:
    literal_groups: dict[str, list[tuple[int, dict[str, Any]]]] = defaultdict(list)
    literal_display: dict[str, str] = {}

    for row_index, row in enumerate(products, start=1):
        model = str(row.get("型号") or "").strip()
        key = literal_model_key(model)
        if not key:
            continue
        literal_groups[key].append((row_index, row))
        literal_display.setdefault(key, model)

    duplicate_groups = [
        classify_literal_group(literal_display[key], rows)
        for key, rows in sorted(
            literal_groups.items(),
            key=lambda item: literal_display[item[0]].casefold(),
        )
        if len(rows) > 1
    ]

    class_counts = Counter(group["classification"] for group in duplicate_groups)

    normalized_groups: dict[str, list[tuple[str, int, str]]] = defaultdict(list)
    for key, rows in literal_groups.items():
        display = literal_display[key]
        normalized = whitespace_normalized_model_key(display)
        for row_index, row in rows:
            normalized_groups[normalized].append(
                (key, row_index, str(row.get("型号") or "").strip())
            )

    normalized_only_candidates: list[dict[str, Any]] = []
    for normalized_key, items in sorted(normalized_groups.items()):
        literal_keys = sorted({item[0] for item in items})
        if not normalized_key or len(literal_keys) <= 1:
            continue
        normalized_only_candidates.append(
            {
                "normalized_key": normalized_key,
                "literal_models": sorted({item[2] for item in items}, key=str.casefold),
                "rows": sorted(item[1] for item in items),
                "note": "manual review only; internal whitespace differences are not treated as model identity",
            }
        )

    return {
        "policy": {
            "literal_model_identity": "trim outer whitespace + case-insensitive only",
            "preserved_model_syntax": ["internal whitespace", "-", "/", "+", "punctuation"],
            "whitespace_normalized_candidates": "manual review only; never automatic equivalence",
            "classification_scope": "existing source rows only; report does not authorize merge/delete/overwrite",
        },
        "summary": {
            "source_product_count": len(products),
            "literal_duplicate_model_group_count": len(duplicate_groups),
            "exact_duplicate_group_count": class_counts["exact_duplicate"],
            "complementary_group_count": class_counts["complementary"],
            "conflicting_group_count": class_counts["conflicting"],
            "whitespace_normalized_only_candidate_group_count": len(normalized_only_candidates),
        },
        "literal_duplicate_groups": duplicate_groups,
        "whitespace_normalized_only_candidates": normalized_only_candidates,
    }


def self_test() -> None:
    assert literal_model_key("DLSB-5/30") != literal_model_key("DLSB-5-30")
    assert literal_model_key("AB C") != literal_model_key("ABC")
    assert literal_model_key("  CCA-20 ") == literal_model_key("cca-20")
    assert whitespace_normalized_model_key("AB C") == whitespace_normalized_model_key("ABC")

    exact = build_report(
        [
            {"型号": "A-1", "类别": "X", "产品名称": ""},
            {"型号": "a-1", "类别": "X", "产品名称": ""},
        ]
    )
    assert exact["summary"]["exact_duplicate_group_count"] == 1

    complementary = build_report(
        [
            {"型号": "A-1", "类别": "X", "材质": ""},
            {"型号": "A-1", "类别": "X", "材质": "不锈钢"},
        ]
    )
    assert complementary["summary"]["complementary_group_count"] == 1

    conflict = build_report(
        [
            {"型号": "A-1", "类别": "X", "材质": "玻璃"},
            {"型号": "A-1", "类别": "X", "材质": "不锈钢"},
        ]
    )
    assert conflict["summary"]["conflicting_group_count"] == 1
    assert conflict["literal_duplicate_groups"][0]["conflict_fields"] == ["材质"]

    normalized_only = build_report(
        [
            {"型号": "AB C", "类别": "X"},
            {"型号": "ABC", "类别": "X"},
        ]
    )
    assert normalized_only["summary"]["literal_duplicate_model_group_count"] == 0
    assert normalized_only["summary"]["whitespace_normalized_only_candidate_group_count"] == 1


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--products", type=Path, default=DEFAULT_PRODUCTS)
    parser.add_argument("--json-output", type=Path)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        print("self-test: ok")
        return 0

    products = json.loads(args.products.read_text(encoding="utf-8"))
    if not isinstance(products, list) or not all(isinstance(row, dict) for row in products):
        raise SystemExit("products file must contain a JSON array of objects")

    report = build_report(products)
    output = json.dumps(report, ensure_ascii=False, indent=2)

    if args.json_output:
        args.json_output.write_text(output + "\n", encoding="utf-8")

    print(json.dumps(report["summary"], ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
