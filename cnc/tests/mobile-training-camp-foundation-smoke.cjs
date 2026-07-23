const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto('http://127.0.0.1:4173/cnc/?smoke=training-camp-foundation', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.CNC_PERSONAL_HOME && window.CNC_PERSONAL_HOME.trainingBuild === '20260723a', null, { timeout: 20000 });
  await page.waitForSelector('#xp-personal-home', { state: 'visible', timeout: 20000 });

  const startup = await page.evaluate(() => ({
    activeView: (document.querySelector('.view.active') || {}).id || '',
    stable: document.body.getAttribute('data-cnc-startup-home'),
    trainingBuild: document.body.dataset.cncTrainingBuild,
    api: window.CNC_PERSONAL_HOME.runCheck()
  }));
  assert.equal(startup.activeView, 'view-dashboard', 'CNC 根网址必须稳定停留首页');
  assert.equal(startup.stable, 'stable', '启动守卫必须确认首页稳定');
  assert.equal(startup.trainingBuild, '20260723a');
  assert.equal(startup.api.passed, true);
  assert.equal(startup.api.profileVersion, 1);

  const home = page.locator('#xp-personal-home');
  await home.scrollIntoViewIfNeeded();
  assert.match((await home.locator('h2').textContent()) || '', /零基础|训练/);
  assert.equal(await home.locator('.xp-progress-number').count(), 1);
  assert.equal(await home.locator('[data-xp-continue]').count(), 1);
  assert.ok(await home.locator('.xp-stat-card').count() >= 3);

  await page.locator('.launchpad-card[data-route="study"]').click();
  await page.waitForSelector('#view-study.active', { state: 'visible', timeout: 15000 });
  await page.waitForSelector('#xp-training-overview', { state: 'visible', timeout: 15000 });

  const overview = page.locator('#xp-training-overview');
  assert.match((await overview.locator('h4').textContent()) || '', /独立完成首件/);
  assert.equal(await overview.locator('.xp-roadmap-card').count(), 7, '必须展示完整七阶段成长路线');
  assert.equal(await overview.locator('.xp-training-stat').count(), 3);
  assert.equal(await overview.locator('[data-xp-daily]').count(), 1);
  assert.equal(await page.locator('#view-study .study-card[data-training-ready="true"]').count(), 12, '12关必须全部纳入训练营基础结构');
  assert.equal(await page.locator('#view-study .study-card .xp-course-meta').count(), 12);

  const columns = await overview.locator('.xp-training-stats').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').filter(Boolean).length);
  assert.equal(columns, 1, '手机端训练数据必须单列显示');
  const dailyHeight = await overview.locator('[data-xp-daily]').evaluate(node => node.getBoundingClientRect().height);
  assert.ok(dailyHeight >= 44, '每日训练按钮点击区不得小于44px');

  await overview.locator('[data-xp-daily]').click();
  await page.waitForTimeout(120);
  const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('cnc_training_profile_v1')));
  assert.equal(profile.version, 1);
  assert.equal(profile.daily.completed, true);
  assert.ok(profile.xp >= 20);
  assert.match((await page.locator('#xp-training-overview [data-xp-daily]').textContent()) || '', /今日已完成/);

  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  assert.deepEqual(errors, []);

  console.log('CNC新手训练营基础、七阶段路线、版本化成长档案与每日任务通过', {
    trainingBuild: startup.trainingBuild,
    roadmap: 7,
    lessons: 12,
    profileVersion: profile.version,
    xp: profile.xp
  });
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
