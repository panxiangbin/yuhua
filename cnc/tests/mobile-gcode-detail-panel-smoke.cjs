const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto('http://127.0.0.1:4173/cnc/?smoke=gcode-detail-panel', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('.launchpad-card[data-filter="gcode"]').click();
  await page.waitForFunction(() => window.__CNC_GM_PRO_INSTALLED__ === '20260720h', null, { timeout: 30000 });
  await page.waitForFunction(() => window.CNC_CLEAN_UI && window.CNC_CLEAN_UI.build === '20260720k', null, { timeout: 15000 });
  await page.locator('#search-input').fill('G1');
  await page.waitForTimeout(700);

  await page.waitForFunction(() => {
    const button = document.querySelector('#result-list [data-open-entry="kb-gcode-g01"]');
    return button && button.dataset.cncCleanBound === 'true';
  }, null, { timeout: 15000 });

  await page.evaluate(() => {
    const button = document.querySelector('#result-list [data-open-entry="kb-gcode-g01"]');
    button.click();
  });

  await page.waitForFunction(() => {
    const panel = document.querySelector('#detail-panel');
    const body = document.body;
    if (!panel || !body) return false;
    const style = getComputedStyle(panel);
    return body.getAttribute('data-cnc-detail-open') === 'true' && style.display !== 'none' && style.position === 'fixed';
  }, null, { timeout: 15000 });

  assert.equal(await page.locator('#detail-panel').isVisible(), true);
  assert.equal(await page.locator('#detail-back-btn').isVisible(), true);
  console.log('G/M已绑定按钮触发与实际全屏显示通过');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
