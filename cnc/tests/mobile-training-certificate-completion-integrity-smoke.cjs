const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  await page.goto('http://127.0.0.1:4176/cnc/training-certificate.html', { waitUntil: 'domcontentloaded', timeout: 60000 });

  const invalidBefore = await page.evaluate(() => {
    const lessonScores = {};
    for (let level = 1; level <= 12; level += 1) lessonScores[level] = 90;
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({ version: 1, lessonScores }));
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ version: 1, trainingDays: ['2026-08-15'], badges: ['迈出第一步'] }));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1, 2, 'stage-3', '4', 13, -1, null, []]));
    const before = {
      practice: localStorage.getItem('cnc_training_practice_v1'),
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1')
    };
    sessionStorage.setItem('certificate-completion-integrity-before', JSON.stringify(before));
    location.reload();
    return before;
  });

  await page.waitForFunction(() => window.CNC_TRAINING_CERTIFICATE?.build === '20260724c');

  const invalidState = await page.evaluate(() => ({
    snapshot: window.CNC_TRAINING_CERTIFICATE.snapshot(),
    before: JSON.parse(sessionStorage.getItem('certificate-completion-integrity-before')),
    after: {
      practice: localStorage.getItem('cnc_training_practice_v1'),
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1')
    },
    status: document.getElementById('certificate-status').textContent,
    metrics: ['passed', 'average', 'days', 'badges'].map(id => document.getElementById(id).textContent),
    noticeHidden: document.getElementById('data-integrity').hidden,
    noticeText: document.getElementById('data-integrity').innerText,
    shareDisabled: document.getElementById('share-certificate').disabled,
    printDisabled: document.getElementById('print-certificate').disabled,
    recoveryLinks: [...document.querySelectorAll('#data-integrity a')].map(a => a.getAttribute('href')),
    minRecoveryTouch: Math.min(...[...document.querySelectorAll('#data-integrity a')].map(a => a.getBoundingClientRect().height)),
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
    bodyText: document.body.innerText
  }));

  assert.deepEqual(invalidState.before, invalidBefore);
  assert.deepEqual(invalidState.after, invalidState.before, '非法课程完成项场景必须保持 localStorage 逐字节只读');
  assert.equal(invalidState.snapshot.integrity, true, '根结构本身仍可解析');
  assert.equal(invalidState.snapshot.completionIntegrity, false, 'canonical 内非法完成项必须降低课程完成记录可信度');
  assert.equal(invalidState.snapshot.certificateReady, false, '课程完成记录不可信时不得签发阶段证书');
  assert.ok(invalidState.snapshot.invalid.includes('cnc_study_completed_v1:entry'));
  assert.equal(invalidState.snapshot.graduated, false, '即使12关成绩均达标也不得在非法 canonical 下毕业');
  assert.equal(invalidState.status, '课程完成记录异常');
  assert.deepEqual(invalidState.metrics, ['12/12', '90', '1', '1']);
  assert.equal(invalidState.noticeHidden, false);
  assert.match(invalidState.noticeText, /课程完成记录含无法确认的条目/);
  assert.match(invalidState.noticeText, /暂停证书分享和打印/);
  assert.equal(invalidState.shareDisabled, true);
  assert.equal(invalidState.printDisabled, true);
  assert.deepEqual(invalidState.recoveryLinks, ['./data-health.html', './data-backup.html']);
  assert.ok(invalidState.minRecoveryTouch >= 44);
  assert.equal(invalidState.overflow, false);
  assert.doesNotMatch(invalidState.bodyText, /NaN|Infinity/);

  await page.evaluate(() => {
    const lessonScores = {};
    for (let level = 1; level <= 12; level += 1) lessonScores[level] = 90;
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({ version: 1, lessonScores }));
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ version: 1, trainingDays: ['2026-08-15'], badges: ['迈出第一步'] }));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1,2,3,4,5,6,7,8,9,10,11,12]));
    location.reload();
  });

  await page.waitForFunction(() => window.CNC_TRAINING_CERTIFICATE?.build === '20260724c');
  const trustedState = await page.evaluate(() => ({
    snapshot: window.CNC_TRAINING_CERTIFICATE.snapshot(),
    status: document.getElementById('certificate-status').textContent,
    noticeHidden: document.getElementById('data-integrity').hidden,
    shareDisabled: document.getElementById('share-certificate').disabled,
    printDisabled: document.getElementById('print-certificate').disabled
  }));
  assert.equal(trustedState.snapshot.integrity, true);
  assert.equal(trustedState.snapshot.completionIntegrity, true);
  assert.equal(trustedState.snapshot.certificateReady, true);
  assert.equal(trustedState.snapshot.graduated, true);
  assert.deepEqual(trustedState.snapshot.invalid, []);
  assert.equal(trustedState.status, '基础训练营已达标');
  assert.equal(trustedState.noticeHidden, true);
  assert.equal(trustedState.shareDisabled, false);
  assert.equal(trustedState.printDisabled, false);

  assert.deepEqual(pageErrors, []);
  assert.deepEqual(consoleErrors, []);
  console.log('阶段证书非法 canonical 完成项签发阻断与正常签发回归通过', { invalid: invalidState.snapshot, trusted: trustedState.snapshot });
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
