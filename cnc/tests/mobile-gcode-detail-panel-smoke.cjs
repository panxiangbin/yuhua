const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const artifactDir = path.join(process.cwd(), 'cnc', 'test-artifacts', 'industrial-card-sample');
const reportPath = path.join(artifactDir, 'mobile-gcode-detail-panel-report.json');
const screenshotPath = path.join(artifactDir, 'mobile-gcode-detail-panel-390x844.png');

(async () => {
  fs.mkdirSync(artifactDir, { recursive: true });
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
    const url = request.url();
    if (url.startsWith('http://127.0.0.1:4173/')) {
      failedRequests.push(`${url} ${request.failure()?.errorText || ''}`.trim());
    }
  });

  try {
    await page.goto('http://127.0.0.1:4173/cnc/?smoke=gcode-detail-panel', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForFunction(() => {
      const check = window.CNC_PERSONAL_HOME?.runCheck?.();
      const nav = document.querySelector('body > .xp-bottom-nav');
      const entry = nav?.querySelector('button[data-xp-filter="gcode"]');
      return window.CNC_QUERY_MODES?.build === '20260721r'
        && check?.legacyHomeRemoved === true
        && check?.bottomNavReady === true
        && document.querySelector('#view-dashboard.active')
        && nav?.getClientRects().length > 0
        && nav.getAttribute('aria-hidden') === 'false'
        && !nav.hasAttribute('inert')
        && entry?.getClientRects().length > 0;
    }, null, { timeout: 30000 });

    const home = await page.evaluate(() => {
      const nav = document.querySelector('body > .xp-bottom-nav');
      const items = nav ? Array.from(nav.querySelectorAll('button[data-xp-route], button[data-xp-filter]')) : [];
      const entry = nav?.querySelector('button[data-xp-filter="gcode"]');
      const rect = entry?.getBoundingClientRect();
      return {
        activeView: document.querySelector('.view.active')?.id || '',
        oldHomeCount: document.querySelectorAll('#xp-game-home, #xp-personal-home').length,
        oldEnabledClass: document.body.classList.contains('cnc-game-home-enabled'),
        navVisible: Boolean(nav?.getClientRects().length),
        navAriaHidden: nav?.getAttribute('aria-hidden') || null,
        navInert: Boolean(nav?.hasAttribute('inert')),
        navLabels: items.map(node => (node.querySelector('span')?.textContent || '').replace(/\s+/g, ' ').trim()),
        gcodeTarget: {
          present: Boolean(entry),
          visible: Boolean(entry?.getClientRects().length),
          width: rect?.width || 0,
          height: rect?.height || 0,
          label: entry?.getAttribute('aria-label') || entry?.textContent?.trim() || ''
        },
        personal: window.CNC_PERSONAL_HOME?.runCheck?.() || null
      };
    });
    report.home = home;

    assert.equal(home.activeView, 'view-dashboard');
    assert.equal(home.oldHomeCount, 0, '不得恢复已删除的双手机首页');
    assert.equal(home.oldEnabledClass, false, '不得恢复旧闯关首页状态类');
    assert.equal(home.navVisible, true, '真实五项底栏必须可见');
    assert.equal(home.navAriaHidden, 'false', '真实五项底栏必须进入无障碍树');
    assert.equal(home.navInert, false, '真实五项底栏不得被 inert 禁用');
    assert.deepEqual(home.navLabels, ['首页', '查代码', '报警', '学习', '我的']);
    assert.equal(home.personal?.legacyHomeRemoved, true);
    assert.equal(home.personal?.bottomNavReady, true);
    assert.equal(home.gcodeTarget.present, true, '真实查代码入口不存在');
    assert.equal(home.gcodeTarget.visible, true, '真实查代码入口不可见');
    assert.ok(home.gcodeTarget.width >= 44, `查代码入口宽度不足：${home.gcodeTarget.width}`);
    assert.ok(home.gcodeTarget.height >= 44, `查代码入口高度不足：${home.gcodeTarget.height}`);
    assert.ok(home.gcodeTarget.label, '查代码入口缺少可访问名称');

    await page.locator('body > .xp-bottom-nav button[data-xp-filter="gcode"]').first().click();
    await page.waitForFunction(() => {
      const workspace = document.getElementById('view-workspace');
      return window.__CNC_GM_PRO_INSTALLED__ === '20260720h'
        && window.CNC_CLEAN_UI?.build === '20260721q'
        && workspace?.classList.contains('active')
        && document.body.getAttribute('data-cnc-query-mode') === 'gcode';
    }, null, { timeout: 30000 });

    await page.locator('#search-input').fill('G1');
    await page.waitForFunction(() => {
      const button = document.querySelector('#result-list [data-open-entry="kb-gcode-g01"]');
      return button?.dataset.cncCleanBound === 'true'
        && Boolean(button.getAttribute('aria-label') || button.getAttribute('aria-labelledby'));
    }, null, { timeout: 15000 });

    const resultButton = page.locator('#result-list [data-open-entry="kb-gcode-g01"]');
    assert.equal(await resultButton.count(), 1, 'G01搜索结果必须只有一个整卡详情入口');
    await resultButton.click();

    await page.waitForFunction(() => {
      const panel = document.getElementById('detail-panel');
      if (!panel || !document.body) return false;
      const style = getComputedStyle(panel);
      return document.body.getAttribute('data-cnc-detail-open') === 'true'
        && document.body.classList.contains('cnc-detail-open')
        && panel.classList.contains('mobile-open')
        && panel.getClientRects().length > 0
        && style.display !== 'none'
        && style.position === 'fixed';
    }, null, { timeout: 15000 });

    const opened = await page.evaluate(() => {
      const panel = document.getElementById('detail-panel');
      const back = document.getElementById('detail-back-btn');
      const nav = document.querySelector('body > .xp-bottom-nav');
      const panelRect = panel?.getBoundingClientRect();
      const backRect = back?.getBoundingClientRect();
      const panelStyle = panel ? getComputedStyle(panel) : null;
      const bodyStyle = getComputedStyle(document.body);
      return {
        bodyDetailOpen: document.body.getAttribute('data-cnc-detail-open'),
        bodyClassOpen: document.body.classList.contains('cnc-detail-open'),
        bodyOverflow: bodyStyle.overflow,
        panelVisible: Boolean(panel?.getClientRects().length),
        panelMobileOpen: Boolean(panel?.classList.contains('mobile-open')),
        panelPosition: panelStyle?.position || '',
        panelDisplay: panelStyle?.display || '',
        panelZIndex: Number.parseInt(panelStyle?.zIndex || '0', 10) || 0,
        panelOverflowY: panelStyle?.overflowY || '',
        panelBox: {
          x: panelRect?.x || 0,
          y: panelRect?.y || 0,
          width: panelRect?.width || 0,
          height: panelRect?.height || 0
        },
        back: {
          present: Boolean(back),
          visible: Boolean(back?.getClientRects().length),
          width: backRect?.width || 0,
          height: backRect?.height || 0,
          label: back?.getAttribute('aria-label') || back?.textContent?.trim() || ''
        },
        navVisible: Boolean(nav?.getClientRects().length),
        navAriaHidden: nav?.getAttribute('aria-hidden') || null,
        navInert: Boolean(nav?.hasAttribute('inert')),
        detailCode: (document.getElementById('detail-code')?.textContent || '').replace(/\s+/g, ' ').trim()
      };
    });
    report.opened = opened;

    assert.equal(opened.bodyDetailOpen, 'true', '打开详情后必须写入明确的页面状态');
    assert.equal(opened.bodyClassOpen, true, '打开详情后必须保留详情状态类');
    assert.equal(opened.bodyOverflow, 'hidden', '全屏详情打开时页面背景必须锁定滚动');
    assert.equal(opened.panelVisible, true, 'G01详情面板不可见');
    assert.equal(opened.panelMobileOpen, true, 'G01详情面板缺少手机全屏状态类');
    assert.equal(opened.panelPosition, 'fixed', '手机详情面板必须固定覆盖视口');
    assert.notEqual(opened.panelDisplay, 'none', '手机详情面板不得隐藏');
    assert.ok(opened.panelZIndex >= 500, `手机详情层级不足：${opened.panelZIndex}`);
    assert.ok(['auto', 'scroll'].includes(opened.panelOverflowY), `手机详情纵向滚动异常：${opened.panelOverflowY}`);
    assert.ok(Math.abs(opened.panelBox.x) <= 1, `手机详情左边界异常：${opened.panelBox.x}`);
    assert.ok(Math.abs(opened.panelBox.y) <= 1, `手机详情上边界异常：${opened.panelBox.y}`);
    assert.ok(opened.panelBox.width >= 389, `手机详情宽度不足：${opened.panelBox.width}`);
    assert.ok(opened.panelBox.height >= 843, `手机详情高度不足：${opened.panelBox.height}`);
    assert.equal(opened.detailCode, 'G01', `详情代码异常：${opened.detailCode}`);
    assert.equal(opened.back.present, true, '手机详情缺少返回列表按钮');
    assert.equal(opened.back.visible, true, '手机详情返回列表按钮不可见');
    assert.ok(opened.back.width >= 44, `返回按钮宽度不足：${opened.back.width}`);
    assert.ok(opened.back.height >= 44, `返回按钮高度不足：${opened.back.height}`);
    assert.ok(opened.back.label, '返回按钮缺少可访问名称');
    assert.equal(opened.navVisible, true, '详情打开时真实五项底栏结构必须保持可见状态');
    assert.equal(opened.navAriaHidden, 'false', '详情打开时底栏不得丢失无障碍语义');
    assert.equal(opened.navInert, false, '详情打开时底栏不得被 inert 禁用');

    await page.locator('#detail-back-btn').click();
    await page.waitForFunction(() => {
      const panel = document.getElementById('detail-panel');
      const input = document.getElementById('search-input');
      return !document.body.hasAttribute('data-cnc-detail-open')
        && !document.body.classList.contains('cnc-detail-open')
        && panel && !panel.classList.contains('mobile-open')
        && document.getElementById('view-workspace')?.classList.contains('active')
        && input?.value === 'G1';
    }, null, { timeout: 15000 });

    const closed = await page.evaluate(() => {
      const panel = document.getElementById('detail-panel');
      const input = document.getElementById('search-input');
      return {
        bodyDetailOpen: document.body.getAttribute('data-cnc-detail-open'),
        bodyClassOpen: document.body.classList.contains('cnc-detail-open'),
        panelMobileOpen: Boolean(panel?.classList.contains('mobile-open')),
        workspaceActive: Boolean(document.getElementById('view-workspace')?.classList.contains('active')),
        query: input?.value || '',
        resultPresent: Boolean(document.querySelector('#result-list [data-open-entry="kb-gcode-g01"]'))
      };
    });
    report.closed = closed;

    assert.equal(closed.bodyDetailOpen, null, '关闭详情后必须移除页面详情状态');
    assert.equal(closed.bodyClassOpen, false, '关闭详情后必须移除详情状态类');
    assert.equal(closed.panelMobileOpen, false, '关闭详情后必须移除手机全屏状态类');
    assert.equal(closed.workspaceActive, true, '关闭详情后必须返回查询工作区');
    assert.equal(closed.query, 'G1', '关闭详情后必须恢复用户查询条件');
    assert.equal(closed.resultPresent, true, '关闭详情后G01结果必须继续存在');
    assert.equal(pageErrors.length, 0, `页面错误：${pageErrors.join(' | ')}`);
    assert.equal(consoleErrors.length, 0, `控制台错误：${consoleErrors.join(' | ')}`);
    assert.equal(failedRequests.length, 0, `本地资源请求失败：${failedRequests.join(' | ')}`);

    report.passed = true;
    report.pageErrors = pageErrors;
    report.consoleErrors = consoleErrors;
    report.failedRequests = failedRequests;
    console.log('真实单层首页、G01整卡触发、手机全屏详情与返回查询状态通过', {
      home,
      opened,
      closed
    });
  } catch (error) {
    report.error = String(error?.stack || error);
    report.pageErrors = pageErrors;
    report.consoleErrors = consoleErrors;
    report.failedRequests = failedRequests;
    throw error;
  } finally {
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
    } catch (error) {
      report.screenshotError = String(error?.message || error);
    }
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
