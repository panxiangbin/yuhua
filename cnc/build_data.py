from __future__ import annotations

import json
import re
from pathlib import Path


PROJECT_DIR = Path(r"F:\AI工作台\cnc_param_quickfinder")
KNOWLEDGE_ROOT = Path(r"F:\AI工作台\04_数控知识库")
QUICK_ROOT = Path(r"E:\迅雷下载\数控机床知识\速查表系列")
OUTPUT_PATH = PROJECT_DIR / "data.js"


KNOWLEDGE_CATEGORY_MAP = {
    "01_编程基础": "编程基础",
    "02_机床操作": "机床操作",
    "03_系统参数": "系统参数",
    "04_刀具工艺": "刀具工艺",
    "05_报警故障": "报警故障",
    "06_材料加工": "材料加工",
    "07_行业资讯": "行业扩展",
    "08_加工案例": "加工案例",
}

QUICK_CATEGORY_MAP = {
    "CAD快捷键速查表": "制图基础",
    "FANUC系统速查": "FANUC系统",
    "G96恒线速速查表": "切削参数",
    "G代码与编程速查": "G代码编程",
    "①钻孔指令速查表": "钻孔指令",
    "②FANUC报警代码速查表": "FANUC报警",
    "④加工余量标准速查表": "加工工艺",
    "⑥FANUC参数修改速查": "FANUC参数",
    "⑦刀片型号解读速查表": "刀具速查",
    "⑩量具使用速查表": "量具速查",
    "切削参数速查": "切削参数",
    "机械制图符号速查": "制图基础",
    "螺纹与规格速查": "螺纹规格",
}


def normalize_space(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def tags_from_title(title: str, category: str) -> list[str]:
    parts = re.split(r"[_\-\s/]+", title)
    tags = [category]
    for part in parts:
        cleaned = part.strip()
        if cleaned and len(cleaned) <= 12:
            tags.append(cleaned)
    seen = []
    for tag in tags:
        if tag not in seen:
            seen.append(tag)
    return seen[:8]


def make_knowledge_entries(limit_per_dir: int = 30) -> list[dict]:
    entries: list[dict] = []
    for directory in sorted([p for p in KNOWLEDGE_ROOT.iterdir() if p.is_dir()]):
        category = KNOWLEDGE_CATEGORY_MAP.get(directory.name, directory.name)
        md_files = sorted(directory.glob("*.md"))[:limit_per_dir]
        for md_file in md_files:
            title = md_file.stem.replace("_", " ")
            entries.append(
                {
                    "id": f"kb-{directory.name}-{md_file.stem}",
                    "category": category,
                    "title": title,
                    "code": title,
                    "summary": f"这是来自 {category} 分类的学习条目，当前已纳入正式版搜索索引，后续会继续补充详细摘要、案例和配图。",
                    "usage": "适合作为学习扩展条目，先了解概念，再结合实际加工和系统环境使用。",
                    "beginner": "先把标题里的主题弄懂，再往下看具体代码、参数或工艺细节。",
                    "warning": "知识库内容范围较广，遇到具体机床和参数修改时先确认系统和现场环境。",
                    "risk": "中",
                    "source": str(md_file.relative_to(KNOWLEDGE_ROOT)).replace("\\", " / "),
                    "tags": tags_from_title(md_file.stem, category),
                }
            )
    return entries


def make_quick_entries() -> list[dict]:
    entries: list[dict] = []
    for directory in sorted([p for p in QUICK_ROOT.iterdir() if p.is_dir()]):
        files = sorted([f for f in directory.iterdir() if f.is_file()])
        category = QUICK_CATEGORY_MAP.get(directory.name, directory.name)
        image_count = len([f for f in files if f.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}])
        entries.append(
            {
                "id": f"quick-{directory.name}",
                "category": category,
                "title": directory.name,
                "code": directory.name,
                "summary": f"这是你已有的速查系列素材栏目，目前收录 {image_count} 张图卡或相关文件，适合作为速查入口和后续批量导图来源。",
                "usage": "适合手机速查、栏目展示和后续图文知识卡整合。",
                "beginner": "先把这一类内容当成速查入口，再逐步配合详细讲解学习。",
                "warning": "图卡适合快速看结论，细节解释仍需要配套正文和示意图。",
                "risk": "低",
                "source": str(directory),
                "tags": tags_from_title(directory.name, category),
            }
        )
    return entries


def main() -> None:
    entries = make_quick_entries() + make_knowledge_entries()
    output = "window.CNC_DATA = " + json.dumps(entries, ensure_ascii=False, indent=2) + ";\n"
    OUTPUT_PATH.write_text(output, encoding="utf-8")
    print(f"generated {len(entries)} entries -> {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
