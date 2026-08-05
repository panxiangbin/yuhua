const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = path.resolve('cnc/test-artifacts/industrial-card-sample');
const REPORT_PATH = path.join(ARTIFACT_DIR, 'mobile-industrial-records-report.json');
const ERROR_PATH = path.join(ARTIFACT_DIR, 'mobile-industrial-records-error.txt');
const SCREENSHOT_PATH = path.join(ARTIFACT_DIR, 'mobile-industrial-records-390x844.png');
const ERROR_SCREENSHOT_PATH = path.join(ARTIFACT_DIR, 'mobile-industrial-records-error-390x844.png');

function ensureArtifactDir() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function fail(message, detail) {
  const suffix = detail === undefined ? '' : `: ${JSON.stringify(detail)}`;
  throw new Error(message + suffix);
}

async function waitForSingleMobileHome(page) {
  await page.waitForFunction(() => {
    if (!window.CNC_PERSONAL_HOME || typeof window.CNC_PERSONAL_HOME.runCheck !== 'function') return false;
    const result = window.CNC_PERSONAL_HOME.runCheck();
    return result && result.mobile && result.legacyHomeRemoved && result.bottomNavReady;
  }, null, { timeout: 30000 });

  return page.evaluate(() => {
    const dashboard = document.querySelector('#view-dashboard');
    const nav = document.querySelector('body > .xp-bottom-nav');
    const items = nav
      ? [...nav.querySelectorAll('button[data-xp-route], button[data-xp-filter]')]
      : [];
    return {
      activeView: document.querySelector('.view.active')?.id || '',
      dashboardActive: Boolean(dashboard && dashboard.classList.contains('active')),
      oldHomeCount: document.querySelectorAll('#xp-game-home, #xp-personal-home').length,
      navVisible: Boolean(nav && nav.getClientRects().length),
      navAriaHidden: nav?.getAttribute('aria-hidden') || null,
      navInert: Boolean(nav?.hasAttribute('inert')),
      navLabels: items.map(item => (item.querySelector('span')?.textContent || '').replace(/\s+/g, ' ').trim()),
      navTargets: items.map(item => {
        const rect = item.getBoundingClientRect();
        return {
          route: item.dataset.xpRoute || item.dataset.xpFilter || '',
          label: item.getAttribute('aria-label') || (item.textContent || '').trim(),
          width: rect.width,
          height: rect.height
        };
      }),
      personal: window.CNC_PERSONAL_HOME.runCheck()
    };
  });
}

(async () => {
  ensureArtifactDir();
  const base = process.env.CNC_URL || 'http://127.0.0.1:4173';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });

  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('requestfailed', request => {
    failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`.trim());
  });

  let report = {
    passed: false,
    base,
    viewport: { width: 390, height: 844 },
    homeBeforeReload: null,
    homeAfterReload: null,
    ids: [],
    records: null,
    finalView: '',
    consoleErrors,
    pageErrors,
    failedRequests
  };

  try {
    await page.goto(base + '/cnc/', { waitUntil: 'networkidle' });
    report.homeBeforeReload = await waitForSingleMobileHome(page);

    if (!report.homeBeforeReload.dashboardActive || report.homeBeforeReload.activeView !== 'view-dashboard') {
      fail('根网址启动后没有稳定停留在单层首页', report.homeBeforeReload);
    }
    if (report.homeBeforeReload.oldHomeCount !== 0) {
      fail('已删除的旧双首页不得恢复', report.homeBeforeReload.oldHomeCount);
    }

    const expectedLabels = ['首页', '查代码', '报警', '学习', '我的'];
    if (!report.homeBeforeReload.navVisible || report.homeBeforeReload.navAriaHidden !== 'false' || report.homeBeforeReload.navInert) {
      fail('手机首页真实五项底栏必须可见且可访问', report.homeBeforeReload);
    }
    if (JSON.stringify(report.homeBeforeReload.navLabels) !== JSON.stringify(expectedLabels)) {
      fail('手机底栏名称或顺序漂移', report.homeBeforeReload.navLabels);
    }
    const smallNavTarget = report.homeBeforeReload.navTargets.find(item => item.width < 44 || item.height < 48 || !item.label);
    if (smallNavTarget) fail('手机底栏触控区或可访问名称不合格', smallNavTarget);

    report.ids = await page.evaluate(() => {
      const list = Array.isArray(window.CNC_DATA) ? window.CNC_DATA.filter(item => item && item.id) : [];
      return list.slice(0, 3).map(item => item.id);
    });
    if (report.ids.length < 3) fail('基础知识条目不足，无法建立最近与收藏回归数据', report.ids);

    await page.evaluate(ids => {
      localStorage.setItem('cnc_app_recents_v2', JSON.stringify(ids.slice(0, 2)));
      localStorage.setItem('cnc_app_favorites_v2', JSON.stringify(ids.slice(1, 3)));
    }, report.ids);

    await page.reload({ waitUntil: 'networkidle' });
    report.homeAfterReload = await waitForSingleMobileHome(page);
    if (!report.homeAfterReload.dashboardActive || report.homeAfterReload.oldHomeCount !== 0) {
      fail('写入学习记录后单层首页状态异常', report.homeAfterReload);
    }

    const favoritesNav = page.locator('body > .xp-bottom-nav button[data-xp-route="favorites"]');
    if (await favoritesNav.count() !== 1 || !(await favoritesNav.isVisible())) {
      fail('真实“我的”底栏入口缺失或不可见');
    }
    const favoritesBox = await favoritesNav.boundingBox();
    const favoritesLabel = await favoritesNav.getAttribute('aria-label');
    if (!favoritesBox || favoritesBox.width < 44 || favoritesBox.height < 48 || !favoritesLabel) {
      fail('真实“我的”入口触控区或可访问名称不合格', { favoritesBox, favoritesLabel });
    }

    await favoritesNav.click();
    await page.waitForFunction(() => {
      const view = document.querySelector('#view-favorites.view.active');
      return Boolean(view && view.dataset.industrialRecords === 'ready');
    }, null, { timeout: 15000 });

    report.records = await page.evaluate(() => {
      const view = document.querySelector('#view-favorites.view.active');
      const cards = view ? [...view.querySelectorAll('.favorites-grid > .detail-card')] : [];
      const buttons = view ? [...view.querySelectorAll('.link-cloud [data-link-entry]')] : [];
      const first = cards[0]?.getBoundingClientRect();
      const second = cards[1]?.getBoundingClientRect();
      const firstButton = buttons[0];
      const buttonStyle = firstButton ? getComputedStyle(firstButton) : null;
      return {
        viewReady: Boolean(view && view.dataset.industrialRecords === 'ready'),
        cards: cards.length,
        buttons: buttons.length,
        singleColumn: Boolean(first && second && second.top > first.bottom),
        buttonHeight: firstButton ? firstButton.getBoundingClientRect().height : 0,
        radius: buttonStyle ? buttonStyle.borderRadius : '',
        backgroundImage: buttonStyle ? buttonStyle.backgroundImage : '',
        countBadges: view ? view.querySelectorAll('.xp-record-count').length : 0,
        codeLabels: view ? view.querySelectorAll('.xp-record-code').length : 0,
        ariaLabels: buttons.every(button => Boolean(button.getAttribute('aria-label'))),
        recents: view ? view.querySelectorAll('#recent-links [data-link-entry]').length : 0,
        favorites: view ? view.querySelectorAll('#favorite-links [data-link-entry]').length : 0,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        oldHomeCount: document.querySelectorAll('#xp-game-home, #xp-personal-home').length
      };
    });

    if (!report.records.viewReady) fail('学习记录页没有完成真实渲染', report.records);
    if (report.records.cards !== 2) fail('最近查看与收藏必须各有一张工业记录卡', report.records);
    if (report.records.recents !== 2 || report.records.favorites !== 2 || report.records.buttons < 4) {
      fail('最近查看或收藏记录数量不符合写入数据', report.records);
    }
    if (!report.records.singleColumn) fail('390px学习记录卡必须单列排列', report.records);
    if (report.records.buttonHeight < 52) fail('学习记录按钮触控高度不足52px', report.records);
    if (report.records.radius !== '10px') fail('学习记录按钮圆角必须为10px', report.records);
    if (report.records.backgroundImage !== 'none') fail('学习记录按钮不得使用大面积渐变', report.records);
    if (report.records.countBadges !== 2 || report.records.codeLabels < 4 || !report.records.ariaLabels) {
      fail('学习记录数量、代码标签或ARIA名称不完整', report.records);
    }
    if (report.records.scrollWidth > report.records.clientWidth) fail('学习记录页存在横向溢出', report.records);
    if (report.records.oldHomeCount !== 0) fail('进入学习记录页后旧双首页不得恢复', report.records);

    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });

    await page.locator('#recent-links [data-link-entry]').first().click();
    await page.waitForFunction(() => Boolean(document.querySelector('#view-workspace.view.active')), null, { timeout: 15000 });
    report.finalView = await page.evaluate(() => document.querySelector('.view.active')?.id || '');
    if (report.finalView !== 'view-workspace') fail('最近查看记录未返回真实查询工作区', report.finalView);

    if (consoleErrors.length || pageErrors.length || failedRequests.length) {
      fail('学习记录回归期间出现页面、控制台或请求错误', { consoleErrors, pageErrors, failedRequests });
    }

    report.passed = true;
    writeJson(REPORT_PATH, report);
    console.log(JSON.stringify(report));
    await browser.close();
  } catch (error) {
    report.error = error && error.stack ? error.stack : String(error);
    writeJson(REPORT_PATH, report);
    fs.writeFileSync(ERROR_PATH, report.error + '\n', 'utf8');
    try {
      await page.screenshot({ path: ERROR_SCREENSHOT_PATH, fullPage: true });
    } catch (screenshotError) {
      fs.appendFileSync(ERROR_PATH, `\n截图失败：${screenshotError.stack || screenshotError}\n`, 'utf8');
    }
    await browser.close().catch(() => {});
    console.error(error);
    process.exit(1);
  }
})();
