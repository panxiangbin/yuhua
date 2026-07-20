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

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=gcode', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  const card = page.locator('.launchpad-card[data-filter="gcode"]');
  await card.waitFor({ state: 'visible', timeout: 30000 });
  await card.click();

  await page.waitForFunction(() => {
    const view = document.querySelector('#view-workspace');
    return view && view.classList.contains('active');
  }, null, { timeout: 30000 });

  await page.waitForFunction(() => window.__CNC_GM_PRO_INSTALLED__ === '20260720h', null, {
    timeout: 30000
  });

  await page.locator('#search-input').fill('G1');
  await page.waitForTimeout(700);
  const resultText = await page.locator('#result-list').textContent();
  assert.match(resultText || '', /G01/);

  const firstResult = page.locator('#result-list .result-card').first();
  await firstResult.waitFor({ state: 'visible', timeout: 15000 });
  await firstResult.click();

  await page.waitForFunction(() => {
    const code = document.querySelector('#detail-code');
    return code && /G01/.test(code.textContent || '');
  }, null, { timeout: 15000 });

  console.log('手机G1→G01搜索与详情打开通过');
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
