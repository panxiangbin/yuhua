#!/usr/bin/env python3
"""Fail a pull request when a changed tracked blob newly crosses the size limit.

This guard is intentionally narrow: it does not delete, compress, rename, move, or
rewrite any repository asset. Existing large files remain audit-only. It blocks a
new file at or above the review threshold, or an existing file that grows to or
further above that threshold. Size reductions are always allowed.
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


def changed_paths(base_ref: str, diff_filter: str) -> list[str]:
    raw = run_git_bytes(
        ["diff", f"--diff-filter={diff_filter}", "--name-only", "-z", base_ref, "HEAD"]
    )
    return [
        item.decode("utf-8", errors="replace")
        for item in raw.split(b"\0")
        if item
    ]


def blob_size(ref: str, path: str) -> int | None:
    """Return the size of a blob at ref, or None when the path is not a blob."""
    completed = subprocess.run(
        ["git", "cat-file", "-s", f"{ref}:{path}"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if completed.returncode != 0:
        return None
    try:
        return int(completed.stdout.decode("utf-8", errors="replace").strip())
    except ValueError:
        return None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base-ref",
        required=True,
        help="Exact base commit/ref used to compare added and modified tracked blobs.",
    )
    parser.add_argument(
        "--max-mib",
        type=float,
        default=50.0,
        help=(
            "Review threshold in MiB; new files at/above it and existing files "
            "that grow at/further above it fail (default: 50)."
        ),
    )
    args = parser.parse_args()

    if args.max_mib <= 0:
        parser.error("--max-mib must be greater than zero")

    threshold_bytes = int(args.max_mib * MIB)
    added = changed_paths(args.base_ref, "A")
    modified = changed_paths(args.base_ref, "M")

    measured_added: list[tuple[str, int]] = []
    measured_modified: list[tuple[str, int, int]] = []
    skipped: list[str] = []

    for path in added:
        head_size = blob_size("HEAD", path)
        if head_size is None:
            skipped.append(path)
            continue
        measured_added.append((path, head_size))

    for path in modified:
        base_size = blob_size(args.base_ref, path)
        head_size = blob_size("HEAD", path)
        if base_size is None or head_size is None:
            skipped.append(path)
            continue
        measured_modified.append((path, base_size, head_size))

    offenders: list[tuple[str, int, int | None]] = []
    for path, head_size in measured_added:
        if head_size >= threshold_bytes:
            offenders.append((path, head_size, None))
    for path, base_size, head_size in measured_modified:
        if head_size >= threshold_bytes and head_size > base_size:
            offenders.append((path, head_size, base_size))

    offenders.sort(key=lambda item: (-item[1], item[0].lower()))

    print(
        "Large-asset growth guard: "
        f"{len(added)} added paths, {len(modified)} modified paths, "
        f"threshold {args.max_mib:g} MiB."
    )

    if skipped:
        print(f"Skipped {len(skipped)} changed paths that could not be measured as blobs.")

    if not offenders:
        print(
            "PASS: no new file reaches the review threshold and no existing file "
            "grows at or above it."
        )
        return 0

    print(
        "FAIL: new or enlarged very large files require explicit review before merge. "
        "Unchanged legacy files and size reductions are not affected by this guard."
    )
    for path, head_size, base_size in offenders:
        if base_size is None:
            detail = "new file"
        else:
            delta = head_size - base_size
            detail = (
                f"was {base_size / MIB:.2f} MiB, "
                f"grew by {delta / MIB:.2f} MiB"
            )
        print(f"  {head_size / MIB:9.2f} MiB  {path}  ({detail})")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
