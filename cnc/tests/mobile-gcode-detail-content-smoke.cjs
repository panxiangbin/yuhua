const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto('http://127.0.0.1:4173/cnc/?smoke=gcode-detail-content', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('.launchpad-card[data-filter="gcode"]').click();
  await page.waitForFunction(() => window.__CNC_GM_PRO_INSTALLED__ === '20260720h', null, { timeout: 30000 });
  await page.locator('#search-input').fill('G1');
  await page.waitForTimeout(700);

  const button = page.locator('#result-list [data-open-entry="kb-gcode-g01"]');
  await button.waitFor({ state: 'attached', timeout: 15000 });
  await button.click({ force: true });

  await page.waitForFunction(() => {
    const code = document.querySelector('#detail-code');
    return code && /G01/.test(code.textContent || '');
  }, null, { timeout: 15000 });

  assert.match((await page.locator('#detail-title').textContent()) || '', /G01|直线插补/);
  console.log('G01详情内容切换通过');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
