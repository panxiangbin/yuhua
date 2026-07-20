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

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=split-search-v3', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.waitForFunction(() => {
    return window.CNC_CLEAN_UI &&
      document.querySelector('.launchpad-card[data-filter="alarm"]') &&
      document.querySelector('.launchpad-card[data-filter="params"]') &&
      document.querySelector('.launchpad-card[data-filter="fault"]');
  }, null, { timeout: 30000 });

  const labels = await page.locator('.launchpad-card[data-filter="alarm"] h3,.launchpad-card[data-filter="params"] h3,.launchpad-card[data-filter="fault"] h3').allTextContents();
  assert.deepEqual(labels, ['报警号查询', '参数号速查', '故障排查']);

  const filterChecks = await page.evaluate(() => ({
    alarmAcceptsAlarm: filterKeyMatches({ title: 'SV0401 伺服报警', code: 'SV0401', category: '报警' }, 'alarm'),
    alarmRejectsParameter: filterKeyMatches({ title: '1815 回零参数', code: '1815', category: '参数' }, 'alarm'),
    paramsAcceptsParameter: filterKeyMatches({ title: '1815 回零参数', code: '1815', category: '参数' }, 'params'),
    paramsRejectsAlarm: filterKeyMatches({ title: 'SV0401 伺服报警', code: 'SV0401', category: '报警' }, 'params'),
    faultAcceptsFault: filterKeyMatches({ title: '主轴不转故障排查', category: '维修' }, 'fault')
  }));
  assert.deepEqual(filterChecks, {
    alarmAcceptsAlarm: true,
    alarmRejectsParameter: false,
    paramsAcceptsParameter: true,
    paramsRejectsAlarm: false,
    faultAcceptsFault: true
  });

  async function openAndCheck(filter, title) {
    await page.locator(`.launchpad-card[data-filter="${filter}"]`).click();
    await page.waitForSelector('#view-workspace.active', { state: 'visible', timeout: 30000 });
    await page.waitForFunction(expected => typeof state !== 'undefined' && state.activeFilter === expected, filter, { timeout: 15000 });
    assert.equal((await page.locator('#workspace-title').textContent()).trim(), title);
    assert.equal((await page.locator('#topbar-title').textContent()).trim(), title);
    await page.evaluate(() => navigate('dashboard'));
    await page.waitForSelector('#view-dashboard.active', { state: 'visible', timeout: 15000 });
  }

  await openAndCheck('alarm', '报警号查询');
  await openAndCheck('params', '参数号速查');
  await openAndCheck('fault', '故障排查');

  assert.equal(await page.locator('body').evaluate(node => node.classList.contains('cnc-vivid-ui')), true);
  assert.equal(Boolean(await page.evaluate(() => navigator.serviceWorker && navigator.serviceWorker.controller)), false);

  console.log('报警、参数、故障独立入口、独立筛选与返回流程通过');
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
