#!/usr/bin/env python3
"""Read-only audit of core model pages against the specification index.

The audit never rewrites product/specification facts. It verifies that any direct
specification link exposed by model/*.html points to a specs_index.json record
whose model exactly matches the page's Product JSON-LD model. It also reports
whether an exact model has zero, one, or multiple specification candidates so
ambiguous mappings can stay under review instead of being guessed.
"""

from __future__ import annotations

import argparse
import json
import posixpath
from collections import defaultdict
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "model"
SPEC_INDEX = ROOT / "specs_index.json"


class ModelPageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[str] = []
        self._in_json_ld = False
        self._json_chunks: list[str] = []
        self.json_ld_blocks: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        attrs = dict(attrs)
        if tag == "a":
            href = unescape(attrs.get("href", "").strip())
            if href:
                self.links.append(href)
        elif tag == "script" and attrs.get("type", "").lower() == "application/ld+json":
            self._in_json_ld = True
            self._json_chunks = []

    def handle_data(self, data: str) -> None:
        if self._in_json_ld:
            self._json_chunks.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "script" and self._in_json_ld:
            self.json_ld_blocks.append("".join(self._json_chunks).strip())
            self._in_json_ld = False
            self._json_chunks = []


def normalize_model(value: object) -> str:
    return " ".join(str(value or "").split()).casefold()


def find_product_model(value: object) -> str:
    if isinstance(value, dict):
        item_type = value.get("@type")
        types = item_type if isinstance(item_type, list) else [item_type]
        if "Product" in types and value.get("model"):
            return " ".join(str(value["model"]).split())
        for child in value.values():
            found = find_product_model(child)
            if found:
                return found
    elif isinstance(value, list):
        for child in value:
            found = find_product_model(child)
            if found:
                return found
    return ""


def local_target(page: Path, href: str) -> str | None:
    parsed = urlsplit(href)
    if parsed.scheme or parsed.netloc or href.lower().startswith(("mailto:", "tel:")):
        return None
    if not parsed.path:
        return None
    decoded = unquote(parsed.path).replace("\\", "/")
    page_rel = page.relative_to(ROOT).as_posix()
    target = posixpath.normpath(posixpath.join(posixpath.dirname(page_rel), decoded))
    if target == ".." or target.startswith("../"):
        return None
    return target.lstrip("/")


def spec_entry_snapshot(entry: dict) -> dict:
    return {
        "title": entry.get("title", ""),
        "model": entry.get("model", ""),
        "series": entry.get("series", ""),
        "page": entry.get("page", ""),
        "dl": entry.get("dl", ""),
    }


def audit() -> dict:
    specs = json.loads(SPEC_INDEX.read_text(encoding="utf-8"))
    if not isinstance(specs, list):
        raise ValueError("specs_index.json must contain a list")

    exact_by_model: dict[str, list[dict]] = defaultdict(list)
    for entry in specs:
        if not isinstance(entry, dict):
            continue
        key = normalize_model(entry.get("model"))
        if key:
            exact_by_model[key].append(entry)

    pages = sorted(MODEL_DIR.glob("*.html"))
    if not pages:
        raise ValueError("No core model pages found under model/*.html")

    rows: list[dict] = []
    unsafe_direct_targets: list[dict] = []
    ambiguous_direct_links: list[dict] = []
    unique_exact_unlinked: list[dict] = []
    counts = defaultdict(int)

    for page in pages:
        parser = ModelPageParser()
        parser.feed(page.read_text(encoding="utf-8"))

        product_model = ""
        for block in parser.json_ld_blocks:
            if not block:
                continue
            product_model = find_product_model(json.loads(block))
            if product_model:
                break
        if not product_model:
            raise ValueError(f"{page.relative_to(ROOT)}: Product JSON-LD model is missing")

        exact = exact_by_model.get(normalize_model(product_model), [])
        exact_pages = {str(item.get("page", "")).strip() for item in exact if item.get("page")}
        exact_downloads = {str(item.get("dl", "")).strip() for item in exact if item.get("dl")}

        direct_spec_pages: list[str] = []
        direct_spec_downloads: list[str] = []
        for href in parser.links:
            target = local_target(page, href)
            if not target:
                continue
            if target.startswith("specs/") and target.endswith(".html"):
                direct_spec_pages.append(target)
            elif target.startswith("downloads/specs/"):
                direct_spec_downloads.append(target)

        direct_spec_pages = sorted(set(direct_spec_pages))
        direct_spec_downloads = sorted(set(direct_spec_downloads))

        if not exact:
            evidence_class = "no_exact_spec"
        elif len(exact) == 1:
            evidence_class = "unique_exact_spec"
        else:
            evidence_class = "multiple_exact_specs"
        counts[evidence_class] += 1

        unsafe_pages = sorted(set(direct_spec_pages) - exact_pages)
        unsafe_downloads = sorted(set(direct_spec_downloads) - exact_downloads)
        if unsafe_pages or unsafe_downloads:
            unsafe_direct_targets.append(
                {
                    "core_page": page.relative_to(ROOT).as_posix(),
                    "model": product_model,
                    "unsafe_spec_pages": unsafe_pages,
                    "unsafe_spec_downloads": unsafe_downloads,
                }
            )

        if len(exact) > 1 and (direct_spec_pages or direct_spec_downloads):
            ambiguous_direct_links.append(
                {
                    "core_page": page.relative_to(ROOT).as_posix(),
                    "model": product_model,
                    "candidate_count": len(exact),
                    "linked_spec_pages": direct_spec_pages,
                    "linked_spec_downloads": direct_spec_downloads,
                }
            )

        if len(exact) == 1 and not direct_spec_pages:
            unique_exact_unlinked.append(
                {
                    "core_page": page.relative_to(ROOT).as_posix(),
                    "model": product_model,
                    "candidate": spec_entry_snapshot(exact[0]),
                }
            )

        rows.append(
            {
                "core_page": page.relative_to(ROOT).as_posix(),
                "model": product_model,
                "evidence_class": evidence_class,
                "exact_candidate_count": len(exact),
                "exact_candidates": [spec_entry_snapshot(item) for item in exact],
                "direct_spec_pages": direct_spec_pages,
                "direct_spec_downloads": direct_spec_downloads,
                "direct_targets_are_exact_model_matches": not (unsafe_pages or unsafe_downloads),
            }
        )

    return {
        "policy": {
            "read_only": True,
            "auto_fix_count": 0,
            "matching_rule": "Product JSON-LD model must equal specs_index.json model after whitespace normalization and case-folding.",
            "ambiguity_rule": "Multiple exact specification records are reported for review and never auto-selected.",
        },
        "summary": {
            "core_page_count": len(rows),
            "no_exact_spec_count": counts["no_exact_spec"],
            "unique_exact_spec_count": counts["unique_exact_spec"],
            "multiple_exact_specs_count": counts["multiple_exact_specs"],
            "unsafe_direct_target_count": len(unsafe_direct_targets),
            "ambiguous_direct_link_count": len(ambiguous_direct_links),
            "unique_exact_unlinked_count": len(unique_exact_unlinked),
        },
        "unsafe_direct_targets": unsafe_direct_targets,
        "ambiguous_direct_links": ambiguous_direct_links,
        "unique_exact_unlinked": unique_exact_unlinked,
        "pages": rows,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json-output", default="core_model_spec_link_report.json")
    args = parser.parse_args()

    report = audit()
    Path(args.json_output).write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    summary = report["summary"]
    print(json.dumps(summary, ensure_ascii=False, sort_keys=True))

    if summary["unsafe_direct_target_count"]:
        raise SystemExit(
            "Unsafe core-model specification link(s) found: direct target does not belong to the page model."
        )


if __name__ == "__main__":
    main()
