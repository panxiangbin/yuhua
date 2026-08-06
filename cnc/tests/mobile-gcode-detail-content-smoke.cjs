const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const artifactDir = path.join(process.cwd(), 'cnc', 'test-artifacts', 'industrial-card-sample');
const reportPath = path.join(artifactDir, 'mobile-gcode-detail-content-report.json');
const screenshotPath = path.join(artifactDir, 'mobile-gcode-detail-content-390x844.png');

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
    await page.goto('http://127.0.0.1:4173/cnc/?smoke=gcode-detail-content', {
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
    await page.waitForFunction(() => /G01/.test(document.querySelector('#result-list')?.textContent || ''), null, { timeout: 15000 });

    const resultButton = page.locator('#result-list [data-open-entry="kb-gcode-g01"]');
    assert.equal(await resultButton.count(), 1, 'G01搜索结果必须只有一个整卡详情入口');
    await resultButton.waitFor({ state: 'attached', timeout: 15000 });
    await page.waitForFunction(() => {
      const target = document.querySelector('#result-list [data-open-entry="kb-gcode-g01"]');
      return target?.dataset.cncCleanBound === 'true'
        && Boolean(target.getAttribute('aria-label') || target.getAttribute('aria-labelledby'));
    }, null, { timeout: 15000 });
    await resultButton.click();

    await page.waitForFunction(() => {
      const panel = document.getElementById('detail-panel');
      const code = document.getElementById('detail-code');
      return panel?.classList.contains('mobile-open')
        && panel.getClientRects().length > 0
        && /G01/.test(code?.textContent || '');
    }, null, { timeout: 15000 });
    await page.evaluate(() => {
      window.CNC_CLEAN_UI?.confirmMobilePanel?.('kb-gcode-g01');
      window.CNC_CLEAN_UI?.syncIndustrialSample?.('kb-gcode-g01');
      window.CNC_TRUST_NAV?.refresh?.();
    });
    await page.waitForFunction(() => {
      const panel = document.getElementById('detail-panel');
      return /^(detail|g01)$/.test(document.body.getAttribute('data-cnc-industrial-surface') || '')
        && panel?.querySelector('.xp-trust-panel')?.getClientRects().length > 0
        && panel?.querySelector('[data-industrial-role="warning"]')?.getClientRects().length > 0;
    }, null, { timeout: 15000 });

    const detail = await page.evaluate(() => {
      const panel = document.getElementById('detail-panel');
      const code = document.getElementById('detail-code');
      const title = document.getElementById('detail-title');
      const back = document.getElementById('detail-back-btn');
      const favorite = document.getElementById('favorite-toggle');
      const share = document.getElementById('detail-share');
      const trust = document.querySelector('#detail-panel .xp-trust-panel');
      const warning = document.querySelector('#detail-panel [data-industrial-role="warning"]');
      const nav = document.querySelector('body > .xp-bottom-nav');
      const target = node => {
        const rect = node?.getBoundingClientRect();
        return {
          present: Boolean(node),
          visible: Boolean(node?.getClientRects().length),
          width: rect?.width || 0,
          height: rect?.height || 0,
          label: node?.getAttribute('aria-label') || node?.textContent?.trim() || ''
        };
      };
      return {
        surface: document.body.getAttribute('data-cnc-industrial-surface'),
        kind: document.body.getAttribute('data-cnc-detail-kind'),
        code: (code?.textContent || '').replace(/\s+/g, ' ').trim(),
        title: (title?.textContent || '').replace(/\s+/g, ' ').trim(),
        panelText: (panel?.textContent || '').replace(/\s+/g, ' ').trim(),
        panelVisible: Boolean(panel?.getClientRects().length),
        panelScrollWidth: panel?.scrollWidth || 0,
        panelClientWidth: panel?.clientWidth || 0,
        back: target(back),
        favorite: target(favorite),
        share: target(share),
        trustVisible: Boolean(trust?.getClientRects().length),
        warningVisible: Boolean(warning?.getClientRects().length),
        navVisible: Boolean(nav?.getClientRects().length),
        navAriaHidden: nav?.getAttribute('aria-hidden') || null,
        navInert: Boolean(nav?.hasAttribute('inert'))
      };
    });
    report.detail = detail;

    assert.ok(detail.surface === 'g01' || detail.surface === 'detail', `G01详情工业表面异常：${detail.surface}`);
    assert.ok(detail.kind === 'gcode' || detail.kind === 'knowledge', `G01详情类型异常：${detail.kind}`);
    assert.equal(detail.code, 'G01', `G01详情代码异常：${detail.code}`);
    assert.match(detail.title, /G01|直线插补/, `G01详情标题异常：${detail.title}`);
    assert.match(detail.panelText, /直线/, 'G01详情缺少直线运动说明');
    assert.match(detail.panelText, /进给|F值/, 'G01详情缺少进给速度说明');
    assert.match(detail.panelText, /原厂手册|机床说明书|现场/, 'G01详情缺少适用范围或现场核对边界');
    assert.equal(detail.panelVisible, true, 'G01详情面板不可见');
    assert.ok(detail.panelScrollWidth <= detail.panelClientWidth + 1, `G01详情存在横向溢出：${detail.panelScrollWidth}/${detail.panelClientWidth}`);
    assert.equal(detail.back.present, true, 'G01详情缺少返回列表按钮');
    assert.equal(detail.back.visible, true, 'G01详情返回列表按钮不可见');
    assert.ok(detail.back.width >= 44, `返回列表按钮宽度不足：${detail.back.width}`);
    assert.ok(detail.back.height >= 44, `返回列表按钮高度不足：${detail.back.height}`);
    assert.ok(detail.back.label, '返回列表按钮缺少可访问名称');
    assert.equal(detail.favorite.present, true, 'G01详情缺少收藏按钮');
    assert.ok(detail.favorite.width >= 44, `收藏按钮宽度不足：${detail.favorite.width}`);
    assert.ok(detail.favorite.height >= 44, `收藏按钮高度不足：${detail.favorite.height}`);
    assert.ok(detail.favorite.label, '收藏按钮缺少可访问名称');
    assert.equal(detail.share.present, true, 'G01详情缺少分享按钮');
    assert.ok(detail.share.width >= 44, `分享按钮宽度不足：${detail.share.width}`);
    assert.ok(detail.share.height >= 44, `分享按钮高度不足：${detail.share.height}`);
    assert.ok(detail.share.label, '分享按钮缺少可访问名称');
    assert.equal(detail.trustVisible, true, 'G01详情技术资料核验卡不可见');
    assert.equal(detail.warningVisible, true, 'G01详情风险提示不可见');
    assert.equal(detail.navVisible, true, 'G01详情应保留真实五项底栏');
    assert.equal(detail.navAriaHidden, 'false', 'G01详情底栏必须保留无障碍语义');
    assert.equal(detail.navInert, false, 'G01详情底栏不得被 inert 禁用');
    assert.equal(pageErrors.length, 0, `页面错误：${pageErrors.join(' | ')}`);
    assert.equal(consoleErrors.length, 0, `控制台错误：${consoleErrors.join(' | ')}`);
    assert.equal(failedRequests.length, 0, `本地资源请求失败：${failedRequests.join(' | ')}`);

    report.passed = true;
    report.pageErrors = pageErrors;
    report.consoleErrors = consoleErrors;
    report.failedRequests = failedRequests;
    console.log('真实单层首页、G01搜索与详情技术内容通过', { home, detail });
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
