#!/usr/bin/env python3
"""Read-only source-product evidence guard for standalone core-model pages.

Every public model/*.html page must claim a Product JSON-LD model that exists
literally in the authoritative source products.json. Matching intentionally only
ignores leading/trailing whitespace and letter case: internal whitespace,
hyphens, slashes, plus signs and punctuation remain factual differences.

The guard never creates pages, rewrites product facts, selects among duplicate
source records, or treats runtime-derived catalogue models as source evidence.
Multiple literal source records are reported for review but are not guessed away.
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PRODUCTS_JSON = ROOT / "products.json"
MODEL_DIR = ROOT / "model"


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


def source_snapshot(index: int, record: dict) -> dict:
    """Keep provenance without interpreting or merging factual product fields."""
    return {
        "source_index": index,
        "model": str(record.get("型号") or "").strip(),
        "product_name": str(record.get("产品名称") or "").strip(),
        "category": str(record.get("类别") or "").strip(),
    }


def audit() -> dict:
    products = json.loads(PRODUCTS_JSON.read_text(encoding="utf-8"))
    if not isinstance(products, list):
        raise ValueError("products.json must contain a list")

    exact_products: dict[str, list[tuple[int, dict]]] = defaultdict(list)
    for index, record in enumerate(products):
        if not isinstance(record, dict):
            continue
        key = literal_model_key(record.get("型号"))
        if key:
            exact_products[key].append((index, record))

    pages = sorted(MODEL_DIR.glob("*.html"))
    if not pages:
        raise ValueError("No standalone core-model pages found under model/*.html")

    rows: list[dict] = []
    blockers: list[dict] = []
    parse_issues: list[dict] = []
    claims_by_model: dict[str, list[str]] = defaultdict(list)
    unique_count = 0
    multiple_count = 0
    no_exact_count = 0

    for path in pages:
        page_rel = path.relative_to(ROOT).as_posix()
        try:
            model = page_product_model(path)
        except ValueError as exc:
            issue = {"core_page": page_rel, "reason": str(exc)}
            parse_issues.append(issue)
            blockers.append({"core_page": page_rel, "reason": "invalid_or_missing_product_jsonld_model"})
            rows.append(
                {
                    "core_page": page_rel,
                    "model": "",
                    "literal_key": "",
                    "source_record_count": 0,
                    "evidence_class": "parse_issue",
                    "source_records": [],
                }
            )
            continue

        key = literal_model_key(model)
        claims_by_model[key].append(page_rel)
        exact = exact_products.get(key, [])
        count = len(exact)

        if count == 0:
            evidence_class = "no_exact_source_product"
            no_exact_count += 1
            blockers.append(
                {
                    "core_page": page_rel,
                    "model": model,
                    "reason": "no_literal_source_product_model",
                }
            )
        elif count == 1:
            evidence_class = "unique_exact_source_product"
            unique_count += 1
        else:
            evidence_class = "multiple_exact_source_products"
            multiple_count += 1

        rows.append(
            {
                "core_page": page_rel,
                "model": model,
                "literal_key": key,
                "source_record_count": count,
                "evidence_class": evidence_class,
                "source_records": [source_snapshot(index, record) for index, record in exact],
            }
        )

    duplicate_page_claims = [
        {"literal_key": key, "core_pages": sorted(page_list), "page_count": len(page_list)}
        for key, page_list in sorted(claims_by_model.items())
        if key and len(page_list) > 1
    ]

    return {
        "policy": {
            "read_only": True,
            "auto_fix_count": 0,
            "page_creation_authorized": False,
            "runtime_only_products_included": False,
            "matching_rule": "trim outer whitespace + case-insensitive only; preserve all internal characters",
            "multiple_source_records_are_merged": False,
        },
        "summary": {
            "source_product_records": len(products),
            "source_records_with_model": sum(
                1
                for record in products
                if isinstance(record, dict) and literal_model_key(record.get("型号"))
            ),
            "core_model_pages": len(pages),
            "unique_exact_source_product_pages": unique_count,
            "multiple_exact_source_product_pages": multiple_count,
            "no_exact_source_product_pages": no_exact_count,
            "parse_issue_pages": len(parse_issues),
            "duplicate_model_page_claim_groups": len(duplicate_page_claims),
            "blocking_issue_count": len(blockers),
        },
        "pages": rows,
        "duplicate_model_page_claims": duplicate_page_claims,
        "parse_issues": parse_issues,
        "blocking_issues": blockers,
    }


def markdown_report(report: dict) -> str:
    summary = report["summary"]
    lines = [
        "# Yuhua core-model source evidence audit",
        "",
        "This is a read-only provenance guard. It does not create pages, merge duplicate source records, or rewrite product facts.",
        "",
        "## Summary",
        "",
        f"- Source product records: {summary['source_product_records']}",
        f"- Source records with literal model: {summary['source_records_with_model']}",
        f"- Standalone core-model pages checked: {summary['core_model_pages']}",
        f"- Pages with one exact source record: {summary['unique_exact_source_product_pages']}",
        f"- Pages with multiple exact source records: {summary['multiple_exact_source_product_pages']}",
        f"- Pages with no exact source record: {summary['no_exact_source_product_pages']}",
        f"- Product JSON-LD parse/model issues: {summary['parse_issue_pages']}",
        f"- Duplicate page model-claim groups: {summary['duplicate_model_page_claim_groups']}",
        f"- Blocking issues: {summary['blocking_issue_count']}",
        "",
        "## Page evidence",
        "",
        "| Core page | Model | Source records | Evidence class |",
        "| --- | --- | ---: | --- |",
    ]
    for row in report["pages"]:
        model = row["model"].replace("|", "\\|") or "(missing)"
        page = row["core_page"].replace("|", "\\|")
        lines.append(
            f"| `{page}` | `{model}` | {row['source_record_count']} | {row['evidence_class']} |"
        )

    if report["blocking_issues"]:
        lines.extend(["", "## Blocking issues", ""])
        for issue in report["blocking_issues"]:
            model = f" (`{issue['model']}`)" if issue.get("model") else ""
            lines.append(f"- `{issue['core_page']}`{model}: {issue['reason']}")

    if report["duplicate_model_page_claims"]:
        lines.extend(["", "## Duplicate model page claims (review only)", ""])
        for group in report["duplicate_model_page_claims"]:
            pages = ", ".join(f"`{item}`" for item in group["core_pages"])
            lines.append(f"- `{group['literal_key']}`: {pages}")

    lines.extend(
        [
            "",
            "## Safety boundary",
            "",
            "A literal source-model match proves only that the standalone page's model identifier exists in products.json. It does not authorize copying, reconciling, inferring, or overwriting technical parameters, model meaning, pricing, or specification content.",
            "",
        ]
    )
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
