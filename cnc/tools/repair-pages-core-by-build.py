from pathlib import Path

LEARNING_PATHS = [
    './learning-sublesson-catalog.js',
    './learning-depth.css',
    './learning-detail.html',
]

SPECS = [
    {
        'path': 'cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs',
        'const': 'EXACT_CORE',
        'target': 'expectedPwaBuild',
        'old': """  if (JSON.stringify(core) !== JSON.stringify(EXACT_CORE) || new Set(core).size !== EXACT_CORE.length) {
    throw new Error(`${label}核心资源不一致：${JSON.stringify(core)}，期望${JSON.stringify(EXACT_CORE)}`);
  }""",
        'new': """  const expectedCore = expectedCoreForBuild(build, label);
  if (JSON.stringify(core) !== JSON.stringify(expectedCore) || new Set(core).size !== expectedCore.length) {
    throw new Error(`${label}核心资源不一致：${JSON.stringify(core)}，期望${JSON.stringify(expectedCore)}`);
  }""",
    },
    {
        'path': 'cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs',
        'const': 'EXACT_CORE',
        'target': 'branchTargetPwaBuild',
        'old': """  if (JSON.stringify(core) !== JSON.stringify(EXACT_CORE) || new Set(core).size !== EXACT_CORE.length) throw new Error(`${label}核心资源不一致：${JSON.stringify(core)}`);""",
        'new': """  const expectedCore = expectedCoreForBuild(build, label);
  if (JSON.stringify(core) !== JSON.stringify(expectedCore) || new Set(core).size !== expectedCore.length) throw new Error(`${label}核心资源不一致：${JSON.stringify(core)}，期望${JSON.stringify(expectedCore)}`);""",
    },
    {
        'path': 'cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs',
        'const': 'EXACT_CORE_PATHS',
        'target': 'branchTargetPwaBuild',
        'old': """  assertExactArray(actual, EXACT_CORE_PATHS, `${label}核心缓存`);""",
        'new': """  assertExactArray(actual, expectedCoreForBuild(expectedBuild, label), `${label}核心缓存`);""",
    },
]

for spec in SPECS:
    file = Path(spec['path'])
    source = file.read_text(encoding='utf-8')
    marker = f"const {spec['const']} = ["
    start = source.find(marker)
    if start < 0:
        raise SystemExit(f"{spec['path']}: core marker missing")
    end = source.find('\n];', start)
    if end < 0:
        raise SystemExit(f"{spec['path']}: core array end missing")
    insert_at = end + len('\n];')

    helper_marker = 'function expectedCoreForBuild(build, label)'
    if helper_marker not in source:
        quoted = ',\n  '.join(repr(item) for item in LEARNING_PATHS)
        helper = f"""

const LEARNING_DEPTH_CORE_PATHS = new Set([
  {quoted}
]);

function expectedCoreForBuild(build, label) {{
  if (build === {spec['target']}) return {spec['const']};
  if (build === previousPublicPwaBuild) return {spec['const']}.filter(item => !LEARNING_DEPTH_CORE_PATHS.has(item));
  throw new Error(`${{label}}出现未受控核心资源构建：${{build}}`);
}}"""
        source = source[:insert_at] + helper + source[insert_at:]

    count = source.count(spec['old'])
    if count != 1:
        raise SystemExit(f"{spec['path']}: assertion anchor count={count}")
    source = source.replace(spec['old'], spec['new'], 1)
    file.write_text(source, encoding='utf-8', newline='\n')

ai_file = Path('cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs')
ai_source = ai_file.read_text(encoding='utf-8')
status_old = """    required.push('const cacheBuildOk=staticName.includes(EXPECTED)&&runtimeName.includes(EXPECTED)');"""
status_new = """    required.push(`const EXPECTED_CACHE='${expectedCache}'`, 'const cacheBuildOk=staticName.includes(EXPECTED_CACHE)&&runtimeName.includes(EXPECTED_CACHE)');"""
self_test_old = """    required.push('const staticName=keys.find(name=>name===`cnc-static-${EXPECTED}`)', 'const runtimeName=keys.find(name=>name===`cnc-runtime-${EXPECTED}`)');"""
self_test_new = """    required.push(`const EXPECTED_CACHE='${expectedCache}'`, 'const staticName=keys.find(name=>name===`cnc-static-${EXPECTED_CACHE}`)', 'const runtimeName=keys.find(name=>name===`cnc-runtime-${EXPECTED_CACHE}`)', 'marker.cacheRevision===EXPECTED_CACHE');"""
for old, new, label in [
    (status_old, status_new, 'status-page cache contract'),
    (self_test_old, self_test_new, 'self-test cache contract'),
]:
    count = ai_source.count(old)
    if count != 1:
        raise SystemExit(f'AI Pages {label}: anchor count={count}')
    ai_source = ai_source.replace(old, new, 1)
ai_file.write_text(ai_source, encoding='utf-8', newline='\n')

for spec in SPECS:
    source = Path(spec['path']).read_text(encoding='utf-8')
    if 'function expectedCoreForBuild(build, label)' not in source:
        raise SystemExit(f"{spec['path']}: helper verification failed")
    if spec['new'] not in source:
        raise SystemExit(f"{spec['path']}: assertion verification failed")

final_ai = ai_file.read_text(encoding='utf-8')
for token in [status_new, self_test_new]:
    if token not in final_ai:
        raise SystemExit('AI Pages cache-revision verification failed')

print('Pages gates now distinguish PWA13/PWA14 core resources and cache revisions.')
