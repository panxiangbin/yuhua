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

  const riskyBefore = await page.evaluate(() => {
    const lessonScores = {};
    for (let level = 1; level <= 12; level += 1) lessonScores[level] = 90;
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({ version: 1, lessonScores }));
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({
      version: 1,
      trainingDays: ['2026-07-20', '2026-07-20', '2026-07-21'],
      badges: ['迈出第一步', ' 迈出第一步 ', '成绩达标']
    }));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1,2,3,4,5,6,7,8,9,10,11,12]));
    const before = {
      practice: localStorage.getItem('cnc_training_practice_v1'),
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1')
    };
    sessionStorage.setItem('certificate-reward-risk-before', JSON.stringify(before));
    location.reload();
    return before;
  });

  await page.waitForFunction(() => window.CNC_TRAINING_CERTIFICATE?.build === '20260724c');
  const risky = await page.evaluate(() => ({
    snapshot: window.CNC_TRAINING_CERTIFICATE.snapshot(),
    before: JSON.parse(sessionStorage.getItem('certificate-reward-risk-before')),
    after: {
      practice: localStorage.getItem('cnc_training_practice_v1'),
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1')
    },
    status: document.querySelector('#certificate-status').textContent,
    integrityHidden: document.querySelector('#data-integrity').hidden,
    integrityText: document.querySelector('#data-integrity').innerText,
    recoveryLinks: [...document.querySelectorAll('#data-integrity a')].map(a => ({ href: a.getAttribute('href'), height: a.getBoundingClientRect().height })),
    shareDisabled: document.querySelector('#share-certificate').disabled,
    printDisabled: document.querySelector('#print-certificate').disabled,
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
    text: document.body.innerText
  }));

  assert.deepEqual(risky.before, riskyBefore);
  assert.deepEqual(risky.after, risky.before, '重复奖励证据不得被阶段证书自动清洗或改写');
  assert.equal(risky.snapshot.integrity, true);
  assert.equal(risky.snapshot.completionIntegrity, true);
  assert.equal(risky.snapshot.trainingIntegrity, true);
  assert.equal(risky.snapshot.rewardIntegrity, false);
  assert.equal(risky.snapshot.certificateReady, false);
  assert.ok(risky.snapshot.invalid.includes('cnc_training_profile_v1:trainingDays:duplicate'));
  assert.ok(risky.snapshot.invalid.includes('cnc_training_profile_v1:badges:duplicate'));
  assert.equal(risky.snapshot.passed, 12);
  assert.equal(risky.snapshot.average, 90);
  assert.equal(risky.snapshot.days, 2);
  assert.equal(risky.snapshot.badges, 2);
  assert.equal(risky.snapshot.graduated, false);
  assert.equal(risky.status, '奖励记录异常');
  assert.equal(risky.integrityHidden, false);
  assert.match(risky.integrityText, /奖励记录存在重复证据/);
  assert.deepEqual(risky.recoveryLinks.map(x => x.href), ['./data-health.html', './data-backup.html']);
  assert.ok(risky.recoveryLinks.every(x => x.height >= 44));
  assert.equal(risky.shareDisabled, true);
  assert.equal(risky.printDisabled, true);
  assert.equal(risky.overflow, false);
  assert.doesNotMatch(risky.text, /NaN|Infinity/);

  const healthyBefore = await page.evaluate(() => {
    const profile = { version: 1, trainingDays: ['2026-07-20', '2026-07-21'], badges: ['迈出第一步', '成绩达标'] };
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify(profile));
    const before = {
      practice: localStorage.getItem('cnc_training_practice_v1'),
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1')
    };
    sessionStorage.setItem('certificate-reward-healthy-before', JSON.stringify(before));
    location.reload();
    return before;
  });

  await page.waitForFunction(() => window.CNC_TRAINING_CERTIFICATE?.build === '20260724c');
  const healthy = await page.evaluate(() => ({
    snapshot: window.CNC_TRAINING_CERTIFICATE.snapshot(),
    before: JSON.parse(sessionStorage.getItem('certificate-reward-healthy-before')),
    after: {
      practice: localStorage.getItem('cnc_training_practice_v1'),
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1')
    },
    status: document.querySelector('#certificate-status').textContent,
    shareDisabled: document.querySelector('#share-certificate').disabled,
    printDisabled: document.querySelector('#print-certificate').disabled,
    overflow: document.documentElement.scrollWidth > innerWidth + 1
  }));

  assert.deepEqual(healthy.before, healthyBefore);
  assert.deepEqual(healthy.after, healthy.before, '健康奖励证据场景也必须保持学习记录只读');
  assert.equal(healthy.snapshot.integrity, true);
  assert.equal(healthy.snapshot.completionIntegrity, true);
  assert.equal(healthy.snapshot.trainingIntegrity, true);
  assert.equal(healthy.snapshot.rewardIntegrity, true);
  assert.equal(healthy.snapshot.certificateReady, true);
  assert.equal(healthy.snapshot.passed, 12);
  assert.equal(healthy.snapshot.average, 90);
  assert.equal(healthy.snapshot.days, 2);
  assert.equal(healthy.snapshot.badges, 2);
  assert.equal(healthy.snapshot.graduated, true);
  assert.equal(healthy.status, '基础训练营已达标');
  assert.equal(healthy.shareDisabled, false);
  assert.equal(healthy.printDisabled, false);
  assert.equal(healthy.overflow, false);

  assert.deepEqual(pageErrors, []);
  assert.deepEqual(consoleErrors, []);
  console.log('阶段证书重复训练日、空白变体徽章奖励证据阻断与健康恢复场景通过', { risky: risky.snapshot, healthy: healthy.snapshot });
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
