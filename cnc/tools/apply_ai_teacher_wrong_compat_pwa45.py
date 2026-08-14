#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OLD_PWA = '20260813-pwa44'
NEW_PWA = '20260815-pwa45'
OLD_CACHE = '20260813-learning44'
NEW_CACHE = '20260815-learning45'
OLD_MAIN_PWA = '20260813-pwa43'
NEW_MAIN_PWA = OLD_PWA
OLD_MAIN_CACHE = '20260813-learning43'
NEW_MAIN_CACHE = OLD_CACHE
TRANSITION_FILES = [
    ROOT / 'cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs',
    ROOT / 'cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs',
    ROOT / 'cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs',
]
TEXT_SUFFIXES = {'.cjs', '.js', '.html', '.json', '.md', '.yml', '.yaml'}


def read(path: Path) -> str:
    return path.read_text(encoding='utf-8')


def write_if_changed(path: Path, text: str, changed: set[str]) -> None:
    old = read(path)
    if old == text:
        return
    path.write_text(text, encoding='utf-8')
    changed.add(path.relative_to(ROOT).as_posix())


def operational_files() -> list[Path]:
    files: list[Path] = []
    for path in (ROOT / 'cnc').rglob('*'):
        if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        rel = path.relative_to(ROOT).as_posix()
        if rel.startswith('cnc/docs/') or rel.startswith('cnc/test-results/'):
            continue
        if rel == 'cnc/MOBILE_HOME_REFACTOR_PROGRESS.md':
            continue
        files.append(path)
    workflow_root = ROOT / '.github/workflows'
    for path in workflow_root.glob('cnc-*.y*ml'):
        if path.is_file():
            files.append(path)
    return sorted(set(files))


def sync_build_pins(changed: set[str]) -> dict[str, int]:
    pwa_replacements = 0
    cache_replacements = 0
    for path in operational_files():
        old = read(path)
        pwa_replacements += old.count(OLD_PWA)
        cache_replacements += old.count(OLD_CACHE)
        new = old.replace(OLD_PWA, NEW_PWA).replace(OLD_CACHE, NEW_CACHE)
        if new != old:
            path.write_text(new, encoding='utf-8')
            changed.add(path.relative_to(ROOT).as_posix())
    if pwa_replacements < 10:
        raise RuntimeError(f'PWA44主动引用数量异常：{pwa_replacements}')
    if cache_replacements < 5:
        raise RuntimeError(f'learning44主动引用数量异常：{cache_replacements}')

    transition_pwa = 0
    transition_cache = 0
    for path in TRANSITION_FILES:
        text = read(path)
        transition_pwa += text.count(OLD_MAIN_PWA)
        transition_cache += text.count(OLD_MAIN_CACHE)
        text = text.replace(OLD_MAIN_PWA, NEW_MAIN_PWA).replace(OLD_MAIN_CACHE, NEW_MAIN_CACHE)
        write_if_changed(path, text, changed)
    if transition_pwa != 3:
        raise RuntimeError(f'当前main过渡PWA引用应为3处，实际{transition_pwa}')
    if transition_cache != 3:
        raise RuntimeError(f'当前main过渡learning引用应为3处，实际{transition_cache}')
    return {
        'pwa45Replacements': pwa_replacements,
        'learning45Replacements': cache_replacements,
        'mainTransitionPwaReplacements': transition_pwa,
        'mainTransitionCacheReplacements': transition_cache,
    }


def patch_ai_teacher(changed: set[str]) -> None:
    path = ROOT / 'cnc/ai-teacher.html'
    text = read(path)
    old = """  function asArray(value){return Array.isArray(value)?value:[]}\n  function isRecord(value){return Boolean(value&&typeof value==='object'&&!Array.isArray(value))}\n  function wrongRows(practice){const value=practice.wrongQuestions||practice.wrong||[];const rows=Array.isArray(value)?value:isRecord(value)?Object.values(value):[];return rows.filter(isRecord)}\n"""
    new = """  function asArray(value){return Array.isArray(value)?value:[]}\n  function isRecord(value){return Boolean(value&&typeof value==='object'&&!Array.isArray(value))}\n  const PRACTICE_IDS=['safety-coordinate','advanced-verification','drawing-setup-process','program-fill-sort-debug','alarm-parameter-first-piece'];\n  const WRONG_SOURCE_PREFIXES=[['sc-','safety-coordinate'],['av-','advanced-verification'],['dsp-','drawing-setup-process'],['pfsd-','program-fill-sort-debug'],['apf-','alarm-parameter-first-piece']];\n  function listValues(value){return Array.isArray(value)?value:isRecord(value)?Object.values(value):[]}\n  function scalarText(value){return ['string','number','boolean'].includes(typeof value)?String(value).trim():''}\n  function wrongQuestionId(row){return scalarText(row.questionId??row.id??row.key)}\n  function wrongSourceId(row){const hint=scalarText(row.practiceId??row.source??row.setId??row.practice??row.redoUrl).toLowerCase();const direct=PRACTICE_IDS.find(id=>hint.includes(id));if(direct)return direct;const id=wrongQuestionId(row).toLowerCase(),mapped=WRONG_SOURCE_PREFIXES.find(([prefix])=>id.startsWith(prefix));return mapped?mapped[1]:''}\n  function wrongRows(practice){const map=new Map();[...listValues(practice.wrongQuestions),...listValues(practice.wrongItems),...listValues(practice.wrong)].forEach(row=>{if(!isRecord(row))return;const source=wrongSourceId(row),id=wrongQuestionId(row);if(!source||!id)return;const key=`${source}:${id}`,previous=map.get(key)||{};map.set(key,{...previous,...row,practiceId:source,questionId:id})});return [...map.values()]}\n"""
    if old not in text:
        raise RuntimeError('ai-teacher wrongRows旧实现未找到，拒绝猜测修改')
    text = text.replace(old, new, 1)
    write_if_changed(path, text, changed)


def patch_ai_teacher_test(changed: set[str]) -> None:
    path = ROOT / 'cnc/tests/ai-teacher-data-integrity-smoke.cjs'
    text = read(path)
    text = text.replace("  nestedNoNonFiniteText: false,\n  passed: false", "  nestedNoNonFiniteText: false,\n  wrongCompatUnified: false,\n  wrongCompatReadOnly: false,\n  wrongCompatCounts: null,\n  passed: false", 1)
    text = text.replace("    && source.includes('simulations.filter(simulationPassed).length');", "    && source.includes('simulations.filter(simulationPassed).length');\n  report.strictWrongCompatibilityDetected = source.includes('...listValues(practice.wrongItems)')\n    && source.includes('const key=`${source}:${id}`')\n    && source.includes(\"const WRONG_SOURCE_PREFIXES=[['sc-','safety-coordinate']\");", 1)
    text = text.replace("  logs.push(`嵌套数据严格归一化门禁：${report.strictNestedGuardDetected}`);", "  logs.push(`嵌套数据严格归一化门禁：${report.strictNestedGuardDetected}`);\n  logs.push(`三类错题兼容字段去重门禁：${report.strictWrongCompatibilityDetected}`);", 1)
    text = text.replace("{ id: 'valid-wrong-1', ability: '安全' }", "{ id: 'sc-valid-wrong-1', practiceId: 'safety-coordinate', ability: '安全' }")
    text = text.replace("{ id: 'valid-wrong-2', ability: '坐标' }", "{ id: 'av-valid-wrong-2', practiceId: 'advanced-verification', ability: '坐标' }")
    text = text.replace("    assert.equal(report.strictNestedGuardDetected, true, 'AI老师缺少嵌套记录/成绩或新旧模拟schema的严格归一化保护');", "    assert.equal(report.strictNestedGuardDetected, true, 'AI老师缺少嵌套记录/成绩或新旧模拟schema的严格归一化保护');\n    assert.equal(report.strictWrongCompatibilityDetected, true, 'AI老师必须同时读取wrongQuestions/wrongItems/wrong并按来源专项+题目ID去重');", 1)
    marker = "    assert.equal(report.nestedNoNonFiniteText, true, '页面不得出现NaN或Infinity污染');\n    assert.equal(consoleErrors.length, 0, consoleErrors.join('\\n'));\n\n"
    if marker not in text:
        raise RuntimeError('ai-teacher-data-integrity插入点未找到')
    block = r'''    const wrongCompatRaw = JSON.stringify({
      version: 1,
      wrongQuestions: [
        { id: 'sc-dup', practiceId: 'safety-coordinate', ability: '安全', title: '重复错题A' },
        { id: 'av-only', practiceId: 'advanced-verification', ability: '程序验证', title: '仅wrongQuestions' }
      ],
      wrongItems: {
        duplicate: { id: 'sc-dup', practiceId: 'safety-coordinate', ability: '安全', title: '重复错题A旧结构' },
        unique: { id: 'dsp-only', practiceId: 'drawing-setup-process', ability: '图纸', title: '仅wrongItems' }
      },
      wrong: [
        { id: 'sc-dup', practiceId: 'safety-coordinate', ability: '安全', title: '重复错题A更旧结构' },
        { id: 'pfsd-only', practiceId: 'program-fill-sort-debug', ability: '程序验证', title: '仅wrong' }
      ]
    });
    await page.evaluate(practiceRaw => {
      localStorage.clear();
      localStorage.setItem('cnc_study_completed_v1', '[]');
      localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ version: 1 }));
      localStorage.setItem('cnc_training_practice_v1', practiceRaw);
      localStorage.setItem('cnc_training_simulator_v1', JSON.stringify({ version: 1, records: {} }));
      localStorage.setItem('cnc_training_exam_v1', JSON.stringify({ version: 1 }));
      localStorage.setItem('unrelated_keep_me', '保留');
    }, wrongCompatRaw);
    await page.reload({ waitUntil: 'networkidle' });
    const aiWrong = await page.locator('#wrong-count').textContent();
    const aiSummary = await page.evaluate(() => window.CNC_AI_TEACHER?.getSummary?.() || null);
    await page.goto('http://127.0.0.1:4173/cnc/practice-wrong-review.html', { waitUntil: 'networkidle' });
    const reviewWrong = await page.locator('#wrong-total').textContent();
    await page.goto('http://127.0.0.1:4173/cnc/profile.html', { waitUntil: 'networkidle' });
    const profileWrong = await page.locator('#wrong-count').textContent();
    const compatAfter = await page.evaluate(() => ({
      practiceRaw: localStorage.getItem('cnc_training_practice_v1'),
      unrelated: localStorage.getItem('unrelated_keep_me')
    }));
    report.wrongCompatCounts = { aiTeacher: aiWrong, wrongReview: reviewWrong, profile: profileWrong };
    report.wrongCompatUnified = aiSummary?.wrong === 4 && aiWrong === '4' && reviewWrong === '4' && profileWrong === '4';
    report.wrongCompatReadOnly = compatAfter.practiceRaw === wrongCompatRaw && compatAfter.unrelated === '保留';
    logs.push(`AI老师/错题复习/成长档案三字段去重一致：${report.wrongCompatUnified}（${JSON.stringify(report.wrongCompatCounts)}）`);
    logs.push(`三字段去重跨页面读取保持LocalStorage只读：${report.wrongCompatReadOnly}`);
    assert.equal(report.wrongCompatUnified, true, 'AI老师必须与跨专项错题页、成长档案统一三类错题兼容字段并按来源专项+题目ID去重');
    assert.equal(report.wrongCompatReadOnly, true, '三类错题跨页面汇总不得自动清理、迁移或改写原始LocalStorage');
    await page.goto('http://127.0.0.1:4173/cnc/ai-teacher.html', { waitUntil: 'networkidle' });

'''
    text = text.replace(marker, marker + block, 1)
    text = text.replace("    logs.push('AI老师根损坏阻断 + 新版模拟records + 嵌套异常只读降级验收通过');", "    logs.push('AI老师根损坏阻断 + 新版模拟records + 嵌套异常只读降级 + 三类错题跨页面去重一致性验收通过');", 1)
    write_if_changed(path, text, changed)


def update_build_info(changed: set[str]) -> None:
    path = ROOT / 'cnc/build-info.json'
    data = json.loads(read(path))
    phrase = 'AI老师三类错题兼容字段与跨页面去重一致'
    stage = str(data.get('contentStage') or '')
    if phrase not in stage:
        data['contentStage'] = f'{stage} · {phrase}' if stage else phrase
    data['generatedAt'] = datetime.now(timezone(timedelta(hours=8))).isoformat(timespec='seconds')
    write_if_changed(path, json.dumps(data, ensure_ascii=False, indent=2) + '\n', changed)


def main() -> None:
    changed: set[str] = set()
    patch_ai_teacher(changed)
    patch_ai_teacher_test(changed)
    pin_counts = sync_build_pins(changed)
    update_build_info(changed)
    if 'cnc/ai-teacher.html' not in changed or 'cnc/tests/ai-teacher-data-integrity-smoke.cjs' not in changed:
        raise RuntimeError('AI老师实现或回归未进入变更集')
    manifest = {
        'targetPwaBuild': NEW_PWA,
        'targetCacheRevision': NEW_CACHE,
        'currentMainTransitionPwaBuild': NEW_MAIN_PWA,
        'currentMainTransitionCacheRevision': NEW_MAIN_CACHE,
        'pinCounts': pin_counts,
        'changedFiles': sorted(changed),
        'changedFileCount': len(changed),
    }
    out = ROOT / 'cnc/test-results/ai-teacher-wrong-compat-pwa45-sync'
    out.mkdir(parents=True, exist_ok=True)
    (out / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
