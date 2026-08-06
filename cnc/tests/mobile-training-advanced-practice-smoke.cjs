const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('http://127.0.0.1:4173/cnc/index.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.CNC_TRAINING_PRACTICE && /^\d{8}[a-z]$/.test(window.CNC_TRAINING_PRACTICE.build), null, { timeout: 20000 });
  await page.waitForFunction(() => {
    const home = window.CNC_PERSONAL_HOME?.runCheck?.();
    const nav = document.querySelector('body > .xp-bottom-nav');
    return home?.legacyHomeRemoved === true
      && home?.bottomNavReady === true
      && nav?.getClientRects().length > 0
      && nav.getAttribute('aria-hidden') === 'false'
      && !nav.hasAttribute('inert');
  }, null, { timeout: 20000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-startup-home') === 'stable', null, { timeout: 15000 });

  const buildConsistency = await page.evaluate(() => {
    const build = window.CNC_TRAINING_PRACTICE.build;
    const style = document.querySelector('link[data-cnc-training-practice]');
    const profileScript = document.querySelector('script[data-cnc-training-profile-script]');
    return {
      build,
      bodyBuild: document.body.dataset.cncPracticeBuild || '',
      styleHref: style ? style.getAttribute('href') || '' : '',
      profileSrc: profileScript ? profileScript.getAttribute('src') || '' : '',
      activeView: document.querySelector('.view.active')?.id || '',
      oldHomes: document.querySelectorAll('#xp-game-home,#xp-personal-home').length,
      home: window.CNC_PERSONAL_HOME.runCheck()
    };
  });
  assert.equal(buildConsistency.bodyBuild, buildConsistency.build, '练习API与页面构建标识必须一致');
  assert.ok(buildConsistency.styleHref.endsWith(`training-practice.css?v=${buildConsistency.build}`), '练习样式资源版本必须与API构建一致');
  assert.ok(buildConsistency.profileSrc.endsWith(`training-profile.js?v=${buildConsistency.build}`), '成长档案脚本版本必须与API构建一致');
  assert.equal(buildConsistency.activeView, 'view-dashboard', '根网址必须稳定停留首页');
  assert.equal(buildConsistency.oldHomes, 0, '高级练习不得依赖已删除的双首页节点');
  assert.equal(buildConsistency.home.legacyHomeRemoved, true, '旧双首页必须保持移除');
  assert.equal(buildConsistency.home.bottomNavReady, true, '真实五项底栏必须就绪');

  const studyNav = page.locator('body > .xp-bottom-nav [data-xp-route="study"]');
  await studyNav.waitFor({ state: 'visible', timeout: 15000 });
  const studyTarget = await studyNav.evaluate(node => {
    const rect = node.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      label: node.getAttribute('aria-label') || node.querySelector('span')?.textContent.trim() || node.textContent.trim()
    };
  });
  assert.ok(studyTarget.width >= 44, `学习底栏入口宽度不得小于44px：${studyTarget.width}`);
  assert.ok(studyTarget.height >= 48, `学习底栏入口高度不得小于48px：${studyTarget.height}`);
  assert.match(studyTarget.label, /学习/, '学习底栏入口必须有明确中文名称');
  await studyNav.click();
  await page.waitForSelector('#view-study.active', { state: 'visible', timeout: 15000 });
  await page.waitForSelector('#xp-practice-entry', { state: 'visible', timeout: 15000 });

  // 学习视图可见后仍需等待练习模块自身的语义健康检查完成，
  // 避免接受尚未完成增强的局部界面。
  await page.waitForFunction(() => {
    const practice = window.CNC_TRAINING_PRACTICE;
    return Boolean(practice && practice.runCheck && practice.runCheck().passed);
  }, null, { timeout: 15000 });

  const api = await page.evaluate(() => window.CNC_TRAINING_PRACTICE.runCheck());
  assert.equal(api.build, buildConsistency.build, '高级练习检查结果与页面构建标识必须一致');
  assert.equal(api.passed, true, `advanced practice readiness failed: ${JSON.stringify(api)}`);
  assert.equal(api.questions, 9);
  assert.equal(api.lessonGates, 12);
  assert.equal(api.passScore, 80);
  assert.ok(api.types.includes('fill'));
  assert.ok(api.types.includes('order'));
  assert.ok(api.types.includes('find-error'));

  await page.evaluate(() => window.CNC_TRAINING_PRACTICE.renderQuestion('fill-g01', 'all'));
  const panel = page.locator('#xp-practice-panel');
  await panel.waitFor({ state: 'visible', timeout: 10000 });
  await panel.locator('[data-practice-fill]').fill('g1');
  await panel.locator('[data-practice-submit]').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('cnc_training_practice_v1')).correct.includes('fill-g01'));
  assert.match((await panel.locator('.xp-practice-feedback').textContent()) || '', /回答正确/);

  await page.evaluate(() => window.CNC_TRAINING_PRACTICE.renderQuestion('order-first-run', 'all'));
  assert.equal(await panel.locator('.xp-practice-order li').count(), 4);
  const minOrderButton = await panel.locator('.xp-practice-order button').evaluateAll(nodes => Math.min(...nodes.map(node => node.getBoundingClientRect().height)));
  assert.ok(minOrderButton >= 44, `步骤排序按钮触控高度不得小于44px：${minOrderButton}`);

  await page.evaluate(() => window.CNC_TRAINING_PRACTICE.renderQuestion('find-error-g00', 'all'));
  assert.match((await panel.locator('.xp-practice-code').textContent()) || '', /G00 Z-20\.0/);
  await panel.locator('input[value="2"]').check();
  await panel.locator('[data-practice-submit]').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('cnc_training_practice_v1')).correct.includes('find-error-g00'));
  assert.deepEqual(errors, []);
  console.log('真实学习底栏、程序补空、步骤排序、看程序找错、80分闯关与12关绑定检查通过', { api, studyTarget });
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
