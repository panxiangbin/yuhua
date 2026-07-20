const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto('http://127.0.0.1:4173/cnc/?smoke=gcode-search', { waitUntil: 'domcontentloaded', timeout: 60000 });
  const card = page.locator('.launchpad-card[data-filter="gcode"]');
  await card.waitFor({ state: 'visible', timeout: 30000 });
  await card.click();
  await page.waitForFunction(() => window.__CNC_GM_PRO_INSTALLED__ === '20260720h', null, { timeout: 30000 });
  await page.waitForFunction(() => window.CNC_CLEAN_UI && window.CNC_CLEAN_UI.build === '20260720k', null, { timeout: 15000 });

  await page.locator('#search-input').fill('G1');
  await page.waitForTimeout(700);
  assert.match((await page.locator('#result-list').textContent()) || '', /G01/);

  const button = page.locator('#result-list [data-open-entry="kb-gcode-g01"]');
  await button.waitFor({ state: 'attached', timeout: 15000 });
  await page.waitForFunction(() => {
    const button = document.querySelector('#result-list [data-open-entry="kb-gcode-g01"]');
    return button && button.dataset.cncCleanBound === 'true';
  }, null, { timeout: 15000 });

  const style = await button.evaluate(element => {
    const computed = getComputedStyle(element);
    return { display: computed.display, opacity: computed.opacity, position: computed.position };
  });
  assert.equal(style.display, 'block');
  assert.equal(style.opacity, '0');
  assert.equal(style.position, 'absolute');

  console.log('G/M搜索、透明整卡按钮和自动绑定通过');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
