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

  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error.message || error)));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  const started = Date.now();
  await page.goto('http://127.0.0.1:4173/cnc/?smoke=performance', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  await page.waitForSelector('.launchpad-card[data-filter="gcode"]', {
    state: 'visible',
    timeout: 30000
  });
  await page.waitForFunction(() => window.CNC_CLEAN_UI && window.CNC_CLEAN_UI.build === '20260721q', null, { timeout: 15000 });
  const readyMs = Date.now() - started;
  await page.waitForTimeout(2200);

  const report = await page.evaluate(() => ({
    cleanBuild: window.CNC_CLEAN_UI && window.CNC_CLEAN_UI.build,
    polling: window.CNC_CLEAN_UI && window.CNC_CLEAN_UI.polling,
    maxAttempts: window.CNC_CLEAN_UI && window.CNC_CLEAN_UI.maxReadinessAttempts,
    readyAt: window.__CNC_CLEAN_READY_AT__ || 0,
    scripts: performance.getEntriesByType('resource').filter(item => item.initiatorType === 'script').length,
    navigation: performance.getEntriesByType('navigation')[0] ? Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd) : 0
  }));

  const criticalConsoleErrors = consoleErrors.filter(text =>
    /uncaught|referenceerror|typeerror|syntaxerror|rangeerror|页面启动失败|模块加载失败/i.test(text) &&
    !/favicon|failed to load resource.*404/i.test(text)
  );

  assert.equal(report.cleanBuild, '20260721q');
  assert.equal(report.polling, false, '启动层不得使用持续轮询');
  assert.ok(report.maxAttempts <= 7, '就绪检查次数应有严格上限');
  assert.ok(readyMs < 12000, `手机首页可交互时间过长：${readyMs}ms`);
  assert.ok(report.scripts < 80, `首页脚本请求异常增多：${report.scripts}`);
  assert.deepEqual(pageErrors, [], `页面运行错误：${pageErrors.join(' | ')}`);
  assert.deepEqual(criticalConsoleErrors, [], `控制台关键错误：${criticalConsoleErrors.join(' | ')}`);

  console.log('手机启动性能通过', { readyMs, ...report, consoleErrorCount: consoleErrors.length });
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});