#!/usr/bin/env python3
"""将旧80课分支精确整合到已验收的PWA13主线。

本脚本只处理已通过真实三方合并审计确认的12个 CNC 冲突文件。
任何冲突集合、冲突块数量或版本契约变化都会立即失败，禁止静默猜测。
"""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

FEATURE_REF = "origin/codex/learning-depth-refactor-20260805"
EXPECTED_CONFLICTS = [
    "cnc/build-info.json",
    "cnc/personal-home.js",
    "cnc/pwa-self-test.html",
    "cnc/pwa-status.html",
    "cnc/sw.js",
    "cnc/tests/main-course-catalog-drift-smoke.cjs",
    "cnc/tests/mobile-pwa-offline-cache-smoke.cjs",
    "cnc/tests/mobile-pwa-profile-bfcache-smoke.cjs",
    "cnc/tests/mobile-pwa-upgrade-data-smoke.cjs",
    "cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs",
    "cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs",
    "cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs",
]

PWA_BUILD = "20260806-pwa14"
CACHE_REVISION = "20260806-learning14"
SITE_BUILD = "20260806-learning-depth1"
PREVIOUS_PWA_BUILD = "20260804-pwa13"
PREVIOUS_CACHE_REVISION = "20260804-mobile13"

MARKER = re.compile(
    r"<<<<<<< HEAD\n(.*?)=======\n(.*?)>>>>>>> " + re.escape(FEATURE_REF) + r"\n",
    re.S,
)


def run(*args: str) -> str:
    return subprocess.check_output(args, text=True).strip()


def verify_conflicts() -> None:
    actual = sorted(
        line for line in run("git", "diff", "--name-only", "--diff-filter=U").splitlines() if line
    )
    expected = sorted(EXPECTED_CONFLICTS)
    if actual != expected:
        raise SystemExit(
            "真实冲突集合发生变化，停止自动整合：\n"
            + json.dumps({"expected": expected, "actual": actual}, ensure_ascii=False, indent=2)
        )


def resolve(path: str, replacements: list[str]) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    blocks = list(MARKER.finditer(text))
    if len(blocks) != len(replacements):
        raise SystemExit(f"{path} 冲突块数量异常：实际{len(blocks)}，预期{len(replacements)}")
    output: list[str] = []
    cursor = 0
    for block, replacement in zip(blocks, replacements):
        output.append(text[cursor : block.start()])
        output.append(replacement)
        cursor = block.end()
    output.append(text[cursor:])
    resolved = "".join(output)
    if any(marker in resolved for marker in ("<<<<<<<", "=======", ">>>>>>>")):
        raise SystemExit(f"{path} 仍残留冲突标记")
    file.write_text(resolved, encoding="utf-8")


def write_build_info() -> None:
    info = {
        "app": "cnc-training-platform",
        "name": "数控小潘 CNC随身助手",
        "build": SITE_BUILD,
        "pwaBuild": PWA_BUILD,
        "mobileBuild": "20260804-mobile-home1",
        "cacheRevision": CACHE_REVISION,
        "contentStage": (
            "课程12关 · 80个图文小课 · 第1/2关各10课 · 专项75题 · 模拟13项 · "
            "起点测评 · 起点测评关键安全门禁 · 起点测评离线核心 · 测评路线一次性交接 · "
            "手机首页一屏化 · 首绘无旧首页 · 12关学习图片 · 查询图片复用 · "
            "训练营路线离线核心 · 测评首步课程离线核心 · 正式课程开发占位清零 · "
            "AI CNC老师基础版 · AI老师现场问诊单 · AI老师判断说明 · AI老师离线核心 · "
            "AI老师问诊闭环 · AI老师学习档案异常保护 · PWA可靠性"
        ),
        "generatedAt": "2026-08-05T22:40:00.000Z",
        "source": "GitHub Pages static build marker",
        "scope": "/cnc/",
        "learningBuild": SITE_BUILD,
    }
    Path("cnc/build-info.json").write_text(
        json.dumps(info, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def resolve_personal_home() -> None:
    resolve(
        "cnc/personal-home.js",
        [
            "  var routeObserver = null;\n"
            "  var routeSyncFrame = 0;\n"
            "  var routeSyncTimer = 0;\n"
            "  var depthPromise = null;\n",
            "  window.addEventListener('hashchange', scheduleRouteSync);\n"
            "  document.addEventListener('cnc:route-changed', function () {\n"
            "    scheduleRouteSync();\n"
            "    window.setTimeout(function () {\n"
            "      primeQueryImages(document);\n"
            "      if (window.CNC_LEARNING_SUBLESSONS) renderLearningDepth(window.CNC_LEARNING_SUBLESSONS);\n"
            "    }, 0);\n"
            "  });\n",
        ],
    )


def required_offline_paths() -> list[str]:
    return [
        "./index.html",
        "./homepage-refresh.css",
        "./homepage-refresh-desktop-legacy.css",
        "./mobile-home-refactor.css",
        "./personal-home.js",
        "./learning-sublesson-catalog.js",
        "./learning-depth.css",
        "./learning-detail.html",
        "./mobile-trust-nav.js",
        "./featured-images-supplement.js",
        "./offline.html",
        "./pwa-status.html",
        "./pwa-self-test.html",
        "./pages-status.html",
        "./beginner-placement.html",
        "./training-camp.html",
        "./course-safety-foundation.html",
        "./course-coordinate-axes.html",
        "./course-g00-g01-basics.html",
        "./ai-teacher.html",
        "./ai-teacher-intake.html",
        "./ai-teacher-explainability.html",
        "./build-info.json",
        "./assets/images/batch01_core/beginner-machine-zero-vs-work-zero-001.webp",
        "./assets/images/batch02_operation_basics/machine-init-flow-001.webp",
        "./assets/images/batch04_milling_tooling/milling-process-overview-001.webp",
        "./assets/images/batch01_core/measure-reading-set-001.webp",
        "./assets/images/batch05_alarm_drawing_material/dial-indicator-detail-001.webp",
        "./assets/images/batch04_milling_tooling/vise-clamping-basic-001.webp",
        "./assets/images/batch04_milling_tooling/tool-selection-beginner-001.webp",
        "./assets/images/batch04_milling_tooling/bt-er-holder-overview-001.webp",
        "./assets/images/batch02_operation_basics/single-block-dry-run-001.webp",
        "./assets/images/batch04_milling_tooling/milling-contour-001.webp",
        "./assets/images/batch02_operation_basics/canned-cycle-overview-001.webp",
        "./assets/images/batch05_alarm_drawing_material/first-piece-inspection-001.webp",
    ]


def resolve_pwa_contracts() -> None:
    required_lines = "".join(
        f"      {json.dumps(item, ensure_ascii=False)},\n" for item in required_offline_paths()
    )
    resolve(
        "cnc/pwa-self-test.html",
        [
            f"    const EXPECTED='{PWA_BUILD}';\n"
            f"    const EXPECTED_CACHE='{CACHE_REVISION}';\n"
            "    const REQUIRED=[\n"
            f"{required_lines}"
            "    ];\n"
        ],
    )
    resolve(
        "cnc/pwa-status.html",
        [
            f'        <li>页面期望构建：<strong id="expected">{PWA_BUILD}</strong></li>\n',
            f"    const EXPECTED='{PWA_BUILD}';\n"
            f"    const EXPECTED_CACHE='{CACHE_REVISION}';\n",
        ],
    )
    resolve(
        "cnc/sw.js",
        [f"const BUILD = '{PWA_BUILD}';\nconst CACHE_REVISION = '{CACHE_REVISION}';\n"],
    )


def resolve_catalog_test() -> None:
    # 冲突块后方已有共享的右花括号，因此替换内容不得重复闭合 for 循环。
    parser = (
        "  for (const objectMatch of match[1].matchAll(/\\{([^{}]+)\\}/g)) {\n"
        "    const object = objectMatch[1];\n"
        "    const id = object.match(/\\bid\\s*:\\s*'([^']+)'/)?.[1];\n"
        "    const title = object.match(/\\btitle\\s*:\\s*'([^']+)'/)?.[1];\n"
        "    const file = object.match(/\\bfile\\s*:\\s*'([^']+)'/)?.[1];\n"
        "    const reason = object.match(/\\breason\\s*:\\s*'([^']+)'/)?.[1]\n"
        "      || object.match(/\\bcaption\\s*:\\s*'([^']+)'/)?.[1];\n"
        "    if (id && title && file && reason) entries.push({ id, title, file, reason });\n"
    )
    resolve("cnc/tests/main-course-catalog-drift-smoke.cjs", [parser])


def resolve_pwa_tests() -> None:
    build_pair = f"const PWA_BUILD = '{PWA_BUILD}';\nconst CACHE_REVISION = '{CACHE_REVISION}';\n"
    resolve("cnc/tests/mobile-pwa-offline-cache-smoke.cjs", [build_pair])
    resolve("cnc/tests/mobile-pwa-profile-bfcache-smoke.cjs", [build_pair])

    upgrade = (
        f"const CURRENT_PWA_BUILD = '{PWA_BUILD}';\n"
        f"const PREVIOUS_PWA_BUILD = '{PREVIOUS_PWA_BUILD}';\n"
        f"const CURRENT_CACHE_REVISION = '{CACHE_REVISION}';\n"
        f"const PREVIOUS_CACHE_REVISION = '{PREVIOUS_CACHE_REVISION}';\n"
        "const CURRENT_STATIC_CACHE = `cnc-static-${CURRENT_CACHE_REVISION}`;\n"
        "const CURRENT_RUNTIME_CACHE = `cnc-runtime-${CURRENT_CACHE_REVISION}`;\n"
        "const PREVIOUS_STATIC_CACHE = `cnc-static-${PREVIOUS_CACHE_REVISION}`;\n"
        "const PREVIOUS_RUNTIME_CACHE = `cnc-runtime-${PREVIOUS_CACHE_REVISION}`;\n"
    )
    resolve("cnc/tests/mobile-pwa-upgrade-data-smoke.cjs", [upgrade])

    pages_common = (
        f"const branchTargetPwaBuild = '{PWA_BUILD}';\n"
        f"const previousPublicPwaBuild = '{PREVIOUS_PWA_BUILD}';\n"
        f"const expectedSiteBuild = '{SITE_BUILD}';\n"
        "const cacheRevisionByBuild = {\n"
        f"  [branchTargetPwaBuild]: '{CACHE_REVISION}',\n"
        f"  [previousPublicPwaBuild]: '{PREVIOUS_CACHE_REVISION}'\n"
        "};\n"
    )
    resolve("cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs", [pages_common])
    resolve("cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs", [pages_common])

    training_pages = (
        f"const expectedSiteBuild = '{SITE_BUILD}';\n"
        f"const expectedPwaBuild = '{PWA_BUILD}';\n"
        f"const previousPublicPwaBuild = '{PREVIOUS_PWA_BUILD}';\n"
        "const cacheRevisionByBuild = {\n"
        f"  [expectedPwaBuild]: '{CACHE_REVISION}',\n"
        f"  [previousPublicPwaBuild]: '{PREVIOUS_CACHE_REVISION}'\n"
        "};\n"
    )
    resolve("cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs", [training_pages])


def verify_result() -> None:
    for path in EXPECTED_CONFLICTS:
        text = Path(path).read_text(encoding="utf-8")
        if any(marker in text for marker in ("<<<<<<<", "=======", ">>>>>>>")):
            raise SystemExit(f"{path} 仍有冲突标记")

    info = json.loads(Path("cnc/build-info.json").read_text(encoding="utf-8"))
    if (
        info.get("build") != SITE_BUILD
        or info.get("pwaBuild") != PWA_BUILD
        or info.get("cacheRevision") != CACHE_REVISION
    ):
        raise SystemExit("PWA14构建标记写入失败")
    stage = str(info.get("contentStage", ""))
    for token in ("80个图文小课", "AI老师学习档案异常保护", "PWA可靠性"):
        if token not in stage:
            raise SystemExit(f"内容阶段缺少：{token}")


if __name__ == "__main__":
    verify_conflicts()
    write_build_info()
    resolve_personal_home()
    resolve_pwa_contracts()
    resolve_catalog_test()
    resolve_pwa_tests()
    verify_result()
    print(
        json.dumps(
            {
                "resolvedConflicts": EXPECTED_CONFLICTS,
                "siteBuild": SITE_BUILD,
                "pwaBuild": PWA_BUILD,
                "cacheRevision": CACHE_REVISION,
            },
            ensure_ascii=False,
            indent=2,
        )
    )
