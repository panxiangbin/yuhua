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
    const registration = await navigator.serviceWorker?.getRegistration('./');
    return {
      url: location.href,
      controller: navigator.serviceWorker?.controller?.scriptURL || '',
      scope: registration?.scope || '',
      active: registration?.active?.state || '',
      installing: registration?.installing?.state || '',
      waiting: registration?.waiting?.state || ''
    };
  }).catch(error => ({ error: String(error && error.message ? error.message : error) }));
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

async function openControlledNavigation(page, controlledUrl) {
  const diagnostics = [];
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const url = new URL(controlledUrl);
    url.searchParams.set('__cnc_sw_probe', `${Date.now()}-${attempt}`);
    await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (await waitForController(page, 6000)) return page;
    diagnostics.push(await controllerSnapshot(page));
  }
  throw new Error(`Service Worker active but same-tab navigations were not controlled: ${JSON.stringify(diagnostics)}`);
}

async function ensureControlled(page, errors, observePage, options = {}) {
  const { register = true, controlledUrl = page.url() } = options;
  await withTimeout(page.evaluate(async shouldRegister => {
    if (!('serviceWorker' in navigator)) throw new Error('Service Worker unsupported');
    let registration = await navigator.serviceWorker.getRegistration('./');
    if (!registration && shouldRegister) {
      registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    }
    if (!registration) throw new Error('Service Worker registration missing');
    return { scope: registration.scope };
  }, register), 15000, 'serviceWorker registration');

  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.getRegistration('./');
    return Boolean(registration && registration.active && registration.active.state === 'activated');
  }, { timeout: 60000 });

  const scope = await page.evaluate(async () => (await navigator.serviceWorker.getRegistration('./'))?.scope || '');
  if (!controlledUrl.startsWith(scope)) throw new Error(`Service Worker scope mismatch: ${scope}`);
  if (await waitForController(page, 3000)) return page;

  return openControlledNavigation(page, controlledUrl);
}

module.exports = { ensureControlled, withTimeout };