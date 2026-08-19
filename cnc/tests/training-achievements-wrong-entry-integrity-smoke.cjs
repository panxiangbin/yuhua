const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const artifactDir = path.resolve(__dirname, '../test-artifacts/training-achievements');
fs.mkdirSync(artifactDir, { recursive: true });

let browser;
let page;

(async () => {
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });

  await page.goto('http://127.0.0.1:4173/cnc/training-achievements.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => localStorage.clear());

  const before = await page.evaluate(() => {
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({
      version: 1,
      currentStreak: 2,
      trainingDays: ['2026-08-18', '2026-08-19'],
      badges: ['迈出第一步']
    }));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify(Array.from({ length: 12 }, (_, index) => index + 1)));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({
      version: 2,
      wrongQuestions: [
        { id: 'sc-good', practiceId: 'safety-coordinate', title: '合法错题A' },
        null,
        'bad-scalar',
        [],
        { id: 'av-good', practiceId: 'advanced-verification', title: '合法错题B' }
      ],
      lessonScores: { 1: 100, 2: 90 }
    }));
    localStorage.setItem('cnc_training_simulator_v1', JSON.stringify({ records: {} }));
    const keys = ['cnc_training_profile_v1', 'cnc_study_completed_v1', 'cnc_training_practice_v1', 'cnc_training_simulator_v1'];
    return Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)]));
  });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.CNC_TRAINING_ACHIEVEMENTS?.build === '20260808a', null, { timeout: 15000 });

  const snapshot = await page.evaluate(() => window.CNC_TRAINING_ACHIEVEMENTS.snapshot());
  assert.equal(snapshot.wrong, 2, '损坏错题条目不得抹掉可确认的2道合法错题');
  assert.equal(snapshot.integrity, false, '错题字段内部存在 null/标量/数组时必须降低成长成果完整性');
  assert.ok(snapshot.invalid.includes('cnc_training_practice_v1.wrongQuestions:entry'), '必须明确登记 wrongQuestions:entry 风险');
  assert.equal(snapshot.nextKind, 'integrity', '仅错题嵌套损坏也必须暂停个性化成长路线');
  assert.equal(snapshot.courses, 12, '可确认的12关完成进度仍应保留');
  assert.equal(await page.locator('#wrong').textContent(), '2');
  assert.equal(await page.locator('#courses').textContent(), '12/12');
  assert.equal(await page.locator('#data-integrity').isHidden(), false);
  assert.match(await page.locator('#data-integrity-copy').textContent(), /cnc_training_practice_v1\.wrongQuestions:entry/);
  assert.match(await page.locator('#next-title').textContent(), /检查学习数据/);
  assert.match(await page.locator('#next-link').getAttribute('href'), /data-health\.html/);
  assert.ok((await page.locator('#next-link').evaluate(node => node.getBoundingClientRect().height)) >= 44);

  const bodyText = await page.locator('body').textContent();
  assert.doesNotMatch(bodyText, /NaN|Infinity/);
  const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  assert.ok(overflow.scrollWidth <= overflow.clientWidth, `390px 页面横向溢出：${JSON.stringify(overflow)}`);

  const after = await page.evaluate(() => {
    const keys = ['cnc_training_profile_v1', 'cnc_study_completed_v1', 'cnc_training_practice_v1', 'cnc_training_simulator_v1'];
    return Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)]));
  });
  assert.deepEqual(after, before, '成长成果完整性检查必须保持学习 localStorage 严格只读');
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(consoleErrors, []);

  const report = { passed: true, snapshot, overflow, readOnly: after === before, pageErrors, consoleErrors };
  fs.writeFileSync(path.join(artifactDir, 'wrong-entry-integrity-report.json'), JSON.stringify(report, null, 2));
  await page.screenshot({ path: path.join(artifactDir, 'training-achievements-wrong-entry-integrity-390x844.png'), fullPage: true });
  console.log('成长成果错题嵌套损坏完整性阻断、可确认错题保留与只读保护通过', report);
  await browser.close();
})().catch(async error => {
  const stack = error && error.stack ? error.stack : String(error);
  fs.writeFileSync(path.join(artifactDir, 'wrong-entry-integrity-error.txt'), stack);
  if (page) {
    try { await page.screenshot({ path: path.join(artifactDir, 'wrong-entry-integrity-failure-390x844.png'), fullPage: true }); } catch (_) {}
  }
  if (browser) {
    try { await browser.close(); } catch (_) {}
  }
  console.error(error);
  process.exit(1);
});
