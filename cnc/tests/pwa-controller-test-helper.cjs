function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms);
    })
  ]).finally(() => clearTimeout(timer));
}

async function controllerSnapshot(page) {
  return page.evaluate(async () => {
    const expectedScope = new URL('/cnc/', location.origin).href;
    const registrations = navigator.serviceWorker ? await navigator.serviceWorker.getRegistrations() : [];
    const registration = registrations.find(item => item.scope === expectedScope);
    return {
      url: location.href,
      controller: navigator.serviceWorker?.controller?.scriptURL || '',
      expectedScope,
      registrations: registrations.map(item => ({
        scope: item.scope,
        active: item.active?.state || '',
        activeScript: item.active?.scriptURL || '',
        installing: item.installing?.state || '',
        waiting: item.waiting?.state || ''
      })),
      scope: registration?.scope || '',
      active: registration?.active?.state || '',
      activeScript: registration?.active?.scriptURL || '',
      installing: registration?.installing?.state || '',
      waiting: registration?.waiting?.state || ''
    };
  }).catch(error => ({ error: String(error && error.message ? error.message : error) }));
}

async function waitForController(page, expectedScript, timeoutMs) {
  const current = await page.evaluate(() => navigator.serviceWorker?.controller?.scriptURL || '');
  if (current === expectedScript) return true;

  return page.evaluate(({ expected, ms }) => new Promise(resolve => {
    if (!navigator.serviceWorker) return resolve(false);
    if (navigator.serviceWorker.controller?.scriptURL === expected) return resolve(true);
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      navigator.serviceWorker.removeEventListener('controllerchange', onChange);
      clearTimeout(timer);
      resolve(value);
    };
    const onChange = () => finish(navigator.serviceWorker.controller?.scriptURL === expected);
    const timer = setTimeout(() => finish(navigator.serviceWorker.controller?.scriptURL === expected), ms);
    navigator.serviceWorker.addEventListener('controllerchange', onChange);
  }), { expected: expectedScript, ms: timeoutMs });
}

async function openControlledNavigation(page, controlledUrl, expectedScript) {
  const diagnostics = [];
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const url = new URL(controlledUrl);
    url.searchParams.set('__cnc_sw_probe', `${Date.now()}-${attempt}`);
    await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (await waitForController(page, expectedScript, 8000)) return page;
    diagnostics.push(await controllerSnapshot(page));
  }
  throw new Error(`Navigations were not controlled by ${expectedScript}: ${JSON.stringify(diagnostics)}`);
}

async function ensureControlled(page, errors, observePage, options = {}) {
  const { register = true, controlledUrl = page.url() } = options;
  const directoryEntry = new URL('/cnc/', page.url()).href;
  const expectedScope = new URL('/cnc/', page.url()).href;
  const expectedScript = new URL('/cnc/sw.js', page.url()).href;

  if (!controlledUrl.startsWith(expectedScope)) {
    throw new Error(`Controlled URL outside Service Worker scope: ${controlledUrl}`);
  }

  if (page.url() !== directoryEntry) {
    await page.goto(directoryEntry, { waitUntil: 'domcontentloaded', timeout: 30000 });
  }

  if (register) {
    await withTimeout(page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) throw new Error('Service Worker unsupported');
      await navigator.serviceWorker.register('/cnc/sw.js', {
        scope: '/cnc/',
        updateViaCache: 'none'
      });
    }), 15000, 'Service Worker registration request');
  } else {
    await page.waitForFunction(() => 'serviceWorker' in navigator, { timeout: 10000 });
  }

  // The browser page contract is authoritative: a passing test requires the
  // document to be controlled by the exact CNC worker script. Playwright's
  // context.serviceWorkers() event stream is diagnostic-only and can lag or be
  // empty in headless persistent contexts even when page control is functional.
  if (await waitForController(page, expectedScript, 8000)) return page;

  try {
    return await openControlledNavigation(page, controlledUrl, expectedScript);
  } catch (error) {
    const snapshot = await controllerSnapshot(page);
    throw new Error(`${error.message}; final=${JSON.stringify(snapshot)}`);
  }
}

module.exports = { ensureControlled, withTimeout };
