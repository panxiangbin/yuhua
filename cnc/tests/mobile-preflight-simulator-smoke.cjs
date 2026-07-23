const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/cnc/preflight-simulator.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.CNC_PREFLIGHT_SIMULATOR?.build === '20260724d');
  assert.match(await page.locator('h1').textContent(), /上机前安全检查排序/);
  assert.equal(await page.locator('.step').count(), 8);
  const buttons = page.locator('.step');
  for (let i = 0; i < await buttons.count(); i += 1) {
    assert.ok((await buttons.nth(i).evaluate(node => node.getBoundingClientRect().height)) >= 46);
  }
  for (const id of await page.evaluate(() => window.CNC_PREFLIGHT_SIMULATOR.answer)) {
    await page.locator(`.step[data-id="${id}"]`).click();
  }
  await page.locator('#submit').click();
  assert.match(await page.locator('#result').textContent(), /顺序正确/);
  assert.equal(await page.evaluate(() => window.CNC_PREFLIGHT_SIMULATOR.snapshot().passed), true);
  assert.match(await page.locator('.notice').textContent(), /原厂手册/);
  assert.match(await page.locator('.notice').textContent(), /现场监护/);
  assert.deepEqual(errors, []);
  console.log('上机前安全模拟器：8步排序、通过记录、触控区与安全边界通过');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });