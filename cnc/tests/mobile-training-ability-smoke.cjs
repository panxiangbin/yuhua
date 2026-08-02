const { chromium } = require('playwright');
const assert = require('node:assert/strict');

// This smoke test intentionally pins the public training-profile build contract.
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=ability-analysis', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.CNC_TRAINING_PROFILE?.build === '20260724a', null, { timeout: 20000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-startup-home') === 'stable', null, { timeout: 15000 });
  await page.waitForFunction(() => window.CNC_GAME_QUERY_NAV?.build === '20260731d', null, { timeout: 15000 });
  assert.equal(await page.locator('.view.active').getAttribute('id'), 'view-dashboard');

  await page.evaluate(() => {
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1, 2, 3]));
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ version: 1, xp: 360, badges: ['迈出第一步'], completed: [1, 2, 3] }));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({
      version: 1, attempts: {}, wrong: ['g00-cutting'], correct: ['axis-z-direction'],
      lessonScores: { 1: 100, 2: 90, 3: 85, 4: 40, 5: 20, 6: 80, 7: 60, 8: 0, 9: 50, 10: 50, 11: 0, 12: 0 }
    }));
  });

  // 从手机首页可见的“现场速查”进入工作区，再使用恢复后的工具导航进入“我的”。
  await page.locator('#xp-game-home [data-xp-query-filter="gcode"]').click();
  await page.waitForSelector('#view-workspace.active', { state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => {
    const node = document.querySelector('body > .xp-bottom-nav');
    return node && node.getClientRects().length > 0 && node.getAttribute('aria-hidden') === 'false' && !node.hasAttribute('inert');
  }, null, { timeout: 15000 });
  await page.locator('body > .xp-bottom-nav [data-xp-route="favorites"]').click();
  await page.waitForSelector('#view-favorites.active #xp-training-profile', { state: 'visible', timeout: 10000 });
  await page.evaluate(() => window.CNC_TRAINING_PROFILE.render());

  const data = await page.evaluate(() => window.CNC_TRAINING_PROFILE.snapshot());
  assert.equal(data.abilities.length, 6);
  assert.equal(data.abilities.find(item => item.id === 'coordinates').score, 85);
  assert.equal(data.abilities.find(item => item.id === 'setup').score, 30);
  assert.equal(data.weakest.id, 'verification');

  const cards = page.locator('.xp-ability-card');
  assert.equal(await cards.count(), 6);
  const text = await page.locator('.xp-ability-section').textContent();
  assert.match(text, /安全操作/);
  assert.match(text, /坐标基础/);
  assert.match(text, /对刀装夹/);
  assert.match(text, /当前最需要加强/);

  // 成长档案样式表由运行时插入。先确认样式表、390px媒体查询和字体全部就绪，
  // 再执行连续帧测量，避免把“样式表尚未应用”的过渡状态误判为生产布局失败。
  await page.waitForFunction(() => {
    const link = document.querySelector('link[data-cnc-training-profile]');
    const list = document.querySelector('.xp-ability-list');
    if (!link?.sheet || !list || !window.matchMedia('(max-width:760px)').matches) return false;
    const style = getComputedStyle(list);
    return style.display === 'grid' && style.gridTemplateColumns.split(/\s+/).filter(Boolean).length === 1;
  }, null, { timeout: 15000 });
  await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });

  // 继续严格要求六张卡片在手机端单列排列且按钮不少于44px，并要求相同布局
  // 签名连续稳定5帧后再验收。
  const layout = await page.locator('.xp-ability-section').evaluate(async panel => {
    const measure = () => {
      const rects = [...panel.querySelectorAll('.xp-ability-card')].map(node => node.getBoundingClientRect());
      const buttons = [...panel.querySelectorAll('button')].map(node => node.getBoundingClientRect().height);
      const list = panel.querySelector('.xp-ability-list');
      const gridStyle = list ? getComputedStyle(list) : null;
      return {
        viewportWidth: window.innerWidth,
        mobileQuery: window.matchMedia('(max-width:760px)').matches,
        stylesheetReady: Boolean(document.querySelector('link[data-cnc-training-profile]')?.sheet),
        gridTemplateColumns: gridStyle?.gridTemplateColumns || '',
        cardCount: rects.length,
        buttonCount: buttons.length,
        singleColumn: rects.length === 6 && rects.slice(1).every((rect, i) =>
          Math.abs(rect.left - rects[i].left) < 2 && rect.top > rects[i].top
        ),
        minButtonHeight: buttons.length ? Math.min(...buttons) : 0,
        signature: rects.map(rect => [rect.left, rect.top, rect.width, rect.height].map(value => Math.round(value * 10) / 10).join(',')).join('|')
      };
    };

    let previousSignature = '';
    let stableFrames = 0;
    let latest = measure();
    for (let frame = 0; frame < 120; frame += 1) {
      await new Promise(resolve => requestAnimationFrame(resolve));
      latest = measure();
      const valid = latest.viewportWidth === 390 && latest.mobileQuery && latest.stylesheetReady && latest.gridTemplateColumns.split(/\s+/).filter(Boolean).length === 1 && latest.singleColumn && latest.minButtonHeight >= 44;
      if (valid && latest.signature === previousSignature) stableFrames += 1;
      else stableFrames = 0;
      previousSignature = latest.signature;
      if (stableFrames >= 5) return { ...latest, stableFrames };
    }
    return { ...latest, stableFrames };
  });
  assert.equal(layout.viewportWidth, 390, `阶段能力视口不是390px：${JSON.stringify(layout)}`);
  assert.equal(layout.mobileQuery, true, `阶段能力手机媒体查询未生效：${JSON.stringify(layout)}`);
  assert.equal(layout.stylesheetReady, true, `阶段能力样式表未就绪：${JSON.stringify(layout)}`);
  assert.equal(layout.gridTemplateColumns.split(/\s+/).filter(Boolean).length, 1, `阶段能力网格不是单列：${JSON.stringify(layout)}`);
  assert.equal(layout.cardCount, 6, `阶段能力卡片数量错误：${JSON.stringify(layout)}`);
  assert.ok(layout.buttonCount > 0, `阶段能力按钮缺失：${JSON.stringify(layout)}`);
  assert.equal(layout.singleColumn, true, `阶段能力卡片未单列：${JSON.stringify(layout)}`);
  assert.ok(layout.minButtonHeight >= 44, `阶段能力按钮小于44px：${JSON.stringify(layout)}`);
  assert.ok(layout.stableFrames >= 5, `阶段能力布局未连续稳定5帧：${JSON.stringify(layout)}`);

  await page.locator('[data-ability-train="11"]').first().click();
  await page.waitForSelector('#view-study.active #study-detail-content .lesson-detail-v2[data-level="11"]', { state: 'visible', timeout: 15000 });
  assert.deepEqual(errors, []);
  console.log('单层首页真实导航、六维阶段能力、薄弱项识别与针对训练入口通过', { abilities: data.abilities, weakest: data.weakest, layout });
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });