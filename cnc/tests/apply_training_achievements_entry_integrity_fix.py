from pathlib import Path

HTML = Path('cnc/training-achievements.html')
MAIN_TEST = Path('cnc/tests/mobile-training-achievements-smoke.cjs')
SHAPE_TEST = Path('cnc/tests/mobile-training-achievements-profile-shape-smoke.cjs')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label} 预期唯一匹配，实际 {count}')
    return text.replace(old, new, 1)

html = HTML.read_text(encoding='utf-8')
old_days = "function validDays(profile){if(profile.trainingDays===undefined)return[];if(!Array.isArray(profile.trainingDays)){trainingDaysShapeValid=false;invalid.push('cnc_training_profile_v1.trainingDays');return[];}var set=new Set();profile.trainingDays.forEach(function(v){var day=validDay(v);if(day)set.add(day);});return Array.from(set);}"
new_days = "function validDays(profile){if(profile.trainingDays===undefined)return[];if(!Array.isArray(profile.trainingDays)){trainingDaysShapeValid=false;invalid.push('cnc_training_profile_v1.trainingDays');return[];}var set=new Set(),entryInvalid=false,duplicate=false;profile.trainingDays.forEach(function(v){var day=validDay(v);if(!day){entryInvalid=true;return;}if(set.has(day))duplicate=true;set.add(day);});if(entryInvalid)invalid.push('cnc_training_profile_v1.trainingDays:entry');if(duplicate)invalid.push('cnc_training_profile_v1.trainingDays:duplicate');return Array.from(set);}"
html = replace_once(html, old_days, new_days, 'trainingDays 完整性逻辑')
old_badges = "function validBadges(profile){if(profile.badges===undefined)return[];if(!Array.isArray(profile.badges)){badgesShapeValid=false;invalid.push('cnc_training_profile_v1.badges');return[];}var set=new Set();profile.badges.forEach(function(v){if(typeof v==='string'&&v.trim())set.add(v.trim());});return Array.from(set);}"
new_badges = "function validBadges(profile){if(profile.badges===undefined)return[];if(!Array.isArray(profile.badges)){badgesShapeValid=false;invalid.push('cnc_training_profile_v1.badges');return[];}var set=new Set(),entryInvalid=false,duplicate=false;profile.badges.forEach(function(v){if(typeof v!=='string'||!v.trim()){entryInvalid=true;return;}var badge=v.trim();if(set.has(badge))duplicate=true;set.add(badge);});if(entryInvalid)invalid.push('cnc_training_profile_v1.badges:entry');if(duplicate)invalid.push('cnc_training_profile_v1.badges:duplicate');return Array.from(set);}"
html = replace_once(html, old_badges, new_badges, 'badges 完整性逻辑')
HTML.write_text(html, encoding='utf-8')

main_test = MAIN_TEST.read_text(encoding='utf-8')
old_invalid = "    invalid: ['cnc_study_completed_v1:entry'],"
new_invalid = "    invalid: [\n      'cnc_training_profile_v1.trainingDays:entry',\n      'cnc_training_profile_v1.trainingDays:duplicate',\n      'cnc_training_profile_v1.badges:entry',\n      'cnc_training_profile_v1.badges:duplicate',\n      'cnc_study_completed_v1:entry'\n    ],"
main_test = replace_once(main_test, old_invalid, new_invalid, '主回归异常来源期望')
MAIN_TEST.write_text(main_test, encoding='utf-8')

shape_test = SHAPE_TEST.read_text(encoding='utf-8')
marker = "  const report = { passed: true, snapshot, overflow, readOnly: true, errors, consoleErrors };"
scenario = r'''  // 根结构合法但训练日/徽章条目损坏或重复时，也必须阻断个性化路线；可确认统计继续展示且原始数据只读。
  const entryBefore = await page.evaluate(() => {
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({
      version: 1,
      currentStreak: 7,
      trainingDays: ['2026-08-15', '2026-08-15', '2026-02-30', null],
      badges: ['连续训练3天', ' 连续训练3天 ', null, {}]
    }));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1, 2, 3]));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({ version: 1 }));
    localStorage.setItem('cnc_training_simulator_v1', JSON.stringify({ version: 1 }));
    const keys = ['cnc_training_profile_v1', 'cnc_study_completed_v1', 'cnc_training_practice_v1', 'cnc_training_simulator_v1'];
    return Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)]));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.CNC_TRAINING_ACHIEVEMENTS?.build === '20260808a', null, { timeout: 15000 });
  await page.locator('#data-integrity').waitFor({ state: 'visible', timeout: 10000 });

  const entrySnapshot = await page.evaluate(() => window.CNC_TRAINING_ACHIEVEMENTS.snapshot());
  assert.equal(entrySnapshot.integrity, false);
  assert.equal(entrySnapshot.courses, 3);
  assert.equal(entrySnapshot.streak, 7);
  assert.equal(entrySnapshot.days, 1);
  assert.equal(entrySnapshot.badges, 1);
  assert.equal(entrySnapshot.nextKind, 'integrity');
  assert.ok(entrySnapshot.invalid.includes('cnc_training_profile_v1.trainingDays:entry'));
  assert.ok(entrySnapshot.invalid.includes('cnc_training_profile_v1.trainingDays:duplicate'));
  assert.ok(entrySnapshot.invalid.includes('cnc_training_profile_v1.badges:entry'));
  assert.ok(entrySnapshot.invalid.includes('cnc_training_profile_v1.badges:duplicate'));
  assert.equal(await page.locator('#courses').textContent(), '3/12');
  assert.equal(await page.locator('#streak').textContent(), '7');
  assert.equal(await page.locator('#days').textContent(), '1');
  assert.equal(await page.locator('#badges').textContent(), '1');
  assert.match(await page.locator('#next-title').textContent(), /检查学习数据/);
  assert.match(await page.locator('#data-integrity-copy').textContent(), /trainingDays:entry/);
  assert.match(await page.locator('#data-integrity-copy').textContent(), /trainingDays:duplicate/);
  assert.match(await page.locator('#data-integrity-copy').textContent(), /badges:entry/);
  assert.match(await page.locator('#data-integrity-copy').textContent(), /badges:duplicate/);
  const entryAfter = await page.evaluate(() => {
    const keys = ['cnc_training_profile_v1', 'cnc_study_completed_v1', 'cnc_training_practice_v1', 'cnc_training_simulator_v1'];
    return Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)]));
  });
  assert.deepEqual(entryAfter, entryBefore, '成长成果页不得修改嵌套条目异常或重复的学习数据');
  assert.doesNotMatch(await page.locator('body').textContent(), /NaN|Infinity/);
  assert.deepEqual(errors, []);
  assert.deepEqual(consoleErrors, []);

  const report = { passed: true, snapshot, entrySnapshot, overflow, readOnly: true, errors, consoleErrors };'''
shape_test = replace_once(shape_test, marker, scenario, '嵌套条目回归插入点')
SHAPE_TEST.write_text(shape_test, encoding='utf-8')

print('patched', HTML, MAIN_TEST, SHAPE_TEST)
