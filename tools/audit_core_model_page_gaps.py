#!/usr/bin/env python3
"""Read-only evidence audit for missing standalone core-model pages.

The report identifies literal model strings that are present in BOTH the source
product catalogue (products.json) and the specification index
(specs_index.json), but are not yet represented by an existing model/*.html
Product JSON-LD model.

This tool does not decide which products are commercially important and does
not authorize page creation. It never rewrites product/specification facts.
Its ranking reflects evidence completeness only. Leading/trailing whitespace
and case are treated as presentation differences; internal whitespace,
punctuation and separators remain significant model evidence.
"""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PRODUCTS = ROOT / "products.json"
SPECS = ROOT / "specs_index.json"
MODEL_DIR = ROOT / "model"


class ModelJsonLdParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._in_json_ld = False
        self._chunks: list[str] = []
        self.json_ld_blocks: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        attrs = dict(attrs)
        if tag == "script" and attrs.get("type", "").lower() == "application/ld+json":
            self._in_json_ld = True
            self._chunks = []

    def handle_data(self, data: str) -> None:
        if self._in_json_ld:
            self._chunks.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "script" and self._in_json_ld:
            self.json_ld_blocks.append("".join(self._chunks).strip())
            self._in_json_ld = False
            self._chunks = []


def literal_model_key(value: object) -> str:
    """Normalize only edge whitespace and case for factual model matching."""
    return str(value or "").strip().casefold()


def find_product_model(value: object) -> str:
    if isinstance(value, dict):
        item_type = value.get("@type")
        item_types = item_type if isinstance(item_type, list) else [item_type]
        if "Product" in item_types and value.get("model"):
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


def load_json_list(path: Path, label: str) -> list:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, list):
        raise ValueError(f"{label} must contain a JSON list")
    return value


def repo_file_exists(value: object) -> bool:
    text = str(value or "").strip().replace("\\", "/")
    if not text:
        return False
    candidate = (ROOT / text).resolve()
    try:
        candidate.relative_to(ROOT.resolve())
    except ValueError:
        return False
    return candidate.is_file()


def existing_core_pages() -> tuple[dict[str, list[dict]], list[dict]]:
    by_model: dict[str, list[dict]] = defaultdict(list)
    parse_issues: list[dict] = []

    pages = sorted(MODEL_DIR.glob("*.html"))
    if not pages:
        raise ValueError("No core model pages found under model/*.html")

    for page in pages:
        parser = ModelJsonLdParser()
        parser.feed(page.read_text(encoding="utf-8"))
        product_model = ""
        errors: list[str] = []
        for block in parser.json_ld_blocks:
            if not block:
                continue
            try:
                payload = json.loads(block)
            except json.JSONDecodeError as exc:
                errors.append(f"invalid JSON-LD: {exc}")
                continue
            product_model = find_product_model(payload)
            if product_model:
                break

        page_rel = page.relative_to(ROOT).as_posix()
        if not product_model:
            parse_issues.append({"page": page_rel, "issues": errors or ["no Product JSON-LD model"]})
            continue

        by_model[literal_model_key(product_model)].append(
            {"page": page_rel, "model": product_model}
        )

    return by_model, parse_issues


def evidence_class(product_count: int, spec_count: int) -> tuple[int, str]:
    if product_count == 1 and spec_count == 1:
        return 0, "unique-product_unique-spec"
    if product_count == 1 and spec_count > 1:
        return 1, "unique-product_multiple-specs"
    if product_count > 1 and spec_count == 1:
        return 2, "multiple-products_unique-spec"
    return 3, "multiple-products_multiple-specs"


def product_snapshot(index: int, entry: dict) -> dict:
    return {
        "source_index": index,
        "model": str(entry.get("型号", "") or "").strip(),
        "product_name": str(entry.get("产品名称", "") or "").strip(),
        "category": str(entry.get("类别", "") or "").strip(),
    }


def spec_snapshot(index: int, entry: dict) -> dict:
    page = str(entry.get("page", "") or "").strip()
    download = str(entry.get("dl", "") or "").strip()
    return {
        "source_index": index,
        "title": str(entry.get("title", "") or "").strip(),
        "model": str(entry.get("model", "") or "").strip(),
        "series": str(entry.get("series", "") or "").strip(),
        "page": page,
        "page_exists": repo_file_exists(page),
        "download": download,
        "download_exists": repo_file_exists(download),
    }


def audit() -> dict:
    products = load_json_list(PRODUCTS, "products.json")
    specs = load_json_list(SPECS, "specs_index.json")
    core_by_model, core_parse_issues = existing_core_pages()

    products_by_model: dict[str, list[tuple[int, dict]]] = defaultdict(list)
    product_display: dict[str, str] = {}
    for index, entry in enumerate(products):
        if not isinstance(entry, dict):
            continue
        raw_model = str(entry.get("型号", "") or "").strip()
        key = literal_model_key(raw_model)
        if not key:
            continue
        products_by_model[key].append((index, entry))
        product_display.setdefault(key, raw_model)

    specs_by_model: dict[str, list[tuple[int, dict]]] = defaultdict(list)
    spec_display: dict[str, str] = {}
    for index, entry in enumerate(specs):
        if not isinstance(entry, dict):
            continue
        raw_model = str(entry.get("model", "") or "").strip()
        key = literal_model_key(raw_model)
        if not key:
            continue
        specs_by_model[key].append((index, entry))
        spec_display.setdefault(key, raw_model)

    shared_keys = set(products_by_model) & set(specs_by_model)
    candidate_keys = sorted(shared_keys - set(core_by_model), key=lambda item: (item.casefold(), item))

    candidates: list[dict] = []
    class_counts: Counter[str] = Counter()
    missing_spec_page_refs = 0
    missing_spec_download_refs = 0

    for key in candidate_keys:
        product_rows = products_by_model[key]
        spec_rows = specs_by_model[key]
        rank, label = evidence_class(len(product_rows), len(spec_rows))
        spec_records = [spec_snapshot(index, entry) for index, entry in spec_rows]
        missing_spec_page_refs += sum(not row["page_exists"] for row in spec_records)
        missing_spec_download_refs += sum(not row["download_exists"] for row in spec_records)
        class_counts[label] += 1

        candidates.append(
            {
                "model": product_display.get(key) or spec_display.get(key) or "",
                "literal_key": key,
                "existing_core_page": False,
                "evidence_rank": rank,
                "evidence_class": label,
                "product_record_count": len(product_rows),
                "spec_record_count": len(spec_rows),
                "product_records": [product_snapshot(index, entry) for index, entry in product_rows],
                "spec_records": spec_records,
            }
        )

    candidates.sort(key=lambda row: (row["evidence_rank"], row["literal_key"]))
    strongest = [row for row in candidates if row["evidence_rank"] == 0]

    duplicate_core_models = [
        {
            "literal_key": key,
            "pages": rows,
        }
        for key, rows in sorted(core_by_model.items())
        if len(rows) > 1
    ]

    summary = {
        "source_product_records": len(products),
        "source_product_records_with_model": sum(len(rows) for rows in products_by_model.values()),
        "source_product_distinct_literal_models": len(products_by_model),
        "spec_records": len(specs),
        "spec_distinct_literal_models": len(specs_by_model),
        "existing_core_pages_with_model": sum(len(rows) for rows in core_by_model.values()),
        "existing_core_distinct_literal_models": len(core_by_model),
        "shared_product_spec_literal_models": len(shared_keys),
        "gap_candidate_models": len(candidates),
        "strongest_unique_product_unique_spec_candidates": len(strongest),
        "candidate_evidence_classes": dict(sorted(class_counts.items())),
        "candidate_missing_spec_page_references": missing_spec_page_refs,
        "candidate_missing_spec_download_references": missing_spec_download_refs,
        "core_page_parse_issues": len(core_parse_issues),
        "duplicate_core_model_claims": len(duplicate_core_models),
    }

    return {
        "policy": {
            "read_only": True,
            "auto_fix_count": 0,
            "page_creation_authorized": False,
            "candidate_scope": "source products with literal exact specification evidence and no existing standalone core-model page",
            "exact_matching": "trim leading/trailing whitespace and casefold only; preserve internal whitespace, punctuation and separators",
            "runtime_only_products_included": False,
            "ranking_meaning": "evidence completeness only; not commercial importance or permission to create a page",
        },
        "summary": summary,
        "core_page_parse_issues": core_parse_issues,
        "duplicate_core_model_claims": duplicate_core_models,
        "top_candidates": candidates[:20],
        "candidates": candidates,
    }


def markdown_report(report: dict) -> str:
    summary = report["summary"]
    lines = [
        "# Yuhua core model standalone-page gap audit",
        "",
        "> Read-only evidence report. Candidate ranking means evidence completeness only; it does not indicate commercial priority and does not authorize page creation or any factual rewrite.",
        "",
        "## Summary",
        "",
        f"- Source product records: **{summary['source_product_records']}**",
        f"- Source product records with literal model: **{summary['source_product_records_with_model']}**",
        f"- Distinct source product models: **{summary['source_product_distinct_literal_models']}**",
        f"- Specification records: **{summary['spec_records']}**",
        f"- Distinct specification models: **{summary['spec_distinct_literal_models']}**",
        f"- Existing standalone core pages with Product model: **{summary['existing_core_pages_with_model']}**",
        f"- Literal models present in both product + spec evidence: **{summary['shared_product_spec_literal_models']}**",
        f"- Models with evidence but no standalone core page: **{summary['gap_candidate_models']}**",
        f"- Strongest evidence class (1 source product + 1 spec): **{summary['strongest_unique_product_unique_spec_candidates']}**",
        f"- Candidate missing spec page references: **{summary['candidate_missing_spec_page_references']}**",
        f"- Candidate missing spec download references: **{summary['candidate_missing_spec_download_references']}**",
        "",
        "## Highest evidence-completeness candidates",
        "",
        "| Model | Evidence class | Product records | Spec records |",
        "| --- | --- | ---: | ---: |",
    ]
    for row in report["top_candidates"]:
        model = str(row["model"]).replace("|", "\\|")
        lines.append(
            f"| `{model}` | {row['evidence_class']} | {row['product_record_count']} | {row['spec_record_count']} |"
        )
    if not report["top_candidates"]:
        lines.append("| — | no candidates | 0 | 0 |")

    lines.extend(
        [
            "",
            "## Safety policy",
            "",
            "- Literal matching ignores only leading/trailing whitespace and case.",
            "- Internal spaces, hyphens, slashes, plus signs and punctuation remain meaningful differences.",
            "- Runtime-only/synthetic product records are not used as candidate evidence.",
            "- No product facts, specification contents, model meanings or standalone pages are changed.",
            "- Any future standalone page must independently reuse reliable existing material; this report alone is not authorization.",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", dest="json_path", type=Path)
    parser.add_argument("--markdown", dest="markdown_path", type=Path)
    args = parser.parse_args()

    report = audit()
    json_text = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    md_text = markdown_report(report)

    if args.json_path:
        args.json_path.parent.mkdir(parents=True, exist_ok=True)
        args.json_path.write_text(json_text, encoding="utf-8")
    if args.markdown_path:
        args.markdown_path.parent.mkdir(parents=True, exist_ok=True)
        args.markdown_path.write_text(md_text, encoding="utf-8")

    summary = report["summary"]
    top = ", ".join(row["model"] for row in report["top_candidates"][:10]) or "none"
    print(
        "Core model page gap audit: "
        f"candidates={summary['gap_candidate_models']}, "
        f"strongest={summary['strongest_unique_product_unique_spec_candidates']}, "
        f"missing_spec_pages={summary['candidate_missing_spec_page_references']}, "
        f"missing_spec_downloads={summary['candidate_missing_spec_download_references']}"
    )
    print(f"Top evidence candidates: {top}")


if __name__ == "__main__":
    main()
