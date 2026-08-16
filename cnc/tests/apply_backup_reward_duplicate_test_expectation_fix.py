from pathlib import Path

path = Path('cnc/tests/mobile-data-backup-history-migration-smoke.cjs')
text = path.read_text(encoding='utf-8')
old = "assert.deepEqual(preserved.completed,[7,8])"
new = "assert.deepEqual(preserved.completed,[9,10])"
count = text.count(old)
if count == 0:
    if new in text:
        print('already fixed')
        raise SystemExit(0)
    raise SystemExit('expected stale assertion not found')
if count != 1:
    raise SystemExit(f'unexpected stale assertion count: {count}')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('updated preserved completed expectation to [9,10]')
