const { chromium } = require('playwright');
const fs = require('fs');
const assert = require('assert');

const BASE = process.env.CNC_BASE_URL || 'http://127.0.0.1:4173';
const ARTIFACT_DIR = 'artifacts/training-route-clarity';
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const completedStages = Array.from({ length: 12 }, (_, index) => `stage-${index + 1}`);
const courseScores = Object.fromEntries(completedStages.map(id => [id, 90]));
const simulatorIds = [
  'homing','workholding-check','tool-installation','tool-length-offset-check','work-offset-setting',
  'program-dry-run','single-block-first-approach','graphics-segment-prediction','first-piece-inspection',
  'alarm-troubleshooting','cutter-comp-risk','hole-cycle-troubleshooting','measurement-vs-machining-error'
];

async function openPage(browser, seed, name) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(data => {
    localStorage.clear();
    Object.entries(data).forEach(([key, value]) => localStorage.setItem(key, JSON.stringify(value)));
  }, seed);
  await page.goto(`${BASE}/cnc/training-camp.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('#route-cta').waitFor({ state: 'visible' });
  await page.screenshot({ path: `${ARTIFACT_DIR}/${name}.png`, fullPage: true });
  return { page, errors };
}

async function assertTouchTargets(page) {
  const invalid = await page.locator('a:visible').evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect();
    return { text: node.textContent.trim().replace(/\s+/g, ' '), width: rect.width, height: rect.height };
  }).filter(item => item.width > 0 && item.height > 0 && item.height < 44));
  assert.deepStrictEqual(invalid, [], `触控区不足44px: ${JSON.stringify(invalid)}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const empty = await openPage(browser, {}, 'empty-course-recommendation');
    assert.strictEqual(await empty.page.locator('.route-card').count(), 4, '必须展示四条清晰训练入口');
    assert.strictEqual(await empty.page.locator('.route-card.recommended').getAttribute('id'), 'route-course');
    assert.match(await empty.page.locator('#route-title').textContent(), /第1关/);
    assert.match(await empty.page.locator('#route-cta').getAttribute('href'), /course-safety-foundation\.html/);
    assert.strictEqual(empty.errors.length, 0, `空档案控制台错误: ${empty.errors.join(' | ')}`);
    await assertTouchTargets(empty.page);
    await empty.page.close();

    const wrong = await openPage(browser, {
      cnc_training_profile_v1: { version: 1, completedStages, courseScores },
      cnc_training_practice_v1: {
        version: 1,
        wrongQuestions: [
          { id: 'sc-route-1', ability: '安全基础' },
          { id: 'av-route-2', ability: '坐标基础' },
          { id: 'pfsd-route-3', ability: '程序基础' }
        ]
      }
    }, 'wrong-review-recommendation');
    assert.strictEqual(await wrong.page.locator('.route-card.recommended').getAttribute('id'), 'route-practice');
    assert.match(await wrong.page.locator('#route-title').textContent(), /3道错题/);
    assert.match(await wrong.page.locator('#route-cta').getAttribute('href'), /practice-wrong-review\.html/);
    assert.strictEqual(wrong.errors.length, 0, `错题场景控制台错误: ${wrong.errors.join(' | ')}`);
    await wrong.page.close();

    const partialSimulators = Object.fromEntries(simulatorIds.slice(0, 4).map(id => [id, { passed: true, bestScore: 100 }]));
    const simulator = await openPage(browser, {
      cnc_training_profile_v1: { version: 1, completedStages, courseScores },
      cnc_training_practice_v1: { version: 1, wrongQuestions: [] },
      cnc_training_simulator_v1: { version: 1, simulators: partialSimulators }
    }, 'simulator-recommendation');
    assert.strictEqual(await simulator.page.locator('.route-card.recommended').getAttribute('id'), 'route-simulator');
    assert.match(await simulator.page.locator('#route-title').textContent(), /4\/13/);
    assert.strictEqual(await simulator.page.locator('#simulator-status').textContent(), '已通过 4/13 项');
    assert.match(await simulator.page.locator('#route-cta').getAttribute('href'), /simulator-hub\.html/);
    assert.strictEqual(simulator.errors.length, 0, `模拟场景控制台错误: ${simulator.errors.join(' | ')}`);
    await simulator.page.close();

    const completeSimulators = Object.fromEntries(simulatorIds.map(id => [id, { passed: true, bestScore: 100 }]));
    const complete = await openPage(browser, {
      cnc_training_profile_v1: { version: 1, completedStages, courseScores },
      cnc_training_practice_v1: { version: 1, wrongQuestions: [] },
      cnc_training_simulator_v1: { version: 1, simulators: completeSimulators }
    }, 'profile-recommendation');
    assert.strictEqual(await complete.page.locator('.route-card.recommended').getAttribute('id'), 'route-profile');
    assert.match(await complete.page.locator('#route-title').textContent(), /成长档案/);
    assert.match(await complete.page.locator('#route-cta').getAttribute('href'), /profile\.html/);
    assert.strictEqual(complete.errors.length, 0, `全完成场景控制台错误: ${complete.errors.join(' | ')}`);
    await complete.page.close();

    console.log('CNC training route clarity smoke passed');
  } catch (error) {
    fs.writeFileSync(`${ARTIFACT_DIR}/error.txt`, `${error.stack || error}\n`);
    throw error;
  } finally {
    await browser.close();
  }
})();
