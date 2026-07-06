from __future__ import annotations

import json
import re
from pathlib import Path


def find_knowledge_root() -> Path:
    search_roots = [Path("."), Path("..")]
    for base in search_roots:
        for p in base.iterdir():
            if p.is_dir() and "数控" in p.name and (p / "README.md").exists():
                return p.resolve()
    raise FileNotFoundError("could not locate the CNC knowledge base root")


def make_tags(title: str, category: str) -> list[str]:
    raw_parts = re.split(r"[_\-\s/]+", title)
    tags = [category]
    for part in raw_parts:
        part = part.strip()
        if not part:
            continue
        if part.isdigit():
            continue
        if part.startswith("关键词") or part.startswith("适用"):
            continue
        if len(part) <= 1:
            continue
        if len(part) <= 18:
            tags.append(part)
    deduped: list[str] = []
    for tag in tags:
        if tag not in deduped:
            deduped.append(tag)
    return deduped[:8]


def clean_title(text: str) -> str:
    return text.replace("_", " ").strip()


def extract_file_profile(path: Path) -> dict[str, str | list[str]]:
    try:
        text = path.read_text(encoding="utf-8")
    except Exception:
        return {}

    lines = text.splitlines()
    title = clean_title(path.stem)
    h1 = ""
    headings: list[str] = []
    keywords: list[str] = []
    ledes: list[str] = []
    in_code = False
    for line in lines[:250]:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            continue
        if not h1 and stripped.startswith("# "):
            h1 = stripped.lstrip("# ").strip()
            continue
        if stripped.startswith("## ") and len(headings) < 4:
            headings.append(stripped.lstrip("# ").strip())
            continue
        if stripped.startswith(">") and len(keywords) < 4:
            raw = stripped.lstrip("> ").strip()
            if raw:
                keywords.append(raw[:120])
            continue
        if len(ledes) < 2 and not stripped.startswith("|") and not re.match(r"^[-*]\s", stripped):
            if re.match(r"^[A-Da-d][\.、]\s*", stripped):
                continue
            if re.match(r"^\d+[\.、]\s*", stripped):
                continue
            if len(stripped) >= 24:
                ledes.append(stripped[:120])

    return {
        "title": h1 or title,
        "headings": headings,
        "keywords": keywords,
        "ledes": ledes,
    }


def build_entries() -> list[dict]:
    root = find_knowledge_root()
    readme = (root / "README.md").read_text(encoding="utf-8")

    entries: list[dict] = []

    table_rows = re.findall(
        r"\| \[(.*?)\]\((.*?)\) \| (\d+) \| ([^|]+) \| (\d+) \| (\d+) \| (\d+) \| ([^\n]+) \|",
        readme,
    )
    for title, link, count, size, deep, medium, basic, desc in table_rows:
        code = title.rstrip("/")
        entries.append(
            {
                "id": f"kb-root-{code}",
                "category": "知识库总览",
                "title": f"{code} 总览",
                "code": code,
                "aliases": [code, clean_title(code)],
                "summary": f"这是 {code} 的知识库总览入口，目录说明里写明为：{desc.strip()}。",
                "usage": "先从这一类的总览入口进入，再继续下钻到具体教程或专题文件。",
                "beginner": "先把这个大类理解成一个目录，再看它下面都有哪些高频专题。",
                "warning": "总览入口不是最终答案，它的作用是帮你找到更细的专题。",
                "risk": "低",
                "source": str((root / link).as_posix()),
                "tags": make_tags(code, "知识库总览"),
            }
        )

    for directory in sorted([p for p in root.iterdir() if p.is_dir()]):
        section_readme = directory / "README.md"
        if not section_readme.exists():
            continue
        section_text = section_readme.read_text(encoding="utf-8")
        file_rows = re.findall(r"\| \[(.*?)\]\((.*?)\) \| ([^|]+) \| ([^|\n]+) \|", section_text)
        for file_title, link, size, quality in file_rows:
            stem = Path(file_title).stem
            profile = extract_file_profile(section_readme.parent / link)
            entry_title = clean_title(profile.get("title") or stem)
            headings = profile.get("headings") or []
            keywords = profile.get("keywords") or []
            ledes = profile.get("ledes") or []
            summary_bits = [f"来自 {directory.name} 目录的文件入口，适合继续展开对应专题和文件内容。"]
            if headings:
                summary_bits.append("前置标题：" + " / ".join(headings[:3]))
            if keywords:
                summary_bits.append("关键词：" + "；".join(keywords[:2]))
            if ledes:
                summary_bits.append("开头内容：" + "；".join(ledes[:2]))
            entry_id = f"kb-file-{directory.name}-{stem}"
            entries.append(
                {
                    "id": entry_id,
                    "category": clean_title(directory.name),
                    "title": entry_title,
                    "code": entry_title,
                    "aliases": list(dict.fromkeys([file_title, clean_title(stem), entry_title, *headings[:2], *keywords[:2], *ledes[:2]])),
                    "summary": "；".join(summary_bits),
                    "usage": "当你知道文件标题，或想从专题文件直接定位内容时使用。也可以按标题里的关键词继续搜。",
                    "beginner": "先把标题和前置标题当检索词，再结合目录判断它属于哪一块知识。",
                    "warning": "这是文件入口索引，不等于已经把整篇内容写进卡片里。",
                    "risk": "低",
                    "source": str((section_readme.parent / link).as_posix()),
                    "tags": make_tags(f"{stem} {' '.join(headings[:2])} {' '.join(keywords[:2])} {' '.join(ledes[:1])}", clean_title(directory.name)),
                }
            )

    quick_section = readme.split("### 深度文件精选", 1)[1]
    for line in quick_section.splitlines():
        if not line.startswith("| ["):
            continue
        m = re.search(r"\| \[(.*?)\]\((.*?)\) \| ([^|]+) \| ([^|]+) \|", line)
        if not m:
            continue
        title, link, size, directory = m.groups()
        file_stem = Path(title).stem
        category = clean_title(directory)
        profile = extract_file_profile(root / link)
        entry_title = clean_title(profile.get("title") or file_stem)
        headings = profile.get("headings") or []
        keywords = profile.get("keywords") or []
        ledes = profile.get("ledes") or []
        summary_bits = [f"来自数控知识库精选区的文件入口，适合继续展开 {category} 下的高频内容。"]
        if headings:
            summary_bits.append("前置标题：" + " / ".join(headings[:3]))
        if keywords:
            summary_bits.append("关键词：" + "；".join(keywords[:2]))
        if ledes:
            summary_bits.append("开头内容：" + "；".join(ledes[:2]))
        entries.append(
            {
                "id": f"kb-readme-{file_stem}",
                "category": category,
                "title": entry_title,
                "code": entry_title,
                "aliases": list(dict.fromkeys([title, clean_title(file_stem), entry_title, *headings[:2], *keywords[:2], *ledes[:2]])),
                "summary": "；".join(summary_bits),
                "usage": "当你想从文件标题直接跳到对应专题时使用。也可以从标题里的关键词继续检索。",
                "beginner": "先把标题和前置标题当作检索词，再结合目录看它属于哪一类。",
                "warning": "精选文件入口偏速查，不代表覆盖了所有相邻细节。",
                "risk": "低",
                "source": str((root / link).as_posix()),
                "tags": make_tags(f"{file_stem} {' '.join(headings[:2])} {' '.join(keywords[:2])} {' '.join(ledes[:1])}", category),
            }
        )

    # Remove duplicates by id while preserving order.
    deduped: list[dict] = []
    seen: set[str] = set()
    for entry in entries:
        if entry["id"] in seen:
            continue
        seen.add(entry["id"])
        deduped.append(entry)
    return deduped


def main() -> None:
    entries = build_entries()
    out = Path("kb-readme-index.js")
    out.write_text("window.CNC_KB_README_INDEX = " + json.dumps(entries, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
    print(f"generated {len(entries)} entries -> {out}")


if __name__ == "__main__":
    main()
