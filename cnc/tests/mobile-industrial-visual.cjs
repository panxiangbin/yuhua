const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const currentUrl = process.env.CURRENT_URL || 'http://127.0.0.1:4173';
const baselineUrl = process.env.BASELINE_URL || 'http://127.0.0.1:4174';
const outputDir = path.resolve('cnc/test-artifacts/industrial-card-sample');
fs.mkdirSync(outputDir, { recursive: true });

async function openGcodeWorkspace(page, expectIndustrialWorkspace) {
  await page.locator('.launchpad-card[data-filter="gcode"]').click();
  await page.waitForFunction(() => window.__CNC_GM_PRO_INSTALLED__ === '20260720h', null, { timeout: 30000 });
  await page.waitForSelector('#view-workspace.active', { state: 'visible', timeout: 30000 });
  if (expectIndustrialWorkspace) {
    await page.waitForFunction(() => window.CNC_INDUSTRIAL_WORKSPACE && window.CNC_INDUSTRIAL_WORKSPACE.build === '20260721v', null, { timeout: 15000 });
    await page.waitForFunction(() => document.body.getAttribute('data-cnc-industrial-workspace') === 'true', null, { timeout: 15000 });
  }
  await page.waitForTimeout(800);
}

async function openG01FromWorkspace(page, expectIndustrial) {
  const card = page.locator('#result-list .result-card:has([data-open-entry="kb-gcode-g01"])');
  const button = page.locator('#result-list [data-open-entry="kb-gcode-g01"]');
  await page.locator('#search-input').fill('G1');
  await card.waitFor({ state: 'visible', timeout: 15000 });
  await button.waitFor({ state: 'attached', timeout: 15000 });

  if (expectIndustrial) {
    /* 新版必须走真实可见结果卡点击，并等待建议层自动收起。 */
    await page.waitForFunction(() => document.body.getAttribute('data-cnc-suggestions-suppressed') === 'true', null, { timeout: 5000 });
    await card.click();
  } else {
    /* 旧版基线的建议层会遮挡结果卡；仅为生成对照截图，在DOM中触发原按钮。 */
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
  await page.waitForSelector('.launchpad-card[data-filter="gcode"]', { state: 'visible', timeout: 30000 });
  if (expectIndustrial) {
    await page.waitForFunction(() => window.CNC_INDUSTRIAL_SAMPLE && document.body.getAttribute('data-cnc-industrial-surface') === 'home', null, { timeout: 15000 });
  }
  await page.waitForTimeout(1200);
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
  console.log('工业卡片风首页、查询工作区和详情修改前后截图已生成：', outputDir);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
