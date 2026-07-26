const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const base = process.env.CNC_BASE_URL || 'http://127.0.0.1:4173';
const out = process.env.CNC_ARTIFACT_DIR || 'artifacts/alarm-parameter-first-piece';
fs.mkdirSync(out, { recursive: true });
const assert = (value, message) => { if (!value) throw new Error(message); };

const correctAnswers = {
  'apf-02': [0, 1, 2],
  'apf-06': [0, 1, 2],
  'apf-10': [0, 1, 2],
  'apf-14': [0, 1, 2],
  'apf-03': [1],
  'apf-07': [1],
  'apf-12': [1]
};
const deliberateWrongAnswers = {
  'apf-01': [1],
  'apf-02': [3],
  'apf-03': [0],
  'apf-04': [1]
};

async function answer(page, wrongCount = 0) {
  for (let index = 0; index < 15; index += 1) {
    const active = page.locator('.q.active');
    await active.waitFor();
    const id = await active.getAttribute('data-id');
    const inputs = active.locator('input');
    const picks = index < wrongCount
      ? deliberateWrongAnswers[id]
      : (correctAnswers[id] || [0]);
    assert(Array.isArray(picks) && picks.length > 0, `缺少题目 ${id} 的测试答案`);
    for (const pick of picks) await inputs.nth(pick).check();

    const submit = active.locator('.submit');
    await submit.scrollIntoViewIfNeeded();
    await submit.click();
    await active.locator('.feedback.show').waitFor();

    const next = active.locator('.next');
    await next.waitFor({ state: 'visible' });
    await page.waitForFunction(button => !button.disabled, await next.elementHandle());
    await next.scrollIntoViewIfNeeded();
    await next.click();
  }
  await page.locator('#result.show').waitFor();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));

  await page.goto(`${base}/cnc/practice-alarm-parameter-first-piece.html`, { waitUntil: 'networkidle' });
  const meta = await page.locator('.q').evaluateAll(nodes => nodes.map(node => ({
    id: node.dataset.id,
    types: [...node.querySelectorAll('.tag')].map(tag => tag.textContent)
  })));
  assert(meta.length === 15, '必须有15道题');
  assert(new Set(meta.map(item => item.id)).size === 15, '题目ID重复');

  const html = await page.content();
  for (const word of ['single', 'multi', 'judge', 'order', '风险：高', 'FANUC类加工中心', '统一安全提示']) {
    assert(html.includes(word), `missing ${word}`);
  }

  await answer(page, 0);
  assert((await page.locator('#score').textContent()).trim() === '100', '全对不是100分');
  assert((await page.locator('#result-title').textContent()).includes('通过'), '100分未通过');
  await page.screenshot({ path: path.join(out, 'success.png'), fullPage: true });

  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await answer(page, 4);
  assert((await page.locator('#score').textContent()).trim() === '73', '错4题应为73分');
  assert((await page.locator('#result-title').textContent()).includes('未达到80分'), '73分错误通过');
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem('cnc_training_practice_v1')));
  assert(data.version === 1, 'LocalStorage版本错误');
  assert(Array.isArray(data.wrongQuestions) && data.wrongQuestions.length === 4, '错题应为4道');

  await page.locator('#redo').click();
  assert(await page.locator('.q').count() === 4, '只重做错题应显示4题');
  const small = await page.locator('button:visible,a:visible,.opt:visible').evaluateAll(nodes => nodes
    .filter(node => node.getBoundingClientRect().height < 44)
    .map(node => ({ tag: node.tagName, text: node.textContent.trim(), h: node.getBoundingClientRect().height })));
  assert(!small.length, `存在小于44px触控区 ${JSON.stringify(small)}`);
  assert(!errors.length, `控制台错误 ${errors.join(' | ')}`);

  await page.screenshot({ path: path.join(out, 'failed-path.png'), fullPage: true });
  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({
    passed: true,
    questions: 15,
    wrong: 4,
    viewport: '390x844'
  }, null, 2));
  await browser.close();
}

main().catch(error => {
  fs.writeFileSync(path.join(out, 'error.txt'), String(error.stack || error));
  console.error(error);
  process.exit(1);
});
