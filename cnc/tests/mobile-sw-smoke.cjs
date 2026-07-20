const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=sw', {
    waitUntil: 'networkidle',
    timeout: 60000
  });
  await page.waitForTimeout(1500);

  const registrations = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return [];
    const regs = await navigator.serviceWorker.getRegistrations();
    return regs.map(reg => reg.scope);
  });
  assert.equal(registrations.length, 0, '不应重新注册 Service Worker：' + registrations.join(','));

  console.log('Service Worker保持停用');
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
