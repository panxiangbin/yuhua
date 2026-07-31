const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto('http://127.0.0.1:4173/cnc/?smoke=query-split-r', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => (
    window.CNC_QUERY_MODES?.build === '20260721r'
    && window.CNC_GAME_QUERY_NAV?.runCheck().passed
  ), null, { timeout: 30000 });

  const runtime = await page.evaluate(() => ({
    polling: window.CNC_QUERY_MODES.polling,
    attempts: window.CNC_QUERY_MODES.maxReadinessAttempts,
    readyAt: window.__CNC_QUERY_READY_AT__ || 0,
    queryNav: window.CNC_GAME_QUERY_NAV.runCheck()
  }));
  assert.equal(runtime.polling, false, '查询模式不得使用持续轮询');
  assert.ok(runtime.attempts <= 7, '查询模式就绪检查必须有严格上限');
  assert.ok(runtime.readyAt > 0, '查询模式应记录就绪时间');
  assert.equal(runtime.queryNav.passed, true);

  assert.equal(await page.locator('.launchpad-card[data-filter="params"]').count(), 0);
  assert.equal(await page.locator('.launchpad-card[data-filter="alarm"]').count(), 1);
  assert.equal(await page.locator('.launchpad-card[data-filter="parameter"]').count(), 1);
  assert.equal(await page.locator('.launchpad-card[data-filter="fault"]').count(), 1);
  assert.equal(await page.locator('.launchpad-grid').evaluate(node => node.getClientRects().length), 0, '手机闯关首页不得重新暴露旧工具卡');

  const quick = page.locator('#xp-game-home [data-xp-query-filter]');
  assert.equal(await quick.count(), 4);
  assert.deepEqual(await quick.evaluateAll(nodes => nodes.map(node => node.dataset.xpQueryFilter)), ['gcode', 'alarm', 'parameter', 'fault']);
  assert.ok((await quick.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height))).every(height => height >= 48));

  const counts = await page.evaluate(() => window.CNC_QUERY_MODES.getCounts());
  assert.ok(counts.alarm > 0);
  assert.ok(counts.parameter > 0);
  assert.ok(counts.fault > 0);

  for (const journey of [
    { filter: 'alarm', title: /报警排查/, placeholder: /SV0401|报警号/ },
    { filter: 'parameter', title: /参数速查/, placeholder: /1815|参数号/ },
    { filter: 'fault', title: /故障问诊/, placeholder: /回零失败|异常/ }
  ]) {
    const entry = page.locator(`#xp-game-home [data-xp-query-filter="${journey.filter}"]`);
    await entry.waitFor({ state: 'visible', timeout: 15000 });
    await entry.click();
    await page.waitForSelector('#view-workspace.active', { state: 'visible', timeout: 15000 });
    await page.waitForFunction(filter => document.body.dataset.cncQueryMode === filter, journey.filter, { timeout: 15000 });
    assert.match((await page.locator('#workspace-title').textContent()) || '', journey.title);
    assert.match(await page.locator('#search-input').getAttribute('placeholder') || '', journey.placeholder);
    assert.ok(await page.locator('#result-list .result-card').count() > 0);

    const home = page.locator('.xp-bottom-nav [data-xp-route="dashboard"]');
    await home.waitFor({ state: 'visible', timeout: 15000 });
    await home.click();
    await page.waitForSelector('#view-dashboard.active', { state: 'visible', timeout: 15000 });
    await page.waitForSelector('#xp-game-home .xp-game-query-panel[data-ready="true"]', { state: 'visible', timeout: 15000 });
  }

  console.log('三个手机可见查询入口、分类计数与无轮询初始化通过', runtime);
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
