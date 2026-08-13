const { chromium } = require('playwright');
const assert = require('node:assert/strict');

// This smoke test pins the fixed-12-lesson semantic ability contract and real mobile route.
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=ability-analysis', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.CNC_TRAINING_PROFILE?.build === '20260813c', null, { timeout: 20000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-startup-home') === 'stable', null, { timeout: 15000 });
  await page.waitForFunction(() => window.CNC_GAME_QUERY_NAV?.build === '20260731d', null, { timeout: 15000 });
  assert.equal(await page.locator('.view.active').getAttribute('id'), 'view-dashboard');

  await page.evaluate(() => {
    // PWA25 会在首次渲染时生成并持久化“今日训练目标”。本测试是在页面启动后注入一组
    // 独立的能力样例，因此必须先清掉启动阶段生成的目标，让后续 snapshot 按这组样例
    // 重新生成当天目标；连续训练专门门禁另行验证“同一自然日目标保持稳定”。
    localStorage.removeItem('cnc_daily_training_plan_v1');
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1, 2, 3]));
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ version: 1, xp: 360, badges: ['迈出第一步'], completed: [1, 2, 3] }));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({
      version: 1, attempts: {}, wrong: ['g00-cutting'], correct: ['axis-z-direction'],
      lessonScores: { 1: 100, 2: 90, 3: 85, 4: 40, 5: 20, 6: 80, 7: 60, 8: 0, 9: 50, 10: 50, 11: 0, 12: 0 }
    }));
  });

  // 手机首页已取消第二套旧首页；直接使用当前真实可见底栏进入“我的”，
  // 验证真实用户路径而不是等待已经删除的 #xp-game-home 入口。
  await page.waitForFunction(() => {
    const node = document.querySelector('body > .xp-bottom-nav');
    return node && node.getClientRects().length > 0 && node.getAttribute('aria-hidden') === 'false' && !node.hasAttribute('inert');
  }, null, { timeout: 15000 });
  await page.locator('body > .xp-bottom-nav [data-xp-route="favorites"]').click();
  await page.waitForSelector('#view-favorites.active #xp-training-profile', { state: 'visible', timeout: 10000 });
  await page.evaluate(() => window.CNC_TRAINING_PROFILE.render());

  const data = await page.evaluate(() => window.CNC_TRAINING_PROFILE.snapshot());
  assert.equal(data.abilities.length, 6);

  // 六维能力必须与真实固定12关课程语义对齐，并且每关恰好出现一次。
  const expectedAbilityLessons = {
    safety: [1],
    coordinates: [2, 3, 5],
    setup: [6, 8],
    programming: [4, 9, 10, 11],
    process: [7],
    verification: [12]
  };
  for (const [id, lessons] of Object.entries(expectedAbilityLessons)) {
    assert.deepEqual(data.abilities.find(item => item.id === id)?.lessons, lessons, `${id}能力映射必须与固定12关真实课程语义一致`);
  }
  const mappedLessons = data.abilities.flatMap(item => item.lessons).sort((a, b) => a - b);
  assert.deepEqual(mappedLessons, Array.from({ length: 12 }, (_, index) => index + 1));
  assert.equal(new Set(mappedLessons).size, 12);

  // 当前样例里第5关20分是已经暴露的最低分薄弱课，应优先推荐它，
  // 不能再让“尚未训练=0分”的后续能力抢走推荐。
  assert.equal(data.abilities.find(item => item.id === 'safety').score, 100);
  assert.equal(data.abilities.find(item => item.id === 'coordinates').score, 65);
  assert.equal(data.abilities.find(item => item.id === 'setup').score, 40);
  assert.equal(data.abilities.find(item => item.id === 'programming').score, 35);
  assert.equal(data.abilities.find(item => item.id === 'process').score, 60);
  assert.equal(data.abilities.find(item => item.id === 'verification').score, 0);
  assert.equal(data.weakest.id, 'coordinates');
  assert.equal(data.weakest.weakLesson, 5);
  assert.equal(data.dailyPlan.lesson, 5);
  assert.equal(data.dailyPlan.ability, '机床与坐标');

  const cards = page.locator('.xp-ability-card');
  assert.equal(await cards.count(), 6);
  const text = await page.locator('.xp-ability-section').textContent();
  assert.match(text, /安全操作/);
  assert.match(text, /机床与坐标/);
  assert.match(text, /装夹与对刀/);
  assert.match(text, /编程与读图/);
  assert.match(text, /刀具与工艺/);
  assert.match(text, /首件验证/);
  assert.match(text, /当前最需要加强/);
  assert.match(text, /机床与坐标 · 65 分/);

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

  await page.locator('[data-ability-train="5"]').first().click();
  await page.waitForSelector('#view-study.active #study-detail-content .lesson-detail-v2[data-level="5"]', { state: 'visible', timeout: 15000 });
  assert.deepEqual(errors, []);
  console.log('固定12关真实课程语义、六维能力映射、真实薄弱课识别、手机单列布局与针对训练入口通过', { abilities: data.abilities, weakest: data.weakest, dailyPlan: data.dailyPlan, layout });
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
