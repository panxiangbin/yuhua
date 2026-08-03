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

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=industrial-sample', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  await page.waitForFunction(
    () => window.CNC_INDUSTRIAL_SAMPLE && window.CNC_INDUSTRIAL_SAMPLE.build === '20260722e',
    null,
    { timeout: 15000 }
  );
  await page.waitForFunction(
    () => document.body.getAttribute('data-cnc-industrial-surface') === 'home',
    null,
    { timeout: 15000 }
  );
  await page.waitForFunction(() => {
    const game = document.getElementById('xp-game-home');
    const legacy = document.querySelector('.launchpad-card[data-filter="gcode"]');
    return document.body.classList.contains('cnc-game-home-enabled')
      && game && game.getClientRects().length > 0
      && legacy && legacy.getClientRects().length === 0;
  }, null, { timeout: 30000 });
  await page.waitForTimeout(900);

  const tokens = await page.evaluate(() => window.CNC_INDUSTRIAL_SAMPLE.tokens);
  assert.equal(tokens.canvas, '#f1efe9');
  assert.equal(tokens.surface, '#fffdf9');
  assert.equal(tokens.cardRadius, '14px');

  const mobileHomeState = await page.evaluate(() => {
    const game = document.getElementById('xp-game-home');
    const legacy = document.querySelector('.launchpad-card[data-filter="gcode"]');
    const gameNav = document.querySelector('.xp-game-bottom-nav');
    const utilityNav = document.querySelector('body > .xp-bottom-nav');
    return {
      gameVisible: Boolean(game && game.getClientRects().length > 0),
      legacyHidden: Boolean(legacy && legacy.getClientRects().length === 0),
      enabled: document.body.classList.contains('cnc-game-home-enabled'),
      gameNavVisible: Boolean(gameNav && gameNav.getClientRects().length > 0),
      utilityNavHidden: Boolean(utilityNav && utilityNav.getClientRects().length === 0),
      utilityAriaHidden: utilityNav ? utilityNav.getAttribute('aria-hidden') : null,
      utilityInert: Boolean(utilityNav && utilityNav.hasAttribute('inert'))
    };
  });
  assert.equal(mobileHomeState.enabled, true, '手机端必须启用闯关首页');
  assert.equal(mobileHomeState.gameVisible, true, '手机端闯关首页必须真实可见');
  assert.equal(mobileHomeState.legacyHidden, true, '旧工具首页在手机端必须隐藏');
  assert.equal(mobileHomeState.gameNavVisible, true, '闯关首页五项主导航必须可见');
  assert.equal(mobileHomeState.utilityNavHidden, true, '首页不得同时显示旧工具导航');
  assert.equal(mobileHomeState.utilityAriaHidden, 'true', '隐藏工具导航必须退出无障碍树');
  assert.equal(mobileHomeState.utilityInert, true, '隐藏工具导航必须禁止误触和键盘进入');

  const nav = await page.locator('.xp-game-bottom-nav').evaluate(node => {
    const style = getComputedStyle(node);
    const links = Array.from(node.querySelectorAll('a'));
    const firstLink = links[0].getBoundingClientRect();
    return {
      radius: parseFloat(style.borderRadius),
      backgroundImage: style.backgroundImage,
      buttonHeight: firstLink.height,
      visibleItems: links.filter(link => link.getClientRects().length > 0).length,
      labels: links.map(link => link.getAttribute('aria-label'))
    };
  });
  assert.ok(nav.radius <= 16, `底部导航圆角过大：${nav.radius}`);
  assert.equal(nav.backgroundImage, 'none', '底部导航不应使用大面积渐变');
  assert.ok(nav.buttonHeight >= 48, `底部导航按钮点击区不足：${nav.buttonHeight}`);
  assert.equal(nav.visibleItems, 5, '手机首页必须显示五项主导航');
  assert.deepEqual(nav.labels, ['训练首页', '课程闯关', '每日挑战', '模拟车间', '成长档案']);

  const personal = await page.evaluate(() => window.CNC_PERSONAL_HOME && window.CNC_PERSONAL_HOME.runCheck());
  assert.equal(Boolean(personal && personal.passed), true, '学习进度和继续学习功能必须保留');

  // 暂时关闭闯关首页状态，仅审计仍作为桌面和后备能力存在的工业卡片层，随后恢复。
  await page.evaluate(() => document.body.classList.remove('cnc-game-home-enabled'));
  await page.waitForSelector('.launchpad-card[data-filter="gcode"]', {
    state: 'visible',
    timeout: 15000
  });

  const home = await page.locator('#view-dashboard').evaluate(node => {
    const first = node.querySelector('.launchpad-card');
    const cardStyle = getComputedStyle(first);
    const titleStyle = getComputedStyle(first.querySelector('h3'));
    const iconStyle = getComputedStyle(first.querySelector('.launchpad-card-icon'));
    const rect = first.getBoundingClientRect();
    const search = node.querySelector('.launchpad-search-bar input').getBoundingClientRect();
    const button = node.querySelector('.launchpad-search-bar button').getBoundingClientRect();
    return {
      columns: getComputedStyle(node.querySelector('.launchpad-grid')).gridTemplateColumns.split(' ').filter(Boolean).length,
      backgroundImage: cardStyle.backgroundImage,
      backgroundColor: cardStyle.backgroundColor,
      borderRadius: parseFloat(cardStyle.borderRadius),
      shadow: cardStyle.boxShadow,
      cardHeight: rect.height,
      titleSize: parseFloat(titleStyle.fontSize),
      titleWeight: Number(titleStyle.fontWeight),
      iconRadius: parseFloat(iconStyle.borderRadius),
      searchHeight: search.height,
      buttonHeight: button.height
    };
  });

  assert.equal(home.columns, 1, '首页工具卡必须保持竖向单列');
  assert.equal(home.backgroundImage, 'none', '首页卡片不能使用大面积渐变');
  assert.ok(home.backgroundColor.includes('255'), '首页卡片应为白色或米白表面');
  assert.ok(home.borderRadius >= 10 && home.borderRadius <= 16, `卡片圆角应克制：${home.borderRadius}`);
  assert.notEqual(home.shadow, 'none', '首页卡片应保留轻阴影和物件感');
  assert.ok(home.cardHeight >= 88, `首页卡片点击区过小：${home.cardHeight}`);
  assert.ok(home.titleSize >= 19, `首页标题字号偏小：${home.titleSize}`);
  assert.ok(home.titleWeight >= 800, `首页标题字重偏轻：${home.titleWeight}`);
  assert.ok(home.iconRadius <= 12, `图标圆角不能夸张：${home.iconRadius}`);
  assert.ok(home.searchHeight >= 50 && home.buttonHeight >= 48, '搜索框与按钮点击区必须足够大');

  await page.evaluate(() => document.body.classList.add('cnc-game-home-enabled'));
  await page.waitForFunction(() => {
    const game = document.getElementById('xp-game-home');
    const legacy = document.querySelector('.launchpad-card[data-filter="gcode"]');
    return game && game.getClientRects().length > 0
      && legacy && legacy.getClientRects().length === 0;
  }, null, { timeout: 15000 });

  // 从手机首页当前唯一可见的“现场速查 → G/M代码”入口进入工作区；
  // 不再操作首页上按设计隐藏的旧工具导航。
  await page.waitForFunction(() => window.CNC_TRUST_NAV
    && window.CNC_TRUST_NAV.build === '20260721s'
    && (window.__CNC_TRUST_READY_AT__ || 0) > 0
    && window.CNC_GAME_QUERY_NAV
    && window.CNC_GAME_QUERY_NAV.build === '20260731d'
    && typeof window.navigate === 'function', null, { timeout: 20000 });
  const gcodeNav = page.locator('#xp-game-home .xp-game-query-button[data-xp-query-filter="gcode"]');
  await gcodeNav.waitFor({ state: 'visible', timeout: 15000 });
  const gcodeTarget = await gcodeNav.evaluate(node => {
    const rect = node.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  assert.ok(gcodeTarget.width >= 44 && gcodeTarget.height >= 44, 'G/M代码入口点击区不足');
  await gcodeNav.click();
  await page.waitForFunction(() => {
    const workspace = document.getElementById('view-workspace');
    const input = document.getElementById('search-input');
    const utility = document.querySelector('body > .xp-bottom-nav');
    return workspace && workspace.classList.contains('active')
      && input && getComputedStyle(input).display !== 'none'
      && utility && utility.getClientRects().length > 0
      && utility.getAttribute('aria-hidden') === 'false'
      && !utility.hasAttribute('inert');
  }, null, { timeout: 30000 });
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
    if (window.CNC_TRUST_NAV && typeof window.CNC_TRUST_NAV.refresh === 'function') {
      window.CNC_TRUST_NAV.refresh();
    }
  });
  await page.waitForFunction(
    () => document.body.getAttribute('data-cnc-industrial-surface') === 'g01',
    null,
    { timeout: 15000 }
  );
  await page.waitForSelector('#detail-panel .xp-trust-panel', {
    state: 'visible',
    timeout: 15000
  });

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
      warningVisible: warning && getComputedStyle(warning).display !== 'none',
      warningBorder: warning ? getComputedStyle(warning).borderLeftColor : '',
      exampleVisible: example && getComputedStyle(example).display !== 'none',
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
  await page.waitForFunction(() => {
    const input = document.getElementById('search-input');
    return input && input.value === 'G1';
  }, null, { timeout: 15000 });
  assert.equal(await page.locator('#search-input').inputValue(), 'G1', '返回后搜索条件必须保留');

  const relevantErrors = [...pageErrors, ...consoleErrors].filter(text => (
    /industrial-card|CNC工业卡片|TypeError|ReferenceError/i.test(text)
  ));
  assert.deepEqual(relevantErrors, [], `工业样板存在控制台错误：${relevantErrors.join(' | ')}`);

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
      controllerUrl: navigator.serviceWorker.controller
        ? navigator.serviceWorker.controller.scriptURL
        : '',
      cncRegistrationCount: cncRegistrations.length
    };
  });
  assert.equal(serviceWorkerState.controlled, true, '工业样板页面必须由Service Worker接管');
  assert.match(serviceWorkerState.controllerUrl, /\/cnc\/sw\.js(?:\?|$)/, '控制器必须来自/cnc/sw.js');
  assert.equal(serviceWorkerState.cncRegistrationCount, 1, '工业样板不得重复注册/cnc/ Service Worker');

  console.log('手机闯关首页、单层导航、工业卡片后备层与G01详情样板通过', {
    mobileHomeState,
    home,
    nav,
    gcodeTarget,
    detail,
    serviceWorkerState
  });
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
