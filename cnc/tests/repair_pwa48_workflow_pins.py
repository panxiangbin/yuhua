#!/usr/bin/env python3
from pathlib import Path
import subprocess

ORIGINAL = 'd519af3a8f63b06b5e27cf1417b81931e9da0b0f'
FILES = [
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
for name in FILES:
    source = subprocess.check_output(['git', 'show', f'{ORIGINAL}:{name}'], text=True)
    source = source.replace('20260815-pwa47', '20260817-pwa48').replace('20260815-learning47', '20260817-learning48')
    Path(name).write_text(source, encoding='utf-8')

changed = subprocess.check_output(['git','diff','--name-only'], text=True).splitlines()
if sorted(changed) != sorted(FILES):
    raise SystemExit(f'工作流修复范围异常: {changed}')
for name in FILES:
    text = Path(name).read_text(encoding='utf-8')
    if '20260815-pwa47' in text or '20260815-learning47' in text:
        raise SystemExit(f'仍残留旧构建针: {name}')
print('通过：10个CNC PWA工作流已从原始完整文件同步到PWA48。')
