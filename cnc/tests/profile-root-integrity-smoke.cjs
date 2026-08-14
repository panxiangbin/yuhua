const { chromium } = require('playwright');
const { spawn } = require('child_process');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

(async () => {
  const root = path.resolve(__dirname, '../..');
  const resultDir = path.join(root, 'cnc/test-results');
  fs.mkdirSync(resultDir, { recursive: true });

  const source = fs.readFileSync(path.join(root, 'cnc/profile.html'), 'utf8');
  for (const token of [
    'function readState(k)',
    'invalid:true',
    'function renderIntegrityBlocked(keys)',
    "document.getElementById('xp').textContent='--'",
    "document.getElementById('recommend-practice').href='./data-health.html'"
  ]) assert(source.includes(token), `成长档案缺少根数据异常阻断契约：${token}`);

  const server = spawn('python3', ['-m', 'http.server', '4173'], { cwd: root, stdio: 'ignore' });
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', error => pageErrors.push(String(error)));

    await page.goto('http://127.0.0.1:4173/cnc/profile.html', { waitUntil: 'networkidle' });
    const corrupt = {
      profile: '[]',
      practice: '{"version":1,"history":',
      simulator: '"损坏根结构"'
    };
    await page.evaluate(values => {
      localStorage.clear();
      localStorage.setItem('cnc_training_profile_v1', values.profile);
      localStorage.setItem('cnc_training_practice_v1', values.practice);
      localStorage.setItem('cnc_training_simulator_v1', values.simulator);
      localStorage.setItem('unrelated_keep_me', '保留');
    }, corrupt);
    const before = await page.evaluate(() => ({
      profile: localStorage.getItem('cnc_training_profile_v1'),
      practice: localStorage.getItem('cnc_training_practice_v1'),
      simulator: localStorage.getItem('cnc_training_simulator_v1'),
      unrelated: localStorage.getItem('unrelated_keep_me')
    }));

    await page.reload({ waitUntil: 'networkidle' });
    const alert = page.locator('#data-integrity-alert');
    assert.equal(await alert.isVisible(), true, '损坏根数据时必须显示显式数据异常提示');
    const alertText = await page.locator('#data-integrity-copy').textContent();
    assert(alertText.includes('成长档案') && alertText.includes('专项练习') && alertText.includes('模拟训练'), `异常提示必须标明受影响数据源：${alertText}`);
    assert.equal(await page.locator('#xp').textContent(), '--', '损坏根数据不得伪报0 XP');
    assert.equal(await page.locator('#practice-pass').textContent(), '--/5', '损坏根数据不得伪报0/5专项');
    assert.equal(await page.locator('#wrong-count').textContent(), '--', '损坏根数据不得伪报0道错题');
    assert.equal(await page.locator('#sim-pass').textContent(), '--/13', '损坏根数据不得伪报0/13模拟');
    assert((await page.locator('#ability-copy').textContent()).includes('暂停能力画像'), '损坏根数据时必须暂停能力画像');
    assert((await page.locator('#recommend-copy').textContent()).includes('暂停个性化推荐'), '损坏根数据时必须暂停个性化推荐');
    assert.equal(await page.locator('#recommend-practice').getAttribute('href'), './data-health.html', '异常推荐入口必须指向数据健康检查');
    assert.equal(await page.locator('#recommend-practice').textContent(), '检查学习数据');
    const actionLinks = await alert.locator('a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
    assert(actionLinks.includes('./data-health.html') && actionLinks.includes('./data-backup.html'), '异常处置必须同时提供数据健康与备份恢复入口');

    const after = await page.evaluate(() => ({
      profile: localStorage.getItem('cnc_training_profile_v1'),
      practice: localStorage.getItem('cnc_training_practice_v1'),
      simulator: localStorage.getItem('cnc_training_simulator_v1'),
      unrelated: localStorage.getItem('unrelated_keep_me'),
      bodyText: document.body.innerText,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    assert.deepEqual({ profile: after.profile, practice: after.practice, simulator: after.simulator, unrelated: after.unrelated }, before, '成长档案异常阻断必须严格只读，不得改写任何LocalStorage');
    assert(!/NaN|Infinity/.test(after.bodyText || ''), '异常阻断页面不得显示NaN/Infinity');
    assert(after.scrollWidth <= after.clientWidth + 1, `390px页面不得横向溢出：${after.scrollWidth}/${after.clientWidth}`);
    const minTouch = await page.locator('a:visible').evaluateAll(nodes => Math.min(...nodes.map(node => node.getBoundingClientRect().height)));
    assert(minTouch >= 44, `可见链接触控目标不得低于44px：${minTouch}`);
    assert.equal(consoleErrors.length, 0, consoleErrors.join('\n'));
    assert.equal(pageErrors.length, 0, pageErrors.join('\n'));

    await page.screenshot({ path: path.join(resultDir, 'profile-root-integrity-390x844.png'), fullPage: true });
    const report = {
      viewport: { width: 390, height: 844 },
      rootCorruptionBlocked: true,
      affectedSourcesNamed: ['成长档案', '专项练习', '模拟训练'],
      statsSuppressed: { xp: '--', practice: '--/5', wrong: '--', simulator: '--/13' },
      recommendationBlocked: true,
      healthAndBackupLinks: true,
      readOnly: true,
      noHorizontalOverflow: true,
      minTouch,
      consoleErrors,
      pageErrors,
      passed: true
    };
    fs.writeFileSync(path.join(resultDir, 'profile-root-integrity.json'), JSON.stringify(report, null, 2));
    console.log('profile root integrity smoke passed');
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
