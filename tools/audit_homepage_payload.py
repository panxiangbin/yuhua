#!/usr/bin/env python3
"""Read-only audit for static resources referenced directly by the homepage.

The report uses repository bytes only. Gzip values are deterministic local estimates
(compresslevel=9, mtime=0), not claims about GitHub Pages' actual wire encoding.
No product/specification data or site files are modified.
"""

from __future__ import annotations

import argparse
import gzip
import json
from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit


SKIP_SCHEMES = {"data", "mailto", "tel", "javascript"}


class HomepageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.references: list[dict[str, object]] = []

    @staticmethod
    def _attrs(attrs: list[tuple[str, str | None]]) -> dict[str, str]:
        return {key.lower(): (value or "") for key, value in attrs}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        a = self._attrs(attrs)
        if tag == "script" and a.get("src"):
            self.references.append(
                {
                    "tag": tag,
                    "attribute": "src",
                    "url": a["src"],
                    "kind": "script",
                    "async": "async" in a,
                    "defer": "defer" in a,
                    "module": a.get("type", "").strip().lower() == "module",
                }
            )
            return

        if tag == "link" and a.get("href"):
            rel_tokens = {token.lower() for token in a.get("rel", "").split() if token}
            if "stylesheet" in rel_tokens:
                self.references.append(
                    {
                        "tag": tag,
                        "attribute": "href",
                        "url": a["href"],
                        "kind": "stylesheet",
                        "rel": sorted(rel_tokens),
                    }
                )
            elif rel_tokens.intersection({"preload", "modulepreload"}):
                self.references.append(
                    {
                        "tag": tag,
                        "attribute": "href",
                        "url": a["href"],
                        "kind": "preload",
                        "as": a.get("as", ""),
                        "rel": sorted(rel_tokens),
                    }
                )
            elif rel_tokens.intersection({"icon", "shortcut", "apple-touch-icon"}):
                self.references.append(
                    {
                        "tag": tag,
                        "attribute": "href",
                        "url": a["href"],
                        "kind": "icon",
                        "rel": sorted(rel_tokens),
                    }
                )
            return

        if tag == "img" and a.get("src"):
            self.references.append(
                {
                    "tag": tag,
                    "attribute": "src",
                    "url": a["src"],
                    "kind": "image",
                    "loading": a.get("loading", "auto").strip().lower() or "auto",
                }
            )
            return

        if tag == "source" and a.get("src"):
            self.references.append(
                {
                    "tag": tag,
                    "attribute": "src",
                    "url": a["src"],
                    "kind": "media_source",
                }
            )
            return

        if tag in {"video", "audio"}:
            if a.get("src"):
                self.references.append(
                    {
                        "tag": tag,
                        "attribute": "src",
                        "url": a["src"],
                        "kind": "media",
                        "preload": a.get("preload", "auto").strip().lower() or "auto",
                    }
                )
            if tag == "video" and a.get("poster"):
                self.references.append(
                    {
                        "tag": tag,
                        "attribute": "poster",
                        "url": a["poster"],
                        "kind": "video_poster",
                    }
                )


def gzip_size(data: bytes) -> int:
    return len(gzip.compress(data, compresslevel=9, mtime=0))


def resolve_local_url(raw_url: str, html_path: Path, repo_root: Path) -> tuple[str, str | None]:
    """Return (scope, relative_path).

    scope is one of local/external/fragment/skipped/invalid. Local paths are resolved
    inside repo_root. GitHub Pages project-root URLs beginning with /yuhua/ are mapped
    back to the repository root for this repository-side audit.
    """
    value = raw_url.strip()
    if not value:
        return "invalid", None
    if value.startswith("#"):
        return "fragment", None

    parsed = urlsplit(value)
    if parsed.scheme.lower() in SKIP_SCHEMES:
        return "skipped", None
    if parsed.scheme or parsed.netloc:
        return "external", None

    decoded = unquote(parsed.path)
    if not decoded:
        return "fragment", None

    if decoded.startswith("/yuhua/"):
        candidate = PurePosixPath(decoded[len("/yuhua/") :])
    elif decoded.startswith("/"):
        candidate = PurePosixPath(decoded.lstrip("/"))
    else:
        base = PurePosixPath(html_path.parent.as_posix())
        candidate = base / PurePosixPath(decoded)

    parts: list[str] = []
    for part in candidate.parts:
        if part in {"", "."}:
            continue
        if part == "..":
            if not parts:
                return "invalid", None
            parts.pop()
        else:
            parts.append(part)

    relative = PurePosixPath(*parts).as_posix()
    if not relative:
        return "invalid", None
    path = repo_root / relative
    try:
        path.resolve().relative_to(repo_root.resolve())
    except ValueError:
        return "invalid", None
    return "local", relative


def format_bytes(value: int) -> str:
    units = ["B", "KiB", "MiB", "GiB"]
    amount = float(value)
    for unit in units:
        if amount < 1024 or unit == units[-1]:
            if unit == "B":
                return f"{int(amount)} {unit}"
            return f"{amount:.2f} {unit}"
        amount /= 1024
    return f"{value} B"


def audit(html_path: Path, repo_root: Path) -> dict[str, object]:
    html_path = html_path.resolve().relative_to(repo_root.resolve())
    html_file = repo_root / html_path
    html_bytes = html_file.read_bytes()
    html_text = html_bytes.decode("utf-8")

    parser = HomepageParser()
    parser.feed(html_text)

    classified: list[dict[str, object]] = []
    local_by_path: dict[str, dict[str, object]] = {}
    missing: list[dict[str, object]] = []

    for ref in parser.references:
        scope, relative = resolve_local_url(str(ref["url"]), html_path, repo_root)
        row = dict(ref)
        row["scope"] = scope
        row["resolved_path"] = relative
        classified.append(row)
        if scope != "local" or relative is None:
            continue

        file_path = repo_root / relative
        if not file_path.is_file():
            missing.append(row)
            continue

        entry = local_by_path.setdefault(
            relative,
            {
                "path": relative,
                "references": [],
            },
        )
        entry["references"].append(
            {
                "kind": ref["kind"],
                "tag": ref["tag"],
                "attribute": ref["attribute"],
                "url": ref["url"],
            }
        )

    resources: list[dict[str, object]] = []
    for relative, entry in local_by_path.items():
        data = (repo_root / relative).read_bytes()
        raw = len(data)
        gz = gzip_size(data)
        kinds = sorted({str(ref["kind"]) for ref in entry["references"]})
        resources.append(
            {
                "path": relative,
                "kinds": kinds,
                "reference_count": len(entry["references"]),
                "raw_bytes": raw,
                "gzip_estimate_bytes": gz,
                "gzip_ratio": round(gz / raw, 6) if raw else 0.0,
                "references": entry["references"],
            }
        )
    resources.sort(key=lambda row: (-int(row["raw_bytes"]), str(row["path"])))

    by_kind: dict[str, dict[str, int]] = defaultdict(lambda: {"file_count": 0, "raw_bytes": 0, "gzip_estimate_bytes": 0})
    for row in resources:
        primary = str(row["kinds"][0]) if row["kinds"] else "unknown"
        bucket = by_kind[primary]
        bucket["file_count"] += 1
        bucket["raw_bytes"] += int(row["raw_bytes"])
        bucket["gzip_estimate_bytes"] += int(row["gzip_estimate_bytes"])

    dependency_raw = sum(int(row["raw_bytes"]) for row in resources)
    dependency_gzip = sum(int(row["gzip_estimate_bytes"]) for row in resources)
    html_gzip = gzip_size(html_bytes)

    scope_counts: dict[str, int] = defaultdict(int)
    for row in classified:
        scope_counts[str(row["scope"])] += 1

    return {
        "policy": (
            "只读首页资源负载审计：只解析 index.html 直接引用并读取仓库现有字节；"
            "不会修改产品、规格书、参数、型号、价格或任何公开页面。gzip 为本地确定性压缩估算，"
            "不代表 GitHub Pages 实际 Content-Encoding 或真实网络传输字节。"
        ),
        "html": {
            "path": html_path.as_posix(),
            "raw_bytes": len(html_bytes),
            "gzip_estimate_bytes": html_gzip,
        },
        "reference_count": len(classified),
        "reference_scope_counts": dict(sorted(scope_counts.items())),
        "unique_local_dependency_count": len(resources),
        "missing_local_reference_count": len(missing),
        "missing_local_references": missing,
        "dependency_totals": {
            "raw_bytes": dependency_raw,
            "gzip_estimate_bytes": dependency_gzip,
        },
        "document_plus_dependency_totals": {
            "raw_bytes": len(html_bytes) + dependency_raw,
            "gzip_estimate_bytes": html_gzip + dependency_gzip,
        },
        "by_primary_kind": dict(sorted(by_kind.items())),
        "largest_direct_dependencies": resources,
        "references": classified,
        "notes": [
            "同一路径被多次直接引用时仅计一次字节，避免把浏览器可复用缓存误算成重复传输。",
            "动态 JavaScript 后续请求、CSS url()/@import、用户交互后资源和第三方资源不计入本报告。",
            "image/media 是否进入首屏网络请求取决于浏览器、viewport 与 loading/preload；本报告只称其为 HTML 直接引用。",
            "该报告用于排序优化机会，不设任意体积阈值，也不会自动拆包、延迟加载或删除资源。",
        ],
    }


def markdown(report: dict[str, object]) -> str:
    html = report["html"]
    deps = report["dependency_totals"]
    total = report["document_plus_dependency_totals"]
    resources = report["largest_direct_dependencies"]
    lines = [
        "# 予华网站首页直接静态负载审计",
        "",
        "> 只读审计。gzip 数值是仓库字节的确定性估算，不代表 GitHub Pages 实际网络传输。",
        "",
        "## 汇总",
        "",
        f"- HTML：`{html['path']}` — 原始 {format_bytes(int(html['raw_bytes']))}；gzip 估算 {format_bytes(int(html['gzip_estimate_bytes']))}",
        f"- HTML 直接引用：{report['reference_count']} 处；本地唯一依赖 {report['unique_local_dependency_count']} 个",
        f"- 本地直接依赖合计：原始 {format_bytes(int(deps['raw_bytes']))}；gzip 估算 {format_bytes(int(deps['gzip_estimate_bytes']))}",
        f"- 文档 + 本地直接依赖：原始 {format_bytes(int(total['raw_bytes']))}；gzip 估算 {format_bytes(int(total['gzip_estimate_bytes']))}",
        f"- 缺失的本地直接引用：{report['missing_local_reference_count']} 个",
        "",
        "## 体积贡献排序",
        "",
        "| 文件 | 类型 | 原始体积 | gzip 估算 | 占本地直接依赖原始体积 |",
        "|---|---|---:|---:|---:|",
    ]
    dep_raw = max(1, int(deps["raw_bytes"]))
    for row in resources:
        share = int(row["raw_bytes"]) / dep_raw * 100
        kinds = ", ".join(row["kinds"])
        path = str(row["path"]).replace("|", "\\|")
        lines.append(
            f"| `{path}` | {kinds} | {format_bytes(int(row['raw_bytes']))} | "
            f"{format_bytes(int(row['gzip_estimate_bytes']))} | {share:.1f}% |"
        )

    lines.extend(["", "## 边界", ""])
    for note in report["notes"]:
        lines.append(f"- {note}")
    if report["missing_local_references"]:
        lines.extend(["", "## 缺失引用", ""])
        for row in report["missing_local_references"]:
            lines.append(f"- `{row['url']}` → `{row['resolved_path']}`")
    return "\n".join(lines).rstrip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--html", default="index.html")
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--json-output", default="homepage_payload_audit.json")
    parser.add_argument("--markdown-output", default="homepage_payload_audit.md")
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    html_path = repo_root / args.html
    report = audit(html_path, repo_root)

    Path(args.json_output).write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    Path(args.markdown_output).write_text(markdown(report), encoding="utf-8")

    total = report["document_plus_dependency_totals"]
    print("=== 予华首页直接静态负载审计（只读） ===")
    print(f"直接引用: {report['reference_count']}；本地唯一依赖: {report['unique_local_dependency_count']}")
    print(f"文档+直接依赖原始体积: {format_bytes(int(total['raw_bytes']))}")
    print(f"文档+直接依赖 gzip 估算: {format_bytes(int(total['gzip_estimate_bytes']))}")
    print(f"缺失本地直接引用: {report['missing_local_reference_count']}")
    print("最大直接依赖:")
    for row in report["largest_direct_dependencies"][:10]:
        print(
            f"  {format_bytes(int(row['raw_bytes'])):>12} raw | "
            f"{format_bytes(int(row['gzip_estimate_bytes'])):>12} gzip-est | {row['path']}"
        )

    return 1 if report["missing_local_reference_count"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
