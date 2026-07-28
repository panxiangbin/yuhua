const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error.message || error)));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });

  const started = Date.now();
  await page.goto('http://127.0.0.1:4173/cnc/?smoke=performance-industrial', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#xp-game-home[data-ready="true"]', { state: 'visible', timeout: 30000 });
  await page.waitForFunction(() => window.CNC_CLEAN_UI && window.CNC_CLEAN_UI.build === '20260721q', null, { timeout: 15000 });
  await page.waitForFunction(() => window.CNC_QUERY_MODES && window.CNC_QUERY_MODES.build === '20260721r', null, { timeout: 15000 });
  await page.waitForFunction(() => window.CNC_INDUSTRIAL_SAMPLE && window.CNC_INDUSTRIAL_SAMPLE.build === '20260722e', null, { timeout: 15000 });
  const readyMs = Date.now() - started;
  await page.waitForTimeout(2200);

  const report = await page.evaluate(() => {
    const gameHome = document.getElementById('xp-game-home');
    const legacyGcode = document.querySelector('.launchpad-card[data-filter="gcode"]');
    return {
      cleanBuild: window.CNC_CLEAN_UI && window.CNC_CLEAN_UI.build,
      cleanPolling: window.CNC_CLEAN_UI && window.CNC_CLEAN_UI.polling,
      cleanAttempts: window.CNC_CLEAN_UI && window.CNC_CLEAN_UI.maxReadinessAttempts,
      queryBuild: window.CNC_QUERY_MODES && window.CNC_QUERY_MODES.build,
      queryPolling: window.CNC_QUERY_MODES && window.CNC_QUERY_MODES.polling,
      queryAttempts: window.CNC_QUERY_MODES && window.CNC_QUERY_MODES.maxReadinessAttempts,
      industrialBuild: window.CNC_INDUSTRIAL_SAMPLE && window.CNC_INDUSTRIAL_SAMPLE.build,
      industrialPolling: window.CNC_INDUSTRIAL_SAMPLE && window.CNC_INDUSTRIAL_SAMPLE.polling,
      industrialObserver: window.CNC_INDUSTRIAL_SAMPLE && window.CNC_INDUSTRIAL_SAMPLE.observer,
      cleanReadyAt: window.__CNC_CLEAN_READY_AT__ || 0,
      queryReadyAt: window.__CNC_QUERY_READY_AT__ || 0,
      gameHomeVisible: Boolean(gameHome && getComputedStyle(gameHome).display !== 'none' && gameHome.getBoundingClientRect().height > 0),
      legacyGcodeHidden: Boolean(legacyGcode && (getComputedStyle(legacyGcode).display === 'none' || legacyGcode.getBoundingClientRect().height === 0)),
      scripts: performance.getEntriesByType('resource').filter(item => item.initiatorType === 'script').length,
      navigation: performance.getEntriesByType('navigation')[0] ? Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd) : 0
    };
  });

  const layerErrors = [...pageErrors, ...consoleErrors].filter(text => /clean-ui|query-modes|industrial-card|cnc性能|cnc查询拆分|cnc减法界面|cnc工业卡片/i.test(text));
  assert.equal(report.cleanBuild, '20260721q');
  assert.equal(report.queryBuild, '20260721r');
  assert.equal(report.industrialBuild, '20260722e');
  assert.equal(report.cleanPolling, false);
  assert.equal(report.queryPolling, false);
  assert.equal(report.industrialPolling, false);
  assert.equal(report.industrialObserver, false);
  assert.ok(report.cleanAttempts <= 7);
  assert.ok(report.queryAttempts <= 7);
  assert.ok(report.cleanReadyAt > 0);
  assert.ok(report.queryReadyAt > 0);
  assert.equal(report.gameHomeVisible, true, '390×844应显示闯关首页');
  assert.equal(report.legacyGcodeHidden, true, '390×844旧工具目录应隐藏');
  assert.ok(readyMs < 12000, `手机首页可交互时间过长：${readyMs}ms`);
  assert.ok(report.scripts < 82, `首页脚本请求异常增多：${report.scripts}`);
  assert.deepEqual(layerErrors, [], `启动模块存在错误：${layerErrors.join(' | ')}`);

  console.log('手机闯关首页启动性能与后台增强层无轮询通过', { readyMs, ...report, pageErrorCount: pageErrors.length, consoleErrorCount: consoleErrors.length });
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });