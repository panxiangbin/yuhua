const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: text => { window.__copied = text; return Promise.resolve(); } } });
    window.__printed = false;
    window.print = () => { window.__printed = true; };
  });
  await page.goto('http://127.0.0.1:4173/cnc/training-certificate.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => {
    const lessonScores = {};
    for (let level = 1; level <= 12; level += 1) lessonScores[level] = 90;
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({ version: 1, lessonScores }));
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ version: 1, trainingDays: ['2026-07-20','2026-07-21','2026-07-22'], badges: ['迈出第一步','成绩达标'] }));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1,2,3,4,5,6,7,8,9,10,11,12]));
    location.reload();
  });
  await page.waitForFunction(() => window.CNC_TRAINING_CERTIFICATE?.build === '20260724c');
  assert.match(await page.evaluate(() => window.CNC_TRAINING_CERTIFICATE.shareText()), /已通过 12\/12 关/);
  assert.match(await page.evaluate(() => window.CNC_TRAINING_CERTIFICATE.shareText()), /平均成绩 90 分/);
  assert.equal(await page.locator('#data-integrity').isHidden(), true, '合法学习数据不应显示异常恢复面板');
  assert.equal(await page.locator('#share-certificate').isDisabled(), false, '合法学习数据必须允许分享');
  assert.equal(await page.locator('#print-certificate').isDisabled(), false, '合法学习数据必须允许打印');
  const actions = page.locator('.shell > .toolbar[aria-label="证书操作"] .action');
  assert.equal(await actions.count(), 2);
  assert.ok((await actions.nth(0).evaluate(node => node.getBoundingClientRect().height)) >= 44);
  assert.ok((await actions.nth(1).evaluate(node => node.getBoundingClientRect().height)) >= 44);
  await page.locator('#share-certificate').click();
  await page.waitForFunction(() => Boolean(window.__copied));
  assert.match(await page.evaluate(() => window.__copied), /基础训练营已达标/);
  assert.match(await page.locator('#share-status').textContent(), /已复制/);
  await page.locator('#print-certificate').click();
  assert.equal(await page.evaluate(() => window.__printed), true);
  const safetyNotice = page.locator('.notice').last();
  assert.match(await safetyNotice.textContent(), /不是职业资格证书/);
  assert.match(await safetyNotice.textContent(), /原厂手册/);
  assert.deepEqual(errors, []);
  console.log('阶段证书分享文案、复制回退、打印入口、触控区、正常数据开放状态与安全声明通过');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
