const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=industrial-map', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.KnowledgeTreeUI && document.querySelector('link[data-cnc-industrial-gallery]'));
  await page.locator('#sidebar-open').click();
  const mapEntry = page.locator('#sidebar.open [data-route="learning-map"]').first();
  await mapEntry.waitFor({ state: 'visible', timeout: 10000 });
  await mapEntry.click();
  await page.waitForSelector('#view-learning-map.active .tree-node-header', { state: 'visible', timeout: 30000 });

  const toolbar = page.locator('#view-learning-map .knowledge-map-toolbar');
  const buttons = toolbar.locator('[data-map-view]');
  assert.equal(await buttons.count(), 3, '知识地图必须保留三种视图');
  const firstHeader = page.locator('#view-learning-map .tree-node-header').first();
  const firstSize = await firstHeader.boundingBox();
  assert.ok(firstSize && firstSize.height >= 58, '树节点点击区至少58px');
  assert.equal(await page.locator('#view-learning-map .knowledge-tree').getAttribute('role'), 'tree');
  assert.equal(await firstHeader.getAttribute('aria-label') !== null, true, '树节点必须有无障碍名称');

  await buttons.filter({ hasText: '分类视图' }).click();
  await page.waitForSelector('#knowledgeCategoriesGrid:not([hidden]) .category-card', { state: 'visible' });
  const categoryCount = await page.locator('#knowledgeCategoriesGrid .category-card').count();
  assert.ok(categoryCount >= 6, '分类视图至少显示六个现场分类');
  const categoryGridColumns = await page.locator('#knowledgeCategoriesGrid').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length);
  assert.equal(categoryGridColumns, 1, '390px手机分类视图必须单列');

  await buttons.filter({ hasText: '学习路径' }).click();
  await page.waitForSelector('#learningPathsGrid:not([hidden]) .learning-path-card', { state: 'visible' });
  assert.equal(await page.locator('#learningPathsGrid .learning-path-card').count(), 4, '学习路径必须提供四条可操作路线');
  const path = page.locator('#learningPathsGrid .learning-path-card').first();
  const pathSize = await path.boundingBox();
  assert.ok(pathSize && pathSize.height >= 76, '学习路径卡点击区至少76px');
  await path.click();
  await page.waitForSelector('#view-study.active', { state: 'visible', timeout: 10000 });

  assert.deepEqual(errors, [], '知识地图流程不应产生控制台错误');
  console.log(JSON.stringify({ passed: true, firstSize, categoryCount, categoryGridColumns, pathSize, errors }, null, 2));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
