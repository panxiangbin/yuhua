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

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=query-split', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.waitForFunction(() => window.CNC_QUERY_MODES && window.CNC_QUERY_MODES.build === '20260720n', null, { timeout: 30000 });

  assert.equal(await page.locator('.launchpad-card[data-filter="params"]').count(), 0, '首页不应继续保留混合 params 入口');
  assert.equal(await page.locator('.launchpad-card[data-filter="alarm"]').count(), 1, '报警入口必须独立');
  assert.equal(await page.locator('.launchpad-card[data-filter="parameter"]').count(), 1, '参数入口必须独立');
  assert.equal(await page.locator('.launchpad-card[data-filter="fault"]').count(), 1, '故障入口必须独立');

  const counts = await page.evaluate(() => window.CNC_QUERY_MODES.getCounts());
  assert.ok(counts.alarm > 0, '报警模式应有独立数据');
  assert.ok(counts.parameter > 0, '参数模式应有独立数据');
  assert.ok(counts.fault > 0, '故障模式应有独立数据');

  const journeys = [
    { filter: 'alarm', title: /报警排查/, placeholder: /SV0401|报警号/ },
    { filter: 'parameter', title: /参数速查/, placeholder: /1815|参数号/ },
    { filter: 'fault', title: /故障问诊/, placeholder: /回零失败|故障现象|异常/ }
  ];

  for (const journey of journeys) {
    await page.evaluate(() => window.app.navigate('dashboard'));
    const card = page.locator(`.launchpad-card[data-filter="${journey.filter}"]`).first();
    await card.waitFor({ state: 'visible', timeout: 15000 });
    await card.click();
    await page.waitForFunction(filter => document.body.dataset.cncQueryMode === filter, journey.filter, { timeout: 15000 });
    assert.match((await page.locator('#workspace-title').textContent()) || '', journey.title);
    assert.match(await page.locator('#search-input').getAttribute('placeholder') || '', journey.placeholder);
    assert.ok(await page.locator('#result-list .result-card').count() > 0, `${journey.filter} 模式应渲染结果`);
  }

  console.log('报警、参数、故障三个入口和数据筛选已真正拆开');
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
