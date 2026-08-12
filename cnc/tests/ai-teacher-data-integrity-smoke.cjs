const { chromium } = require('playwright');
const { spawn } = require('child_process');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const resultDir = path.join(root, 'cnc/test-results');
const reportPath = path.join(resultDir, 'ai-teacher-data-integrity.json');
const logPath = path.join(resultDir, 'ai-teacher-data-integrity.log');
const errorPath = path.join(resultDir, 'ai-teacher-data-integrity-error.txt');
const screenshotPath = path.join(resultDir, 'ai-teacher-data-integrity-390x844.png');
fs.mkdirSync(resultDir, { recursive: true });

const report = {
  viewport: { width: 390, height: 844 },
  corruptKey: 'cnc_training_profile_v1',
  staticSilentFallbackDetected: false,
  explicitAlertVisible: false,
  summaryBlocked: false,
  recommendationBlocked: false,
  quickIntentsBlocked: [],
  allQuickIntentsBlocked: false,
  publicApiBlocked: false,
  healthLink: false,
  backupLink: false,
  corruptDataPreserved: false,
  passed: false
};
const logs = [];
function writeDiagnostics(error) {
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(logPath, `${logs.join('\n')}\n`);
  if (error) fs.writeFileSync(errorPath, `${error.stack || error}\n`);
}

(async () => {
  const source = fs.readFileSync(path.join(root, 'cnc/ai-teacher.html'), 'utf8');
  report.staticSilentFallbackDetected = /function read\(key\)[\s\S]{0,240}catch\s*\{\s*return \{\}\s*\}/.test(source);
  logs.push(`静态静默回退命中：${report.staticSilentFallbackDetected}`);

  const server = spawn('python3', ['-m', 'http.server', '4173'], { cwd: root, stdio: 'ignore' });
  let browser;
  let page;
  try {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({ viewport: report.viewport });
    const consoleErrors = [];
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    await page.goto('http://127.0.0.1:4173/cnc/ai-teacher.html', { waitUntil: 'networkidle' });
    const corruptRaw = '{"version":1,"completed":';
    await page.evaluate(raw => {
      localStorage.clear();
      localStorage.setItem('cnc_training_profile_v1', raw);
      localStorage.setItem('cnc_training_practice_v1', JSON.stringify({ version: 1, wrongQuestions: [] }));
      localStorage.setItem('cnc_training_simulator_v1', JSON.stringify({ version: 1, simulators: {} }));
      localStorage.setItem('cnc_training_exam_v1', JSON.stringify({ version: 1 }));
      localStorage.setItem('unrelated_keep_me', '保留');
    }, corruptRaw);
    await page.reload({ waitUntil: 'networkidle' });

    const alert = page.locator('#data-integrity-alert,[data-integrity-status="blocked"]');
    report.explicitAlertVisible = await alert.count() > 0 && await alert.first().isVisible();
    const summary = await page.locator('#course-progress').textContent();
    report.summaryBlocked = /数据异常|不可用|--/.test(summary || '');

    const publicApi = await page.evaluate(() => ({
      initialSummary: window.CNC_AI_TEACHER?.initialSummary || null,
      currentSummary: typeof window.CNC_AI_TEACHER?.getSummary === 'function'
        ? window.CNC_AI_TEACHER.getSummary()
        : null
    }));
    report.publicApi = publicApi;
    report.publicApiBlocked = publicApi.initialSummary?.integrity === 'blocked'
      && publicApi.currentSummary?.integrity === 'blocked'
      && publicApi.initialSummary?.courses === null
      && publicApi.initialSummary?.wrong === null
      && publicApi.initialSummary?.simulations === null
      && publicApi.initialSummary?.weakest === null
      && publicApi.currentSummary?.courses === null
      && publicApi.currentSummary?.wrong === null
      && publicApi.currentSummary?.simulations === null
      && publicApi.currentSummary?.weakest === null;

    const quickIntents = await page.locator('#quick-questions [data-intent]').evaluateAll(nodes => nodes.map(node => node.dataset.intent));
    for (const intent of quickIntents) {
      await page.locator(`#quick-questions [data-intent="${intent}"]`).click();
      await page.waitForTimeout(60);
      const status = await page.locator('#answer-status').textContent();
      const title = await page.locator('#answer-title').textContent();
      const routes = await page.locator('#answer-routes a').evaluateAll(nodes => nodes.map(node => ({ text: node.textContent, href: node.getAttribute('href') })));
      const blocked = /数据异常|档案异常|暂停个性化/.test(status || '')
        && /检查学习数据|个性化训练/.test(title || '')
        && routes.some(item => item.href === './data-health.html')
        && routes.some(item => item.href === './data-backup.html');
      report.quickIntentsBlocked.push({ intent, blocked, status, title });
    }
    report.allQuickIntentsBlocked = quickIntents.length === 6 && report.quickIntentsBlocked.every(item => item.blocked);

    await page.locator('#question').fill('报警后第一步做什么？');
    await page.locator('#ask-form button[type="submit"]').click();
    await page.waitForTimeout(60);
    const answerStatus = await page.locator('#answer-status').textContent();
    const routes = await page.locator('#answer-routes a').evaluateAll(nodes => nodes.map(node => ({ text: node.textContent, href: node.getAttribute('href') })));
    report.recommendationBlocked = /数据异常|档案异常|暂停个性化/.test(answerStatus || '');
    report.healthLink = routes.some(item => item.href === './data-health.html');
    report.backupLink = routes.some(item => item.href === './data-backup.html');
    const storageState = await page.evaluate(() => ({
      corrupt: localStorage.getItem('cnc_training_profile_v1'),
      unrelated: localStorage.getItem('unrelated_keep_me')
    }));
    report.corruptDataPreserved = storageState.corrupt === corruptRaw;

    logs.push(`显式异常提示：${report.explicitAlertVisible}`);
    logs.push(`汇总停止显示可信进度：${report.summaryBlocked}（${summary}）`);
    logs.push(`公开摘要接口停止伪报零进度：${report.publicApiBlocked}`);
    logs.push(`全部快捷入口阻断：${report.allQuickIntentsBlocked}（${report.quickIntentsBlocked.map(item => `${item.intent}:${item.blocked}`).join('，')}）`);
    logs.push(`自由提问个性化推荐已阻断：${report.recommendationBlocked}（${answerStatus}）`);
    logs.push(`数据健康入口：${report.healthLink}`);
    logs.push(`备份恢复入口：${report.backupLink}`);
    logs.push(`损坏原始数据保持不变：${report.corruptDataPreserved}`);

    assert.equal(consoleErrors.length, 0, consoleErrors.join('\n'));
    assert.equal(storageState.unrelated, '保留', '不得修改无关 LocalStorage');
    assert.equal(report.corruptDataPreserved, true, '不得为了阻断个性化建议而覆盖或清理损坏原始档案');
    assert.equal(report.staticSilentFallbackDetected, false, 'AI老师仍将解析失败静默替换为空对象');
    assert.equal(report.explicitAlertVisible, true, '损坏档案时必须显示可见、可访问的数据异常提示');
    assert.equal(report.summaryBlocked, true, '损坏档案时不得继续显示 0/12 等伪装成真实进度的汇总');
    assert.equal(report.publicApiBlocked, true, '损坏档案时公开 initialSummary/getSummary 接口不得继续暴露可信零进度');
    assert.equal(report.allQuickIntentsBlocked, true, '损坏档案时六个快捷问题都必须保持在数据异常阻断页，不能回落到基于不可信记录的建议');
    assert.equal(report.recommendationBlocked, true, '损坏档案时自由提问也必须暂停基于不可信数据的个性化推荐');
    assert.equal(report.healthLink, true, '异常处置必须提供数据健康检查入口');
    assert.equal(report.backupLink, true, '异常处置必须提供备份恢复入口');

    const minTouch = await page.locator('a:visible,button:visible').evaluateAll(nodes => Math.min(...nodes.map(node => Math.max(node.getBoundingClientRect().height, node.getBoundingClientRect().width))));
    assert(minTouch >= 44, `最小触控目标仅 ${minTouch}px`);
    report.minTouch = minTouch;
    report.passed = true;
    logs.push('AI老师损坏档案全入口保护验收通过');
    writeDiagnostics();
  } catch (error) {
    logs.push(`验收失败：${error.message}`);
    writeDiagnostics(error);
    throw error;
  } finally {
    if (page) {
      try { await page.screenshot({ path: screenshotPath, fullPage: true }); } catch {}
    }
    if (browser) await browser.close();
    server.kill('SIGTERM');
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
