const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error.message || error)));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=industrial-workspace', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.launchpad-card[data-filter="gcode"]', { state: 'visible', timeout: 30000 });
  await page.waitForFunction(() => window.CNC_INDUSTRIAL_WORKSPACE && window.CNC_INDUSTRIAL_WORKSPACE.build === '20260721v', null, { timeout: 15000 });

  await page.locator('.launchpad-card[data-filter="gcode"]').click();
  await page.waitForSelector('#view-workspace.active', { state: 'visible', timeout: 30000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-industrial-workspace') === 'true', null, { timeout: 15000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-industrial-mode') === 'gcode', null, { timeout: 15000 });
  await page.waitForTimeout(700);

  const workspace = await page.evaluate(() => {
    const panel = document.querySelector('#view-workspace .workspace-panel.search-panel');
    const input = document.getElementById('search-input');
    const first = document.querySelector('#result-list .result-card');
    const code = first && first.querySelector('.result-top strong');
    const panelStyle = getComputedStyle(panel);
    const inputStyle = getComputedStyle(input);
    const cardStyle = getComputedStyle(first);
    const cardRect = first.getBoundingClientRect();
    return {
      panelBackgroundImage: panelStyle.backgroundImage,
      panelBackgroundColor: panelStyle.backgroundColor,
      panelRadius: parseFloat(panelStyle.borderRadius),
      panelShadow: panelStyle.boxShadow,
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

  assert.equal(workspace.panelBackgroundImage, 'none', '搜索面板不能使用大面积渐变');
  assert.ok(workspace.panelBackgroundColor.includes('255'), '搜索面板应为白色或米白表面');
  assert.ok(workspace.panelRadius >= 10 && workspace.panelRadius <= 16, `搜索面板圆角应克制：${workspace.panelRadius}`);
  assert.notEqual(workspace.panelShadow, 'none', '搜索面板应有轻阴影和物件感');
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

  await page.locator('#search-input').fill('G1');
  await page.waitForSelector('#result-list [data-open-entry="kb-gcode-g01"]', { state: 'attached', timeout: 15000 });
  await page.locator('#result-list [data-open-entry="kb-gcode-g01"]').click({ force: true });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-detail-open') === 'true', null, { timeout: 15000 });
  await page.locator('#detail-back-btn').click();
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-detail-open') !== 'true', null, { timeout: 15000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-industrial-workspace') === 'true', null, { timeout: 15000 });
  await page.waitForFunction(() => (document.getElementById('search-input') || {}).value === 'G1', null, { timeout: 15000 });

  await page.locator('#home-btn').click();
  await page.waitForSelector('#view-dashboard.active', { state: 'visible', timeout: 15000 });

  for (const mode of ['alarm', 'parameter', 'fault']) {
    await page.locator(`.launchpad-card[data-filter="${mode}"]`).click();
    await page.waitForSelector('#view-workspace.active', { state: 'visible', timeout: 15000 });
    await page.waitForFunction(expected => document.body.getAttribute('data-cnc-industrial-mode') === expected, mode, { timeout: 15000 });
    await page.waitForSelector('#result-list .result-card', { state: 'visible', timeout: 15000 });
    assert.ok(await page.locator('#result-list .result-card').count() > 0, `${mode} 查询必须保留结果`);
    assert.equal(await page.locator('#search-input').evaluate(node => getComputedStyle(node).backgroundImage), 'none');
    await page.locator('#home-btn').click();
    await page.waitForSelector('#view-dashboard.active', { state: 'visible', timeout: 15000 });
  }

  const relevantErrors = [...pageErrors, ...consoleErrors].filter(text => /industrial-workspace|CNC工业查询|TypeError|ReferenceError/i.test(text));
  assert.deepEqual(relevantErrors, [], `工业查询工作区存在控制台错误：${relevantErrors.join(' | ')}`);

  console.log('锤子工业卡片风查询工作区通过', workspace);
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});