const { chromium } = require('playwright');
const fs = require('fs');
const assert = require('assert');

const BASE = process.env.CNC_BASE_URL || 'http://127.0.0.1:4173';
const OUT = 'artifacts/beginner-placement';
fs.mkdirSync(OUT, { recursive: true });

function sameOrigin(url) {
  const target = new URL(url);
  const base = new URL(BASE);
  return target.origin === base.origin;
}

async function choose(page, optionIndex) {
  await page.locator('.option').nth(optionIndex).click();
  await page.locator('#next').click();
}

async function verifyTouchTargets(page) {
  const targets = await page.locator('a:visible,button:visible').evaluateAll(nodes => nodes.map(node => {
    const r = node.getBoundingClientRect();
    return { text: node.textContent.trim(), width: r.width, height: r.height };
  }));
  assert.deepStrictEqual(targets.filter(target => target.width > 0 && target.height > 0 && (target.width < 44 || target.height < 44)), []);
  return targets;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = { checkedAt: new Date().toISOString(), viewport: '390x844', scenarios: {} };
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const errors = [];
    const externalRequests = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (!sameOrigin(request.url())) externalRequests.push(request.url()); });

    await page.goto(`${BASE}/cnc/beginner-placement.html`, { waitUntil: 'networkidle' });
    assert.match(await page.title(), /CNC新手起点测评/);

    const progress = page.locator('#progress');
    assert.strictEqual(await progress.getAttribute('role'), 'progressbar');
    assert.strictEqual(await progress.getAttribute('aria-valuemin'), '0');
    assert.strictEqual(await progress.getAttribute('aria-valuemax'), '6');
    assert.strictEqual(await progress.getAttribute('aria-valuenow'), '0');
    assert.match(await progress.getAttribute('aria-valuetext'), /已完成0题，共6题/);

    const group = page.locator('#options');
    assert.strictEqual(await group.getAttribute('role'), 'radiogroup');
    assert.strictEqual(await group.getAttribute('aria-labelledby'), 'qtitle');
    assert.strictEqual(await page.locator('.option').count(), 3);
    assert.strictEqual(await page.locator('.option').nth(0).getAttribute('role'), 'radio');
    assert.strictEqual(await page.locator('.option').nth(0).getAttribute('tabindex'), '0');
    assert.strictEqual(await page.locator('.option').nth(0).getAttribute('aria-checked'), 'false');

    await page.locator('.option').nth(0).focus();
    await page.keyboard.press('ArrowDown');
    assert.strictEqual(await page.locator('.option').nth(1).getAttribute('aria-checked'), 'true');
    assert.strictEqual(await page.locator('.option').nth(1).getAttribute('tabindex'), '0');
    assert.strictEqual(await page.evaluate(() => document.activeElement?.id), 'option-0-1');
    await page.locator('#next').click();
    await page.waitForFunction(() => document.activeElement?.id === 'qtitle');
    assert.strictEqual(await progress.getAttribute('aria-valuenow'), '1');
    assert.match(await progress.getAttribute('aria-valuetext'), /当前第2题/);

    await page.locator('#next').click();
    assert.strictEqual(await page.locator('#validation').isVisible(), true);
    assert.match(await page.locator('#validation').textContent(), /第2题尚未选择/);
    await page.waitForFunction(() => document.activeElement?.id === 'validation');

    for (let question = 1; question < 6; question += 1) await choose(page, 0);
    await page.locator('#result.show').waitFor();
    assert.strictEqual(await page.locator('#quiz').isHidden(), true);
    assert.strictEqual(await page.locator('#result').getAttribute('role'), 'region');
    assert.strictEqual(await page.locator('#result').getAttribute('aria-labelledby'), 'result-title');
    assert.strictEqual(await page.locator('#result').getAttribute('aria-describedby'), 'result-copy result-route');
    assert.match(await page.locator('#result-title').textContent(), /第1关.*安全基础/);
    assert.match(await page.locator('#result-link').getAttribute('href'), /course-safety-foundation\.html/);
    await page.waitForFunction(() => document.activeElement?.id === 'result-title');
    assert.strictEqual(await progress.getAttribute('aria-valuenow'), '6');
    assert.match(await progress.getAttribute('aria-valuetext'), /已完成6题，共6题/);
    await verifyTouchTargets(page);
    await page.screenshot({ path: `${OUT}/beginner-placement-low-390x844.png`, fullPage: true });

    await page.locator('#restart').click();
    await page.waitForFunction(() => document.activeElement?.id === 'qtitle');
    assert.strictEqual(await page.locator('#result').isHidden(), true);
    assert.strictEqual(await progress.getAttribute('aria-valuenow'), '0');

    const bestOptions = [1, 2, 1, 1, 1, 1];
    for (const optionIndex of bestOptions) await choose(page, optionIndex);
    await page.locator('#result.show').waitFor();
    assert.match(await page.locator('#result-title').textContent(), /程序验证与首件检查/);
    assert.match(await page.locator('#result-link').getAttribute('href'), /course-g00-g01\.html/);
    await page.screenshot({ path: `${OUT}/beginner-placement-high-390x844.png`, fullPage: true });

    const storage = await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }));
    assert.deepStrictEqual(storage, { local: [], session: [] });

    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.strictEqual(await page.locator('#bar').evaluate(node => getComputedStyle(node).transitionDuration), '0s');

    const safetyNote = await page.locator('#assessment-note').textContent();
    assert.match(safetyNote, /相同版本原厂手册/);
    assert.match(safetyNote, /授权人员确认/);
    assert.strictEqual(externalRequests.length, 0, externalRequests.join(' | '));
    assert.strictEqual(errors.length, 0, errors.join(' | '));

    report.scenarios = {
      progressbarSemantics: true,
      radioGroupKeyboard: true,
      validationFocus: true,
      questionFocus: true,
      resultNamedRegion: true,
      resultFocus: true,
      lowScoreRoute: true,
      highScoreRoute: true,
      restartFocus: true,
      reducedMotion: true,
      touchTargets44px: true,
      noLongTermStorage: true,
      noExternalRequests: true,
      originalManualBoundary: true
    };
    report.externalRequests = externalRequests;
    report.browserErrors = errors;
    fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
    fs.writeFileSync(`${OUT}/findings.txt`, [
      '起点测评进度条语义：通过',
      '单选组与方向键操作：通过',
      '未选择提示与焦点：通过',
      '换题和结果焦点：通过',
      '低分与高分学习入口：通过',
      '重新测评焦点恢复：通过',
      '减少动态效果：通过',
      '44px触控目标：通过',
      '长期存储写入：0',
      '站外请求：0',
      '浏览器错误：0',
      '原厂手册与授权人员边界：保留'
    ].join('\n') + '\n');
    console.log('CNC beginner placement accessibility smoke passed');
  } catch (error) {
    report.error = String(error && error.stack || error);
    fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
    fs.writeFileSync(`${OUT}/error.txt`, `${error.stack || error}\n`);
    throw error;
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});