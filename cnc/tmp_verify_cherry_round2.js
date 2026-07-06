const { chromium } = require('playwright');
(async() => {
  const browser = await chromium.launch({headless:true, channel:'msedge'});
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  const errors=[];
  page.on('pageerror', e => errors.push('pageerror:'+e.message));
  page.on('console', msg => { if (['error','warning'].includes(msg.type())) errors.push('console:'+msg.type()+':'+msg.text()); });
  await page.goto('file:///F:/AI%E5%B7%A5%E4%BD%9C%E5%8F%B0/cnc_param_quickfinder/index.html', {waitUntil:'load', timeout:60000});
  await page.waitForTimeout(5000);
  const before = await page.evaluate(() => ({
    launchpadCount: document.querySelectorAll('.launchpad-card').length,
    activeView: document.querySelector('.view.active')?.id,
    gateDisplay: getComputedStyle(document.querySelector('#access-gate')).display,
    pageErrors: null
  }));
  await page.click('[data-route="learning-map"]');
  await page.waitForTimeout(2000);
  const learningMap = await page.evaluate(() => ({
    activeView: document.querySelector('.view.active')?.id,
    treeNodeCount: document.querySelectorAll('.tree-node').length,
    categoryCardCount: document.querySelectorAll('.category-card').length,
    placeholderVisible: !!Array.from(document.querySelectorAll('*')).find(el => /知识地图加载中|暂无知识地图/.test(el.textContent||'') && getComputedStyle(el).display !== 'none')
  }));
  let recResult = { clickable:false };
  try {
    await page.click('[data-route="workspace"]');
    await page.waitForTimeout(1500);
    await page.fill('#search-input','G02');
    await page.waitForTimeout(1500);
    const firstResult = await page.$('[data-entry-id]');
    if (firstResult) {
      await firstResult.click();
      await page.waitForTimeout(1200);
      const recBtn = await page.$('.recommendation-link, .rec-link, [data-entry-id].recommendation-link, #detail-recommendations button');
      if (recBtn) {
        const beforeTitle = await page.locator('#detail-title').textContent();
        await recBtn.click();
        await page.waitForTimeout(1200);
        const afterTitle = await page.locator('#detail-title').textContent();
        recResult = { clickable:true, changed: beforeTitle !== afterTitle, beforeTitle, afterTitle };
      }
    }
  } catch (e) {
    recResult = { clickable:false, error:String(e) };
  }
  console.log(JSON.stringify({before, learningMap, recResult, errors}, null, 2));
  await page.screenshot({path:'F:/AI工作台/verify_cherry_round2.png', fullPage:true});
  await browser.close();
})();
