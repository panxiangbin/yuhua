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
  strictNestedGuardDetected: false,
  explicitAlertVisible: false,
  summaryBlocked: false,
  recommendationBlocked: false,
  quickIntentsBlocked: [],
  allQuickIntentsBlocked: false,
  publicApiBlocked: false,
  healthLink: false,
  backupLink: false,
  corruptDataPreserved: false,
  nestedWrongFiltered: false,
  nestedSimulatorFiltered: false,
  nestedScoreStrict: false,
  nestedIntegrityRemainsUsable: false,
  nestedDataPreserved: false,
  nestedNoNonFiniteText: false,
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
  report.strictNestedGuardDetected = source.includes("function isRecord(value){return Boolean(value&&typeof value==='object'&&!Array.isArray(value))}")
    && source.includes("const SIMULATOR_IDS=['homing','workholding-check','tool-installation'")
    && source.includes('const records=isRecord(simulator.records)?simulator.records:{};const legacy=isRecord(simulator.simulators)?simulator.simulators:{};')
    && source.includes('const passed=unique.some(row=>row.passed===true)||bestScore===100')
    && source.includes("return typeof raw==='number'&&Number.isFinite(raw)&&raw>=0&&raw<=100?raw:null")
    && source.includes('simulations.filter(simulationPassed).length');
  logs.push(`静态静默回退命中：${report.staticSilentFallbackDetected}`);
  logs.push(`嵌套数据严格归一化门禁：${report.strictNestedGuardDetected}`);

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

    assert.equal(storageState.unrelated, '保留', '不得修改无关 LocalStorage');
    assert.equal(report.corruptDataPreserved, true, '不得为了阻断个性化建议而覆盖或清理损坏原始档案');
    assert.equal(report.staticSilentFallbackDetected, false, 'AI老师仍将解析失败静默替换为空对象');
    assert.equal(report.strictNestedGuardDetected, true, 'AI老师缺少嵌套记录/成绩或新旧模拟schema的严格归一化保护');
    assert.equal(report.explicitAlertVisible, true, '损坏档案时必须显示可见、可访问的数据异常提示');
    assert.equal(report.summaryBlocked, true, '损坏档案时不得继续显示 0/12 等伪装成真实进度的汇总');
    assert.equal(report.publicApiBlocked, true, '损坏档案时公开 initialSummary/getSummary 接口不得继续暴露可信零进度');
    assert.equal(report.allQuickIntentsBlocked, true, '损坏档案时六个快捷问题都必须保持在数据异常阻断页，不能回落到基于不可信记录的建议');
    assert.equal(report.recommendationBlocked, true, '损坏档案时自由提问也必须暂停基于不可信数据的个性化推荐');
    assert.equal(report.healthLink, true, '异常处置必须提供数据健康检查入口');
    assert.equal(report.backupLink, true, '异常处置必须提供备份恢复入口');

    const nestedPracticeRaw = JSON.stringify({
      version: 1,
      wrongQuestions: [
        { id: 'valid-wrong-1', ability: '安全' },
        ['array-should-ignore'],
        null,
        'string-should-ignore',
        { id: 'valid-wrong-2', ability: '坐标' }
      ],
      lessonScores: { 1: '999', 2: 120, 3: 79 }
    });
    const nestedSimulatorRaw = JSON.stringify({
      version: 2,
      records: {
        homing: { passed: true, score: 10 },
        'workholding-check': { passed: false, bestScore: 100 },
        'tool-installation': { passed: false, bestScore: 90 },
        'program-dry-run': { passed: false, bestScore: '100' },
        'single-block-first-approach': { passed: false, score: 'Infinity' },
        'graphics-segment-prediction': { passed: false, score: 120 },
        'first-piece-inspection': { passed: false, score: -5 },
        'alarm-troubleshooting': { passed: 'true', score: 0 },
        unknownSimulator: { passed: true, score: 100 },
        arrayRecord: [{ passed: true, score: 100 }],
        nullRecord: null
      },
      simulators: {
        'work-offset-setting': { passed: true, bestScore: 20 },
        'workholding-check': { passed: false, bestScore: 100 }
      }
    });
    await page.evaluate(({ practiceRaw, simulatorRaw }) => {
      localStorage.clear();
      localStorage.setItem('cnc_study_completed_v1', '[]');
      localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ version: 1 }));
      localStorage.setItem('cnc_training_practice_v1', practiceRaw);
      localStorage.setItem('cnc_training_simulator_v1', simulatorRaw);
      localStorage.setItem('cnc_training_exam_v1', JSON.stringify({ version: 1 }));
      localStorage.setItem('unrelated_keep_me', '保留');
    }, { practiceRaw: nestedPracticeRaw, simulatorRaw: nestedSimulatorRaw });
    await page.reload({ waitUntil: 'networkidle' });

    const nested = await page.evaluate(() => ({
      summary: window.CNC_AI_TEACHER?.getSummary?.() || null,
      practiceRaw: localStorage.getItem('cnc_training_practice_v1'),
      simulatorRaw: localStorage.getItem('cnc_training_simulator_v1'),
      unrelated: localStorage.getItem('unrelated_keep_me'),
      bodyText: document.body.innerText,
      alertHidden: document.getElementById('data-integrity-alert')?.hidden === true
    }));
    const visibleNested = {
      wrong: await page.locator('#wrong-count').textContent(),
      simulations: await page.locator('#sim-progress').textContent(),
      weakest: await page.locator('#weakest').textContent()
    };
    report.nestedSummary = nested.summary;
    report.nestedVisible = visibleNested;
    report.nestedWrongFiltered = nested.summary?.wrong === 2 && visibleNested.wrong === '2';
    report.nestedSimulatorFiltered = nested.summary?.simulations === 3 && visibleNested.simulations === '3/13';
    report.nestedScoreStrict = nested.summary?.weakest === '机床与坐标' && nested.summary?.weakestScore === 26 && visibleNested.weakest === '机床与坐标';
    report.nestedIntegrityRemainsUsable = nested.alertHidden === true;
    report.nestedDataPreserved = nested.practiceRaw === nestedPracticeRaw
      && nested.simulatorRaw === nestedSimulatorRaw
      && nested.unrelated === '保留';
    report.nestedNoNonFiniteText = !/NaN|Infinity/.test(nested.bodyText || '');

    logs.push(`嵌套异常错题安全过滤：${report.nestedWrongFiltered}（${visibleNested.wrong}）`);
    logs.push(`固定13项ID、新旧模拟schema合并与满分通过过滤：${report.nestedSimulatorFiltered}（${visibleNested.simulations}）`);
    logs.push(`非法/越界/字符串成绩不参与能力判断：${report.nestedScoreStrict}（${nested.summary?.weakest}/${nested.summary?.weakestScore}）`);
    logs.push(`根结构正常时嵌套坏记录只读降级、不误触发全局阻断：${report.nestedIntegrityRemainsUsable}`);
    logs.push(`嵌套异常原始数据保持不变：${report.nestedDataPreserved}`);
    logs.push(`页面无 NaN/Infinity 污染：${report.nestedNoNonFiniteText}`);

    assert.equal(report.nestedWrongFiltered, true, '数组/null/字符串错题不得污染AI老师错题数量');
    assert.equal(report.nestedSimulatorFiltered, true, '固定13项模拟ID必须合并新版records与旧simulators，90分、未知ID、字符串passed、字符串/越界/负数成绩或数组记录不得冒充模拟通过');
    assert.equal(report.nestedScoreStrict, true, '字符串或超出0-100范围的课程成绩不得污染AI老师能力画像');
    assert.equal(report.nestedIntegrityRemainsUsable, true, '根结构合法时应忽略嵌套坏记录，而不是把整个学习档案误判为损坏');
    assert.equal(report.nestedDataPreserved, true, '嵌套坏数据降级不得自动清理、迁移或改写原始LocalStorage');
    assert.equal(report.nestedNoNonFiniteText, true, '页面不得出现NaN或Infinity污染');
    assert.equal(consoleErrors.length, 0, consoleErrors.join('\n'));

    const minTouch = await page.locator('a:visible,button:visible').evaluateAll(nodes => Math.min(...nodes.map(node => Math.max(node.getBoundingClientRect().height, node.getBoundingClientRect().width))));
    assert(minTouch >= 44, `最小触控目标仅 ${minTouch}px`);
    report.minTouch = minTouch;
    report.passed = true;
    logs.push('AI老师根损坏阻断 + 新版模拟records + 嵌套异常只读降级验收通过');
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
