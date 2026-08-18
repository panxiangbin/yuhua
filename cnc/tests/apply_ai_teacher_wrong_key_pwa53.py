from pathlib import Path
import json, re
from datetime import datetime, timezone, timedelta

ROOT = Path(__file__).resolve().parents[2]
CNC = ROOT / 'cnc'
TARGET_PWA = '20260818-' + 'pwa53'
TARGET_CACHE = '20260818-' + 'learning53'
TARGET_PROFILE_BUILD = '20260817d'
TARGET_STAGE = 'AI老师兼容错题对象键历史结构'


def replace_once(path: Path, old: str, new: str, label: str):
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path.relative_to(ROOT)}: {label} expected 1 match, got {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


def bump_runtime_pins():
    build_path = CNC / 'build-info.json'
    info = json.loads(build_path.read_text(encoding='utf-8'))
    current_pwa = info['pwaBuild']
    current_cache = info['cacheRevision']
    if current_pwa == TARGET_PWA and current_cache == TARGET_CACHE:
        old_pwa, old_cache = '20260818-' + 'pwa52', '20260818-' + 'learning52'
    else:
        old_pwa, old_cache = current_pwa, current_cache
    if old_pwa == TARGET_PWA or old_cache == TARGET_CACHE:
        raise SystemExit('unexpected partial PWA53 state')

    allowed_suffixes = {'.js', '.cjs', '.html', '.json', '.md'}
    skip_parts = {'test-results'}
    for path in CNC.rglob('*'):
        if not path.is_file() or path.suffix.lower() not in allowed_suffixes:
            continue
        rel = path.relative_to(CNC)
        if any(part in skip_parts for part in rel.parts):
            continue
        if rel.as_posix() in {'tests/pwa-build-reference-audit-smoke.cjs', 'MOBILE_HOME_REFACTOR_PROGRESS.md'}:
            continue
        text = path.read_text(encoding='utf-8')
        new = text.replace(old_pwa, TARGET_PWA).replace(old_cache, TARGET_CACHE)
        if new != text:
            path.write_text(new, encoding='utf-8')

    # Three Pages deployment tests: branch target becomes PWA53, while current-main transition must point to real production PWA52.
    pages = [
        CNC / 'tests/pages-ai-teacher-offline-core-deployment-smoke.cjs',
        CNC / 'tests/pages-beginner-placement-offline-deployment-smoke.cjs',
        CNC / 'tests/pages-training-camp-route-handoff-deployment-smoke.cjs',
    ]
    for path in pages:
        text = path.read_text(encoding='utf-8')
        text, n1 = re.subn(r"const currentMainPwaBuild = '[^']+';", f"const currentMainPwaBuild = '{old_pwa}';", text, count=1)
        text, n2 = re.subn(r"\[currentMainPwaBuild\]: '[^']+'", f"[currentMainPwaBuild]: '{old_cache}'", text, count=1)
        if n1 != 1 or n2 != 1:
            raise SystemExit(f'{path.relative_to(ROOT)}: failed to set current-main transition')
        path.write_text(text, encoding='utf-8')

    info = json.loads(build_path.read_text(encoding='utf-8'))
    info['pwaBuild'] = TARGET_PWA
    info['cacheRevision'] = TARGET_CACHE
    info['generatedAt'] = datetime.now(timezone(timedelta(hours=8))).isoformat(timespec='seconds')
    stage = info.get('contentStage', '')
    if TARGET_STAGE not in stage:
        info['contentStage'] = (stage.rstrip('；') + '；' + TARGET_STAGE).strip('；')
    build_path.write_text(json.dumps(info, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def patch_ai_teacher():
    path = CNC / 'ai-teacher.html'
    old = """  function wrongQuestionId(row){return scalarText(row.questionId??row.id??row.key)}\n  function wrongSourceId(row){const hint=scalarText(row.practiceId??row.source??row.setId??row.practice??row.redoUrl).toLowerCase();const direct=PRACTICE_IDS.find(id=>hint.includes(id));if(direct)return direct;const id=wrongQuestionId(row).toLowerCase(),mapped=WRONG_SOURCE_PREFIXES.find(([prefix])=>id.startsWith(prefix));return mapped?mapped[1]:''}\n  function wrongRows(practice){const map=new Map();[...listValues(practice.wrongQuestions),...listValues(practice.wrongItems),...listValues(practice.wrong)].forEach(row=>{if(!isRecord(row))return;const source=wrongSourceId(row),id=wrongQuestionId(row);if(!source||!id)return;const key=`${source}:${id}`,previous=map.get(key)||{};map.set(key,{...previous,...row,practiceId:source,questionId:id})});return [...map.values()]}"""
    new = """  function wrongEntries(value){return Array.isArray(value)?value.map(row=>['',row]):isRecord(value)?Object.entries(value):[]}\n  function wrongQuestionId(row,fallbackKey=''){return scalarText(row.questionId??row.id??row.key??fallbackKey)}\n  function wrongSourceId(row,fallbackKey=''){const hint=scalarText(row.practiceId??row.source??row.setId??row.practice??row.redoUrl).toLowerCase();const direct=PRACTICE_IDS.find(id=>hint.includes(id));if(direct)return direct;const id=wrongQuestionId(row,fallbackKey).toLowerCase(),mapped=WRONG_SOURCE_PREFIXES.find(([prefix])=>id.startsWith(prefix));return mapped?mapped[1]:''}\n  function wrongRows(practice){const map=new Map();[...wrongEntries(practice.wrongQuestions),...wrongEntries(practice.wrongItems),...wrongEntries(practice.wrong)].forEach(([fallbackKey,row])=>{if(!isRecord(row))return;const source=wrongSourceId(row,fallbackKey),id=wrongQuestionId(row,fallbackKey);if(!source||!id)return;const key=`${source}:${id}`,previous=map.get(key)||{};map.set(key,{...previous,...row,practiceId:source,questionId:id})});return [...map.values()]}"""
    replace_once(path, old, new, 'AI teacher wrongRows block')


def patch_test():
    path = CNC / 'tests/ai-teacher-data-integrity-smoke.cjs'
    text = path.read_text(encoding='utf-8')
    old_contract = "source.includes('...listValues(practice.wrongItems)')"
    if text.count(old_contract) != 1:
        raise SystemExit(f'{path.relative_to(ROOT)}: old wrong merge contract not unique')
    text = text.replace(old_contract, "source.includes('...wrongEntries(practice.wrongItems)') && source.includes(\"wrongQuestionId(row,fallbackKey='')\")", 1)

    marker = "unique: { id: 'dsp-only'"
    pos = text.find(marker)
    if pos < 0:
        raise SystemExit(f'{path.relative_to(ROOT)}: wrongItems unique fixture marker missing')
    line_start = text.rfind('\n', 0, pos) + 1
    line_end = text.find('\n', pos)
    unique_line = text[line_start:line_end]
    if not unique_line.rstrip().endswith('}'):
        raise SystemExit('unexpected wrongItems unique fixture format')
    indent = unique_line[:len(unique_line)-len(unique_line.lstrip())]
    replacement = unique_line.rstrip() + ",\n" + indent + "keyOnly: { practiceId: 'safety-coordinate', ability: '安全基础', title: '对象键历史错题' }"
    text = text[:line_start] + replacement + text[line_end:]

    old_expect = "aiSummary?.wrong === 4 && aiWrong === '4' && reviewWrong === '4' && profileWrong === '4'"
    if text.count(old_expect) != 1:
        raise SystemExit(f'{path.relative_to(ROOT)}: wrong compatibility count expectation not unique')
    text = text.replace(old_expect, "aiSummary?.wrong === 5 && aiWrong === '5' && reviewWrong === '5' && profileWrong === '5'", 1)
    path.write_text(text, encoding='utf-8')


patch_ai_teacher()
patch_test()
bump_runtime_pins()
print('OK: AI teacher object-key compatibility and PWA53 runtime pins generated.')
