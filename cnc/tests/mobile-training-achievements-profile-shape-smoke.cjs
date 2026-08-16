const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const artifactDir = path.resolve(__dirname, '../test-artifacts/training-achievements-profile-shape');
fs.mkdirSync(artifactDir, { recursive: true });

let browser;
let page;

(async () => {
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  const consoleErrors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });

  await page.goto('http://127.0.0.1:4173/cnc/training-achievements.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => localStorage.clear());

  const before = await page.evaluate(() => {
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({
      version: 1,
      currentStreak: 7,
      trainingDays: { bad: '2026-08-16' },
      badges: { one: '连续训练3天' }
    }));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1, 2, 3]));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({ version: 1 }));
    localStorage.setItem('cnc_training_simulator_v1', JSON.stringify({ version: 1 }));
    const keys = ['cnc_training_profile_v1', 'cnc_study_completed_v1', 'cnc_training_practice_v1', 'cnc_training_simulator_v1'];
    return Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)]));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.CNC_TRAINING_ACHIEVEMENTS?.build === '20260808a', null, { timeout: 15000 });

  const snapshot = await page.evaluate(() => window.CNC_TRAINING_ACHIEVEMENTS.snapshot());
  assert.equal(snapshot.integrity, false);
  assert.equal(snapshot.streak, null);
  assert.equal(snapshot.days, null);
  assert.equal(snapshot.badges, null);
  assert.equal(snapshot.courses, 3);
  assert.equal(snapshot.nextKind, 'integrity');
  assert.ok(snapshot.invalid.includes('cnc_training_profile_v1.trainingDays'));
  assert.ok(snapshot.invalid.includes('cnc_training_profile_v1.badges'));
  assert.equal(await page.locator('#streak').textContent(), '—');
  assert.equal(await page.locator('#days').textContent(), '—');
  assert.equal(await page.locator('#badges').textContent(), '—');
  assert.equal(await page.locator('#data-integrity').isHidden(), false);
  assert.match(await page.locator('#data-integrity-copy').textContent(), /trainingDays/);
  assert.match(await page.locator('#data-integrity-copy').textContent(), /badges/);
  assert.match(await page.locator('#next-link').getAttribute('href'), /data-health\.html/);
  assert.ok((await page.locator('#data-integrity .action').evaluate(node => node.getBoundingClientRect().height)) >= 44);

  const bodyText = await page.locator('body').textContent();
  assert.doesNotMatch(bodyText, /NaN|Infinity/);
  const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  assert.ok(overflow.scrollWidth <= overflow.clientWidth, `390px 页面横向溢出：${JSON.stringify(overflow)}`);

  const after = await page.evaluate(() => {
    const keys = ['cnc_training_profile_v1', 'cnc_study_completed_v1', 'cnc_training_practice_v1', 'cnc_training_simulator_v1'];
    return Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)]));
  });
  assert.deepEqual(after, before, '成长成果页不得修改嵌套结构异常的学习数据');
  assert.deepEqual(errors, []);
  assert.deepEqual(consoleErrors, []);

  // 根结构合法但训练日/徽章条目损坏或重复时，也必须阻断个性化路线；可确认统计继续展示且原始数据只读。
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

  const report = { passed: true, snapshot, entrySnapshot, overflow, readOnly: true, errors, consoleErrors };
  fs.writeFileSync(path.join(artifactDir, 'report.json'), JSON.stringify(report, null, 2));
  await page.screenshot({ path: path.join(artifactDir, 'training-achievements-profile-shape-390x844.png'), fullPage: true });
  console.log('成长成果嵌套训练日/徽章结构异常阻断通过', report);
  await browser.close();
})().catch(async error => {
  const stack = error && error.stack ? error.stack : String(error);
  fs.writeFileSync(path.join(artifactDir, 'error.txt'), stack);
  if (page) {
    try { await page.screenshot({ path: path.join(artifactDir, 'failure-390x844.png'), fullPage: true }); } catch (_) {}
  }
  if (browser) {
    try { await browser.close(); } catch (_) {}
  }
  console.error(error);
  process.exit(1);
});