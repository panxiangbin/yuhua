const { chromium } = require('playwright');
const { spawn } = require('child_process');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

(async () => {
  const root = path.resolve(__dirname, '../..');
  const profileSource = fs.readFileSync(path.join(root, 'cnc/profile.html'), 'utf8');
  for (const token of [
    '...listValues(d.wrongQuestions)',
    '...listValues(d.wrongItems)',
    '...listValues(d.wrong)',
    "const SOURCE_PREFIXES=[['sc-','safety-coordinate'],['av-','advanced-verification'],['dsp-','drawing-setup-process'],['pfsd-','program-fill-sort-debug'],['apf-','alarm-parameter-first-piece']]",
    'const key=`${sid}:${id}`',
    "const SIM_IDS=['homing','workholding-check','tool-installation','tool-length-offset-check','work-offset-setting','program-dry-run','single-block-first-approach','graphics-segment-prediction','first-piece-inspection','alarm-troubleshooting','cutter-comp-risk','hole-cycle-troubleshooting','measurement-vs-machining-error']",
    'record(d.records)&&record(d.records[id])?d.records[id]:null',
    'record(d.simulators)&&record(d.simulators[id])?d.simulators[id]:null',
    'record(d[id])?d[id]:null',
    'best===100'
  ]) assert(profileSource.includes(token), `成长档案缺少错题/模拟兼容契约：${token}`);

  const server = spawn('python3', ['-m', 'http.server', '4173'], { cwd: root, stdio: 'ignore' });
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto('http://127.0.0.1:4173/cnc/profile.html');
    const baselineSnapshot = await page.evaluate(() => {
      localStorage.setItem('cnc_training_profile_v1', JSON.stringify({
        version: 1,
        xp: 420,
        abilities: { safety: 88, coordinate: 76, drawing: 82, programVerification: 91, measurementDiagnosis: 70, troubleshooting: 64 }
      }));
      localStorage.setItem('cnc_training_practice_v1', JSON.stringify({
        version: 1,
        history: [
          { practiceId: 'safety-coordinate', score: 100 },
          { practiceId: 'advanced-verification', score: 87 },
          { practiceId: 'drawing-setup-process', score: 67 }
        ],
        wrongQuestions: [
          { id: 'av-01', practiceId: 'advanced-verification', ability: '程序验证', risk: '高' },
          { id: 'dsp-02', source: 'practice-drawing-setup-process.html', ability: '图纸识读', risk: '中' },
          { id: 'apf-03', redoUrl: './practice-alarm-parameter-first-piece.html', ability: '故障排查', risk: '高' }
        ],
        wrongItems: [
          { id: 'av-01', source: 'advanced-verification', ability: '程序验证', risk: '高', explanation: '同题兼容字段镜像' },
          { id: 'pfsd-04', source: 'program-fill-sort-debug', ability: '程序验证', risk: '中' }
        ],
        wrong: {
          safetyMirror: { id: 'sc-05', ability: '安全基础', risk: '高' },
          drawingDuplicate: { id: 'dsp-02', practice: 'drawing-setup-process', ability: '图纸识读', risk: '中' }
        }
      }));
      localStorage.setItem('cnc_training_simulator_v1', JSON.stringify({
        version: 1,
        records: {
          'program-dry-run': { passed: false, bestScore: 100 },
          'first-piece-inspection': { passed: true, bestScore: 87 },
          'work-offset-setting': { passed: false, bestScore: 80 }
        },
        simulators: {
          homing: { passed: true, bestScore: 100 },
          'program-dry-run': { passed: false, bestScore: 75 },
          unknownLegacy: { passed: true, bestScore: 100 }
        },
        'alarm-troubleshooting': { passed: true, bestScore: 100 },
        unknownDirect: { passed: true, bestScore: 100 }
      }));
      return {
        profile: localStorage.getItem('cnc_training_profile_v1'),
        practice: localStorage.getItem('cnc_training_practice_v1'),
        simulator: localStorage.getItem('cnc_training_simulator_v1')
      };
    });
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#xp')?.textContent === '420');
    assert.equal(await page.locator('#practice-pass').textContent(), '2/5');
    assert.equal(await page.locator('#wrong-count').textContent(), '5', '五专项真实来源应全部汇总，同一题跨字段镜像不得重复计数');
    assert.equal(await page.locator('#sim-pass').textContent(), '4/13', '成长档案应合并新版 records、旧版 simulators 和受控直根记录，并按13项ID去重');
    assert.equal(await page.locator('#recommend-practice').getAttribute('href'), './practice-wrong-review.html');
    assert((await page.locator('#recommend-copy').textContent()).includes('还有5道跨专项错题'), '下一步推荐应使用去重后的真实跨专项错题数');
    assert.equal(await page.locator('#ability-grid .ability').count(), 6);
    const min = await page.locator('a:visible').evaluateAll(nodes => Math.min(...nodes.map(node => node.getBoundingClientRect().height)));
    assert(min >= 44, `touch target ${min}`);
    assert.equal(errors.length, 0, errors.join('\n'));
    const baselineAfter = await page.evaluate(() => ({
      profile: localStorage.getItem('cnc_training_profile_v1'),
      practice: localStorage.getItem('cnc_training_practice_v1'),
      simulator: localStorage.getItem('cnc_training_simulator_v1')
    }));
    assert.deepEqual(baselineAfter, baselineSnapshot, '正常跨专项错题/模拟记录汇总也必须保持 LocalStorage 只读');

    errors.length = 0;
    const corruptSnapshot = await page.evaluate(() => {
      localStorage.setItem('cnc_training_profile_v1', JSON.stringify({
        version: 1,
        xp: '坏数据',
        abilities: { safety: { score: '不是数字' }, coordinate: 76, troubleshooting: null }
      }));
      localStorage.setItem('cnc_training_practice_v1', JSON.stringify({
        version: 1,
        history: [null, '损坏记录', { practiceId: 'safety-coordinate', score: '坏分数' }, { practiceId: 'advanced-verification', score: 120 }],
        attempts: [false, 12],
        results: [{ setId: 'drawing-setup-process', score: -30 }],
        wrongQuestions: [null, '损坏错题', { id: 'sc-safe-1', practiceId: 'safety-coordinate', ability: '安全基础', risk: '高' }],
        wrongItems: [
          ['数组错题'],
          { id: 'sc-safe-1', source: 'safety-coordinate', ability: '安全基础', risk: '高' },
          { id: '', source: 'program-fill-sort-debug', ability: '程序验证' }
        ],
        wrong: {
          badArray: ['不能计数'],
          unknownSource: { id: 'unknown-1', ability: '待核验' }
        }
      }));
      localStorage.setItem('cnc_training_simulator_v1', JSON.stringify({
        version: 1,
        records: {
          homing: ['数组记录'],
          'program-dry-run': { passed: false, bestScore: 120 },
          'first-piece-inspection': { passed: false, bestScore: 'Infinity' },
          'work-offset-setting': { passed: 'true', bestScore: -20 }
        },
        simulators: {
          homing: { passed: true, bestScore: 100 },
          'program-dry-run': null,
          unknownLegacy: { passed: true, bestScore: 100 }
        },
        'alarm-troubleshooting': { passed: false, bestScore: '坏分数' },
        unknownDirect: { passed: true, bestScore: 100 }
      }));
      return {
        profile: localStorage.getItem('cnc_training_profile_v1'),
        practice: localStorage.getItem('cnc_training_practice_v1'),
        simulator: localStorage.getItem('cnc_training_simulator_v1')
      };
    });

    await page.reload();
    await page.waitForFunction(() => document.querySelector('#xp')?.textContent === '0');
    assert.equal(await page.locator('#practice-pass').textContent(), '1/5');
    assert.equal(await page.locator('#wrong-count').textContent(), '1', '损坏、未知来源和跨字段重复错题不得污染成长档案统计');
    assert.equal(await page.locator('#sim-pass').textContent(), '1/13', '越界成绩、字符串 passed、数组记录和未知模拟ID不得冒充通过');
    assert.equal(await page.locator('#recommend-practice').getAttribute('href'), './practice-wrong-review.html');
    assert.equal(await page.locator('#ability-grid .ability').count(), 6);
    const visibleText = await page.locator('body').innerText();
    assert(!visibleText.includes('NaN'), '成长档案不得显示 NaN');
    assert(!visibleText.includes('Infinity'), '成长档案不得显示 Infinity');
    assert.equal(errors.length, 0, errors.join('\n'));
    const afterSnapshot = await page.evaluate(() => ({
      profile: localStorage.getItem('cnc_training_profile_v1'),
      practice: localStorage.getItem('cnc_training_practice_v1'),
      simulator: localStorage.getItem('cnc_training_simulator_v1')
    }));
    assert.deepEqual(afterSnapshot, corruptSnapshot, '成长档案必须只读，异常数据不得被页面静默改写');

    fs.mkdirSync(path.join(root, 'cnc/test-results'), { recursive: true });
    await page.screenshot({ path: path.join(root, 'cnc/test-results/profile-practice-analytics-390x844.png'), fullPage: true });
    fs.writeFileSync(path.join(root, 'cnc/test-results/profile-practice-analytics.json'), JSON.stringify({
      baseline: { xp: 420, practicePass: '2/5', wrong: 5, sourceSets: 5, crossContainerDedup: true, simPass: '4/13', simulatorSchemas: ['records','simulators','direct'], knownIdDedup: true, simFullScoreBoundary: true, minTouch: min, readOnly: true },
      corruptData: { xp: 0, practicePass: '1/5', wrong: 1, malformedAndUnknownIgnored: true, crossContainerDedup: true, simPass: '1/13', simulatorMalformedIgnored: true, outOfRangeScoreRejected: true, unknownSimulatorIdsIgnored: true, readOnly: true, consoleErrors: errors }
    }, null, 2));
    console.log('profile cross-specialty wrong-source and simulator schema compatibility smoke passed');
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
