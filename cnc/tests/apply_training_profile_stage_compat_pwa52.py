from pathlib import Path
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
CNC = ROOT / 'cnc'
OLD_PWA = '20260817-pwa51'
NEW_PWA = '20260818-pwa52'
OLD_CACHE = '20260817-learning51'
NEW_CACHE = '20260818-learning52'
OLD_MODULE_BUILD = '20260817d'
NEW_MODULE_BUILD = '20260818a'
CURRENT_MAIN_OLD_PWA = '20260817-pwa50'
CURRENT_MAIN_NEW_PWA = OLD_PWA
CURRENT_MAIN_OLD_CACHE = '20260817-learning50'
CURRENT_MAIN_NEW_CACHE = OLD_CACHE
PAGES_TESTS = [
    'cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs',
    'cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs',
    'cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs',
]


def write(path: Path, text: str):
    path.write_text(text, encoding='utf-8')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly one match, got {count}')
    return text.replace(old, new, 1)


def patch_training_profile():
    path = CNC / 'training-profile.js'
    text = path.read_text(encoding='utf-8')
    text = replace_once(text, "var BUILD='20260817d'", "var BUILD='20260818a'", 'training-profile BUILD')
    anchor = "function validLessonId(value){return Number.isInteger(value)&&value>=1&&value<=12?value:null;}\n"
    helper = anchor + "function stageLevel(value){var direct=validLessonId(value);if(direct!==null)return direct;if(typeof value==='string'){var match=value.match(/^stage-(\\d{1,2})$/i),level=Number(match&&match[1]);if(Number.isInteger(level)&&level>=1&&level<=12)return level;}return null;}\n"
    text = replace_once(text, anchor, helper, 'stageLevel helper')
    text = replace_once(text, "function validLessons(value){return Array.isArray(value)?Array.from(new Set(value.map(validLessonId).filter(Boolean))):[];}", "function validLessons(value){return Array.isArray(value)?Array.from(new Set(value.map(stageLevel).filter(Boolean))):[];}", 'validLessons stage compatibility')

    pattern = re.compile(r"function profileNestedIssues\(value\)\{.*?\}\nfunction wrongRecordId", re.S)
    replacement = """function profileNestedIssues(value){var issues=[];function add(suffix){var key=PROFILE_KEY+suffix;if(issues.indexOf(key)===-1)issues.push(key);}function has(key){return Object.prototype.hasOwnProperty.call(value,key);}function inspectCompleted(field){if(!has(field))return;if(!Array.isArray(value[field])){add('.'+field+':shape');return;}var seen=new Set();value[field].forEach(function(item){var id=stageLevel(item);if(id===null)add('.'+field+':entry');else if(seen.has(id))add('.'+field+':duplicate');else seen.add(id);});}if(has('xp')&&!(typeof value.xp==='number'&&Number.isFinite(value.xp)&&value.xp>=0))add('.xp:entry');if(has('currentStreak')&&(!Number.isInteger(value.currentStreak)||value.currentStreak<0))add('.currentStreak:entry');if(has('bestStreak')&&(!Number.isInteger(value.bestStreak)||value.bestStreak<0))add('.bestStreak:entry');if(has('lastTrainingDate')&&value.lastTrainingDate!==null&&!validDate(value.lastTrainingDate))add('.lastTrainingDate:entry');inspectCompleted('completed');inspectCompleted('completedStages');if(has('badges')){if(!Array.isArray(value.badges))add('.badges:shape');else{var badgeSeen=new Set();value.badges.forEach(function(item){if(typeof item!=='string'||!item.trim()){add('.badges:entry');return;}var normalized=item.trim();if(badgeSeen.has(normalized))add('.badges:duplicate');else badgeSeen.add(normalized);});}}if(has('trainingDays')){if(!Array.isArray(value.trainingDays))add('.trainingDays:shape');else{var daySeen=new Set();value.trainingDays.forEach(function(item){var day=validDate(item);if(!day){add('.trainingDays:entry');return;}if(daySeen.has(day))add('.trainingDays:duplicate');else daySeen.add(day);});}}return issues;}
function wrongRecordId"""
    text, count = pattern.subn(replacement, text, count=1)
    if count != 1:
        raise RuntimeError(f'profileNestedIssues replacement count={count}')

    pattern = re.compile(r"function doneState\(\)\{.*?\}\nfunction integrityState\(\)\{.*?\}\n", re.S)
    replacement = """function legacyDoneLessons(profileValue){if(!isPlainObject(profileValue))return[];var rows=[];['completed','completedStages'].forEach(function(field){if(Array.isArray(profileValue[field]))rows=rows.concat(profileValue[field]);});return Array.from(new Set(rows.map(stageLevel).filter(Boolean)));}
function doneState(profileValue){var state=readState(DONE_KEY);if(!state.exists)return{valid:true,value:legacyDoneLessons(profileValue),issues:[]};if(!state.valid||!Array.isArray(state.value))return{valid:false,value:null,issues:[DONE_KEY]};var invalid=state.value.some(function(value){return stageLevel(value)===null;});return invalid?{valid:false,value:null,issues:[DONE_KEY]}:{valid:true,value:Array.from(new Set(state.value.map(stageLevel).filter(Boolean))),issues:[]};}
function integrityState(){var p=profileState(),q=practiceState(),d=doneState(p.value),issues=[].concat(p.issues,q.issues,d.issues);return{valid:issues.length===0,issues:issues,profile:p.value,practice:q.value,done:d.value};}
"""
    text, count = pattern.subn(replacement, text, count=1)
    if count != 1:
        raise RuntimeError(f'doneState/integrityState replacement count={count}')
    write(path, text)


def patch_pwa_runtime():
    allowed_ext = {'.js', '.cjs', '.html', '.json', '.md'}
    for path in CNC.rglob('*'):
        if not path.is_file() or path.suffix.lower() not in allowed_ext:
            continue
        rel = path.relative_to(ROOT).as_posix()
        if rel.startswith('cnc/test-results/') or rel == 'cnc/tests/pwa-build-reference-audit-smoke.cjs':
            continue
        text = path.read_text(encoding='utf-8')
        updated = text.replace(OLD_PWA, NEW_PWA).replace(OLD_CACHE, NEW_CACHE)
        if rel.startswith('cnc/tests/'):
            updated = updated.replace(OLD_MODULE_BUILD, NEW_MODULE_BUILD)
        if updated != text:
            write(path, updated)

    for rel in PAGES_TESTS:
        path = ROOT / rel
        text = path.read_text(encoding='utf-8')
        updated = text.replace(CURRENT_MAIN_OLD_PWA, CURRENT_MAIN_NEW_PWA).replace(CURRENT_MAIN_OLD_CACHE, CURRENT_MAIN_NEW_CACHE)
        if updated == text:
            raise RuntimeError(f'{rel}: current-main transition pins were not updated')
        write(path, updated)

    info_path = CNC / 'build-info.json'
    info = json.loads(info_path.read_text(encoding='utf-8'))
    info['pwaBuild'] = NEW_PWA
    info['cacheRevision'] = NEW_CACHE
    info['generatedAt'] = '2026-08-18T02:31:43+08:00'
    stage = '共享课程完成canonical优先、stage-N兼容与旧档案回退一致'
    if stage not in info.get('contentStage', ''):
        info['contentStage'] = info.get('contentStage', '').rstrip('；; ') + '；' + stage
    write(info_path, json.dumps(info, ensure_ascii=False, indent=2) + '\n')


def add_stage_compat_test():
    path = CNC / 'tests' / 'mobile-training-profile-stage-compat-smoke.cjs'
    content = r'''const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const artifactDir = path.resolve(__dirname, '../test-artifacts/daily-training-plan');
fs.mkdirSync(artifactDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=stage-compat', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.CNC_TRAINING_PROFILE?.build === '20260818a', null, { timeout: 20000 });

  const basePractice = { version: 2, gateVersion: 2, attempts: {}, wrong: [], correct: [], lessonScores: {}, legacyLessonScores: {} };
  const baseProfile = { version: 1, xp: 120, badges: [], trainingDays: [], currentStreak: 0, bestStreak: 0, lastTrainingDate: null };

  const legacyFallback = await page.evaluate(({ basePractice, baseProfile }) => {
    localStorage.removeItem('cnc_study_completed_v1');
    localStorage.removeItem('cnc_daily_training_plan_v1');
    const profile = { ...baseProfile, completed: [1, 'stage-2'], completedStages: ['stage-3', 'stage-2'] };
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify(profile));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify(basePractice));
    const beforeProfile = localStorage.getItem('cnc_training_profile_v1');
    const beforePractice = localStorage.getItem('cnc_training_practice_v1');
    const snapshot = window.CNC_TRAINING_PROFILE.snapshot();
    return {
      integrity: snapshot.integrity,
      completed: snapshot.completed,
      next: snapshot.next?.level,
      profileReadOnly: beforeProfile === localStorage.getItem('cnc_training_profile_v1'),
      practiceReadOnly: beforePractice === localStorage.getItem('cnc_training_practice_v1')
    };
  }, { basePractice, baseProfile });
  assert.deepEqual(legacyFallback, { integrity: true, completed: 3, next: 4, profileReadOnly: true, practiceReadOnly: true });

  const canonicalPriority = await page.evaluate(({ basePractice, baseProfile }) => {
    localStorage.removeItem('cnc_daily_training_plan_v1');
    const profile = { ...baseProfile, completed: [1, 2, 3, 4, 5, 6], completedStages: ['stage-7'] };
    const canonical = ['stage-1', 2, 'stage-3'];
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify(profile));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify(basePractice));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify(canonical));
    const before = {
      profile: localStorage.getItem('cnc_training_profile_v1'),
      practice: localStorage.getItem('cnc_training_practice_v1'),
      done: localStorage.getItem('cnc_study_completed_v1')
    };
    const snapshot = window.CNC_TRAINING_PROFILE.snapshot();
    return {
      integrity: snapshot.integrity,
      completed: snapshot.completed,
      next: snapshot.next?.level,
      profileReadOnly: before.profile === localStorage.getItem('cnc_training_profile_v1'),
      practiceReadOnly: before.practice === localStorage.getItem('cnc_training_practice_v1'),
      doneReadOnly: before.done === localStorage.getItem('cnc_study_completed_v1')
    };
  }, { basePractice, baseProfile });
  assert.deepEqual(canonicalPriority, { integrity: true, completed: 3, next: 4, profileReadOnly: true, practiceReadOnly: true, doneReadOnly: true });

  const invalidCanonical = await page.evaluate(({ basePractice, baseProfile }) => {
    localStorage.removeItem('cnc_daily_training_plan_v1');
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ ...baseProfile, completed: [1, 'stage-2'] }));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify(basePractice));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1, '2', 'stage-3']));
    const before = localStorage.getItem('cnc_study_completed_v1');
    const snapshot = window.CNC_TRAINING_PROFILE.snapshot();
    window.CNC_TRAINING_PROFILE.render();
    return {
      integrity: snapshot.integrity,
      issues: snapshot.issues,
      completed: snapshot.completed,
      dailyPlan: snapshot.dailyPlan,
      doneReadOnly: before === localStorage.getItem('cnc_study_completed_v1'),
      planCreated: localStorage.getItem('cnc_daily_training_plan_v1') !== null,
      panelStatus: document.querySelector('#xp-training-profile')?.dataset.integrity || '',
      healthHref: document.querySelector('[data-profile-health]')?.getAttribute('href') || '',
      backupHref: document.querySelector('[data-profile-backup]')?.getAttribute('href') || ''
    };
  }, { basePractice, baseProfile });
  assert.equal(invalidCanonical.integrity, false);
  assert.ok(invalidCanonical.issues.includes('cnc_study_completed_v1'));
  assert.equal(invalidCanonical.completed, null);
  assert.equal(invalidCanonical.dailyPlan, null);
  assert.equal(invalidCanonical.doneReadOnly, true);
  assert.equal(invalidCanonical.planCreated, false);
  assert.equal(invalidCanonical.panelStatus, 'blocked');
  assert.equal(invalidCanonical.healthHref, './data-health.html');
  assert.equal(invalidCanonical.backupHref, './data-backup.html');

  const invalidLegacy = await page.evaluate(({ basePractice, baseProfile }) => {
    localStorage.removeItem('cnc_study_completed_v1');
    localStorage.removeItem('cnc_daily_training_plan_v1');
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ ...baseProfile, completed: [1, '2', 'stage-3'] }));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify(basePractice));
    return window.CNC_TRAINING_PROFILE.snapshot();
  }, { basePractice, baseProfile });
  assert.equal(invalidLegacy.integrity, false);
  assert.ok(invalidLegacy.issues.some(issue => issue.includes('cnc_training_profile_v1.completed:entry')));

  const dimensions = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  assert.ok(dimensions.scrollWidth <= dimensions.innerWidth, `390px页面不应横向溢出：${JSON.stringify(dimensions)}`);
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(consoleErrors, []);

  const result = { passed: true, legacyFallback, canonicalPriority, invalidCanonical: { ...invalidCanonical, issues: invalidCanonical.issues }, invalidLegacyIssues: invalidLegacy.issues, dimensions, pageErrors, consoleErrors };
  fs.writeFileSync(path.join(artifactDir, 'stage-compat-result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})().catch(async error => {
  fs.writeFileSync(path.join(artifactDir, 'stage-compat-error.txt'), String(error?.stack || error));
  console.error(error);
  process.exitCode = 1;
});
'''
    write(path, content)


def main():
    patch_training_profile()
    patch_pwa_runtime()
    add_stage_compat_test()
    subprocess.run(['node', '--check', 'cnc/training-profile.js'], cwd=ROOT, check=True)
    subprocess.run(['node', '--check', 'cnc/tests/mobile-training-profile-stage-compat-smoke.cjs'], cwd=ROOT, check=True)
    changed = subprocess.check_output(['git', 'diff', '--name-only'], cwd=ROOT, text=True).splitlines()
    if not changed:
        raise RuntimeError('no generated changes')
    forbidden = [p for p in changed if not p.startswith('cnc/')]
    if forbidden:
        raise RuntimeError(f'generated changes escaped cnc/**: {forbidden}')
    print('Generated CNC stage-N compatibility and PWA52 runtime changes:')
    for name in changed:
        print(name)

if __name__ == '__main__':
    main()
