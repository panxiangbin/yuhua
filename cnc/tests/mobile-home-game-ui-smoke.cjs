const { chromium } = require('playwright');
const fs = require('fs');
const assert = require('assert');

const BASE = process.env.CNC_BASE_URL || 'http://127.0.0.1:4173';
const OUT = 'artifacts/mobile-home-game';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2
    });
    await context.addInitScript(() => {
      localStorage.setItem('cnc_training_profile_v1', JSON.stringify({
        version: 1,
        xp: 120,
        completedStages: ['stage-1', 'stage-2', 'stage-3'],
        courseScores: { 'stage-1': 90, 'stage-2': 88, 'stage-3': 92 }
      }));
      localStorage.setItem('cnc_training_practice_v1', JSON.stringify({ wrongQuestions: ['q1', 'q2', 'q3'] }));
      localStorage.setItem('cnc_training_simulator_v1', JSON.stringify({
        simulators: {
          a: { passed: true }, b: { bestScore: 85 }, c: { passed: true }, d: { score: 90 }
        }
      }));
    });
    const page = await context.newPage();
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', error => errors.push(error.message));

    await page.goto(`${BASE}/cnc/index.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('#xp-game-home[data-ready="true"]').waitFor({ state: 'visible', timeout: 60000 });

    assert.match(await page.locator('.xp-game-hero h1').textContent(), /从零基础.*闯.*独立编程/s);
    assert.match(await page.locator('.xp-game-level-copy > strong').textContent(), /学徒 Lv\.2/);
    assert.match(await page.locator('.xp-game-level-copy p').textContent(), /初级操作工.*140 XP/);
    assert.match(await page.locator('.xp-game-stage.current strong').textContent(), /第4关：图纸、尺寸与基准/);
    assert.match(await page.locator('.xp-game-challenge-btn').getAttribute('href'), /course-drawing-basics\.html/);
    assert.match(await page.locator('.xp-game-secondary').getAttribute('href'), /beginner-placement\.html/);
    assert.match(await page.locator('.xp-game-shortcuts a').nth(2).textContent(), /3 道错题/);
    assert.match(await page.locator('.xp-game-shortcuts a').nth(3).textContent(), /4 \/ 13/);
    assert.strictEqual(await page.locator('.xp-game-bottom-nav a').count(), 5);
    assert.strictEqual(await page.locator('.launchpad-grid').evaluate(node => getComputedStyle(node).display), 'none');

    const smallTargets = await page.locator('#xp-game-home a:visible,#xp-game-home button:visible').evaluateAll(nodes => nodes.map(node => {
      const rect = node.getBoundingClientRect();
      return { text: node.textContent.trim(), width: rect.width, height: rect.height };
    }).filter(item => item.width > 0 && item.height > 0 && item.height < 44));
    assert.deepStrictEqual(smallTargets, []);
    assert.strictEqual(errors.length, 0, errors.join(' | '));
    await page.screenshot({ path: `${OUT}/mobile-home-game-390x844.png`, fullPage: true });

    const desktop = await context.newPage();
    await desktop.setViewportSize({ width: 1280, height: 900 });
    await desktop.goto(`${BASE}/cnc/index.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await desktop.locator('#xp-game-home[data-ready="true"]').waitFor({ state: 'attached', timeout: 60000 });
    assert.strictEqual(await desktop.locator('#xp-game-home').evaluate(node => getComputedStyle(node).display), 'none');
    assert.notStrictEqual(await desktop.locator('.launchpad-grid').evaluate(node => getComputedStyle(node).display), 'none');

    console.log('CNC mobile game home UI smoke passed');
  } finally {
    await browser.close();
  }
})().catch(error => {
  fs.writeFileSync(`${OUT}/error.txt`, `${error.stack || error}\n`);
  process.exit(1);
});
