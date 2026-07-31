const { chromium } = require('playwright');
const fs = require('fs');
const assert = require('assert');

const BASE = process.env.CNC_BASE_URL || 'http://127.0.0.1:4173';
const OUT = 'artifacts/beginner-placement';
fs.mkdirSync(OUT, { recursive: true });

async function choose(page, optionIndex) {
  await page.locator('.option').nth(optionIndex).click();
  await page.locator('#next').click();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(`${BASE}/cnc/beginner-placement.html`, { waitUntil: 'networkidle' });
    assert.match(await page.title(), /CNC新手起点测评/);
    assert.strictEqual(await page.locator('.option').count(), 3);
    for (let i = 0; i < 6; i += 1) await choose(page, 0);
    await page.locator('#result.show').waitFor();
    assert.match(await page.locator('#result-title').textContent(), /第1关.*安全基础/);
    assert.match(await page.locator('#result-link').getAttribute('href'), /course-safety-foundation\.html/);
    const targets = await page.locator('a:visible,button:visible').evaluateAll(nodes => nodes.map(node => {
      const r = node.getBoundingClientRect();
      return { text: node.textContent.trim(), width: r.width, height: r.height };
    }));
    assert.deepStrictEqual(targets.filter(t => t.width > 0 && t.height > 0 && t.height < 44), []);
    assert.strictEqual(errors.length, 0, errors.join(' | '));
    await page.screenshot({ path: `${OUT}/beginner-placement-390x844.png`, fullPage: true });
    console.log('CNC beginner placement smoke passed');
  } finally {
    await browser.close();
  }
})().catch(error => {
  fs.writeFileSync(`${OUT}/error.txt`, `${error.stack || error}\n`);
  process.exit(1);
});