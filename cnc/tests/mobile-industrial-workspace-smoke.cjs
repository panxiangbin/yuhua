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

  async function goHome() {
    const homeNav = page.locator('.xp-bottom-nav [data-xp-route="dashboard"]');
    await homeNav.waitFor({ state: 'visible', timeout: 15000 });
    await homeNav.click();
    await page.waitForSelector('#view-dashboard.active', { state: 'visible', timeout: 15000 });
    await page.waitForSelector('#xp-game-home .xp-game-query-panel[data-ready="true"]', { state: 'visible', timeout: 15000 });
  }

  async function openMode(mode) {
    const button = page.locator(`#xp-game-home [data-xp-query-filter="${mode}"]`);
    await button.waitFor({ state: 'visible', timeout: 15000 });
    await button.click();
    await page.waitForSelector('#view-workspace.active', { state: 'visible', timeout: 15000 });
    await page.waitForFunction(expected => document.body.getAttribute('data-cnc-query-mode') === expected, mode, { timeout: 15000 });
  }

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=industrial-workspace', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => (
    window.CNC_TRUST_NAV?.build === '20260721s'
    && window.__CNC_TRUST_READY_AT__ > 0
    && window.CNC_QUERY_MODES?.build === '20260721r'
    && window.CNC_GAME_QUERY_NAV?.runCheck().passed
    && typeof window.navigate === 'function'
  ), null, { timeout: 30000 });

  const mobileHomeState = await page.evaluate(() => {
    const game = document.getElementById('xp-game-home');
    const legacy = document.querySelector('.launchpad-card[data-filter="gcode"]');
    const quick = document.querySelectorAll('#xp-game-home [data-xp-query-filter]');
    return {
      gameVisible: Boolean(game && game.getClientRects().length),
      legacyHidden: Boolean(legacy && legacy.getClientRects().length === 0),
      enabled: document.body.classList.contains('cnc-game-home-enabled'),
      quickCount: quick.length,
      quickVisible: Array.from(quick).every(node => node.getClientRects().length > 0)
    };
  });
  assert.deepEqual(mobileHomeState, { gameVisible: true, legacyHidden: true, enabled: true, quickCount: 4, quickVisible: true });

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
  console.log('手机闯关首页现场速查、查询工作区与键盘搜索建议通过', { mobileHomeState, workspace });
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
