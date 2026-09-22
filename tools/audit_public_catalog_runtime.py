#!/usr/bin/env python3
"""Add a read-only audit of the customer-facing window.PRODUCTS payload.

The homepage renders assets/data.js rather than products.json directly. This
script makes that public/runtime payload visible in the main data-quality
artifact without changing, inferring, or repairing any product facts.

Runtime-only models are cross-referenced against specs_index.json using exact
normalized model matches only. When git history is available, the report also
records the first commit where each runtime-only model appeared in
assets/data.js. Both evidence sources are for review only and never authorize
an automatic product-data repair.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


def clean(value: Any) -> str:
    return str(value or "").strip()


def norm_model(value: Any) -> str:
    return re.sub(r"\s+", "", clean(value).upper())


def parse_window_array(text: str, variable: str, source_label: str) -> list[dict[str, Any]]:
    marker = f"window.{variable}="
    pos = text.find(marker)
    if pos < 0:
        marker = f"window.{variable} ="
        pos = text.find(marker)
    if pos < 0:
        raise ValueError(f"Could not find window.{variable} in {source_label}")

    payload = text[pos + len(marker):].lstrip()
    try:
        value, _ = json.JSONDecoder().raw_decode(payload)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Could not parse window.{variable} from {source_label}: {exc}") from exc
    if not isinstance(value, list):
        raise ValueError(f"window.{variable} in {source_label} must be an array")
    if any(not isinstance(item, dict) for item in value):
        raise ValueError(f"window.{variable} in {source_label} must contain objects only")
    return value


def load_window_array(path: Path, variable: str) -> list[dict[str, Any]]:
    try:
        return parse_window_array(path.read_text(encoding="utf-8"), variable, str(path))
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc


def load_json_object_array(path: Path) -> list[dict[str, Any]]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, list) or any(not isinstance(item, dict) for item in value):
        raise SystemExit(f"{path} must contain an array of objects")
    return value


def model_set(rows: list[dict[str, Any]]) -> set[str]:
    return {norm_model(row.get("型号")) for row in rows if norm_model(row.get("型号"))}


def summarize(rows: list[dict[str, Any]]) -> dict[str, Any]:
    empty_model_rows: list[int] = []
    empty_name_rows: list[int] = []
    empty_identity_rows: list[int] = []
    model_rows: defaultdict[str, list[int]] = defaultdict(list)
    categories = Counter()

    for index, row in enumerate(rows, start=1):
        model = clean(row.get("型号"))
        name = clean(row.get("产品名称"))
        category = clean(row.get("类别")) or "未分类"
        categories[category] += 1
        if not model:
            empty_model_rows.append(index)
        else:
            model_rows[norm_model(model)].append(index)
        if not name:
            empty_name_rows.append(index)
        if not model and not name and not clean(row.get("类别")):
            empty_identity_rows.append(index)

    duplicates = [
        {"model": model, "count": len(indices), "rows": indices}
        for model, indices in model_rows.items()
        if model and len(indices) > 1
    ]
    duplicates.sort(key=lambda item: (-item["count"], item["model"]))

    return {
        "total": len(rows),
        "modeled_count": len(rows) - len(empty_model_rows),
        "named_count": len(rows) - len(empty_name_rows),
        "empty_model_count": len(empty_model_rows),
        "empty_model_rows": empty_model_rows,
        "empty_name_count": len(empty_name_rows),
        "empty_name_rows": empty_name_rows,
        "empty_model_name_category_count": len(empty_identity_rows),
        "empty_model_name_category_rows": empty_identity_rows,
        "duplicate_model_group_count": len(duplicates),
        "duplicate_models": duplicates,
        "category_counts": dict(categories.most_common()),
    }


def compact_spec_match(spec: dict[str, Any]) -> dict[str, str]:
    fields = ("title", "model", "series", "key", "page", "dl")
    return {field: clean(spec.get(field)) for field in fields if clean(spec.get(field))}


def git_output(args: list[str]) -> str:
    result = subprocess.run(
        ["git", *args],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return result.stdout


def build_git_first_seen_evidence(data_js_path: Path, target_models: list[str]) -> dict[str, Any]:
    """Trace exact normalized models to their first appearance in data.js history.

    This is provenance only. Commit metadata says when a string entered the public
    runtime catalogue; it does not prove that the underlying product fact is valid.
    """
    target_set = set(target_models)
    if not target_set:
        return {
            "available": True,
            "history_commit_count": 0,
            "traced_model_count": 0,
            "untraced_model_count": 0,
            "models": {},
            "first_seen_commit_groups": [],
            "note": "No runtime-only models require git provenance tracing.",
        }

    try:
        history = git_output([
            "log",
            "--follow",
            "--format=%H%x09%aI%x09%s",
            "--",
            data_js_path.as_posix(),
        ])
    except (subprocess.CalledProcessError, FileNotFoundError, UnicodeError) as exc:
        return {
            "available": False,
            "reason": f"git history unavailable: {type(exc).__name__}",
            "traced_model_count": 0,
            "untraced_model_count": len(target_models),
            "models": {},
            "first_seen_commit_groups": [],
            "note": "Git provenance is optional audit evidence and never changes product data.",
        }

    commits: list[dict[str, str]] = []
    for line in history.splitlines():
        parts = line.split("\t", 2)
        if len(parts) != 3:
            continue
        sha, authored_at, subject = parts
        commits.append({"sha": sha, "authored_at": authored_at, "subject": subject})

    first_seen: dict[str, dict[str, str]] = {}
    for commit in reversed(commits):
        try:
            text = git_output(["show", f"{commit['sha']}:{data_js_path.as_posix()}"])
            rows = parse_window_array(text, "PRODUCTS", f"{commit['sha']}:{data_js_path}")
        except (subprocess.CalledProcessError, ValueError, UnicodeError):
            continue
        present = model_set(rows) & target_set
        for model in sorted(present):
            if model not in first_seen:
                first_seen[model] = {
                    "commit": commit["sha"],
                    "authored_at": commit["authored_at"],
                    "subject": commit["subject"],
                }

    grouped: defaultdict[tuple[str, str, str], list[str]] = defaultdict(list)
    for model, evidence in first_seen.items():
        grouped[(evidence["commit"], evidence["authored_at"], evidence["subject"])].append(model)

    groups = [
        {
            "commit": commit,
            "authored_at": authored_at,
            "subject": subject,
            "model_count": len(models),
            "models": sorted(models),
        }
        for (commit, authored_at, subject), models in grouped.items()
    ]
    groups.sort(key=lambda item: item["authored_at"])

    untraced = sorted(target_set - set(first_seen))
    return {
        "available": True,
        "history_commit_count": len(commits),
        "traced_model_count": len(first_seen),
        "untraced_model_count": len(untraced),
        "untraced_models": untraced,
        "models": {model: first_seen[model] for model in sorted(first_seen)},
        "first_seen_commit_groups": groups,
        "note": (
            "Read-only git provenance: exact normalized model strings are traced to their first "
            "appearance in assets/data.js history. First-seen commits are not treated as proof of "
            "technical correctness and never trigger automatic data repair."
        ),
    }


def build_public_only_evidence(
    public_rows: list[dict[str, Any]],
    public_only_models: list[str],
    specs: list[dict[str, Any]],
    git_provenance: dict[str, Any],
) -> dict[str, Any]:
    rows_by_model: defaultdict[str, list[tuple[int, dict[str, Any]]]] = defaultdict(list)
    for index, row in enumerate(public_rows, start=1):
        model = norm_model(row.get("型号"))
        if model:
            rows_by_model[model].append((index, row))

    specs_by_model: defaultdict[str, list[dict[str, Any]]] = defaultdict(list)
    for spec in specs:
        model = norm_model(spec.get("model"))
        if model:
            specs_by_model[model].append(spec)

    git_by_model = git_provenance.get("models", {}) if isinstance(git_provenance, dict) else {}
    entries: list[dict[str, Any]] = []
    with_exact_spec: list[str] = []
    without_exact_spec: list[str] = []

    for model in public_only_models:
        runtime_rows = rows_by_model.get(model, [])
        categories = sorted({clean(row.get("类别")) for _, row in runtime_rows if clean(row.get("类别"))})
        names = sorted({clean(row.get("产品名称")) for _, row in runtime_rows if clean(row.get("产品名称"))})
        exact_matches = specs_by_model.get(model, [])
        if exact_matches:
            with_exact_spec.append(model)
        else:
            without_exact_spec.append(model)
        entry: dict[str, Any] = {
            "model": model,
            "runtime_row_indices": [index for index, _ in runtime_rows],
            "runtime_categories": categories,
            "runtime_names": names,
            "exact_spec_match_count": len(exact_matches),
            "exact_spec_matches": [compact_spec_match(spec) for spec in exact_matches],
        }
        if model in git_by_model:
            entry["git_first_seen"] = git_by_model[model]
        entries.append(entry)

    return {
        "exact_spec_evidence_model_count": len(with_exact_spec),
        "models_with_exact_spec_evidence": with_exact_spec,
        "no_exact_spec_evidence_model_count": len(without_exact_spec),
        "models_without_exact_spec_evidence": without_exact_spec,
        "models": entries,
        "matching_rule": (
            "Only exact normalized matches between runtime 型号 and specs_index.json model are counted. "
            "No fuzzy/prefix inference is used, and matches are audit evidence only."
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-js", default="assets/data.js")
    parser.add_argument("--source", default="products.json")
    parser.add_argument("--spec-index", default="specs_index.json")
    parser.add_argument("--report", default="data_quality_report.json")
    args = parser.parse_args()

    data_js_path = Path(args.data_js)
    source_path = Path(args.source)
    spec_index_path = Path(args.spec_index)
    report_path = Path(args.report)
    source = load_json_object_array(source_path)
    specs = load_json_object_array(spec_index_path)

    public_rows = load_window_array(data_js_path, "PRODUCTS")
    public_summary = summarize(public_rows)
    source_models = model_set(source)
    public_models = model_set(public_rows)

    public_only_models = sorted(public_models - source_models)
    source_only_models = sorted(source_models - public_models)
    git_provenance = build_git_first_seen_evidence(data_js_path, public_only_models)
    public_only_evidence = build_public_only_evidence(
        public_rows,
        public_only_models,
        specs,
        git_provenance,
    )
    audit = {
        **public_summary,
        "source_total": len(source),
        "record_count_delta_vs_source": len(public_rows) - len(source),
        "distinct_model_count": len(public_models),
        "source_distinct_model_count": len(source_models),
        "public_only_model_count": len(public_only_models),
        "public_only_models": public_only_models,
        "public_only_model_evidence": public_only_evidence,
        "git_provenance": git_provenance,
        "source_only_model_count": len(source_only_models),
        "source_only_models": source_only_models,
        "note": (
            "Read-only comparison of the customer-facing assets/data.js window.PRODUCTS payload "
            "against products.json. Differences are audit findings only and are not treated as errors "
            "or repaired automatically. Exact specs_index.json model matches and git first-seen metadata "
            "are attached only as traceability evidence for runtime-only models."
        ),
    }

    report = json.loads(report_path.read_text(encoding="utf-8"))
    if not isinstance(report, dict):
        raise SystemExit(f"{report_path} must contain a JSON object")
    report["public_catalog_runtime"] = audit
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print("=== 客户实际加载目录审计（只读） ===")
    print(f"assets/data.js 产品记录: {audit['total']}")
    print(f"products.json 产品记录: {audit['source_total']}")
    print(f"记录数差异(runtime-source): {audit['record_count_delta_vs_source']:+d}")
    print(f"runtime 空型号: {audit['empty_model_count']}")
    print(f"runtime 空产品名: {audit['empty_name_count']}")
    print(f"runtime 重复型号组: {audit['duplicate_model_group_count']}")
    print(f"runtime 独有型号: {audit['public_only_model_count']}")
    print(f"source 独有型号: {audit['source_only_model_count']}")
    print(
        "runtime 独有型号中有规格书精确证据: "
        f"{public_only_evidence['exact_spec_evidence_model_count']}"
    )
    print(
        "runtime 独有型号中无规格书精确证据: "
        f"{public_only_evidence['no_exact_spec_evidence_model_count']}"
    )
    if git_provenance.get("available"):
        print(
            "runtime 独有型号 git 首次出现可追溯: "
            f"{git_provenance.get('traced_model_count', 0)}/{len(public_only_models)}"
        )
        for group in git_provenance.get("first_seen_commit_groups", []):
            print(
                "  ",
                group["commit"][:12],
                group["authored_at"],
                f"{group['model_count']} models",
                group["subject"],
            )
    else:
        print("runtime 独有型号 git 首次出现追溯: unavailable")
    if public_only_models:
        print("runtime 独有型号（前30项，仅审计）:", public_only_models[:30])
    if source_only_models:
        print("source 独有型号（前30项，仅审计）:", source_only_models[:30])
    print(f"Updated report: {report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
