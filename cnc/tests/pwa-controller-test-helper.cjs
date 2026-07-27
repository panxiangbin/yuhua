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
        installingScript: item.installing?.scriptURL || '',
        waiting: item.waiting?.state || '',
        waitingScript: item.waiting?.scriptURL || ''
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

async function ensureWorkerActivated(page, expectedScope, expectedScript) {
  return withTimeout(page.evaluate(async ({ scopeUrl, scriptUrl }) => {
    if (!('serviceWorker' in navigator)) throw new Error('Service Worker unsupported');

    const registration = await navigator.serviceWorker.register('/cnc/sw.js', {
      scope: '/cnc/',
      updateViaCache: 'none'
    });
    if (registration.scope !== scopeUrl) {
      throw new Error(`Service Worker scope mismatch: expected ${scopeUrl}, got ${registration.scope}`);
    }

    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
      const current = registration.active || registration.waiting || registration.installing;
      if (current?.state === 'redundant') {
        throw new Error(`Service Worker became redundant: ${current.scriptURL || ''}`);
      }
      if (registration.active?.state === 'activated') {
        if (registration.active.scriptURL !== scriptUrl) {
          throw new Error(`Service Worker script mismatch: expected ${scriptUrl}, got ${registration.active.scriptURL}`);
        }
        return {
          scope: registration.scope,
          state: registration.active.state,
          script: registration.active.scriptURL
        };
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error(`Service Worker activation timeout: ${JSON.stringify({
      scope: registration.scope,
      active: registration.active?.state || '',
      activeScript: registration.active?.scriptURL || '',
      installing: registration.installing?.state || '',
      installingScript: registration.installing?.scriptURL || '',
      waiting: registration.waiting?.state || '',
      waitingScript: registration.waiting?.scriptURL || ''
    })}`);
  }, { scopeUrl: expectedScope, scriptUrl: expectedScript }), 65000, 'Service Worker activation');
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
  const { controlledUrl = page.url() } = options;
  const directoryEntry = new URL('/cnc/', page.url()).href;
  const expectedScope = new URL('/cnc/', page.url()).href;
  const expectedScript = new URL('/cnc/sw.js', page.url()).href;

  if (!controlledUrl.startsWith(expectedScope)) {
    throw new Error(`Controlled URL outside Service Worker scope: ${controlledUrl}`);
  }

  if (page.url() !== directoryEntry) {
    await page.goto(directoryEntry, { waitUntil: 'domcontentloaded', timeout: 30000 });
  }

  await ensureWorkerActivated(page, expectedScope, expectedScript);

  // clients.claim() may control the directory document immediately. If Chromium
  // does not expose the controller yet, perform real same-scope navigations only
  // after the worker is confirmed activated.
  if (await waitForController(page, expectedScript, 8000)) return page;

  try {
    return await openControlledNavigation(page, controlledUrl, expectedScript);
  } catch (error) {
    const snapshot = await controllerSnapshot(page);
    throw new Error(`${error.message}; final=${JSON.stringify(snapshot)}`);
  }
}

module.exports = { ensureControlled, withTimeout };
