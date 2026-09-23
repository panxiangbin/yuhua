#!/usr/bin/env python3
"""Guard Base64-image externalization changes in tracked specification HTML.

The check is read-only. If a changed specification page replaces inline
Base64 <img src> values with files under assets/spec-inline-shared/, it
requires the rest of the HTML to remain byte-for-byte unchanged and each
shared file to equal the decoded original payload.
"""

from __future__ import annotations

import argparse
import base64
import binascii
import hashlib
import json
import posixpath
import re
import subprocess
import sys
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit

SHARED_ROOT = "assets/spec-inline-shared/"
IMG_TAG_RE = re.compile(r"<img\b[^>]*>", re.IGNORECASE | re.DOTALL)
SRC_RE = re.compile(r"(\bsrc\s*=\s*)([\"'])(.*?)\2", re.IGNORECASE | re.DOTALL)
DATA_IMAGE_RE = re.compile(
    r"^data:(image/[A-Za-z0-9.+-]+);base64,([A-Za-z0-9+/=\r\n\t ]+)$",
    re.IGNORECASE,
)


class GuardError(RuntimeError):
    pass


def run_git(*args: str, text: bool = True):
    proc = subprocess.run(
        ["git", *args],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=text,
    )
    if proc.returncode != 0:
        stderr = proc.stderr.strip() if text else proc.stderr.decode("utf-8", "replace").strip()
        raise GuardError(f"git {' '.join(args)} failed: {stderr}")
    return proc.stdout


def git_bytes(*args: str) -> bytes:
    proc = subprocess.run(
        ["git", *args],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if proc.returncode != 0:
        raise GuardError(
            f"git {' '.join(args)} failed: "
            + proc.stderr.decode("utf-8", "replace").strip()
        )
    return proc.stdout


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def parse_name_status(base_ref: str) -> list[dict]:
    # Disable Git's default C-style quoting so non-ASCII specification paths
    # (for example specs/反应釜/...) are audited as their real repository paths.
    out = run_git(
        "-c",
        "core.quotepath=false",
        "diff",
        "--name-status",
        "-M",
        f"{base_ref}..HEAD",
        "--",
    )
    rows: list[dict] = []
    for raw in out.splitlines():
        if not raw.strip():
            continue
        parts = raw.split("\t")
        status = parts[0]
        if status.startswith(("R", "C")):
            if len(parts) != 3:
                raise GuardError(f"Unexpected rename/copy diff row: {raw}")
            rows.append({"status": status, "old_path": parts[1], "path": parts[2]})
        else:
            if len(parts) != 2:
                raise GuardError(f"Unexpected diff row: {raw}")
            rows.append({"status": status, "path": parts[1]})
    return rows


def mask_img_src_values(html: str) -> tuple[str, list[str | None]]:
    sources: list[str | None] = []

    def replace_tag(match: re.Match[str]) -> str:
        tag = match.group(0)
        src_match = SRC_RE.search(tag)
        index = len(sources)
        if not src_match:
            sources.append(None)
            return tag
        sources.append(src_match.group(3))
        marker = f"__YUHUA_IMG_SRC_{index}__"
        return tag[: src_match.start(3)] + marker + tag[src_match.end(3) :]

    return IMG_TAG_RE.sub(replace_tag, html), sources


def resolve_shared_target(page_path: str, src: str) -> str | None:
    parsed = urlsplit(src)
    if parsed.scheme or parsed.netloc or parsed.query or parsed.fragment:
        return None
    raw_path = unquote(parsed.path).replace("\\", "/")
    if not raw_path or raw_path.startswith("/"):
        return None
    base_dir = PurePosixPath(page_path).parent.as_posix()
    resolved = posixpath.normpath(posixpath.join(base_dir, raw_path))
    if resolved == "." or resolved.startswith("../") or resolved.startswith("/"):
        return None
    if not resolved.startswith(SHARED_ROOT):
        return None
    return resolved


def decode_data_image(src: str) -> tuple[str, bytes]:
    match = DATA_IMAGE_RE.fullmatch(src)
    if not match:
        raise GuardError("original image src is not a Base64 image data URI")
    mime = match.group(1).lower()
    payload = re.sub(r"\s+", "", match.group(2))
    try:
        decoded = base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise GuardError(f"invalid Base64 image payload: {exc}") from exc
    return mime, decoded


def is_spec_html(path: str) -> bool:
    p = PurePosixPath(path)
    return len(p.parts) >= 2 and p.parts[0] == "specs" and p.suffix.lower() == ".html"


def get_base_text(base_ref: str, path: str) -> str:
    data = git_bytes("show", f"{base_ref}:{path}")
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise GuardError(f"{path}: expected UTF-8 HTML in base revision") from exc


def write_reports(report: dict, json_path: Path, markdown_path: Path) -> None:
    json_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    lines = [
        "# 规格书共享图片外置完整性检查",
        "",
        f"- 基准提交：`{report['base_ref']}`",
        f"- 变更文件数：{report['changed_file_count']}",
        f"- 规格书 HTML 变更数：{report['changed_spec_html_count']}",
        f"- 共享资源目录变更数：{report['changed_shared_asset_count']}",
        f"- 检测到外置规格书页面：{report['externalized_spec_page_count']}",
        f"- 已验证替换次数：{report['verified_replacement_count']}",
        f"- 结果：{'通过' if report['ok'] else '失败'}",
        "",
        "## 策略",
        "",
        report["policy"],
    ]
    if report["pages"]:
        lines += ["", "## 已验证页面", ""]
        for page in report["pages"]:
            lines.append(
                f"- `{page['path']}`：{page['replacement_count']} 处，"
                f"共享目标 {len(page['targets'])} 个"
            )
    if report["errors"]:
        lines += ["", "## 错误", ""]
        lines += [f"- {err}" for err in report["errors"]]
    markdown_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def audit(base_ref: str) -> dict:
    changed = parse_name_status(base_ref)
    changed_spec_rows = [row for row in changed if is_spec_html(row["path"])]
    shared_rows = [
        row
        for row in changed
        if row["path"].startswith(SHARED_ROOT)
        or row.get("old_path", "").startswith(SHARED_ROOT)
    ]

    report = {
        "base_ref": base_ref,
        "head": run_git("rev-parse", "HEAD").strip(),
        "changed_file_count": len(changed),
        "changed_spec_html_count": len(changed_spec_rows),
        "changed_shared_asset_count": len(shared_rows),
        "externalized_spec_page_count": 0,
        "verified_replacement_count": 0,
        "pages": [],
        "shared_assets": [],
        "errors": [],
        "ok": True,
        "policy": (
            "该检查仅验证把既有 Base64 图片 src 外置为 assets/spec-inline-shared/ "
            "共享文件时的字节等价性；不修改规格书、技术参数、型号含义或产品数据。"
        ),
    }

    errors: list[str] = []
    referenced_targets: set[str] = set()

    for row in changed_spec_rows:
        path = row["path"]
        status = row["status"]
        if status.startswith(("A", "D", "R", "C")):
            # New/deleted/renamed specs are not byte-comparable externalization cases.
            continue
        current_path = Path(path)
        if not current_path.exists():
            continue
        try:
            base_html = get_base_text(base_ref, path)
            current_html = current_path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError, GuardError) as exc:
            errors.append(f"{path}: unable to read base/current HTML: {exc}")
            continue

        base_masked, base_sources = mask_img_src_values(base_html)
        current_masked, current_sources = mask_img_src_values(current_html)
        changed_pairs: list[tuple[int, str | None, str | None, str | None]] = []
        for index in range(max(len(base_sources), len(current_sources))):
            old = base_sources[index] if index < len(base_sources) else None
            new = current_sources[index] if index < len(current_sources) else None
            if old != new:
                target = resolve_shared_target(path, new) if new is not None else None
                changed_pairs.append((index, old, new, target))

        # Strict mode is entered only when this page points a changed image src
        # into the shared externalization directory.
        if not any(target is not None for _, _, _, target in changed_pairs):
            continue

        page_errors: list[str] = []
        page_targets: set[str] = set()
        replacements: list[dict] = []

        if base_masked != current_masked:
            page_errors.append(
                "content differs outside <img src> values; externalization must be src-only"
            )
        if len(base_sources) != len(current_sources):
            page_errors.append(
                f"image tag count changed ({len(base_sources)} -> {len(current_sources)})"
            )

        for index, old, new, target in changed_pairs:
            if old is None or new is None:
                page_errors.append(f"image #{index + 1}: src was added or removed")
                continue
            if target is None:
                page_errors.append(
                    f"image #{index + 1}: changed src does not resolve under {SHARED_ROOT}"
                )
                continue
            try:
                mime, decoded = decode_data_image(old)
            except GuardError as exc:
                page_errors.append(f"image #{index + 1}: {exc}")
                continue

            target_path = Path(target)
            if not target_path.is_file():
                page_errors.append(f"image #{index + 1}: shared target missing: {target}")
                continue
            target_bytes = target_path.read_bytes()
            if target_bytes != decoded:
                page_errors.append(
                    f"image #{index + 1}: shared target bytes differ from decoded inline payload: {target}"
                )
                continue

            page_targets.add(target)
            referenced_targets.add(target)
            replacements.append(
                {
                    "image_index": index + 1,
                    "mime": mime,
                    "target": target,
                    "decoded_bytes": len(decoded),
                    "decoded_sha256": sha256_bytes(decoded),
                    "target_sha256": sha256_bytes(target_bytes),
                }
            )

        if page_errors:
            errors.extend(f"{path}: {message}" for message in page_errors)
        else:
            report["externalized_spec_page_count"] += 1
            report["verified_replacement_count"] += len(replacements)
            report["pages"].append(
                {
                    "path": path,
                    "replacement_count": len(replacements),
                    "targets": sorted(page_targets),
                    "replacements": replacements,
                }
            )

    for row in shared_rows:
        status = row["status"]
        path = row["path"]
        if not status.startswith("A"):
            errors.append(
                f"{path}: shared externalization assets may only be added, not modified/deleted/renamed (status {status})"
            )
            continue
        target_path = Path(path)
        if not target_path.is_file():
            errors.append(f"{path}: added shared asset is missing from working tree")
            continue
        asset = {
            "path": path,
            "status": status,
            "bytes": target_path.stat().st_size,
            "sha256": sha256_bytes(target_path.read_bytes()),
            "referenced_by_verified_replacement": path in referenced_targets,
        }
        report["shared_assets"].append(asset)
        if path not in referenced_targets:
            errors.append(
                f"{path}: added shared asset is not referenced by any verified Base64 externalization"
            )

    if shared_rows and report["verified_replacement_count"] == 0:
        errors.append(
            "shared externalization assets changed but no byte-equivalent Base64 -> shared src replacement was verified"
        )

    report["errors"] = errors
    report["ok"] = not errors
    return report


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-ref", default="HEAD^1")
    parser.add_argument("--json", default="spec_externalization_integrity_report.json")
    parser.add_argument("--markdown", default="spec_externalization_integrity_report.md")
    args = parser.parse_args()

    try:
        report = audit(args.base_ref)
    except GuardError as exc:
        report = {
            "base_ref": args.base_ref,
            "head": "",
            "changed_file_count": 0,
            "changed_spec_html_count": 0,
            "changed_shared_asset_count": 0,
            "externalized_spec_page_count": 0,
            "verified_replacement_count": 0,
            "pages": [],
            "shared_assets": [],
            "errors": [str(exc)],
            "ok": False,
            "policy": (
                "该检查仅验证 Base64 图片外置的字节等价性；发生工具或 Git 基准错误时默认失败。"
            ),
        }

    write_reports(report, Path(args.json), Path(args.markdown))
    print(
        "spec externalization integrity: "
        f"pages={report['externalized_spec_page_count']} "
        f"replacements={report['verified_replacement_count']} "
        f"shared_assets={report['changed_shared_asset_count']} "
        f"ok={report['ok']}"
    )
    if report["errors"]:
        for err in report["errors"]:
            print(f"ERROR: {err}", file=sys.stderr)
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
