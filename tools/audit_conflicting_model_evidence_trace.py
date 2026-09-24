#!/usr/bin/env python3
"""Read-only evidence trace for one literal product model with conflicting source rows.

This tool deliberately does not decide which product record is correct. It preserves
model punctuation/internal whitespace, traces the same literal model across the source
catalog, customer-facing runtime catalog, specification index, and specification page
identity labels, then emits a review-only JSON report.

Specification text is used only for document/model identity. It is never promoted to
product technical facts by this audit.
"""

from __future__ import annotations

import argparse
import html
import json
import re
from pathlib import Path
from typing import Any

SOURCE_FIELDS = (
    "型号",
    "产品名称",
    "材质",
    "电源",
    "功率",
    "控温范围",
    "真空度",
    "转速",
    "容量",
    "尺寸",
    "重量",
    "类别",
    "简介",
)
REPORT_FIELDS = (
    "型号",
    "产品名称",
    "材质",
    "电源",
    "功率",
    "控温范围",
    "真空度",
    "转速",
    "容量",
    "尺寸",
    "重量",
    "类别",
)


def literal_key(value: Any) -> str:
    """Model identity: trim outer whitespace and fold case only."""
    return str(value or "").strip().casefold()


def clean_text(value: Any) -> str:
    return str(value or "").strip()


def project_row(row: dict[str, Any], index: int, runtime: bool = False) -> dict[str, Any]:
    evidence: dict[str, Any] = {
        "row": index,
        "fields": {field: clean_text(row.get(field)) for field in REPORT_FIELDS},
    }
    if runtime:
        evidence["runtime_metadata"] = {
            "key": clean_text(row.get("key")),
            "rich": row.get("rich"),
        }
    return evidence


def distinct_nonempty_values(rows: list[dict[str, Any]], field: str) -> list[str]:
    values = {clean_text(row.get(field)) for row in rows if clean_text(row.get(field))}
    return sorted(values, key=lambda value: value.casefold())


def conflicting_fields(rows: list[dict[str, Any]]) -> dict[str, list[str]]:
    result: dict[str, list[str]] = {}
    fields = sorted({key for row in rows for key in row if key != "型号"})
    for field in fields:
        values = distinct_nonempty_values(rows, field)
        if len(values) > 1:
            result[field] = values
    return result


def load_runtime_products(path: Path) -> list[dict[str, Any]]:
    text = path.read_text(encoding="utf-8")
    marker = "window.PRODUCTS="
    offset = text.find(marker)
    if offset < 0:
        raise ValueError(f"{path}: {marker!r} not found")
    payload = text[offset + len(marker) :].lstrip()
    decoded, _ = json.JSONDecoder().raw_decode(payload)
    if not isinstance(decoded, list):
        raise ValueError(f"{path}: window.PRODUCTS is not a JSON array")
    return decoded


def source_match_rows(runtime_row: dict[str, Any], source_rows: list[tuple[int, dict[str, Any]]]) -> list[int]:
    """Return source row numbers whose original source fields are exactly mirrored.

    Equality is traceability only; it does not validate the factual correctness of a row.
    """
    matches: list[int] = []
    for source_index, source_row in source_rows:
        if all(clean_text(runtime_row.get(field)) == clean_text(source_row.get(field)) for field in SOURCE_FIELDS):
            matches.append(source_index)
    return matches


def strip_markup(fragment: str) -> str:
    text = re.sub(r"<[^>]+>", " ", fragment, flags=re.S)
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def first_tag_text(document: str, tag: str) -> str:
    match = re.search(rf"<{tag}\b[^>]*>(.*?)</{tag}>", document, flags=re.I | re.S)
    return strip_markup(match.group(1)) if match else ""


def identity_snippets(document: str, target_model: str, limit: int = 3) -> list[str]:
    target = literal_key(target_model)
    snippets: list[str] = []
    for match in re.finditer(r"<p\b[^>]*>(.*?)</p>", document, flags=re.I | re.S):
        text = strip_markup(match.group(1))
        if text and target in literal_key(text):
            snippets.append(text[:180])
            if len(snippets) >= limit:
                break
    return snippets


def spec_page_identity(root: Path, item: dict[str, Any], target_model: str) -> dict[str, Any]:
    page_text = clean_text(item.get("page"))
    result: dict[str, Any] = {
        "page": page_text,
        "download": clean_text(item.get("dl")),
        "index_title": clean_text(item.get("title")),
        "index_model": clean_text(item.get("model")),
        "index_series": clean_text(item.get("series")),
        "index_key": clean_text(item.get("key")),
        "page_exists": False,
        "read_error": "",
        "html_title": "",
        "h1": "",
        "h1_literal_model_match": False,
        "identity_snippets": [],
    }
    if not page_text:
        result["read_error"] = "missing page path in specs_index.json"
        return result

    page_path = root / page_text
    if not page_path.is_file():
        result["read_error"] = "referenced page does not exist"
        return result

    result["page_exists"] = True
    try:
        document = page_path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        result["read_error"] = f"{type(exc).__name__}: {exc}"
        return result

    result["html_title"] = first_tag_text(document, "title")
    result["h1"] = first_tag_text(document, "h1")
    result["h1_literal_model_match"] = literal_key(result["h1"]) == literal_key(target_model)
    result["identity_snippets"] = identity_snippets(document, target_model)
    return result


def audit(root: Path, target_model: str) -> dict[str, Any]:
    target_key = literal_key(target_model)
    if not target_key:
        raise ValueError("target model must not be empty")

    products = json.loads((root / "products.json").read_text(encoding="utf-8"))
    runtime_products = load_runtime_products(root / "assets" / "data.js")
    specs = json.loads((root / "specs_index.json").read_text(encoding="utf-8"))

    source_exact = [
        (index, row)
        for index, row in enumerate(products, start=1)
        if literal_key(row.get("型号")) == target_key
    ]
    runtime_exact = [
        (index, row)
        for index, row in enumerate(runtime_products, start=1)
        if literal_key(row.get("型号")) == target_key
    ]

    spec_title_exact = [item for item in specs if literal_key(item.get("title")) == target_key]
    spec_model_exact = [item for item in specs if literal_key(item.get("model")) == target_key]

    related_specs: list[dict[str, Any]] = []
    seen_pages: set[str] = set()
    for item in [*spec_title_exact, *spec_model_exact]:
        marker = clean_text(item.get("page")) or json.dumps(item, ensure_ascii=False, sort_keys=True)
        if marker in seen_pages:
            continue
        seen_pages.add(marker)
        related_specs.append(spec_page_identity(root, item, target_model))

    source_rows_only = [row for _, row in source_exact]
    runtime_trace: list[dict[str, Any]] = []
    source_backed_runtime_count = 0
    for index, row in runtime_exact:
        evidence = project_row(row, index, runtime=True)
        evidence["exact_source_row_matches"] = source_match_rows(row, source_exact)
        if evidence["exact_source_row_matches"]:
            source_backed_runtime_count += 1
        runtime_trace.append(evidence)

    page_read_error_count = sum(1 for page in related_specs if page["read_error"])
    page_identity_count = sum(1 for page in related_specs if page["h1_literal_model_match"])
    source_conflicts = conflicting_fields(source_rows_only)
    runtime_conflicts = conflicting_fields([row for _, row in runtime_exact])

    return {
        "target_model": target_model,
        "policy": {
            "literal_model_identity": "trim outer whitespace + case-insensitive only; preserve internal whitespace and punctuation",
            "runtime_match_meaning": "traceability only; matching a source row does not validate product facts",
            "specification_evidence_scope": "document/model identity labels only; specification text is not promoted to product technical facts",
            "conflict_resolution": "review-only; no source row is preferred, merged, deleted, or overwritten",
            "automatic_fix_authorized": False,
        },
        "summary": {
            "source_exact_row_count": len(source_exact),
            "source_conflict_field_count": len(source_conflicts),
            "source_conflict_fields": sorted(source_conflicts),
            "runtime_exact_row_count": len(runtime_exact),
            "runtime_rows_with_exact_source_match": source_backed_runtime_count,
            "spec_index_exact_title_count": len(spec_title_exact),
            "spec_index_exact_model_count": len(spec_model_exact),
            "related_spec_page_count": len(related_specs),
            "spec_page_literal_h1_identity_count": page_identity_count,
            "spec_page_read_error_count": page_read_error_count,
            "unresolved_source_conflict": bool(source_conflicts),
            "automatic_fix_authorized": False,
        },
        "source": {
            "rows": [project_row(row, index) for index, row in source_exact],
            "conflicting_nonempty_values": source_conflicts,
        },
        "runtime": {
            "rows": runtime_trace,
            "conflicting_nonempty_values": runtime_conflicts,
        },
        "spec_index": {
            "exact_title_rows": [
                {key: clean_text(item.get(key)) for key in ("title", "model", "series", "key", "page", "dl")}
                for item in spec_title_exact
            ],
            "exact_model_rows": [
                {key: clean_text(item.get(key)) for key in ("title", "model", "series", "key", "page", "dl")}
                for item in spec_model_exact
            ],
            "note": "title and model are audited separately; filename-like model values are not normalized to the target model",
        },
        "spec_pages": related_specs,
        "review_notes": [
            "Distinct non-empty source values are unresolved evidence conflicts, not proof that one row is wrong.",
            "Runtime rows can show what customers currently receive, but runtime mirroring does not establish technical truth.",
            "Specification title/H1/body labels can corroborate document identity only and cannot resolve material, capacity, category, or other technical conflicts.",
            "No model punctuation, internal whitespace, suffix, file extension, or family wording is silently normalized into equivalence.",
        ],
    }


def self_test() -> None:
    assert literal_key(" R-1005 ") == literal_key("r-1005")
    assert literal_key("R-1005") != literal_key("R/1005")
    assert literal_key("AB C") != literal_key("ABC")
    assert literal_key("R-1005") != literal_key("R-1005.DOCX")

    sample_rows = [
        {"型号": "X-1", "材质": "玻璃", "容量": "3L", "功率": "100W"},
        {"型号": "X-1", "材质": "不锈钢", "容量": "5L", "功率": ""},
    ]
    conflicts = conflicting_fields(sample_rows)
    assert conflicts == {"容量": ["3L", "5L"], "材质": ["不锈钢", "玻璃"]}

    marker = "window.PRODUCTS="
    payload = marker + '[{"型号":"X-1"}];window.PAGE_MAP={};'
    decoded, _ = json.JSONDecoder().raw_decode(payload[payload.index(marker) + len(marker) :])
    assert decoded == [{"型号": "X-1"}]

    sample_html = "<title>X-1 · 予华仪器</title><h1>X-1</h1><p>设备X-1</p>"
    assert first_tag_text(sample_html, "h1") == "X-1"
    assert identity_snippets(sample_html, "X-1") == ["设备X-1"]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--model", default="R-1005")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        print("self-test: ok")
        return

    report = audit(args.root.resolve(), args.model)
    rendered = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
    else:
        print(rendered, end="")


if __name__ == "__main__":
    main()
