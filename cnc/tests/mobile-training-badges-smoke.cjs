const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/cnc/training-badges.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => {
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ version: 1, badges: ['连续训练3天'], trainingDays: ['2026-07-21', '2026-07-22', '2026-07-23'] }));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1, 2, 3]));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({ version: 1, lessonScores: { 1: 100, 2: 80, 3: 60 } }));
    window.CNC_TRAINING_BADGES.render();
  });
  await page.waitForFunction(() => document.body.dataset.trainingBadges === 'ready');
  assert.equal(await page.locator('.badge').count(), 8);
  assert.equal(await page.locator('.badge.is-earned').count(), 4);
  assert.equal(await page.locator('#earned-count').textContent(), '4');
  assert.equal(await page.locator('#total-count').textContent(), '8');
  assert.equal(await page.locator('#completion-rate').textContent(), '50%');
  assert.match(await page.locator('.notice').textContent(), /原厂手册/);
  const boxes = await page.locator('.badge').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect()));
  assert.ok(boxes.every(box => box.width > 330));
  assert.ok(boxes.every((box, index) => index === 0 || box.top >= boxes[index - 1].bottom));
  assert.ok((await page.locator('.back').evaluate(node => node.getBoundingClientRect().height)) >= 44);
  assert.deepEqual(errors, []);
  console.log('训练徽章、阶段里程碑、50%完成度、手机单列与安全提示通过');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });