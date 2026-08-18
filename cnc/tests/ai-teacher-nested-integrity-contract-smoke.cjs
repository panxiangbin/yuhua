const { chromium } = require('playwright');
const { spawn } = require('child_process');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const resultDir = path.join(root, 'cnc/test-results');
const reportPath = path.join(resultDir, 'ai-teacher-nested-integrity-contract.json');
const logPath = path.join(resultDir, 'ai-teacher-nested-integrity-contract.log');
const errorPath = path.join(resultDir, 'ai-teacher-nested-integrity-contract-error.txt');
const screenshotPath = path.join(resultDir, 'ai-teacher-nested-integrity-contract-390x844.png');
fs.mkdirSync(resultDir, { recursive: true });

const report = {
  viewport: { width: 390, height: 844 },
  testedHead: process.env.GITHUB_SHA || '',
  integrityBlocked: false,
  alertVisible: false,
  summaryBlocked: false,
  publicApiBlocked: false,
  quickBlocked: false,
  freeAskBlocked: false,
  healthLink: false,
  backupLink: false,
  storageReadOnly: false,
  noNonFiniteText: false,
  consoleErrors: [],
  pageErrors: [],
  passed: false
};
const logs = [];
function writeDiagnostics(error) {
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(logPath, `${logs.join('\n')}\n`);
  if (error) fs.writeFileSync(errorPath, `${error.stack || error}\n`);
}

(async () => {
  const server = spawn('python3', ['-m', 'http.server', '4173'], { cwd: root, stdio: 'ignore' });
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: report.viewport });
    page.on('console', msg => { if (msg.type() === 'error') report.consoleErrors.push(msg.text()); });
    page.on('pageerror', err => report.pageErrors.push(String(err)));

    await page.goto('http://127.0.0.1:4173/cnc/ai-teacher.html', { waitUntil: 'networkidle' });
    const practiceRaw = JSON.stringify({
      version: 1,
      wrongQuestions: [{ id: 'sc-valid-wrong-1', practiceId: 'safety-coordinate', ability: '安全' }],
      lessonScores: { 1: '999', 2: 120, 3: 79 }
    });
    const profileRaw = JSON.stringify({ version: 1, xp: 120, trainingDays: ['2026-08-17'] });
    const studyRaw = JSON.stringify([1, 2]);
    const simulatorRaw = JSON.stringify({ version: 2, records: {} });
    const examRaw = JSON.stringify({ version: 1 });

    await page.evaluate(({ practiceRaw, profileRaw, studyRaw, simulatorRaw, examRaw }) => {
      localStorage.clear();
      localStorage.setItem('cnc_study_completed_v1', studyRaw);
      localStorage.setItem('cnc_training_profile_v1', profileRaw);
      localStorage.setItem('cnc_training_practice_v1', practiceRaw);
      localStorage.setItem('cnc_training_simulator_v1', simulatorRaw);
      localStorage.setItem('cnc_training_exam_v1', examRaw);
      localStorage.setItem('unrelated_keep_me', '保留');
    }, { practiceRaw, profileRaw, studyRaw, simulatorRaw, examRaw });
    await page.reload({ waitUntil: 'networkidle' });

    report.alertVisible = await page.locator('#data-integrity-alert').isVisible();
    const summary = await page.locator('#course-progress').textContent();
    report.summaryBlocked = /数据异常|--|不可用/.test(summary || '');
    const publicSummary = await page.evaluate(() => window.CNC_AI_TEACHER?.getSummary?.() || null);
    report.publicApiBlocked = publicSummary?.integrity === 'blocked'
      && publicSummary?.courses === null
      && publicSummary?.wrong === null
      && publicSummary?.simulations === null
      && publicSummary?.weakest === null;
    report.integrityBlocked = report.alertVisible && report.summaryBlocked && report.publicApiBlocked;

    await page.locator('#quick-questions [data-intent="next"]').click();
    await page.waitForTimeout(80);
    const quickStatus = await page.locator('#answer-status').textContent();
    report.quickBlocked = /数据异常|档案异常|暂停个性化/.test(quickStatus || '');

    await page.locator('#question').fill('我下一步应该学什么？');
    await page.locator('#ask-form button[type="submit"]').click();
    await page.waitForTimeout(80);
    const askStatus = await page.locator('#answer-status').textContent();
    const routes = await page.locator('#answer-routes a').evaluateAll(nodes => nodes.map(node => ({ href: node.getAttribute('href'), text: node.textContent })));
    report.freeAskBlocked = /数据异常|档案异常|暂停个性化/.test(askStatus || '');
    report.healthLink = routes.some(item => item.href === './data-health.html');
    report.backupLink = routes.some(item => item.href === './data-backup.html');

    const storage = await page.evaluate(() => ({
      study: localStorage.getItem('cnc_study_completed_v1'),
      profile: localStorage.getItem('cnc_training_profile_v1'),
      practice: localStorage.getItem('cnc_training_practice_v1'),
      simulator: localStorage.getItem('cnc_training_simulator_v1'),
      exam: localStorage.getItem('cnc_training_exam_v1'),
      unrelated: localStorage.getItem('unrelated_keep_me'),
      text: document.body.innerText
    }));
    report.storageReadOnly = storage.study === studyRaw
      && storage.profile === profileRaw
      && storage.practice === practiceRaw
      && storage.simulator === simulatorRaw
      && storage.exam === examRaw
      && storage.unrelated === '保留';
    report.noNonFiniteText = !/NaN|Infinity/.test(storage.text || '');

    await page.screenshot({ path: screenshotPath, fullPage: true });
    logs.push(`嵌套损坏档案全局阻断：${report.integrityBlocked}`);
    logs.push(`快捷问题阻断：${report.quickBlocked}`);
    logs.push(`自由提问阻断：${report.freeAskBlocked}`);
    logs.push(`数据健康入口：${report.healthLink}`);
    logs.push(`备份恢复入口：${report.backupLink}`);
    logs.push(`LocalStorage只读：${report.storageReadOnly}`);

    assert.equal(report.integrityBlocked, true, 'practice.lessonScores 数值字符串/越界成绩属于共享档案高风险嵌套损坏，AI老师必须暂停可信进度和个性化建议');
    assert.equal(report.quickBlocked, true, '嵌套学习数据损坏时快捷问题必须阻断个性化建议');
    assert.equal(report.freeAskBlocked, true, '嵌套学习数据损坏时自由提问必须阻断个性化建议');
    assert.equal(report.healthLink, true, '嵌套数据异常必须提供数据健康检查入口');
    assert.equal(report.backupLink, true, '嵌套数据异常必须提供备份恢复入口');
    assert.equal(report.storageReadOnly, true, '完整性阻断不得自动清洗、迁移或覆盖原始学习数据');
    assert.equal(report.noNonFiniteText, true, '页面不得出现 NaN/Infinity 污染');
    assert.equal(report.consoleErrors.length, 0, report.consoleErrors.join('\n'));
    assert.equal(report.pageErrors.length, 0, report.pageErrors.join('\n'));

    report.passed = true;
    writeDiagnostics();
    console.log('AI老师嵌套档案完整性 fail-first 浏览器契约通过');
  } catch (error) {
    writeDiagnostics(error);
    throw error;
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
