const { chromium } = require('playwright');
const fs = require('fs');
const assert = require('assert');

const BASE = process.env.CNC_BASE_URL || 'http://127.0.0.1:4173';
const ARTIFACT_DIR = 'artifacts/training-camp-hub';
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

async function openPage(browser, storage = {}) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const consoleErrors = [], pageErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.addInitScript(seed => {
    localStorage.clear();
    for (const [key, value] of Object.entries(seed)) localStorage.setItem(key, JSON.stringify(value));
  }, storage);
  await page.goto(`${BASE}/cnc/training-camp.html`, { waitUntil: 'networkidle' });
  const before = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])));
  return { page, consoleErrors, pageErrors, before };
}

async function assertReadOnly(caseData) {
  const after = await caseData.page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])));
  assert.deepStrictEqual(after, caseData.before, '训练营不得清理、迁移或静默改写localStorage');
}
async function assertMobile(caseData) {
  const { page, consoleErrors, pageErrors } = caseData;
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `390px页面横向溢出：${overflow}`);
  const text = await page.locator('body').innerText();
  assert.ok(!/NaN|Infinity/.test(text), '页面不得出现NaN/Infinity');
  const targets = await page.locator('a:visible').evaluateAll(nodes => nodes.map(node => { const r=node.getBoundingClientRect(); return {text:node.textContent.trim().replace(/\s+/g,' '),height:r.height,width:r.width}; }));
  const invalid = targets.filter(item => item.width > 0 && item.height > 0 && item.height < 44);
  assert.deepStrictEqual(invalid, [], `触控区不足44px: ${JSON.stringify(invalid)}`);
  assert.deepStrictEqual(consoleErrors, [], `控制台错误: ${consoleErrors.join(' | ')}`);
  assert.deepStrictEqual(pageErrors, [], `页面错误: ${pageErrors.join(' | ')}`);
  await assertReadOnly(caseData);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = { viewport: '390x844', cases: {} };
  try {
    const empty = await openPage(browser);
    assert.strictEqual(await empty.page.locator('#passed-count').textContent(), '0');
    assert.strictEqual(await empty.page.locator('#wrong-count').textContent(), '0');
    assert.strictEqual(await empty.page.locator('#simulator-status').textContent(), '已通过 0/13 项');
    assert.match(await empty.page.locator('#next-title').textContent(), /第1关.*安全基础/);
    await assertMobile(empty); report.cases.empty = true;
    await empty.page.close();

    const malformed = await openPage(browser, {
      cnc_training_profile_v1: { completedStages: ['stage-1','unknown',null,['stage-6']], courseScores: {'stage-2':90,'stage-3':'999','stage-4':120,'stage-5':-1,'stage-6':'Infinity',unknown:100} },
      cnc_training_practice_v1: { wrongQuestions: [{id:'q1'},null,'bad',[],{id:'q2'}] },
      cnc_training_simulator_v1: { records: { homing:{passed:true},'workholding-check':{bestScore:90},'tool-installation':{bestScore:'999'},'tool-length-offset-check':{bestScore:120},'work-offset-setting':{bestScore:-1},'program-dry-run':{passed:'true'},unknown:{passed:true} }, simulators: {'workholding-check':{bestScore:100}} }
    });
    assert.strictEqual(await malformed.page.locator('#passed-count').textContent(), '2', '只有合法完成记录与合法90分应计为通过');
    assert.strictEqual(await malformed.page.locator('#avg-score').textContent(), '85');
    assert.strictEqual(await malformed.page.locator('#wrong-count').textContent(), '2', '损坏错题不得计数');
    assert.strictEqual(await malformed.page.locator('#simulator-status').textContent(), '已通过 2/13 项', '损坏模拟成绩/字符串passed/未知ID不得计通过');
    assert.match(await malformed.page.locator('#next-title').textContent(), /第3关/);
    await assertMobile(malformed); report.cases.malformedReadOnly = true;
    await malformed.page.screenshot({ path: `${ARTIFACT_DIR}/malformed-data.png`, fullPage: true });
    await malformed.page.close();

    const completeProfile = { completedStages: Array.from({length:12},(_,i)=>`stage-${i+1}`), courseScores: Object.fromEntries(Array.from({length:12},(_,i)=>[`stage-${i+1}`,80+(i%3)*10])) };
    const complete = await openPage(browser, {
      cnc_training_profile_v1: completeProfile,
      cnc_training_practice_v1: { wrongQuestions: [null,'bad',[]] },
      cnc_training_simulator_v1: { records: { homing:{passed:true},'workholding-check':{bestScore:90},'tool-installation':{bestScore:'999'},'tool-length-offset-check':{bestScore:120} } }
    });
    assert.strictEqual(await complete.page.locator('#passed-count').textContent(), '12');
    assert.strictEqual(await complete.page.locator('#wrong-count').textContent(), '0');
    assert.strictEqual(await complete.page.locator('#simulator-status').textContent(), '已通过 2/13 项');
    assert.match(await complete.page.locator('#route-title').textContent(), /继续模拟训练（2\/13）/);
    assert.match(await complete.page.locator('#route-cta').getAttribute('href'), /simulator-hub\.html/);
    await assertMobile(complete); report.cases.completeRoute = true;
    await complete.page.close();

    const arrayRoots = await openPage(browser, { cnc_training_profile_v1: [], cnc_training_practice_v1: [], cnc_training_simulator_v1: [] });
    assert.strictEqual(await arrayRoots.page.locator('#passed-count').textContent(), '0');
    assert.strictEqual(await arrayRoots.page.locator('#wrong-count').textContent(), '0');
    assert.strictEqual(await arrayRoots.page.locator('#simulator-status').textContent(), '已通过 0/13 项');
    await assertMobile(arrayRoots); report.cases.arrayRoots = true;
    await arrayRoots.page.close();

    report.passed = true;
    fs.writeFileSync(`${ARTIFACT_DIR}/report.json`, JSON.stringify(report, null, 2));
    console.log('CNC training camp hub data integrity smoke passed');
  } catch (error) {
    report.passed = false; report.error = String(error.stack || error);
    fs.writeFileSync(`${ARTIFACT_DIR}/report.json`, JSON.stringify(report, null, 2));
    fs.writeFileSync(`${ARTIFACT_DIR}/error.txt`, `${error.stack || error}\n`);
    throw error;
  } finally { await browser.close(); }
})();
