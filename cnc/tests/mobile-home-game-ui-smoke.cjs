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
    await page.waitForFunction(() => (
      window.CNC_GAME_QUERY_NAV?.build === '20260731b'
      && window.CNC_GAME_QUERY_NAV.runCheck().passed
    ), null, { timeout: 30000 });

    assert.match(await page.locator('.xp-game-hero h1').textContent(), /从零基础.*闯.*独立编程/s);
    assert.match(await page.locator('.xp-game-level-copy > strong').textContent(), /学徒 Lv\.2/);
    assert.match(await page.locator('.xp-game-level-copy p').textContent(), /初级操作工.*140 XP/);
    assert.match(await page.locator('.xp-game-stage.current strong').textContent(), /第4关：图纸、尺寸与基准/);
    assert.match(await page.locator('.xp-game-challenge-btn').getAttribute('href'), /course-drawing-basics\.html/);
    assert.match(await page.locator('.xp-game-secondary').getAttribute('href'), /beginner-placement\.html/);
    assert.match(await page.locator('.xp-game-shortcuts a').nth(2).textContent(), /3 道错题/);
    assert.match(await page.locator('.xp-game-shortcuts a').nth(3).textContent(), /4 \/ 13/);

    const gameNav = page.locator('.xp-game-bottom-nav a');
    assert.strictEqual(await gameNav.count(), 5);
    assert.deepStrictEqual(await gameNav.locator('b').allTextContents(), ['首页', '闯关', '挑战', '模拟', '我的']);
    assert.strictEqual(await page.locator('.launchpad-grid').evaluate(node => getComputedStyle(node).display), 'none');

    const queryButtons = page.locator('#xp-game-home .xp-game-query-button');
    assert.strictEqual(await queryButtons.count(), 4);
    assert.deepStrictEqual(await queryButtons.locator('strong').allTextContents(), ['G/M代码', '报警排查', '参数速查', '故障问诊']);
    assert.deepStrictEqual(await queryButtons.evaluateAll(nodes => nodes.map(node => node.dataset.xpQueryFilter)), ['gcode', 'alarm', 'parameter', 'fault']);

    const navigationLayout = await page.evaluate(() => {
      const utility = document.querySelector('body > .xp-bottom-nav');
      const game = document.querySelector('.xp-game-bottom-nav');
      const utilityRect = utility.getBoundingClientRect();
      const gameRect = game.getBoundingClientRect();
      return {
        utilityVisible: utility.getClientRects().length > 0,
        utilityAriaHidden: utility.getAttribute('aria-hidden'),
        utilityMode: utility.dataset.cncGameUtility,
        utilityBottom: Math.round(utilityRect.bottom),
        gameTop: Math.round(gameRect.top),
        overlap: Math.max(0, Math.min(utilityRect.bottom, gameRect.bottom) - Math.max(utilityRect.top, gameRect.top))
      };
    });
    assert.strictEqual(navigationLayout.utilityVisible, true);
    assert.strictEqual(navigationLayout.utilityAriaHidden, 'false');
    assert.strictEqual(navigationLayout.utilityMode, 'separated');
    assert.ok(Math.abs(navigationLayout.utilityBottom - navigationLayout.gameTop) <= 2, JSON.stringify(navigationLayout));
    assert.strictEqual(navigationLayout.overlap, 0);

    const queryApi = await page.evaluate(() => window.CNC_GAME_QUERY_NAV.runCheck());
    assert.deepStrictEqual(queryApi, {
      passed: true,
      build: '20260731b',
      buttons: 4,
      dashboardActive: true,
      utilitySeparated: true
    });

    const smallTargets = await page.locator('#xp-game-home a:visible,#xp-game-home button:visible,.xp-bottom-nav button:visible').evaluateAll(nodes => nodes.map(node => {
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
    await desktop.waitForFunction(() => window.CNC_GAME_QUERY_NAV?.runCheck().passed, null, { timeout: 30000 });
    assert.strictEqual(await desktop.locator('#xp-game-home').evaluate(node => getComputedStyle(node).display), 'none');
    assert.notStrictEqual(await desktop.locator('.launchpad-grid').evaluate(node => getComputedStyle(node).display), 'none');

    console.log('CNC手机闯关首页、双层无重叠导航与现场速查入口通过', { queryApi, navigationLayout });
  } finally {
    await browser.close();
  }
})().catch(error => {
  fs.writeFileSync(`${OUT}/error.txt`, `${error.stack || error}\n`);
  process.exit(1);
});
