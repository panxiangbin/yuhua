const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { ensureControlled, withTimeout } = require('./pwa-controller-test-helper.cjs');

const root = path.resolve(__dirname, '../..');
const out = path.resolve(__dirname, '../test-results');
fs.mkdirSync(out, { recursive: true });

const RUN_TIMEOUT_MS = 8 * 60 * 1000;
const CLEANUP_TIMEOUT_MS = 10000;
const CONTROLLER_RETRY_DELAY_MS = 3000;
const errorPath = path.join(out, 'pwa-self-test-error.txt');

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

function waitForExit(child, timeoutMs) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return Promise.race([
    new Promise(resolve => child.once('exit', resolve)),
    new Promise(resolve => setTimeout(resolve, timeoutMs))
  ]);
}

async function ensureControlledAfterRegistrationSettles(page, errors) {
  let firstError;
  try {
    return await ensureControlled(page, errors, observePage);
  } catch (error) {
    firstError = error;
  }

  // Chromium can resolve register() before installing/waiting/active is populated.
  // Give the asynchronous update job one bounded chance to settle, then rerun the
  // full controller assertions. Persistent failures still fail with both traces.
  await page.waitForTimeout(CONTROLLER_RETRY_DELAY_MS);
  try {
    return await ensureControlled(page, errors, observePage);
  } catch (secondError) {
    throw new Error(`Service Worker controller check failed after bounded retry. first=${firstError.stack || firstError}; second=${secondError.stack || secondError}`);
  }
}

(async () => {
  let browser;
  let context;
  const errors = [];
  let stage = 'server';
  let finished = false;

  const watchdog = setTimeout(() => {
    if (finished) return;
    const message = `stage=${stage}\nPWA self-test exceeded ${RUN_TIMEOUT_MS}ms hard limit\nconsole=${errors.join(' | ')}`;
    try { fs.writeFileSync(errorPath, message); } catch {}
    try { server.kill('SIGKILL'); } catch {}
    process.exit(124);
  }, RUN_TIMEOUT_MS);

  try {
    await waitServer();
    stage = 'browser';
    // Run Playwright's version-matched full Chromium in headed mode under Xvfb.
    // This exercises the normal browser Service Worker lifecycle while remaining
    // fully automated in Linux CI and avoids Headless Shell/new-headless variance.
    browser = await chromium.launch({
      channel: 'chromium',
      headless: false
    });
    context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      serviceWorkers: 'allow'
    });
    let page = await context.newPage();
    observePage(page, errors);

    stage = 'controller';
    await page.goto('http://127.0.0.1:4173/cnc/index.html', { waitUntil: 'domcontentloaded' });
    page = await ensureControlledAfterRegistrationSettles(page, errors);
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
    fs.writeFileSync(errorPath, `stage=${stage}\n${error.stack || error}\nconsole=${errors.join(' | ')}`);
    throw error;
  } finally {
    if (context) {
      await withTimeout(context.close(), CLEANUP_TIMEOUT_MS, 'browser context cleanup').catch(error => {
        fs.appendFileSync(errorPath, `\ncontextCleanup=${error.stack || error}`);
      });
    }
    if (browser) {
      await withTimeout(browser.close(), CLEANUP_TIMEOUT_MS, 'browser cleanup').catch(error => {
        fs.appendFileSync(errorPath, `\nbrowserCleanup=${error.stack || error}`);
      });
    }
    if (server.exitCode === null && server.signalCode === null) server.kill('SIGTERM');
    await waitForExit(server, 3000);
    if (server.exitCode === null && server.signalCode === null) server.kill('SIGKILL');
    finished = true;
    clearTimeout(watchdog);
  }
})().then(() => {
  process.exit(0);
}).catch(error => {
  console.error(error);
  process.exit(1);
});
