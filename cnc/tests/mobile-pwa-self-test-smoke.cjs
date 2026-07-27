const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { ensureControlled } = require('./pwa-controller-test-helper.cjs');

const root = path.resolve(__dirname, '../..');
const out = path.resolve(__dirname, '../test-results');
fs.mkdirSync(out, { recursive: true });

const server = spawn('python3', ['-m', 'http.server', '4173', '--bind', '127.0.0.1'], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe']
});

function waitServer() {
  return new Promise((resolve, reject) => {
    let tries = 0;
    const retry = () => {
      tries += 1;
      if (tries > 40) reject(new Error('static server not ready'));
      else setTimeout(ping, 250);
    };
    const ping = () => {
      http.get('http://127.0.0.1:4173/cnc/index.html', response => {
        response.resume();
        response.statusCode === 200 ? resolve() : retry();
      }).on('error', retry);
    };
    ping();
  });
}

function observePage(page, errors) {
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(30000);
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
}

(async () => {
  let context;
  let userDataDir;
  const errors = [];
  let stage = 'server';
  try {
    await waitServer();
    stage = 'browser';
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cnc-pwa-self-test-'));
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: true,
      viewport: { width: 390, height: 844 },
      serviceWorkers: 'allow'
    });
    let page = context.pages()[0] || await context.newPage();
    observePage(page, errors);

    stage = 'controller';
    await page.goto('http://127.0.0.1:4173/cnc/index.html', { waitUntil: 'domcontentloaded' });
    page = await ensureControlled(page, errors, observePage, { register: false });
    stage = 'self-test';
    await page.goto('http://127.0.0.1:4173/cnc/pwa-self-test.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#passed')?.textContent === '8' && document.querySelector('#failed')?.textContent === '0', { timeout: 60000 });

    const rows = await page.locator('.item').count();
    if (rows !== 8) throw new Error(`expected 8 checks, got ${rows}`);
    const status = await page.locator('#status').innerText();
    if (!status.includes('8项检查全部通过')) throw new Error(`unexpected status: ${status}`);

    const touch = await page.locator('a:visible,button:visible').evaluateAll(elements => elements.map(element => {
      const rect = element.getBoundingClientRect();
      return { text: element.textContent.trim(), width: rect.width, height: rect.height };
    }));
    for (const target of touch) {
      if (target.width < 44 || target.height < 44) throw new Error(`touch target too small: ${JSON.stringify(target)}`);
    }
    if (errors.length) throw new Error(`console errors: ${errors.join(' | ')}`);

    await page.screenshot({ path: path.join(out, 'pwa-self-test-390x844.png'), fullPage: true });
    const result = { checks: rows, passed: 8, failed: 0, status, touchTargets: touch.length, consoleErrors: errors };
    fs.writeFileSync(path.join(out, 'pwa-self-test-result.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
  } catch (error) {
    fs.writeFileSync(path.join(out, 'pwa-self-test-error.txt'), `stage=${stage}\n${error.stack || error}`);
    throw error;
  } finally {
    if (context) await context.close().catch(() => {});
    if (userDataDir) fs.rmSync(userDataDir, { recursive: true, force: true });
    server.kill('SIGTERM');
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
