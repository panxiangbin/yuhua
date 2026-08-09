from pathlib import Path


def replace_exact(path, old, new, count=1):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    actual = text.count(old)
    if actual != count:
        raise SystemExit(f'{path}: expected {count} occurrences, found {actual}: {old!r}')
    p.write_text(text.replace(old, new), encoding='utf-8')


standard_page_tests = [
    'cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs',
    'cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs',
]
for path in standard_page_tests:
    replace_exact(
        path,
        "const PREVIOUS_PUBLIC_CORE_PATHS = EXACT_CORE.filter(item => !['./search-aliases.js', './gm-code-complete.js'].includes(item));",
        'const PREVIOUS_PUBLIC_CORE_PATHS = EXACT_CORE;'
    )
    replace_exact(
        path,
        "'T/H刀长补偿映射适用范围'",
        "'T/H刀长补偿映射适用范围','G10可编程数据写入适用范围','G/M代码首次安装离线核心','G28参考点返回适用范围'"
    )

ai_page_test = 'cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs'
replace_exact(
    ai_page_test,
    "const PREVIOUS_PUBLIC_CORE_PATHS = EXACT_CORE_PATHS.filter(item => !['./search-aliases.js', './gm-code-complete.js'].includes(item));",
    'const PREVIOUS_PUBLIC_CORE_PATHS = EXACT_CORE_PATHS;'
)
replace_exact(
    ai_page_test,
    "'T/H刀长补偿映射适用范围'",
    "'T/H刀长补偿映射适用范围','G10可编程数据写入适用范围','G/M代码首次安装离线核心','G28参考点返回适用范围'"
)

standard_page_workflows = [
    '.github/workflows/cnc-training-camp-route-handoff-pages-smoke.yml',
    '.github/workflows/cnc-beginner-placement-offline-pages-smoke.yml',
]
for path in standard_page_workflows:
    replace_exact(
        path,
        '"const PREVIOUS_PUBLIC_CORE_PATHS = EXACT_CORE.filter(item => ![\'./search-aliases.js\', \'./gm-code-complete.js\'].includes(item))"',
        "'const PREVIOUS_PUBLIC_CORE_PATHS = EXACT_CORE'"
    )

ai_page_workflow = '.github/workflows/cnc-ai-teacher-offline-core-pages-smoke.yml'
replace_exact(
    ai_page_workflow,
    '"const PREVIOUS_PUBLIC_CORE_PATHS = EXACT_CORE_PATHS.filter(item => ![\'./search-aliases.js\', \'./gm-code-complete.js\'].includes(item))"',
    "'const PREVIOUS_PUBLIC_CORE_PATHS = EXACT_CORE_PATHS'"
)

self_workflow = '.github/workflows/cnc-pwa-self-test-smoke.yml'
replace_exact(self_workflow, "'20260809-pwa28'", "'20260809-pwa29'")
replace_exact(self_workflow, "'20260809-learning28'", "'20260809-learning29'")
replace_exact(
    self_workflow,
    "            '授权人员确认'\n",
    "            '授权人员确认',\n            'G28参考点返回适用范围',\n            '高风险自动运动',\n            'G90/G91下中间位置的绝对或增量解释',\n            '当前CNC和机床厂原厂手册',\n            '完整计划运动空间',\n            '不要把G91 G28 Z0或固定“先Z后XY”当成通用防撞规则'\n"
)
replace_exact(
    self_workflow,
    "'G/M代码首次安装离线核心'])",
    "'G/M代码首次安装离线核心','G28参考点返回适用范围'])"
)

offline_workflow = '.github/workflows/cnc-pwa-offline-cache-smoke.yml'
replace_exact(offline_workflow, "'20260809-pwa28'", "'20260809-pwa29'", 2)
replace_exact(offline_workflow, "'20260809-learning28'", "'20260809-learning29'", 2)
replace_exact(
    offline_workflow,
    "            '未确认前不要上机执行',\n",
    "            '未确认前不要上机执行',\n            '高风险自动运动',\n            'G90/G91',\n            '当前CNC和机床厂原厂手册',\n            '完整计划运动空间',\n            'G28冷离线源目录缺少安全边界',\n"
)
replace_exact(
    offline_workflow,
    "'G/M代码首次安装离线核心'])",
    "'G/M代码首次安装离线核心','G28参考点返回适用范围'])"
)

upgrade_test = 'cnc/tests/mobile-pwa-upgrade-data-smoke.cjs'
insert_before = "    stage = 'cold-offline-main-learning-content-after-upgrade';\n"
g28_block = """    stage = 'cold-offline-g28-directory-after-upgrade';
    const offlineG28Trust = await page.evaluate(async () => {
      const response = await fetch('./gm-code-complete.js');
      return { ok: response.ok, text: await response.text() };
    });
    assert(offlineG28Trust.ok, '升级后G/M可信目录冷离线读取失败');
    for (const token of ['高风险自动运动', 'G90/G91', '绝对或增量解释', '当前CNC和机床厂原厂手册', '刀具', '刀柄', '工件', '夹具', '完整计划运动空间', '授权操作规程']) {
      assert(offlineG28Trust.text.includes(token), `G28冷离线源目录缺少安全边界：${token}`);
    }
    for (const forbidden of ['G28常配合G91 Z0先回Z，减少撞机。', '必须先Z后XY', 'G91 G28 Z0一定安全']) {
      assert(!offlineG28Trust.text.includes(forbidden), `G28冷离线源目录仍含无适用范围防撞表述：${forbidden}`);
    }

"""
replace_exact(upgrade_test, insert_before, g28_block + insert_before)
replace_exact(
    upgrade_test,
    '      toolOffsetMappingColdOfflineAfterUpgrade: true,\n',
    '      toolOffsetMappingColdOfflineAfterUpgrade: true,\n      g28ReferenceReturnColdOfflineAfterUpgrade: true,\n'
)

upgrade_workflow = '.github/workflows/cnc-pwa-upgrade-data-smoke.yml'
replace_exact(
    upgrade_workflow,
    "            'G28',\n",
    "            \"stage = 'cold-offline-g28-directory-after-upgrade'\",\n            'g28ReferenceReturnColdOfflineAfterUpgrade: true',\n            '高风险自动运动',\n            'G90/G91',\n            '当前CNC和机床厂原厂手册',\n            '完整计划运动空间',\n            'G28冷离线源目录缺少安全边界',\n            'G28常配合G91 Z0先回Z，减少撞机。',\n"
)
