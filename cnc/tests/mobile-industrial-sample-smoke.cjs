const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error.message || error)));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=industrial-sample', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.launchpad-card[data-filter="gcode"]', { state: 'visible', timeout: 30000 });
  await page.waitForFunction(() => window.CNC_INDUSTRIAL_SAMPLE && window.CNC_INDUSTRIAL_SAMPLE.build === '20260721t', null, { timeout: 15000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-industrial-surface') === 'home', null, { timeout: 15000 });
  await page.waitForTimeout(900);

  const tokens = await page.evaluate(() => window.CNC_INDUSTRIAL_SAMPLE.tokens);
  assert.equal(tokens.canvas, '#f1efe9');
  assert.equal(tokens.surface, '#fffdf9');
  assert.equal(tokens.cardRadius, '14px');

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

  const nav = await page.locator('.xp-bottom-nav').evaluate(node => {
    const style = getComputedStyle(node);
    const firstButton = node.querySelector('button').getBoundingClientRect();
    return { radius: parseFloat(style.borderRadius), backgroundImage: style.backgroundImage, buttonHeight: firstButton.height };
  });
  assert.ok(nav.radius <= 16, `底部导航圆角过大：${nav.radius}`);
  assert.equal(nav.backgroundImage, 'none', '底部导航不应使用大面积渐变');
  assert.ok(nav.buttonHeight >= 48, '底部导航按钮点击区不足');

  const personal = await page.evaluate(() => window.CNC_PERSONAL_HOME && window.CNC_PERSONAL_HOME.runCheck());
  assert.equal(Boolean(personal && personal.passed), true, '学习进度和继续学习功能必须保留');

  await page.locator('.launchpad-card[data-filter="gcode"]').click();
  await page.waitForFunction(() => window.__CNC_GM_PRO_INSTALLED__ === '20260720h', null, { timeout: 30000 });
  await page.locator('#search-input').fill('G1');
  await page.waitForTimeout(700);
  const openButton = page.locator('#result-list [data-open-entry="kb-gcode-g01"]');
  await openButton.waitFor({ state: 'attached', timeout: 15000 });
  await page.waitForFunction(() => {
    const button = document.querySelector('#result-list [data-open-entry="kb-gcode-g01"]');
    return button && button.dataset.cncCleanBound === 'true';
  }, null, { timeout: 15000 });
  await openButton.click({ force: true });

  await page.waitForFunction(() => /G01/.test((document.getElementById('detail-code') || {}).textContent || ''), null, { timeout: 15000 });
  await page.evaluate(() => window.CNC_CLEAN_UI.confirmMobilePanel('kb-gcode-g01'));
  await page.waitForFunction(() => {
    const panel = document.getElementById('detail-panel');
    return document.body.getAttribute('data-cnc-detail-open') === 'true' && panel && getComputedStyle(panel).display !== 'none';
  }, null, { timeout: 15000 });
  await page.evaluate(() => {
    window.CNC_CLEAN_UI.syncIndustrialSample('kb-gcode-g01');
    if (window.CNC_TRUST_NAV && typeof window.CNC_TRUST_NAV.refresh === 'function') window.CNC_TRUST_NAV.refresh();
  });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-industrial-surface') === 'g01', null, { timeout: 15000 });
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
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-detail-open') !== 'true', null, { timeout: 15000 });
  await page.waitForFunction(() => {
    const input = document.getElementById('search-input');
    return input && input.value === 'G1';
  }, null, { timeout: 15000 });
  assert.equal(await page.locator('#search-input').inputValue(), 'G1', '返回后搜索条件必须保留');

  const relevantErrors = [...pageErrors, ...consoleErrors].filter(text => /industrial-card|CNC工业卡片|TypeError|ReferenceError/i.test(text));
  assert.deepEqual(relevantErrors, [], `工业样板存在控制台错误：${relevantErrors.join(' | ')}`);
  assert.equal(await page.evaluate(() => Boolean(navigator.serviceWorker && navigator.serviceWorker.controller)), false, '缓存控制状态不能回退');

  console.log('锤子工业卡片风首页与G01详情样板通过', { home, nav, detail });
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
