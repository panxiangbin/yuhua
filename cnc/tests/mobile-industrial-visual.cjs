const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const currentUrl = process.env.CURRENT_URL || 'http://127.0.0.1:4173';
const baselineUrl = process.env.BASELINE_URL || 'http://127.0.0.1:4174';
const outputDir = path.resolve('cnc/test-artifacts/industrial-card-sample');
fs.mkdirSync(outputDir, { recursive: true });

async function openGcodeWorkspace(page) {
  // PR基线与当前分支都已经采用手机闯关首页。视觉诊断必须沿用用户真实可见的
  // “现场速查 → G/M代码”入口，不再临时搬运或点击按设计隐藏的旧卡片/侧栏。
  await page.waitForFunction(() => window.CNC_TRUST_NAV
    && window.CNC_TRUST_NAV.build === '20260721s'
    && (window.__CNC_TRUST_READY_AT__ || 0) > 0
    && window.CNC_GAME_QUERY_NAV
    && window.CNC_GAME_QUERY_NAV.build === '20260731d'
    && typeof window.navigate === 'function', null, { timeout: 30000 });

  const gcodeNav = page.locator('#xp-game-home .xp-game-query-button[data-xp-query-filter="gcode"]');
  await gcodeNav.waitFor({ state: 'visible', timeout: 15000 });
  const target = await gcodeNav.evaluate(node => {
    const rect = node.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  if (target.width < 44 || target.height < 44) {
    throw new Error(`G/M代码可见入口点击区不足：${JSON.stringify(target)}`);
  }
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
  await page.waitForFunction(() => window.__CNC_GM_PRO_INSTALLED__ === '20260720h', null, { timeout: 30000 });
  await page.waitForFunction(() => window.CNC_INDUSTRIAL_WORKSPACE
    && window.CNC_INDUSTRIAL_WORKSPACE.build === '20260721v', null, { timeout: 15000 });
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
  await page.waitForSelector('#xp-game-home[data-ready="true"]', { state: 'visible', timeout: 30000 });
  await page.waitForFunction(() => window.CNC_INDUSTRIAL_SAMPLE
    && document.body.getAttribute('data-cnc-industrial-surface') === 'home', null, { timeout: 15000 });
  await page.waitForFunction(() => {
    const game = document.getElementById('xp-game-home');
    const legacy = document.querySelector('.launchpad-card[data-filter="gcode"]');
    return document.body.classList.contains('cnc-game-home-enabled')
      && game && game.getClientRects().length > 0
      && legacy && legacy.getClientRects().length === 0;
  }, null, { timeout: 30000 });
  // 首页保护期内会主动纠正非用户导航；完整等待保护窗口结束后再走真实可见入口。
  await page.waitForTimeout(5600);

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
  console.log('闯关首页、查询工作区和G01详情修改前后截图已生成：', outputDir);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
