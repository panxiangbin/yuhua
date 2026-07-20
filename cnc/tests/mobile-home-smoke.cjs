const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=home', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  await page.waitForSelector('.launchpad-card[data-filter="gcode"]', {
    state: 'visible',
    timeout: 30000
  });
  await page.waitForTimeout(1200);

  assert.equal(await page.title(), '数控小潘 CNC速查与学习助手');
  assert.match((await page.locator('.study-card[data-level="9"] p').textContent()) || '', /不保证直线/);
  assert.match((await page.locator('.study-card[data-level="10"] p').textContent()) || '', /最小输入单位/);

  console.log('首页打开、品牌与课程纠错通过');
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
