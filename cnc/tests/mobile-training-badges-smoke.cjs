const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });

  await page.goto('http://127.0.0.1:4173/cnc/training-badges.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => document.body.dataset.trainingBadges === 'ready');

  const normal = await page.evaluate(() => {
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({
      version: 1,
      badges: ['连续训练3天'],
      trainingDays: ['2026-07-21', '2026-07-22', '2026-07-23'],
      currentStreak: 3,
      bestStreak: 3
    }));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1, 2, 3]));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({ version: 1, lessonScores: { 1: 100, 2: 80, 3: 60 } }));
    const before = {
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1'),
      practice: localStorage.getItem('cnc_training_practice_v1')
    };
    const rendered = window.CNC_TRAINING_BADGES.render();
    const after = {
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1'),
      practice: localStorage.getItem('cnc_training_practice_v1')
    };
    return { rendered, before, after };
  });

  assert.equal(normal.rendered.earned, 4);
  assert.equal(normal.rendered.total, 8);
  assert.deepEqual(normal.rendered.done, [1, 2, 3]);
  assert.equal(normal.rendered.scorePassed, true);
  assert.equal(normal.rendered.streak, 3);
  assert.deepEqual(normal.rendered.integrityIssues, []);
  assert.deepEqual(normal.after, normal.before, '正常徽章渲染不得改写学习记录');
  assert.equal(await page.locator('.badge').count(), 8);
  assert.equal(await page.locator('.badge.is-earned').count(), 4);
  assert.equal(await page.locator('#earned-count').textContent(), '4');
  assert.equal(await page.locator('#total-count').textContent(), '8');
  assert.equal(await page.locator('#completion-rate').textContent(), '50%');
  assert.equal(await page.locator('#integrity-notice').isHidden(), true);
  assert.match(await page.locator('.notice').last().textContent(), /原厂手册/);

  const canonicalPriority = await page.evaluate(() => {
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({
      version: 1,
      currentStreak: 0,
      bestStreak: 0,
      completed: [1, 2, 3, 4, 5, 6],
      completedStages: ['stage-7']
    }));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1, 2, 3]));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({ version: 1, lessonScores: {} }));
    const before = {
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1'),
      practice: localStorage.getItem('cnc_training_practice_v1')
    };
    const rendered = window.CNC_TRAINING_BADGES.render();
    const after = {
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1'),
      practice: localStorage.getItem('cnc_training_practice_v1')
    };
    return { rendered, before, after };
  });

  assert.deepEqual(canonicalPriority.rendered.done, [1, 2, 3], 'canonical 存在时不得叠加旧 profile 完成记录');
  assert.equal(canonicalPriority.rendered.earned, 2);
  assert.deepEqual(canonicalPriority.rendered.integrityIssues, []);
  assert.deepEqual(canonicalPriority.after, canonicalPriority.before, 'canonical 优先级判断不得改写学习记录');

  const legacyFallback = await page.evaluate(() => {
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({
      version: 1,
      currentStreak: 0,
      bestStreak: 0,
      completed: [1, 'stage-2', '3'],
      completedStages: ['stage-3', 4, 4]
    }));
    localStorage.removeItem('cnc_study_completed_v1');
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({ version: 1, lessonScores: {} }));
    const before = {
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1'),
      practice: localStorage.getItem('cnc_training_practice_v1')
    };
    const rendered = window.CNC_TRAINING_BADGES.render();
    const after = {
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1'),
      practice: localStorage.getItem('cnc_training_practice_v1')
    };
    return { rendered, before, after };
  });

  assert.deepEqual(legacyFallback.rendered.done, [1, 2, 3, 4], 'canonical 缺失时必须兼容旧 profile 完成记录并去重');
  assert.equal(legacyFallback.rendered.earned, 2);
  assert.ok(legacyFallback.rendered.integrityIssues.some(item => item.includes('completed:entry')), '旧 profile 纯数字字符串课程号必须判为异常');
  assert.deepEqual(legacyFallback.after, legacyFallback.before, '旧档案回退不得创建 canonical 或改写原记录');

  const corruptCanonical = await page.evaluate(() => {
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({
      version: 1,
      currentStreak: 0,
      bestStreak: 0,
      completed: [1, 2, 3, 4, 5, 6],
      completedStages: ['stage-7']
    }));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify({ fake: 12 }));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({ version: 1, lessonScores: {} }));
    const before = {
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1'),
      practice: localStorage.getItem('cnc_training_practice_v1')
    };
    const rendered = window.CNC_TRAINING_BADGES.render();
    const after = {
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1'),
      practice: localStorage.getItem('cnc_training_practice_v1')
    };
    return { rendered, before, after };
  });

  assert.deepEqual(corruptCanonical.rendered.done, [], 'canonical 已存在但损坏时不得偷偷回退旧 profile');
  assert.equal(corruptCanonical.rendered.earned, 0);
  assert.ok(corruptCanonical.rendered.integrityIssues.some(item => item === 'cnc_study_completed_v1:shape'));
  assert.deepEqual(corruptCanonical.after, corruptCanonical.before, '损坏 canonical 阻断时不得改写原记录');
  assert.equal(await page.locator('#integrity-notice').isVisible(), true);

  const malformed = await page.evaluate(() => {
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({
      version: 1,
      badges: ['连续训练30天'],
      trainingDays: ['2026-07-01', '2026-07-10', '2026-07-20'],
      currentStreak: '30',
      bestStreak: '30'
    }));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1, 1, '2', 'stage-2', 13, 0, null, [], {}]));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({
      version: 1,
      lessonScores: { 1: '100', 2: '999', 3: 120, 4: -1, 5: 'Infinity' }
    }));
    const before = {
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1'),
      practice: localStorage.getItem('cnc_training_practice_v1')
    };
    const rendered = window.CNC_TRAINING_BADGES.render();
    const after = {
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1'),
      practice: localStorage.getItem('cnc_training_practice_v1')
    };
    return { rendered, before, after };
  });

  assert.equal(malformed.rendered.earned, 1, '重复/未知课程、数值字符串成绩和伪造连续徽章不得抬高成长成果');
  assert.deepEqual(malformed.rendered.done, [1, 2]);
  assert.equal(malformed.rendered.scorePassed, false);
  assert.equal(malformed.rendered.streak, 0);
  assert.ok(malformed.rendered.integrityIssues.length >= 3);
  assert.deepEqual(malformed.after, malformed.before, '异常数据只读降级不得清洗或改写 localStorage');
  assert.equal(await page.locator('#earned-count').textContent(), '1');
  assert.equal(await page.locator('#integrity-notice').isVisible(), true);
  assert.match(await page.locator('#integrity-notice').textContent(), /只按能够确认/);
  assert.equal(await page.locator('#integrity-notice a').getAttribute('href'), './data-health.html');

  const brokenRoots = await page.evaluate(() => {
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify([]));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify({ fake: 12 }));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify('broken'));
    const before = {
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1'),
      practice: localStorage.getItem('cnc_training_practice_v1')
    };
    const rendered = window.CNC_TRAINING_BADGES.render();
    const after = {
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1'),
      practice: localStorage.getItem('cnc_training_practice_v1')
    };
    return { rendered, before, after };
  });

  assert.equal(brokenRoots.rendered.earned, 0);
  assert.deepEqual(brokenRoots.rendered.done, []);
  assert.equal(brokenRoots.rendered.scorePassed, false);
  assert.equal(brokenRoots.rendered.streak, 0);
  assert.ok(brokenRoots.rendered.integrityIssues.length >= 3);
  assert.deepEqual(brokenRoots.after, brokenRoots.before, '根结构损坏时仍不得改写原始记录');
  assert.equal(await page.locator('#earned-count').textContent(), '0');
  assert.equal(await page.locator('#integrity-notice').isVisible(), true);

  const layout = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    hasInvalidNumberText: /NaN|Infinity/.test(document.body.innerText)
  }));
  assert.ok(layout.scrollWidth <= layout.innerWidth, `390px 手机端不应横向溢出：${layout.scrollWidth} > ${layout.innerWidth}`);
  assert.equal(layout.hasInvalidNumberText, false, '页面不得显示 NaN/Infinity');

  const boxes = await page.locator('.badge').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect()));
  assert.ok(boxes.every(box => box.width > 330));
  assert.ok(boxes.every((box, index) => index === 0 || box.top >= boxes[index - 1].bottom));
  assert.ok((await page.locator('.back').evaluate(node => node.getBoundingClientRect().height)) >= 44);
  assert.ok((await page.locator('#integrity-notice a').evaluate(node => node.getBoundingClientRect().height)) >= 44);
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(consoleErrors, []);

  console.log('训练徽章 canonical 优先/旧档案回退、严格课程/成绩/连续训练语义、异常根结构只读降级、390x844布局与安全提示通过', {
    normal: normal.rendered,
    canonicalPriority: canonicalPriority.rendered,
    legacyFallback: legacyFallback.rendered,
    corruptCanonical: corruptCanonical.rendered,
    malformed: malformed.rendered,
    brokenRoots: brokenRoots.rendered,
    layout
  });
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });