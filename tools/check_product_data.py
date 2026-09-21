#!/usr/bin/env python3
"""Read-only data quality checks for the Yuhua product catalogue.

This script NEVER modifies product/spec data. It only reports records and page
mappings that need manual review before they are published or merged.
"""
from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

SUSPICIOUS_MODELS = {
    "DOCX", "WORD", "FACTORY", "YUHUA", "PARAMETER", "PARAMETERS",
    "说明书", "参数", "产品参数", "技术参数",
}


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def load_pages_js(path: Path) -> list[dict[str, Any]]:
    """Load the JSON array assigned to window.PAGES without executing JS."""
    text = path.read_text(encoding="utf-8")
    match = re.search(r"window\.PAGES\s*=\s*(\[.*\])\s*;\s*$", text, re.S)
    if not match:
        raise SystemExit(f"Could not parse window.PAGES from {path}")
    pages = json.loads(match.group(1))
    if not isinstance(pages, list):
        raise SystemExit(f"window.PAGES in {path} must be an array")
    return pages


def clean(value: Any) -> str:
    return str(value or "").strip()


def norm_model(value: Any) -> str:
    s = clean(value).upper()
    s = re.sub(r"\s+", "", s)
    return s


def is_suspicious_model(value: Any) -> bool:
    normalized = norm_model(value)
    if not normalized:
        return False
    if normalized in SUSPICIOUS_MODELS:
        return True
    if normalized.endswith(".DOCX") or normalized.endswith(".DOC"):
        return True
    if normalized in {"PDF", "JPG", "JPEG", "PNG", "XLS", "XLSX"}:
        return True
    return False


def product_report(products: list[dict[str, Any]]) -> dict[str, Any]:
    empty_model = []
    empty_name = []
    suspicious_model = []
    models: defaultdict[str, list[int]] = defaultdict(list)
    categories = Counter()

    for i, p in enumerate(products, start=1):
        model = clean(p.get("型号"))
        name = clean(p.get("产品名称"))
        category = clean(p.get("类别")) or "未分类"
        categories[category] += 1

        if not model:
            empty_model.append(i)
        else:
            models[norm_model(model)].append(i)
        if not name:
            empty_name.append(i)
        if is_suspicious_model(model):
            suspicious_model.append({"row": i, "model": model, "name": name, "category": category})

    duplicates = [
        {"model": m, "count": len(rows), "rows": rows}
        for m, rows in models.items() if m and len(rows) > 1
    ]
    duplicates.sort(key=lambda x: (-x["count"], x["model"]))

    return {
        "total": len(products),
        "empty_model_count": len(empty_model),
        "empty_model_rows": empty_model,
        "empty_name_count": len(empty_name),
        "empty_name_rows": empty_name,
        "suspicious_model_count": len(suspicious_model),
        "suspicious_models": suspicious_model,
        "duplicate_model_group_count": len(duplicates),
        "duplicate_models": duplicates,
        "category_counts": dict(categories.most_common()),
    }


def spec_report(specs: list[dict[str, Any]]) -> dict[str, Any]:
    missing_model = []
    suspicious_model = []
    missing_page = []
    missing_download = []
    model_groups: defaultdict[str, list[int]] = defaultdict(list)
    page_path_groups: defaultdict[str, list[int]] = defaultdict(list)
    download_path_groups: defaultdict[str, list[int]] = defaultdict(list)

    for i, s in enumerate(specs, start=1):
        model = clean(s.get("model"))
        title = clean(s.get("title"))
        page = clean(s.get("page"))
        download = clean(s.get("dl"))
        if not model:
            missing_model.append(i)
        else:
            model_groups[norm_model(model)].append(i)
        if is_suspicious_model(model):
            suspicious_model.append({"row": i, "model": model, "title": title})
        if not page:
            missing_page.append(i)
        else:
            page_path_groups[page].append(i)
        if not download:
            missing_download.append(i)
        else:
            download_path_groups[download].append(i)

    duplicates = [
        {"model": m, "count": len(rows), "rows": rows}
        for m, rows in model_groups.items() if m and len(rows) > 1
    ]
    duplicates.sort(key=lambda x: (-x["count"], x["model"]))

    duplicate_page_paths = [
        {"path": path, "count": len(rows), "rows": rows}
        for path, rows in page_path_groups.items() if len(rows) > 1
    ]
    duplicate_page_paths.sort(key=lambda x: (-x["count"], x["path"]))

    duplicate_download_paths = [
        {"path": path, "count": len(rows), "rows": rows}
        for path, rows in download_path_groups.items() if len(rows) > 1
    ]
    duplicate_download_paths.sort(key=lambda x: (-x["count"], x["path"]))

    return {
        "total": len(specs),
        "missing_model_count": len(missing_model),
        "missing_model_rows": missing_model,
        "suspicious_model_count": len(suspicious_model),
        "suspicious_models": suspicious_model,
        "missing_page_count": len(missing_page),
        "missing_page_rows": missing_page,
        "missing_download_count": len(missing_download),
        "missing_download_rows": missing_download,
        "duplicate_model_group_count": len(duplicates),
        "duplicate_models": duplicates,
        "duplicate_page_path_group_count": len(duplicate_page_paths),
        "duplicate_page_paths": duplicate_page_paths,
        "duplicate_download_path_group_count": len(duplicate_download_paths),
        "duplicate_download_paths": duplicate_download_paths,
    }


def page_mapping_report(pages: list[dict[str, Any]], repo_root: Path) -> dict[str, Any]:
    """Audit model-prefix → product-page mappings used by app.js.

    The browser now requires both a product key and a model prefix to match.
    Exact duplicate (key, prefix) mappings to different pages are therefore
    genuinely ambiguous: whichever equally-long entry appears first wins.
    Other overlap/short-prefix findings are warnings only and need manual review.
    """
    prefix_owners: defaultdict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    prefix_by_key: defaultdict[str, list[dict[str, str]]] = defaultdict(list)
    global_prefix_owners: defaultdict[str, list[dict[str, str]]] = defaultdict(list)
    missing_targets = []
    prefixless_pages = []
    empty_prefixes = []
    prefix_count = 0

    for row, pg in enumerate(pages, start=1):
        pid = clean(pg.get("pid"))
        title = clean(pg.get("title"))
        key = clean(pg.get("key"))
        page = clean(pg.get("page"))
        prefixes = pg.get("prefixes") or []

        if page and not (repo_root / page).is_file():
            missing_targets.append({"row": row, "pid": pid, "title": title, "key": key, "page": page})

        if not prefixes:
            prefixless_pages.append({"row": row, "pid": pid, "title": title, "key": key, "page": page})

        for raw_prefix in prefixes:
            prefix = norm_model(raw_prefix)
            if not prefix:
                empty_prefixes.append({"row": row, "pid": pid, "title": title, "key": key, "page": page})
                continue
            prefix_count += 1
            owner = {"row": row, "pid": pid, "title": title, "key": key, "page": page, "prefix": prefix}
            prefix_owners[(key, prefix)].append(owner)
            prefix_by_key[key].append({"prefix": prefix, "page": page, "pid": pid, "title": title})
            global_prefix_owners[prefix].append({"key": key, "page": page, "pid": pid, "title": title})

    ambiguous_same_key = []
    for (key, prefix), owners in prefix_owners.items():
        pages_for_prefix = sorted({item["page"] for item in owners})
        if len(pages_for_prefix) > 1:
            ambiguous_same_key.append({
                "key": key,
                "prefix": prefix,
                "pages": pages_for_prefix,
                "owners": owners,
            })
    ambiguous_same_key.sort(key=lambda x: (x["key"], x["prefix"]))

    cross_key_reuse = []
    for prefix, owners in global_prefix_owners.items():
        keys = sorted({item["key"] for item in owners})
        if len(keys) > 1:
            cross_key_reuse.append({"prefix": prefix, "keys": keys, "owners": owners})
    cross_key_reuse.sort(key=lambda x: x["prefix"])

    overlaps = []
    for key, items in prefix_by_key.items():
        unique = []
        seen = set()
        for item in items:
            ident = (item["prefix"], item["page"])
            if ident not in seen:
                seen.add(ident)
                unique.append(item)
        for i, a in enumerate(unique):
            for b in unique[i + 1:]:
                if a["page"] == b["page"] or a["prefix"] == b["prefix"]:
                    continue
                if a["prefix"].startswith(b["prefix"]) or b["prefix"].startswith(a["prefix"]):
                    shorter, longer = sorted((a["prefix"], b["prefix"]), key=len)
                    overlaps.append({
                        "key": key,
                        "shorter_prefix": shorter,
                        "longer_prefix": longer,
                        "pages": sorted({a["page"], b["page"]}),
                    })
    overlaps.sort(key=lambda x: (x["key"], x["shorter_prefix"], x["longer_prefix"]))

    short_prefixes = []
    for (key, prefix), owners in prefix_owners.items():
        alnum_len = len(re.sub(r"[^A-Z0-9]", "", prefix))
        if alnum_len <= 2:
            short_prefixes.append({
                "key": key,
                "prefix": prefix,
                "pages": sorted({item["page"] for item in owners}),
                "titles": sorted({item["title"] for item in owners if item["title"]}),
            })
    short_prefixes.sort(key=lambda x: (len(x["prefix"]), x["prefix"], x["key"]))

    return {
        "page_entry_count": len(pages),
        "prefix_count": prefix_count,
        "missing_target_count": len(missing_targets),
        "missing_targets": missing_targets,
        "ambiguous_same_key_prefix_count": len(ambiguous_same_key),
        "ambiguous_same_key_prefixes": ambiguous_same_key,
        "same_key_overlap_count": len(overlaps),
        "same_key_overlaps": overlaps,
        "short_prefix_count": len(short_prefixes),
        "short_prefixes": short_prefixes,
        "cross_key_reuse_count": len(cross_key_reuse),
        "cross_key_reuse": cross_key_reuse,
        "prefixless_page_count": len(prefixless_pages),
        "prefixless_pages": prefixless_pages,
        "empty_prefix_count": len(empty_prefixes),
        "empty_prefixes": empty_prefixes,
    }


def print_human(report: dict[str, Any]) -> None:
    p = report["products"]
    s = report["specs"]
    m = report["page_mapping"]

    print("=== 予华仪器数据质量检查（只读，不修改数据） ===")
    print(f"产品记录: {p['total']}")
    print(f"  空型号: {p['empty_model_count']}")
    print(f"  空产品名: {p['empty_name_count']}")
    print(f"  疑似异常型号: {p['suspicious_model_count']}")
    print(f"  重复型号组: {p['duplicate_model_group_count']}")
    print(f"规格书记录: {s['total']}")
    print(f"  空型号: {s['missing_model_count']}")
    print(f"  疑似异常型号: {s['suspicious_model_count']}")
    print(f"  缺在线页面: {s['missing_page_count']}")
    print(f"  缺下载路径: {s['missing_download_count']}")
    print(f"  重复型号组: {s['duplicate_model_group_count']}")
    print(f"  重复在线页路径组: {s['duplicate_page_path_group_count']}")
    print(f"  重复下载路径组: {s['duplicate_download_path_group_count']}")
    print(f"详情页映射: {m['page_entry_count']} 个页面项 / {m['prefix_count']} 个前缀")
    print(f"  缺失目标文件: {m['missing_target_count']}")
    print(f"  同分类同前缀指向多个页面: {m['ambiguous_same_key_prefix_count']}")
    print(f"  同分类前缀包含关系: {m['same_key_overlap_count']}")
    print(f"  过短前缀(<=2字母数字): {m['short_prefix_count']}")
    print(f"  无前缀资料页: {m['prefixless_page_count']}")

    if p["suspicious_models"]:
        print("\n产品疑似异常型号（前30条）:")
        for item in p["suspicious_models"][:30]:
            print(f"  #{item['row']} model={item['model']!r} name={item['name']!r} category={item['category']!r}")

    if s["suspicious_models"]:
        print("\n规格书疑似异常型号（前30条）:")
        for item in s["suspicious_models"][:30]:
            print(f"  #{item['row']} model={item['model']!r} title={item['title']!r}")

    if p["duplicate_models"]:
        print("\n产品重复型号组（前30组；重复不等于错误，需人工判断不同配置/年份）:")
        for item in p["duplicate_models"][:30]:
            print(f"  {item['model']}: {item['count']} 条，rows={item['rows'][:12]}")

    if s["duplicate_page_paths"]:
        print("\n规格书重复在线页路径（前30组；仅审计，不自动删除资料）:")
        for item in s["duplicate_page_paths"][:30]:
            print(f"  {item['path']}: {item['count']} 条，rows={item['rows'][:12]}")

    if s["duplicate_download_paths"]:
        print("\n规格书重复下载路径（前30组；仅审计，不自动删除资料）:")
        for item in s["duplicate_download_paths"][:30]:
            print(f"  {item['path']}: {item['count']} 条，rows={item['rows'][:12]}")

    if m["ambiguous_same_key_prefixes"]:
        print("\n高风险详情页映射：同分类同前缀指向多个页面（需人工确认，脚本不会自动修复）:")
        for item in m["ambiguous_same_key_prefixes"][:30]:
            print(f"  key={item['key']!r} prefix={item['prefix']!r} pages={item['pages']}")

    if m["missing_targets"]:
        print("\n详情页映射缺失目标文件:")
        for item in m["missing_targets"][:30]:
            print(f"  #{item['row']} {item['page']} ({item['title']})")

    if m["short_prefixes"]:
        print("\n过短详情页前缀（仅审计，需结合真实型号人工判断）:")
        for item in m["short_prefixes"][:30]:
            print(f"  key={item['key']!r} prefix={item['prefix']!r} pages={item['pages']}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--products", default="products.json")
    ap.add_argument("--specs", default="specs_index.json")
    ap.add_argument("--pages", default="assets/pages.js")
    ap.add_argument("--json-output", default="")
    args = ap.parse_args()

    products = load_json(Path(args.products))
    specs = load_json(Path(args.specs))
    pages = load_pages_js(Path(args.pages))
    if not isinstance(products, list) or not isinstance(specs, list):
        raise SystemExit("products.json and specs_index.json must both contain JSON arrays")

    report = {
        "products": product_report(products),
        "specs": spec_report(specs),
        "page_mapping": page_mapping_report(pages, Path.cwd()),
    }
    print_human(report)

    if args.json_output:
        Path(args.json_output).write_text(
            json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"\nJSON report written to: {args.json_output}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
