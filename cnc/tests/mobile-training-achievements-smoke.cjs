const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const artifactDir = path.resolve(__dirname, '../test-artifacts/training-achievements');
fs.mkdirSync(artifactDir, { recursive: true });

let browser;
let page;

function dateKey(value) {
  return value.getFullYear() + '-' + String(value.getMonth() + 1).padStart(2, '0') + '-' + String(value.getDate()).padStart(2, '0');
}

(async () => {
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('http://127.0.0.1:4173/cnc/training-achievements.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => localStorage.clear());

  const d = new Date();
  const yesterday = new Date(d);
  yesterday.setDate(d.getDate() - 1);
  const todayKey = dateKey(d);
  const yesterdayKey = dateKey(yesterday);

  await page.evaluate(({ todayKey, yesterdayKey }) => {
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({
      version: 1,
      currentStreak: 2,
      trainingDays: [yesterdayKey, todayKey],
      badges: ['迈出第一步', '成绩达标']
    }));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1, 2, 3, 4]));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({
      version: 1,
      wrong: ['g00-cutting', 'safe-stop-first'],
      correct: ['axis-z-direction'],
      lessonScores: { 1: 100, 2: 90, 3: 85, 4: 80 }
    }));
    localStorage.setItem('cnc_training_simulator_v1', JSON.stringify({
      simulators: {
        safety: { passed: true, bestScore: 100 },
        workOffset: { passed: false, bestScore: 80 },
        alarm: { passed: false, score: 60 }
      }
    }));
    location.reload();
  }, { todayKey, yesterdayKey });

  await page.waitForFunction(() => window.CNC_TRAINING_ACHIEVEMENTS?.build === '20260808a', null, { timeout: 15000 });
  const snapshot = await page.evaluate(() => window.CNC_TRAINING_ACHIEVEMENTS.snapshot());
  assert.deepEqual(snapshot, {
    streak: 2,
    days: 2,
    badges: 2,
    trainedToday: true,
    target: 3,
    remaining: 1,
    courses: 4,
    wrong: 2,
    simulations: 2,
    integrity: true,
    invalid: [],
    nextKind: 'course',
    nextLevel: 5
  });

  assert.equal(await page.locator('#courses').textContent(), '4/12');
  assert.equal(await page.locator('#wrong').textContent(), '2');
  assert.equal(await page.locator('#simulations').textContent(), '2/13');
  assert.equal(await page.locator('#streak').textContent(), '2');
  assert.equal(await page.locator('#days').textContent(), '2');
  assert.equal(await page.locator('#badges').textContent(), '2');
  assert.equal(await page.locator('#today-title').textContent(), '今日已完成');
  assert.match(await page.locator('#milestone-copy').textContent(), /再完成 1 天/);
  assert.equal(await page.locator('#week-preview .day').count(), 7);
  assert.equal(await page.locator('#week-preview .day.is-done').count(), 2);
  assert.equal(await page.locator('#week-preview .day.is-today').count(), 1);

  assert.match(await page.locator('#next-title').textContent(), /第 5 关/);
  assert.match(await page.locator('#next-copy').textContent(), /固定12关顺序/);
  assert.match(await page.locator('#next-link').getAttribute('href'), /training-camp\.html/);
  assert.ok((await page.locator('#next-link').evaluate(node => node.getBoundingClientRect().height)) >= 44);
  assert.equal(await page.locator('#data-integrity').isHidden(), true);

  const toolLinks = page.locator('.tools .action');
  assert.equal(await toolLinks.count(), 3);
  assert.match(await toolLinks.nth(0).getAttribute('href'), /training-certificate\.html/);
  assert.match(await toolLinks.nth(1).getAttribute('href'), /training-calendar\.html/);
  assert.match(await toolLinks.nth(2).getAttribute('href'), /training-badges\.html/);
  const cards = await page.locator('.tool').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect()));
  assert.ok(cards.every(box => box.width > 330));
  assert.ok(cards.every((box, index) => index === 0 || box.top >= cards[index - 1].bottom));
  assert.ok((await page.locator('.back').evaluate(node => node.getBoundingClientRect().height)) >= 44);
  assert.ok((await toolLinks.nth(0).evaluate(node => node.getBoundingClientRect().height)) >= 44);
  assert.match(await page.locator('.notice').textContent(), /原厂手册/);
  assert.match(await page.locator('.notice').textContent(), /报警、参数、刀补和安全步骤/);
  assert.deepEqual(errors, []);

  const validReport = { snapshot, viewport: await page.viewportSize(), errors: [...errors] };
  fs.writeFileSync(path.join(artifactDir, 'valid-state.json'), JSON.stringify(validReport, null, 2));
  await page.screenshot({ path: path.join(artifactDir, 'training-achievements-valid-390x844.png'), fullPage: true });

  // 主完成状态结构损坏时，必须明确阻断成长推荐，不得静默退回旧字段或当作0进度。
  await page.evaluate(() => {
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify({ completed: [1, 2, 3, 4] }));
    location.reload();
  });
  await page.waitForFunction(() => window.CNC_TRAINING_ACHIEVEMENTS?.build === '20260808a', null, { timeout: 15000 });
  await page.locator('#data-integrity').waitFor({ state: 'visible', timeout: 10000 });

  const invalidSnapshot = await page.evaluate(() => window.CNC_TRAINING_ACHIEVEMENTS.snapshot());
  assert.equal(invalidSnapshot.integrity, false);
  assert.equal(invalidSnapshot.courses, null);
  assert.equal(invalidSnapshot.nextKind, 'integrity');
  assert.equal(invalidSnapshot.nextLevel, null);
  assert.ok(invalidSnapshot.invalid.includes('cnc_study_completed_v1'));
  assert.equal(await page.locator('#courses').textContent(), '—');
  assert.match(await page.locator('#data-integrity-copy').textContent(), /cnc_study_completed_v1/);
  assert.match(await page.locator('#next-title').textContent(), /检查学习数据/);
  assert.match(await page.locator('#next-link').getAttribute('href'), /data-health\.html/);
  assert.ok((await page.locator('#data-integrity .action').evaluate(node => node.getBoundingClientRect().height)) >= 44);
  assert.deepEqual(errors, []);

  // 当前主完成状态缺失、只能依赖旧档案兼容时，如果旧档案本身损坏，同样不得显示成0/12。
  await page.evaluate(() => {
    localStorage.removeItem('cnc_study_completed_v1');
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify([]));
    location.reload();
  });
  await page.waitForFunction(() => window.CNC_TRAINING_ACHIEVEMENTS?.build === '20260808a', null, { timeout: 15000 });
  await page.locator('#data-integrity').waitFor({ state: 'visible', timeout: 10000 });
  const fallbackInvalidSnapshot = await page.evaluate(() => window.CNC_TRAINING_ACHIEVEMENTS.snapshot());
  assert.equal(fallbackInvalidSnapshot.integrity, false);
  assert.equal(fallbackInvalidSnapshot.courses, null);
  assert.equal(fallbackInvalidSnapshot.nextKind, 'integrity');
  assert.ok(fallbackInvalidSnapshot.invalid.includes('cnc_training_profile_v1'));
  assert.equal(await page.locator('#courses').textContent(), '—');
  assert.match(await page.locator('#data-integrity-copy').textContent(), /cnc_training_profile_v1/);
  assert.deepEqual(errors, []);

  const report = { passed: true, valid: validReport, invalidSnapshot, fallbackInvalidSnapshot, errors };
  fs.writeFileSync(path.join(artifactDir, 'report.json'), JSON.stringify(report, null, 2));
  await page.screenshot({ path: path.join(artifactDir, 'training-achievements-invalid-390x844.png'), fullPage: true });
  console.log('成长成果主线/错题/模拟闭环、固定12关主完成状态、异常数据阻断、7天预览和安全边界通过', report);
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
