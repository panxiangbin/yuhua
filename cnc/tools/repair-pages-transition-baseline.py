from pathlib import Path

PAGES = [
    ('cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs', 'branchTargetPwaBuild'),
    ('cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs', 'branchTargetPwaBuild'),
    ('cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs', 'expectedPwaBuild'),
]
PREVIOUS_LINE = "const previousPublicPwaBuild = '20260803-pwa9';"
CURRENT_LINE = "const currentMainPwaBuild = '20260804-pwa13';"

for path, target in PAGES:
    file = Path(path)
    source = file.read_text(encoding='utf-8')
    if CURRENT_LINE not in source:
        if source.count(PREVIOUS_LINE) != 1:
            raise SystemExit(f'{path}: previous public PWA anchor drift')
        source = source.replace(PREVIOUS_LINE, PREVIOUS_LINE + '\n' + CURRENT_LINE, 1)
    old = f'[previousPublicPwaBuild, {target}]'
    new = f'[previousPublicPwaBuild, currentMainPwaBuild, {target}]'
    if old not in source:
        raise SystemExit(f'{path}: controlled build list missing')
    source = source.replace(old, new)
    file.write_text(source, encoding='utf-8', newline='\n')

AUDIT_PATH = Path('cnc/tests/pwa-build-reference-audit-smoke.cjs')
source = AUDIT_PATH.read_text(encoding='utf-8')
marker = "file: 'cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs',\n    version: '20260804-pwa13'"
anchor = "  {\n    file: 'cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs',\n    version: '20260803-pwa9',"
additions = """  {
    file: 'cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs',
    version: '20260804-pwa13',
    reason: 'PR合并前允许读取当前main的PWA13作为受控部署过渡基线，不作为分支目标构建针'
  },
  {
    file: 'cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs',
    version: '20260804-pwa13',
    reason: 'PR合并前允许读取当前main的PWA13作为受控部署过渡基线，不作为分支目标构建针'
  },
  {
    file: 'cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs',
    version: '20260804-pwa13',
    reason: 'PR合并前允许读取当前main的PWA13作为受控部署过渡基线，不作为分支目标构建针'
  },
"""
if marker not in source:
    if source.count(anchor) != 1:
        raise SystemExit('PWA audit legacy anchor drift')
    source = source.replace(anchor, additions + anchor, 1)
AUDIT_PATH.write_text(source, encoding='utf-8', newline='\n')

for path, target in PAGES:
    source = Path(path).read_text(encoding='utf-8')
    expected = f'[previousPublicPwaBuild, currentMainPwaBuild, {target}]'
    if CURRENT_LINE not in source or expected not in source:
        raise SystemExit(f'{path}: transition repair verification failed')

print('Pages transition baseline repair prepared successfully.')
