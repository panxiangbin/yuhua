const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true
  });
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=industrial-gallery', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  await page.waitForFunction(() => window.CNC_TRUST_NAV && window.CNC_TRUST_NAV.galleryBuild === '20260722x');
  const menuButton = page.locator('#sidebar-open');
  await menuButton.waitFor({ state: 'visible', timeout: 30000 });
  await menuButton.click();
  const galleryEntry = page.locator('#sidebar.open [data-route="gallery"]').first();
  await galleryEntry.waitFor({ state: 'visible', timeout: 10000 });
  await galleryEntry.click();
  await page.waitForSelector('#view-gallery.active #cncGalleryGrid .cnc-gallery-card', { state: 'visible', timeout: 30000 });

  assert.equal(await page.locator('link[data-cnc-industrial-gallery]').count(), 1, '图库工业样式必须只加载一次');
  const gridColumns = await page.locator('#cncGalleryGrid').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length);
  assert.equal(gridColumns, 1, '390px手机图库必须为单列');

  const firstCard = page.locator('#cncGalleryGrid .cnc-gallery-card').first();
  const cardBox = await firstCard.boundingBox();
  assert.ok(cardBox && cardBox.width > 350, '图库卡片应接近手机可用宽度');
  const cardStyle = await firstCard.evaluate(node => {
    const style = getComputedStyle(node);
    return { radius: style.borderRadius, background: style.backgroundColor, minHeight: style.minHeight };
  });
  assert.equal(cardStyle.radius, '14px');
  assert.notEqual(cardStyle.background, 'rgba(0, 0, 0, 0)');

  await firstCard.click();
  await page.waitForSelector('#cncGalleryModal.is-open', { state: 'visible', timeout: 10000 });
  assert.equal(await page.locator('#cncGalleryModal').getAttribute('role'), 'dialog');
  assert.equal(await page.locator('#cncGalleryModal').getAttribute('aria-modal'), 'true');
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.id), 'cncGalleryClose', '打开大图后焦点应进入关闭按钮');

  const closeSize = await page.locator('#cncGalleryClose').boundingBox();
  assert.ok(closeSize && closeSize.width >= 44 && closeSize.height >= 44, '关闭按钮点击区至少44px');
  await page.locator('#cncGalleryClose').click();
  await page.waitForTimeout(120);
  assert.equal(await page.locator('#cncGalleryModal').getAttribute('aria-hidden'), 'true');
  assert.equal(await firstCard.evaluate(node => document.activeElement === node), true, '关闭大图后焦点应回到原图片卡');

  assert.deepEqual(errors, [], '图库流程不应产生控制台错误');
  console.log(JSON.stringify({ passed: true, cardStyle, closeSize, errors }, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
