#!/usr/bin/env python3
"""Read-only Git provenance and same-commit context audit for runtime-only models.

The audit traces models that are present in customer-facing ``assets/data.js``
but absent from ``products.json``. It records when each string first appeared
and whether the same commit also carried conservative companion context:
- the exact model as a top-level key in another changed JSON file;
- a strict literal model mention in another changed text file; or
- DOC/DOCX/PDF/XLS/XLSX files added in that same commit (group context only).

These signals are traceability evidence, not proof of product facts. They must
never drive automatic repair, deletion, renaming, merging, parameter changes,
or specification rewrites.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
from collections import defaultdict
from pathlib import Path, PurePosixPath
from typing import Any

TEXT_SUFFIXES = {".html", ".htm", ".md", ".txt", ".csv"}
DOC_SUFFIXES = {".doc", ".docx", ".pdf", ".xls", ".xlsx"}
EXCLUDED_EVIDENCE_PATHS = {
    "assets/data.js", "products.json", "specs_index.json", "data_quality_report.json"
}


def clean(value: Any) -> str:
    return str(value or "").strip()


def norm_model(value: Any) -> str:
    return re.sub(r"\s+", "", clean(value).upper())


def model_pattern(model: str) -> re.Pattern[str]:
    return re.compile(rf"(?<![A-Z0-9]){re.escape(model)}(?![A-Z0-9])", re.I)


def git(*args: str, optional: bool = False) -> str:
    proc = subprocess.run(
        ["git", *args], check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        encoding="utf-8", errors="replace",
    )
    if proc.returncode and not optional:
        raise SystemExit(f"git {' '.join(args)} failed:\n{proc.stderr.strip()}")
    return proc.stdout if proc.returncode == 0 else ""


def parse_products_js(text: str, origin: str) -> set[str]:
    for marker in ("window.PRODUCTS=", "window.PRODUCTS ="):
        pos = text.find(marker)
        if pos >= 0:
            payload = text[pos + len(marker):].lstrip()
            try:
                rows, _ = json.JSONDecoder().raw_decode(payload)
            except json.JSONDecodeError as exc:
                raise SystemExit(f"Could not parse window.PRODUCTS from {origin}: {exc}") from exc
            if not isinstance(rows, list):
                raise SystemExit(f"window.PRODUCTS in {origin} must be a list")
            return {norm_model(row.get("型号")) for row in rows if isinstance(row, dict) and norm_model(row.get("型号"))}
    raise SystemExit(f"Could not find window.PRODUCTS in {origin}")


def file_history(path: str) -> list[dict[str, str]]:
    raw = git("log", "--follow", "--reverse", "--format=%H%x1f%aI%x1f%s", "--", path)
    rows = []
    for line in raw.splitlines():
        if not line.strip():
            continue
        parts = line.split("\x1f", 2)
        if len(parts) != 3:
            raise SystemExit(f"Unexpected git log line for {path}: {line!r}")
        rows.append(dict(zip(("sha", "date", "subject"), parts)))
    if not rows:
        raise SystemExit(f"No git history found for {path}")
    return rows


def runtime_versions(path: str) -> list[dict[str, Any]]:
    versions, previous = [], set()
    for item in file_history(path):
        models = parse_products_js(git("show", f"{item['sha']}:{path}"), f"{item['sha']}:{path}")
        versions.append({
            **item,
            "model_count": len(models),
            "added_model_count_vs_previous_runtime_version": len(models - previous),
            "removed_model_count_vs_previous_runtime_version": len(previous - models),
            "_models": models,
        })
        previous = models
    return versions


def changed_files(sha: str) -> list[dict[str, str]]:
    raw = git("diff-tree", "--root", "--no-commit-id", "--name-status", "-r", "-M", sha)
    rows = []
    for line in raw.splitlines():
        if line.strip():
            parts = line.split("\t")
            rows.append({"status": parts[0], "path": parts[-1]})
    return rows


def blob_text(sha: str, path: str) -> str | None:
    text = git("show", f"{sha}:{path}", optional=True)
    return text or None


def json_top_level_keys(sha: str, path: str) -> set[str]:
    text = blob_text(sha, path)
    if text is None:
        return set()
    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        return set()
    if not isinstance(payload, dict):
        return set()
    return {norm_model(key) for key in payload if norm_model(key)}


def introduction_context(
    targets: list[str], first_seen: dict[str, dict[str, Any]], versions: list[dict[str, Any]],
    runtime_path: str, source_path: str,
) -> dict[str, Any]:
    groups: defaultdict[str, list[str]] = defaultdict(list)
    for model in targets:
        if model in first_seen:
            groups[first_seen[model]["sha"]].append(model)

    by_sha = {v["sha"]: v for v in versions}
    excluded = EXCLUDED_EVIDENCE_PATHS | {runtime_path, source_path}
    per_model: dict[str, dict[str, Any]] = {}
    group_rows = []

    for sha, models in groups.items():
        files = changed_files(sha)
        paths = sorted(item["path"] for item in files)
        docs = sorted(
            item["path"] for item in files
            if item["status"].startswith("A") and PurePosixPath(item["path"]).suffix.lower() in DOC_SUFFIXES
        )
        structured: defaultdict[str, list[str]] = defaultdict(list)
        mentions: defaultdict[str, list[str]] = defaultdict(list)

        for item in files:
            path = item["path"]
            if path in excluded:
                continue
            suffix = PurePosixPath(path).suffix.lower()
            if suffix == ".json":
                keys = json_top_level_keys(sha, path)
                for model in models:
                    if model in keys:
                        structured[model].append(path)
            elif suffix in TEXT_SUFFIXES:
                text = blob_text(sha, path)
                if text is not None:
                    for model in models:
                        if model_pattern(model).search(text):
                            mentions[model].append(path)

        for model in models:
            exact_paths = sorted(set(structured.get(model, [])))
            mention_paths = sorted(set(mentions.get(model, [])))
            if exact_paths:
                classification = "same_commit_structured_key"
            elif mention_paths:
                classification = "same_commit_strict_text_mention"
            elif docs:
                classification = "same_commit_documents_only"
            else:
                classification = "git_provenance_only"
            per_model[model] = {
                "exact_structured_key_paths": exact_paths,
                "strict_changed_text_mention_paths": mention_paths,
                "same_commit_document_paths": docs,
                "context_classification": classification,
            }

        version = by_sha[sha]
        group_rows.append({
            "sha": sha,
            "date": version["date"],
            "subject": version["subject"],
            "public_only_models_first_seen_here": sorted(models),
            "changed_file_count": len(files),
            "changed_files": paths,
            "same_commit_added_document_paths": docs,
            "models_with_exact_structured_key_context": sorted(structured),
            "models_with_strict_changed_text_context": sorted(mentions),
        })

    order = {v["sha"]: i for i, v in enumerate(versions)}
    group_rows.sort(key=lambda row: order[row["sha"]])
    counts: defaultdict[str, int] = defaultdict(int)
    for row in per_model.values():
        counts[row["context_classification"]] += 1

    return {
        "same_commit_context_model_count": sum(v for k, v in counts.items() if k != "git_provenance_only"),
        "same_commit_structured_key_model_count": counts["same_commit_structured_key"],
        "same_commit_strict_text_mention_model_count": counts["same_commit_strict_text_mention"],
        "same_commit_documents_only_model_count": counts["same_commit_documents_only"],
        "git_provenance_only_model_count": counts["git_provenance_only"],
        "introduction_bundle_groups": group_rows,
        "models": [{"model": model, **per_model[model]} for model in sorted(per_model)],
        "note": (
            "Same-commit context is traceability evidence only. Exact JSON keys and strict literal mentions show "
            "companion material in the same change; added DOCX/PDF/etc. files are group-level context only. "
            "None of these signals proves any product fact or technical parameter."
        ),
    }


def build_provenance(public_only_models: list[str], runtime_path: str, source_path: str) -> dict[str, Any]:
    targets = sorted({norm_model(model) for model in public_only_models if norm_model(model)})
    versions = runtime_versions(runtime_path)
    source_history = file_history(source_path)
    first_seen: dict[str, dict[str, Any]] = {}
    groups: defaultdict[str, list[str]] = defaultdict(list)

    for idx, version in enumerate(versions, start=1):
        for model in targets:
            if model in version["_models"] and model not in first_seen:
                first_seen[model] = {
                    "sha": version["sha"], "date": version["date"], "subject": version["subject"],
                    "runtime_history_index": idx,
                }
                groups[version["sha"]].append(model)

    unresolved = sorted(set(targets) - set(first_seen))
    initial_sha = versions[0]["sha"]
    intro_rows = []
    by_sha = {v["sha"]: v for v in versions}
    for sha, models in groups.items():
        version = by_sha[sha]
        intro_rows.append({
            "sha": sha, "date": version["date"], "subject": version["subject"],
            "public_only_model_count_first_seen_here": len(models),
            "public_only_models_first_seen_here": sorted(models),
        })
    order = {v["sha"]: i for i, v in enumerate(versions)}
    intro_rows.sort(key=lambda row: order[row["sha"]])

    context = introduction_context(targets, first_seen, versions, runtime_path, source_path)
    ctx_by_model = {row["model"]: row for row in context["models"]}
    initial_models = sorted(m for m, info in first_seen.items() if info["sha"] == initial_sha)
    later_models = sorted(m for m, info in first_seen.items() if info["sha"] != initial_sha)

    return {
        "status": "ok",
        "runtime_data_path": runtime_path,
        "source_data_path": source_path,
        "runtime_history_commit_count": len(versions),
        "source_history_commit_count": len(source_history),
        "runtime_history": [{k: v for k, v in row.items() if k != "_models"} for row in versions],
        "source_history": source_history,
        "public_only_model_count": len(targets),
        "resolved_first_seen_model_count": len(first_seen),
        "unresolved_first_seen_model_count": len(unresolved),
        "unresolved_first_seen_models": unresolved,
        "initial_runtime_commit_sha": initial_sha,
        "initial_runtime_commit_matches_source_initial_commit": initial_sha == source_history[0]["sha"],
        "first_seen_in_initial_runtime_commit_count": len(initial_models),
        "models_first_seen_in_initial_runtime_commit": initial_models,
        "first_seen_after_initial_runtime_commit_count": len(later_models),
        "models_first_seen_after_initial_runtime_commit": later_models,
        "introduction_groups": intro_rows,
        "introduction_context": context,
        "models": [
            {"model": model, **first_seen[model], **ctx_by_model.get(model, {})}
            for model in targets if model in first_seen
        ],
        "note": (
            "Read-only Git history provenance plus conservative same-commit context. This is traceability only, "
            "not proof that model names, product facts, technical parameters, or specification contents are correct."
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", default="data_quality_report.json")
    parser.add_argument("--data-js", default="assets/data.js")
    parser.add_argument("--source", default="products.json")
    args = parser.parse_args()

    report_path = Path(args.report)
    report = json.loads(report_path.read_text(encoding="utf-8"))
    runtime = report.get("public_catalog_runtime")
    if not isinstance(runtime, dict) or not isinstance(runtime.get("public_only_models"), list):
        raise SystemExit("Run audit_public_catalog_runtime.py first; public_only_models is missing")

    provenance = build_provenance(runtime["public_only_models"], args.data_js, args.source)
    report["public_catalog_git_provenance"] = provenance
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    ctx = provenance["introduction_context"]
    print("=== 公开运行目录 Git 来源审计（只读） ===")
    print(f"runtime 独有型号: {provenance['public_only_model_count']}")
    print(f"已定位首次出现提交: {provenance['resolved_first_seen_model_count']}")
    print(f"无法定位首次出现提交: {provenance['unresolved_first_seen_model_count']}")
    print(f"首次出现提交存在伴随上下文: {ctx['same_commit_context_model_count']}")
    print(f"  - 结构化 JSON 精确键: {ctx['same_commit_structured_key_model_count']}")
    print(f"  - 其他文本严格提及: {ctx['same_commit_strict_text_mention_model_count']}")
    print(f"  - 仅同提交文档包: {ctx['same_commit_documents_only_model_count']}")
    print(f"仅 Git 首次出现、无同提交上下文: {ctx['git_provenance_only_model_count']}")
    print(f"Updated report: {report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
