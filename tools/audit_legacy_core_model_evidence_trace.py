#!/usr/bin/env python3
"""Read-only cross-source provenance trace for legacy core-model pages.

This audit is intentionally limited to the explicit review-only baseline created
by the core-model source-evidence guard. It traces each legacy standalone model
claim across four existing repository surfaces without changing or reconciling
facts:

* authoritative source products.json
* generated runtime catalogue assets/data.js
* specification index specs_index.json
* the standalone page's Product JSON-LD model claim

Matching trims outer whitespace and ignores letter case only. Internal spaces,
hyphens, slashes, plus signs and punctuation remain factual differences. Runtime
or specification matches are provenance signals only; they are never promoted
to authoritative source-product evidence and never authorize automatic fixes.
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PRODUCTS_JSON = ROOT / "products.json"
RUNTIME_DATA_JS = ROOT / "assets" / "data.js"
SPECS_INDEX_JSON = ROOT / "specs_index.json"
BASELINE_JSON = ROOT / ".github" / "yuhua-core-model-source-evidence-baseline.json"


class ProductJsonLdParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._in_json_ld = False
        self._chunks: list[str] = []
        self.json_ld_blocks: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        attrs = {str(key).lower(): value for key, value in attrs}
        if tag.lower() == "script" and str(attrs.get("type", "")).lower() == "application/ld+json":
            self._in_json_ld = True
            self._chunks = []

    def handle_data(self, data: str) -> None:
        if self._in_json_ld:
            self._chunks.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "script" and self._in_json_ld:
            self.json_ld_blocks.append("".join(self._chunks).strip())
            self._in_json_ld = False
            self._chunks = []


def literal_model_key(value: object) -> str:
    """Literal factual key: trim and case-fold only; preserve internal syntax."""
    return str(value or "").strip().casefold()


def find_product_model(value: object) -> str:
    if isinstance(value, dict):
        raw_type = value.get("@type")
        types = raw_type if isinstance(raw_type, list) else [raw_type]
        if "Product" in types and str(value.get("model") or "").strip():
            return str(value["model"]).strip()
        for child in value.values():
            found = find_product_model(child)
            if found:
                return found
    elif isinstance(value, list):
        for child in value:
            found = find_product_model(child)
            if found:
                return found
    return ""


def page_product_model(path: Path) -> str:
    parser = ProductJsonLdParser()
    parser.feed(path.read_text(encoding="utf-8"))
    parse_errors: list[str] = []
    for index, block in enumerate(parser.json_ld_blocks, start=1):
        if not block:
            continue
        try:
            payload = json.loads(block)
        except json.JSONDecodeError as exc:
            parse_errors.append(f"JSON-LD block {index}: {exc.msg}")
            continue
        model = find_product_model(payload)
        if model:
            return model
    if parse_errors:
        raise ValueError("; ".join(parse_errors))
    raise ValueError("Product JSON-LD model is missing")


def load_json_list(path: Path, label: str) -> list[dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise ValueError(f"{label} must contain a list")
    return [item for item in payload if isinstance(item, dict)]


def load_runtime_products(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8")
    marker = "window.PRODUCTS="
    start = text.find(marker)
    if start < 0:
        raise ValueError("assets/data.js is missing window.PRODUCTS")
    remainder = text[start + len(marker):].lstrip()
    try:
        payload, consumed = json.JSONDecoder().raw_decode(remainder)
    except json.JSONDecodeError as exc:
        raise ValueError(f"cannot parse window.PRODUCTS JSON: {exc.msg}") from exc
    if not isinstance(payload, list):
        raise ValueError("window.PRODUCTS must contain a list")
    trailing = remainder[consumed:].lstrip()
    if not trailing.startswith(";"):
        raise ValueError("window.PRODUCTS JSON is not terminated by a semicolon")
    return [item for item in payload if isinstance(item, dict)]


def load_baseline() -> list[dict]:
    payload = json.loads(BASELINE_JSON.read_text(encoding="utf-8"))
    entries = payload.get("review_only_exceptions") if isinstance(payload, dict) else None
    if not isinstance(entries, list) or not entries:
        raise ValueError("baseline review_only_exceptions must be a non-empty list")
    cleaned: list[dict] = []
    seen: set[tuple[str, str]] = set()
    for position, entry in enumerate(entries):
        if not isinstance(entry, dict):
            raise ValueError(f"baseline entry {position} must be an object")
        page = str(entry.get("core_page") or "").strip()
        model = str(entry.get("model") or "").strip()
        reason = str(entry.get("reason") or "").strip()
        if not page.startswith("model/") or not page.endswith(".html") or not model:
            raise ValueError(f"baseline entry {position} has invalid core_page/model")
        pair = (page, literal_model_key(model))
        if pair in seen:
            raise ValueError(f"baseline contains duplicate core_page/model pair: {page} / {model}")
        seen.add(pair)
        cleaned.append({"core_page": page, "model": model, "literal_key": pair[1], "reason": reason})
    return cleaned


def index_by_model(records: list[dict], field: str) -> dict[str, list[tuple[int, dict]]]:
    result: dict[str, list[tuple[int, dict]]] = defaultdict(list)
    for index, record in enumerate(records):
        key = literal_model_key(record.get(field))
        if key:
            result[key].append((index, record))
    return result


def runtime_snapshot(index: int, record: dict) -> dict:
    return {
        "runtime_index": index,
        "model": str(record.get("型号") or "").strip(),
        "product_name": str(record.get("产品名称") or "").strip(),
        "category": str(record.get("类别") or "").strip(),
        "key": str(record.get("key") or "").strip(),
    }


def source_snapshot(index: int, record: dict) -> dict:
    return {
        "source_index": index,
        "model": str(record.get("型号") or "").strip(),
        "product_name": str(record.get("产品名称") or "").strip(),
        "category": str(record.get("类别") or "").strip(),
    }


def spec_snapshot(index: int, record: dict) -> dict:
    return {
        "spec_index": index,
        "model": str(record.get("model") or "").strip(),
        "title": str(record.get("title") or "").strip(),
        "series": str(record.get("series") or "").strip(),
        "page": str(record.get("page") or "").strip(),
        "download": str(record.get("dl") or "").strip(),
    }


def evidence_class(source_count: int, runtime_count: int, spec_count: int) -> str:
    if source_count:
        return "source_exact_present_review_baseline_staleness"
    if runtime_count and spec_count:
        return "runtime_and_spec_exact_review_only"
    if runtime_count:
        return "runtime_only_exact_review_only"
    if spec_count:
        return "spec_only_exact_review_only"
    return "no_exact_cross_source_evidence_review_only"


def audit() -> dict:
    baseline = load_baseline()
    source_products = load_json_list(PRODUCTS_JSON, "products.json")
    runtime_products = load_runtime_products(RUNTIME_DATA_JS)
    specs = load_json_list(SPECS_INDEX_JSON, "specs_index.json")

    source_index = index_by_model(source_products, "型号")
    runtime_index = index_by_model(runtime_products, "型号")
    spec_index = index_by_model(specs, "model")

    rows: list[dict] = []
    blockers: list[dict] = []
    classes: dict[str, int] = defaultdict(int)

    for entry in baseline:
        page_rel = entry["core_page"]
        baseline_model = entry["model"]
        key = entry["literal_key"]
        page_path = ROOT / page_rel

        if not page_path.exists():
            blockers.append({"core_page": page_rel, "model": baseline_model, "reason": "baseline_page_missing"})
            rows.append({
                "core_page": page_rel,
                "baseline_model": baseline_model,
                "page_model": "",
                "page_model_matches_baseline": False,
                "source_exact_count": 0,
                "runtime_exact_count": 0,
                "spec_exact_count": 0,
                "evidence_class": "structural_blocker",
                "source_records": [],
                "runtime_records": [],
                "spec_records": [],
            })
            classes["structural_blocker"] += 1
            continue

        try:
            page_model = page_product_model(page_path)
        except ValueError as exc:
            blockers.append({"core_page": page_rel, "model": baseline_model, "reason": f"invalid_page_product_jsonld: {exc}"})
            rows.append({
                "core_page": page_rel,
                "baseline_model": baseline_model,
                "page_model": "",
                "page_model_matches_baseline": False,
                "source_exact_count": 0,
                "runtime_exact_count": 0,
                "spec_exact_count": 0,
                "evidence_class": "structural_blocker",
                "source_records": [],
                "runtime_records": [],
                "spec_records": [],
            })
            classes["structural_blocker"] += 1
            continue

        page_matches = literal_model_key(page_model) == key
        if not page_matches:
            blockers.append({
                "core_page": page_rel,
                "model": baseline_model,
                "page_model": page_model,
                "reason": "page_product_jsonld_model_differs_from_baseline",
            })

        exact_source = source_index.get(key, [])
        exact_runtime = runtime_index.get(key, [])
        exact_specs = spec_index.get(key, [])
        row_class = evidence_class(len(exact_source), len(exact_runtime), len(exact_specs))
        classes[row_class] += 1

        rows.append({
            "core_page": page_rel,
            "baseline_model": baseline_model,
            "page_model": page_model,
            "page_model_matches_baseline": page_matches,
            "baseline_reason": entry["reason"],
            "source_exact_count": len(exact_source),
            "runtime_exact_count": len(exact_runtime),
            "spec_exact_count": len(exact_specs),
            "evidence_class": row_class,
            "source_records": [source_snapshot(index, record) for index, record in exact_source],
            "runtime_records": [runtime_snapshot(index, record) for index, record in exact_runtime],
            "spec_records": [spec_snapshot(index, record) for index, record in exact_specs],
        })

    return {
        "policy": {
            "read_only": True,
            "auto_fix_count": 0,
            "factual_rewrite_authorized": False,
            "page_creation_authorized": False,
            "baseline_entries_are_factual_approval": False,
            "runtime_exact_is_source_evidence": False,
            "spec_exact_is_source_evidence": False,
            "similar_or_normalized_models_are_matched": False,
            "matching_rule": "trim outer whitespace + case-insensitive only; preserve all internal characters",
            "scope": "explicit legacy review-only core-model baseline only",
        },
        "summary": {
            "legacy_review_pages": len(baseline),
            "source_product_records": len(source_products),
            "runtime_product_records": len(runtime_products),
            "spec_records": len(specs),
            "source_exact_pages": sum(1 for row in rows if row.get("source_exact_count", 0) > 0),
            "runtime_exact_pages": sum(1 for row in rows if row.get("runtime_exact_count", 0) > 0),
            "spec_exact_pages": sum(1 for row in rows if row.get("spec_exact_count", 0) > 0),
            "page_model_mismatch_count": sum(1 for row in rows if not row.get("page_model_matches_baseline")),
            "blocking_issue_count": len(blockers),
            "evidence_class_counts": dict(sorted(classes.items())),
        },
        "pages": rows,
        "blocking_issues": blockers,
    }


def markdown_report(report: dict) -> str:
    summary = report["summary"]
    lines = [
        "# Yuhua legacy core-model evidence trace",
        "",
        "Read-only provenance report for the explicit legacy review baseline. Exact runtime/spec matches are review signals only and are not promoted to source-product evidence.",
        "",
        "## Summary",
        "",
        f"- Legacy review pages traced: {summary['legacy_review_pages']}",
        f"- Source product records scanned: {summary['source_product_records']}",
        f"- Runtime catalogue records scanned: {summary['runtime_product_records']}",
        f"- Specification records scanned: {summary['spec_records']}",
        f"- Legacy pages with exact source-product evidence: {summary['source_exact_pages']}",
        f"- Legacy pages with exact runtime evidence: {summary['runtime_exact_pages']}",
        f"- Legacy pages with exact specification evidence: {summary['spec_exact_pages']}",
        f"- Page/baseline model mismatches: {summary['page_model_mismatch_count']}",
        f"- Structural blocking issues: {summary['blocking_issue_count']}",
        "",
        "## Evidence trace",
        "",
        "| Core page | Model | Source | Runtime | Specs | Classification |",
        "| --- | --- | ---: | ---: | ---: | --- |",
    ]
    for row in report["pages"]:
        page = str(row["core_page"]).replace("|", "\\|")
        model = str(row.get("page_model") or row.get("baseline_model") or "").replace("|", "\\|")
        lines.append(
            f"| `{page}` | `{model}` | {row['source_exact_count']} | {row['runtime_exact_count']} | {row['spec_exact_count']} | {row['evidence_class']} |"
        )
        for spec in row.get("spec_records", []):
            lines.append(
                f"  - Exact spec evidence for `{model}`: `{spec['title']}` — `{spec['page']}` — `{spec['download']}`"
            )

    if report["blocking_issues"]:
        lines.extend(["", "## Structural blockers", ""])
        for issue in report["blocking_issues"]:
            lines.append(f"- `{issue['core_page']}`: {issue['reason']}")

    lines.extend([
        "",
        "## Safety boundary",
        "",
        "This trace does not decide which identifier is correct, normalize slash/dash/parenthesis variants, infer model meaning, copy technical parameters, edit specification content, or authorize removing the legacy review baseline. Any factual repair requires separate reliable source evidence and review.",
        "",
    ])
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", dest="json_path", type=Path)
    parser.add_argument("--markdown", dest="markdown_path", type=Path)
    args = parser.parse_args()

    report = audit()
    json_text = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    markdown_text = markdown_report(report)
    if args.json_path:
        args.json_path.write_text(json_text, encoding="utf-8")
    else:
        print(json_text, end="")
    if args.markdown_path:
        args.markdown_path.write_text(markdown_text, encoding="utf-8")
    return 2 if report["summary"]["blocking_issue_count"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
