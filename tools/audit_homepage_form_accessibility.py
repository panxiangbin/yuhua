#!/usr/bin/env python3
"""Read-only accessible-name audit for homepage form controls.

This audit checks non-hidden input/select/textarea controls in index.html. A control
must have an accessible name from an explicit/nested label, aria-label,
aria-labelledby, or the relevant native input attribute. Placeholder text is not
accepted as a label. The tool never modifies page or product/specification data.
"""

from __future__ import annotations

import argparse
import json
from html.parser import HTMLParser
from pathlib import Path


class FormControlParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.controls: list[dict[str, object]] = []
        self.label_for_ids: set[str] = set()
        self._label_depth = 0

    @staticmethod
    def _attrs(attrs: list[tuple[str, str | None]]) -> dict[str, str]:
        return {key.lower(): (value or "") for key, value in attrs}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        a = self._attrs(attrs)

        if tag == "label":
            self._label_depth += 1
            target = a.get("for", "").strip()
            if target:
                self.label_for_ids.add(target)
            return

        if tag not in {"input", "select", "textarea"}:
            return

        input_type = a.get("type", "text").strip().lower() if tag == "input" else ""
        if tag == "input" and input_type == "hidden":
            return

        self.controls.append(
            {
                "tag": tag,
                "id": a.get("id", "").strip(),
                "name": a.get("name", "").strip(),
                "type": input_type,
                "aria_label": a.get("aria-label", "").strip(),
                "aria_labelledby": a.get("aria-labelledby", "").strip(),
                "value": a.get("value", "").strip(),
                "alt": a.get("alt", "").strip(),
                "placeholder": a.get("placeholder", "").strip(),
                "nested_label": self._label_depth > 0,
            }
        )

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "label" and self._label_depth:
            self._label_depth -= 1


def accessible_name_source(control: dict[str, object], label_for_ids: set[str]) -> str | None:
    if bool(control["nested_label"]):
        return "nested-label"
    control_id = str(control["id"])
    if control_id and control_id in label_for_ids:
        return "label-for"
    if str(control["aria_label"]):
        return "aria-label"
    if str(control["aria_labelledby"]):
        return "aria-labelledby"

    if control["tag"] == "input":
        input_type = str(control["type"])
        if input_type in {"button", "submit", "reset"} and str(control["value"]):
            return "value"
        if input_type == "image" and str(control["alt"]):
            return "alt"
    return None


def audit(html_path: Path) -> dict[str, object]:
    source = html_path.read_text(encoding="utf-8")
    parser = FormControlParser()
    parser.feed(source)

    rows: list[dict[str, object]] = []
    unnamed: list[dict[str, object]] = []
    source_counts: dict[str, int] = {}

    for index, control in enumerate(parser.controls, start=1):
        row = dict(control)
        method = accessible_name_source(control, parser.label_for_ids)
        row["accessible_name_source"] = method
        row["ordinal"] = index
        rows.append(row)
        if method:
            source_counts[method] = source_counts.get(method, 0) + 1
        else:
            unnamed.append(row)

    return {
        "policy": (
            "只读首页表单可访问名称审计：检查非隐藏 input/select/textarea 是否通过 label、"
            "aria-label、aria-labelledby 或适用的原生属性获得可访问名称；placeholder 不作为标签。"
            "不会修改任何页面、产品、规格书、型号、参数、价格或联系方式。"
        ),
        "html": html_path.as_posix(),
        "control_count": len(rows),
        "named_control_count": len(rows) - len(unnamed),
        "unnamed_control_count": len(unnamed),
        "accessible_name_source_counts": dict(sorted(source_counts.items())),
        "controls": rows,
        "unnamed_controls": unnamed,
    }


def markdown(report: dict[str, object]) -> str:
    lines = [
        "# 予华网站首页表单可访问名称审计",
        "",
        "> 只读审计；placeholder 不视为可访问名称。",
        "",
        "## 汇总",
        "",
        f"- 非隐藏表单控件：{report['control_count']} 个",
        f"- 有可访问名称：{report['named_control_count']} 个",
        f"- 缺少可访问名称：{report['unnamed_control_count']} 个",
        "",
        "## 控件明细",
        "",
        "| # | 标签 | id | type | 名称来源 | placeholder |",
        "|---:|---|---|---|---|---|",
    ]
    for row in report["controls"]:
        placeholder = str(row["placeholder"]).replace("|", "\\|")
        lines.append(
            f"| {row['ordinal']} | `{row['tag']}` | `{row['id'] or '-'}` | "
            f"`{row['type'] or '-'}` | {row['accessible_name_source'] or '**缺失**'} | {placeholder or '-'} |"
        )
    if report["unnamed_controls"]:
        lines.extend(["", "## 需要修复", ""])
        for row in report["unnamed_controls"]:
            lines.append(
                f"- #{row['ordinal']} `{row['tag']}` id=`{row['id'] or '-'}` type=`{row['type'] or '-'}`"
            )
    return "\n".join(lines).rstrip() + "\n"


def regression_check() -> None:
    probe = FormControlParser()
    probe.feed(
        '<label>嵌套<input id="nested"></label>'
        '<label for="explicit">显式</label><input id="explicit">'
        '<input id="aria" aria-label="ARIA">'
        '<input id="placeholder-only" placeholder="不能作为标签">'
    )
    results = [accessible_name_source(row, probe.label_for_ids) for row in probe.controls]
    expected = ["nested-label", "label-for", "aria-label", None]
    if results != expected:
        raise RuntimeError(f"form-control audit regression failed: {results!r} != {expected!r}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--html", default="index.html")
    parser.add_argument("--json-output", default="homepage_form_accessibility_audit.json")
    parser.add_argument("--markdown-output", default="homepage_form_accessibility_audit.md")
    args = parser.parse_args()

    regression_check()
    report = audit(Path(args.html))
    Path(args.json_output).write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    Path(args.markdown_output).write_text(markdown(report), encoding="utf-8")

    print("=== 予华首页表单可访问名称审计（只读） ===")
    print(f"非隐藏表单控件: {report['control_count']}")
    print(f"有可访问名称: {report['named_control_count']}")
    print(f"缺少可访问名称: {report['unnamed_control_count']}")
    print(f"名称来源: {report['accessible_name_source_counts']}")

    if report["unnamed_control_count"]:
        print("FAIL: 存在缺少可访问名称的表单控件")
        return 1
    print("PASS: 所有非隐藏表单控件均有可访问名称")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
