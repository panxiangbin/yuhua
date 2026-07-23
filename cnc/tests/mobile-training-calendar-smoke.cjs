const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/cnc/training-calendar.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => {
    const now = new Date();
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const d1 = new Date(now); d1.setDate(now.getDate()-2);
    const d2 = new Date(now); d2.setDate(now.getDate()-1);
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ version:1, trainingDays:[fmt(d1),fmt(d2)], currentStreak:2, bestStreak:4 }));
    window.CNC_TRAINING_CALENDAR.render();
  });
  await page.waitForFunction(() => document.body.dataset.trainingCalendar === 'ready');
  assert.equal(await page.locator('#current-streak').textContent(), '2');
  assert.equal(await page.locator('#best-streak').textContent(), '4');
  assert.equal(await page.locator('#total-days').textContent(), '2');
  assert.equal(await page.locator('.day').count(), 7);
  assert.equal(await page.locator('.day.is-done').count(), 2);
  assert.equal(await page.locator('.day.is-today').count(), 1);
  const boxes = await page.locator('.day').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect()));
  assert.ok(boxes.every(box => box.width > 330));
  assert.ok(boxes.every((box, index) => index === 0 || box.top >= boxes[index - 1].bottom));
  assert.ok((await page.locator('.back').evaluate(node => node.getBoundingClientRect().height)) >= 44);
  assert.deepEqual(errors, []);
  console.log('7天训练日历、连续训练统计、手机单列和44px返回入口通过');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
