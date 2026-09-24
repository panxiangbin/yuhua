#!/usr/bin/env python3
"""Read-only Git provenance audit for conflicting literal product models.

This audit answers a narrow provenance question: when did the currently conflicting
literal rows in ``products.json`` first coexist in that source file? Git history is
used only to trace source-edit history. It never establishes which technical value is
correct and never authorizes automatic product-data changes.

Model identity deliberately matches the existing conflict audits: trim outer
whitespace and compare case-insensitively only. Internal whitespace, punctuation,
slashes, hyphens, suffixes, and extensions remain significant.
"""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path
from typing import Any

from audit_conflicting_model_evidence_trace import (
    clean_text,
    conflicting_fields,
    discover_conflicting_models,
    literal_key,
)

PRODUCTS_PATH = "products.json"


def git_text(root: Path, *args: str) -> str:
    proc = subprocess.run(
        ["git", *args],
        cwd=root,
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or f"git {' '.join(args)} failed")
    return proc.stdout


def products_commits(root: Path) -> list[dict[str, str]]:
    text = git_text(
        root,
        "log",
        "--follow",
        "--reverse",
        "--format=%H%x1f%cI%x1f%s",
        "--",
        PRODUCTS_PATH,
    )
    commits: list[dict[str, str]] = []
    for raw_line in text.splitlines():
        if not raw_line.strip():
            continue
        parts = raw_line.split("\x1f", 2)
        if len(parts) != 3:
            raise ValueError(f"unexpected git log line: {raw_line!r}")
        commits.append({"sha": parts[0], "date": parts[1], "subject": parts[2]})
    if not commits:
        raise ValueError(f"no Git history found for {PRODUCTS_PATH}")
    return commits


def products_at_revision(root: Path, sha: str) -> list[dict[str, Any]]:
    payload = git_text(root, "show", f"{sha}:{PRODUCTS_PATH}")
    rows = json.loads(payload)
    if not isinstance(rows, list) or not all(isinstance(row, dict) for row in rows):
        raise ValueError(f"{sha}:{PRODUCTS_PATH} is not a JSON array of objects")
    return rows


def exact_rows(products: list[dict[str, Any]], target_model: str) -> list[dict[str, Any]]:
    target = literal_key(target_model)
    return [row for row in products if literal_key(row.get("型号")) == target]


def current_conflict_signature(rows: list[dict[str, Any]]) -> dict[str, list[str]]:
    return conflicting_fields(rows)


def snapshot_entry(
    commit: dict[str, str],
    products: list[dict[str, Any]],
    target_model: str,
    current_conflicts: dict[str, list[str]],
) -> dict[str, Any] | None:
    rows = exact_rows(products, target_model)
    if not rows:
        return None
    conflicts = conflicting_fields(rows)
    current_signature_present = bool(current_conflicts) and all(
        conflicts.get(field) == values for field, values in current_conflicts.items()
    )
    return {
        "sha": commit["sha"],
        "date": commit["date"],
        "subject": commit["subject"],
        "exact_row_count": len(rows),
        "conflicting_nonempty_values": conflicts,
        "current_conflict_signature_present": current_signature_present,
    }


def analyze_snapshots(
    target_model: str,
    current_products: list[dict[str, Any]],
    snapshots: list[tuple[dict[str, str], list[dict[str, Any]]]],
) -> dict[str, Any]:
    current_rows = exact_rows(current_products, target_model)
    current_conflicts = current_conflict_signature(current_rows)
    if not current_rows:
        raise ValueError(f"model not present in current products.json: {target_model}")
    if not current_conflicts:
        raise ValueError(f"model has no current non-empty source conflict: {target_model}")

    history = [
        entry
        for commit, products in snapshots
        if (entry := snapshot_entry(commit, products, target_model, current_conflicts)) is not None
    ]
    if not history:
        raise ValueError(f"model never appears in products.json history: {target_model}")

    first_seen = history[0]
    first_conflict = next(
        (entry for entry in history if entry["conflicting_nonempty_values"]),
        None,
    )
    first_current_signature = next(
        (entry for entry in history if entry["current_conflict_signature_present"]),
        None,
    )

    return {
        "target_model": target_model,
        "policy": {
            "literal_model_identity": "trim outer whitespace + case-insensitive only; preserve internal whitespace and punctuation",
            "git_evidence_scope": "source-edit provenance only; Git history does not validate technical correctness",
            "conflict_resolution": "review-only; no historical or current row is preferred, merged, deleted, or overwritten",
            "automatic_fix_authorized": False,
        },
        "summary": {
            "current_exact_row_count": len(current_rows),
            "current_conflict_field_count": len(current_conflicts),
            "current_conflict_fields": sorted(current_conflicts),
            "model_revision_count": len(history),
            "first_seen_commit": first_seen["sha"],
            "first_conflict_commit": first_conflict["sha"] if first_conflict else "",
            "first_current_signature_commit": first_current_signature["sha"] if first_current_signature else "",
            "conflicting_from_first_model_revision": bool(first_conflict and first_conflict["sha"] == first_seen["sha"]),
            "current_conflict_signature_present_from_first_model_revision": first_seen["current_conflict_signature_present"],
            "later_conflict_introduction": bool(first_conflict and first_conflict["sha"] != first_seen["sha"]),
            "automatic_fix_authorized": False,
        },
        "current_conflicting_nonempty_values": current_conflicts,
        "history": history,
        "review_notes": [
            "A conflict present in the earliest model revision is evidence about import/edit provenance, not proof that either value is correct.",
            "Commit timing must not be used to prefer an older or newer technical value without an independent reliable product source.",
            "No model punctuation, internal whitespace, suffix, extension, or family wording is normalized into equivalence.",
        ],
    }


def load_history_snapshots(root: Path) -> tuple[list[dict[str, str]], list[tuple[dict[str, str], list[dict[str, Any]]]]]:
    commits = products_commits(root)
    snapshots: list[tuple[dict[str, str], list[dict[str, Any]]]] = []
    for commit in commits:
        snapshots.append((commit, products_at_revision(root, commit["sha"])))
    return commits, snapshots


def audit_model(
    root: Path,
    target_model: str,
    *,
    current_products: list[dict[str, Any]] | None = None,
    commits: list[dict[str, str]] | None = None,
    snapshots: list[tuple[dict[str, str], list[dict[str, Any]]]] | None = None,
) -> dict[str, Any]:
    if current_products is None:
        current_products = json.loads((root / PRODUCTS_PATH).read_text(encoding="utf-8"))
    if commits is None or snapshots is None:
        commits, snapshots = load_history_snapshots(root)
    report = analyze_snapshots(target_model, current_products, snapshots)
    report["summary"]["products_json_history_commit_count"] = len(commits)
    return report


def audit_all_conflicts(root: Path) -> dict[str, Any]:
    current_products = json.loads((root / PRODUCTS_PATH).read_text(encoding="utf-8"))
    if not isinstance(current_products, list) or not all(isinstance(row, dict) for row in current_products):
        raise ValueError("products.json must contain a JSON array of objects")

    commits, snapshots = load_history_snapshots(root)
    models = discover_conflicting_models(current_products)
    reports = [
        audit_model(
            root,
            model,
            current_products=current_products,
            commits=commits,
            snapshots=snapshots,
        )
        for model in models
    ]

    return {
        "policy": {
            "selection_scope": "all current literal duplicate source models with multiple distinct non-empty values",
            "git_evidence_scope": "products.json source-edit provenance only; not product-fact validation",
            "automatic_fix_authorized": False,
        },
        "summary": {
            "source_product_count": len(current_products),
            "products_json_history_commit_count": len(commits),
            "conflicting_model_count": len(models),
            "traced_model_count": len(reports),
            "models_conflicting_from_first_model_revision": sum(
                1 for report in reports if report["summary"]["conflicting_from_first_model_revision"]
            ),
            "models_with_later_conflict_introduction": sum(
                1 for report in reports if report["summary"]["later_conflict_introduction"]
            ),
            "models_with_current_signature_from_first_model_revision": sum(
                1
                for report in reports
                if report["summary"]["current_conflict_signature_present_from_first_model_revision"]
            ),
            "automatic_fix_authorized": False,
        },
        "target_models": models,
        "models": reports,
        "review_notes": [
            "The model queue is discovered from current source conflicts each run; it is not hard-coded.",
            "Git provenance can show whether a conflict was imported together or introduced later, but cannot determine the correct technical value.",
            "Any deterministic fact repair still requires an independent reliable existing product source.",
        ],
    }


def self_test() -> None:
    assert literal_key(" YRE-2012 ") == literal_key("yre-2012")
    assert literal_key("DLSB-5/30") != literal_key("DLSB-5-30")

    c1 = {"sha": "a" * 40, "date": "2026-01-01T00:00:00Z", "subject": "initial"}
    c2 = {"sha": "b" * 40, "date": "2026-01-02T00:00:00Z", "subject": "update"}

    imported_conflict = [
        {"型号": "X-1", "电源": "200V"},
        {"型号": "X-1", "电源": "220V"},
    ]
    report = analyze_snapshots("X-1", imported_conflict, [(c1, imported_conflict), (c2, imported_conflict)])
    assert report["summary"]["conflicting_from_first_model_revision"] is True
    assert report["summary"]["later_conflict_introduction"] is False
    assert report["summary"]["current_conflict_signature_present_from_first_model_revision"] is True

    initial_single = [{"型号": "X-1", "电源": "200V"}]
    report = analyze_snapshots("X-1", imported_conflict, [(c1, initial_single), (c2, imported_conflict)])
    assert report["summary"]["conflicting_from_first_model_revision"] is False
    assert report["summary"]["later_conflict_introduction"] is True
    assert report["summary"]["first_conflict_commit"] == c2["sha"]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    selection = parser.add_mutually_exclusive_group()
    selection.add_argument("--model")
    selection.add_argument("--all-conflicts", action="store_true")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        print("self-test: ok")
        return

    root = args.root.resolve()
    report = audit_all_conflicts(root) if args.all_conflicts else audit_model(root, args.model or "YRE-2012")
    rendered = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
    else:
        print(rendered, end="")


if __name__ == "__main__":
    main()
