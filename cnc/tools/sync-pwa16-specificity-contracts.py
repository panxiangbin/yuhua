#!/usr/bin/env python3
"""一次性同步PWA16运行针与80课针对性核心资源契约。"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CURRENT_PWA = "20260806-pwa16"
CURRENT_CACHE = "20260806-learning16"
PREVIOUS_PWA = "20260806-pwa15"
PREVIOUS_CACHE = "20260806-learning15"
OLD_PREVIOUS_PWA = "20260806-pwa14"
OLD_PREVIOUS_CACHE = "20260806-learning14"
NEW_CORE = "./learning-sublesson-specificity.js"

VERSION_FILES = [
    ".github/workflows/cnc-ai-teacher-offline-core-pages-smoke.yml",
    ".github/workflows/cnc-beginner-placement-offline-pages-smoke.yml",
    ".github/workflows/cnc-pwa-offline-cache-smoke.yml",
    ".github/workflows/cnc-pwa-self-test-smoke.yml",
    ".github/workflows/cnc-pwa-upgrade-data-smoke.yml",
    ".github/workflows/cnc-training-camp-route-handoff-pages-smoke.yml",
    "cnc/tests/mobile-pwa-offline-cache-smoke.cjs",
    "cnc/tests/mobile-pwa-profile-bfcache-smoke.cjs",
    "cnc/tests/mobile-pwa-upgrade-data-smoke.cjs",
    "cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs",
    "cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs",
    "cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs",
]

PAGES_TESTS = [
    "cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs",
    "cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs",
    "cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs",
]

WORKFLOW_CORE_FILES = [
    ".github/workflows/cnc-ai-teacher-offline-core-pages-smoke.yml",
    ".github/workflows/cnc-beginner-placement-offline-pages-smoke.yml",
    ".github/workflows/cnc-pwa-offline-cache-smoke.yml",
    ".github/workflows/cnc-pwa-self-test-smoke.yml",
    ".github/workflows/cnc-training-camp-route-handoff-pages-smoke.yml",
]


def read(relative: str) -> str:
    path = ROOT / relative
    if not path.is_file():
        raise RuntimeError(f"缺少允许修改的文件：{relative}")
    return path.read_text(encoding="utf-8")


def write(relative: str, content: str) -> None:
    (ROOT / relative).write_text(content, encoding="utf-8")


def sync_versions(relative: str) -> None:
    source = read(relative)
    if PREVIOUS_PWA not in source and PREVIOUS_CACHE not in source:
        raise RuntimeError(f"没有找到待升级的PWA15运行针：{relative}")
    source = source.replace(PREVIOUS_PWA, "__CNC_CURRENT_PWA__")
    source = source.replace(PREVIOUS_CACHE, "__CNC_CURRENT_CACHE__")
    source = source.replace(OLD_PREVIOUS_PWA, PREVIOUS_PWA)
    source = source.replace(OLD_PREVIOUS_CACHE, PREVIOUS_CACHE)
    source = source.replace("__CNC_CURRENT_PWA__", CURRENT_PWA)
    source = source.replace("__CNC_CURRENT_CACHE__", CURRENT_CACHE)
    write(relative, source)


def add_core_after_catalog(relative: str) -> None:
    source = read(relative)
    if NEW_CORE in source:
        return
    needles = [
        "'./learning-sublesson-catalog.js',",
        '"./learning-sublesson-catalog.js",',
        "  './learning-sublesson-catalog.js',\n",
        "            './learning-sublesson-catalog.js',\n",
        '      "./learning-sublesson-catalog.js",\n',
    ]
    for needle in needles:
        if needle in source:
            inserted = needle + needle.replace("./learning-sublesson-catalog.js", NEW_CORE)
            source = source.replace(needle, inserted, 1)
            write(relative, source)
            return
    raise RuntimeError(f"无法在目录资源后插入针对性脚本：{relative}")


def add_workflow_core(relative: str) -> None:
    source = read(relative)
    if NEW_CORE in source:
        return
    try:
        add_core_after_catalog(relative)
        return
    except RuntimeError:
        source = read(relative)
    needles = [
        "            './training-camp.html',\n",
        "  './training-camp.html',\n",
    ]
    for needle in needles:
        if needle in source:
            source = source.replace(needle, needle + needle.replace("./training-camp.html", NEW_CORE), 1)
            write(relative, source)
            return
    raise RuntimeError(f"工作流无法插入针对性核心资源：{relative}")


def split_pages_core(relative: str) -> None:
    add_core_after_catalog(relative)
    source = read(relative)
    if "const EXACT_CORE_PATHS = [" in source:
        current_core_name = "EXACT_CORE_PATHS"
    elif "const EXACT_CORE = [" in source:
        current_core_name = "EXACT_CORE"
    else:
        raise RuntimeError(f"缺少Pages当前核心资源集合：{relative}")

    declaration = (
        "const PREVIOUS_PUBLIC_CORE_PATHS = "
        f"{current_core_name}.filter(path => path !== './learning-sublesson-specificity.js');\n\n"
    )
    if "const PREVIOUS_PUBLIC_CORE_PATHS = " not in source:
        marker = "const LEARNING_DEPTH_CORE_PATHS = new Set(["
        index = source.find(marker)
        if index < 0:
            raise RuntimeError(f"缺少Pages核心资源集合锚点：{relative}")
        source = source[:index] + declaration + source[index:]

    previous_variants = [
        "if (build === previousPublicPwaBuild) return EXACT_CORE_PATHS;",
        "if (build === previousPublicPwaBuild) return EXACT_CORE;",
    ]
    replaced = False
    for old in previous_variants:
        if old in source:
            source = source.replace(
                old,
                "if (build === previousPublicPwaBuild) return PREVIOUS_PUBLIC_CORE_PATHS;",
                1,
            )
            replaced = True
            break
    if not replaced and "if (build === previousPublicPwaBuild) return PREVIOUS_PUBLIC_CORE_PATHS;" not in source:
        raise RuntimeError(f"缺少上一公网核心资源分支：{relative}")
    write(relative, source)


def add_offline_browser_core() -> None:
    relative = "cnc/tests/mobile-pwa-offline-cache-smoke.cjs"
    source = read(relative)
    if NEW_CORE not in source:
        needle = "const CORE_OFFLINE_PATHS = [\n"
        if needle not in source:
            raise RuntimeError("离线浏览器测试缺少核心资源数组")
        source = source.replace(needle, needle + f"  '{NEW_CORE}',\n", 1)
        write(relative, source)


def add_stage_marker(relative: str) -> None:
    source = read(relative)
    if "80课现场动作与风险针对性" in source:
        return
    if "'学习目录紧凑布局'" in source:
        source = source.replace("'学习目录紧凑布局'", "'学习目录紧凑布局','80课现场动作与风险针对性'", 1)
    else:
        raise RuntimeError(f"工作流缺少内容阶段锚点：{relative}")
    write(relative, source)


def verify() -> None:
    for relative in VERSION_FILES:
        source = read(relative)
        if CURRENT_PWA not in source:
            raise RuntimeError(f"当前PWA16运行针缺失：{relative}")
        if "pwa14" in source or "learning14" in source:
            raise RuntimeError(f"仍有PWA14运行引用：{relative}")
    for relative in PAGES_TESTS:
        source = read(relative)
        for token in [NEW_CORE, "PREVIOUS_PUBLIC_CORE_PATHS", CURRENT_PWA, PREVIOUS_PWA]:
            if token not in source:
                raise RuntimeError(f"Pages双版本契约缺少{token}：{relative}")
    for relative in WORKFLOW_CORE_FILES:
        source = read(relative)
        for token in [NEW_CORE, "80课现场动作与风险针对性"]:
            if token not in source:
                raise RuntimeError(f"工作流未审计{token}：{relative}")


def main() -> None:
    for relative in VERSION_FILES:
        sync_versions(relative)
    for relative in PAGES_TESTS:
        split_pages_core(relative)
    add_offline_browser_core()
    for relative in WORKFLOW_CORE_FILES:
        add_workflow_core(relative)
        add_stage_marker(relative)
    verify()
    print("PWA16运行针、PWA15上一公网契约和80课针对性核心资源已同步。")


if __name__ == "__main__":
    main()
