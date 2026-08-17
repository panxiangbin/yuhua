from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]

PWA_FILES = [
    'cnc/MOBILE_LEARNING_MEDIA_PROGRESS.md',
    'cnc/build-info.json',
    'cnc/pwa-self-test.html',
    'cnc/pwa-status.html',
    'cnc/sw.js',
    'cnc/tests/g10-programmable-data-input-trust-smoke.cjs',
    'cnc/tests/g28-reference-return-boundary-trust-smoke.cjs',
    'cnc/tests/g53-machine-coordinate-boundary-trust-smoke.cjs',
    'cnc/tests/g92-dual-semantic-boundary-trust-smoke.cjs',
    'cnc/tests/g94-dual-semantic-boundary-trust-smoke.cjs',
    'cnc/tests/g95-cold-offline-source-trust-smoke.cjs',
    'cnc/tests/g95-dual-semantic-boundary-trust-smoke.cjs',
    'cnc/tests/g96-g97-cold-offline-source-trust-smoke.cjs',
    'cnc/tests/g96-g97-spindle-mode-boundary-trust-smoke.cjs',
    'cnc/tests/g98-g99-cold-offline-source-trust-smoke.cjs',
    'cnc/tests/g98-g99-dual-semantic-boundary-trust-smoke.cjs',
    'cnc/tests/mobile-daily-training-plan-smoke.cjs',
    'cnc/tests/mobile-pwa-offline-cache-smoke.cjs',
    'cnc/tests/mobile-pwa-profile-bfcache-smoke.cjs',
    'cnc/tests/mobile-pwa-upgrade-data-smoke.cjs',
    'cnc/tests/mobile-training-ability-smoke.cjs',
    'cnc/tests/mobile-training-camp-foundation-smoke.cjs',
    'cnc/tests/mobile-training-profile-smoke.cjs',
    'cnc/tests/mobile-training-streak-smoke.cjs',
    'cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs',
    'cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs',
    'cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs',
    'cnc/training-profile.js',
]

PAGE_TESTS = [
    'cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs',
    'cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs',
    'cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs',
]

BUILD_CONTRACT_FILES = [
    'cnc/training-profile.js',
    'cnc/tests/mobile-daily-training-plan-smoke.cjs',
    'cnc/tests/mobile-training-ability-smoke.cjs',
    'cnc/tests/mobile-training-camp-foundation-smoke.cjs',
    'cnc/tests/mobile-training-profile-smoke.cjs',
    'cnc/tests/mobile-training-streak-smoke.cjs',
]


def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')


def write(rel, text):
    (ROOT / rel).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly one match, got {count}')
    return text.replace(old, new, 1)


changed = []
for rel in PWA_FILES:
    text = read(rel)
    original = text
    text = text.replace('20260817-pwa50', '20260817-pwa51')
    text = text.replace('20260817-learning50', '20260817-learning51')
    if rel in PAGE_TESTS:
        text = text.replace('20260817-pwa49', '20260817-pwa50')
        text = text.replace('20260817-learning49', '20260817-learning50')
    if rel in BUILD_CONTRACT_FILES:
        text = text.replace('20260817c', '20260817d')
    if text != original:
        write(rel, text)
        changed.append(rel)

profile_path = 'cnc/training-profile.js'
profile = read(profile_path)
old_practice = "function practiceNestedIssues(value){var issues=[];function add(suffix){var key=PRACTICE_KEY+suffix;if(issues.indexOf(key)===-1)issues.push(key);}function has(key){return Object.prototype.hasOwnProperty.call(value,key);}if(has('wrong')){if(!Array.isArray(value.wrong))add('.wrong:shape');else value.wrong.forEach(function(item){if(typeof item!=='string'||!item.trim())add('.wrong:entry');});}if(has('lessonScores')){if(!isPlainObject(value.lessonScores))add('.lessonScores:shape');else Object.entries(value.lessonScores).forEach(function(entry){var level=Number(entry[0]),score=entry[1];if(!Number.isInteger(level)||level<1||level>12||typeof score!=='number'||!Number.isFinite(score)||score<0||score>100)add('.lessonScores:entry');});}return issues;}"
new_practice = "function wrongRecordId(item,fallbackKey){if(typeof item==='string'){var text=item.trim();return text||null;}if(!isPlainObject(item))return null;var candidates=[item.questionId,item.id,item.key,fallbackKey];for(var i=0;i<candidates.length;i+=1){if(typeof candidates[i]==='string'&&candidates[i].trim())return candidates[i].trim();}return null;}\nfunction wrongFieldIds(value){var ids=[];if(Array.isArray(value)){value.forEach(function(item){var id=wrongRecordId(item,null);if(id)ids.push(id);});}else if(isPlainObject(value)){Object.entries(value).forEach(function(entry){var id=isPlainObject(entry[1])?wrongRecordId(entry[1],entry[0]):null;if(id)ids.push(id);});}return ids;}\nfunction practiceWrongIds(value){var ids=[];['wrongQuestions','wrongItems','wrong'].forEach(function(field){if(Object.prototype.hasOwnProperty.call(value,field))ids=ids.concat(wrongFieldIds(value[field]));});return Array.from(new Set(ids));}\nfunction wrongFieldIssues(value,field,add){if(Array.isArray(value)){value.forEach(function(item){if(!wrongRecordId(item,null))add('.'+field+':entry');});return;}if(isPlainObject(value)){Object.entries(value).forEach(function(entry){if(!isPlainObject(entry[1])||!wrongRecordId(entry[1],entry[0]))add('.'+field+':entry');});return;}add('.'+field+':shape');}\nfunction practiceNestedIssues(value){var issues=[];function add(suffix){var key=PRACTICE_KEY+suffix;if(issues.indexOf(key)===-1)issues.push(key);}function has(key){return Object.prototype.hasOwnProperty.call(value,key);}['wrongQuestions','wrongItems','wrong'].forEach(function(field){if(has(field))wrongFieldIssues(value[field],field,add);});if(has('lessonScores')){if(!isPlainObject(value.lessonScores))add('.lessonScores:shape');else Object.entries(value.lessonScores).forEach(function(entry){var level=Number(entry[0]),score=entry[1];if(!Number.isInteger(level)||level<1||level>12||typeof score!=='number'||!Number.isFinite(score)||score<0||score>100)add('.lessonScores:entry');});}return issues;}"
profile = replace_once(profile, old_practice, new_practice, 'training-profile practice compatibility')
profile = replace_once(profile, 'wrong=uniqueStrings(p.wrong);', 'wrong=practiceWrongIds(p);', 'training-profile snapshot wrong aggregation')
write(profile_path, profile)
if profile_path not in changed:
    changed.append(profile_path)

test_path = 'cnc/tests/mobile-daily-training-plan-smoke.cjs'
test = read(test_path)
anchor = "  // 练习档案根对象虽然合法，但 wrong / lessonScores 嵌套证据损坏时也必须阻断，不能静默按0错题/0分继续生成计划。\n"
compat_block = r'''  // 专项练习页历史上会把错题保存成对象记录；共享档案必须兼容三类字段并按题目ID去重，不能把合法历史数据误判成损坏。
  const compatibleWrong = await page.evaluate(() => {
    localStorage.removeItem('cnc_daily_training_plan_v1');
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({
      version: 1,
      xp: 260,
      badges: ['迈出第一步'],
      completed: [1, 2, 3],
      trainingDays: [],
      currentStreak: 0,
      bestStreak: 0,
      lastTrainingDate: null
    }));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({
      version: 1,
      gateVersion: 2,
      attempts: {},
      wrong: {
        'sc-legacy-01': { id: 'sc-legacy-01', course: '安全与坐标', title: '历史专项错题' },
        'g54-independent-check': { id: 'g54-independent-check', course: '工件坐标', title: 'G54独立检查' }
      },
      wrongItems: [{ questionId: 'av-legacy-02', title: '旧版兼容错题' }],
      wrongQuestions: [{ id: 'g54-independent-check', title: '同题重复记录' }],
      correct: [],
      lessonScores: { 1: 100, 2: 100, 3: 80, 4: 60, 5: 20, 6: 80, 7: 60, 8: 0, 9: 40, 10: 40, 11: 0, 12: 0 },
      legacyLessonScores: {}
    }));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1, 2, 3]));
    const before = {
      profile: localStorage.getItem('cnc_training_profile_v1'),
      practice: localStorage.getItem('cnc_training_practice_v1'),
      done: localStorage.getItem('cnc_study_completed_v1')
    };
    const state = window.CNC_TRAINING_PROFILE.snapshot();
    const after = {
      profile: localStorage.getItem('cnc_training_profile_v1'),
      practice: localStorage.getItem('cnc_training_practice_v1'),
      done: localStorage.getItem('cnc_study_completed_v1')
    };
    return { state, before, after };
  });
  assert.equal(compatibleWrong.state.integrity, true, '合法对象型/数组型历史错题兼容字段不能被误判为练习档案损坏');
  assert.deepEqual(compatibleWrong.state.wrongIds.slice().sort(), ['av-legacy-02', 'g54-independent-check', 'sc-legacy-01'], '三类错题字段必须按题目ID去重汇总');
  assert.equal(compatibleWrong.state.wrong, 3, '兼容错题总数必须按唯一题目ID统计');
  assert.equal(compatibleWrong.state.dailyPlan.lesson, 5, '兼容错题不得改变真实薄弱课推荐');
  assert.deepEqual(compatibleWrong.state.dailyPlan.lessonWrong, ['g54-independent-check'], '本关兼容错题必须精准回流到第5关');
  assert.equal(compatibleWrong.state.dailyPlan.steps[1].otherWrong, 2, '其它专项兼容错题只能计入全局错题，不得劫持当前课程');
  assert.deepEqual(compatibleWrong.after, compatibleWrong.before, '读取兼容错题不得改写profile/practice/done源学习数据');

'''
test = replace_once(test, anchor, compat_block + anchor, 'daily-plan compatible wrong scenario')
test = replace_once(test, "wrong: { bad: 'g54-independent-check' },", "wrong: { bad: 42 },", 'daily-plan malformed wrong fixture')
test = replace_once(test, "assert.ok(practiceIntegrity.state.issues.includes('cnc_training_practice_v1.wrong:shape'), '对象型wrong必须明确标记结构异常');", "assert.ok(practiceIntegrity.state.issues.includes('cnc_training_practice_v1.wrong:entry'), '对象型wrong中的非记录值必须明确标记条目异常');", 'daily-plan malformed wrong assertion')
write(test_path, test)
if test_path not in changed:
    changed.append(test_path)

build_info_path = 'cnc/build-info.json'
build_info = read(build_info_path)
old_stage = '共享练习档案wrong/lessonScores嵌套完整性阻断'
if old_stage not in build_info:
    raise RuntimeError('build-info contentStage anchor missing')
build_info = build_info.replace(old_stage, old_stage + '；共享练习档案三类错题兼容结构运行时一致', 1)
build_info = re.sub(r'"generatedAt":\s*"[^"]+"', '"generatedAt": "2026-08-17T18:35:00+08:00"', build_info, count=1)
write(build_info_path, build_info)

expected = set(PWA_FILES)
actual = set(changed)
missing = sorted(expected - actual)
extra = sorted(actual - expected)
if missing or extra:
    raise RuntimeError(f'changed file scope mismatch: missing={missing}, extra={extra}')

for rel in PAGE_TESTS:
    text = read(rel)
    if '20260817-pwa51' not in text or '20260817-pwa50' not in text:
        raise RuntimeError(f'{rel}: branch/current-main PWA chain missing')
    if '20260817-pwa49' in text:
        raise RuntimeError(f'{rel}: stale PWA49 current-main transition remains')

profile = read(profile_path)
for token in ['20260817d', 'practiceWrongIds', "['wrongQuestions','wrongItems','wrong']", 'wrong=practiceWrongIds(p);']:
    if token not in profile:
        raise RuntimeError(f'training-profile expected token missing: {token}')

print('通过：共享练习档案三类错题兼容结构 + PWA51 CNC运行层生成。')
print('changed files:', len(actual))
for rel in sorted(actual):
    print(rel)
