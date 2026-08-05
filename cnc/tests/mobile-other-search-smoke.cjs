const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const outputDir = path.resolve('cnc/test-artifacts/industrial-card-sample');
const reportPath = path.join(outputDir, 'mobile-parameter-journey-report.json');
const screenshotPath = path.join(outputDir, 'mobile-parameter-journey-390x844.png');
fs.mkdirSync(outputDir, { recursive: true });

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
  const failedRequests = [];
  const report = {
    passed: false,
    base: 'http://127.0.0.1:4173',
    viewport: { width: 390, height: 844 }
  };

  page.on('pageerror', error => pageErrors.push(String(error.message || error)));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('requestfailed', request => {
    if (request.url().startsWith('http://127.0.0.1:4173/cnc/')) {
      failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText || 'unknown'}`);
    }
  });

  function normalize(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  async function targetMetrics(locator, label) {
    await locator.waitFor({ state: 'visible', timeout: 15000 });
    const metrics = await locator.evaluate(node => {
      const rect = node.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        label: node.getAttribute('aria-label')
          || node.getAttribute('aria-labelledby')
          || node.querySelector('span')?.textContent?.replace(/\s+/g, ' ').trim()
          || node.textContent?.replace(/\s+/g, ' ').trim()
          || ''
      };
    });
    assert.ok(metrics.width >= 44, `${label}宽度不足：${metrics.width}`);
    assert.ok(metrics.height >= 44, `${label}高度不足：${metrics.height}`);
    assert.ok(normalize(metrics.label), `${label}缺少可访问名称`);
    return metrics;
  }

  async function waitForSingleHome() {
    await page.waitForFunction(() => {
      const check = window.CNC_PERSONAL_HOME?.runCheck?.();
      const nav = document.querySelector('body > .xp-bottom-nav');
      const items = nav ? Array.from(nav.querySelectorAll('button[data-xp-route], button[data-xp-filter]')) : [];
      const labels = items.map(node => (node.querySelector('span')?.textContent || '').replace(/\s+/g, ' ').trim());
      return window.CNC_QUERY_MODES?.build === '20260721r'
        && window.CNC_CLEAN_UI?.build === '20260721q'
        && window.__CNC_QUERY_READY_AT__ > 0
        && check?.legacyHomeRemoved === true
        && check?.bottomNavReady === true
        && document.querySelectorAll('#xp-game-home, #xp-personal-home').length === 0
        && document.querySelector('#view-dashboard.active')
        && nav?.getClientRects().length > 0
        && nav.getAttribute('aria-hidden') === 'false'
        && !nav.hasAttribute('inert')
        && items.length === 5
        && labels.join('|') === '首页|查代码|报警|学习|我的';
    }, null, { timeout: 30000 });
  }

  try {
    await page.goto('http://127.0.0.1:4173/cnc/?smoke=other-search-r', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await waitForSingleHome();

    report.home = await page.evaluate(() => {
      const nav = document.querySelector('body > .xp-bottom-nav');
      const items = nav ? Array.from(nav.querySelectorAll('button[data-xp-route], button[data-xp-filter]')) : [];
      return {
        activeView: document.querySelector('.view.active')?.id || '',
        oldHomeCount: document.querySelectorAll('#xp-game-home, #xp-personal-home').length,
        oldEnabledClass: document.body.classList.contains('cnc-game-home-enabled'),
        navVisible: Boolean(nav && nav.getClientRects().length > 0),
        navAriaHidden: nav?.getAttribute('aria-hidden') || null,
        navInert: Boolean(nav?.hasAttribute('inert')),
        navLabels: items.map(node => (node.querySelector('span')?.textContent || '').replace(/\s+/g, ' ').trim()),
        personal: window.CNC_PERSONAL_HOME?.runCheck?.() || null,
        query: {
          build: window.CNC_QUERY_MODES?.build || null,
          polling: window.CNC_QUERY_MODES?.polling,
          attempts: window.CNC_QUERY_MODES?.maxReadinessAttempts,
          readyAt: window.__CNC_QUERY_READY_AT__ || 0
        }
      };
    });

    assert.equal(report.home.activeView, 'view-dashboard');
    assert.equal(report.home.oldHomeCount, 0, '不得恢复已删除的第二套手机首页');
    assert.equal(report.home.oldEnabledClass, false, '不得恢复旧闯关首页状态类');
    assert.equal(report.home.navVisible, true, '真实五项底栏必须可见');
    assert.equal(report.home.navAriaHidden, 'false', '真实五项底栏必须进入无障碍树');
    assert.equal(report.home.navInert, false, '真实五项底栏不得被 inert 禁用');
    assert.deepEqual(report.home.navLabels, ['首页', '查代码', '报警', '学习', '我的']);
    assert.equal(report.home.personal?.legacyHomeRemoved, true);
    assert.equal(report.home.personal?.bottomNavReady, true);
    assert.equal(report.home.query.polling, false, '查询模式不得使用持续轮询');
    assert.ok(report.home.query.attempts <= 7, '查询模式就绪检查必须有严格上限');
    assert.ok(report.home.query.readyAt > 0, '查询模式应记录就绪时间');

    const menu = page.locator('#sidebar-open');
    report.menuTarget = await targetMetrics(menu, '手机目录入口');
    await menu.click();
    await page.waitForFunction(() => document.getElementById('sidebar')?.classList.contains('open'), null, { timeout: 15000 });

    const parameterEntry = page.locator('#sidebar [data-tree-panel="workspace"] .tree-item[data-filter="parameter"]').first();
    report.parameterTarget = await targetMetrics(parameterEntry, '参数速查入口');
    await parameterEntry.click();

    await page.waitForSelector('#view-workspace.active #result-list .result-card', { state: 'visible', timeout: 30000 });
    await page.waitForFunction(() => document.body.dataset.cncQueryMode === 'parameter', null, { timeout: 15000 });

    assert.equal(await page.locator('#workspace-mode-row').evaluate(node => getComputedStyle(node).display), 'none');
    assert.equal(await page.locator('#preset-chip-row').evaluate(node => getComputedStyle(node).display), 'none');
    assert.match(normalize(await page.locator('#workspace-title').textContent()), /参数速查/);
    assert.match(await page.locator('#search-input').getAttribute('placeholder') || '', /1815|参数号/);

    const resultCards = page.locator('#result-list .result-card');
    const resultCount = await resultCards.count();
    assert.ok(resultCount > 0, '参数速查必须返回真实结果');

    const firstCard = resultCards.first();
    const button = firstCard.locator('.result-button');
    assert.equal(await button.count(), 1, '参数结果必须只有一个透明整卡入口');
    const buttonState = await button.evaluate(element => {
      const style = getComputedStyle(element);
      return {
        display: style.display,
        opacity: style.opacity,
        position: style.position,
        bound: element.dataset.cncCleanBound || null,
        ariaLabel: element.getAttribute('aria-label') || '',
        ariaLabelledby: element.getAttribute('aria-labelledby') || ''
      };
    });
    assert.deepEqual(
      { display: buttonState.display, opacity: buttonState.opacity, position: buttonState.position },
      { display: 'block', opacity: '0', position: 'absolute' }
    );
    assert.equal(buttonState.bound, 'true', '参数整卡入口必须由无轮询增强层完成绑定');
    assert.ok(normalize(buttonState.ariaLabel || buttonState.ariaLabelledby), '参数整卡入口必须有明确可访问名称');

    report.workspace = await page.evaluate(() => ({
      mode: document.body.dataset.cncQueryMode || null,
      title: document.getElementById('workspace-title')?.textContent?.replace(/\s+/g, ' ').trim() || '',
      placeholder: document.getElementById('search-input')?.getAttribute('placeholder') || '',
      resultCount: document.querySelectorAll('#result-list .result-card').length,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    report.workspace.button = buttonState;
    assert.ok(report.workspace.scrollWidth <= report.workspace.clientWidth + 1, '参数工作区不得横向溢出');

    await button.click({ force: true });
    await page.waitForFunction(() => {
      const panel = document.getElementById('detail-panel');
      return document.body.dataset.cncDetailOpen === 'true'
        && document.body.dataset.cncIndustrialSurface === 'detail'
        && panel?.classList.contains('mobile-open')
        && getComputedStyle(panel).position === 'fixed';
    }, null, { timeout: 15000 });

    report.detail = await page.evaluate(() => {
      const panel = document.getElementById('detail-panel');
      const back = document.getElementById('detail-back-btn');
      const nav = document.querySelector('body > .xp-bottom-nav');
      const panelRect = panel?.getBoundingClientRect();
      const backRect = back?.getBoundingClientRect();
      return {
        surface: document.body.dataset.cncIndustrialSurface || null,
        kind: document.body.dataset.cncDetailKind || null,
        code: document.getElementById('detail-code')?.textContent?.replace(/\s+/g, ' ').trim() || '',
        text: panel?.textContent?.replace(/\s+/g, ' ').trim() || '',
        position: panel ? getComputedStyle(panel).position : null,
        panelBox: panelRect ? { width: panelRect.width, height: panelRect.height } : null,
        panelScrollWidth: panel?.scrollWidth || 0,
        panelClientWidth: panel?.clientWidth || 0,
        back: backRect ? {
          width: backRect.width,
          height: backRect.height,
          label: back?.getAttribute('aria-label') || back?.textContent?.replace(/\s+/g, ' ').trim() || ''
        } : null,
        trustVisible: Boolean(document.querySelector('#detail-panel .trust-card, #detail-panel [data-trust-card], #detail-panel .detail-trust-card')?.getClientRects().length),
        navVisible: Boolean(nav && nav.getClientRects().length > 0),
        navAriaHidden: nav?.getAttribute('aria-hidden') || null,
        navInert: Boolean(nav?.hasAttribute('inert'))
      };
    });

    assert.equal(report.detail.surface, 'detail');
    assert.ok(report.detail.kind === 'parameter' || report.detail.kind === 'knowledge', `参数详情类型异常：${report.detail.kind}`);
    assert.ok(report.detail.code, '参数详情必须显示参数号或名称');
    assert.equal(report.detail.position, 'fixed', '参数详情必须使用手机全屏固定面板');
    assert.ok(report.detail.panelBox.width >= 389 && report.detail.panelBox.height >= 843, '参数详情必须覆盖390×844视口');
    assert.ok(report.detail.panelScrollWidth <= report.detail.panelClientWidth + 1, '参数详情不得横向溢出');
    assert.ok(report.detail.back?.width >= 44 && report.detail.back?.height >= 44, '返回按钮触控区不得小于44×44px');
    assert.ok(normalize(report.detail.back?.label), '返回按钮必须有可访问名称');
    assert.match(report.detail.text, /原厂手册|机床说明书|厂家参数|现场核对/, '参数详情必须说明适用范围和原厂资料核对边界');
    assert.equal(report.detail.navVisible, true, '参数详情应保留真实五项底栏');
    assert.equal(report.detail.navAriaHidden, 'false', '参数详情底栏必须保留无障碍语义');
    assert.equal(report.detail.navInert, false, '参数详情底栏不得被 inert 禁用');

    await page.locator('#detail-back-btn').click();
    await page.waitForFunction(() => {
      const panel = document.getElementById('detail-panel');
      return !panel?.classList.contains('mobile-open')
        && document.querySelector('#view-workspace.active')
        && document.body.dataset.cncQueryMode === 'parameter';
    }, null, { timeout: 15000 });

    report.closed = await page.evaluate(() => ({
      detailOpen: document.body.dataset.cncDetailOpen || null,
      workspaceActive: Boolean(document.querySelector('#view-workspace.active')),
      mode: document.body.dataset.cncQueryMode || null,
      resultCount: document.querySelectorAll('#result-list .result-card').length
    }));
    assert.equal(report.closed.workspaceActive, true, '关闭参数详情后必须返回查询工作区');
    assert.equal(report.closed.mode, 'parameter', '关闭参数详情后必须保留参数查询模式');
    assert.ok(report.closed.resultCount > 0, '关闭参数详情后必须恢复参数结果');

    assert.equal(pageErrors.length, 0, `页面出现错误：${pageErrors.join(' | ')}`);
    assert.equal(consoleErrors.length, 0, `控制台出现错误：${consoleErrors.join(' | ')}`);
    assert.equal(failedRequests.length, 0, `本地资源请求失败：${failedRequests.join(' | ')}`);

    report.passed = true;
    report.pageErrors = pageErrors;
    report.consoleErrors = consoleErrors;
    report.failedRequests = failedRequests;
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    console.log('真实单层首页、手机目录参数入口、参数整卡、全屏详情、安全边界与返回状态通过', report);
  } catch (error) {
    report.error = error.stack || error.message || String(error);
    report.pageErrors = pageErrors;
    report.consoleErrors = consoleErrors;
    report.failedRequests = failedRequests;
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    throw error;
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
