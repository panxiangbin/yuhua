const { chromium } = require('playwright');
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
