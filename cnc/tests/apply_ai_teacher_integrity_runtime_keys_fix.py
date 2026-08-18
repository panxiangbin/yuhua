from pathlib import Path

path = Path('cnc/ai-teacher.html')
text = path.read_text(encoding='utf-8')
anchor = """  const MANAGED_KEYS = [
    {key:'cnc_study_completed_v1',kind:'array'},
    {key:'cnc_training_profile_v1',kind:'object'},
    {key:'cnc_training_practice_v1',kind:'object'},
    {key:'cnc_training_simulator_v1',kind:'object'},
    {key:'cnc_training_exam_v1',kind:'object'}
  ];
"""
insert = anchor + """  const KEYS = Object.freeze({
    study:'cnc_study_completed_v1',
    profile:'cnc_training_profile_v1',
    practice:'cnc_training_practice_v1',
    simulator:'cnc_training_simulator_v1',
    exam:'cnc_training_exam_v1'
  });
"""
if text.count(anchor) != 1:
    raise SystemExit(f'ai-teacher.html MANAGED_KEYS anchor count={text.count(anchor)}, expected 1')
if "const KEYS = Object.freeze({\n    study:'cnc_study_completed_v1'" in text:
    raise SystemExit('ai-teacher.html integrity runtime KEYS already present')
text = text.replace(anchor, insert, 1)
path.write_text(text, encoding='utf-8')
print('PASS: injected local KEYS map into AI teacher data-integrity runtime')
