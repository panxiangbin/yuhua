const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const currentUrl = process.env.CURRENT_URL || 'http://127.0.0.1:4173';
const baselineUrl = process.env.BASELINE_URL || 'http://127.0.0.1:4174';
const outputDir = path.resolve('cnc/test-artifacts/industrial-card-sample');
fs.mkdirSync(outputDir, { recursive: true });

async function waitForSingleLayerHome(page) {
  await page.waitForFunction(() => {
    const visible = node => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0;
    };
    const nav = document.querySelector('body > .xp-bottom-nav');
    const oldHome = document.querySelector('#xp-game-home,#xp-personal-home');
    return window.CNC_PERSONAL_HOME?.refactorBuild === '20260804-mobile1' &&
      visible(document.querySelector('#view-dashboard.active .cnc-home-hero-copy')) &&
      visible(document.querySelector('#view-dashboard.active .launchpad-search')) &&
      visible(document.querySelector('#view-dashboard.active .cnc-home-route-card')) &&
      visible(nav) && !oldHome;
  }, null, { timeout: 30000 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function openGcodeWorkspace(page) {
  // 通过单层手机首页真实可见的快捷查询进入工作区，不再搬运或点击已删除的第二套首页按钮。
  await page.waitForFunction(() => window.CNC_TRUST_NAV
    && window.CNC_TRUST_NAV.build === '20260721s'
    && (window.__CNC_TRUST_READY_AT__ || 0) > 0
    && typeof window.navigate === 'function', null, { timeout: 30000 });

  const button = page.locator('body > .xp-bottom-nav [data-xp-filter="gcode"]');
  await button.waitFor({ state: 'visible', timeout: 15000 });
  const target = await button.evaluate(node => {
    const rect = node.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  if (target.width < 44 || target.height < 44) {
    throw new Error(`查代码底栏按钮点击区不足：${JSON.stringify(target)}`);
  }
  await button.click();

  await page.waitForFunction(() => {
    const workspace = document.getElementById('view-workspace');
    const search = document.getElementById('search-input');
    const utility = document.querySelector('body > .xp-bottom-nav');
    return workspace && workspace.classList.contains('active')
      && search && getComputedStyle(search).display !== 'none'
      && utility && utility.getClientRects().length > 0
      && utility.getAttribute('aria-hidden') === 'false'
      && !utility.hasAttribute('inert');
  }, null, { timeout: 30000 });
  await page.waitForFunction(() => window.__CNC_GM_PRO_INSTALLED__ === '20260720h', null, { timeout: 30000 });
  await page.waitForFunction(() => window.CNC_INDUSTRIAL_WORKSPACE?.build === '20260721v', null, { timeout: 15000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-industrial-workspace') === 'true', null, { timeout: 15000 });
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

async function openG01FromWorkspace(page) {
  const card = page.locator('#result-list .result-card:has([data-open-entry="kb-gcode-g01"])');
  const button = page.locator('#result-list [data-open-entry="kb-gcode-g01"]');
  await page.locator('#search-input').fill('G1');
  await card.waitFor({ state: 'visible', timeout: 15000 });
  await button.waitFor({ state: 'attached', timeout: 15000 });
  await dismissSuggestions(page);
  await card.click();

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
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-industrial-surface') === 'g01', null, { timeout: 15000 });
  await page.waitForSelector('#detail-panel', { state: 'visible', timeout: 15000 });
}

async function capture(browser, baseUrl, prefix) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(`${baseUrl}/cnc/?visual=${prefix}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForSingleLayerHome(page);
  await page.waitForFunction(() => window.CNC_INDUSTRIAL_SAMPLE
    && document.body.getAttribute('data-cnc-industrial-surface') === 'home', null, { timeout: 15000 });
  await page.waitForTimeout(1100);

  await page.screenshot({ path: path.join(outputDir, `${prefix}-home-390x844.png`), animations: 'disabled', fullPage: false });
  await openGcodeWorkspace(page);
  await page.screenshot({ path: path.join(outputDir, `${prefix}-gcode-workspace-390x844.png`), animations: 'disabled', fullPage: false });
  await openG01FromWorkspace(page);
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(outputDir, `${prefix}-g01-detail-390x844.png`), animations: 'disabled', fullPage: false });
  await page.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    await capture(browser, baselineUrl, 'before');
    await capture(browser, currentUrl, 'after');
  } finally {
    await browser.close();
  }
  console.log('单层手机首页、查询工作区和G01详情修改前后截图已生成：', outputDir);
})().catch(error => {
  fs.writeFileSync(path.join(outputDir, 'mobile-industrial-visual-error.txt'), `${error.stack || error}\n`);
  console.error(error);
  process.exit(1);
});