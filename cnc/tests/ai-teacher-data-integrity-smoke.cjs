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
  wrongCompatUnified: false,
  wrongCompatReadOnly: false,
  wrongCompatCounts: null,
  strictCompletionIdGuardDetected: false,
  strictCompletionSourcePrecedenceDetected: false,
  completionIdStrict: false,
  completionCanonicalPreferred: false,
  completionLegacyFallbackStrict: false,
  completionIdReadOnly: false,
  completionSummary: null,
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
  report.strictWrongCompatibilityDetected = source.includes('...listValues(practice.wrongItems)')
    && source.includes('const key=`${source}:${id}`')
    && source.includes("const WRONG_SOURCE_PREFIXES=[['sc-','safety-coordinate']");
  report.strictCompletionIdGuardDetected = source.includes("if(typeof value==='number'&&Number.isInteger(value)&&value>=1&&value<=12)return value")
    && source.includes("value.match(/^stage-(\\d{1,2})$/i)")
    && !source.includes("String(value??'').match(/(?:stage-)?");
  report.strictCompletionSourcePrecedenceDetected = source.includes("if(localStorage.getItem(KEYS.study)!==null)return completed");
  logs.push(`静态静默回退命中：${report.staticSilentFallbackDetected}`);
  logs.push(`嵌套数据严格归一化门禁：${report.strictNestedGuardDetected}`);
  logs.push(`三类错题兼容字段去重门禁：${report.strictWrongCompatibilityDetected}`);
  logs.push(`课程完成ID严格类型门禁：${report.strictCompletionIdGuardDetected}`);
  logs.push(`课程完成canonical优先级门禁：${report.strictCompletionSourcePrecedenceDetected}`);

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
    assert.equal(report.strictWrongCompatibilityDetected, true, 'AI老师必须同时读取wrongQuestions/wrongItems/wrong并按来源专项+题目ID去重');
    assert.equal(report.strictCompletionIdGuardDetected, true, 'AI老师课程完成ID必须只接受真实1-12整数或stage-N兼容格式，不能接受纯数字字符串');
    assert.equal(report.strictCompletionSourcePrecedenceDetected, true, 'canonical课程完成记录存在时不得继续叠加旧profile完成字段');
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
        { id: 'sc-valid-wrong-1', practiceId: 'safety-coordinate', ability: '安全' },
        ['array-should-ignore'],
        null,
        'string-should-ignore',
        { id: 'av-valid-wrong-2', practiceId: 'advanced-verification', ability: '坐标' }
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

    const wrongCompatRaw = JSON.stringify({
      version: 1,
      wrongQuestions: [
        { id: 'sc-dup', practiceId: 'safety-coordinate', ability: '安全', title: '重复错题A' },
        { id: 'av-only', practiceId: 'advanced-verification', ability: '程序验证', title: '仅wrongQuestions' }
      ],
      wrongItems: {
        duplicate: { id: 'sc-dup', practiceId: 'safety-coordinate', ability: '安全', title: '重复错题A旧结构' },
        unique: { id: 'dsp-only', practiceId: 'drawing-setup-process', ability: '图纸', title: '仅wrongItems' }
      },
      wrong: [
        { id: 'sc-dup', practiceId: 'safety-coordinate', ability: '安全', title: '重复错题A更旧结构' },
        { id: 'pfsd-only', practiceId: 'program-fill-sort-debug', ability: '程序验证', title: '仅wrong' }
      ]
    });
    await page.evaluate(practiceRaw => {
      localStorage.clear();
      localStorage.setItem('cnc_study_completed_v1', '[]');
      localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ version: 1 }));
      localStorage.setItem('cnc_training_practice_v1', practiceRaw);
      localStorage.setItem('cnc_training_simulator_v1', JSON.stringify({ version: 1, records: {} }));
      localStorage.setItem('cnc_training_exam_v1', JSON.stringify({ version: 1 }));
      localStorage.setItem('unrelated_keep_me', '保留');
    }, wrongCompatRaw);
    await page.reload({ waitUntil: 'networkidle' });
    const aiWrong = await page.locator('#wrong-count').textContent();
    const aiSummary = await page.evaluate(() => window.CNC_AI_TEACHER?.getSummary?.() || null);
    await page.goto('http://127.0.0.1:4173/cnc/practice-wrong-review.html', { waitUntil: 'networkidle' });
    const reviewWrong = await page.locator('#wrong-total').textContent();
    await page.goto('http://127.0.0.1:4173/cnc/profile.html', { waitUntil: 'networkidle' });
    const profileWrong = await page.locator('#wrong-count').textContent();
    const compatAfter = await page.evaluate(() => ({
      practiceRaw: localStorage.getItem('cnc_training_practice_v1'),
      unrelated: localStorage.getItem('unrelated_keep_me')
    }));
    report.wrongCompatCounts = { aiTeacher: aiWrong, wrongReview: reviewWrong, profile: profileWrong };
    report.wrongCompatUnified = aiSummary?.wrong === 4 && aiWrong === '4' && reviewWrong === '4' && profileWrong === '4';
    report.wrongCompatReadOnly = compatAfter.practiceRaw === wrongCompatRaw && compatAfter.unrelated === '保留';
    logs.push(`AI老师/错题复习/成长档案三字段去重一致：${report.wrongCompatUnified}（${JSON.stringify(report.wrongCompatCounts)}）`);
    logs.push(`三字段去重跨页面读取保持LocalStorage只读：${report.wrongCompatReadOnly}`);
    assert.equal(report.wrongCompatUnified, true, 'AI老师必须与跨专项错题页、成长档案统一三类错题兼容字段并按来源专项+题目ID去重');
    assert.equal(report.wrongCompatReadOnly, true, '三类错题跨页面汇总不得自动清理、迁移或改写原始LocalStorage');
    await page.goto('http://127.0.0.1:4173/cnc/ai-teacher.html', { waitUntil: 'networkidle' });

    const completionStudyRaw = JSON.stringify([1, '2', 'stage-3', 4, 99, null, [], {}]);
    const completionProfileRaw = JSON.stringify({
      version: 1,
      completed: ['5', 'stage-6', 7],
      completedStages: ['8', 'stage-9', 10]
    });
    await page.evaluate(({ studyRaw, profileRaw }) => {
      localStorage.clear();
      localStorage.setItem('cnc_study_completed_v1', studyRaw);
      localStorage.setItem('cnc_training_profile_v1', profileRaw);
      localStorage.setItem('cnc_training_practice_v1', JSON.stringify({ version: 1, wrongQuestions: [], lessonScores: {} }));
      localStorage.setItem('cnc_training_simulator_v1', JSON.stringify({ version: 1, records: {} }));
      localStorage.setItem('cnc_training_exam_v1', JSON.stringify({ version: 1 }));
      localStorage.setItem('unrelated_keep_me', '保留');
    }, { studyRaw: completionStudyRaw, profileRaw: completionProfileRaw });
    await page.reload({ waitUntil: 'networkidle' });
    const canonicalCompletion = await page.evaluate(() => ({
      summary: window.CNC_AI_TEACHER?.getSummary?.() || null,
      studyRaw: localStorage.getItem('cnc_study_completed_v1'),
      profileRaw: localStorage.getItem('cnc_training_profile_v1'),
      unrelated: localStorage.getItem('unrelated_keep_me'),
      alertHidden: document.getElementById('data-integrity-alert')?.hidden === true
    }));
    const canonicalVisible = await page.locator('#course-progress').textContent();
    report.completionCanonicalPreferred = canonicalCompletion.summary?.courses === 3
      && canonicalVisible === '3/12'
      && canonicalCompletion.alertHidden === true;
    const canonicalReadOnly = canonicalCompletion.studyRaw === completionStudyRaw
      && canonicalCompletion.profileRaw === completionProfileRaw
      && canonicalCompletion.unrelated === '保留';

    await page.evaluate(profileRaw => {
      localStorage.removeItem('cnc_study_completed_v1');
      localStorage.setItem('cnc_training_profile_v1', profileRaw);
    }, completionProfileRaw);
    await page.reload({ waitUntil: 'networkidle' });
    const legacyCompletion = await page.evaluate(() => ({
      summary: window.CNC_AI_TEACHER?.getSummary?.() || null,
      studyRaw: localStorage.getItem('cnc_study_completed_v1'),
      profileRaw: localStorage.getItem('cnc_training_profile_v1'),
      unrelated: localStorage.getItem('unrelated_keep_me'),
      alertHidden: document.getElementById('data-integrity-alert')?.hidden === true
    }));
    const legacyVisible = await page.locator('#course-progress').textContent();
    report.completionLegacyFallbackStrict = legacyCompletion.summary?.courses === 4
      && legacyVisible === '4/12'
      && legacyCompletion.alertHidden === true;
    const legacyReadOnly = legacyCompletion.studyRaw === null
      && legacyCompletion.profileRaw === completionProfileRaw
      && legacyCompletion.unrelated === '保留';
    report.completionIdStrict = report.completionCanonicalPreferred && report.completionLegacyFallbackStrict;
    report.completionIdReadOnly = canonicalReadOnly && legacyReadOnly;
    report.completionSummary = {
      canonical: { summary: canonicalCompletion.summary, visible: canonicalVisible },
      legacyFallback: { summary: legacyCompletion.summary, visible: legacyVisible }
    };
    logs.push(`canonical完成记录优先且纯数字字符串无效：${report.completionCanonicalPreferred}（${canonicalVisible}）`);
    logs.push(`缺少canonical时stage-N旧档案严格回退：${report.completionLegacyFallbackStrict}（${legacyVisible}）`);
    logs.push(`课程完成来源与ID归一化保持LocalStorage只读：${report.completionIdReadOnly}`);
    assert.equal(report.completionCanonicalPreferred, true, 'canonical课程完成记录存在时必须优先使用，不能再叠加旧profile完成字段；纯数字字符串不得冒充完成');
    assert.equal(report.completionLegacyFallbackStrict, true, 'canonical完成记录缺失时才允许回退旧profile字段，且只接受真实数字1-12或stage-N格式');
    assert.equal(report.completionIdReadOnly, true, '课程完成来源优先级与ID严格归一化不得自动修改study/profile原始LocalStorage');

    const minTouch = await page.locator('a:visible,button:visible').evaluateAll(nodes => Math.min(...nodes.map(node => Math.max(node.getBoundingClientRect().height, node.getBoundingClientRect().width))));
    assert(minTouch >= 44, `最小触控目标仅 ${minTouch}px`);
    report.minTouch = minTouch;
    report.passed = true;
    logs.push('AI老师根损坏阻断 + 新版模拟records + 嵌套异常只读降级 + 三类错题跨页面去重 + canonical课程完成优先级与严格ID验收通过');
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
