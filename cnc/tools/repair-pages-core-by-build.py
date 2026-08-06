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


def replace_once(source, old, new, path, label):
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{path}: {label} anchor count={count}')
    return source.replace(old, new, 1)


def replace_all_present(source, old, new, path, label):
    count = source.count(old)
    if count < 1:
        raise SystemExit(f'{path}: {label} anchor count={count}')
    return source.replace(old, new)


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

    source = replace_once(source, spec['old'], spec['new'], spec['path'], 'core assertion')
    file.write_text(source, encoding='utf-8', newline='\n')

ai_path = 'cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs'
ai_file = Path(ai_path)
ai_source = ai_file.read_text(encoding='utf-8')

quote_parser_old = r"""  const values = [...block.matchAll(/'([^']+)'/g)].map(match => match[1]);"""
quote_parser_new = r"""  const values = [...block.matchAll(/(['"])(.*?)\1/g)].map(match => match[2]);"""
ai_source = replace_once(ai_source, quote_parser_old, quote_parser_new, ai_path, 'quote-agnostic resource parser')

for item in [
    './beginner-placement.html',
    './training-camp.html',
    './ai-teacher.html',
    './ai-teacher-intake.html',
    './ai-teacher-explainability.html',
]:
    old = f'    "\'{item}\'",'
    new = f"    '{item}',"
    ai_source = replace_all_present(ai_source, old, new, ai_path, f'quote-agnostic token {item}')

status_old = """    required.push('const cacheBuildOk=staticName.includes(EXPECTED)&&runtimeName.includes(EXPECTED)');"""
status_new = """    required.push(`const EXPECTED_CACHE='${expectedCache}'`, 'const cacheBuildOk=staticName.includes(EXPECTED_CACHE)&&runtimeName.includes(EXPECTED_CACHE)');"""
self_test_old = """    required.push('const staticName=keys.find(name=>name===`cnc-static-${EXPECTED}`)', 'const runtimeName=keys.find(name=>name===`cnc-runtime-${EXPECTED}`)');"""
self_test_new = """    required.push(`const EXPECTED_CACHE='${expectedCache}'`, 'const staticName=keys.find(name=>name===`cnc-static-${EXPECTED_CACHE}`)', 'const runtimeName=keys.find(name=>name===`cnc-runtime-${EXPECTED_CACHE}`)', 'marker.cacheRevision===EXPECTED_CACHE');"""
for old, new, label in [
    (status_old, status_new, 'status-page cache contract'),
    (self_test_old, self_test_new, 'self-test cache contract'),
]:
    ai_source = replace_once(ai_source, old, new, ai_path, label)
ai_source = replace_once(
    ai_source,
    '    expectedPaths = LEGACY_PUBLIC_SELF_TEST_PATHS;',
    '    expectedPaths = expectedCoreForBuild(expectedBuild, label);',
    ai_path,
    'PWA13 self-test core paths',
)
ai_file.write_text(ai_source, encoding='utf-8', newline='\n')

mobile_path = 'cnc/tests/mobile-home-smoke.cjs'
mobile_file = Path(mobile_path)
mobile_source = mobile_file.read_text(encoding='utf-8')
mobile_source = replace_once(
    mobile_source,
    "window.CNC_LEARNING_SUBLESSONS.safety || ''",
    "window.CNC_LEARNING_SUBLESSONS.safetyNotice || ''",
    mobile_path,
    '80-course safety field',
)
mobile_file.write_text(mobile_source, encoding='utf-8', newline='\n')

for spec in SPECS:
    source = Path(spec['path']).read_text(encoding='utf-8')
    if 'function expectedCoreForBuild(build, label)' not in source:
        raise SystemExit(f"{spec['path']}: helper verification failed")
    if spec['new'] not in source:
        raise SystemExit(f"{spec['path']}: assertion verification failed")

final_ai = ai_file.read_text(encoding='utf-8')
for token in [
    quote_parser_new,
    status_new,
    self_test_new,
    'expectedPaths = expectedCoreForBuild(expectedBuild, label);',
]:
    if token not in final_ai:
        raise SystemExit(f'AI Pages verification failed: {token}')

for item in [
    './beginner-placement.html',
    './training-camp.html',
    './ai-teacher.html',
    './ai-teacher-intake.html',
    './ai-teacher-explainability.html',
]:
    if f"    '{item}'," not in final_ai:
        raise SystemExit(f'AI Pages quote-agnostic token verification failed: {item}')
    if f'    "\'{item}\'",' in final_ai:
        raise SystemExit(f'AI Pages quote-specific token remains: {item}')

if 'window.CNC_LEARNING_SUBLESSONS.safetyNotice' not in mobile_file.read_text(encoding='utf-8'):
    raise SystemExit('mobile 80-course safetyNotice verification failed')

print('Pages gates now distinguish PWA13/PWA14 core resources and cache revisions; quote style is normalized semantically; mobile 80-course safety field repaired.')
