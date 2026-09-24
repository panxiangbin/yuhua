#!/usr/bin/env python3
"""Read-only identity audit for specification pages behind core-model candidates.

This complements audit_core_model_page_gaps.py. A candidate may have an exact
model in products.json and specs_index.json while the referenced HTML page does
not visibly self-identify as that same model. This audit checks only the
specification page <title> and <h1> identity surfaces. It does not validate,
copy, normalize, infer, or rewrite technical facts.

Matching remains deliberately conservative: the literal model syntax is
preserved. Only case differs. ASCII letters/digits immediately adjacent to the
candidate model are treated as a different token so, for example, FA25 does
not match FA250. Hyphens, slashes, plus signs and internal spaces are never
normalized.
"""

from __future__ import annotations

import argparse
import json
import re
from html.parser import HTMLParser
from pathlib import Path

from audit_core_model_page_gaps import ROOT, audit as gap_audit


class IdentityParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._in_title = False
        self._in_h1 = False
        self._title_chunks: list[str] = []
        self._h1_chunks: list[str] = []
        self._current_h1: list[str] = []
        self.h1_texts: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        tag = tag.lower()
        if tag == "title":
            self._in_title = True
        elif tag == "h1":
            self._in_h1 = True
            self._current_h1 = []

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self._title_chunks.append(data)
        if self._in_h1:
            self._current_h1.append(data)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag == "title":
            self._in_title = False
        elif tag == "h1" and self._in_h1:
            text = clean_text("".join(self._current_h1))
            if text:
                self.h1_texts.append(text)
            self._in_h1 = False
            self._current_h1 = []

    @property
    def title(self) -> str:
        return clean_text("".join(self._title_chunks))


def clean_text(value: object) -> str:
    return " ".join(str(value or "").split())


def contains_literal_model(text: object, model: object) -> bool:
    """Require the exact model syntax, allowing case differences only.

    Chinese text may directly follow an ASCII model, so boundaries are limited
    to ASCII letters/digits. This blocks prefix collisions such as FA25/FA250
    without incorrectly rejecting titles such as ``CL-200平板...``.
    """
    haystack = clean_text(text).casefold()
    needle = clean_text(model).casefold()
    if not haystack or not needle:
        return False
    pattern = re.compile(
        rf"(?<![A-Za-z0-9]){re.escape(needle)}(?![A-Za-z0-9])",
        flags=re.IGNORECASE,
    )
    return bool(pattern.search(haystack))


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


def inspect_spec_page(model: str, record: dict) -> dict:
    page = str(record.get("page", "") or "").strip()
    path = safe_repo_path(page)
    result = {
        "source_index": record.get("source_index"),
        "index_title": str(record.get("title", "") or "").strip(),
        "index_model": str(record.get("model", "") or "").strip(),
        "page": page,
        "page_exists": bool(path and path.is_file()),
        "page_title": "",
        "page_h1": [],
        "literal_model_in_title": False,
        "literal_model_in_h1": False,
        "literal_identity_confirmed": False,
        "read_error": "",
    }
    if not result["page_exists"]:
        return result

    try:
        html = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        result["read_error"] = f"{type(exc).__name__}: {exc}"
        return result

    parser = IdentityParser()
    try:
        parser.feed(html)
        parser.close()
    except Exception as exc:  # HTMLParser failures should be reported, not repaired.
        result["read_error"] = f"{type(exc).__name__}: {exc}"
        return result

    result["page_title"] = parser.title
    result["page_h1"] = parser.h1_texts
    result["literal_model_in_title"] = contains_literal_model(parser.title, model)
    result["literal_model_in_h1"] = any(
        contains_literal_model(text, model) for text in parser.h1_texts
    )
    result["literal_identity_confirmed"] = bool(
        result["literal_model_in_title"] or result["literal_model_in_h1"]
    )
    return result


def audit() -> dict:
    base = gap_audit()
    candidates: list[dict] = []
    spec_pages_examined = 0
    missing_spec_pages = 0
    read_errors = 0
    confirmed_pages = 0
    unconfirmed_pages = 0
    all_identity_candidates = 0
    strongest_all_identity_candidates = 0

    for row in base["candidates"]:
        model = str(row.get("model", "") or "").strip()
        identities = [inspect_spec_page(model, spec) for spec in row.get("spec_records", [])]
        for item in identities:
            if not item["page_exists"]:
                missing_spec_pages += 1
            else:
                spec_pages_examined += 1
            if item["read_error"]:
                read_errors += 1
            if item["literal_identity_confirmed"]:
                confirmed_pages += 1
            elif item["page_exists"] and not item["read_error"]:
                unconfirmed_pages += 1

        all_identity = bool(identities) and all(
            item["literal_identity_confirmed"] for item in identities
        )
        if all_identity:
            all_identity_candidates += 1
            if row.get("evidence_rank") == 0:
                strongest_all_identity_candidates += 1

        candidates.append(
            {
                "model": model,
                "literal_key": row.get("literal_key", ""),
                "evidence_rank": row.get("evidence_rank"),
                "evidence_class": row.get("evidence_class", ""),
                "product_record_count": row.get("product_record_count", 0),
                "spec_record_count": row.get("spec_record_count", 0),
                "all_spec_pages_literal_identity": all_identity,
                "spec_identities": identities,
            }
        )

    summary = {
        "gap_candidate_models": len(candidates),
        "strongest_unique_product_unique_spec_candidates": sum(
            row.get("evidence_rank") == 0 for row in candidates
        ),
        "candidate_spec_pages_examined": spec_pages_examined,
        "candidate_missing_spec_pages": missing_spec_pages,
        "candidate_spec_page_read_errors": read_errors,
        "candidate_spec_pages_literal_identity_confirmed": confirmed_pages,
        "candidate_spec_pages_without_literal_identity": unconfirmed_pages,
        "candidates_all_spec_pages_literal_identity": all_identity_candidates,
        "strongest_candidates_all_spec_pages_literal_identity": strongest_all_identity_candidates,
    }

    return {
        "policy": {
            "read_only": True,
            "auto_fix_count": 0,
            "page_creation_authorized": False,
            "identity_surfaces": ["html_title", "h1"],
            "matching": "literal model syntax; case-insensitive; ASCII alphanumeric token boundaries only; no separator/internal-space normalization",
            "technical_content_validated": False,
            "technical_facts_rewritten": False,
            "meaning": "Identity confirmation is an extra provenance signal only, not proof that body parameters are correct and not permission to create a standalone page.",
        },
        "summary": summary,
        "top_candidates": candidates[:20],
        "candidates": candidates,
    }


def markdown_report(report: dict) -> str:
    summary = report["summary"]
    lines = [
        "# Yuhua core-model candidate specification identity audit",
        "",
        "> Read-only provenance check. A matching title/H1 confirms only that the referenced specification page visibly identifies itself with the candidate model. It does not validate technical parameters and does not authorize a standalone product page.",
        "",
        "## Summary",
        "",
        f"- Candidate models: **{summary['gap_candidate_models']}**",
        f"- Strongest 1-product + 1-spec candidates: **{summary['strongest_unique_product_unique_spec_candidates']}**",
        f"- Candidate specification pages examined: **{summary['candidate_spec_pages_examined']}**",
        f"- Missing specification pages: **{summary['candidate_missing_spec_pages']}**",
        f"- Specification page read/parse errors: **{summary['candidate_spec_page_read_errors']}**",
        f"- Specification pages with literal model in title/H1: **{summary['candidate_spec_pages_literal_identity_confirmed']}**",
        f"- Existing specification pages without literal model in title/H1: **{summary['candidate_spec_pages_without_literal_identity']}**",
        f"- Candidates whose every spec page self-identifies literally: **{summary['candidates_all_spec_pages_literal_identity']}**",
        f"- Strongest candidates whose every spec page self-identifies literally: **{summary['strongest_candidates_all_spec_pages_literal_identity']}**",
        "",
        "## Highest evidence-completeness candidates",
        "",
        "| Model | Evidence class | Spec page identity |",
        "| --- | --- | --- |",
    ]
    for row in report["top_candidates"]:
        model = str(row["model"]).replace("|", "\\|")
        identity = "confirmed" if row["all_spec_pages_literal_identity"] else "review"
        lines.append(f"| `{model}` | {row['evidence_class']} | {identity} |")
    if not report["top_candidates"]:
        lines.append("| — | no candidates | — |")

    lines.extend(
        [
            "",
            "## Safety policy",
            "",
            "- Product/spec index matching remains literal; separators and internal spaces are meaningful.",
            "- This audit reads specification HTML only; it does not edit product data, specs, model pages or downloads.",
            "- Only `<title>` and `<h1>` are treated as page-identity surfaces.",
            "- Body text and technical parameters are deliberately not validated or promoted to product facts.",
            "- Any conflicting or unconfirmed identity remains a review item.",
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
        "Core-model candidate spec identity audit: "
        f"candidates={summary['gap_candidate_models']}, "
        f"spec_pages={summary['candidate_spec_pages_examined']}, "
        f"confirmed_pages={summary['candidate_spec_pages_literal_identity_confirmed']}, "
        f"review_pages={summary['candidate_spec_pages_without_literal_identity']}, "
        f"strongest_confirmed={summary['strongest_candidates_all_spec_pages_literal_identity']}"
    )


if __name__ == "__main__":
    main()
