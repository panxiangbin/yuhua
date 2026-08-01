const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const OUTPUT_DIR = path.join('artifacts', 'mobile-performance-budget');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const BUDGETS = Object.freeze({
  domContentLoadedMs: 5000,
  firstContentfulPaintMs: 5000,
  largestContentfulPaintMs: 8000,
  trustReadyMs: 10000,
  requestCount: 160,
  totalTransferBytes: 12 * 1024 * 1024,
  scriptTransferBytes: 4 * 1024 * 1024,
  styleTransferBytes: 2 * 1024 * 1024,
  maxLongTaskMs: 1000,
  totalLongTaskMs: 2500,
  cumulativeLayoutShift: 0.25,
  domNodeCount: 6500
});

function formatBytes(value) {
  if (!Number.isFinite(value)) return '未知';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / 1024 / 1024).toFixed(2)} MiB`;
}

function pushBudget(findings, label, actual, limit, formatter = value => `${Math.round(value)} ms`) {
  if (!Number.isFinite(actual)) {
    findings.push(`${label}未取得有效数值`);
    return;
  }
  if (actual > limit) findings.push(`${label}超出预算：实际 ${formatter(actual)}，上限 ${formatter(limit)}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce'
  });
  const page = await context.newPage();
  const browserErrors = [];
  const failedRequests = [];
  const findings = [];

  page.on('pageerror', error => browserErrors.push(`pageerror: ${String(error.message || error)}`));
  page.on('console', message => {
    if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`);
  });
  page.on('requestfailed', request => {
    const failure = request.failure();
    failedRequests.push(`${request.method()} ${request.url()}：${failure?.errorText || '未知错误'}`);
  });

  await page.addInitScript(() => {
    window.__CNC_PERF_AUDIT__ = {
      lcp: [],
      layoutShifts: [],
      longTasks: []
    };
    try {
      new PerformanceObserver(list => {
        window.__CNC_PERF_AUDIT__.lcp.push(...list.getEntries().map(entry => ({
          startTime: entry.startTime,
          renderTime: entry.renderTime,
          loadTime: entry.loadTime,
          size: entry.size,
          element: entry.element?.tagName || null
        })));
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (_) {}
    try {
      new PerformanceObserver(list => {
        window.__CNC_PERF_AUDIT__.layoutShifts.push(...list.getEntries().filter(entry => !entry.hadRecentInput).map(entry => ({
          value: entry.value,
          startTime: entry.startTime
        })));
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (_) {}
    try {
      new PerformanceObserver(list => {
        window.__CNC_PERF_AUDIT__.longTasks.push(...list.getEntries().map(entry => ({
          startTime: entry.startTime,
          duration: entry.duration
        })));
      }).observe({ type: 'longtask', buffered: true });
    } catch (_) {}
  });

  try {
    await page.goto('http://127.0.0.1:4173/cnc/?smoke=mobile-performance-budget', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForFunction(() => window.CNC_TRUST_NAV && (window.__CNC_TRUST_READY_AT__ || 0) > 0, null, { timeout: 30000 });
    await page.waitForSelector('#xp-game-home .xp-game-bottom-nav', { state: 'visible', timeout: 30000 });
    await page.waitForFunction(() => window.CNC_GAME_QUERY_NAV?.runCheck().utilityHidden === true, null, { timeout: 20000 });
    await page.waitForTimeout(1200);

    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paints = Object.fromEntries(performance.getEntriesByType('paint').map(entry => [entry.name, entry.startTime]));
      const resources = performance.getEntriesByType('resource').map(entry => ({
        name: entry.name,
        initiatorType: entry.initiatorType || 'other',
        transferSize: entry.transferSize || 0,
        encodedBodySize: entry.encodedBodySize || 0,
        decodedBodySize: entry.decodedBodySize || 0,
        duration: entry.duration || 0
      }));
      const sums = resources.reduce((result, entry) => {
        result.totalTransferBytes += entry.transferSize;
        result.totalEncodedBytes += entry.encodedBodySize;
        result.totalDecodedBytes += entry.decodedBodySize;
        const key = entry.initiatorType === 'script' ? 'script' : entry.initiatorType === 'link' || entry.initiatorType === 'css' ? 'style' : entry.initiatorType;
        result.byType[key] ||= { count: 0, transferBytes: 0, encodedBytes: 0, decodedBytes: 0 };
        result.byType[key].count += 1;
        result.byType[key].transferBytes += entry.transferSize;
        result.byType[key].encodedBytes += entry.encodedBodySize;
        result.byType[key].decodedBytes += entry.decodedBodySize;
        return result;
      }, { totalTransferBytes: 0, totalEncodedBytes: 0, totalDecodedBytes: 0, byType: {} });

      const perfAudit = window.__CNC_PERF_AUDIT__ || { lcp: [], layoutShifts: [], longTasks: [] };
      const latestLcp = perfAudit.lcp[perfAudit.lcp.length - 1] || null;
      const cls = perfAudit.layoutShifts.reduce((sum, entry) => sum + entry.value, 0);
      const maxLongTaskMs = perfAudit.longTasks.reduce((max, entry) => Math.max(max, entry.duration), 0);
      const totalLongTaskMs = perfAudit.longTasks.reduce((sum, entry) => sum + entry.duration, 0);
      const trustReadyEpoch = Number(window.__CNC_TRUST_READY_AT__ || 0);
      const trustReadyMs = trustReadyEpoch > 0 ? trustReadyEpoch - performance.timeOrigin : NaN;
      const loading = document.getElementById('loading-screen');
      const loadingVisible = Boolean(loading && loading.getClientRects().length && getComputedStyle(loading).display !== 'none' && getComputedStyle(loading).visibility !== 'hidden');
      const navItems = Array.from(document.querySelectorAll('#xp-game-home .xp-game-bottom-nav a')).filter(node => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      });

      return {
        navigation: navigation ? {
          domContentLoadedMs: navigation.domContentLoadedEventEnd,
          loadEventMs: navigation.loadEventEnd,
          responseEndMs: navigation.responseEnd,
          transferSize: navigation.transferSize,
          encodedBodySize: navigation.encodedBodySize,
          decodedBodySize: navigation.decodedBodySize
        } : null,
        firstContentfulPaintMs: paints['first-contentful-paint'] ?? NaN,
        largestContentfulPaintMs: latestLcp ? Math.max(latestLcp.renderTime || 0, latestLcp.loadTime || 0, latestLcp.startTime || 0) : NaN,
        largestContentfulPaint: latestLcp,
        cumulativeLayoutShift: cls,
        longTasks: perfAudit.longTasks,
        maxLongTaskMs,
        totalLongTaskMs,
        trustReadyMs,
        requestCount: resources.length + 1,
        resources,
        resourceSums: sums,
        domNodeCount: document.getElementsByTagName('*').length,
        loadingVisible,
        visibleBottomNavCount: navItems.length,
        visibleBottomNavLabels: navItems.map(node => (node.textContent || '').replace(/\s+/g, ' ').trim()),
        scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        clientWidth: document.documentElement.clientWidth,
        build: window.CNC_TRUST_NAV?.build || null,
        pwaControlled: Boolean(navigator.serviceWorker?.controller)
      };
    });

    const scriptTransferBytes = metrics.resourceSums.byType.script?.transferBytes || 0;
    const styleTransferBytes = metrics.resourceSums.byType.style?.transferBytes || 0;

    pushBudget(findings, 'DOMContentLoaded', metrics.navigation?.domContentLoadedMs, BUDGETS.domContentLoadedMs);
    pushBudget(findings, '首次内容绘制 FCP', metrics.firstContentfulPaintMs, BUDGETS.firstContentfulPaintMs);
    pushBudget(findings, '最大内容绘制 LCP', metrics.largestContentfulPaintMs, BUDGETS.largestContentfulPaintMs);
    pushBudget(findings, '手机首页可信导航就绪', metrics.trustReadyMs, BUDGETS.trustReadyMs);
    pushBudget(findings, '资源请求数量', metrics.requestCount, BUDGETS.requestCount, value => `${Math.round(value)} 个`);
    pushBudget(findings, '总传输体积', metrics.resourceSums.totalTransferBytes + (metrics.navigation?.transferSize || 0), BUDGETS.totalTransferBytes, formatBytes);
    pushBudget(findings, 'JavaScript 传输体积', scriptTransferBytes, BUDGETS.scriptTransferBytes, formatBytes);
    pushBudget(findings, '样式资源传输体积', styleTransferBytes, BUDGETS.styleTransferBytes, formatBytes);
    pushBudget(findings, '最长主线程长任务', metrics.maxLongTaskMs, BUDGETS.maxLongTaskMs);
    pushBudget(findings, '主线程长任务累计', metrics.totalLongTaskMs, BUDGETS.totalLongTaskMs);
    pushBudget(findings, '累计布局偏移 CLS', metrics.cumulativeLayoutShift, BUDGETS.cumulativeLayoutShift, value => value.toFixed(3));
    pushBudget(findings, 'DOM 节点数量', metrics.domNodeCount, BUDGETS.domNodeCount, value => `${Math.round(value)} 个`);

    if (metrics.loadingVisible) findings.push('页面完成初始化后加载层仍然可见');
    if (metrics.visibleBottomNavCount !== 5) findings.push(`手机首页主导航必须稳定为 5 项，当前为 ${metrics.visibleBottomNavCount} 项`);
    if (metrics.scrollWidth - metrics.clientWidth > 1) findings.push(`390px 手机宽度出现 ${metrics.scrollWidth - metrics.clientWidth}px 横向溢出`);
    if (failedRequests.length) findings.push(`存在 ${failedRequests.length} 个网络请求失败：${failedRequests.slice(0, 8).join('；')}`);

    const largestResources = [...metrics.resources]
      .sort((a, b) => b.transferSize - a.transferSize)
      .slice(0, 15)
      .map(entry => ({
        url: entry.name,
        initiatorType: entry.initiatorType,
        transferBytes: entry.transferSize,
        encodedBytes: entry.encodedBodySize,
        decodedBytes: entry.decodedBodySize,
        durationMs: entry.duration
      }));

    await page.screenshot({ path: path.join(OUTPUT_DIR, 'mobile-home-390x844.png'), fullPage: true });

    const report = {
      checkedAt: new Date().toISOString(),
      url: page.url(),
      viewport: { width: 390, height: 844, deviceScaleFactor: 2 },
      budgets: BUDGETS,
      metrics,
      largestResources,
      browserErrors,
      failedRequests,
      findings
    };
    fs.writeFileSync(path.join(OUTPUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'findings.txt'), findings.length ? findings.map((item, index) => `${index + 1}. ${item}`).join('\n') : '未发现性能预算阻断项\n');

    assert.deepEqual(browserErrors, [], `浏览器出现错误：\n${browserErrors.join('\n')}`);
    assert.deepEqual(findings, [], `手机端性能预算审计发现 ${findings.length} 项阻断：\n${findings.map((item, index) => `${index + 1}. ${item}`).join('\n')}`);
    console.log('CNC 手机端启动性能预算审计通过', {
      domContentLoadedMs: metrics.navigation?.domContentLoadedMs,
      firstContentfulPaintMs: metrics.firstContentfulPaintMs,
      largestContentfulPaintMs: metrics.largestContentfulPaintMs,
      trustReadyMs: metrics.trustReadyMs,
      requestCount: metrics.requestCount,
      totalTransferBytes: metrics.resourceSums.totalTransferBytes + (metrics.navigation?.transferSize || 0),
      scriptTransferBytes,
      styleTransferBytes,
      maxLongTaskMs: metrics.maxLongTaskMs,
      totalLongTaskMs: metrics.totalLongTaskMs,
      cumulativeLayoutShift: metrics.cumulativeLayoutShift,
      domNodeCount: metrics.domNodeCount
    });
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
