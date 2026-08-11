const { chromium } = require('playwright');
const { spawn } = require('child_process');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

(async () => {
  const root = path.resolve(__dirname, '../..');
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
    await page.evaluate(() => {
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
          { id: 'a1', practiceId: 'advanced-verification', ability: '程序验证', risk: '高' },
          { id: 'a2', practiceId: 'drawing-setup-process', ability: '图纸识读', risk: '中' },
          { id: 'a3', practiceId: 'alarm-parameter-first-piece', ability: '故障排查', risk: '高' }
        ]
      }));
      localStorage.setItem('cnc_training_simulator_v1', JSON.stringify({
        version: 1,
        simulators: { homing: { passed: true, bestScore: 100 }, workholding: { passed: true, bestScore: 100 }, alarm: { passed: false, bestScore: 75 } }
      }));
    });
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#xp')?.textContent === '420');
    assert.equal(await page.locator('#practice-pass').textContent(), '2/5');
    assert.equal(await page.locator('#wrong-count').textContent(), '3');
    assert.equal(await page.locator('#sim-pass').textContent(), '2/13');
    assert.equal(await page.locator('#recommend-practice').getAttribute('href'), './practice-wrong-review.html');
    assert.equal(await page.locator('#ability-grid .ability').count(), 6);
    const min = await page.locator('a:visible').evaluateAll(nodes => Math.min(...nodes.map(node => node.getBoundingClientRect().height)));
    assert(min >= 44, `touch target ${min}`);
    assert.equal(errors.length, 0, errors.join('\n'));

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
        wrongQuestions: [null, '损坏错题', { id: 'safe-1', ability: '安全基础', risk: '高' }]
      }));
      localStorage.setItem('cnc_training_simulator_v1', JSON.stringify({
        version: 1,
        simulators: { broken: null, alarm: { passed: false, bestScore: '坏分数' }, homing: { passed: true, bestScore: 100 } }
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
    assert.equal(await page.locator('#wrong-count').textContent(), '1');
    assert.equal(await page.locator('#sim-pass').textContent(), '1/13');
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
      baseline: { xp: 420, practicePass: '2/5', wrong: 3, simPass: '2/13', minTouch: min },
      corruptData: { xp: 0, practicePass: '1/5', wrong: 1, simPass: '1/13', readOnly: true, consoleErrors: errors }
    }, null, 2));
    console.log('profile analytics and corrupt-data degradation smoke passed');
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
