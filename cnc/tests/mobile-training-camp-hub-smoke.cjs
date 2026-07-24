const { chromium } = require('playwright');
const fs = require('fs');
const assert = require('assert');

const BASE = process.env.CNC_BASE_URL || 'http://127.0.0.1:4173';
const ARTIFACT_DIR = 'artifacts/training-camp-hub';
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

async function openPage(browser, seed) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(data => {
    localStorage.clear();
    if (data.profile) localStorage.setItem('cnc_training_profile_v1', JSON.stringify(data.profile));
    if (data.practice) localStorage.setItem('cnc_training_practice_v1', JSON.stringify(data.practice));
  }, seed);
  await page.goto(`${BASE}/cnc/training-camp.html`, { waitUntil: 'networkidle' });
  return { page, errors };
}

async function assertTouchTargets(page) {
  const targets = await page.locator('a:visible').evaluateAll(nodes => nodes.map(node => {
    const r = node.getBoundingClientRect();
    return { text: node.textContent.trim().replace(/\s+/g, ' '), width: r.width, height: r.height };
  }));
  const invalid = targets.filter(item => item.width > 0 && item.height > 0 && item.height < 44);
  assert.deepStrictEqual(invalid, [], `触控区不足44px: ${JSON.stringify(invalid)}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const empty = await openPage(browser, {});
    assert.match(await empty.page.title(), /12关CNC新手训练营/);
    await empty.page.locator('.course').first().waitFor({ state: 'visible' });
    assert.strictEqual(await empty.page.locator('.course').count(), 12, '必须展示12关完整路线');
    assert.strictEqual(await empty.page.locator('#passed-count').textContent(), '0');
    assert.strictEqual(await empty.page.locator('#avg-score').textContent(), '0');
    assert.match(await empty.page.locator('#next-title').textContent(), /第1关.*安全基础/);
    assert.match(await empty.page.locator('#continue-main').getAttribute('href'), /course-safety-foundation\.html/);
    assert.strictEqual(empty.errors.length, 0, `空档案场景控制台错误: ${empty.errors.join(' | ')}`);
    await assertTouchTargets(empty.page);
    await empty.page.screenshot({ path: `${ARTIFACT_DIR}/empty-profile.png`, fullPage: true });
    await empty.page.close();

    const progress = await openPage(browser, {
      profile: {
        version: 1,
        completedStages: ['stage-1', 'stage-2', 'stage-3'],
        courseScores: { 'stage-1': 100, 'stage-2': 90, 'stage-3': 80 },
        xp: 300
      },
      practice: { version: 1, wrongQuestions: ['q-1', 'q-2', 'q-3', 'q-4'] }
    });
    assert.strictEqual(await progress.page.locator('#passed-count').textContent(), '3');
    assert.strictEqual(await progress.page.locator('#avg-score').textContent(), '90');
    assert.strictEqual(await progress.page.locator('#wrong-count').textContent(), '4');
    assert.match(await progress.page.locator('#next-title').textContent(), /第4关.*图纸/);
    assert.match(await progress.page.locator('#continue-main').getAttribute('href'), /course-drawing-basics\.html/);
    assert.strictEqual(await progress.page.locator('.course.done').count(), 3);
    assert.strictEqual(await progress.page.locator('.course.current').count(), 1);
    const barWidth = await progress.page.locator('#progress-bar').evaluate(node => node.style.width);
    assert.strictEqual(barWidth, '25%');
    assert.strictEqual(progress.errors.length, 0, `进度场景控制台错误: ${progress.errors.join(' | ')}`);
    await assertTouchTargets(progress.page);
    await progress.page.screenshot({ path: `${ARTIFACT_DIR}/progress-profile.png`, fullPage: true });
    await progress.page.close();

    const completeScores = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`stage-${i + 1}`, 80 + (i % 3) * 10]));
    const complete = await openPage(browser, {
      profile: { version: 1, completedStages: Array.from({ length: 12 }, (_, i) => `stage-${i + 1}`), courseScores: completeScores },
      practice: { version: 1, wrongQuestions: [] }
    });
    assert.strictEqual(await complete.page.locator('#passed-count').textContent(), '12');
    assert.match(await complete.page.locator('#progress-copy').textContent(), /12关全部通过/);
    assert.strictEqual(await complete.page.locator('.course.done').count(), 12);
    assert.strictEqual(await complete.page.locator('#continue-main').textContent(), '复习第12关');
    assert.match(await complete.page.locator('#continue-main').getAttribute('href'), /course-complete-program-first-piece\.html/);
    assert.strictEqual(complete.errors.length, 0, `全通关场景控制台错误: ${complete.errors.join(' | ')}`);
    await assertTouchTargets(complete.page);
    await complete.page.screenshot({ path: `${ARTIFACT_DIR}/complete-profile.png`, fullPage: true });
    await complete.page.close();

    console.log('CNC training camp hub smoke passed');
  } catch (error) {
    fs.writeFileSync(`${ARTIFACT_DIR}/error.txt`, `${error.stack || error}\n`);
    throw error;
  } finally {
    await browser.close();
  }
})();
