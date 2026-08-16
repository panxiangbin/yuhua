from pathlib import Path
import json
import subprocess

ROOT = Path(__file__).resolve().parents[2]
OLD_PWA = '20260815-pwa47'
NEW_PWA = '20260817-pwa48'
OLD_CACHE = '20260815-learning47'
NEW_CACHE = '20260817-learning48'
OLD_MAIN_PWA = '20260815-pwa46'
NEW_MAIN_PWA = OLD_PWA
OLD_MAIN_CACHE = '20260815-learning46'
NEW_MAIN_CACHE = OLD_CACHE
OLD_PROFILE_BUILD = '20260813c'
NEW_PROFILE_BUILD = '20260817a'

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
    'cnc/tests/mobile-pwa-offline-cache-smoke.cjs',
    'cnc/tests/mobile-pwa-profile-bfcache-smoke.cjs',
    'cnc/tests/mobile-pwa-upgrade-data-smoke.cjs',
    'cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs',
    'cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs',
    'cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs',
]
PAGE_TRANSITION_FILES = {
    'cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs',
    'cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs',
    'cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs',
}

def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')

def write(rel, text):
    (ROOT / rel).write_text(text, encoding='utf-8')

def replace_exact(rel, old, new, count=None):
    text = read(rel)
    actual = text.count(old)
    if actual == 0:
        raise SystemExit(f'{rel}: missing expected token: {old!r}')
    if count is not None and actual != count:
        raise SystemExit(f'{rel}: expected {count} occurrences, got {actual}: {old!r}')
    write(rel, text.replace(old, new))

# 1) 共享成长档案必须区分“key不存在”和“已有数据损坏”，损坏时禁止个性化计划与写入。
profile_path = 'cnc/training-profile.js'
source = read(profile_path)
if f"var BUILD='{OLD_PROFILE_BUILD}'" not in source:
    raise SystemExit('training-profile.js build marker drift')
source = source.replace(f"var BUILD='{OLD_PROFILE_BUILD}'", f"var BUILD='{NEW_PROFILE_BUILD}'", 1)
old_read = "function read(key,fallback){try{var value=JSON.parse(localStorage.getItem(key));return value==null?fallback:value;}catch(error){return fallback;}}"
new_read = old_read + "\nfunction readState(key){var raw=localStorage.getItem(key);if(raw===null)return{exists:false,valid:true,value:null};try{return{exists:true,valid:true,value:JSON.parse(raw)}}catch(error){return{exists:true,valid:false,value:null}}}"
if old_read not in source:
    raise SystemExit('training-profile.js read() contract drift')
source = source.replace(old_read, new_read, 1)
old_states = "function practice(){var value=read(PRACTICE_KEY,null);return isPlainObject(value)&&(value.version===1||value.version===2)?value:{version:2,gateVersion:2,attempts:{},wrong:[],correct:[],lessonScores:{},legacyLessonScores:{}};}\nfunction profile(){var value=read(PROFILE_KEY,null);return isPlainObject(value)&&value.version===1?value:{version:1,xp:0,badges:[],completed:[],trainingDays:[],currentStreak:0,bestStreak:0,lastTrainingDate:null};}"
new_states = "function defaultPractice(){return{version:2,gateVersion:2,attempts:{},wrong:[],correct:[],lessonScores:{},legacyLessonScores:{}};}\nfunction defaultProfile(){return{version:1,xp:0,badges:[],completed:[],trainingDays:[],currentStreak:0,bestStreak:0,lastTrainingDate:null};}\nfunction practiceState(){var state=readState(PRACTICE_KEY);if(!state.exists)return{valid:true,value:defaultPractice(),issues:[]};var value=state.value;return state.valid&&isPlainObject(value)&&(value.version===1||value.version===2)?{valid:true,value:value,issues:[]}:{valid:false,value:null,issues:[PRACTICE_KEY]};}\nfunction profileState(){var state=readState(PROFILE_KEY);if(!state.exists)return{valid:true,value:defaultProfile(),issues:[]};var value=state.value;return state.valid&&isPlainObject(value)&&value.version===1?{valid:true,value:value,issues:[]}:{valid:false,value:null,issues:[PROFILE_KEY]};}\nfunction doneState(){var state=readState(DONE_KEY);if(!state.exists)return{valid:true,value:[],issues:[]};if(!state.valid||!Array.isArray(state.value))return{valid:false,value:null,issues:[DONE_KEY]};var invalid=state.value.some(function(value){return validLessonId(value)===null;});return invalid?{valid:false,value:null,issues:[DONE_KEY]}:{valid:true,value:validLessons(state.value),issues:[]};}\nfunction integrityState(){var p=profileState(),q=practiceState(),d=doneState(),issues=[].concat(p.issues,q.issues,d.issues);return{valid:issues.length===0,issues:issues,profile:p.value,practice:q.value,done:d.value};}\nfunction practice(){var state=practiceState();return state.valid?state.value:defaultPractice();}\nfunction profile(){var state=profileState();return state.valid?state.value:defaultProfile();}"
if old_states not in source:
    raise SystemExit('training-profile.js state contract drift')
source = source.replace(old_states, new_states, 1)
old_snapshot = "function snapshot(){var p=practice(),user=normalizeProfile(profile()),done=validLessons(read(DONE_KEY,[])),scores=isPlainObject(p.lessonScores)?p.lessonScores:{};"
new_snapshot = "function blockedSnapshot(issues){return{integrity:false,issues:issues.slice(),xp:null,badges:[],completed:null,wrong:null,wrongIds:[],lessons:[],weak:[],next:null,current:null,abilities:[],weakest:null,streak:null,dailyPlan:null};}\nfunction snapshot(){var integrity=integrityState();if(!integrity.valid)return blockedSnapshot(integrity.issues);var p=integrity.practice,user=normalizeProfile(integrity.profile),done=integrity.done,scores=isPlainObject(p.lessonScores)?p.lessonScores:{};"
if old_snapshot not in source:
    raise SystemExit('training-profile.js snapshot prefix drift')
source = source.replace(old_snapshot, new_snapshot, 1)
old_data = "var data={xp:user.xp,badges:user.badges,completed:done.length,wrong:wrong.length,wrongIds:wrong.slice(),lessons:lessons,weak:weak,next:next,current:read(CURRENT_KEY,null),abilities:abilities,weakest:weakest,streak:streakSnapshot(user)};"
new_data = "var data={integrity:true,issues:[],xp:user.xp,badges:user.badges,completed:done.length,wrong:wrong.length,wrongIds:wrong.slice(),lessons:lessons,weak:weak,next:next,current:read(CURRENT_KEY,null),abilities:abilities,weakest:weakest,streak:streakSnapshot(user)};"
if old_data not in source:
    raise SystemExit('training-profile.js snapshot data drift')
source = source.replace(old_data, new_data, 1)
old_complete = "function completeToday(){var data=snapshot();if(!data.dailyPlan.passed)return{ok:false,reason:'请先把今日推荐课程练习做到80分，并完成课程通关记录'};"
new_complete = "function completeToday(){var data=snapshot();if(!data.integrity)return{ok:false,integrity:false,reason:'学习数据异常，已暂停训练完成写入；请先备份并检查学习数据'};if(!data.dailyPlan.passed)return{ok:false,reason:'请先把今日推荐课程练习做到80分，并完成课程通关记录'};"
if old_complete not in source:
    raise SystemExit('training-profile.js completeToday contract drift')
source = source.replace(old_complete, new_complete, 1)
old_render = "var data=snapshot(),weakText=data.weak.length?"
blocked_render = "var data=snapshot();if(!data.integrity){var blockedSignature=JSON.stringify(data),labels={};labels[PROFILE_KEY]='成长档案';labels[PRACTICE_KEY]='专项练习';labels[DONE_KEY]='课程完成记录';if(panel.__cncTrainingProfileSignature===blockedSignature){view.dataset.trainingProfile='blocked';return true;}panel.innerHTML='<div class=\"xp-profile-head\"><div><p class=\"xp-profile-kicker\">我的成长档案 · '+BUILD+'</p><h3>学习数据需要检查</h3><p>检测到'+esc(data.issues.map(function(key){return labels[key]||key;}).join('、'))+'无法可靠解析。为避免把损坏记录当成0进度或覆盖原数据，已暂停每日计划与训练完成写入。</p></div></div><section class=\"xp-streak-card\" aria-label=\"学习数据完整性\"><div><small>数据完整性保护</small><strong>已暂停个性化训练</strong><p>请先备份原始数据，再使用数据健康检查定位问题；页面不会自动清洗或覆盖学习记录。</p></div><div class=\"xp-streak-actions\"><a href=\"./data-health.html\" data-profile-health>检查学习数据</a><a href=\"./data-backup.html\" data-profile-backup>备份与恢复</a></div></section>';panel.__cncTrainingProfileSignature=blockedSignature;panel.dataset.integrity='blocked';view.dataset.trainingProfile='blocked';return true;}panel.dataset.integrity='ready';var weakText=data.weak.length?"
if old_render not in source:
    raise SystemExit('training-profile.js render contract drift')
source = source.replace(old_render, blocked_render, 1)
old_runcheck = "runCheck:function(){var panel=document.getElementById('xp-training-profile'),data=snapshot();return{passed:Boolean(panel&&document.querySelector('link[data-cnc-training-profile]')&&panel.querySelector('[data-training-achievements]')&&data.lessons.length===12&&data.abilities.length===6&&data.dailyPlan.steps.length===3&&data.streak),build:BUILD,lessons:data.lessons.length,abilities:data.abilities.length,completed:data.completed,wrong:data.wrong,next:data.next,weakest:data.weakest,dailyPlan:data.dailyPlan,streak:data.streak,polling:false,observer:false};}"
new_runcheck = "runCheck:function(){var panel=document.getElementById('xp-training-profile'),data=snapshot(),validReady=data.integrity&&panel&&panel.querySelector('[data-training-achievements]')&&data.lessons.length===12&&data.abilities.length===6&&data.dailyPlan&&data.dailyPlan.steps.length===3&&data.streak,blockedReady=!data.integrity&&panel&&panel.dataset.integrity==='blocked'&&panel.querySelector('[data-profile-health]')&&panel.querySelector('[data-profile-backup]');return{passed:Boolean(panel&&document.querySelector('link[data-cnc-training-profile]')&&(validReady||blockedReady)),integrity:data.integrity,issues:data.issues,build:BUILD,lessons:data.integrity?data.lessons.length:0,abilities:data.integrity?data.abilities.length:0,completed:data.completed,wrong:data.wrong,next:data.next,weakest:data.weakest,dailyPlan:data.dailyPlan,streak:data.streak,polling:false,observer:false};}"
if old_runcheck not in source:
    raise SystemExit('training-profile.js runCheck contract drift')
source = source.replace(old_runcheck, new_runcheck, 1)
write(profile_path, source)

# 2) 强化现有每日训练真实浏览器门禁：损坏根数据必须阻断写入，不能覆盖原始profile。
test_path = 'cnc/tests/mobile-daily-training-plan-smoke.cjs'
test = read(test_path)
needle = "  const report = {\n    passed: true,"
if needle not in test:
    raise SystemExit('daily training report insertion point drift')
scenario = r'''  // 根级损坏不能伪装成零进度，更不能在“完成今日训练”时覆盖原始学习档案。
  const rootIntegrity = await page.evaluate(() => {
    localStorage.removeItem('cnc_daily_training_plan_v1');
    localStorage.setItem('cnc_training_profile_v1', '{"version":1');
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({ version: 2, gateVersion: 2, attempts: {}, wrong: [], correct: [], lessonScores: { 1: 100 }, legacyLessonScores: {} }));
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
  assert.equal(rootIntegrity.state.integrity, false, '损坏profile根数据必须进入共享成长档案完整性阻断');
  assert.ok(rootIntegrity.state.issues.includes('cnc_training_profile_v1'));
  assert.equal(rootIntegrity.complete.ok, false, '损坏学习档案时禁止写入今日训练完成记录');
  assert.equal(rootIntegrity.complete.integrity, false);
  assert.deepEqual(rootIntegrity.after, rootIntegrity.before, '完整性阻断不得创建daily plan或覆盖损坏profile/practice/done');
  assert.match(rootIntegrity.complete.reason, /学习数据异常/);
  const blockedPanel = activeProfile.locator('#xp-training-profile');
  assert.match(await blockedPanel.textContent(), /学习数据需要检查/);
  assert.match(await blockedPanel.textContent(), /已暂停个性化训练/);
  assert.equal(await blockedPanel.locator('[data-profile-health]').getAttribute('href'), './data-health.html');
  assert.equal(await blockedPanel.locator('[data-profile-backup]').getAttribute('href'), './data-backup.html');
  const recoveryTouch = await blockedPanel.locator('[data-profile-health],[data-profile-backup]').evaluateAll(nodes => Math.min(...nodes.map(node => node.getBoundingClientRect().height)));
  assert.ok(recoveryTouch >= 44, `完整性恢复入口触控高度不得小于44px：${recoveryTouch}`);
  assert.doesNotMatch(await blockedPanel.textContent(), /NaN|Infinity/);

'''
test = test.replace(needle, scenario + needle, 1)
write(test_path, test)

# 3) 同步共享成长档案公开build契约（只改真实引用）。
changed_build = []
for path in (ROOT / 'cnc').rglob('*'):
    if not path.is_file() or path.suffix.lower() not in {'.js', '.cjs', '.html'}:
        continue
    rel = path.relative_to(ROOT).as_posix()
    text = path.read_text(encoding='utf-8')
    if OLD_PROFILE_BUILD in text:
        path.write_text(text.replace(OLD_PROFILE_BUILD, NEW_PROFILE_BUILD), encoding='utf-8')
        changed_build.append(rel)
if profile_path not in changed_build:
    # training-profile.js 已经在上面先替换，所以仍应计入受控范围。
    changed_build.append(profile_path)

# 4) 同步所有“当前构建”非workflow PWA针；三项Pages门禁同时把当前main过渡基线推进到PWA47。
for rel in PWA_FILES:
    text = read(rel)
    if OLD_PWA not in text and OLD_CACHE not in text:
        raise SystemExit(f'{rel}: missing PWA47/learning47 active pin')
    text = text.replace(OLD_PWA, NEW_PWA).replace(OLD_CACHE, NEW_CACHE)
    if rel in PAGE_TRANSITION_FILES:
        if OLD_MAIN_PWA not in text or OLD_MAIN_CACHE not in text:
            raise SystemExit(f'{rel}: missing PWA46 current-main transition pin')
        text = text.replace(OLD_MAIN_PWA, NEW_MAIN_PWA).replace(OLD_MAIN_CACHE, NEW_MAIN_CACHE)
    write(rel, text)

# build-info记录本轮真实内容阶段，不改变站点主build。
info_path = ROOT / 'cnc/build-info.json'
info = json.loads(info_path.read_text(encoding='utf-8'))
if info.get('pwaBuild') != NEW_PWA or info.get('cacheRevision') != NEW_CACHE:
    raise SystemExit('build-info PWA48 sync failed')
stage = str(info.get('contentStage') or '')
marker = '共享成长档案根数据完整性阻断'
if marker not in stage:
    info['contentStage'] = (stage + '；' + marker).strip('；')
info_path.write_text(json.dumps(info, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

# 5) 语法与范围自检。workflow针将在下一步由受信任写入者统一提交后跑中央PWA审计。
subprocess.run(['node', '--check', 'cnc/training-profile.js'], cwd=ROOT, check=True)
subprocess.run(['node', '--check', 'cnc/tests/mobile-daily-training-plan-smoke.cjs'], cwd=ROOT, check=True)

# 临时脚本本身不进入生成commit。
subprocess.run(['git', 'rm', '--', 'cnc/tests/apply_training_profile_root_integrity_pwa48.py'], cwd=ROOT, check=True)
subprocess.run(['git', 'add', '--', 'cnc'], cwd=ROOT, check=True)
status = subprocess.check_output(['git', 'status', '--short'], cwd=ROOT, text=True)
for line in status.splitlines():
    path = line[3:]
    if not path.startswith('cnc/'):
        raise SystemExit(f'out-of-scope generated path: {path}')
subprocess.run(['git', 'commit', '-m', 'CNC：阻断共享成长档案根数据覆盖并同步PWA48'], cwd=ROOT, check=True)
print(subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip())
print(subprocess.check_output(['git', 'show', '--stat', '--oneline', '--decorate=no', 'HEAD'], cwd=ROOT, text=True))
