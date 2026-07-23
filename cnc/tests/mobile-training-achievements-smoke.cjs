const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/cnc/training-achievements.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => {
    const d = new Date();
    const key = value => value.getFullYear() + '-' + String(value.getMonth() + 1).padStart(2, '0') + '-' + String(value.getDate()).padStart(2, '0');
    const yesterday = new Date(d); yesterday.setDate(d.getDate() - 1);
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({
      version: 1,
      currentStreak: 2,
      trainingDays: [key(yesterday), key(d)],
      badges: ['迈出第一步', '成绩达标']
    }));
    location.reload();
  });
  await page.waitForFunction(() => window.CNC_TRAINING_ACHIEVEMENTS?.build === '20260723k');
  const snapshot = await page.evaluate(() => window.CNC_TRAINING_ACHIEVEMENTS.snapshot());
  assert.deepEqual(snapshot, { streak: 2, days: 2, badges: 2, trainedToday: true, target: 3, remaining: 1 });
  assert.equal(await page.locator('#streak').textContent(), '2');
  assert.equal(await page.locator('#days').textContent(), '2');
  assert.equal(await page.locator('#badges').textContent(), '2');
  assert.equal(await page.locator('#today-title').textContent(), '今日已完成');
  assert.match(await page.locator('#milestone-copy').textContent(), /再完成 1 天/);
  assert.equal(await page.locator('#week-preview .day').count(), 7);
  assert.equal(await page.locator('#week-preview .day.is-done').count(), 2);
  assert.equal(await page.locator('#week-preview .day.is-today').count(), 1);
  const links = page.locator('.action');
  assert.equal(await links.count(), 2);
  assert.match(await links.nth(0).getAttribute('href'), /training-calendar\.html/);
  assert.match(await links.nth(1).getAttribute('href'), /training-badges\.html/);
  const cards = await page.locator('.tool').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect()));
  assert.ok(cards.every(box => box.width > 330));
  assert.ok(cards.every((box, index) => index === 0 || box.top >= cards[index - 1].bottom));
  assert.ok((await page.locator('.back').evaluate(node => node.getBoundingClientRect().height)) >= 44);
  assert.ok((await links.nth(0).evaluate(node => node.getBoundingClientRect().height)) >= 44);
  assert.match(await page.locator('.notice').textContent(), /原厂手册/);
  assert.deepEqual(errors, []);
  console.log('成长成果统计、今日状态、7天预览、下一里程碑和安全提示通过', snapshot);
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });