from pathlib import Path

path = Path('cnc/tests/mobile-training-achievements-smoke.cjs')
text = path.read_text(encoding='utf-8')
old = "      'cnc_study_completed_v1:entry'\n"
new = "      'cnc_study_completed_v1:entry',\n      'cnc_training_practice_v1.wrongQuestions:entry'\n"
count = text.count(old)
if count != 1:
    raise SystemExit(f'{path}: expected exactly one stale marker contract, got {count}')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('updated training achievements degraded-state expected integrity markers')
