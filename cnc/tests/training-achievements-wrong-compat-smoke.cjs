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
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ version: 1, currentStreak: 0, trainingDays: [], badges: [] }));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify(Array.from({ length: 12 }, (_, i) => i + 1)));
    localStorage.setItem('cnc_training_simulator_v1', JSON.stringify({ records: {} }));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({
      wrongQuestions: [
        { id: 'sc-dup', practiceId: 'safety-coordinate', title: '重复错题A' },
        { id: 'sc-only', practiceId: 'safety-coordinate', title: '仅wrongQuestions' }
      ],
      wrongItems: {
        duplicate: { id: 'sc-dup', practiceId: 'safety-coordinate', title: '重复错题A旧结构' },
        unique: { id: 'av-only', practiceId: 'advanced-verification', title: '仅wrongItems' }
      },
      wrong: [
        { id: 'sc-only', practiceId: 'safety-coordinate', title: '重复错题B旧结构' },
        { id: 'dsp-only', practiceId: 'drawing-setup-process', title: '仅wrong' }
      ]
    }));
  });
  const before = await page.evaluate(() => localStorage.getItem('cnc_training_practice_v1'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.CNC_TRAINING_ACHIEVEMENTS?.build === '20260808a', null, { timeout: 15000 });

  const achievements = await page.evaluate(() => window.CNC_TRAINING_ACHIEVEMENTS.snapshot());
  assert.equal(achievements.integrity, true);
  assert.equal(achievements.courses, 12);
  assert.equal(achievements.wrong, 4, '成长成果必须合并 wrongQuestions / wrongItems / wrong 并按来源专项+题目ID去重');
  assert.equal(achievements.nextKind, 'wrong');
  assert.equal(await page.locator('#wrong').textContent(), '4');
  assert.match(await page.locator('#next-title').textContent(), /4 道错题/);

  const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  assert.ok(overflow.scrollWidth <= overflow.clientWidth, `390px 页面横向溢出：${JSON.stringify(overflow)}`);
  assert.ok((await page.locator('#next-link').evaluate(node => node.getBoundingClientRect().height)) >= 44);

  await page.goto('http://127.0.0.1:4173/cnc/practice-wrong-review.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  assert.equal(await page.locator('#wrong-total').textContent(), '4', '跨专项错题页与成长成果错题数必须一致');

  await page.goto('http://127.0.0.1:4173/cnc/profile.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  assert.equal(await page.locator('#wrong-count').textContent(), '4', '成长档案与成长成果错题数必须一致');

  const after = await page.evaluate(() => localStorage.getItem('cnc_training_practice_v1'));
  assert.equal(after, before, '跨页面统计与去重必须保持专项练习 localStorage 严格只读');
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(consoleErrors, []);

  const report = {
    passed: true,
    wrongCount: achievements.wrong,
    crossPageCounts: { achievements: 4, wrongReview: 4, profile: 4 },
    readOnly: after === before,
    overflow,
    pageErrors,
    consoleErrors
  };
  fs.writeFileSync(path.join(artifactDir, 'wrong-compat-report.json'), JSON.stringify(report, null, 2));
  await page.screenshot({ path: path.join(artifactDir, 'training-achievements-wrong-compat-390x844.png'), fullPage: true });
  console.log('成长成果三类错题兼容字段汇总、来源+题号去重、跨页面一致性与只读保护通过', report);
  await browser.close();
})().catch(async error => {
  const stack = error && error.stack ? error.stack : String(error);
  fs.writeFileSync(path.join(artifactDir, 'wrong-compat-error.txt'), stack);
  if (page) {
    try { await page.screenshot({ path: path.join(artifactDir, 'wrong-compat-failure-390x844.png'), fullPage: true }); } catch (_) {}
  }
  if (browser) {
    try { await browser.close(); } catch (_) {}
  }
  console.error(error);
  process.exit(1);
});