const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const DIAGNOSTIC_DIR = 'cnc/test-artifacts/industrial-card-sample';
fs.mkdirSync(DIAGNOSTIC_DIR, { recursive: true });

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
  page.on('pageerror', error => pageErrors.push(String(error.stack || error.message || error)));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('requestfailed', request => failedRequests.push({
    url: request.url(),
    error: request.failure()
  }));

  try {
    await page.goto('http://127.0.0.1:4173/cnc/?smoke=industrial-sample', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForFunction(
      () => window.CNC_INDUSTRIAL_SAMPLE?.build === '20260722e',
      null,
      { timeout: 30000 }
    );
    await page.waitForFunction(() => {
      const home = window.CNC_PERSONAL_HOME;
      const check = home?.runCheck?.();
      const nav = document.querySelector('body > .xp-bottom-nav');
      const dashboard = document.querySelector('#view-dashboard.active');
      return home?.refactorBuild === '20260804-mobile1'
        && check?.legacyHomeRemoved === true
        && check?.bottomNavReady === true
        && dashboard
        && nav?.getClientRects().length > 0
        && nav.getAttribute('aria-hidden') === 'false'
        && !nav.hasAttribute('inert');
    }, null, { timeout: 30000 });
    await page.waitForFunction(
      () => document.body.getAttribute('data-cnc-industrial-surface') === 'home',
      null,
      { timeout: 15000 }
    );
    await page.waitForTimeout(900);

    const tokens = await page.evaluate(() => window.CNC_INDUSTRIAL_SAMPLE.tokens);
    assert.equal(tokens.canvas, '#f1efe9');
    assert.equal(tokens.surface, '#fffdf9');
    assert.equal(tokens.cardRadius, '14px');

    const mobileHomeState = await page.evaluate(() => {
      const visible = node => {
        if (!node) return false;
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== 'none'
          && style.visibility !== 'hidden'
          && Number(style.opacity || 1) > 0
          && rect.width > 0
          && rect.height > 0;
      };
      const nav = document.querySelector('body > .xp-bottom-nav');
      const items = nav
        ? Array.from(nav.querySelectorAll('button[data-xp-route], button[data-xp-filter]'))
        : [];
      const routeCard = document.querySelector('#view-dashboard .cnc-home-route-card');
      const routeStyle = routeCard ? getComputedStyle(routeCard) : null;
      const routeRect = routeCard ? routeCard.getBoundingClientRect() : null;
      const heroTitle = document.querySelector('#view-dashboard .cnc-home-hero-copy h1, #view-dashboard .cnc-home-hero-copy h2, #view-dashboard .cnc-home-hero-copy h3');
      const searchInput = document.querySelector('#view-dashboard .launchpad-search input');
      const searchButton = document.querySelector('#view-dashboard .launchpad-search button');
      return {
        activeView: document.querySelector('.view.active')?.id || '',
        oldHomeCount: document.querySelectorAll('#xp-game-home, #xp-personal-home').length,
        oldGameNavCount: document.querySelectorAll('.xp-game-bottom-nav').length,
        oldEnabledClass: document.body.classList.contains('cnc-game-home-enabled'),
        heroVisible: visible(document.querySelector('#view-dashboard .cnc-home-hero-copy')),
        queryVisible: visible(document.querySelector('#view-dashboard .launchpad-search')),
        practiceVisible: visible(routeCard),
        navVisible: visible(nav),
        navAriaHidden: nav?.getAttribute('aria-hidden') || null,
        navInert: Boolean(nav?.hasAttribute('inert')),
        navCount: items.length,
        navLabels: items.map(node => (node.querySelector('span')?.textContent || '').replace(/\s+/g, ' ').trim()),
        navMetrics: items.map(node => {
          const rect = node.getBoundingClientRect();
          return {
            width: rect.width,
            height: rect.height,
            ariaLabel: node.getAttribute('aria-label') || '',
            type: node.getAttribute('type') || '',
            visible: visible(node)
          };
        }),
        routeBackgroundImage: routeStyle?.backgroundImage || '',
        routeRadius: routeStyle ? parseFloat(routeStyle.borderRadius) : 0,
        routeShadow: routeStyle?.boxShadow || 'none',
        routeHeight: routeRect?.height || 0,
        heroTitleSize: heroTitle ? parseFloat(getComputedStyle(heroTitle).fontSize) : 0,
        heroTitleWeight: heroTitle ? Number(getComputedStyle(heroTitle).fontWeight) : 0,
        searchHeight: searchInput ? searchInput.getBoundingClientRect().height : 0,
        searchButtonHeight: searchButton ? searchButton.getBoundingClientRect().height : 0,
        scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        clientWidth: document.documentElement.clientWidth,
        personal: window.CNC_PERSONAL_HOME?.runCheck?.() || null
      };
    });

    assert.equal(mobileHomeState.activeView, 'view-dashboard', '根网址必须稳定停留单层手机首页');
    assert.equal(mobileHomeState.oldHomeCount, 0, '不得恢复已删除的第二套手机首页');
    assert.equal(mobileHomeState.oldGameNavCount, 0, '不得恢复旧闯关首页导航');
    assert.equal(mobileHomeState.oldEnabledClass, false, '不得恢复旧闯关首页状态类');
    assert.equal(mobileHomeState.heroVisible, true, '手机首页必须显示学习主入口');
    assert.equal(mobileHomeState.queryVisible, true, '手机首页必须显示现场查询入口');
    assert.equal(mobileHomeState.practiceVisible, true, '手机首页必须显示练习入口');
    assert.equal(mobileHomeState.navVisible, true, '单层手机底栏必须真实可见');
    assert.equal(mobileHomeState.navAriaHidden, 'false', '真实底栏必须进入无障碍树');
    assert.equal(mobileHomeState.navInert, false, '真实底栏不得被 inert 禁用');
    assert.equal(mobileHomeState.navCount, 5, '单层手机底栏必须恰好保留5项');
    assert.deepEqual(mobileHomeState.navLabels, ['首页', '查代码', '报警', '学习', '我的']);
    mobileHomeState.navMetrics.forEach((item, index) => {
      assert.equal(item.visible, true, `第${index + 1}个底栏入口必须可见`);
      assert.ok(item.width >= 44, `第${index + 1}个底栏入口宽度不足：${item.width}`);
      assert.ok(item.height >= 48, `第${index + 1}个底栏入口高度不足：${item.height}`);
      assert.ok(item.ariaLabel, `第${index + 1}个底栏入口缺少中文可访问名称`);
      assert.equal(item.type, 'button', `第${index + 1}个底栏入口必须使用button`);
    });
    assert.equal(mobileHomeState.routeBackgroundImage, 'none', '首页实际练习卡不得使用大面积渐变');
    assert.ok(mobileHomeState.routeRadius >= 10 && mobileHomeState.routeRadius <= 16, `首页练习卡圆角应克制：${mobileHomeState.routeRadius}`);
    assert.notEqual(mobileHomeState.routeShadow, 'none', '首页实际练习卡必须保留轻阴影');
    assert.ok(mobileHomeState.routeHeight >= 88, `首页实际练习卡点击区过小：${mobileHomeState.routeHeight}`);
    assert.ok(mobileHomeState.heroTitleSize >= 19, `首页主标题字号偏小：${mobileHomeState.heroTitleSize}`);
    assert.ok(mobileHomeState.heroTitleWeight >= 800, `首页主标题字重偏轻：${mobileHomeState.heroTitleWeight}`);
    assert.ok(mobileHomeState.searchHeight >= 44, `首页查询输入框高度不足：${mobileHomeState.searchHeight}`);
    assert.ok(mobileHomeState.searchButtonHeight >= 44, `首页查询按钮高度不足：${mobileHomeState.searchButtonHeight}`);
    assert.ok(mobileHomeState.scrollWidth <= mobileHomeState.clientWidth + 1, '390px手机首页不得横向溢出');
    assert.equal(mobileHomeState.personal?.legacyHomeRemoved, true);
    assert.equal(mobileHomeState.personal?.bottomNavReady, true);

    const nav = page.locator('body > .xp-bottom-nav');
    const navStyle = await nav.evaluate(node => {
      const style = getComputedStyle(node);
      return {
        radius: parseFloat(style.borderRadius),
        backgroundImage: style.backgroundImage
      };
    });
    assert.ok(navStyle.radius <= 16, `底部导航圆角过大：${navStyle.radius}`);
    assert.equal(navStyle.backgroundImage, 'none', '底部导航不应使用大面积渐变');

    await page.waitForFunction(() => window.CNC_TRUST_NAV
      && window.CNC_TRUST_NAV.build === '20260721s'
      && (window.__CNC_TRUST_READY_AT__ || 0) > 0
      && typeof window.navigate === 'function', null, { timeout: 20000 });
    const gcodeNav = nav.locator('button[data-xp-filter="gcode"]');
    await gcodeNav.waitFor({ state: 'visible', timeout: 15000 });
    const gcodeTarget = await gcodeNav.evaluate(node => {
      const rect = node.getBoundingClientRect();
      return { width: rect.width, height: rect.height, label: node.getAttribute('aria-label') || '' };
    });
    assert.ok(gcodeTarget.width >= 44 && gcodeTarget.height >= 48, '查代码底栏入口点击区不足');
    assert.match(gcodeTarget.label, /代码/);
    await gcodeNav.click();
    await page.waitForSelector('#view-workspace.active', { state: 'visible', timeout: 15000 });
    await page.waitForFunction(() => document.querySelector('body > .xp-bottom-nav button[data-xp-filter="gcode"]')?.getAttribute('aria-current') === 'page', null, { timeout: 15000 });
    await page.waitForFunction(
      () => window.__CNC_GM_PRO_INSTALLED__ === '20260720h',
      null,
      { timeout: 30000 }
    );

    await page.locator('#search-input').fill('G1');
    await page.waitForTimeout(900);
    const resultCard = page.locator('#result-list .result-card:has([data-open-entry="kb-gcode-g01"])');
    await resultCard.waitFor({ state: 'visible', timeout: 15000 });
    await resultCard.click();
    await page.waitForFunction(
      () => /G01/.test((document.getElementById('detail-code') || {}).textContent || ''),
      null,
      { timeout: 15000 }
    );
    await page.evaluate(() => window.CNC_CLEAN_UI.confirmMobilePanel('kb-gcode-g01'));
    await page.waitForFunction(() => {
      const panel = document.getElementById('detail-panel');
      return document.body.getAttribute('data-cnc-detail-open') === 'true'
        && panel && getComputedStyle(panel).display !== 'none';
    }, null, { timeout: 15000 });
    await page.evaluate(() => {
      window.CNC_CLEAN_UI.syncIndustrialSample('kb-gcode-g01');
      window.CNC_TRUST_NAV?.refresh?.();
    });
    await page.waitForFunction(
      () => document.body.getAttribute('data-cnc-industrial-surface') === 'g01',
      null,
      { timeout: 15000 }
    );
    await page.waitForSelector('#detail-panel .xp-trust-panel', { state: 'visible', timeout: 15000 });

    const detail = await page.evaluate(() => {
      const code = document.getElementById('detail-code');
      const primary = document.querySelector('#detail-panel .detail-card-primary');
      const warning = document.querySelector('#detail-panel [data-industrial-role="warning"]');
      const example = document.querySelector('#detail-panel [data-industrial-role="example"]');
      const secondary = Array.from(document.querySelectorAll('#detail-panel [data-industrial-role="secondary"]'));
      const favorite = document.getElementById('favorite-toggle').getBoundingClientRect();
      return {
        codeText: code.textContent.trim(),
        codeSize: parseFloat(getComputedStyle(code).fontSize),
        codeWeight: Number(getComputedStyle(code).fontWeight),
        primaryBackgroundImage: getComputedStyle(primary).backgroundImage,
        trustVisible: getComputedStyle(document.querySelector('#detail-panel .xp-trust-panel')).display !== 'none',
        warningVisible: Boolean(warning && getComputedStyle(warning).display !== 'none'),
        warningBorder: warning ? getComputedStyle(warning).borderLeftColor : '',
        exampleVisible: Boolean(example && getComputedStyle(example).display !== 'none'),
        hiddenSecondary: secondary.filter(node => getComputedStyle(node).display === 'none').length,
        secondaryCount: secondary.length,
        favoriteHeight: favorite.height,
        favoriteWidth: favorite.width
      };
    });

    assert.match(detail.codeText, /G01/);
    assert.ok(detail.codeSize >= 34, `G01代码字号不够醒目：${detail.codeSize}`);
    assert.ok(detail.codeWeight >= 800, `G01代码字重不够：${detail.codeWeight}`);
    assert.equal(detail.primaryBackgroundImage, 'none', '详情主卡不得使用大面积渐变');
    assert.equal(detail.trustVisible, true, '适用系统和风险可信度卡必须可见');
    assert.equal(detail.warningVisible, true, '风险提醒必须可见');
    assert.ok(/196|135|34|rgb\(/.test(detail.warningBorder), '风险卡必须有黄色或橙色识别边');
    assert.equal(detail.exampleVisible, true, '代码示例必须可见');
    assert.equal(detail.hiddenSecondary, detail.secondaryCount, '样板详情应隐藏低优先级堆叠内容');
    assert.ok(detail.favoriteHeight >= 42 && detail.favoriteWidth >= 42, '收藏按钮点击区不足');

    const favoriteBefore = (await page.locator('#favorite-toggle').textContent()) || '';
    await page.locator('#favorite-toggle').click();
    await page.waitForTimeout(120);
    const favoriteAfter = (await page.locator('#favorite-toggle').textContent()) || '';
    assert.notEqual(favoriteAfter, favoriteBefore, '收藏功能必须保持可用');

    await page.locator('#detail-back-btn').click();
    await page.waitForFunction(
      () => document.body.getAttribute('data-cnc-detail-open') !== 'true',
      null,
      { timeout: 15000 }
    );
    await page.waitForFunction(() => document.getElementById('search-input')?.value === 'G1', null, { timeout: 15000 });
    assert.equal(await page.locator('#search-input').inputValue(), 'G1', '返回后搜索条件必须保留');

    await page.waitForFunction(
      () => Boolean(navigator.serviceWorker && navigator.serviceWorker.controller),
      null,
      { timeout: 15000 }
    );
    const serviceWorkerState = await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const cncRegistrations = registrations.filter(registration => {
        try {
          return new URL(registration.scope).pathname === '/cnc/';
        } catch {
          return false;
        }
      });
      return {
        controlled: Boolean(navigator.serviceWorker.controller),
        controllerUrl: navigator.serviceWorker.controller?.scriptURL || '',
        cncRegistrationCount: cncRegistrations.length
      };
    });
    assert.equal(serviceWorkerState.controlled, true, '工业样板页面必须由Service Worker接管');
    assert.match(serviceWorkerState.controllerUrl, /\/cnc\/sw\.js(?:\?|$)/, '控制器必须来自/cnc/sw.js');
    assert.equal(serviceWorkerState.cncRegistrationCount, 1, '工业样板不得重复注册/cnc/ Service Worker');

    assert.deepEqual(pageErrors, [], `工业样板存在页面错误：${pageErrors.join(' | ')}`);
    assert.deepEqual(consoleErrors, [], `工业样板存在控制台错误：${consoleErrors.join(' | ')}`);
    assert.deepEqual(failedRequests, [], `工业样板存在失败请求：${JSON.stringify(failedRequests)}`);

    const report = { mobileHomeState, navStyle, gcodeTarget, detail, serviceWorkerState, pageErrors, consoleErrors, failedRequests };
    fs.writeFileSync(`${DIAGNOSTIC_DIR}/mobile-industrial-sample-report.json`, JSON.stringify(report, null, 2));
    console.log('单层手机首页、真实五项底栏、工业视觉与G01详情样板通过', report);
  } catch (error) {
    fs.writeFileSync(`${DIAGNOSTIC_DIR}/mobile-industrial-sample-error.txt`, `${error.stack || error}\n`);
    try {
      await page.screenshot({ path: `${DIAGNOSTIC_DIR}/mobile-industrial-sample-error-390x844.png`, fullPage: true });
    } catch (_) {}
    throw error;
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
