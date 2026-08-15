const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  await page.goto('http://127.0.0.1:4173/cnc/training-certificate.html', { waitUntil: 'domcontentloaded', timeout: 60000 });

  await page.evaluate(() => {
    const lessonScores = {};
    for (let level = 1; level <= 12; level += 1) lessonScores[level] = level === 8 ? 70 : 90;
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({ version: 1, lessonScores }));
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ version: 1, trainingDays: ['2026-07-20', '2026-07-21', '2026-07-22'], badges: ['迈出第一步', '成绩达标'] }));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1,2,3,4,5,6,7,9,10,11,12]));
    location.reload();
  });
  await page.waitForFunction(() => window.CNC_TRAINING_CERTIFICATE?.build === '20260724c');

  const unfinished = await page.evaluate(() => window.CNC_TRAINING_CERTIFICATE.snapshot());
  assert.equal(unfinished.integrity, true);
  assert.equal(unfinished.passed, 11);
  assert.equal(unfinished.average, 88);
  assert.equal(unfinished.days, 3);
  assert.equal(unfinished.badges, 2);
  assert.equal(unfinished.graduated, false);
  assert.equal(unfinished.abilities.length, 6);
  assert.equal(await page.locator('#certificate-status').textContent(), '训练进行中');
  assert.equal(await page.locator('#ability-list .ability').count(), 6);
  assert.equal(await page.locator('#score-list .score').count(), 12);
  assert.match(await page.locator('#score-list').textContent(), /第 8 关/);
  assert.match(await page.locator('#score-list').textContent(), /70/);

  const layout = await page.evaluate(() => {
    const list = document.querySelector('#score-list');
    const listBox = list.getBoundingClientRect();
    const boxes = [...list.querySelectorAll('.score')].map(node => node.getBoundingClientRect());
    return { listBox, boxes, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
  });
  assert.ok(layout.boxes.every(box => box.width >= layout.listBox.width - 2));
  assert.ok(layout.boxes.every((box, index) => index === 0 || box.top >= layout.boxes[index - 1].bottom));
  assert.equal(layout.overflow, false);
  assert.ok((await page.locator('.back').evaluate(node => node.getBoundingClientRect().height)) >= 44);
  assert.match(await page.locator('.notice').last().textContent(), /不是职业资格证书/);
  assert.match(await page.locator('.notice').last().textContent(), /原厂手册/);

  const canonicalBefore = await page.evaluate(() => {
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({ version: 1, lessonScores: {} }));
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ version: 1, completed: [1,2,3,4,5,6,7], completedStages: ['stage-8','stage-9'], trainingDays: ['2026-07-20'], badges: [] }));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1,2,'stage-3']));
    const before = {
      practice: localStorage.getItem('cnc_training_practice_v1'),
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1')
    };
    sessionStorage.setItem('certificate-canonical-before', JSON.stringify(before));
    location.reload();
    return before;
  });
  await page.waitForFunction(() => window.CNC_TRAINING_CERTIFICATE?.build === '20260724c');
  const canonical = await page.evaluate(() => ({
    snapshot: window.CNC_TRAINING_CERTIFICATE.snapshot(),
    before: JSON.parse(sessionStorage.getItem('certificate-canonical-before')),
    after: {
      practice: localStorage.getItem('cnc_training_practice_v1'),
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1')
    }
  }));
  assert.deepEqual(canonical.before, canonicalBefore);
  assert.deepEqual(canonical.after, canonical.before, 'canonical 优先场景必须保持学习记录只读');
  assert.equal(canonical.snapshot.integrity, true);
  assert.equal(canonical.snapshot.passed, 3, 'canonical 已存在时不得叠加旧 profile 完成记录');
  assert.equal(canonical.snapshot.average, 20);
  assert.equal(canonical.snapshot.days, 1);

  const legacyBefore = await page.evaluate(() => {
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({ version: 1, lessonScores: {} }));
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ version: 1, completed: [1,'stage-2','3',3], completedStages: ['stage-4','stage-4','5'], trainingDays: ['2026-07-20'], badges: [] }));
    localStorage.removeItem('cnc_study_completed_v1');
    const before = {
      practice: localStorage.getItem('cnc_training_practice_v1'),
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1')
    };
    sessionStorage.setItem('certificate-legacy-before', JSON.stringify(before));
    location.reload();
    return before;
  });
  await page.waitForFunction(() => window.CNC_TRAINING_CERTIFICATE?.build === '20260724c');
  const legacy = await page.evaluate(() => ({
    snapshot: window.CNC_TRAINING_CERTIFICATE.snapshot(),
    before: JSON.parse(sessionStorage.getItem('certificate-legacy-before')),
    after: {
      practice: localStorage.getItem('cnc_training_practice_v1'),
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1')
    }
  }));
  assert.deepEqual(legacy.before, legacyBefore);
  assert.deepEqual(legacy.after, legacy.before, 'legacy 回退不得创建或迁移 canonical 记录');
  assert.equal(legacy.snapshot.integrity, true);
  assert.equal(legacy.snapshot.passed, 4, 'canonical 缺失时仅接受整数与严格 stage-N 的旧档案完成记录并去重');
  assert.equal(legacy.snapshot.average, 27);
  assert.equal(legacy.snapshot.days, 1);

  const corruptStorage = await page.evaluate(() => {
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({ lessonScores: { 1: '100', 2: 120, 3: -1, 4: 100, 5: 'Infinity' } }));
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ trainingDays: ['2026-07-20', '2026-07-20', '2026-02-30', 'bad', null], badges: ['迈出第一步', '迈出第一步', ' ', null, '成绩达标'] }));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([6, '7', 'stage-8', 99, null, []]));
    const before = {
      practice: localStorage.getItem('cnc_training_practice_v1'),
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1')
    };
    sessionStorage.setItem('certificate-corrupt-before', JSON.stringify(before));
    location.reload();
    return before;
  });
  await page.waitForFunction(() => window.CNC_TRAINING_CERTIFICATE?.build === '20260724c');
  const corrupt = await page.evaluate(() => ({
    snapshot: window.CNC_TRAINING_CERTIFICATE.snapshot(),
    before: JSON.parse(sessionStorage.getItem('certificate-corrupt-before')),
    after: {
      practice: localStorage.getItem('cnc_training_practice_v1'),
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1')
    },
    text: document.body.innerText
  }));
  assert.deepEqual(corrupt.before, corruptStorage);
  assert.deepEqual(corrupt.after, corrupt.before, '损坏字段值必须只读降级');
  assert.equal(corrupt.snapshot.integrity, true);
  assert.equal(corrupt.snapshot.passed, 3);
  assert.equal(corrupt.snapshot.average, 22);
  assert.equal(corrupt.snapshot.days, 1);
  assert.equal(corrupt.snapshot.badges, 2);
  assert.equal(corrupt.snapshot.graduated, false);
  assert.doesNotMatch(corrupt.text, /NaN|Infinity/);

  const corruptCanonicalBefore = await page.evaluate(() => {
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({ version: 1, lessonScores: {} }));
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ version: 1, completed: [1,2,3,4,5,6,7,8,9,10,11,12], completedStages: ['stage-12'], trainingDays: [], badges: [] }));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify({ bad: true }));
    const before = {
      practice: localStorage.getItem('cnc_training_practice_v1'),
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1')
    };
    sessionStorage.setItem('certificate-corrupt-canonical-before', JSON.stringify(before));
    location.reload();
    return before;
  });
  await page.waitForFunction(() => window.CNC_TRAINING_CERTIFICATE?.build === '20260724c');
  const corruptCanonical = await page.evaluate(() => ({
    snapshot: window.CNC_TRAINING_CERTIFICATE.snapshot(),
    before: JSON.parse(sessionStorage.getItem('certificate-corrupt-canonical-before')),
    after: {
      practice: localStorage.getItem('cnc_training_practice_v1'),
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1')
    },
    metrics: ['passed','average','days','badges'].map(id => document.getElementById(id).textContent)
  }));
  assert.deepEqual(corruptCanonical.before, corruptCanonicalBefore);
  assert.deepEqual(corruptCanonical.after, corruptCanonical.before, '损坏 canonical 不得回退旧 profile 或改写原记录');
  assert.equal(corruptCanonical.snapshot.integrity, false);
  assert.ok(corruptCanonical.snapshot.invalid.includes('cnc_study_completed_v1'));
  assert.deepEqual(corruptCanonical.metrics, ['—','—','—','—']);

  const malformedRootBefore = await page.evaluate(() => {
    localStorage.setItem('cnc_training_practice_v1', '{');
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify([]));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify({ bad: true }));
    const before = {
      practice: localStorage.getItem('cnc_training_practice_v1'),
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1')
    };
    sessionStorage.setItem('certificate-malformed-root-before', JSON.stringify(before));
    location.reload();
    return before;
  });
  await page.waitForFunction(() => window.CNC_TRAINING_CERTIFICATE?.build === '20260724c');
  const malformedRoots = await page.evaluate(() => ({
    snapshot: window.CNC_TRAINING_CERTIFICATE.snapshot(),
    before: JSON.parse(sessionStorage.getItem('certificate-malformed-root-before')),
    after: {
      practice: localStorage.getItem('cnc_training_practice_v1'),
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1')
    },
    status: document.querySelector('#certificate-status').textContent,
    metrics: ['passed','average','days','badges'].map(id => document.getElementById(id).textContent),
    integrityHidden: document.querySelector('#data-integrity').hidden,
    integrityText: document.querySelector('#data-integrity').innerText,
    recoveryLinks: [...document.querySelectorAll('#data-integrity a')].map(a => a.getAttribute('href')),
    abilityCount: document.querySelectorAll('#ability-list .ability').length,
    scoreCount: document.querySelectorAll('#score-list .score').length,
    shareDisabled: document.querySelector('#share-certificate').disabled,
    printDisabled: document.querySelector('#print-certificate').disabled,
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
    minRecoveryTouch: Math.min(...[...document.querySelectorAll('#data-integrity a')].map(a => a.getBoundingClientRect().height)),
    text: document.body.innerText
  }));
  assert.deepEqual(malformedRoots.before, malformedRootBefore);
  assert.deepEqual(malformedRoots.after, malformedRootBefore, '损坏根结构不得被阶段证书自动改写');
  assert.equal(malformedRoots.snapshot.integrity, false);
  assert.deepEqual(new Set(malformedRoots.snapshot.invalid), new Set(['cnc_training_practice_v1','cnc_training_profile_v1','cnc_study_completed_v1']));
  assert.equal(malformedRoots.snapshot.passed, null);
  assert.equal(malformedRoots.snapshot.average, null);
  assert.equal(malformedRoots.snapshot.days, null);
  assert.equal(malformedRoots.snapshot.badges, null);
  assert.equal(malformedRoots.snapshot.graduated, false);
  assert.deepEqual(malformedRoots.snapshot.abilities, []);
  assert.equal(malformedRoots.status, '学习数据异常');
  assert.deepEqual(malformedRoots.metrics, ['—','—','—','—']);
  assert.equal(malformedRoots.integrityHidden, false);
  assert.match(malformedRoots.integrityText, /未把异常记录当成零进度/);
  assert.match(malformedRoots.integrityText, /检查或恢复/);
  assert.deepEqual(malformedRoots.recoveryLinks, ['./data-health.html','./data-backup.html']);
  assert.equal(malformedRoots.abilityCount, 0);
  assert.equal(malformedRoots.scoreCount, 0);
  assert.equal(malformedRoots.shareDisabled, true);
  assert.equal(malformedRoots.printDisabled, true);
  assert.equal(malformedRoots.overflow, false);
  assert.ok(malformedRoots.minRecoveryTouch >= 44);
  assert.doesNotMatch(malformedRoots.text, /NaN|Infinity/);

  await page.evaluate(() => {
    const lessonScores = {};
    for (let level = 1; level <= 12; level += 1) lessonScores[level] = 90;
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({ version: 1, lessonScores }));
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ version: 1, trainingDays: ['2026-07-20', '2026-07-21', '2026-07-22'], badges: ['迈出第一步', '成绩达标'] }));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1,2,3,4,5,6,7,8,9,10,11,12]));
    location.reload();
  });
  await page.waitForFunction(() => window.CNC_TRAINING_CERTIFICATE?.build === '20260724c');

  const graduated = await page.evaluate(() => window.CNC_TRAINING_CERTIFICATE.snapshot());
  assert.equal(graduated.integrity, true);
  assert.equal(graduated.passed, 12);
  assert.equal(graduated.average, 90);
  assert.equal(graduated.days, 3);
  assert.equal(graduated.badges, 2);
  assert.equal(graduated.graduated, true);
  assert.equal(await page.locator('#certificate-status').textContent(), '基础训练营已达标');
  assert.match(await page.locator('.notice').last().textContent(), /不是职业资格证书/);
  assert.match(await page.locator('.notice').last().textContent(), /原厂手册/);
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(consoleErrors, []);

  console.log('阶段训练证书 canonical 优先、旧档案回退、严格数值、日期、徽章、损坏根结构阻断、只读降级与达标场景通过', { unfinished, canonical: canonical.snapshot, legacy: legacy.snapshot, corrupt: corrupt.snapshot, corruptCanonical: corruptCanonical.snapshot, malformedRoots: malformedRoots.snapshot, graduated });
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
