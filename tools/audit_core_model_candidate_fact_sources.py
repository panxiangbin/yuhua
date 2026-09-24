#!/usr/bin/env python3
"""Read-only fact-source readiness audit for strongest standalone-model candidates.

This complements the standalone-page gap and specification-identity audits. It
looks only at the strongest gap candidates (one literal source product record +
one literal specification record) and separates customer-facing identity fields
that already exist verbatim in products.json from all other populated fields
that still require human/factual review before any standalone page is written.

The linked specification HTML is also scanned for literal mentions of *other*
models already present in specs_index.json. Those mentions are a conservative
review signal only: they are not interpreted as variants, equivalents, series
membership, or permission to copy any parameters.

For each strongest candidate, the specification-index title is also compared
with the actual referenced specification page's <title> and <h1> text. Exact
agreement is document-label provenance only: it is never promoted to a source
product name and never authorizes page creation or parameter copying.

No product/specification/model-page files are modified and no technical value is
promoted into a product fact by this audit.
"""

from __future__ import annotations

import argparse
import json
import re
from html.parser import HTMLParser
from pathlib import Path

from audit_core_model_candidate_spec_identity import inspect_spec_page
from audit_core_model_page_gaps import ROOT, PRODUCTS, SPECS, audit as gap_audit, load_json_list


IDENTITY_FIELDS = ("型号", "类别", "产品名称")


class VisibleTextParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._skip_depth = 0
        self._chunks: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag.lower() in {"script", "style", "noscript"}:
            self._skip_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in {"script", "style", "noscript"} and self._skip_depth:
            self._skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if not self._skip_depth and data.strip():
            self._chunks.append(data)

    @property
    def text(self) -> str:
        return clean_text(" ".join(self._chunks))


def clean_text(value: object) -> str:
    return " ".join(str(value or "").split())


def literal_model_key(value: object) -> str:
    """Normalize only edge whitespace and case; preserve internal syntax."""
    return str(value or "").strip().casefold()


def contains_literal_model(text: object, model: object) -> bool:
    """Match model spelling literally, allowing case differences only."""
    haystack = clean_text(text)
    needle = str(model or "").strip()
    if not haystack or not needle:
        return False
    return bool(
        re.search(
            rf"(?<![A-Za-z0-9]){re.escape(needle)}(?![A-Za-z0-9])",
            haystack,
            flags=re.IGNORECASE,
        )
    )


def safe_repo_path(relative_path: object) -> Path | None:
    text = str(relative_path or "").strip().replace("\\", "/")
    if not text:
        return None
    candidate = (ROOT / text).resolve()
    try:
        candidate.relative_to(ROOT.resolve())
    except ValueError:
        return None
    return candidate


def is_nonempty(value: object) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (list, dict, tuple, set)):
        return bool(value)
    return True


def identity_snapshot(product: dict) -> dict:
    return {
        field: str(product.get(field, "") or "").strip()
        for field in IDENTITY_FIELDS
        if is_nonempty(product.get(field))
    }


def product_field_audit(product: dict) -> dict:
    nonempty = sorted(str(key) for key, value in product.items() if is_nonempty(value))
    empty = sorted(str(key) for key, value in product.items() if not is_nonempty(value))
    manual = [field for field in nonempty if field not in IDENTITY_FIELDS]
    return {
        "source_identity_fields": identity_snapshot(product),
        "source_identity_fields_present": [field for field in IDENTITY_FIELDS if is_nonempty(product.get(field))],
        "source_identity_fields_missing": [field for field in IDENTITY_FIELDS if not is_nonempty(product.get(field))],
        "other_nonempty_source_field_names": manual,
        "other_nonempty_source_field_count": len(manual),
        "empty_source_field_names": empty,
        "safe_auto_copy_scope": "identity fields only; all non-identity values remain unvalidated and are intentionally omitted from this report",
    }


def is_review_model_token(model: str) -> bool:
    """Keep high-precision model-like literals and reject unit-shaped noise.

    Spec indexes can contain suspicious values such as ``10L``. For this
    cross-model review signal, a token that starts with a digit is kept only
    when it also has a model separator, e.g. ``2XZ-2``. This intentionally
    favors precision over recall; rejected tokens are never treated as facts.
    """
    text = str(model or "").strip()
    if len(text) < 3 or not re.search(r"[A-Za-z]", text):
        return False
    has_separator = any(mark in text for mark in "-/+()")
    if text[0].isdigit() and not has_separator:
        return False
    return bool(re.search(r"[0-9]", text) or has_separator)


def model_vocabulary(specs: list) -> list[str]:
    by_key: dict[str, str] = {}
    for entry in specs:
        if not isinstance(entry, dict):
            continue
        raw = str(entry.get("model", "") or "").strip()
        key = literal_model_key(raw)
        if key and is_review_model_token(raw):
            by_key.setdefault(key, raw)
    return [by_key[key] for key in sorted(by_key)]


def read_visible_spec_text(page: object) -> tuple[str, str]:
    path = safe_repo_path(page)
    if not path or not path.is_file():
        return "", "missing specification page"
    try:
        html = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        return "", f"{type(exc).__name__}: {exc}"
    parser = VisibleTextParser()
    try:
        parser.feed(html)
        parser.close()
    except Exception as exc:
        return "", f"{type(exc).__name__}: {exc}"
    return parser.text, ""


def other_indexed_model_mentions(text: str, candidate_model: str, vocabulary: list[str]) -> list[str]:
    candidate_key = literal_model_key(candidate_model)
    found: list[str] = []
    for model in vocabulary:
        if literal_model_key(model) == candidate_key:
            continue
        if contains_literal_model(text, model):
            found.append(model)
    return found


def document_label_evidence(spec: dict, identity: dict) -> dict:
    """Compare spec-index display label with actual page label surfaces.

    Exact cleaned-string equality is deliberately stricter than model-token
    identity. A confirmation proves only that the index label is visibly backed
    by the referenced document; it does not make that label an authoritative
    source product name.
    """
    index_title = clean_text(spec.get("title", ""))
    page_title = clean_text(identity.get("page_title", ""))
    page_h1 = [
        clean_text(value)
        for value in identity.get("page_h1", [])
        if clean_text(value)
    ]
    surfaces: list[str] = []
    if index_title and page_title == index_title:
        surfaces.append("html_title")
    if index_title and index_title in page_h1:
        surfaces.append("h1")
    return {
        "spec_index_title": index_title,
        "page_title": page_title,
        "page_h1": page_h1,
        "index_title_exactly_confirmed": bool(surfaces),
        "confirmation_surfaces": surfaces,
        "interpretation": (
            "document-label consistency only; not an authoritative source product name "
            "and not permission to write product facts or create a standalone page"
        ),
    }


def audit() -> dict:
    base = gap_audit()
    products = load_json_list(PRODUCTS, "products.json")
    specs = load_json_list(SPECS, "specs_index.json")
    vocabulary = model_vocabulary(specs)

    candidates: list[dict] = []
    missing_pages = 0
    read_errors = 0
    with_other_models = 0
    without_other_models = 0
    missing_product_name = 0
    missing_category = 0
    with_manual_source_fields = 0
    document_label_confirmed = 0
    document_label_unconfirmed = 0

    strongest = [row for row in base["candidates"] if row.get("evidence_rank") == 0]
    for row in strongest:
        product_refs = row.get("product_records", [])
        spec_refs = row.get("spec_records", [])
        if len(product_refs) != 1 or len(spec_refs) != 1:
            raise ValueError(f"Rank-0 candidate shape changed for {row.get('model')!r}")

        product_index = product_refs[0].get("source_index")
        spec_index = spec_refs[0].get("source_index")
        if not isinstance(product_index, int) or not (0 <= product_index < len(products)):
            raise ValueError(f"Invalid product source index for {row.get('model')!r}")
        if not isinstance(spec_index, int) or not (0 <= spec_index < len(specs)):
            raise ValueError(f"Invalid spec source index for {row.get('model')!r}")

        product = products[product_index]
        spec = specs[spec_index]
        if not isinstance(product, dict) or not isinstance(spec, dict):
            raise ValueError(f"Non-object evidence row for {row.get('model')!r}")

        model = clean_text(row.get("model", ""))
        fields = product_field_audit(product)
        page = clean_text(spec.get("page", ""))
        visible_text, read_error = read_visible_spec_text(page)
        page_exists = not (read_error == "missing specification page")
        mentions = other_indexed_model_mentions(visible_text, model, vocabulary) if visible_text else []

        identity = inspect_spec_page(model, {**spec, "source_index": spec_index})
        labels = document_label_evidence(spec, identity)

        if not page_exists:
            missing_pages += 1
        if read_error and page_exists:
            read_errors += 1
        if mentions:
            with_other_models += 1
        else:
            without_other_models += 1
        if "产品名称" in fields["source_identity_fields_missing"]:
            missing_product_name += 1
        if "类别" in fields["source_identity_fields_missing"]:
            missing_category += 1
        if fields["other_nonempty_source_field_count"]:
            with_manual_source_fields += 1
        if labels["index_title_exactly_confirmed"]:
            document_label_confirmed += 1
        else:
            document_label_unconfirmed += 1

        review_reasons: list[str] = []
        if fields["other_nonempty_source_field_count"]:
            review_reasons.append("non-identity source fields are populated but their values are not validated or promoted by this audit")
        if mentions:
            review_reasons.append("specification body visibly mentions other indexed model literals")
        if read_error:
            review_reasons.append("specification page could not be fully read")
        if fields["source_identity_fields_missing"]:
            review_reasons.append("one or more customer-facing source identity fields are empty")
        if not labels["index_title_exactly_confirmed"]:
            review_reasons.append("specification index title is not exactly confirmed by the referenced page title/H1")

        candidates.append(
            {
                "model": model,
                "literal_key": row.get("literal_key", ""),
                "evidence_class": row.get("evidence_class", ""),
                "product_source_index": product_index,
                "spec_source_index": spec_index,
                "source_fields": fields,
                "specification": {
                    "title": clean_text(spec.get("title", "")),
                    "model": clean_text(spec.get("model", "")),
                    "page": page,
                    "page_exists": page_exists,
                    "read_error": read_error,
                    "other_indexed_model_mentions": mentions,
                    "other_indexed_model_mention_count": len(mentions),
                    "mention_interpretation": "manual review signal only; no equivalence, variant, series, or parameter relationship is inferred",
                    "document_label_evidence": labels,
                },
                "manual_review_required": bool(review_reasons),
                "manual_review_reasons": review_reasons,
                "page_creation_authorized": False,
            }
        )

    candidates.sort(key=lambda item: item["literal_key"])
    summary = {
        "strongest_candidate_count": len(candidates),
        "cross_model_review_vocabulary_count": len(vocabulary),
        "candidates_missing_source_product_name": missing_product_name,
        "candidates_missing_source_category": missing_category,
        "candidates_with_non_identity_source_fields": with_manual_source_fields,
        "candidate_spec_pages_missing": missing_pages,
        "candidate_spec_page_read_errors": read_errors,
        "candidates_with_other_indexed_models_in_spec_body": with_other_models,
        "candidates_without_other_indexed_models_in_spec_body": without_other_models,
        "candidates_with_spec_index_title_confirmed_by_page_label": document_label_confirmed,
        "candidates_without_spec_index_title_confirmation": document_label_unconfirmed,
        "candidates_requiring_manual_review": sum(row["manual_review_required"] for row in candidates),
    }

    return {
        "policy": {
            "read_only": True,
            "auto_fix_count": 0,
            "page_creation_authorized": False,
            "technical_values_copied": False,
            "technical_values_validated": False,
            "spec_body_parameters_promoted_to_product_facts": False,
            "spec_document_labels_in_report": True,
            "spec_document_labels_promoted_to_product_name": False,
            "identity_fields_allowed_in_report": list(IDENTITY_FIELDS),
            "non_identity_values_in_report": False,
            "matching": "literal model syntax; case-insensitive; ASCII alphanumeric token boundaries; no separator/internal-space normalization",
            "cross_model_review_vocabulary": "high-precision indexed model literals with ASCII letters plus a digit or common model separator; digit-leading unit-shaped tokens without separators are excluded to reduce noisy capacity/value matches",
            "meaning": (
                "This report separates literal source identity evidence from fields and cross-model "
                "specification text that still need factual review. Specification index/title/H1 "
                "strings are document-label provenance only, never source product names. "
                "It never authorizes page creation."
            ),
        },
        "summary": summary,
        "candidates": candidates,
    }


def markdown_report(report: dict) -> str:
    summary = report["summary"]
    lines = [
        "# Yuhua standalone-model candidate fact-source readiness audit",
        "",
        "> Read-only preflight for the strongest 1-source-product + 1-spec candidates. Identity evidence may be shown verbatim; technical/descriptive source values are intentionally omitted, specification document labels are provenance only, and cross-model mentions are review signals only.",
        "",
        "## Summary",
        "",
        f"- Strongest candidates examined: **{summary['strongest_candidate_count']}**",
        f"- Conservative cross-model review vocabulary: **{summary['cross_model_review_vocabulary_count']}** literals",
        f"- Missing source product name: **{summary['candidates_missing_source_product_name']}**",
        f"- Missing source category: **{summary['candidates_missing_source_category']}**",
        f"- Candidates with populated non-identity source fields: **{summary['candidates_with_non_identity_source_fields']}**",
        f"- Missing specification pages: **{summary['candidate_spec_pages_missing']}**",
        f"- Specification page read/parse errors: **{summary['candidate_spec_page_read_errors']}**",
        f"- Spec-index titles exactly confirmed by page title/H1: **{summary['candidates_with_spec_index_title_confirmed_by_page_label']}**",
        f"- Spec-index titles without exact page-label confirmation: **{summary['candidates_without_spec_index_title_confirmation']}**",
        f"- Specs that mention other indexed model literals: **{summary['candidates_with_other_indexed_models_in_spec_body']}**",
        f"- Specs with no other indexed model literal detected: **{summary['candidates_without_other_indexed_models_in_spec_body']}**",
        f"- Candidates still requiring manual factual review: **{summary['candidates_requiring_manual_review']}**",
        "",
        "## Candidate evidence separation",
        "",
        "| Model | Source category | Product name | Spec document label | Non-identity source fields | Other indexed models in spec body |",
        "| --- | --- | --- | --- | ---: | ---: |",
    ]
    for row in report["candidates"]:
        identity = row["source_fields"]["source_identity_fields"]
        model = row["model"].replace("|", "\\|")
        category = str(identity.get("类别", "—")).replace("|", "\\|") or "—"
        product_name = str(identity.get("产品名称", "—")).replace("|", "\\|") or "—"
        label_state = (
            "confirmed"
            if row["specification"]["document_label_evidence"]["index_title_exactly_confirmed"]
            else "review"
        )
        lines.append(
            f"| `{model}` | {category} | {product_name} | {label_state} | "
            f"{row['source_fields']['other_nonempty_source_field_count']} | "
            f"{row['specification']['other_indexed_model_mention_count']} |"
        )
    if not report["candidates"]:
        lines.append("| — | — | — | — | 0 | 0 |")

    lines.extend(
        [
            "",
            "## Safety policy",
            "",
            "- Only literal source identity fields (`型号`, `类别`, `产品名称`) are emitted with source-product values.",
            "- Technical/descriptive source fields are reported by field name/count only; their values are not copied or validated.",
            "- Specification index titles and page title/H1 strings are document provenance only and are never written into `产品名称`.",
            "- Other model literals found in a specification body are review signals only and never treated as equivalent/variant models.",
            "- Separators and internal spaces remain meaningful; no model normalization is performed.",
            "- No product data, specification content, downloads or standalone pages are modified.",
            "- Page creation remains explicitly unauthorized by this audit.",
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
    print(
        "Core-model candidate fact-source audit: "
        f"candidates={summary['strongest_candidate_count']}, "
        f"label_confirmed={summary['candidates_with_spec_index_title_confirmed_by_page_label']}, "
        f"cross_model_specs={summary['candidates_with_other_indexed_models_in_spec_body']}, "
        f"missing_product_name={summary['candidates_missing_source_product_name']}, "
        f"manual_review={summary['candidates_requiring_manual_review']}"
    )


if __name__ == "__main__":
    main()
