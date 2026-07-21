const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error.message || error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=industrial-click-debug', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.launchpad-card[data-filter="gcode"]', { state: 'visible', timeout: 30000 });
  await page.locator('.launchpad-card[data-filter="gcode"]').click();
  await page.waitForFunction(() => window.__CNC_GM_PRO_INSTALLED__ === '20260720h', null, { timeout: 30000 });
  await page.locator('#search-input').fill('G1');
  await page.waitForTimeout(1800);

  const before = await page.evaluate(() => {
    const button = document.querySelector('#result-list [data-open-entry="kb-gcode-g01"]');
    let stateSnapshot = null;
    try {
      stateSnapshot = typeof state !== 'undefined' ? {
        activeFilter: state.activeFilter,
        keyword: state.keyword,
        selectedId: state.selectedId,
        entryExists: state.entries.some(item => item.id === 'kb-gcode-g01')
      } : null;
    } catch (error) {
      stateSnapshot = { error: String(error) };
    }
    return {
      buttonExists: Boolean(button),
      buttonBound: Boolean(button && button.dataset.cncCleanBound === 'true'),
      buttonText: button ? button.textContent : '',
      cleanBuild: window.CNC_CLEAN_UI && window.CNC_CLEAN_UI.build,
      workspaceBuild: window.CNC_INDUSTRIAL_WORKSPACE && window.CNC_INDUSTRIAL_WORKSPACE.build,
      appSelectEntry: Boolean(window.app && typeof window.app.selectEntry === 'function'),
      detailCode: (document.getElementById('detail-code') || {}).textContent || '',
      state: stateSnapshot
    };
  });

  const button = page.locator('#result-list [data-open-entry="kb-gcode-g01"]');
  if (await button.count()) await button.click({ force: true });
  await page.waitForTimeout(800);

  const after = await page.evaluate(() => {
    let stateSnapshot = null;
    try {
      stateSnapshot = typeof state !== 'undefined' ? {
        activeFilter: state.activeFilter,
        keyword: state.keyword,
        selectedId: state.selectedId
      } : null;
    } catch (error) {
      stateSnapshot = { error: String(error) };
    }
    const panel = document.getElementById('detail-panel');
    return {
      detailCode: (document.getElementById('detail-code') || {}).textContent || '',
      detailTitle: (document.getElementById('detail-title') || {}).textContent || '',
      selectedId: stateSnapshot && stateSnapshot.selectedId,
      state: stateSnapshot,
      panelClass: panel ? panel.className : '',
      detailOpen: document.body.getAttribute('data-cnc-detail-open'),
      industrialSurface: document.body.getAttribute('data-cnc-industrial-surface'),
      activeView: (document.querySelector('.view.active') || {}).id || '',
      searchValue: (document.getElementById('search-input') || {}).value || ''
    };
  });

  console.log(JSON.stringify({ before, after, errors }, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(0);
});