from pathlib import Path
import json

CURRENT_PWA = '20260808-pwa23'
PREVIOUS_PWA = '20260808-pwa22'
NEXT_PWA = '20260808-pwa24'
CURRENT_CACHE = '20260808-learning23'
PREVIOUS_CACHE = '20260808-learning22'
NEXT_CACHE = '20260808-learning24'


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match in {path}, got {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


ai = Path('cnc/ai-teacher.html')
old_completed = "function completedCourses(study,profile,practice){const completed=new Set(asArray(study).map(stageLevel).filter(Boolean));asArray(profile.completed).map(stageLevel).filter(Boolean).forEach(level=>completed.add(level));asArray(profile.completedStages).map(stageLevel).filter(Boolean).forEach(level=>completed.add(level));for(let level=1;level<=12;level+=1){if(lessonScore(level,profile,practice)>=80)completed.add(level)}return completed;}"
new_completed = "function completedCourses(study,profile){const completed=new Set(asArray(study).map(stageLevel).filter(Boolean));asArray(profile.completed).map(stageLevel).filter(Boolean).forEach(level=>completed.add(level));asArray(profile.completedStages).map(stageLevel).filter(Boolean).forEach(level=>completed.add(level));return completed;}"
replace_once(ai, old_completed, new_completed, 'AI teacher completion semantics')

old_privacy = "主线课程完成状态以本机 <code>cnc_study_completed_v1</code> 为当前主数据源，并兼容旧 <code>cnc_training_profile_v1</code> 完成字段；同时读取 <code>cnc_training_practice_v1</code>、<code>cnc_training_simulator_v1</code> 和 <code>cnc_training_exam_v1</code>。每条建议都由公开的关键词规则和学习记录生成，并显示课程、模拟、可信度状态或证据台账入口。"
new_privacy = "主线课程完成状态以本机 <code>cnc_study_completed_v1</code> 为当前主数据源，并仅兼容旧 <code>cnc_training_profile_v1</code> 中明确记录完成的 <code>completed</code>/<code>completedStages</code> 字段；课程分数只用于能力分析和下一步建议，不能自行冒充课程完成，也不能绕过新版关键安全题门禁。同时读取 <code>cnc_training_practice_v1</code>、<code>cnc_training_simulator_v1</code> 和 <code>cnc_training_exam_v1</code>。每条建议都由公开的关键词规则和学习记录生成，并显示课程、模拟、可信度状态或证据台账入口。"
replace_once(ai, old_privacy, new_privacy, 'AI teacher privacy semantics')

test = Path('cnc/tests/mobile-ai-teacher-smoke.cjs')
source = test.read_text(encoding='utf-8')
old_practice = "version: 1,\n        lessonScores: { 5: 20 },"
new_practice = "version: 2,\n        gateVersion: 2,\n        lessonScores: { 5: 20 },"
if source.count(old_practice) != 1:
    raise SystemExit(f'mobile AI teacher practice fixture expected once, got {source.count(old_practice)}')
source = source.replace(old_practice, new_practice, 1)
marker = "    assert.equal(nextHref, './course-machine-work-offset.html');\n\n"
if source.count(marker) != 1:
    raise SystemExit('mobile AI teacher insertion marker missing or duplicated')
block = r'''    // PWA23真实80分语义：第5关即使当前有效分数达到80，或旧profile仍残留100分，只要真实完成主记录只有1-4关，AI老师就必须保持4/12并继续推荐第5关。
    await page.evaluate(() => {
      localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1, 2, 3, 4]));
      const profile = JSON.parse(localStorage.getItem('cnc_training_profile_v1'));
      profile.courseScores = { 'stage-5': 100 };
      profile.lessonScores = { 5: 100 };
      localStorage.setItem('cnc_training_profile_v1', JSON.stringify(profile));
      const practice = JSON.parse(localStorage.getItem('cnc_training_practice_v1'));
      practice.version = 2;
      practice.gateVersion = 2;
      practice.lessonScores = { 5: 80 };
      practice.wrongQuestions = [];
      localStorage.setItem('cnc_training_practice_v1', JSON.stringify(practice));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('#course-progress').textContent(), '4/12', '80分或旧100分不得冒充真实课程完成');
    const scoreOnlySummary = await page.evaluate(() => window.CNC_AI_TEACHER.getSummary());
    assert.equal(scoreOnlySummary.courses, 4);
    assert.equal(scoreOnlySummary.nextCourse, 5, '真实完成仍为1-4关时必须继续推荐第5关');

    // 只有真实完成主记录写入第5关后，AI老师才允许把主线推进为5/12并推荐第6关。
    await page.evaluate(() => localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1, 2, 3, 4, 5])));
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('#course-progress').textContent(), '5/12');
    const realCompletionSummary = await page.evaluate(() => window.CNC_AI_TEACHER.getSummary());
    assert.equal(realCompletionSummary.courses, 5);
    assert.equal(realCompletionSummary.nextCourse, 6);

    // 恢复1-4关真实完成基线，后续继续覆盖旧completedStages兼容、完整性保护与安全问答。
    await page.evaluate(() => {
      localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1, 2, 3, 4]));
      const profile = JSON.parse(localStorage.getItem('cnc_training_profile_v1'));
      profile.courseScores = { 'stage-5': 20 };
      delete profile.lessonScores;
      localStorage.setItem('cnc_training_profile_v1', JSON.stringify(profile));
      const practice = JSON.parse(localStorage.getItem('cnc_training_practice_v1'));
      practice.version = 2;
      practice.gateVersion = 2;
      practice.lessonScores = { 5: 20 };
      localStorage.setItem('cnc_training_practice_v1', JSON.stringify(practice));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

'''
test.write_text(source.replace(marker, marker + block, 1), encoding='utf-8')

# 仅迁移运行代码、测试与当前媒体进度；历史审计文档不改写。
runtime_files = []
for path in Path('cnc').rglob('*'):
    if not path.is_file():
        continue
    if 'docs' in path.parts or 'test-results' in path.parts or path == Path(__file__):
        continue
    if path.suffix.lower() not in {'.js', '.cjs', '.html', '.json'}:
        continue
    runtime_files.append(path)
runtime_files.append(Path('cnc/MOBILE_LEARNING_MEDIA_PROGRESS.md'))

for path in runtime_files:
    text = path.read_text(encoding='utf-8')
    if all(value not in text for value in (CURRENT_PWA, PREVIOUS_PWA, CURRENT_CACHE, PREVIOUS_CACHE)):
        continue
    text = text.replace(CURRENT_PWA, '__CNC_CURRENT_PWA__')
    text = text.replace(CURRENT_CACHE, '__CNC_CURRENT_CACHE__')
    text = text.replace(PREVIOUS_PWA, CURRENT_PWA)
    text = text.replace(PREVIOUS_CACHE, CURRENT_CACHE)
    text = text.replace('__CNC_CURRENT_PWA__', NEXT_PWA)
    text = text.replace('__CNC_CURRENT_CACHE__', NEXT_CACHE)
    path.write_text(text, encoding='utf-8')

info_path = Path('cnc/build-info.json')
info = json.loads(info_path.read_text(encoding='utf-8'))
stage = 'AI老师课程完成以真实完成记录为准'
if stage not in info['contentStage']:
    info['contentStage'] += f' · {stage}'
info['generatedAt'] = '2026-08-08T14:42:00Z'
info_path.write_text(json.dumps(info, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

for path in runtime_files:
    if '__CNC_CURRENT_' in path.read_text(encoding='utf-8'):
        raise SystemExit(f'PWA version placeholder leaked: {path}')

print('AI teacher completion semantics and PWA24 scoped patch prepared.')
