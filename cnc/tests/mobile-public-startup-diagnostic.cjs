const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const outputDir = path.resolve('cnc/test-artifacts/public-startup');
fs.mkdirSync(outputDir, { recursive: true });
const target = `https://panxiangbin.github.io/yuhua/cnc/?publicDiagnostic=${Date.now()}`;

function snapshotState(page, label) {
  return page.evaluate((name) => {
    const active = document.querySelector('.view.active');
    const dashboard = document.getElementById('view-dashboard');
    const study = document.getElementById('view-study');
    const loading = document.getElementById('loading-screen');
    const gate = document.getElementById('access-gate');
    const shell = document.querySelector('.app-shell');
    const style = (node) => node ? {
      display: getComputedStyle(node).display,
      visibility: getComputedStyle(node).visibility,
      opacity: getComputedStyle(node).opacity,
      height: Math.round(node.getBoundingClientRect().height),
      width: Math.round(node.getBoundingClientRect().width)
    } : null;
    return {
      label: name,
      href: location.href,
      hash: location.hash,
      readyState: document.readyState,
      activeView: active ? active.id : '',
      dashboardClass: dashboard ? dashboard.className : '',
      studyClass: study ? study.className : '',
      dashboard: style(dashboard),
      study: style(study),
      loading: style(loading),
      gate: style(gate),
      shell: style(shell),
      bodyClass: document.body ? document.body.className : '',
      bodyText: document.body ? document.body.innerText.slice(0, 180) : '',
      startupGuard: window.CNC_STARTUP_HOME_GUARD && window.CNC_STARTUP_HOME_GUARD.runCheck ? window.CNC_STARTUP_HOME_GUARD.runCheck() : null,
      importBuild: window.CNC_IMPORT_TEST && window.CNC_IMPORT_TEST.runAll ? window.CNC_IMPORT_TEST.runAll().build : null
    };
  }, label);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'zh-CN'
  });
  const page = await context.newPage();
  const errors = [];
  const failed = [];
  const scripts = [];
  page.on('pageerror', error => errors.push(`pageerror: ${error.message || error}`));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('requestfailed', request => failed.push({ url: request.url(), failure: request.failure() }));
  page.on('response', response => {
    if (/\.(?:js|css)(?:\?|$)/i.test(response.url())) scripts.push({ url: response.url(), status: response.status(), cache: response.headers()['x-cache'] || '' });
  });

  await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const checkpoints = [200, 1000, 3000, 6000, 12000];
  const states = [];
  let previous = 0;
  for (const ms of checkpoints) {
    await page.waitForTimeout(ms - previous);
    previous = ms;
    states.push(await snapshotState(page, `${ms}ms`));
    await page.screenshot({ path: path.join(outputDir, `public-${ms}ms.png`), fullPage: false, animations: 'disabled' });
  }

  const report = { target, states, errors, failed, scripts };
  fs.writeFileSync(path.join(outputDir, 'public-startup-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
