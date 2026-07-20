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

  await page.locator('#search-input').fill('G1');
  await page.waitForTimeout(700);
  assert.match((await page.locator('#result-list').textContent()) || '', /G01/);

  const result = page.locator('#result-list .result-card').first();
  await result.waitFor({ state: 'visible', timeout: 15000 });
  const button = result.locator('.result-button');
  assert.equal(await button.count(), 1);
  const style = await button.evaluate(element => {
    const computed = getComputedStyle(element);
    return { display: computed.display, opacity: computed.opacity, position: computed.position };
  });
  console.log('result-button-style', JSON.stringify(style));
  assert.equal(style.display, 'block');
  assert.equal(style.opacity, '0');
  assert.equal(style.position, 'absolute');

  console.log('G/M搜索与整卡点击层通过');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
