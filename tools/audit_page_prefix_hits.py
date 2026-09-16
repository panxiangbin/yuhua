#!/usr/bin/env python3
"""Audit how published product models resolve to detail pages.

Read-only: this script never changes product data, mappings, or product pages.
It mirrors the browser's current detail-page rule: explicit ``detail`` wins;
otherwise the longest model prefix under the same product key wins.
"""
from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Any


def clean(value: Any) -> str:
    return str(value or "").strip()


def norm(value: Any) -> str:
    return re.sub(r"\s+", "", clean(value).upper())


def extract_array(path: Path, variable: str) -> list[dict[str, Any]]:
    """Extract a JSON array assigned to ``window.<variable>`` without running JS."""
    text = path.read_text(encoding="utf-8")
    marker = re.search(rf"window\.{re.escape(variable)}\s*=\s*", text)
    if not marker:
        raise SystemExit(f"Could not find window.{variable} in {path}")

    start = text.find("[", marker.end())
    if start < 0:
        raise SystemExit(f"Could not find array start for window.{variable} in {path}")

    depth = 0
    in_string = False
    escaped = False
    end = None
    for i in range(start, len(text)):
        ch = text[i]
        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                end = i + 1
                break

    if end is None:
        raise SystemExit(f"Could not find array end for window.{variable} in {path}")

    data = json.loads(text[start:end])
    if not isinstance(data, list):
        raise SystemExit(f"window.{variable} in {path} must be an array")
    return data


def audit(products: list[dict[str, Any]], pages: list[dict[str, Any]], root: Path) -> dict[str, Any]:
    candidates: list[dict[str, str]] = []
    prefix_usage: dict[tuple[str, str, str], dict[str, Any]] = {}
    page_rows: list[dict[str, Any]] = []

    for row, page in enumerate(pages, start=1):
        key = clean(page.get("key"))
        target = clean(page.get("page"))
        title = clean(page.get("title"))
        prefixes = [norm(x) for x in (page.get("prefixes") or []) if norm(x)]
        page_rows.append({"row": row, "key": key, "page": target, "title": title, "prefixes": prefixes})
        for prefix in prefixes:
            item = {"key": key, "prefix": prefix, "page": target, "title": title}
            candidates.append(item)
            prefix_usage[(key, prefix, target)] = {
                **item,
                "raw_hit_count": 0,
                "winner_count": 0,
                "raw_examples": [],
                "winner_examples": [],
            }

    candidates.sort(key=lambda item: len(item["prefix"]), reverse=True)

    total_with_model = 0
    explicit_detail_count = 0
    prefix_matched_count = 0
    unmatched: list[dict[str, Any]] = []
    runtime_ambiguous: list[dict[str, Any]] = []
    missing_explicit_targets: list[dict[str, Any]] = []
    key_stats: defaultdict[str, dict[str, int]] = defaultdict(
        lambda: {"with_model": 0, "explicit": 0, "prefix_matched": 0, "unmatched": 0}
    )
    explicit_targets: defaultdict[str, int] = defaultdict(int)

    for row, product in enumerate(products, start=1):
        model = norm(product.get("型号"))
        key = clean(product.get("key"))
        if not model or not key:
            continue

        total_with_model += 1
        key_stats[key]["with_model"] += 1
        explicit = clean(product.get("detail"))
        if explicit:
            explicit_detail_count += 1
            key_stats[key]["explicit"] += 1
            explicit_targets[explicit] += 1
            if not (root / explicit).is_file():
                missing_explicit_targets.append({"row": row, "model": model, "key": key, "detail": explicit})
            continue

        matches = [c for c in candidates if c["key"] == key and model.startswith(c["prefix"])]
        for c in matches:
            u = prefix_usage[(c["key"], c["prefix"], c["page"])]
            u["raw_hit_count"] += 1
            if len(u["raw_examples"]) < 8 and model not in u["raw_examples"]:
                u["raw_examples"].append(model)

        if not matches:
            key_stats[key]["unmatched"] += 1
            if len(unmatched) < 250:
                unmatched.append({"row": row, "model": model, "key": key})
            continue

        best_len = len(matches[0]["prefix"])
        best = [m for m in matches if len(m["prefix"]) == best_len]
        best_pages = sorted({m["page"] for m in best})
        if len(best_pages) > 1:
            runtime_ambiguous.append({
                "row": row,
                "model": model,
                "key": key,
                "prefix_length": best_len,
                "pages": best_pages,
            })
            continue

        winner = best[0]
        prefix_matched_count += 1
        key_stats[key]["prefix_matched"] += 1
        usage = prefix_usage[(winner["key"], winner["prefix"], winner["page"])]
        usage["winner_count"] += 1
        if len(usage["winner_examples"]) < 8 and model not in usage["winner_examples"]:
            usage["winner_examples"].append(model)

    usage_rows = sorted(
        prefix_usage.values(),
        key=lambda x: (x["key"], -x["winner_count"], -len(x["prefix"]), x["prefix"], x["page"]),
    )
    zero_winner = [x for x in usage_rows if x["winner_count"] == 0]
    short_prefixes = [
        x for x in usage_rows
        if len(re.sub(r"[^A-Z0-9]", "", x["prefix"])) <= 2
    ]
    active_short = [x for x in short_prefixes if x["winner_count"] > 0]

    pages_without_winners = []
    for pg in page_rows:
        winners = sum(
            prefix_usage[(pg["key"], prefix, pg["page"])]["winner_count"]
            for prefix in pg["prefixes"]
            if (pg["key"], prefix, pg["page"]) in prefix_usage
        )
        if pg["prefixes"] and winners == 0:
            pages_without_winners.append({**pg, "winner_count": 0})

    unmatched_count = sum(v["unmatched"] for v in key_stats.values())
    resolvable = explicit_detail_count + prefix_matched_count
    coverage_pct = round((resolvable / total_with_model * 100), 2) if total_with_model else 0.0

    return {
        "published_products_with_model": total_with_model,
        "explicit_detail_count": explicit_detail_count,
        "prefix_matched_count": prefix_matched_count,
        "unmatched_count": unmatched_count,
        "detail_coverage_pct": coverage_pct,
        "runtime_ambiguous_count": len(runtime_ambiguous),
        "runtime_ambiguous": runtime_ambiguous,
        "missing_explicit_detail_target_count": len(missing_explicit_targets),
        "missing_explicit_detail_targets": missing_explicit_targets,
        "by_key": dict(sorted(key_stats.items())),
        "prefix_usage": usage_rows,
        "zero_winner_prefix_count": len(zero_winner),
        "zero_winner_prefixes": zero_winner,
        "short_prefix_count": len(short_prefixes),
        "active_short_prefix_count": len(active_short),
        "active_short_prefixes": active_short,
        "pages_with_prefixes_but_no_winner_count": len(pages_without_winners),
        "pages_with_prefixes_but_no_winner": pages_without_winners,
        "unmatched_examples": unmatched,
        "explicit_target_usage": dict(sorted(explicit_targets.items())),
    }


def print_human(report: dict[str, Any]) -> None:
    print("=== 予华仪器详情页前缀实际命中审计（只读） ===")
    print(f"有型号的前台产品: {report['published_products_with_model']}")
    print(f"显式 detail 命中: {report['explicit_detail_count']}")
    print(f"前缀映射命中: {report['prefix_matched_count']}")
    print(f"未绑定详情页: {report['unmatched_count']}")
    print(f"详情页覆盖率: {report['detail_coverage_pct']}%")
    print(f"运行时等长歧义: {report['runtime_ambiguous_count']}")
    print(f"显式 detail 缺失目标: {report['missing_explicit_detail_target_count']}")
    print(f"零实际命中前缀: {report['zero_winner_prefix_count']}")
    print(f"短前缀中实际生效: {report['active_short_prefix_count']} / {report['short_prefix_count']}")
    print(f"有前缀但无产品最终命中的资料页: {report['pages_with_prefixes_but_no_winner_count']}")

    if report["active_short_prefixes"]:
        print("\n实际生效的短前缀（仅审计，不自动删除）:")
        for item in report["active_short_prefixes"]:
            print(
                f"  {item['key']} / {item['prefix']} -> {item['page']}: "
                f"winner={item['winner_count']} examples={item['winner_examples']}"
            )

    if report["zero_winner_prefixes"]:
        print("\n零最终命中的前缀（前20条，可能是历史映射，需人工核对）:")
        for item in report["zero_winner_prefixes"][:20]:
            print(f"  {item['key']} / {item['prefix']} -> {item['page']} raw={item['raw_hit_count']}")

    if report["runtime_ambiguous"]:
        print("\n高风险：运行时可能在多个详情页间等长歧义:")
        for item in report["runtime_ambiguous"][:30]:
            print(f"  {item['key']} / {item['model']} -> {item['pages']}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default="assets/data.js")
    parser.add_argument("--pages", default="assets/pages.js")
    parser.add_argument("--json-output", default="")
    args = parser.parse_args()

    products = extract_array(Path(args.data), "PRODUCTS")
    pages = extract_array(Path(args.pages), "PAGES")
    report = audit(products, pages, Path.cwd())
    print_human(report)

    if args.json_output:
        Path(args.json_output).write_text(
            json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"\nJSON report written to: {args.json_output}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
