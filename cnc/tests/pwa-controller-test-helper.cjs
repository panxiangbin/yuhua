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
  const context = page.context();
  const workerUrls = context.serviceWorkers().map(worker => worker.url());
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
  }).then(snapshot => ({ ...snapshot, playwrightWorkers: workerUrls }))
    .catch(error => ({ error: String(error && error.message ? error.message : error), playwrightWorkers: workerUrls }));
}

async function waitForController(page, timeoutMs) {
  if (await page.evaluate(() => Boolean(navigator.serviceWorker?.controller))) return true;
  return page.evaluate(ms => new Promise(resolve => {
    if (!navigator.serviceWorker) return resolve(false);
    if (navigator.serviceWorker.controller) return resolve(true);
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      navigator.serviceWorker.removeEventListener('controllerchange', onChange);
      clearTimeout(timer);
      resolve(value);
    };
    const onChange = () => finish(Boolean(navigator.serviceWorker.controller));
    const timer = setTimeout(() => finish(Boolean(navigator.serviceWorker.controller)), ms);
    navigator.serviceWorker.addEventListener('controllerchange', onChange);
  }), timeoutMs);
}

async function waitForWorkerScript(context, expectedScript, timeoutMs = 60000) {
  const findWorker = () => context.serviceWorkers().find(worker => worker.url() === expectedScript);
  const existing = findWorker();
  if (existing) return existing;

  return withTimeout(new Promise(resolve => {
    const onWorker = worker => {
      if (worker.url() !== expectedScript) return;
      context.off('serviceworker', onWorker);
      resolve(worker);
    };
    context.on('serviceworker', onWorker);
  }), timeoutMs, `Playwright Service Worker ${expectedScript}`);
}

async function openControlledNavigation(page, controlledUrl) {
  const diagnostics = [];
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const url = new URL(controlledUrl);
    url.searchParams.set('__cnc_sw_probe', `${Date.now()}-${attempt}`);
    await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (await waitForController(page, 8000)) return page;
    diagnostics.push(await controllerSnapshot(page));
  }
  throw new Error(`Service Worker script exists but navigations were not controlled: ${JSON.stringify(diagnostics)}`);
}

async function ensureControlled(page, errors, observePage, options = {}) {
  const { register = true, controlledUrl = page.url() } = options;
  const context = page.context();
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

  const worker = await waitForWorkerScript(context, expectedScript, 60000);
  if (worker.url() !== expectedScript) {
    throw new Error(`Unexpected Playwright Service Worker script: ${worker.url()}`);
  }

  if (await waitForController(page, 5000)) return page;

  try {
    return await openControlledNavigation(page, controlledUrl);
  } catch (error) {
    const snapshot = await controllerSnapshot(page);
    throw new Error(`${error.message}; final=${JSON.stringify(snapshot)}`);
  }
}

module.exports = { ensureControlled, withTimeout };