#!/usr/bin/env python3
"""Classify suspicious specification-model values without changing source data.

The main data-quality check deliberately reports suspicious values broadly. This
script makes that list actionable by separating obvious file-extension leakage,
placeholder tokens, brand/generic tokens, and by attaching existing catalogue,
title, and specification-index evidence to possible review candidates.

Important: candidates in this report are evidence for review only. The script
never rewrites specs_index.json or products.json.
"""
from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from check_product_data import clean, is_suspicious_model, norm_model

EXTENSION_PLACEHOLDERS = {"DOC", "DOCX", "PDF", "JPG", "JPEG", "PNG", "XLS", "XLSX"}
BRAND_TOKENS = {"YUHUA"}
GENERIC_TOKENS = {"WORD", "FACTORY", "PARAMETER", "PARAMETERS", "说明书", "参数", "产品参数", "技术参数"}
DOC_SUFFIX_RE = re.compile(r"(?i)\.docx?$")
CAPACITY_ONLY_RE = re.compile(r"^\d+(?:\.\d+)?L$", re.I)


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def compact(value: Any) -> str:
    return re.sub(r"[^A-Z0-9]+", "", clean(value).upper())


def exact_model_key(value: Any) -> str:
    """Case-insensitive literal model key used for evidence labelled exact.

    Only surrounding whitespace and letter case are ignored. Punctuation,
    separators and internal whitespace remain significant so the audit never
    silently treats different model spellings as the same product fact.
    """
    return clean(value).upper()


def whitespace_normalized_model_key(value: Any) -> str:
    """Loose key used only to expose manual-review candidates.

    This mirrors the historic ``norm_model`` behavior by removing whitespace,
    but matches on this key alone are never labelled exact evidence and never
    authorize a supported correction candidate.
    """
    return norm_model(value)


def classify(model: str) -> str:
    normalized = norm_model(model)
    if normalized in EXTENSION_PLACEHOLDERS:
        return "extension_placeholder"
    if DOC_SUFFIX_RE.search(model):
        return "filename_extension_suffix"
    if normalized in BRAND_TOKENS:
        return "brand_token"
    if normalized in GENERIC_TOKENS:
        return "generic_token"
    return "other_suspicious"


def candidate_without_doc_extension(model: str) -> str:
    if not DOC_SUFFIX_RE.search(model):
        return ""
    return DOC_SUFFIX_RE.sub("", model).strip()


def build_product_model_indexes(
    products: list[dict[str, Any]],
) -> tuple[dict[str, list[dict[str, Any]]], dict[str, list[dict[str, Any]]]]:
    exact: defaultdict[str, list[dict[str, Any]]] = defaultdict(list)
    whitespace_normalized: defaultdict[str, list[dict[str, Any]]] = defaultdict(list)
    for row, product in enumerate(products, start=1):
        model = clean(product.get("型号"))
        if not model:
            continue
        item = {
            "row": row,
            "model": model,
            "category": clean(product.get("类别")),
        }
        exact[exact_model_key(model)].append(item)
        whitespace_normalized[whitespace_normalized_model_key(model)].append(item)
    return dict(exact), dict(whitespace_normalized)


def build_spec_model_indexes(
    specs: list[dict[str, Any]],
) -> tuple[dict[str, list[dict[str, Any]]], dict[str, list[dict[str, Any]]]]:
    """Index existing specification rows using literal and review-only keys.

    File extensions are intentionally preserved in both indexes. A candidate
    such as ``SHZ-95B`` therefore only collides exactly with rows already stored
    as ``SHZ-95B``; rows stored as ``SHZ-95B.DOCX`` remain in the anomaly set.
    Internal-whitespace-only similarities are reported separately for manual
    review and never counted as exact collisions.
    """
    exact: defaultdict[str, list[dict[str, Any]]] = defaultdict(list)
    whitespace_normalized: defaultdict[str, list[dict[str, Any]]] = defaultdict(list)
    for row, spec in enumerate(specs, start=1):
        model = clean(spec.get("model"))
        if not model:
            continue
        item = {
            "row": row,
            "model": model,
            "title": clean(spec.get("title")),
            "series": clean(spec.get("series")),
            "page": clean(spec.get("page")),
            "download": clean(spec.get("dl")),
        }
        exact[exact_model_key(model)].append(item)
        whitespace_normalized[whitespace_normalized_model_key(model)].append(item)
    return dict(exact), dict(whitespace_normalized)


def _normalized_only_matches(
    matches: list[dict[str, Any]], candidate_exact_key: str, current_row: int | None = None
) -> list[dict[str, Any]]:
    result = []
    for match in matches:
        if current_row is not None and match.get("row") == current_row:
            continue
        if exact_model_key(match.get("model")) == candidate_exact_key:
            continue
        result.append(match)
    return result


def audit(products: list[dict[str, Any]], specs: list[dict[str, Any]]) -> dict[str, Any]:
    product_models_exact, product_models_whitespace = build_product_model_indexes(products)
    spec_models_exact, spec_models_whitespace = build_spec_model_indexes(specs)
    category_counts: Counter[str] = Counter()
    evidence_counts: Counter[str] = Counter()
    readiness_counts: Counter[str] = Counter()
    records: list[dict[str, Any]] = []

    for row, spec in enumerate(specs, start=1):
        model = clean(spec.get("model"))
        if not is_suspicious_model(model):
            continue

        category = classify(model)
        category_counts[category] += 1
        title = clean(spec.get("title"))
        series = clean(spec.get("series"))
        candidate = candidate_without_doc_extension(model)
        candidate_exact_key = exact_model_key(candidate) if candidate else ""
        candidate_whitespace_key = whitespace_normalized_model_key(candidate) if candidate else ""
        candidate_compact = compact(candidate)

        exact_product_matches = (
            product_models_exact.get(candidate_exact_key, []) if candidate_exact_key else []
        )
        normalized_only_product_matches = _normalized_only_matches(
            product_models_whitespace.get(candidate_whitespace_key, []) if candidate_whitespace_key else [],
            candidate_exact_key,
        )

        existing_spec_matches = [
            match for match in spec_models_exact.get(candidate_exact_key, [])
            if match["row"] != row
        ] if candidate_exact_key else []
        normalized_only_existing_spec_matches = _normalized_only_matches(
            spec_models_whitespace.get(candidate_whitespace_key, []) if candidate_whitespace_key else [],
            candidate_exact_key,
            current_row=row,
        )

        title_support = bool(candidate_compact and candidate_compact in compact(title))
        series_support = bool(candidate_compact and candidate_compact in compact(series))
        capacity_only = bool(candidate and CAPACITY_ONLY_RE.fullmatch(candidate))
        candidate_itself_suspicious = bool(candidate and is_suspicious_model(candidate))

        if exact_product_matches:
            evidence_level = "exact_product_model_match"
        elif normalized_only_product_matches:
            evidence_level = "whitespace_normalized_product_model_candidate"
        elif title_support and series_support:
            evidence_level = "title_and_series_support"
        elif title_support:
            evidence_level = "title_support_only"
        elif series_support:
            evidence_level = "series_support_only"
        else:
            evidence_level = "no_candidate_evidence"
        evidence_counts[evidence_level] += 1

        if category != "filename_extension_suffix":
            fix_readiness = "not_suffix_candidate"
        elif capacity_only:
            fix_readiness = "capacity_only_manual_review"
        elif candidate_itself_suspicious:
            fix_readiness = "candidate_still_suspicious"
        elif not exact_product_matches or not title_support:
            fix_readiness = "insufficient_cross_source_evidence"
        elif existing_spec_matches:
            fix_readiness = "existing_spec_model_collision"
        elif normalized_only_existing_spec_matches:
            fix_readiness = "whitespace_normalized_existing_spec_review"
        else:
            fix_readiness = "supported_correction_candidate"
        readiness_counts[fix_readiness] += 1

        records.append({
            "row": row,
            "model": model,
            "title": title,
            "series": series,
            "category": category,
            "review_candidate": candidate,
            "candidate_is_capacity_only": capacity_only,
            "candidate_itself_suspicious": candidate_itself_suspicious,
            "candidate_in_title": title_support,
            "candidate_in_series": series_support,
            "exact_product_model_matches": exact_product_matches,
            "whitespace_normalized_only_product_model_matches": normalized_only_product_matches,
            "existing_spec_model_matches": existing_spec_matches,
            "existing_spec_model_match_count": len(existing_spec_matches),
            "whitespace_normalized_only_existing_spec_model_matches": normalized_only_existing_spec_matches,
            "whitespace_normalized_only_existing_spec_model_match_count": len(normalized_only_existing_spec_matches),
            "evidence_level": evidence_level,
            "fix_readiness": fix_readiness,
            "page": clean(spec.get("page")),
            "download": clean(spec.get("dl")),
        })

    suffix_records = [r for r in records if r["category"] == "filename_extension_suffix"]
    strong_suffix = [r for r in suffix_records if r["evidence_level"] == "exact_product_model_match"]
    whitespace_product_candidates = [
        r for r in suffix_records
        if r["whitespace_normalized_only_product_model_matches"]
    ]
    supported_corrections = [r for r in suffix_records if r["fix_readiness"] == "supported_correction_candidate"]
    collision_risk = [r for r in suffix_records if r["fix_readiness"] == "existing_spec_model_collision"]
    whitespace_spec_review = [
        r for r in suffix_records
        if r["fix_readiness"] == "whitespace_normalized_existing_spec_review"
    ]
    capacity_only = [r for r in suffix_records if r["candidate_is_capacity_only"]]
    unresolved_suffix = [
        r for r in suffix_records
        if r["fix_readiness"] not in {
            "supported_correction_candidate",
            "existing_spec_model_collision",
            "whitespace_normalized_existing_spec_review",
            "capacity_only_manual_review",
        }
    ]
    unresolved_placeholders = [r for r in records if r["category"] == "extension_placeholder"]
    token_records = [r for r in records if r["category"] in {"brand_token", "generic_token", "other_suspicious"}]

    return {
        "policy": {
            "read_only": True,
            "auto_fix_count": 0,
            "note": (
                "Supported correction candidates still require review. Exact model evidence ignores only "
                "surrounding whitespace and letter case; internal whitespace remains significant. "
                "Whitespace-normalized similarities are manual-review hints only. This audit never rewrites "
                "product/specification facts automatically, and collision-risk rows must not be bulk-fixed."
            ),
        },
        "summary": {
            "total_specs": len(specs),
            "suspicious_model_count": len(records),
            "category_counts": dict(sorted(category_counts.items())),
            "evidence_counts": dict(sorted(evidence_counts.items())),
            "fix_readiness_counts": dict(sorted(readiness_counts.items())),
            "filename_extension_suffix_count": len(suffix_records),
            "suffix_candidate_exact_product_match_count": len(strong_suffix),
            "suffix_candidate_whitespace_normalized_product_match_count": len(whitespace_product_candidates),
            "suffix_candidate_title_supported_count": sum(1 for r in suffix_records if r["candidate_in_title"]),
            "capacity_only_suffix_count": len(capacity_only),
            "extension_placeholder_count": len(unresolved_placeholders),
            "supported_correction_candidate_count": len(supported_corrections),
            "existing_spec_model_collision_count": len(collision_risk),
            "whitespace_normalized_existing_spec_review_count": len(whitespace_spec_review),
            "other_unresolved_suffix_count": len(unresolved_suffix),
        },
        "review_groups": {
            "supported_correction_candidates": supported_corrections,
            "existing_spec_model_collision_risk": collision_risk,
            "whitespace_normalized_existing_spec_review": whitespace_spec_review,
            "suffix_candidates_with_exact_product_match": strong_suffix,
            "suffix_candidates_with_whitespace_normalized_product_match": whitespace_product_candidates,
            "capacity_only_suffix_candidates": capacity_only,
            "other_unresolved_suffix_candidates": unresolved_suffix,
            "extension_placeholders_without_model": unresolved_placeholders,
            "brand_generic_or_other_tokens": token_records,
        },
        "all_suspicious_records": records,
    }


def print_human(report: dict[str, Any]) -> None:
    summary = report["summary"]
    print("=== 规格书疑似异常型号分类审计（只读） ===")
    print(f"规格书总数: {summary['total_specs']}")
    print(f"疑似异常型号: {summary['suspicious_model_count']}")
    print("分类:")
    for key, count in summary["category_counts"].items():
        print(f"  {key}: {count}")
    print(f"带 .DOC/.DOCX 后缀: {summary['filename_extension_suffix_count']}")
    print(f"  其中与产品目录字面精确型号一致: {summary['suffix_candidate_exact_product_match_count']}")
    print(
        "  其中仅去除内部空白后与产品型号相同（仅供人工复核）: "
        f"{summary['suffix_candidate_whitespace_normalized_product_match_count']}"
    )
    print(f"  其中候选值可在规格书标题中找到: {summary['suffix_candidate_title_supported_count']}")
    print(f"  其中仅容量样式候选: {summary['capacity_only_suffix_count']}")
    print(f"  多源支持且无现有规格书型号冲突: {summary['supported_correction_candidate_count']}")
    print(f"  与现有规格书型号发生字面精确碰撞: {summary['existing_spec_model_collision_count']}")
    print(
        "  仅去除内部空白后与现有规格书型号相同（需人工复核）: "
        f"{summary['whitespace_normalized_existing_spec_review_count']}"
    )
    print(f"  其它仍需人工判断的后缀记录: {summary['other_unresolved_suffix_count']}")
    print(f"仅扩展名占位: {summary['extension_placeholder_count']}")
    print("自动修复: 0（本报告只缩小后续确定性修复的人工核对范围）")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--products", default="products.json")
    parser.add_argument("--specs", default="specs_index.json")
    parser.add_argument("--json-output", default="")
    args = parser.parse_args()

    products = load_json(Path(args.products))
    specs = load_json(Path(args.specs))
    if not isinstance(products, list) or not isinstance(specs, list):
        raise SystemExit("products.json and specs_index.json must both contain JSON arrays")

    report = audit(products, specs)
    print_human(report)
    if args.json_output:
        Path(args.json_output).write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
