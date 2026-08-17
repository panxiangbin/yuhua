const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const artifactDir = path.resolve(__dirname, '../test-artifacts/daily-training-plan');
fs.mkdirSync(artifactDir, { recursive: true });

let browser;
let page;

(async () => {
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=daily-plan', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.CNC_TRAINING_PROFILE?.build === '20260817d', null, { timeout: 20000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-startup-home') === 'stable', null, { timeout: 15000 });
  await page.waitForFunction(() => window.CNC_GAME_QUERY_NAV?.build === '20260731d', null, { timeout: 15000 });
  // 成长档案样式由脚本动态挂载，并有一次启动补渲染。
  // 必须确认 CSSOM、390px 媒体查询与补渲染全部就绪，不能降低单列或触控断言。
  await page.waitForFunction(() => {
    const link = document.querySelector('link[data-cnc-training-profile]');
    return performance.now() >= 1200 && Boolean(link?.sheet) && matchMedia('(max-width: 760px)').matches;
  }, null, { timeout: 10000 });
  assert.equal(await page.locator('.view.active').getAttribute('id'), 'view-dashboard');

  const expectedAbilityLessons = {
    safety: [1],
    coordinates: [2, 3, 5],
    setup: [6, 8],
    programming: [4, 9, 10, 11],
    process: [7],
    verification: [12]
  };

  // 零记录新手必须从固定12关第1关开始，不能因为“未训练=0分”跳到后面的能力。
  const zeroState = await page.evaluate(() => window.CNC_TRAINING_PROFILE.snapshot());
  for (const [id, lessons] of Object.entries(expectedAbilityLessons)) {
    assert.deepEqual(zeroState.abilities.find(item => item.id === id)?.lessons, lessons, `${id}能力映射必须与固定12关真实课程语义一致`);
  }
  const zeroMappedLevels = zeroState.abilities.flatMap(item => item.lessons).slice().sort((a, b) => a - b);
  assert.deepEqual(zeroMappedLevels, Array.from({ length: 12 }, (_, index) => index + 1), '六项能力必须完整覆盖固定12关');
  assert.equal(new Set(zeroMappedLevels).size, 12, '固定12关在能力映射中必须恰好出现一次');
  assert.equal(zeroState.dailyPlan.lesson, 1, '零记录新手必须从固定12关第1关开始');
  assert.equal(zeroState.dailyPlan.ability, '安全操作');
  assert.match(zeroState.dailyPlan.reason, /固定12关学习顺序/);
  assert.equal(zeroState.dailyPlan.passed, false);

  await page.evaluate(() => {
    // PWA25 首次渲染会先固定当天目标。本测试在零记录场景之后切换到独立的第5关薄弱课样例，
    // 必须清除前一场景的当日目标；同一自然日目标稳定性由 training streak 专门门禁独立验证。
    localStorage.removeItem('cnc_daily_training_plan_v1');
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1, 2, 3]));
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ version: 1, xp: 360, badges: ['迈出第一步'], completed: [1, 2, 3] }));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({
      version: 2,
      gateVersion: 2,
      attempts: {},
      // 两道错题分别属于第9关和第1关；推荐薄弱课是第5关，不能把全局错题硬塞进第5关训练步骤。
      wrong: ['g00-cutting', 'safe-stop-first'],
      correct: ['axis-z-direction'],
      // 新版5题门禁只能形成20分粒度，fixture必须使用真实可达成绩，不能继续伪造旧版90/85/50分。
      lessonScores: { 1: 100, 2: 100, 3: 80, 4: 60, 5: 20, 6: 80, 7: 60, 8: 0, 9: 40, 10: 40, 11: 0, 12: 0 },
      legacyLessonScores: {}
    }));
  });

  await page.waitForFunction(() => {
    const home = window.CNC_PERSONAL_HOME?.runCheck?.();
    const nav = document.querySelector('body > .xp-bottom-nav');
    return home?.legacyHomeRemoved === true
      && home?.bottomNavReady === true
      && nav?.getClientRects().length > 0
      && nav.getAttribute('aria-hidden') === 'false'
      && !nav.hasAttribute('inert');
  }, null, { timeout: 15000 });

  const profileNav = page.locator('body > .xp-bottom-nav [data-xp-route="favorites"]');
  await profileNav.waitFor({ state: 'visible', timeout: 15000 });
  const profileTarget = await profileNav.evaluate(node => {
    const rect = node.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      label: node.getAttribute('aria-label') || node.querySelector('span')?.textContent.trim() || node.textContent.trim()
    };
  });
  assert.ok(profileTarget.width >= 44, `“我的”底栏入口宽度不得小于44px：${profileTarget.width}`);
  assert.ok(profileTarget.height >= 48, `“我的”底栏入口高度不得小于48px：${profileTarget.height}`);
  assert.match(profileTarget.label, /我的/, '“我的”底栏入口必须有明确中文名称');
  await profileNav.click();

  const activeProfile = page.locator('#view-favorites.active #xp-training-profile');
  await activeProfile.waitFor({ state: 'visible', timeout: 10000 });
  assert.equal(await activeProfile.count(), 1, '活跃“我的”视图中必须只有一份成长档案');
  await page.evaluate(() => window.CNC_TRAINING_PROFILE.render());

  await page.waitForFunction(() => {
    const view = document.querySelector('#view-favorites.active');
    const profile = view?.querySelector('#xp-training-profile');
    const list = profile?.querySelector('.xp-plan-list');
    const steps = list ? [...list.querySelectorAll('.xp-plan-step')] : [];
    const buttons = list ? [...list.querySelectorAll('button')] : [];
    const columns = list ? getComputedStyle(list).gridTemplateColumns.trim().split(/\s+/).filter(Boolean) : [];
    return Boolean(profile?.getClientRects().length)
      && steps.length === 3
      && buttons.length > 0
      && columns.length === 1
      && buttons.every(button => button.getBoundingClientRect().height >= 44);
  }, null, { timeout: 10000 });

  const data = await page.evaluate(() => window.CNC_TRAINING_PROFILE.snapshot());
  for (const [id, lessons] of Object.entries(expectedAbilityLessons)) {
    assert.deepEqual(data.abilities.find(item => item.id === id)?.lessons, lessons, `${id}运行态能力映射必须与固定12关真实课程语义一致`);
  }
  const mappedLevels = data.abilities.flatMap(item => item.lessons).slice().sort((a, b) => a - b);
  assert.deepEqual(mappedLevels, Array.from({ length: 12 }, (_, index) => index + 1), '运行态能力映射必须完整覆盖固定12关');
  assert.equal(new Set(mappedLevels).size, 12, '运行态固定12关不得跨能力重复映射');
  assert.equal(data.dailyPlan.steps.length, 3);
  assert.equal(data.dailyPlan.lesson, 5, '有已练低分课程时必须优先补真实薄弱课，不能跳到未训练课程');
  assert.equal(data.dailyPlan.ability, '机床与坐标');
  assert.equal(data.dailyPlan.score, 67);
  assert.equal(data.weakest.weakLesson, 5);
  assert.match(data.dailyPlan.reason, /已练课程中分数最低/);
  assert.match(data.dailyPlan.target, /80 分以上/);
  assert.equal(data.dailyPlan.steps[0].level, 5);
  assert.match(data.dailyPlan.steps[0].title, /第 5 关/);
  assert.equal(data.dailyPlan.steps[1].type, 'practice', '其它课程的错题不得劫持第5关的立即练习步骤');
  assert.deepEqual(data.dailyPlan.lessonWrong, [], '第5关没有真实错题时，课程错题集合必须为空');
  assert.equal(data.dailyPlan.globalWrong, 2);
  assert.equal(data.dailyPlan.steps[1].otherWrong, 2);
  assert.match(data.dailyPlan.steps[1].detail, /其它课程还有 2 道错题/);
  assert.equal(data.dailyPlan.passed, false);

  const plan = activeProfile.locator('.xp-daily-plan');
  await plan.waitFor({ state: 'visible', timeout: 10000 });
  assert.equal(await plan.count(), 1, '活跃成长档案中必须只有一份每日计划');
  assert.match(await plan.textContent(), /今天先练什么/);
  assert.match(await plan.textContent(), /今日目标/);
  assert.match(await plan.textContent(), /机床与坐标/);
  assert.match(await plan.textContent(), /其它课程还有 2 道错题/);
  assert.doesNotMatch(await plan.textContent(), /重做当前 2 道错题/);
  assert.match(await plan.textContent(), /第 5 关/);
  assert.equal(await plan.locator('[data-profile-wrong]').count(), 0, '当前薄弱课无错题时，每日计划不得生成全局错题按钮');

  // 要求活跃视图内同一份计划连续稳定 5 帧，并同时满足：
  // CSS 计算为单列、三个卡片垂直排列、左边缘对齐、按钮触控高度不小于44px。
  const layout = await plan.evaluate(async panel => {
    const measure = () => {
      const list = panel.querySelector('.xp-plan-list');
      const rects = [...panel.querySelectorAll('.xp-plan-step')].map(node => node.getBoundingClientRect());
      const buttons = [...panel.querySelectorAll('button')].map(node => node.getBoundingClientRect().height);
      const columns = list
        ? getComputedStyle(list).gridTemplateColumns.trim().split(/\s+/).filter(Boolean)
        : [];
      const aligned = rects.length === 3 && rects.slice(1).every(rect => Math.abs(rect.left - rects[0].left) < 2);
      const vertical = rects.length === 3 && rects.slice(1).every((rect, index) => rect.top >= rects[index].bottom - 2);
      return {
        stepCount: rects.length,
        buttonCount: buttons.length,
        computedColumnCount: columns.length,
        singleColumn: columns.length === 1 && aligned && vertical,
        minButtonHeight: buttons.length ? Math.min(...buttons) : 0,
        signature: [
          columns.join(','),
          ...rects.map(rect => [rect.left, rect.top, rect.width, rect.height].map(value => Math.round(value * 10) / 10).join(','))
        ].join('|')
      };
    };

    let previousSignature = '';
    let stableFrames = 0;
    let latest = measure();
    for (let frame = 0; frame < 120; frame += 1) {
      await new Promise(resolve => requestAnimationFrame(resolve));
      latest = measure();
      const valid = latest.singleColumn && latest.minButtonHeight >= 44;
      if (valid && latest.signature === previousSignature) stableFrames += 1;
      else stableFrames = 0;
      previousSignature = latest.signature;
      if (stableFrames >= 5) return { ...latest, stableFrames };
    }
    return { ...latest, stableFrames };
  });

  assert.equal(layout.stepCount, 3);
  assert.ok(layout.buttonCount > 0);
  assert.equal(layout.computedColumnCount, 1, `每日计划CSS计算列数必须为1：${JSON.stringify(layout)}`);
  assert.equal(layout.singleColumn, true, `每日计划必须在活跃手机视图中垂直单列：${JSON.stringify(layout)}`);
  assert.ok(layout.minButtonHeight >= 44, `每日计划按钮触控高度不得小于44px：${layout.minButtonHeight}`);
  assert.ok(layout.stableFrames >= 5, `每日计划布局未连续稳定5帧：${JSON.stringify(layout)}`);

  // 原有第5关课程跳转必须继续通过，不能因修错题回流而降低既有断言。
  await plan.locator('[data-ability-train="5"]').first().click();
  await page.waitForSelector('#view-study.active #study-detail-content .lesson-detail-v2[data-level="5"]', { state: 'visible', timeout: 15000 });

  // 再加入一题真正属于第5关的错题。每日计划必须只点开这题，而不是排在全局第一位的第9关错题。
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('cnc_training_practice_v1'));
    state.wrong = ['g00-cutting', 'g54-independent-check'];
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify(state));
    window.CNC_TRAINING_PROFILE.render();
  });
  await profileNav.click();
  await activeProfile.waitFor({ state: 'visible', timeout: 10000 });
  await page.evaluate(() => window.CNC_TRAINING_PROFILE.render());

  const contextual = await page.evaluate(() => window.CNC_TRAINING_PROFILE.snapshot());
  assert.equal(contextual.dailyPlan.lesson, 5);
  assert.deepEqual(contextual.dailyPlan.lessonWrong, ['g54-independent-check']);
  assert.equal(contextual.dailyPlan.steps[1].type, 'wrong');
  assert.equal(contextual.dailyPlan.steps[1].questionId, 'g54-independent-check');
  assert.equal(contextual.dailyPlan.steps[1].lessonWrong, 1);
  assert.equal(contextual.dailyPlan.steps[1].otherWrong, 1);
  assert.match(contextual.dailyPlan.steps[1].title, /重做本关 1 道错题/);

  const contextualButton = activeProfile.locator('[data-profile-wrong="g54-independent-check"]');
  await contextualButton.waitFor({ state: 'visible', timeout: 10000 });
  assert.ok((await contextualButton.evaluate(node => node.getBoundingClientRect().height)) >= 44);
  await contextualButton.click();
  await page.waitForFunction(() => {
    const panel = document.querySelector('#xp-practice-panel');
    return panel && !panel.hidden && panel.dataset.questionId === 'g54-independent-check';
  }, null, { timeout: 15000 });
  assert.equal(await page.locator('#xp-practice-panel').getAttribute('data-question-id'), 'g54-independent-check');
  assert.match(await page.locator('#xp-practice-panel').textContent(), /G54/);
  assert.deepEqual(errors, []);

  // 已存在但嵌套损坏的共享成长档案必须阻断个性化计划与训练完成写入，不能先静默归一化再覆盖证据。
  const nestedIntegrity = await page.evaluate(() => {
    localStorage.removeItem('cnc_daily_training_plan_v1');
    const profile = {
      version: 1,
      xp: 360,
      badges: ['迈出第一步', ' 迈出第一步 '],
      completed: [1, 2],
      trainingDays: ['2026-08-13', '2026-08-13', '2026-02-30'],
      currentStreak: 2,
      bestStreak: 2,
      lastTrainingDate: '2026-08-13'
    };
    const practice = { version: 2, gateVersion: 2, attempts: {}, wrong: [], correct: [], lessonScores: { 1: 100, 2: 100, 3: 100 }, legacyLessonScores: {} };
    const done = [1, 2, 3];
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify(profile));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify(practice));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify(done));
    const before = {
      profile: localStorage.getItem('cnc_training_profile_v1'),
      practice: localStorage.getItem('cnc_training_practice_v1'),
      done: localStorage.getItem('cnc_study_completed_v1'),
      daily: localStorage.getItem('cnc_daily_training_plan_v1')
    };
    const state = window.CNC_TRAINING_PROFILE.snapshot();
    const complete = window.CNC_TRAINING_PROFILE.completeToday();
    window.CNC_TRAINING_PROFILE.render();
    const after = {
      profile: localStorage.getItem('cnc_training_profile_v1'),
      practice: localStorage.getItem('cnc_training_practice_v1'),
      done: localStorage.getItem('cnc_study_completed_v1'),
      daily: localStorage.getItem('cnc_daily_training_plan_v1')
    };
    return { state, complete, before, after };
  });
  await profileNav.click();
  await activeProfile.waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForFunction(() => document.querySelector('#view-favorites.active #xp-training-profile')?.dataset.integrity === 'blocked', null, { timeout: 10000 });
  assert.equal(nestedIntegrity.state.integrity, false, '嵌套损坏的共享成长档案必须进入完整性阻断');
  assert.ok(nestedIntegrity.state.issues.includes('cnc_training_profile_v1.trainingDays:entry'), '非法训练日期必须明确标记');
  assert.ok(nestedIntegrity.state.issues.includes('cnc_training_profile_v1.trainingDays:duplicate'), '重复训练日期必须明确标记');
  assert.ok(nestedIntegrity.state.issues.includes('cnc_training_profile_v1.badges:duplicate'), '空白变体重复徽章必须明确标记');
  assert.equal(nestedIntegrity.complete.ok, false, '嵌套损坏档案不得写入今日训练完成记录');
  assert.equal(nestedIntegrity.complete.integrity, false);
  assert.deepEqual(nestedIntegrity.after, nestedIntegrity.before, '完整性阻断不得创建daily plan或覆盖嵌套损坏profile/practice/done');
  assert.match(nestedIntegrity.complete.reason, /学习数据异常/);
  assert.match(await activeProfile.textContent(), /学习数据需要检查/);
  assert.match(await activeProfile.textContent(), /已暂停个性化训练/);
  assert.equal(await activeProfile.locator('[data-profile-health]').getAttribute('href'), './data-health.html');
  assert.equal(await activeProfile.locator('[data-profile-backup]').getAttribute('href'), './data-backup.html');
  const nestedRecoveryTouch = await activeProfile.locator('[data-profile-health],[data-profile-backup]').evaluateAll(nodes => Math.min(...nodes.map(node => node.getBoundingClientRect().height)));
  assert.ok(nestedRecoveryTouch >= 44, `嵌套完整性恢复入口触控高度不得小于44px：${nestedRecoveryTouch}`);
  assert.doesNotMatch(await activeProfile.textContent(), /NaN|Infinity/);

  // 专项练习页历史上会把错题保存成对象记录；共享档案必须兼容三类字段并按题目ID去重，不能把合法历史数据误判成损坏。
  const compatibleWrong = await page.evaluate(() => {
    localStorage.removeItem('cnc_daily_training_plan_v1');
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({
      version: 1,
      xp: 260,
      badges: ['迈出第一步'],
      completed: [1, 2, 3],
      trainingDays: [],
      currentStreak: 0,
      bestStreak: 0,
      lastTrainingDate: null
    }));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({
      version: 1,
      gateVersion: 2,
      attempts: {},
      wrong: {
        'sc-legacy-01': { id: 'sc-legacy-01', course: '安全与坐标', title: '历史专项错题' },
        'g54-independent-check': { id: 'g54-independent-check', course: '工件坐标', title: 'G54独立检查' }
      },
      wrongItems: [{ questionId: 'av-legacy-02', title: '旧版兼容错题' }],
      wrongQuestions: [{ id: 'g54-independent-check', title: '同题重复记录' }],
      correct: [],
      lessonScores: { 1: 100, 2: 100, 3: 80, 4: 60, 5: 20, 6: 80, 7: 60, 8: 0, 9: 40, 10: 40, 11: 0, 12: 0 },
      legacyLessonScores: {}
    }));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1, 2, 3]));
    const before = {
      profile: localStorage.getItem('cnc_training_profile_v1'),
      practice: localStorage.getItem('cnc_training_practice_v1'),
      done: localStorage.getItem('cnc_study_completed_v1')
    };
    const state = window.CNC_TRAINING_PROFILE.snapshot();
    const after = {
      profile: localStorage.getItem('cnc_training_profile_v1'),
      practice: localStorage.getItem('cnc_training_practice_v1'),
      done: localStorage.getItem('cnc_study_completed_v1')
    };
    return { state, before, after };
  });
  assert.equal(compatibleWrong.state.integrity, true, '合法对象型/数组型历史错题兼容字段不能被误判为练习档案损坏');
  assert.deepEqual(compatibleWrong.state.wrongIds.slice().sort(), ['av-legacy-02', 'g54-independent-check', 'sc-legacy-01'], '三类错题字段必须按题目ID去重汇总');
  assert.equal(compatibleWrong.state.wrong, 3, '兼容错题总数必须按唯一题目ID统计');
  assert.equal(compatibleWrong.state.dailyPlan.lesson, 5, '兼容错题不得改变真实薄弱课推荐');
  assert.deepEqual(compatibleWrong.state.dailyPlan.lessonWrong, ['g54-independent-check'], '本关兼容错题必须精准回流到第5关');
  assert.equal(compatibleWrong.state.dailyPlan.steps[1].otherWrong, 2, '其它专项兼容错题只能计入全局错题，不得劫持当前课程');
  assert.deepEqual(compatibleWrong.after, compatibleWrong.before, '读取兼容错题不得改写profile/practice/done源学习数据');

  // 练习档案根对象虽然合法，但 wrong / lessonScores 嵌套证据损坏时也必须阻断，不能静默按0错题/0分继续生成计划。
  const practiceIntegrity = await page.evaluate(() => {
    localStorage.removeItem('cnc_daily_training_plan_v1');
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({
      version: 1,
      xp: 180,
      badges: ['迈出第一步'],
      completed: [1],
      trainingDays: ['2026-08-17'],
      currentStreak: 1,
      bestStreak: 1,
      lastTrainingDate: '2026-08-17'
    }));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({
      version: 2,
      gateVersion: 2,
      attempts: {},
      wrong: { bad: 42 },
      correct: [],
      lessonScores: { 1: 100, 2: '100', 13: 80, 3: 120 },
      legacyLessonScores: {}
    }));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1]));
    const before = {
      profile: localStorage.getItem('cnc_training_profile_v1'),
      practice: localStorage.getItem('cnc_training_practice_v1'),
      done: localStorage.getItem('cnc_study_completed_v1'),
      daily: localStorage.getItem('cnc_daily_training_plan_v1')
    };
    const state = window.CNC_TRAINING_PROFILE.snapshot();
    const complete = window.CNC_TRAINING_PROFILE.completeToday();
    window.CNC_TRAINING_PROFILE.render();
    const after = {
      profile: localStorage.getItem('cnc_training_profile_v1'),
      practice: localStorage.getItem('cnc_training_practice_v1'),
      done: localStorage.getItem('cnc_study_completed_v1'),
      daily: localStorage.getItem('cnc_daily_training_plan_v1')
    };
    return { state, complete, before, after };
  });
  await profileNav.click();
  await activeProfile.waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForFunction(() => document.querySelector('#view-favorites.active #xp-training-profile')?.dataset.integrity === 'blocked', null, { timeout: 10000 });
  assert.equal(practiceIntegrity.state.integrity, false, '练习档案嵌套损坏必须进入共享成长档案完整性阻断');
  assert.ok(practiceIntegrity.state.issues.includes('cnc_training_practice_v1.wrong:entry'), '对象型wrong中的非记录值必须明确标记条目异常');
  assert.ok(practiceIntegrity.state.issues.includes('cnc_training_practice_v1.lessonScores:entry'), '数值字符串/越界lessonScores必须明确标记条目异常');
  assert.equal(practiceIntegrity.complete.ok, false, '练习档案嵌套损坏时禁止写入今日训练完成记录');
  assert.equal(practiceIntegrity.complete.integrity, false);
  assert.deepEqual(practiceIntegrity.after, practiceIntegrity.before, '练习档案完整性阻断不得创建daily plan或改写profile/practice/done');
  assert.match(practiceIntegrity.complete.reason, /学习数据异常/);
  assert.match(await activeProfile.textContent(), /学习数据需要检查/);
  assert.match(await activeProfile.textContent(), /已暂停个性化训练/);
  assert.equal(await activeProfile.locator('[data-profile-health]').getAttribute('href'), './data-health.html');
  assert.equal(await activeProfile.locator('[data-profile-backup]').getAttribute('href'), './data-backup.html');
  const practiceRecoveryTouch = await activeProfile.locator('[data-profile-health],[data-profile-backup]').evaluateAll(nodes => Math.min(...nodes.map(node => node.getBoundingClientRect().height)));
  assert.ok(practiceRecoveryTouch >= 44, `练习档案完整性恢复入口触控高度不得小于44px：${practiceRecoveryTouch}`);
  assert.doesNotMatch(await activeProfile.textContent(), /NaN|Infinity/);

  // 根级损坏不能伪装成零进度，更不能在“完成今日训练”时覆盖原始学习档案。
  const rootIntegrity = await page.evaluate(() => {
    localStorage.removeItem('cnc_daily_training_plan_v1');
    localStorage.setItem('cnc_training_profile_v1', '{"version":1');
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({ version: 2, gateVersion: 2, attempts: {}, wrong: [], correct: [], lessonScores: { 1: 100 }, legacyLessonScores: {} }));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1]));
    const before = {
      profile: localStorage.getItem('cnc_training_profile_v1'),
      practice: localStorage.getItem('cnc_training_practice_v1'),
      done: localStorage.getItem('cnc_study_completed_v1'),
      daily: localStorage.getItem('cnc_daily_training_plan_v1')
    };
    const state = window.CNC_TRAINING_PROFILE.snapshot();
    const complete = window.CNC_TRAINING_PROFILE.completeToday();
    window.CNC_TRAINING_PROFILE.render();
    const after = {
      profile: localStorage.getItem('cnc_training_profile_v1'),
      practice: localStorage.getItem('cnc_training_practice_v1'),
      done: localStorage.getItem('cnc_study_completed_v1'),
      daily: localStorage.getItem('cnc_daily_training_plan_v1')
    };
    return { state, complete, before, after };
  });
  await profileNav.click();
  await activeProfile.waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForFunction(() => document.querySelector('#view-favorites.active #xp-training-profile')?.dataset.integrity === 'blocked', null, { timeout: 10000 });
  assert.equal(rootIntegrity.state.integrity, false, '损坏profile根数据必须进入共享成长档案完整性阻断');
  assert.ok(rootIntegrity.state.issues.includes('cnc_training_profile_v1'));
  assert.equal(rootIntegrity.complete.ok, false, '损坏学习档案时禁止写入今日训练完成记录');
  assert.equal(rootIntegrity.complete.integrity, false);
  assert.deepEqual(rootIntegrity.after, rootIntegrity.before, '完整性阻断不得创建daily plan或覆盖损坏profile/practice/done');
  assert.match(rootIntegrity.complete.reason, /学习数据异常/);
  const blockedPanel = activeProfile;
  assert.match(await blockedPanel.textContent(), /学习数据需要检查/);
  assert.match(await blockedPanel.textContent(), /已暂停个性化训练/);
  assert.equal(await blockedPanel.locator('[data-profile-health]').getAttribute('href'), './data-health.html');
  assert.equal(await blockedPanel.locator('[data-profile-backup]').getAttribute('href'), './data-backup.html');
  const recoveryTouch = await blockedPanel.locator('[data-profile-health],[data-profile-backup]').evaluateAll(nodes => Math.min(...nodes.map(node => node.getBoundingClientRect().height)));
  assert.ok(recoveryTouch >= 44, `完整性恢复入口触控高度不得小于44px：${recoveryTouch}`);
  assert.doesNotMatch(await blockedPanel.textContent(), /NaN|Infinity/);

  const report = {
    passed: true,
    zeroState: {
      lesson: zeroState.dailyPlan.lesson,
      ability: zeroState.dailyPlan.ability,
      reason: zeroState.dailyPlan.reason,
      mappedLevels: zeroMappedLevels
    },
    abilityMapping: expectedAbilityLessons,
    unrelatedWrongPlan: data.dailyPlan,
    contextualWrongPlan: contextual.dailyPlan,
    targetedQuestionId: await page.locator('#xp-practice-panel').getAttribute('data-question-id'),
    weakest: data.weakest,
    mappedLevels,
    layout,
    profileTarget,
    errors
  };
  fs.writeFileSync(path.join(artifactDir, 'report.json'), JSON.stringify(report, null, 2));
  await page.screenshot({ path: path.join(artifactDir, 'daily-training-plan-390x844.png'), fullPage: true });
  console.log('固定12关真实课程语义、薄弱课优先、同课错题精准回流、其它课错题不劫持训练、80分目标和手机单列布局通过', report);
  await browser.close();
})().catch(async error => {
  const stack = error && error.stack ? error.stack : String(error);
  fs.writeFileSync(path.join(artifactDir, 'error.txt'), stack);
  if (page) {
    try {
      await page.screenshot({ path: path.join(artifactDir, 'daily-training-plan-failure-390x844.png'), fullPage: true });
    } catch (_) {}
  }
  if (browser) {
    try {
      await browser.close();
    } catch (_) {}
  }
  console.error(error);
  process.exit(1);
});