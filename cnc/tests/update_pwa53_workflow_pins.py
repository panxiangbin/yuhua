from pathlib import Path
import subprocess

TARGETS = [
    '.github/workflows/cnc-ai-teacher-offline-core-pages-smoke.yml',
    '.github/workflows/cnc-beginner-placement-offline-pages-smoke.yml',
    '.github/workflows/cnc-g98-g99-cold-offline-source-trust-smoke.yml',
    '.github/workflows/cnc-learning-media-smoke.yml',
    '.github/workflows/cnc-pwa-offline-cache-smoke.yml',
    '.github/workflows/cnc-pwa-self-test-smoke.yml',
    '.github/workflows/cnc-pwa-upgrade-data-smoke.yml',
    '.github/workflows/cnc-training-camp-route-handoff-pages-smoke.yml',
]

old_pwa = '20260818-' + 'pwa' + '52'
old_cache = '20260818-' + 'learning' + '52'
new_pwa = '20260818-pwa53'
new_cache = '20260818-learning53'

changed = []
for name in TARGETS:
    path = Path(name)
    text = path.read_text(encoding='utf-8')
    old_pwa_count = text.count(old_pwa)
    old_cache_count = text.count(old_cache)
    if old_pwa_count + old_cache_count == 0:
        raise SystemExit(f'{name}: no remaining PWA52 target pins found')
    updated = text.replace(old_pwa, new_pwa).replace(old_cache, new_cache)
    if old_pwa in updated or old_cache in updated:
        raise SystemExit(f'{name}: residual old target pin after replacement')
    path.write_text(updated, encoding='utf-8')
    changed.append((name, old_pwa_count, old_cache_count))

actual = subprocess.check_output(['git', 'diff', '--name-only'], text=True).splitlines()
if sorted(actual) != sorted(TARGETS):
    raise SystemExit(f'unexpected changed files: {actual}')

for name, pwa_count, cache_count in changed:
    print(f'{name}: pwa={pwa_count}, cache={cache_count}')
print('OK: PWA53 workflow target pins synchronized in exactly 8 remaining CNC-only workflows.')
