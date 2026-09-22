#!/usr/bin/env python3
"""Append read-only Git provenance for customer-facing runtime-only models.

This audit answers a narrow question: when did a model that exists in the
customer-facing ``assets/data.js`` payload, but not in ``products.json``, first
appear in the checked-in runtime catalog history?

Git provenance is not product-fact evidence. A model being present in an old
commit does not prove that the model, parameters, naming, or specification is
correct. The result is therefore reporting-only and must never trigger an
automatic product-data repair, deletion, merge, or rename.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
from collections import defaultdict
from pathlib import Path
from typing import Any


def clean(value: Any) -> str:
    return str(value or "").strip()


def norm_model(value: Any) -> str:
    return re.sub(r"\s+", "", clean(value).upper())


def run_git(*args: str) -> str:
    proc = subprocess.run(
        ["git", *args],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        encoding="utf-8",
        errors="replace",
    )
    if proc.returncode != 0:
        raise SystemExit(
            "git command failed: git "
            + " ".join(args)
            + "\n"
            + proc.stderr.strip()
        )
    return proc.stdout


def parse_window_array(text: str, variable: str, origin: str) -> list[dict[str, Any]]:
    marker = f"window.{variable}="
    pos = text.find(marker)
    if pos < 0:
        marker = f"window.{variable} ="
        pos = text.find(marker)
    if pos < 0:
        raise SystemExit(f"Could not find window.{variable} in {origin}")

    payload = text[pos + len(marker):].lstrip()
    try:
        value, _ = json.JSONDecoder().raw_decode(payload)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Could not parse window.{variable} from {origin}: {exc}") from exc
    if not isinstance(value, list) or any(not isinstance(item, dict) for item in value):
        raise SystemExit(f"window.{variable} in {origin} must be an array of objects")
    return value


def model_set_from_runtime_text(text: str, origin: str) -> set[str]:
    rows = parse_window_array(text, "PRODUCTS", origin)
    return {norm_model(row.get("型号")) for row in rows if norm_model(row.get("型号"))}


def git_file_history(path: str) -> list[dict[str, str]]:
    raw = run_git(
        "log",
        "--follow",
        "--reverse",
        "--format=%H%x1f%aI%x1f%s",
        "--",
        path,
    )
    entries: list[dict[str, str]] = []
    for line in raw.splitlines():
        if not line.strip():
            continue
        parts = line.split("\x1f", 2)
        if len(parts) != 3:
            raise SystemExit(f"Unexpected git log line for {path}: {line!r}")
        sha, date, subject = parts
        entries.append({"sha": sha, "date": date, "subject": subject})
    if not entries:
        raise SystemExit(f"No git history found for {path}")
    return entries


def runtime_versions(path: str) -> list[dict[str, Any]]:
    versions: list[dict[str, Any]] = []
    previous_models: set[str] = set()
    for item in git_file_history(path):
        sha = item["sha"]
        text = run_git("show", f"{sha}:{path}")
        models = model_set_from_runtime_text(text, f"{sha}:{path}")
        versions.append(
            {
                **item,
                "model_count": len(models),
                "added_model_count_vs_previous_runtime_version": len(models - previous_models),
                "removed_model_count_vs_previous_runtime_version": len(previous_models - models),
                "_models": models,
            }
        )
        previous_models = models
    return versions


def compact_history(entries: list[dict[str, str]]) -> list[dict[str, str]]:
    return [
        {"sha": item["sha"], "date": item["date"], "subject": item["subject"]}
        for item in entries
    ]


def build_provenance(
    public_only_models: list[str],
    data_js_path: str,
    source_path: str,
) -> dict[str, Any]:
    targets = sorted({norm_model(model) for model in public_only_models if norm_model(model)})
    versions = runtime_versions(data_js_path)
    source_history = git_file_history(source_path)

    first_seen: dict[str, dict[str, Any]] = {}
    introduction_groups: defaultdict[str, list[str]] = defaultdict(list)

    for version_index, version in enumerate(versions, start=1):
        models = version["_models"]
        for model in targets:
            if model in models and model not in first_seen:
                first_seen[model] = {
                    "sha": version["sha"],
                    "date": version["date"],
                    "subject": version["subject"],
                    "runtime_history_index": version_index,
                }
                introduction_groups[version["sha"]].append(model)

    unresolved = sorted(set(targets) - set(first_seen))
    initial_sha = versions[0]["sha"]
    initial_models = sorted(model for model, info in first_seen.items() if info["sha"] == initial_sha)
    later_models = sorted(model for model, info in first_seen.items() if info["sha"] != initial_sha)

    group_rows: list[dict[str, Any]] = []
    by_sha = {version["sha"]: version for version in versions}
    for sha, models in introduction_groups.items():
        version = by_sha[sha]
        group_rows.append(
            {
                "sha": sha,
                "date": version["date"],
                "subject": version["subject"],
                "public_only_model_count_first_seen_here": len(models),
                "public_only_models_first_seen_here": sorted(models),
            }
        )
    group_rows.sort(key=lambda item: next(i for i, v in enumerate(versions) if v["sha"] == item["sha"]))

    model_rows = [
        {"model": model, **first_seen[model]}
        for model in targets
        if model in first_seen
    ]

    runtime_history_rows = []
    for version in versions:
        runtime_history_rows.append(
            {
                key: value
                for key, value in version.items()
                if key != "_models"
            }
        )

    return {
        "status": "ok",
        "runtime_data_path": data_js_path,
        "source_data_path": source_path,
        "runtime_history_commit_count": len(versions),
        "source_history_commit_count": len(source_history),
        "runtime_history": runtime_history_rows,
        "source_history": compact_history(source_history),
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
        "introduction_groups": group_rows,
        "models": model_rows,
        "note": (
            "Read-only Git history provenance for runtime-only model strings. First-seen commit history only shows "
            "when a model string entered the checked-in customer-facing runtime catalog. It is not evidence that "
            "the model, technical parameters, product naming, or specification content is correct, and it must "
            "not be used for automatic repair, deletion, renaming, or merging."
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
    if not isinstance(report, dict):
        raise SystemExit(f"{report_path} must contain a JSON object")

    runtime = report.get("public_catalog_runtime")
    if not isinstance(runtime, dict):
        raise SystemExit("public_catalog_runtime audit is missing; run audit_public_catalog_runtime.py first")
    public_only_models = runtime.get("public_only_models")
    if not isinstance(public_only_models, list):
        raise SystemExit("public_catalog_runtime.public_only_models must be a list")

    provenance = build_provenance(public_only_models, args.data_js, args.source)
    report["public_catalog_git_provenance"] = provenance
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print("=== 公开运行目录 Git 来源审计（只读） ===")
    print(f"assets/data.js 历史提交数: {provenance['runtime_history_commit_count']}")
    print(f"products.json 历史提交数: {provenance['source_history_commit_count']}")
    print(f"runtime 独有型号: {provenance['public_only_model_count']}")
    print(f"已定位首次出现提交: {provenance['resolved_first_seen_model_count']}")
    print(f"无法定位首次出现提交: {provenance['unresolved_first_seen_model_count']}")
    print(
        "其中自 assets/data.js 最初提交即存在: "
        f"{provenance['first_seen_in_initial_runtime_commit_count']}"
    )
    print(
        "其中在后续 assets/data.js 提交首次出现: "
        f"{provenance['first_seen_after_initial_runtime_commit_count']}"
    )
    print(f"Updated report: {report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
