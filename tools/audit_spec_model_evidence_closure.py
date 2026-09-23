#!/usr/bin/env python3
"""Verify filesystem/page evidence around suspicious .DOC/.DOCX model candidates.

This audit is intentionally read-only. It starts only from the conservative
``supported_correction_candidate`` rows produced by ``audit_suspicious_spec_models``
and checks whether the candidate spelling is also present literally in the
actual generated specification page and the referenced download filename.

A complete evidence bundle is still *not* authorization to rewrite a model.
It only narrows the records that are worth human review. Source product and
specification data are never modified by this script.
"""
from __future__ import annotations

import argparse
import html
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Any

from audit_suspicious_spec_models import audit, clean, load_json

TAG_TEXT_RE = {
    "title": re.compile(r"<title\b[^>]*>(.*?)</title\s*>", re.I | re.S),
    "h1": re.compile(r"<h1\b[^>]*>(.*?)</h1\s*>", re.I | re.S),
}
TAG_RE = re.compile(r"<[^>]+>")
SPACE_RE = re.compile(r"\s+")
PAGE_PREFIX_BYTES = 256 * 1024


def normalized_literal(value: Any) -> str:
    """Normalize Unicode/case only; keep punctuation and internal whitespace."""
    return unicodedata.normalize("NFKC", clean(value)).casefold()


def literal_contains(text: Any, candidate: Any) -> bool:
    needle = normalized_literal(candidate)
    return bool(needle and needle in normalized_literal(text))


def tag_text(prefix: str, tag: str) -> str:
    match = TAG_TEXT_RE[tag].search(prefix)
    if not match:
        return ""
    value = TAG_RE.sub(" ", match.group(1))
    return SPACE_RE.sub(" ", html.unescape(value)).strip()


def read_page_evidence(path: Path) -> tuple[str, str]:
    with path.open("rb") as handle:
        prefix = handle.read(PAGE_PREFIX_BYTES).decode("utf-8", errors="replace")
    return tag_text(prefix, "title"), tag_text(prefix, "h1")


def path_under_root(root: Path, relative: str) -> Path | None:
    """Resolve a repository-relative path without permitting traversal outside root."""
    if not relative:
        return None
    root_resolved = root.resolve()
    candidate = (root / relative).resolve()
    try:
        candidate.relative_to(root_resolved)
    except ValueError:
        return None
    return candidate


def build_report(products: list[dict[str, Any]], specs: list[dict[str, Any]], root: Path) -> dict[str, Any]:
    anomaly_report = audit(products, specs)
    supported = anomaly_report["review_groups"]["supported_correction_candidates"]
    occurrence_counts = Counter(row["review_candidate"] for row in supported)

    records: list[dict[str, Any]] = []
    complete: list[dict[str, Any]] = []
    gaps: list[dict[str, Any]] = []

    for row in supported:
        candidate = row["review_candidate"]
        page_rel = row["page"]
        download_rel = row["download"]
        page_path = path_under_root(root, page_rel)
        download_path = path_under_root(root, download_rel)

        page_exists = bool(page_path and page_path.is_file())
        download_exists = bool(download_path and download_path.is_file())
        page_title = ""
        page_h1 = ""
        page_read_error = ""
        if page_exists and page_path is not None:
            try:
                page_title, page_h1 = read_page_evidence(page_path)
            except OSError as exc:
                page_read_error = f"{type(exc).__name__}: {exc}"

        download_stem = download_path.stem if download_exists and download_path is not None else ""
        checks = {
            "candidate_literal_in_index_title": literal_contains(row["title"], candidate),
            "candidate_literal_in_page_title": literal_contains(page_title, candidate),
            "candidate_literal_in_page_h1": literal_contains(page_h1, candidate),
            "candidate_literal_in_download_stem": literal_contains(download_stem, candidate),
            "page_exists": page_exists,
            "download_exists": download_exists,
            "exact_product_model_evidence_present": bool(row["exact_product_model_matches"]),
            "no_exact_existing_spec_model_collision": not row["existing_spec_model_matches"],
            "no_whitespace_only_existing_spec_model_collision": not row[
                "whitespace_normalized_only_existing_spec_model_matches"
            ],
        }
        failed_checks = [name for name, passed in checks.items() if not passed]
        closure_complete = not failed_checks and not page_read_error

        item = {
            "row": row["row"],
            "stored_model": row["model"],
            "review_candidate": candidate,
            "supported_group_occurrence_count": occurrence_counts[candidate],
            "index_title": row["title"],
            "series": row["series"],
            "page": page_rel,
            "download": download_rel,
            "page_title": page_title,
            "page_h1": page_h1,
            "download_stem": download_stem,
            "page_size_bytes": page_path.stat().st_size if page_exists and page_path is not None else None,
            "download_size_bytes": download_path.stat().st_size if download_exists and download_path is not None else None,
            "exact_product_model_matches": row["exact_product_model_matches"],
            "evidence_checks": checks,
            "page_read_error": page_read_error,
            "failed_checks": failed_checks,
            "evidence_closure_complete_for_review": closure_complete,
            "source_fix_readiness": row["fix_readiness"],
        }
        records.append(item)
        (complete if closure_complete else gaps).append(item)

    distinct_candidates = sorted(occurrence_counts)
    return {
        "policy": {
            "read_only": True,
            "auto_fix_count": 0,
            "complete_evidence_does_not_authorize_source_rewrite": True,
            "note": (
                "This report only verifies whether an already-supported .DOC/.DOCX suffix review candidate "
                "has matching literal evidence in the catalogue, generated page, and referenced download "
                "filename. It never changes model facts, specification text, downloads, or product data."
            ),
        },
        "summary": {
            "total_specs": len(specs),
            "source_supported_correction_candidate_count": len(supported),
            "distinct_supported_candidate_count": len(distinct_candidates),
            "evidence_closure_complete_count": len(complete),
            "evidence_gap_count": len(gaps),
            "duplicate_supported_candidate_record_count": len(supported) - len(distinct_candidates),
        },
        "review_sample": complete[:3],
        "evidence_closure_complete": complete,
        "evidence_gaps": gaps,
        "all_supported_candidate_records": records,
    }


def print_human(report: dict[str, Any]) -> None:
    summary = report["summary"]
    print("=== 规格书异常型号候选证据闭环审计（只读） ===")
    print(f"规格书总数: {summary['total_specs']}")
    print(f"上游多源支持候选记录: {summary['source_supported_correction_candidate_count']}")
    print(f"不同候选型号: {summary['distinct_supported_candidate_count']}")
    print(f"页面/下载/目录字面证据闭环: {summary['evidence_closure_complete_count']}")
    print(f"仍有证据缺口: {summary['evidence_gap_count']}")
    print("自动修复: 0（证据闭环仍只代表值得人工复核，不代表允许改写型号）")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--products", default="products.json")
    parser.add_argument("--specs", default="specs_index.json")
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--json-output", default="")
    args = parser.parse_args()

    products = load_json(Path(args.products))
    specs = load_json(Path(args.specs))
    if not isinstance(products, list) or not isinstance(specs, list):
        raise SystemExit("products.json and specs_index.json must both contain JSON arrays")

    report = build_report(products, specs, Path(args.repo_root))
    print_human(report)
    if args.json_output:
        Path(args.json_output).write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
