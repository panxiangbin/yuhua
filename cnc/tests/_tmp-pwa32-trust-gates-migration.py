from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
targets = [
    'cnc/tests/g10-programmable-data-input-trust-smoke.cjs',
    'cnc/tests/g28-reference-return-boundary-trust-smoke.cjs',
    'cnc/tests/g53-machine-coordinate-boundary-trust-smoke.cjs',
    'cnc/tests/g92-dual-semantic-boundary-trust-smoke.cjs',
]

for rel in targets:
    path = ROOT / rel
    text = path.read_text(encoding='utf-8')
    original = text
    text = text.replace('20260809-pwa31', '20260810-pwa32')
    text = text.replace('20260809-learning31', '20260810-learning32')
    text = text.replace('g10-g28-g53-g92-boundary-4', 'g10-g28-g53-g92-g94-boundary-5')
    text = text.replace('G10/G28/G53/G92内容安全归一化器', 'G10/G28/G53/G92/G94内容安全归一化器')
    text = text.replace('作为第二层防御保持G10/G28/G53/G92边界一致', '作为第二层防御保持G10/G28/G53/G92/G94边界一致')
    text = text.replace('当前PWA31仍保留该边界', '当前PWA32仍保留该边界')
    text = text.replace('在PWA31首次安装离线核心中继续受保护', '在PWA32首次安装离线核心中继续受保护')
    text = text.replace('G/M离线核心已正规升级到PWA31', 'G/M离线核心已正规升级到PWA32')
    if text == original:
        raise SystemExit(f'{rel}: 没有发生预期迁移')
    for stale in ['20260809-pwa31', '20260809-learning31', 'g10-g28-g53-g92-boundary-4']:
        if stale in text:
            raise SystemExit(f'{rel}: 仍含旧契约 {stale}')
    for bypass in ['test.skip(', 'describe.skip(', 'it.skip(', 'process.exit(0)']:
        if bypass in text:
            raise SystemExit(f'{rel}: 出现门禁绕过模式 {bypass}')
    path.write_text(text, encoding='utf-8')

print('PWA32 可信度门禁契约迁移完成：')
for rel in targets:
    print('-', rel)
