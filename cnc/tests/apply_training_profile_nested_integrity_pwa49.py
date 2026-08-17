from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2]
CNC = ROOT / 'cnc'

OLD_PWA = '20260817-pwa48'
NEW_PWA = '20260817-pwa49'
OLD_CACHE = '20260817-learning48'
NEW_CACHE = '20260817-learning49'
OLD_PROFILE_BUILD = '20260817a'
NEW_PROFILE_BUILD = '20260817b'
CURRENT_MAIN_OLD = '20260815-pwa47'
CURRENT_MAIN_NEW = OLD_PWA
CURRENT_MAIN_CACHE_OLD = '20260815-learning47'
CURRENT_MAIN_CACHE_NEW = OLD_CACHE


def replace_once(path: Path, old: str, new: str, label: str):
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}替换命中数必须为1：{path} count={count}')
    path.write_text(text.replace(old, new), encoding='utf-8')


def operational_cnc_files():
    allowed = {'.js', '.cjs', '.html', '.json', '.md', '.yml', '.yaml'}
    for path in CNC.rglob('*'):
        if not path.is_file() or path.suffix not in allowed:
            continue
        rel = path.relative_to(ROOT).as_posix()
        if rel.startswith('cnc/docs/') or rel == 'cnc/MOBILE_HOME_REFACTOR_PROGRESS.md':
            continue
        if rel == 'cnc/tests/pwa-build-reference-audit-smoke.cjs':
            continue
        if rel.startswith('cnc/test-results/'):
            continue
        yield path


def patch_training_profile():
    path = CNC / 'training-profile.js'
    text = path.read_text(encoding='utf-8')
    text = text.replace("var BUILD='20260817a'", "var BUILD='20260817b'", 1)

    marker = "function defaultProfile(){return{version:1,xp:0,badges:[],completed:[],trainingDays:[],currentStreak:0,bestStreak:0,lastTrainingDate:null};}\n"
    if marker not in text:
        raise RuntimeError('找不到defaultProfile插入点')
    integrity_fn = marker + "function profileNestedIssues(value){var issues=[];function add(suffix){var key=PROFILE_KEY+suffix;if(issues.indexOf(key)===-1)issues.push(key);}function has(key){return Object.prototype.hasOwnProperty.call(value,key);}if(has('xp')&&!(typeof value.xp==='number'&&Number.isFinite(value.xp)&&value.xp>=0))add('.xp:entry');if(has('currentStreak')&&!Number.isInteger(value.currentStreak)||has('currentStreak')&&value.currentStreak<0)add('.currentStreak:entry');if(has('bestStreak')&&!Number.isInteger(value.bestStreak)||has('bestStreak')&&value.bestStreak<0)add('.bestStreak:entry');if(has('lastTrainingDate')&&value.lastTrainingDate!==null&&!validDate(value.lastTrainingDate))add('.lastTrainingDate:entry');if(has('completed')){if(!Array.isArray(value.completed))add('.completed:shape');else{var completedSeen=new Set();value.completed.forEach(function(item){var id=validLessonId(item);if(id===null)add('.completed:entry');else if(completedSeen.has(id))add('.completed:duplicate');else completedSeen.add(id);});}}if(has('badges')){if(!Array.isArray(value.badges))add('.badges:shape');else{var badgeSeen=new Set();value.badges.forEach(function(item){if(typeof item!=='string'||!item.trim()){add('.badges:entry');return;}var normalized=item.trim();if(badgeSeen.has(normalized))add('.badges:duplicate');else badgeSeen.add(normalized);});}}if(has('trainingDays')){if(!Array.isArray(value.trainingDays))add('.trainingDays:shape');else{var daySeen=new Set();value.trainingDays.forEach(function(item){var day=validDate(item);if(!day){add('.trainingDays:entry');return;}if(daySeen.has(day))add('.trainingDays:duplicate');else daySeen.add(day);});}}return issues;}\n"
    text = text.replace(marker, integrity_fn, 1)

    old_profile_state = "function profileState(){var state=readState(PROFILE_KEY);if(!state.exists)return{valid:true,value:defaultProfile(),issues:[]};var value=state.value;return state.valid&&isPlainObject(value)&&value.version===1?{valid:true,value:value,issues:[]}:{valid:false,value:null,issues:[PROFILE_KEY]};}"
    new_profile_state = "function profileState(){var state=readState(PROFILE_KEY);if(!state.exists)return{valid:true,value:defaultProfile(),issues:[]};var value=state.value;if(!(state.valid&&isPlainObject(value)&&value.version===1))return{valid:false,value:null,issues:[PROFILE_KEY]};var issues=profileNestedIssues(value);return issues.length?{valid:false,value:value,issues:issues}:{valid:true,value:value,issues:[]};}"
    if old_profile_state not in text:
        raise RuntimeError('找不到profileState旧实现')
    text = text.replace(old_profile_state, new_profile_state, 1)

    old_labels = "esc(data.issues.map(function(key){return labels[key]||key;}).join('、'))"
    new_labels = "esc(Array.from(new Set(data.issues.map(function(key){return key.indexOf(PROFILE_KEY)===0?'成长档案':labels[key]||key;}))).join('、'))"
    if old_labels not in text:
        raise RuntimeError('找不到blocked issue标签渲染')
    text = text.replace(old_labels, new_labels, 1)
    path.write_text(text, encoding='utf-8')


def patch_daily_training_test():
    path = CNC / 'tests/mobile-daily-training-plan-smoke.cjs'
    text = path.read_text(encoding='utf-8')
    text = text.replace("window.CNC_TRAINING_PROFILE?.build === '20260817a'", "window.CNC_TRAINING_PROFILE?.build === '20260817b'", 1)
    start = text.index('  // 损坏/导入异常共享数据必须只读降级')
    end = text.index('  // 根级损坏不能伪装成零进度', start)
    block = r'''  // 已存在但嵌套损坏的共享成长档案必须阻断个性化计划与训练完成写入，不能先静默归一化再覆盖证据。
  const nestedIntegrity = await page.evaluate(() => {
    localStorage.removeItem('cnc_daily_training_plan_v1');
    const profile = {
      version: 1,
      xp: 360,
      badges: ['迈出第一步', ' 迈出第一步 '],
      completed: [1, 2],
      trainingDays: ['2026-08-13', '2026-08-13', '2026-02-30'],
      currentStreak: 2,
      bestStreak: 2,
      lastTrainingDate: '2026-08-13'
    };
    const practice = { version: 2, gateVersion: 2, attempts: {}, wrong: [], correct: [], lessonScores: { 1: 100, 2: 100, 3: 100 }, legacyLessonScores: {} };
    const done = [1, 2, 3];
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify(profile));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify(practice));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify(done));
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
  assert.equal(nestedIntegrity.state.integrity, false, '嵌套损坏的共享成长档案必须进入完整性阻断');
  assert.ok(nestedIntegrity.state.issues.includes('cnc_training_profile_v1.trainingDays:entry'), '非法训练日期必须明确标记');
  assert.ok(nestedIntegrity.state.issues.includes('cnc_training_profile_v1.trainingDays:duplicate'), '重复训练日期必须明确标记');
  assert.ok(nestedIntegrity.state.issues.includes('cnc_training_profile_v1.badges:duplicate'), '空白变体重复徽章必须明确标记');
  assert.equal(nestedIntegrity.complete.ok, false, '嵌套损坏档案不得写入今日训练完成记录');
  assert.equal(nestedIntegrity.complete.integrity, false);
  assert.deepEqual(nestedIntegrity.after, nestedIntegrity.before, '完整性阻断不得创建daily plan或覆盖嵌套损坏profile/practice/done');
  assert.match(nestedIntegrity.complete.reason, /学习数据异常/);
  assert.match(await activeProfile.textContent(), /学习数据需要检查/);
  assert.match(await activeProfile.textContent(), /已暂停个性化训练/);
  assert.equal(await activeProfile.locator('[data-profile-health]').getAttribute('href'), './data-health.html');
  assert.equal(await activeProfile.locator('[data-profile-backup]').getAttribute('href'), './data-backup.html');
  const nestedRecoveryTouch = await activeProfile.locator('[data-profile-health],[data-profile-backup]').evaluateAll(nodes => Math.min(...nodes.map(node => node.getBoundingClientRect().height)));
  assert.ok(nestedRecoveryTouch >= 44, `嵌套完整性恢复入口触控高度不得小于44px：${nestedRecoveryTouch}`);
  assert.doesNotMatch(await activeProfile.textContent(), /NaN|Infinity/);

'''
    text = text[:start] + block + text[end:]
    path.write_text(text, encoding='utf-8')


def patch_runtime_pins():
    # 先更新cnc运行/测试层的当前构建引用；治理脚本与历史文档不动。
    for path in operational_cnc_files():
        text = path.read_text(encoding='utf-8')
        updated = text.replace(OLD_PWA, NEW_PWA).replace(OLD_CACHE, NEW_CACHE).replace(OLD_PROFILE_BUILD, NEW_PROFILE_BUILD)
        if updated != text:
            path.write_text(updated, encoding='utf-8')

    # 三个Pages门禁中的当前main过渡基线必须由PWA47提升为真实生产PWA48。
    transition_files = [
        CNC / 'tests/pages-ai-teacher-offline-core-deployment-smoke.cjs',
        CNC / 'tests/pages-beginner-placement-offline-deployment-smoke.cjs',
        CNC / 'tests/pages-training-camp-route-handoff-deployment-smoke.cjs',
    ]
    for path in transition_files:
        text = path.read_text(encoding='utf-8')
        if CURRENT_MAIN_OLD not in text or CURRENT_MAIN_CACHE_OLD not in text:
            raise RuntimeError(f'Pages当前main过渡基线缺失：{path}')
        text = text.replace(CURRENT_MAIN_OLD, CURRENT_MAIN_NEW).replace(CURRENT_MAIN_CACHE_OLD, CURRENT_MAIN_CACHE_NEW)
        path.write_text(text, encoding='utf-8')

    info_path = CNC / 'build-info.json'
    info = json.loads(info_path.read_text(encoding='utf-8'))
    info['pwaBuild'] = NEW_PWA
    info['cacheRevision'] = NEW_CACHE
    stage = info.get('contentStage', '')
    addition = '共享成长档案嵌套异常证据完整性阻断'
    if addition not in stage:
        info['contentStage'] = stage.rstrip('；') + '；' + addition
    info['generatedAt'] = '2026-08-17T08:31:00+08:00'
    info_path.write_text(json.dumps(info, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def verify():
    profile = (CNC / 'training-profile.js').read_text(encoding='utf-8')
    test = (CNC / 'tests/mobile-daily-training-plan-smoke.cjs').read_text(encoding='utf-8')
    assert "var BUILD='20260817b'" in profile
    assert 'function profileNestedIssues(value)' in profile
    assert "trainingDays:duplicate" in test and "badges:duplicate" in test
    assert NEW_PWA in (CNC / 'build-info.json').read_text(encoding='utf-8')
    assert NEW_CACHE in (CNC / 'sw.js').read_text(encoding='utf-8')
    # 目标代码中不得继续出现旧共享档案build等待。
    operational = '\n'.join(p.read_text(encoding='utf-8') for p in operational_cnc_files())
    if OLD_PROFILE_BUILD in operational:
        raise RuntimeError('仍存在旧共享成长档案build引用20260817a')
    print('通过：共享成长档案嵌套完整性阻断 + PWA49 CNC运行层构建针生成。')


if __name__ == '__main__':
    patch_training_profile()
    patch_daily_training_test()
    patch_runtime_pins()
    verify()
