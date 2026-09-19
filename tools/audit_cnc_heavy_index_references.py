#!/usr/bin/env python3
"""Audit runtime references to the two largest CNC knowledge indexes.

The tool never rewrites or removes knowledge data. By default it is report-only;
CI can opt into a narrow regression guard that rejects eager HTML script loading.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CNC_ROOT = ROOT / "cnc"
TARGET_NAMES = ("kb-readme-index.js", "knowledge-index-master.json")
SCAN_EXTENSIONS = {".html", ".htm", ".js", ".mjs", ".cjs", ".css", ".md", ".py"}


def classify_reference(path: Path, line: str) -> str:
    lower = line.lower()
    suffix = path.suffix.lower()
    if suffix in {".html", ".htm"} and "<script" in lower and "src=" in lower:
        return "html-script"
    if "fetch(" in lower:
        return "fetch"
    if "import(" in lower or lower.lstrip().startswith("import ") or " from " in lower:
        return "import"
    if "xmlhttprequest" in lower or ".open(" in lower:
        return "xhr-like"
    return "text-reference"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Audit references to large CNC knowledge indexes without modifying content."
    )
    parser.add_argument(
        "--report",
        default="yuhua-cnc-heavy-index-report.json",
        help="JSON report output path",
    )
    parser.add_argument(
        "--fail-on-eager-html-script",
        action="store_true",
        help=(
            "Exit non-zero when either heavy index is referenced by an HTML "
            "<script src=...> tag."
        ),
    )
    args = parser.parse_args()

    targets = []
    for name in TARGET_NAMES:
        path = CNC_ROOT / name
        targets.append(
            {
                "path": path.relative_to(ROOT).as_posix(),
                "exists": path.exists(),
                "size_bytes": path.stat().st_size if path.exists() else None,
            }
        )

    references = []
    scanned_files = 0
    if CNC_ROOT.exists():
        for path in sorted(CNC_ROOT.rglob("*")):
            if not path.is_file():
                continue
            if path.name in TARGET_NAMES:
                continue
            if path.suffix.lower() not in SCAN_EXTENSIONS:
                continue

            scanned_files += 1
            try:
                text = path.read_text(encoding="utf-8", errors="ignore")
            except OSError as exc:
                print(f"WARN: unable to read {path.relative_to(ROOT)}: {exc}")
                continue

            for line_number, line in enumerate(text.splitlines(), start=1):
                for target_name in TARGET_NAMES:
                    if target_name not in line:
                        continue
                    references.append(
                        {
                            "source": path.relative_to(ROOT).as_posix(),
                            "line": line_number,
                            "target": f"cnc/{target_name}",
                            "kind": classify_reference(path, line),
                            "snippet": line.strip()[:240],
                        }
                    )

    kinds = {}
    for ref in references:
        kinds[ref["kind"]] = kinds.get(ref["kind"], 0) + 1

    eager_html_script_refs = [
        ref for ref in references if ref["kind"] == "html-script"
    ]

    report = {
        "purpose": "Audit-only map of CNC runtime references to the two largest knowledge indexes.",
        "targets": targets,
        "summary": {
            "scanned_files": scanned_files,
            "reference_count": len(references),
            "files_with_references": len({ref["source"] for ref in references}),
            "reference_kinds": dict(sorted(kinds.items())),
            "eager_html_script_reference_count": len(eager_html_script_refs),
        },
        "references": references,
    }

    report_path = Path(args.report)
    report_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    missing = [target["path"] for target in targets if not target["exists"]]
    if missing:
        print("Missing expected target(s): " + ", ".join(missing))
        return 1

    print(
        "CNC heavy-index audit: "
        f"{scanned_files} code/document files scanned, "
        f"{len(references)} references in "
        f"{len({ref['source'] for ref in references})} files."
    )
    print(
        "Reference kinds: "
        + (", ".join(f"{key}={value}" for key, value in sorted(kinds.items())) or "none")
    )
    for ref in references:
        print(
            f"- {ref['source']}:{ref['line']} -> {ref['target']} "
            f"[{ref['kind']}]"
        )
    print(f"Report written to {report_path}")

    if args.fail_on_eager_html_script and eager_html_script_refs:
        print(
            "ERROR: eager HTML <script src> loading of a heavy CNC index was detected. "
            "Keep these large indexes out of initial page loading."
        )
        return 2

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
