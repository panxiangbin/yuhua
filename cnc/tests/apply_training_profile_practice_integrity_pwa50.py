from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
TARGET_PWA = '20260817-pwa50'
TARGET_CACHE = '20260817-learning50'
CURRENT_MAIN_PWA = '20260817-pwa49'
CURRENT_MAIN_CACHE = '20260817-learning49'
OLD_TARGET_PWA = '20260817-pwa49'
OLD_TARGET_CACHE = '20260817-learning49'
OLD_MAIN_PWA = '20260817-pwa48'
OLD_MAIN_CACHE = '20260817-learning48'


def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')


def write(rel, text):
    (ROOT / rel).write_text(text, encoding='utf-8')


def replace_once(rel, old, new):
    text = read(rel)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{rel}: expected exactly one match, got {count}: {old[:100]}')
    write(rel, text.replace(old, new, 1))


def replace_all(rel, old, new, require=False):
    text = read(rel)
    count = text.count(old)
    if require and count == 0:
        raise SystemExit(f'{rel}: expected at least one match: {old}')
    if count:
        write(rel, text.replace(old, new))
    return count


# 1) 共享训练档案：补齐 practice 嵌套完整性，并提升公开 build。
profile_path = 'cnc/training-profile.js'
text = read(profile_path)
text = text.replace("var BUILD='20260817b'", "var BUILD='20260817c'", 1)
old = "function practiceState(){var state=readState(PRACTICE_KEY);if(!state.exists)return{valid:true,value:defaultPractice(),issues:[]};var value=state.value;return state.valid&&isPlainObject(value)&&(value.version===1||value.version===2)?{valid:true,value:value,issues:[]}:{valid:false,value:null,issues:[PRACTICE_KEY]};}"
new = "function practiceNestedIssues(value){var issues=[];function add(suffix){var key=PRACTICE_KEY+suffix;if(issues.indexOf(key)===-1)issues.push(key);}function has(key){return Object.prototype.hasOwnProperty.call(value,key);}if(has('wrong')){if(!Array.isArray(value.wrong))add('.wrong:shape');else value.wrong.forEach(function(item){if(typeof item!=='string'||!item.trim())add('.wrong:entry');});}if(has('lessonScores')){if(!isPlainObject(value.lessonScores))add('.lessonScores:shape');else Object.entries(value.lessonScores).forEach(function(entry){var level=Number(entry[0]),score=entry[1];if(!Number.isInteger(level)||level<1||level>12||typeof score!=='number'||!Number.isFinite(score)||score<0||score>100)add('.lessonScores:entry');});}return issues;}\nfunction practiceState(){var state=readState(PRACTICE_KEY);if(!state.exists)return{valid:true,value:defaultPractice(),issues:[]};var value=state.value;if(!(state.valid&&isPlainObject(value)&&(value.version===1||value.version===2)))return{valid:false,value:null,issues:[PRACTICE_KEY]};var issues=practiceNestedIssues(value);return issues.length?{valid:false,value:value,issues:issues}:{valid:true,value:value,issues:[]};}"
if text.count(old) != 1:
    raise SystemExit('training-profile.js practiceState anchor drift')
text = text.replace(old, new, 1)
write(profile_path, text)

# 2) 每日训练真实 Chromium：先同步共享模块 build，再增加 practice 嵌套损坏阻断场景。
test_path = 'cnc/tests/mobile-daily-training-plan-smoke.cjs'
text = read(test_path)
text = text.replace("window.CNC_TRAINING_PROFILE?.build === '20260817b'", "window.CNC_TRAINING_PROFILE?.build === '20260817c'", 1)
marker = "  // 根级损坏不能伪装成零进度，更不能在“完成今日训练”时覆盖原始学习档案。\n"
scenario = r'''  // 练习档案根对象虽然合法，但 wrong / lessonScores 嵌套证据损坏时也必须阻断，不能静默按0错题/0分继续生成计划。
  const practiceIntegrity = await page.evaluate(() => {
    localStorage.removeItem('cnc_daily_training_plan_v1');
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({
      version: 1,
      xp: 180,
      badges: ['迈出第一步'],
      completed: [1],
      trainingDays: ['2026-08-17'],
      currentStreak: 1,
      bestStreak: 1,
      lastTrainingDate: '2026-08-17'
    }));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({
      version: 2,
      gateVersion: 2,
      attempts: {},
      wrong: { bad: 'g54-independent-check' },
      correct: [],
      lessonScores: { 1: 100, 2: '100', 13: 80, 3: 120 },
      legacyLessonScores: {}
    }));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1]));
    const before = {
      profile: localStorage.getItem('cnc_training_profile_v1'),
      practice: localStorage.getItem('cnc_training_practice_v1'),
      done: localStorage.getItem('cnc_study_completed_v1'),
      daily: localStorage.getItem('cnc_daily_training_plan_v1')
    };
    const state = window.CNC_TRAINING_PROFILE.snapshot();
    const complete = window.CNC_TRAINING_PROFILE.completeToday();
    window.CNC_TRAINING_PROFILE.render();
    const after = {
      profile: localStorage.getItem('cnc_training_profile_v1'),
      practice: localStorage.getItem('cnc_training_practice_v1'),
      done: localStorage.getItem('cnc_study_completed_v1'),
      daily: localStorage.getItem('cnc_daily_training_plan_v1')
    };
    return { state, complete, before, after };
  });
  await profileNav.click();
  await activeProfile.waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForFunction(() => document.querySelector('#view-favorites.active #xp-training-profile')?.dataset.integrity === 'blocked', null, { timeout: 10000 });
  assert.equal(practiceIntegrity.state.integrity, false, '练习档案嵌套损坏必须进入共享成长档案完整性阻断');
  assert.ok(practiceIntegrity.state.issues.includes('cnc_training_practice_v1.wrong:shape'), '对象型wrong必须明确标记结构异常');
  assert.ok(practiceIntegrity.state.issues.includes('cnc_training_practice_v1.lessonScores:entry'), '数值字符串/越界lessonScores必须明确标记条目异常');
  assert.equal(practiceIntegrity.complete.ok, false, '练习档案嵌套损坏时禁止写入今日训练完成记录');
  assert.equal(practiceIntegrity.complete.integrity, false);
  assert.deepEqual(practiceIntegrity.after, practiceIntegrity.before, '练习档案完整性阻断不得创建daily plan或改写profile/practice/done');
  assert.match(practiceIntegrity.complete.reason, /学习数据异常/);
  assert.match(await activeProfile.textContent(), /学习数据需要检查/);
  assert.match(await activeProfile.textContent(), /已暂停个性化训练/);
  assert.equal(await activeProfile.locator('[data-profile-health]').getAttribute('href'), './data-health.html');
  assert.equal(await activeProfile.locator('[data-profile-backup]').getAttribute('href'), './data-backup.html');
  const practiceRecoveryTouch = await activeProfile.locator('[data-profile-health],[data-profile-backup]').evaluateAll(nodes => Math.min(...nodes.map(node => node.getBoundingClientRect().height)));
  assert.ok(practiceRecoveryTouch >= 44, `练习档案完整性恢复入口触控高度不得小于44px：${practiceRecoveryTouch}`);
  assert.doesNotMatch(await activeProfile.textContent(), /NaN|Infinity/);

'''
if text.count(marker) != 1:
    raise SystemExit('mobile daily training root-integrity marker drift')
text = text.replace(marker, scenario + marker, 1)
write(test_path, text)

# 3) PWA50：更新所有非历史、非治理的 cnc 当前构建引用。
tracked = subprocess.check_output(['git', '-C', str(ROOT), 'ls-files', 'cnc'], text=True).splitlines()
for rel in tracked:
    if rel.startswith('cnc/docs/') or rel == 'cnc/MOBILE_HOME_REFACTOR_PROGRESS.md' or rel == 'cnc/tests/pwa-build-reference-audit-smoke.cjs':
        continue
    if Path(rel).suffix.lower() not in {'.cjs', '.js', '.html', '.json', '.md', '.yml', '.yaml'}:
        continue
    text = read(rel)
    changed = text.replace(OLD_TARGET_PWA, TARGET_PWA).replace(OLD_TARGET_CACHE, TARGET_CACHE)
    if changed != text:
        write(rel, changed)

# 三个 Pages 门禁：分支目标已经 PWA50；当前正式 main 过渡基线由 PWA48 提升为 PWA49。
pages_tests = [
    'cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs',
    'cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs',
    'cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs',
]
for rel in pages_tests:
    replace_all(rel, OLD_MAIN_PWA, CURRENT_MAIN_PWA, require=True)
    replace_all(rel, OLD_MAIN_CACHE, CURRENT_MAIN_CACHE, require=False)

# build-info 增加可审计阶段说明，并更新时间。
info_path = 'cnc/build-info.json'
text = read(info_path)
needle = '共享成长档案嵌套异常证据完整性阻断'
if needle not in text:
    raise SystemExit('build-info contentStage anchor drift')
text = text.replace(needle, needle + '；共享练习档案wrong/lessonScores嵌套完整性阻断', 1)
import re
text = re.sub(r'"generatedAt":\s*"[^"]+"', '"generatedAt": "2026-08-17T14:44:00+08:00"', text, count=1)
write(info_path, text)

# 最低限度自检：核心目标针、共享模块 build 与旧当前目标残留。
assert "const BUILD = '20260817-pwa50'" in read('cnc/sw.js')
assert "const CACHE_REVISION = '20260817-learning50'" in read('cnc/sw.js')
assert "var BUILD='20260817c'" in read(profile_path)
assert "20260817-pwa50" in read(info_path) and "20260817-learning50" in read(info_path)
for rel in pages_tests:
    source = read(rel)
    assert CURRENT_MAIN_PWA in source, f'{rel}: missing current main PWA49 transition'

print('通过：共享练习档案嵌套完整性 + PWA50 cnc/** 构建针已生成。')
