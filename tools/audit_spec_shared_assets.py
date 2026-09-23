#!/usr/bin/env python3
"""Read-only lifecycle audit for externalized specification assets."""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
SHARED_DIR = ROOT / "assets" / "spec-inline-shared"
POLICY = (
    "只读审计；不会修改规格书、共享图片、技术参数、型号含义、价格或产品数据。"
    "缺失引用、孤立共享文件或越界/远程引用会使检查失败；字节重复只报告，不自动删除或合并。"
)
REFERENCE_ATTRS = {"src", "href", "poster", "data-src", "srcset"}


def git_ls_files(prefix: str) -> list[str]:
    """Return Git paths losslessly, including Chinese/non-ASCII filenames."""
    result = subprocess.run(
        ["git", "ls-files", "-z", "--", prefix],
        cwd=ROOT,
        check=True,
        capture_output=True,
    )
    return [
        item.decode("utf-8", errors="surrogateescape")
        for item in result.stdout.split(b"\0")
        if item
    ]


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def repo_rel(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def is_within(path: Path, parent: Path) -> bool:
    try:
        path.resolve().relative_to(parent.resolve())
        return True
    except ValueError:
        return False


def split_srcset(value: str) -> list[str]:
    return [part.strip().split()[0] for part in value.split(",") if part.strip()]


class ReferenceParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.references: list[dict[str, object]] = []

    def capture(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        line, column = self.getpos()
        for attr, value in attrs:
            attr = attr.lower()
            if attr not in REFERENCE_ATTRS or not value:
                continue
            values = split_srcset(value) if attr == "srcset" else [value.strip()]
            for candidate in values:
                if "spec-inline-shared" not in unquote(candidate):
                    continue
                self.references.append(
                    {
                        "tag": tag.lower(),
                        "attribute": attr,
                        "value": candidate,
                        "line": line,
                        "column": column,
                    }
                )

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.capture(tag, attrs)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.capture(tag, attrs)


def resolve_reference(page: Path, value: str) -> tuple[Path | None, str | None]:
    if "\\" in value:
        return None, "backslash_in_url"
    parsed = urlsplit(value)
    if parsed.scheme or parsed.netloc:
        return None, "remote_or_scheme_reference"

    decoded = unquote(parsed.path)
    if not decoded:
        return None, "empty_path"

    if decoded.startswith("/"):
        parts = [part for part in decoded.split("/") if part]
        if parts and parts[0] == "yuhua":
            parts = parts[1:]
        candidate = ROOT.joinpath(*parts)
    else:
        candidate = page.parent / decoded

    resolved = candidate.resolve()
    if not is_within(resolved, ROOT):
        return None, "outside_repository"
    if not is_within(resolved, SHARED_DIR):
        return None, "outside_shared_directory"
    return resolved, None


def audit() -> dict[str, object]:
    spec_paths = [
        path for path in git_ls_files("specs") if path.lower().endswith((".html", ".htm"))
    ]
    shared_paths = git_ls_files("assets/spec-inline-shared")
    shared_set = set(shared_paths)

    references: list[dict[str, object]] = []
    unsafe: list[dict[str, object]] = []
    missing: list[dict[str, object]] = []
    untracked: list[dict[str, object]] = []
    refs_by_target: dict[str, list[dict[str, object]]] = defaultdict(list)

    for spec_rel in spec_paths:
        page = ROOT / spec_rel
        parser = ReferenceParser()
        parser.feed(page.read_text(encoding="utf-8", errors="replace"))
        parser.close()
        for raw in parser.references:
            row = {"page": spec_rel, **raw}
            resolved, reason = resolve_reference(page, str(raw["value"]))
            if reason:
                row["reason"] = reason
                unsafe.append(row)
                continue
            assert resolved is not None
            target = repo_rel(resolved)
            row.update(target=target, exists=resolved.is_file(), tracked=target in shared_set)
            references.append(row)
            refs_by_target[target].append(row)
            if not resolved.is_file():
                missing.append(row)
            elif target not in shared_set:
                untracked.append(row)

    shared_files: list[dict[str, object]] = []
    orphan: list[dict[str, object]] = []
    hashes: dict[str, list[str]] = defaultdict(list)
    for shared_rel in shared_paths:
        path = ROOT / shared_rel
        ref_rows = refs_by_target.get(shared_rel, [])
        exists = path.is_file()
        digest = sha256_file(path) if exists else None
        if digest:
            hashes[digest].append(shared_rel)
        row = {
            "path": shared_rel,
            "bytes": path.stat().st_size if exists else None,
            "sha256": digest,
            "reference_count": len(ref_rows),
            "referenced_by": sorted({str(ref["page"]) for ref in ref_rows}),
            "missing_from_worktree": not exists,
        }
        shared_files.append(row)
        if not ref_rows or not exists:
            orphan.append(row)

    duplicates = [
        {"sha256": digest, "file_count": len(paths), "paths": sorted(paths)}
        for digest, paths in hashes.items()
        if len(paths) > 1
    ]
    duplicates.sort(key=lambda row: (-int(row["file_count"]), str(row["sha256"])))

    ok = not (unsafe or missing or untracked or orphan)
    return {
        "ok": ok,
        "policy": POLICY,
        "git_path_listing_mode": "nul-delimited-utf8-surrogateescape",
        "tracked_spec_html_count": len(spec_paths),
        "shared_directory": "assets/spec-inline-shared",
        "tracked_shared_file_count": len(shared_paths),
        "shared_reference_count": len(references),
        "referenced_shared_target_count": len(refs_by_target),
        "unsafe_reference_count": len(unsafe),
        "missing_reference_count": len(missing),
        "untracked_target_reference_count": len(untracked),
        "orphan_shared_file_count": len(orphan),
        "duplicate_shared_byte_group_count": len(duplicates),
        "references": references,
        "shared_files": shared_files,
        "unsafe_references": unsafe,
        "missing_references": missing,
        "untracked_target_references": untracked,
        "orphan_shared_files": orphan,
        "duplicate_shared_byte_groups": duplicates,
    }


def markdown(report: dict[str, object]) -> str:
    lines = [
        "# Yuhua specification shared-asset lifecycle audit",
        "",
        f"**Status:** {'PASS' if report['ok'] else 'FAIL'}",
        "",
        str(report["policy"]),
        "",
        "## Summary",
        "",
        "| Metric | Count |",
        "| --- | ---: |",
        f"| Tracked specification HTML pages | {report['tracked_spec_html_count']} |",
        f"| Tracked shared files | {report['tracked_shared_file_count']} |",
        f"| Shared-asset references | {report['shared_reference_count']} |",
        f"| Referenced shared targets | {report['referenced_shared_target_count']} |",
        f"| Unsafe references | {report['unsafe_reference_count']} |",
        f"| Missing referenced files | {report['missing_reference_count']} |",
        f"| Referenced but untracked files | {report['untracked_target_reference_count']} |",
        f"| Orphan tracked shared files | {report['orphan_shared_file_count']} |",
        f"| Exact duplicate shared-file byte groups | {report['duplicate_shared_byte_group_count']} |",
        "",
    ]

    shared_files = report["shared_files"]
    if shared_files:
        lines += [
            "## Shared files",
            "",
            "| Path | Bytes | References | Pages | SHA-256 |",
            "| --- | ---: | ---: | --- | --- |",
        ]
        for row in shared_files:
            pages = ", ".join(row["referenced_by"]) or "—"
            size = row["bytes"] if row["bytes"] is not None else "missing"
            digest = (row["sha256"] or "—")[:16]
            lines.append(
                f"| `{row['path']}` | {size} | {row['reference_count']} | {pages} | `{digest}` |"
            )
        lines.append("")

    sections = [
        ("Unsafe references", report["unsafe_references"]),
        ("Missing referenced files", report["missing_references"]),
        ("Referenced but untracked files", report["untracked_target_references"]),
        ("Orphan tracked shared files", report["orphan_shared_files"]),
    ]
    for title, rows in sections:
        if not rows:
            continue
        lines += [f"## {title}", ""]
        for row in rows:
            label = row.get("path") or row.get("target") or row.get("value")
            suffix = f" — page `{row['page']}`" if row.get("page") else ""
            if row.get("reason"):
                suffix += f" — reason `{row['reason']}`"
            lines.append(f"- `{label}`{suffix}")
        lines.append("")

    if report["duplicate_shared_byte_groups"]:
        lines += [
            "## Exact duplicate shared-file bytes (report only)",
            "",
            "Evidence only; this audit does not delete or merge files automatically.",
            "",
        ]
        for row in report["duplicate_shared_byte_groups"]:
            paths = ", ".join(f"`{path}`" for path in row["paths"])
            lines.append(f"- `{row['sha256']}` — {row['file_count']} files: {paths}")
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", default="spec_shared_asset_audit.json")
    parser.add_argument("--markdown", default="spec_shared_asset_audit.md")
    args = parser.parse_args()

    report = audit()
    Path(args.json).write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    Path(args.markdown).write_text(markdown(report), encoding="utf-8")
    print(
        "shared-asset lifecycle audit: "
        f"status={'PASS' if report['ok'] else 'FAIL'}, "
        f"spec_html={report['tracked_spec_html_count']}, "
        f"files={report['tracked_shared_file_count']}, refs={report['shared_reference_count']}, "
        f"orphans={report['orphan_shared_file_count']}, missing={report['missing_reference_count']}, "
        f"unsafe={report['unsafe_reference_count']}"
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
