#!/usr/bin/env python3
"""Fail a pull request only when it adds a very large tracked file.

This guard is intentionally narrow: it does not delete, compress, rename, move, or
rewrite any existing repository asset. Existing large files remain audit-only;
new additions at or above the review threshold must be handled deliberately.
"""

from __future__ import annotations

import argparse
import subprocess

MIB = 1024 * 1024


def run_git_bytes(args: list[str]) -> bytes:
    completed = subprocess.run(
        ["git", *args],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError(
            f"git {' '.join(args)} failed with exit code {completed.returncode}: "
            + completed.stderr.decode("utf-8", errors="replace").strip()
        )
    return completed.stdout


def run_git_text(args: list[str]) -> str:
    return run_git_bytes(args).decode("utf-8", errors="replace").strip()


def added_paths(base_ref: str) -> list[str]:
    raw = run_git_bytes(
        ["diff", "--diff-filter=A", "--name-only", "-z", base_ref, "HEAD"]
    )
    return [
        item.decode("utf-8", errors="replace")
        for item in raw.split(b"\0")
        if item
    ]


def blob_size(path: str) -> int | None:
    """Return the size of a HEAD blob, or None for non-blob entries."""
    object_type = run_git_text(["cat-file", "-t", f"HEAD:{path}"])
    if object_type != "blob":
        return None
    return int(run_git_text(["cat-file", "-s", f"HEAD:{path}"]))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base-ref",
        required=True,
        help="Exact base commit/ref used to identify files newly added by the PR.",
    )
    parser.add_argument(
        "--max-mib",
        type=float,
        default=50.0,
        help="Review threshold in MiB; additions at or above it fail (default: 50).",
    )
    args = parser.parse_args()

    if args.max_mib <= 0:
        parser.error("--max-mib must be greater than zero")

    threshold_bytes = int(args.max_mib * MIB)
    additions = added_paths(args.base_ref)
    measured: list[tuple[str, int]] = []
    skipped: list[str] = []

    for path in additions:
        size = blob_size(path)
        if size is None:
            skipped.append(path)
            continue
        measured.append((path, size))

    offenders = [
        (path, size)
        for path, size in measured
        if size >= threshold_bytes
    ]
    offenders.sort(key=lambda item: (-item[1], item[0].lower()))

    print(
        "Large-asset addition guard: "
        f"{len(additions)} newly added tracked paths, "
        f"{len(measured)} blobs measured, threshold {args.max_mib:g} MiB."
    )

    if skipped:
        print(f"Skipped {len(skipped)} non-blob additions.")

    if not offenders:
        print("PASS: no newly added tracked blob reaches the review threshold.")
        return 0

    print(
        "FAIL: newly added very large files require explicit review before merge. "
        "Existing large files are not affected by this guard."
    )
    for path, size in offenders:
        print(f"  {size / MIB:9.2f} MiB  {path}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
