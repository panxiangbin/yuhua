const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const currentUrl = process.env.CURRENT_URL || 'http://127.0.0.1:4173';
const baselineUrl = process.env.BASELINE_URL || 'http://127.0.0.1:4174';
const outputDir = path.resolve('cnc/test-artifacts/industrial-card-sample');
fs.mkdirSync(outputDir, { recursive: true });

async function trustedClickHiddenRoute(page, selector) {
  const route = page.locator(selector);
  await route.waitFor({ state: 'attached', timeout: 15000 });
  await route.evaluate(node => {
    node.dataset.visualOriginalStyle = node.getAttribute('style') || '';
    Object.assign(node.style, {
      position: 'fixed',
      left: '16px',
      top: '16px',
      width: '180px',
      height: '48px',
      display: 'block',
      visibility: 'visible',
      opacity: '1',
      pointerEvents: 'auto',
      zIndex: '2147483647'
    });
  });
  await route.click();
  await route.evaluate(node => {
    const original = node.dataset.visualOriginalStyle || '';
    if (original) node.setAttribute('style', original);
    else node.removeAttribute('style');
    delete node.dataset.visualOriginalStyle;
  });
}

async function openGcodeWorkspace(page, expectIndustrialWorkspace) {
  if (expectIndustrialWorkspace) {
    // 手机端旧侧栏按产品设计隐藏。测试仅把既有路由按钮临时放入视口，
    // 再由 Playwright 产生可信点击，产品路由、首页保护和工作区初始化仍走真实链路。
    await trustedClickHiddenRoute(
      page,
      '#sidebar .tree-item[data-route="workspace"][data-filter="gcode"]'
    );
  } else {
    await page.locator('.launchpad-card[data-filter="gcode"]').click();
  }
  await page.waitForFunction(() => window.__CNC_GM_PRO_INSTALLED__ === '20260720h', null, { timeout: 30000 });
  await page.waitForSelector('#view-workspace.active', { state: 'visible', timeout: 30000 });
  if (expectIndustrialWorkspace) {
    await page.waitForFunction(() => window.CNC_INDUSTRIAL_WORKSPACE && window.CNC_INDUSTRIAL_WORKSPACE.build === '20260721v', null, { timeout: 15000 });
    await page.waitForFunction(() => document.body.getAttribute('data-cnc-industrial-workspace') === 'true', null, { timeout: 15000 });
  }
  await page.waitForSelector('#search-input', { state: 'visible', timeout: 15000 });
  await page.waitForTimeout(800);
}

async function dismissSuggestions(page) {
  await page.locator('#search-input').press('Escape');
  await page.locator('#search-input').blur();
  await page.waitForFunction(() => {
    const box = document.getElementById('search-suggestions');
    if (!box) return true;
    const style = getComputedStyle(box);
    return box.hidden || style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none';
  }, null, { timeout: 5000 });
}

async function openG01FromWorkspace(page, expectIndustrial) {
  const card = page.locator('#result-list .result-card:has([data-open-entry="kb-gcode-g01"])');
  const button = page.locator('#result-list [data-open-entry="kb-gcode-g01"]');
  await page.locator('#search-input').fill('G1');
  await card.waitFor({ state: 'visible', timeout: 15000 });
  await button.waitFor({ state: 'attached', timeout: 15000 });

  if (expectIndustrial) {
    await dismissSuggestions(page);
    await card.click();
  } else {
    await page.evaluate(() => {
      const box = document.getElementById('search-suggestions');
      if (box) {
        box.hidden = true;
        box.style.display = 'none';
        box.style.pointerEvents = 'none';
      }
      const target = document.querySelector('#result-list [data-open-entry="kb-gcode-g01"]');
      if (target) target.click();
    });
  }

  await page.waitForFunction(() => /G01/.test((document.getElementById('detail-code') || {}).textContent || ''), null, { timeout: 15000 });
  await page.evaluate(() => {
    const panel = document.getElementById('detail-panel');
    if (panel && getComputedStyle(panel).display === 'none') panel.classList.add('mobile-open');
    if (panel && panel.classList.contains('mobile-open')) {
      document.body.classList.add('cnc-detail-open');
      document.body.setAttribute('data-cnc-detail-open', 'true');
    }
    if (window.CNC_INDUSTRIAL_SAMPLE && typeof window.CNC_INDUSTRIAL_SAMPLE.sync === 'function') {
      window.CNC_INDUSTRIAL_SAMPLE.sync();
    }
  });

  if (expectIndustrial) {
    await page.waitForFunction(() => document.body.getAttribute('data-cnc-industrial-surface') === 'g01', null, { timeout: 15000 });
  }
  await page.waitForSelector('#detail-panel', { state: 'visible', timeout: 15000 });
}

async function capture(browser, baseUrl, prefix, expectIndustrial) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(`${baseUrl}/cnc/?visual=${prefix}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  if (expectIndustrial) {
    await page.waitForSelector('#xp-game-home[data-ready="true"]', { state: 'visible', timeout: 30000 });
    await page.waitForFunction(() => window.CNC_INDUSTRIAL_SAMPLE && document.body.getAttribute('data-cnc-industrial-surface') === 'home', null, { timeout: 15000 });
    // 首页保护期内会主动纠正非用户导航；完整等待保护窗口结束后再进入查询工作区。
    await page.waitForTimeout(5600);
  } else {
    await page.waitForSelector('.launchpad-card[data-filter="gcode"]', { state: 'visible', timeout: 30000 });
    await page.waitForTimeout(1200);
  }
  await page.screenshot({ path: path.join(outputDir, `${prefix}-home-390x844.png`), animations: 'disabled', fullPage: false });
  await openGcodeWorkspace(page, expectIndustrial);
  await page.screenshot({ path: path.join(outputDir, `${prefix}-gcode-workspace-390x844.png`), animations: 'disabled', fullPage: false });
  await openG01FromWorkspace(page, expectIndustrial);
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(outputDir, `${prefix}-g01-detail-390x844.png`), animations: 'disabled', fullPage: false });
  await page.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  await capture(browser, baselineUrl, 'before', false);
  await capture(browser, currentUrl, 'after', true);
  await browser.close();
  console.log('闯关首页、查询工作区和G01详情修改前后截图已生成：', outputDir);
})().catch(error => {
  console.error(error);
  process.exit(1);
});