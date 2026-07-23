const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/cnc/training-achievements.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => {
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ version: 1, currentStreak: 3, trainingDays: ['2026-07-21','2026-07-22','2026-07-23'], badges: ['迈出第一步','连续训练3天'] }));
    location.reload();
  });
  await page.waitForFunction(() => document.body.dataset.trainingAchievements === 'ready');
  assert.equal(await page.locator('#streak').textContent(), '3');
  assert.equal(await page.locator('#days').textContent(), '3');
  assert.equal(await page.locator('#badges').textContent(), '2');
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
  console.log('成长成果统计、日历与徽章入口、手机单列和安全提示通过');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
