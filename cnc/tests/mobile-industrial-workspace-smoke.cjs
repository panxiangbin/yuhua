const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error.message || error)));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });

  async function targetMetrics(locator, label) {
    await locator.waitFor({ state: 'visible', timeout: 15000 });
    const target = await locator.evaluate(node => {
      const rect = node.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        label: node.getAttribute('aria-label') || node.querySelector('h3')?.textContent?.trim() || node.textContent?.trim() || ''
      };
    });
    assert.ok(target.width >= 44, `${label}入口宽度不足：${target.width}`);
    assert.ok(target.height >= 44, `${label}入口高度不足：${target.height}`);
    assert.ok(target.label, `${label}入口缺少可识别名称`);
    return target;
  }

  async function closeSidebarIfOpen() {
    if (await page.locator('#sidebar.open').count()) {
      const closeButton = page.locator('#sidebar-close');
      await closeButton.waitFor({ state: 'visible', timeout: 15000 });
      await closeButton.click();
      await page.waitForFunction(() => !document.getElementById('sidebar')?.classList.contains('open'), null, { timeout: 15000 });
    }
  }

  async function goHome() {
    await closeSidebarIfOpen();
    const homeNav = page.locator('body > .xp-bottom-nav button[data-xp-route="dashboard"]');
    await homeNav.waitFor({ state: 'visible', timeout: 15000 });
    await homeNav.click();
    await page.waitForSelector('#view-dashboard.active', { state: 'visible', timeout: 15000 });
    await page.waitForFunction(() => {
      const check = window.CNC_PERSONAL_HOME?.runCheck?.();
      const nav = document.querySelector('body > .xp-bottom-nav');
      return check?.legacyHomeRemoved === true
        && check?.bottomNavReady === true
        && nav?.getClientRects().length > 0
        && nav.getAttribute('aria-hidden') === 'false'
        && !nav.hasAttribute('inert');
    }, null, { timeout: 15000 });
  }

  async function openSidebarMode(mode) {
    const menuButton = page.locator('#sidebar-open');
    await targetMetrics(menuButton, '手机目录');
    await menuButton.click();
    await page.waitForFunction(() => document.getElementById('sidebar')?.classList.contains('open'), null, { timeout: 15000 });
    const button = page.locator(`#sidebar [data-tree-panel="workspace"] .tree-item[data-filter="${mode}"]`).first();
    await targetMetrics(button, mode);
    return button;
  }

  async function openMode(mode) {
    await goHome();
    let button;
    if (mode === 'gcode' || mode === 'alarm') {
      button = page.locator(`body > .xp-bottom-nav button[data-xp-filter="${mode}"]`).first();
      await targetMetrics(button, mode);
    } else if (mode === 'parameter' || mode === 'fault') {
      button = await openSidebarMode(mode);
    } else {
      assert.fail(`未知查询模式：${mode}`);
    }
    await button.click();
    await page.waitForSelector('#view-workspace.active', { state: 'visible', timeout: 15000 });
    await page.waitForFunction(expected => document.body.getAttribute('data-cnc-query-mode') === expected, mode, { timeout: 15000 });
  }

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=industrial-workspace', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => {
    const check = window.CNC_PERSONAL_HOME?.runCheck?.();
    const nav = document.querySelector('body > .xp-bottom-nav');
    return window.CNC_TRUST_NAV?.build === '20260721s'
      && window.__CNC_TRUST_READY_AT__ > 0
      && window.CNC_QUERY_MODES?.build === '20260721r'
      && window.CNC_PERSONAL_HOME?.refactorBuild === '20260804-mobile1'
      && check?.legacyHomeRemoved === true
      && check?.bottomNavReady === true
      && document.querySelector('#view-dashboard.active')
      && nav?.getClientRects().length > 0
      && nav.getAttribute('aria-hidden') === 'false'
      && !nav.hasAttribute('inert')
      && typeof window.navigate === 'function';
  }, null, { timeout: 30000 });

  const mobileHomeState = await page.evaluate(() => {
    const visible = node => Boolean(node && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden');
    const nav = document.querySelector('body > .xp-bottom-nav');
    const navItems = nav ? Array.from(nav.querySelectorAll('button[data-xp-route], button[data-xp-filter]')) : [];
    const visibleBottomQueryEntries = ['gcode', 'alarm'].map(mode => {
      const node = nav?.querySelector(`button[data-xp-filter="${mode}"]`);
      const rect = node?.getBoundingClientRect();
      return {
        mode,
        present: Boolean(node),
        visible: visible(node),
        width: rect?.width || 0,
        height: rect?.height || 0,
        label: node?.getAttribute('aria-label') || node?.textContent?.trim() || ''
      };
    });
    return {
      activeView: document.querySelector('.view.active')?.id || '',
      oldHomeCount: document.querySelectorAll('#xp-game-home, #xp-personal-home').length,
      oldEnabledClass: document.body.classList.contains('cnc-game-home-enabled'),
      navVisible: visible(nav),
      navAriaHidden: nav?.getAttribute('aria-hidden') || null,
      navInert: Boolean(nav?.hasAttribute('inert')),
      navCount: navItems.length,
      navLabels: navItems.map(node => (node.querySelector('span')?.textContent || '').replace(/\s+/g, ' ').trim()),
      visibleBottomQueryEntries,
      hiddenDesktopQueryCards: Array.from(document.querySelectorAll('#view-dashboard .launchpad-grid .launchpad-card[data-query-mode]')).filter(visible).length,
      personal: window.CNC_PERSONAL_HOME?.runCheck?.() || null
    };
  });
  assert.equal(mobileHomeState.activeView, 'view-dashboard');
  assert.equal(mobileHomeState.oldHomeCount, 0, '不得恢复已删除的第二套手机首页');
  assert.equal(mobileHomeState.oldEnabledClass, false, '不得恢复旧闯关首页状态类');
  assert.equal(mobileHomeState.navVisible, true, '真实五项底栏必须可见');
  assert.equal(mobileHomeState.navAriaHidden, 'false', '真实五项底栏必须进入无障碍树');
  assert.equal(mobileHomeState.navInert, false, '真实五项底栏不得被 inert 禁用');
  assert.equal(mobileHomeState.navCount, 5, '真实底栏必须恰好保留5项');
  assert.deepEqual(mobileHomeState.navLabels, ['首页', '查代码', '报警', '学习', '我的']);
  assert.equal(mobileHomeState.personal?.legacyHomeRemoved, true);
  assert.equal(mobileHomeState.personal?.bottomNavReady, true);
  assert.equal(mobileHomeState.hiddenDesktopQueryCards, 0, '手机端不得把旧桌面启动卡恢复成第二套首页');
  mobileHomeState.visibleBottomQueryEntries.forEach(entry => {
    assert.equal(entry.present, true, `${entry.mode}真实底栏入口不存在`);
    assert.equal(entry.visible, true, `${entry.mode}真实底栏入口不可见`);
    assert.ok(entry.width >= 44, `${entry.mode}真实底栏入口宽度不足：${entry.width}`);
    assert.ok(entry.height >= 44, `${entry.mode}真实底栏入口高度不足：${entry.height}`);
    assert.ok(entry.label, `${entry.mode}真实底栏入口缺少名称`);
  });

  const sidebarEntries = await (async () => {
    const menuButton = page.locator('#sidebar-open');
    await targetMetrics(menuButton, '手机目录');
    await menuButton.click();
    await page.waitForFunction(() => document.getElementById('sidebar')?.classList.contains('open'), null, { timeout: 15000 });
    return page.evaluate(() => {
      const visible = node => Boolean(node && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden');
      return ['gcode', 'alarm', 'parameter', 'fault'].map(mode => {
        const node = document.querySelector(`#sidebar [data-tree-panel="workspace"] .tree-item[data-filter="${mode}"]`);
        const rect = node?.getBoundingClientRect();
        return {
          mode,
          present: Boolean(node),
          visible: visible(node),
          width: rect?.width || 0,
          height: rect?.height || 0,
          label: node?.textContent?.replace(/\s+/g, ' ').trim() || ''
        };
      });
    });
  })();
  sidebarEntries.forEach(entry => {
    assert.equal(entry.present, true, `${entry.mode}手机目录入口不存在`);
    assert.equal(entry.visible, true, `${entry.mode}手机目录入口不可见`);
    assert.ok(entry.width >= 44, `${entry.mode}手机目录入口宽度不足：${entry.width}`);
    assert.ok(entry.height >= 44, `${entry.mode}手机目录入口高度不足：${entry.height}`);
    assert.ok(entry.label, `${entry.mode}手机目录入口缺少标题`);
  });
  await closeSidebarIfOpen();

  await openMode('gcode');
  await page.waitForFunction(() => window.__CNC_GM_PRO_INSTALLED__ === '20260720h', null, { timeout: 30000 });
  await page.waitForFunction(() => window.CNC_INDUSTRIAL_WORKSPACE?.build === '20260721v', null, { timeout: 15000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-industrial-workspace') === 'true', null, { timeout: 15000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-industrial-mode') === 'gcode', null, { timeout: 15000 });

  const workspace = await page.evaluate(() => {
    const panel = document.querySelector('#view-workspace .workspace-panel.search-panel');
    const toolbar = document.querySelector('#view-workspace .search-toolbar');
    const input = document.getElementById('search-input');
    const card = document.querySelector('#result-list .result-card');
    const code = card?.querySelector('.result-top strong');
    return {
      panelBackground: getComputedStyle(panel).backgroundColor,
      panelShadow: getComputedStyle(panel).boxShadow,
      toolbarImage: getComputedStyle(toolbar).backgroundImage,
      toolbarColor: getComputedStyle(toolbar).backgroundColor,
      toolbarRadius: parseFloat(getComputedStyle(toolbar).borderRadius),
      toolbarShadow: getComputedStyle(toolbar).boxShadow,
      inputHeight: input.getBoundingClientRect().height,
      inputRadius: parseFloat(getComputedStyle(input).borderRadius),
      inputFontSize: parseFloat(getComputedStyle(input).fontSize),
      inputImage: getComputedStyle(input).backgroundImage,
      cardImage: getComputedStyle(card).backgroundImage,
      cardColor: getComputedStyle(card).backgroundColor,
      cardRadius: parseFloat(getComputedStyle(card).borderRadius),
      cardShadow: getComputedStyle(card).boxShadow,
      cardHeight: card.getBoundingClientRect().height,
      codeSize: parseFloat(getComputedStyle(code).fontSize),
      codeWeight: Number(getComputedStyle(code).fontWeight)
    };
  });

  assert.ok(/rgba\(0, 0, 0, 0\)|transparent/.test(workspace.panelBackground));
  assert.equal(workspace.panelShadow, 'none');
  assert.equal(workspace.toolbarImage, 'none');
  assert.ok(workspace.toolbarColor.includes('255'));
  assert.ok(workspace.toolbarRadius >= 10 && workspace.toolbarRadius <= 16);
  assert.notEqual(workspace.toolbarShadow, 'none');
  assert.ok(workspace.inputHeight >= 52);
  assert.ok(workspace.inputRadius <= 12);
  assert.ok(workspace.inputFontSize >= 16);
  assert.equal(workspace.inputImage, 'none');
  assert.equal(workspace.cardImage, 'none');
  assert.ok(workspace.cardColor.includes('255'));
  assert.ok(workspace.cardRadius >= 10 && workspace.cardRadius <= 16);
  assert.notEqual(workspace.cardShadow, 'none');
  assert.ok(workspace.cardHeight >= 92);
  assert.ok(workspace.codeSize >= 23);
  assert.ok(workspace.codeWeight >= 800);

  const input = page.locator('#search-input');
  await input.fill('G1');
  await page.waitForSelector('#search-suggestions .suggestion-item', { state: 'visible', timeout: 15000 });

  const suggestions = await page.evaluate(() => {
    const input = document.getElementById('search-input');
    const box = document.getElementById('search-suggestions');
    return {
      inputRole: input.getAttribute('role'),
      expanded: input.getAttribute('aria-expanded'),
      controls: input.getAttribute('aria-controls'),
      boxRole: box.getAttribute('role'),
      values: [...box.querySelectorAll('.suggestion-item')].map(node => node.dataset.suggestion)
    };
  });
  assert.equal(suggestions.inputRole, 'combobox');
  assert.equal(suggestions.boxRole, 'listbox');
  assert.equal(suggestions.expanded, 'true');
  assert.ok(suggestions.controls);
  assert.equal(suggestions.values[0], 'G01', `G1应优先建议G01：${JSON.stringify(suggestions)}`);

  await input.press('ArrowDown');
  const active = await page.evaluate(() => ({
    id: document.getElementById('search-input').getAttribute('aria-activedescendant'),
    value: document.querySelector('#search-suggestions [aria-selected="true"]')?.dataset.suggestion || ''
  }));
  assert.ok(active.id);
  assert.equal(active.value, 'G01');

  await input.press('Enter');
  await page.waitForFunction(() => document.getElementById('search-input').value === 'G01', null, { timeout: 15000 });
  await page.waitForFunction(() => document.getElementById('search-input').getAttribute('aria-expanded') === 'false', null, { timeout: 15000 });
  await page.waitForTimeout(500);

  const settled = await page.evaluate(() => {
    const panel = document.getElementById('detail-panel');
    return {
      keyword: typeof state !== 'undefined' ? state.keyword : null,
      results: [...document.querySelectorAll('#result-list [data-open-entry]')].map(node => node.dataset.openEntry),
      detailOpen: document.body.getAttribute('data-cnc-detail-open') === 'true' || panel?.classList.contains('mobile-open'),
      detailCode: document.getElementById('detail-code')?.textContent || ''
    };
  });
  assert.equal(settled.keyword, 'G01');
  assert.ok(settled.results.includes('kb-gcode-g01'));

  if (settled.detailOpen) {
    assert.match(settled.detailCode.replace(/\s+/g, ''), /^G0?1/i, `Enter打开的详情不是G01：${JSON.stringify(settled)}`);
  } else {
    const button = page.locator('#result-list [data-open-entry="kb-gcode-g01"]');
    await button.scrollIntoViewIfNeeded();
    await button.click();
    await page.waitForFunction(() => document.getElementById('detail-panel')?.classList.contains('mobile-open'), null, { timeout: 15000 });
  }

  await page.locator('#detail-back-btn').click();
  await page.waitForFunction(() => !document.getElementById('detail-panel')?.classList.contains('mobile-open'), null, { timeout: 15000 });
  await page.waitForFunction(() => document.getElementById('search-input').value === 'G01', null, { timeout: 15000 });
  await page.locator('#search-clear-btn').click();
  await goHome();

  const journeys = {
    alarm: { title: /报警排查/, placeholder: /SV0401|报警号/ },
    parameter: { title: /参数速查/, placeholder: /1815|参数号/ },
    fault: { title: /故障问诊/, placeholder: /回零失败|异常/ }
  };
  for (const mode of Object.keys(journeys)) {
    await openMode(mode);
    await page.waitForSelector('#result-list .result-card', { state: 'visible', timeout: 15000 });
    assert.ok(await page.locator('#result-list .result-card').count() > 0);
    assert.match((await page.locator('#workspace-title').textContent()) || '', journeys[mode].title);
    assert.match((await page.locator('#search-input').getAttribute('placeholder')) || '', journeys[mode].placeholder);
    await goHome();
  }

  const relevantErrors = [...pageErrors, ...consoleErrors].filter(text => /industrial-workspace|CNC工业查询|game-query|TypeError|ReferenceError/i.test(text));
  assert.deepEqual(relevantErrors, []);
  console.log('手机单层首页真实底栏、真实目录入口、工业查询工作区与键盘搜索建议通过', { mobileHomeState, sidebarEntries, workspace });
  await browser.close();
})().catch(error => {
  try {
    const dir = path.join('cnc', 'test-artifacts', 'industrial-card-sample');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'workspace-error.log'), String(error?.stack || error));
  } catch (_) {}
  console.error(error);
  process.exit(1);
});
