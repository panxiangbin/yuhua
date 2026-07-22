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

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=industrial-workspace', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.launchpad-card[data-filter="gcode"]', { state: 'visible', timeout: 30000 });

  await page.locator('.launchpad-card[data-filter="gcode"]').click();
  await page.waitForFunction(() => window.__CNC_GM_PRO_INSTALLED__ === '20260720h', null, { timeout: 30000 });
  await page.waitForFunction(() => window.CNC_INDUSTRIAL_WORKSPACE && window.CNC_INDUSTRIAL_WORKSPACE.build === '20260721v', null, { timeout: 15000 });
  await page.waitForSelector('#view-workspace.active', { state: 'visible', timeout: 30000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-industrial-workspace') === 'true', null, { timeout: 15000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-industrial-mode') === 'gcode', null, { timeout: 15000 });
  await page.waitForTimeout(700);

  const workspace = await page.evaluate(() => {
    const panel = document.querySelector('#view-workspace .workspace-panel.search-panel');
    const toolbar = document.querySelector('#view-workspace .search-toolbar');
    const input = document.getElementById('search-input');
    const first = document.querySelector('#result-list .result-card');
    const code = first && first.querySelector('.result-top strong');
    const panelStyle = getComputedStyle(panel);
    const toolbarStyle = getComputedStyle(toolbar);
    const inputStyle = getComputedStyle(input);
    const cardStyle = getComputedStyle(first);
    const cardRect = first.getBoundingClientRect();
    return {
      outerPanelBackground: panelStyle.backgroundColor,
      outerPanelShadow: panelStyle.boxShadow,
      toolbarBackgroundImage: toolbarStyle.backgroundImage,
      toolbarBackgroundColor: toolbarStyle.backgroundColor,
      toolbarRadius: parseFloat(toolbarStyle.borderRadius),
      toolbarShadow: toolbarStyle.boxShadow,
      inputHeight: input.getBoundingClientRect().height,
      inputRadius: parseFloat(inputStyle.borderRadius),
      inputFontSize: parseFloat(inputStyle.fontSize),
      inputBackgroundImage: inputStyle.backgroundImage,
      cardBackgroundImage: cardStyle.backgroundImage,
      cardBackgroundColor: cardStyle.backgroundColor,
      cardRadius: parseFloat(cardStyle.borderRadius),
      cardShadow: cardStyle.boxShadow,
      cardHeight: cardRect.height,
      codeSize: code ? parseFloat(getComputedStyle(code).fontSize) : 0,
      codeWeight: code ? Number(getComputedStyle(code).fontWeight) : 0
    };
  });

  assert.ok(/rgba\(0, 0, 0, 0\)|transparent/.test(workspace.outerPanelBackground), '外层列表容器应保持透明，避免大卡套小卡');
  assert.equal(workspace.outerPanelShadow, 'none', '外层列表容器不应形成第二层大阴影');
  assert.equal(workspace.toolbarBackgroundImage, 'none', '搜索工具面板不能使用大面积渐变');
  assert.ok(workspace.toolbarBackgroundColor.includes('255'), '搜索工具面板应为白色或米白表面');
  assert.ok(workspace.toolbarRadius >= 10 && workspace.toolbarRadius <= 16, `搜索工具面板圆角应克制：${workspace.toolbarRadius}`);
  assert.notEqual(workspace.toolbarShadow, 'none', '搜索工具面板应有轻阴影和物件感');
  assert.ok(workspace.inputHeight >= 52, `搜索框点击区不足：${workspace.inputHeight}`);
  assert.ok(workspace.inputRadius <= 12, `搜索框圆角过大：${workspace.inputRadius}`);
  assert.ok(workspace.inputFontSize >= 16, `搜索框字号偏小：${workspace.inputFontSize}`);
  assert.equal(workspace.inputBackgroundImage, 'none', '搜索框不应使用渐变');
  assert.equal(workspace.cardBackgroundImage, 'none', '结果卡不得使用大面积渐变');
  assert.ok(workspace.cardBackgroundColor.includes('255'), '结果卡应为白色或米白表面');
  assert.ok(workspace.cardRadius >= 10 && workspace.cardRadius <= 16, `结果卡圆角应克制：${workspace.cardRadius}`);
  assert.notEqual(workspace.cardShadow, 'none', '结果卡应有轻阴影');
  assert.ok(workspace.cardHeight >= 92, `结果卡点击区过小：${workspace.cardHeight}`);
  assert.ok(workspace.codeSize >= 23, `代码号不够醒目：${workspace.codeSize}`);
  assert.ok(workspace.codeWeight >= 800, `代码号字重不足：${workspace.codeWeight}`);

  const searchInput = page.locator('#search-input');
  await searchInput.fill('G1');
  await page.waitForSelector('#search-suggestions .suggestion-item', { state: 'visible', timeout: 15000 });

  const suggestionState = await page.evaluate(() => {
    const input = document.getElementById('search-input');
    const box = document.getElementById('search-suggestions');
    return {
      expanded: input.getAttribute('aria-expanded'),
      controls: input.getAttribute('aria-controls'),
      role: input.getAttribute('role'),
      listRole: box.getAttribute('role'),
      suggestions: Array.from(box.querySelectorAll('.suggestion-item')).map(node => node.dataset.suggestion)
    };
  });
  assert.equal(suggestionState.role, 'combobox');
  assert.equal(suggestionState.listRole, 'listbox');
  assert.equal(suggestionState.expanded, 'true');
  assert.ok(suggestionState.controls, '搜索框必须关联建议列表');
  assert.equal(suggestionState.suggestions[0], 'G01', `G1应优先建议G01：${JSON.stringify(suggestionState)}`);

  await searchInput.press('ArrowDown');
  const activeSuggestion = await page.evaluate(() => ({
    activeId: document.getElementById('search-input').getAttribute('aria-activedescendant'),
    selected: document.querySelector('#search-suggestions [aria-selected="true"]')?.dataset.suggestion || ''
  }));
  assert.ok(activeSuggestion.activeId, '方向键后必须设置活动建议');
  assert.equal(activeSuggestion.selected, 'G01');

  await searchInput.press('Enter');
  await page.waitForFunction(() => (document.getElementById('search-input') || {}).value === 'G01', null, { timeout: 15000 });
  await page.waitForFunction(() => document.getElementById('search-input').getAttribute('aria-expanded') === 'false', null, { timeout: 15000 });
  await page.waitForTimeout(700);

  const settledSearch = await page.evaluate(() => {
    let internal = {};
    try {
      internal = {
        keyword: typeof state !== 'undefined' && state ? state.keyword : null,
        activeFilter: typeof state !== 'undefined' && state ? state.activeFilter : null,
        selectedId: typeof state !== 'undefined' && state ? state.selectedId : null
      };
    } catch (error) {}
    return {
      input: (document.getElementById('search-input') || {}).value || '',
      expanded: document.getElementById('search-input').getAttribute('aria-expanded'),
      internal,
      results: Array.from(document.querySelectorAll('#result-list [data-open-entry]')).slice(0, 20).map(node => ({
        id: node.getAttribute('data-open-entry'),
        card: (node.closest('.result-card') || {}).innerText || ''
      }))
    };
  });

  assert.equal(settledSearch.input, 'G01', `键盘选择后输入值错误：${JSON.stringify(settledSearch)}`);
  assert.equal(settledSearch.expanded, 'false');
  assert.equal(settledSearch.internal.keyword, 'G01', `内部搜索词未同步：${JSON.stringify(settledSearch)}`);
  assert.ok(settledSearch.results.some(item => item.id === 'kb-gcode-g01'), `G01结果缺失：${JSON.stringify(settledSearch)}`);

  const g01Button = page.locator('#result-list [data-open-entry="kb-gcode-g01"]');
  await g01Button.scrollIntoViewIfNeeded();
  await g01Button.click();
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-detail-open') === 'true', null, { timeout: 15000 });
  await page.locator('#detail-back-btn').click();
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-detail-open') !== 'true', null, { timeout: 15000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-industrial-workspace') === 'true', null, { timeout: 15000 });
  await page.waitForFunction(() => (document.getElementById('search-input') || {}).value === 'G01', null, { timeout: 15000 });

  await page.locator('#search-clear-btn').click();
  await page.waitForFunction(() => (document.getElementById('search-input') || {}).value === '', null, { timeout: 15000 });
  await page.locator('#home-btn').click();
  await page.waitForSelector('#view-dashboard.active', { state: 'visible', timeout: 15000 });

  for (const mode of ['alarm', 'parameter', 'fault']) {
    await page.locator(`.launchpad-card[data-filter="${mode}"]`).click();
    await page.waitForSelector('#view-workspace.active', { state: 'visible', timeout: 15000 });
    await page.waitForFunction(expected => document.body.getAttribute('data-cnc-industrial-mode') === expected, mode, { timeout: 15000 });
    await page.waitForSelector('#result-list .result-card', { state: 'visible', timeout: 15000 });
    assert.ok(await page.locator('#result-list .result-card').count() > 0, `${mode} 查询必须保留结果`);
    assert.equal(await page.locator('#search-input').evaluate(node => getComputedStyle(node).backgroundImage), 'none');
    assert.equal(await page.locator('#view-workspace .search-toolbar').evaluate(node => getComputedStyle(node).backgroundImage), 'none');
    await page.locator('#home-btn').click();
    await page.waitForSelector('#view-dashboard.active', { state: 'visible', timeout: 15000 });
  }

  const relevantErrors = [...pageErrors, ...consoleErrors].filter(text => /industrial-workspace|CNC工业查询|TypeError|ReferenceError/i.test(text));
  assert.deepEqual(relevantErrors, [], `工业查询工作区存在控制台错误：${relevantErrors.join(' | ')}`);

  console.log('锤子工业卡片风查询工作区与键盘搜索建议通过', workspace);
  await browser.close();
})().catch(error => {
  try {
    const dir = path.join('cnc', 'test-artifacts', 'industrial-card-sample');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'workspace-error.log'), String(error && error.stack ? error.stack : error));
  } catch (writeError) {}
  console.error(error);
  process.exit(1);
});