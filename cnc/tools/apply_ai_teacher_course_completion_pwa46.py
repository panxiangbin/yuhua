#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OLD_PWA = '20260815-pwa45'
NEW_PWA = '20260815-pwa46'
OLD_CACHE = '20260815-learning45'
NEW_CACHE = '20260815-learning46'
OLD_MAIN_PWA = '20260813-pwa44'
NEW_MAIN_PWA = OLD_PWA
OLD_MAIN_CACHE = '20260813-learning44'
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
        raise RuntimeError(f'PWA45主动引用数量异常：{pwa_replacements}')
    if cache_replacements < 5:
        raise RuntimeError(f'learning45主动引用数量异常：{cache_replacements}')

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
        'pwa46Replacements': pwa_replacements,
        'learning46Replacements': cache_replacements,
        'mainTransitionPwaReplacements': transition_pwa,
        'mainTransitionCacheReplacements': transition_cache,
    }


def patch_ai_teacher(changed: set[str]) -> None:
    path = ROOT / 'cnc/ai-teacher.html'
    text = read(path)
    old = "function stageLevel(value){const match=String(value??'').match(/(?:stage-)?(\\d{1,2})$/i);const level=Number(match?.[1]);return level>=1&&level<=12?level:null}"
    new = "function stageLevel(value){if(typeof value==='number'&&Number.isInteger(value)&&value>=1&&value<=12)return value;if(typeof value==='string'){const match=value.match(/^stage-(\\d{1,2})$/i),level=Number(match?.[1]);if(Number.isInteger(level)&&level>=1&&level<=12)return level}return null}"
    if old not in text:
        raise RuntimeError('ai-teacher stageLevel旧实现未找到，拒绝猜测修改')
    text = text.replace(old, new, 1)
    write_if_changed(path, text, changed)


def patch_ai_teacher_test(changed: set[str]) -> None:
    path = ROOT / 'cnc/tests/ai-teacher-data-integrity-smoke.cjs'
    text = read(path)
    text = text.replace(
        "  wrongCompatCounts: null,\n  passed: false",
        "  wrongCompatCounts: null,\n  strictCompletionIdGuardDetected: false,\n  completionIdStrict: false,\n  completionIdReadOnly: false,\n  completionSummary: null,\n  passed: false",
        1,
    )
    static_anchor = "  report.strictWrongCompatibilityDetected = source.includes('...listValues(practice.wrongItems)')\n    && source.includes('const key=`${source}:${id}`')\n    && source.includes(\"const WRONG_SOURCE_PREFIXES=[['sc-','safety-coordinate']\");"
    if static_anchor not in text:
        raise RuntimeError('ai-teacher-data-integrity静态错题门禁插入点未找到')
    text = text.replace(
        static_anchor,
        static_anchor + "\n  report.strictCompletionIdGuardDetected = source.includes(\"if(typeof value==='number'&&Number.isInteger(value)&&value>=1&&value<=12)return value\")\n    && source.includes(\"value.match(/^stage-(\\\\d{1,2})$/i)\")\n    && !source.includes(\"String(value??'').match(/(?:stage-)?\");",
        1,
    )
    text = text.replace(
        "  logs.push(`三类错题兼容字段去重门禁：${report.strictWrongCompatibilityDetected}`);",
        "  logs.push(`三类错题兼容字段去重门禁：${report.strictWrongCompatibilityDetected}`);\n  logs.push(`课程完成ID严格类型门禁：${report.strictCompletionIdGuardDetected}`);",
        1,
    )
    text = text.replace(
        "    assert.equal(report.strictWrongCompatibilityDetected, true, 'AI老师必须同时读取wrongQuestions/wrongItems/wrong并按来源专项+题目ID去重');",
        "    assert.equal(report.strictWrongCompatibilityDetected, true, 'AI老师必须同时读取wrongQuestions/wrongItems/wrong并按来源专项+题目ID去重');\n    assert.equal(report.strictCompletionIdGuardDetected, true, 'AI老师课程完成ID必须只接受真实1-12整数或stage-N兼容格式，不能接受纯数字字符串');",
        1,
    )
    marker = "    await page.goto('http://127.0.0.1:4173/cnc/ai-teacher.html', { waitUntil: 'networkidle' });\n\n    const minTouch = await page.locator('a:visible,button:visible').evaluateAll(nodes => Math.min(...nodes.map(node => Math.max(node.getBoundingClientRect().height, node.getBoundingClientRect().width))));"
    if marker not in text:
        raise RuntimeError('ai-teacher-data-integrity课程完成ID场景插入点未找到')
    block = r'''    await page.goto('http://127.0.0.1:4173/cnc/ai-teacher.html', { waitUntil: 'networkidle' });

    const completionStudyRaw = JSON.stringify([1, '2', 'stage-3', 4, 99, null, [], {}]);
    const completionProfileRaw = JSON.stringify({
      version: 1,
      completed: ['5', 'stage-6', 7],
      completedStages: ['8', 'stage-9', 10]
    });
    await page.evaluate(({ studyRaw, profileRaw }) => {
      localStorage.clear();
      localStorage.setItem('cnc_study_completed_v1', studyRaw);
      localStorage.setItem('cnc_training_profile_v1', profileRaw);
      localStorage.setItem('cnc_training_practice_v1', JSON.stringify({ version: 1, wrongQuestions: [], lessonScores: {} }));
      localStorage.setItem('cnc_training_simulator_v1', JSON.stringify({ version: 1, records: {} }));
      localStorage.setItem('cnc_training_exam_v1', JSON.stringify({ version: 1 }));
      localStorage.setItem('unrelated_keep_me', '保留');
    }, { studyRaw: completionStudyRaw, profileRaw: completionProfileRaw });
    await page.reload({ waitUntil: 'networkidle' });
    const completion = await page.evaluate(() => ({
      summary: window.CNC_AI_TEACHER?.getSummary?.() || null,
      studyRaw: localStorage.getItem('cnc_study_completed_v1'),
      profileRaw: localStorage.getItem('cnc_training_profile_v1'),
      unrelated: localStorage.getItem('unrelated_keep_me'),
      alertHidden: document.getElementById('data-integrity-alert')?.hidden === true
    }));
    const completionVisible = await page.locator('#course-progress').textContent();
    report.completionSummary = { summary: completion.summary, visible: completionVisible };
    report.completionIdStrict = completion.summary?.courses === 7
      && completionVisible === '7/12'
      && completion.alertHidden === true;
    report.completionIdReadOnly = completion.studyRaw === completionStudyRaw
      && completion.profileRaw === completionProfileRaw
      && completion.unrelated === '保留';
    logs.push(`课程完成ID严格类型/旧stage-N兼容：${report.completionIdStrict}（${completionVisible}）`);
    logs.push(`课程完成ID归一化保持LocalStorage只读：${report.completionIdReadOnly}`);
    assert.equal(report.completionIdStrict, true, '纯数字字符串课程号不得冒充完成；真实数字1-12与stage-N兼容记录必须继续有效');
    assert.equal(report.completionIdReadOnly, true, '课程完成ID严格归一化不得自动修改study/profile原始LocalStorage');

    const minTouch = await page.locator('a:visible,button:visible').evaluateAll(nodes => Math.min(...nodes.map(node => Math.max(node.getBoundingClientRect().height, node.getBoundingClientRect().width))));'''
    text = text.replace(marker, block, 1)
    text = text.replace(
        "    logs.push('AI老师根损坏阻断 + 新版模拟records + 嵌套异常只读降级 + 三类错题跨页面去重一致性验收通过');",
        "    logs.push('AI老师根损坏阻断 + 新版模拟records + 嵌套异常只读降级 + 三类错题跨页面去重 + 课程完成ID严格类型验收通过');",
        1,
    )
    write_if_changed(path, text, changed)


def update_build_info(changed: set[str]) -> None:
    path = ROOT / 'cnc/build-info.json'
    data = json.loads(read(path))
    phrase = 'AI老师课程完成ID严格类型与stage-N兼容'
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
    required = {'cnc/ai-teacher.html', 'cnc/tests/ai-teacher-data-integrity-smoke.cjs', 'cnc/sw.js', 'cnc/build-info.json'}
    missing = sorted(required - changed)
    if missing:
        raise RuntimeError(f'缺少核心变更：{missing}')
    manifest = {
        'targetPwaBuild': NEW_PWA,
        'targetCacheRevision': NEW_CACHE,
        'currentMainTransitionPwaBuild': NEW_MAIN_PWA,
        'currentMainTransitionCacheRevision': NEW_MAIN_CACHE,
        'pinCounts': pin_counts,
        'changedFiles': sorted(changed),
        'changedFileCount': len(changed),
    }
    out = ROOT / 'cnc/test-results/ai-teacher-course-completion-pwa46-sync'
    out.mkdir(parents=True, exist_ok=True)
    (out / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
