from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TARGET_PWA = '20260817-pwa51'
TARGET_CACHE = '20260817-learning51'
PREVIOUS_PWA = '20260817-pwa50'
PREVIOUS_CACHE = '20260817-learning50'

WORKFLOWS = [
    '.github/workflows/cnc-ai-teacher-offline-core-pages-smoke.yml',
    '.github/workflows/cnc-beginner-placement-offline-pages-smoke.yml',
    '.github/workflows/cnc-g95-cold-offline-source-trust-smoke.yml',
    '.github/workflows/cnc-g96-g97-cold-offline-source-trust-smoke.yml',
    '.github/workflows/cnc-g98-g99-cold-offline-source-trust-smoke.yml',
    '.github/workflows/cnc-learning-media-smoke.yml',
    '.github/workflows/cnc-pwa-offline-cache-smoke.yml',
    '.github/workflows/cnc-pwa-self-test-smoke.yml',
    '.github/workflows/cnc-pwa-upgrade-data-smoke.yml',
    '.github/workflows/cnc-training-camp-route-handoff-pages-smoke.yml',
]

changed = []
for rel in WORKFLOWS:
    path = ROOT / rel
    text = path.read_text(encoding='utf-8')
    original = text
    if PREVIOUS_PWA not in text or PREVIOUS_CACHE not in text:
        raise RuntimeError(f'{rel}: missing current PWA50 target pins')
    text = text.replace(PREVIOUS_PWA, TARGET_PWA).replace(PREVIOUS_CACHE, TARGET_CACHE)
    if text == original:
        raise RuntimeError(f'{rel}: no changes generated')
    if '20260811-pwa37' in original and '20260811-pwa37' not in text:
        raise RuntimeError(f'{rel}: controlled public PWA37 baseline changed')
    if '20260810-pwa35' in original and '20260810-pwa35' not in text:
        raise RuntimeError(f'{rel}: historical PWA35 baseline changed')
    path.write_text(text, encoding='utf-8')
    changed.append(rel)

if set(changed) != set(WORKFLOWS):
    raise RuntimeError('workflow scope mismatch')

for rel in WORKFLOWS:
    text = (ROOT / rel).read_text(encoding='utf-8')
    if TARGET_PWA not in text or TARGET_CACHE not in text:
        raise RuntimeError(f'{rel}: PWA51 target pins missing after sync')
    if PREVIOUS_PWA in text or PREVIOUS_CACHE in text:
        raise RuntimeError(f'{rel}: stale PWA50 workflow target pins remain after sync')

print('OK: 10 CNC-only workflows synced to PWA51 target pins.')
for rel in changed:
    print(rel)
