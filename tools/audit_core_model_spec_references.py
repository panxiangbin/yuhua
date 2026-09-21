#!/usr/bin/env python3
"""Read-only provenance audit for ambiguous core-model specification records.

This audit builds on ``audit_core_model_spec_links.py``. For core model pages that
have multiple exact-model rows in ``specs_index.json``, it records which public
runtime text files reference each candidate page and download path. The evidence
helps distinguish byte-identical source files that still have different published
entry points or reference footprints.

The audit never deletes, merges, rewrites, or chooses a specification record.
Missing text references are evidence only and are not proof that a file is unused.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
from collections import defaultdict
from html import unescape
from pathlib import Path
from urllib.parse import unquote

from audit_core_model_spec_links import (
    MODEL_DIR,
    ROOT,
    SPEC_INDEX,
    ModelPageParser,
    find_product_model,
    fingerprint_relation,
    normalize_model,
    repo_file_fingerprint,
    spec_entry_snapshot,
)

TEXT_EXTS = {".html", ".htm", ".css", ".js", ".mjs", ".json", ".xml"}
EXCLUDED_PREFIXES = (".github/", "tools/")
TAUTOLOGICAL_SOURCES = {"specs_index.json"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json-output", default="core_model_spec_reference_report.json")
    parser.add_argument("--text-scan-mib", type=float, default=5.0)
    return parser.parse_args()


def core_page_models() -> dict[str, dict]:
    result: dict[str, dict] = {}
    for page in sorted(MODEL_DIR.glob("*.html")):
        parser = ModelPageParser()
        parser.feed(page.read_text(encoding="utf-8", errors="ignore"))
        model = ""
        for block in parser.json_ld_blocks:
            if not block:
                continue
            try:
                data = json.loads(block)
            except json.JSONDecodeError:
                continue
            model = find_product_model(data)
            if model:
                break
        if model:
            key = normalize_model(model)
            item = result.setdefault(key, {"model": model, "core_pages": []})
            item["core_pages"].append(page.relative_to(ROOT).as_posix())
    return result


def tracked_public_text_files(max_bytes: int) -> list[str]:
    raw = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT)
    paths: list[str] = []
    for item in raw.split(b"\0"):
        if not item:
            continue
        path = item.decode("utf-8", "surrogateescape").replace("\\", "/")
        if path in TAUTOLOGICAL_SOURCES or path.startswith(EXCLUDED_PREFIXES):
            continue
        if Path(path).suffix.lower() not in TEXT_EXTS:
            continue
        full = ROOT / path
        try:
            if not full.is_file() or full.stat().st_size > max_bytes:
                continue
        except OSError:
            continue
        paths.append(path)
    return paths


def normalized_text(path: str) -> str:
    try:
        text = (ROOT / path).read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return ""
    return unescape(unquote(text)).replace("\\", "/").casefold()


def reference_evidence(targets: list[str], source_paths: list[str]) -> dict[str, dict]:
    normalized_targets = {
        target: unquote(target.replace("\\", "/")).casefold()
        for target in targets
        if target
    }
    basename_targets: dict[str, list[str]] = defaultdict(list)
    for target in normalized_targets:
        basename_targets[os.path.basename(unquote(target)).casefold()].append(target)

    refs = {
        target: {"exact_path_reference_sources": [], "basename_reference_sources": []}
        for target in normalized_targets
    }

    for source in source_paths:
        text = normalized_text(source)
        if not text:
            continue
        source_norm = source.replace("\\", "/")
        source_base = os.path.basename(source_norm).casefold()

        for target, needle in normalized_targets.items():
            if source_norm == target:
                continue
            if needle and needle in text:
                refs[target]["exact_path_reference_sources"].append(source_norm)

        for basename, matching_targets in basename_targets.items():
            if not basename or basename == source_base or basename not in text:
                continue
            for target in matching_targets:
                if source_norm != target:
                    refs[target]["basename_reference_sources"].append(source_norm)

    for item in refs.values():
        exact = sorted(set(item["exact_path_reference_sources"]))
        weak = sorted(set(item["basename_reference_sources"]) - set(exact))
        item["exact_path_reference_sources"] = exact
        item["basename_reference_sources"] = weak
        item["reference_sources"] = sorted(set(exact) | set(weak))
        item["reference_source_count"] = len(item["reference_sources"])
    return refs


def main() -> int:
    args = parse_args()
    specs = json.loads(SPEC_INDEX.read_text(encoding="utf-8"))
    core = core_page_models()

    by_model: dict[str, list[tuple[int, dict]]] = defaultdict(list)
    for row, entry in enumerate(specs, start=1):
        key = normalize_model(entry.get("model", ""))
        if key:
            by_model[key].append((row, entry))

    ambiguous_keys = sorted(key for key in core if len(by_model.get(key, [])) > 1)
    targets: list[str] = []
    for key in ambiguous_keys:
        for _row, entry in by_model[key]:
            for field in ("page", "dl"):
                value = str(entry.get(field, "")).strip().replace("\\", "/")
                if value:
                    targets.append(value)

    source_paths = tracked_public_text_files(int(args.text_scan_mib * 1024 * 1024))
    refs = reference_evidence(sorted(set(targets)), source_paths)

    groups: list[dict] = []
    all_paths_referenced = 0
    partially_referenced = 0
    no_paths_referenced = 0
    identical_download_groups = 0
    identical_download_groups_with_distinct_refs = 0

    for key in ambiguous_keys:
        core_item = core[key]
        candidates = []
        page_fps = []
        download_fps = []
        candidate_path_ref_flags: list[bool] = []
        download_reference_sets: list[tuple[str, ...]] = []

        for row, entry in by_model[key]:
            snapshot = spec_entry_snapshot(entry)
            page_path = str(snapshot.get("page", "")).strip().replace("\\", "/")
            dl_path = str(snapshot.get("dl", "")).strip().replace("\\", "/")
            page_fp = repo_file_fingerprint(page_path)
            dl_fp = repo_file_fingerprint(dl_path)
            page_fps.append(page_fp)
            download_fps.append(dl_fp)

            page_refs = refs.get(page_path, {
                "exact_path_reference_sources": [],
                "basename_reference_sources": [],
                "reference_sources": [],
                "reference_source_count": 0,
            })
            dl_refs = refs.get(dl_path, {
                "exact_path_reference_sources": [],
                "basename_reference_sources": [],
                "reference_sources": [],
                "reference_source_count": 0,
            })
            path_flags = [bool(page_refs["reference_sources"]), bool(dl_refs["reference_sources"])]
            candidate_path_ref_flags.extend(path_flags)
            download_reference_sets.append(tuple(dl_refs["reference_sources"]))

            candidates.append({
                "spec_index_row": row,
                **snapshot,
                "page_fingerprint": page_fp,
                "download_fingerprint": dl_fp,
                "page_reference_evidence": page_refs,
                "download_reference_evidence": dl_refs,
            })

        page_relation = fingerprint_relation(page_fps)
        download_relation = fingerprint_relation(download_fps)
        referenced_count = sum(candidate_path_ref_flags)
        total_path_count = len(candidate_path_ref_flags)
        if referenced_count == total_path_count and total_path_count:
            reference_state = "all-candidate-paths-referenced"
            all_paths_referenced += 1
        elif referenced_count:
            reference_state = "partially-referenced"
            partially_referenced += 1
        else:
            reference_state = "no-text-reference-found"
            no_paths_referenced += 1

        download_refs_equal = len(set(download_reference_sets)) <= 1
        if download_relation == "byte-identical":
            identical_download_groups += 1
            if not download_refs_equal:
                identical_download_groups_with_distinct_refs += 1

        groups.append({
            "model": core_item["model"],
            "core_pages": core_item["core_pages"],
            "candidate_count": len(candidates),
            "page_content_relation": page_relation,
            "download_content_relation": download_relation,
            "reference_state": reference_state,
            "referenced_candidate_path_count": referenced_count,
            "candidate_path_count": total_path_count,
            "download_reference_footprints_equal": download_refs_equal,
            "candidates": candidates,
        })

    summary = {
        "core_model_count": len(core),
        "ambiguous_exact_model_count": len(groups),
        "ambiguous_candidate_record_count": sum(group["candidate_count"] for group in groups),
        "public_text_scan_file_count": len(source_paths),
        "text_scan_max_mib_each": args.text_scan_mib,
        "all_candidate_paths_referenced_group_count": all_paths_referenced,
        "partially_referenced_group_count": partially_referenced,
        "no_text_reference_found_group_count": no_paths_referenced,
        "byte_identical_download_group_count": identical_download_groups,
        "byte_identical_download_groups_with_distinct_reference_footprints": identical_download_groups_with_distinct_refs,
    }

    report = {
        "policy": {
            "mode": "audit_only",
            "read_only": True,
            "auto_fix_count": 0,
            "excluded_reference_sources": sorted(TAUTOLOGICAL_SOURCES) + list(EXCLUDED_PREFIXES),
            "meaning": (
                "Reference evidence scans customer/public runtime text files only. "
                "specs_index.json is excluded because it tautologically contains every candidate path. "
                "Missing references do not prove a file is unused, and byte-identical downloads are not "
                "permission to merge or delete records automatically."
            ),
        },
        "summary": summary,
        "ambiguous_models": groups,
    }
    Path(args.json_output).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
