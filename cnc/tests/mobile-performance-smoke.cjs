const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const DIAGNOSTIC_DIR = 'cnc/test-artifacts/industrial-card-sample';
fs.mkdirSync(DIAGNOSTIC_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error.message || error)));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });

  try {
    const started = Date.now();
    await page.goto('http://127.0.0.1:4173/cnc/?smoke=performance-industrial', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => {
      const visible = node => {
        if (!node) return false;
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0;
      };
      return window.CNC_PERSONAL_HOME?.refactorBuild === '20260804-mobile1' &&
        visible(document.querySelector('#view-dashboard.active .cnc-home-hero-copy')) &&
        visible(document.querySelector('#view-dashboard.active .launchpad-search')) &&
        visible(document.querySelector('#view-dashboard.active .cnc-home-route-card')) &&
        visible(document.querySelector('body > .xp-bottom-nav'));
    }, null, { timeout: 30000 });
    await page.waitForFunction(() => window.CNC_CLEAN_UI?.build === '20260721q', null, { timeout: 15000 });
    await page.waitForFunction(() => window.CNC_QUERY_MODES?.build === '20260721r', null, { timeout: 15000 });
    await page.waitForFunction(() => window.CNC_INDUSTRIAL_SAMPLE?.build === '20260722e', null, { timeout: 15000 });
    const readyMs = Date.now() - started;
    await page.waitForTimeout(2200);

    const report = await page.evaluate(() => {
      const visible = node => {
        if (!node) return false;
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0;
      };
      const nav = document.querySelector('body > .xp-bottom-nav');
      const navItems = nav ? Array.from(nav.querySelectorAll('button[data-xp-route],button[data-xp-filter]')).filter(visible) : [];
      const oldHome = document.querySelector('#xp-game-home,#xp-personal-home');
      const legacyGcode = document.querySelector('.launchpad-card[data-filter="gcode"]');
      return {
        cleanBuild: window.CNC_CLEAN_UI?.build,
        cleanPolling: window.CNC_CLEAN_UI?.polling,
        cleanAttempts: window.CNC_CLEAN_UI?.maxReadinessAttempts,
        queryBuild: window.CNC_QUERY_MODES?.build,
        queryPolling: window.CNC_QUERY_MODES?.polling,
        queryAttempts: window.CNC_QUERY_MODES?.maxReadinessAttempts,
        industrialBuild: window.CNC_INDUSTRIAL_SAMPLE?.build,
        industrialPolling: window.CNC_INDUSTRIAL_SAMPLE?.polling,
        industrialObserver: window.CNC_INDUSTRIAL_SAMPLE?.observer,
        personalBuild: window.CNC_PERSONAL_HOME?.build,
        refactorBuild: window.CNC_PERSONAL_HOME?.refactorBuild,
        cleanReadyAt: window.__CNC_CLEAN_READY_AT__ || 0,
        queryReadyAt: window.__CNC_QUERY_READY_AT__ || 0,
        heroVisible: visible(document.querySelector('#view-dashboard.active .cnc-home-hero-copy')),
        queryVisible: visible(document.querySelector('#view-dashboard.active .launchpad-search')),
        practiceVisible: visible(document.querySelector('#view-dashboard.active .cnc-home-route-card')),
        bottomNavVisible: visible(nav),
        bottomNavCount: navItems.length,
        oldHomeRemoved: !oldHome,
        legacyGcodeHidden: !legacyGcode || !visible(legacyGcode),
        scripts: performance.getEntriesByType('resource').filter(item => item.initiatorType === 'script').length,
        navigation: performance.getEntriesByType('navigation')[0] ? Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd) : 0
      };
    });

    const layerErrors = [...pageErrors, ...consoleErrors].filter(text => /clean-ui|query-modes|industrial-card|personal-home|cnc性能|cnc查询拆分|cnc减法界面|cnc工业卡片/i.test(text));
    assert.equal(report.cleanBuild, '20260721q');
    assert.equal(report.queryBuild, '20260721r');
    assert.equal(report.industrialBuild, '20260722e');
    assert.equal(report.personalBuild, '20260722b');
    assert.equal(report.refactorBuild, '20260804-mobile1');
    assert.equal(report.cleanPolling, false);
    assert.equal(report.queryPolling, false);
    assert.equal(report.industrialPolling, false);
    assert.equal(report.industrialObserver, false);
    assert.ok(report.cleanAttempts <= 7);
    assert.ok(report.queryAttempts <= 7);
    assert.ok(report.cleanReadyAt > 0);
    assert.ok(report.queryReadyAt > 0);
    assert.equal(report.heroVisible, true, '390×844应显示学习主入口');
    assert.equal(report.queryVisible, true, '390×844应显示查询入口');
    assert.equal(report.practiceVisible, true, '390×844应显示练习入口');
    assert.equal(report.bottomNavVisible, true, '390×844应显示真实底部导航');
    assert.equal(report.bottomNavCount, 5, `真实底部导航必须稳定为5项，实际${report.bottomNavCount}项`);
    assert.equal(report.oldHomeRemoved, true, '手机端不得恢复第二套旧首页');
    assert.equal(report.legacyGcodeHidden, true, '390×844旧工具目录应隐藏');
    assert.ok(readyMs < 12000, `手机首页可交互时间过长：${readyMs}ms`);
    assert.ok(report.scripts < 82, `首页脚本请求异常增多：${report.scripts}`);
    assert.deepEqual(layerErrors, [], `启动模块存在错误：${layerErrors.join(' | ')}`);

    fs.writeFileSync(`${DIAGNOSTIC_DIR}/mobile-performance-current.json`, JSON.stringify({ readyMs, report, pageErrors, consoleErrors }, null, 2));
    console.log('手机单层首页启动性能与后台增强层无轮询通过', { readyMs, ...report, pageErrorCount: pageErrors.length, consoleErrorCount: consoleErrors.length });
  } catch (error) {
    fs.writeFileSync(`${DIAGNOSTIC_DIR}/mobile-performance-current-error.txt`, `${error.stack || error}\n`);
    try { await page.screenshot({ path: `${DIAGNOSTIC_DIR}/mobile-performance-current-error-390x844.png`, fullPage: true }); } catch (_) {}
    throw error;
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });