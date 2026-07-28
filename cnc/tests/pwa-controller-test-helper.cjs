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
    const container = navigator.serviceWorker;
    const registrations = container ? await container.getRegistrations() : [];
    const registration = registrations.find(item => item.scope === expectedScope);
    const prototype = container ? Object.getPrototypeOf(container) : null;
    const descriptor = container ? Object.getOwnPropertyDescriptor(container, 'register') : null;
    return {
      url: location.href,
      readyState: document.readyState,
      controller: container?.controller?.scriptURL || '',
      expectedScope,
      registerOwnProperty: Boolean(descriptor),
      registerWritable: descriptor?.writable ?? null,
      registerConfigurable: descriptor?.configurable ?? null,
      registerSource: container ? String(container.register).slice(0, 240) : '',
      nativeRegisterSource: prototype?.register ? String(prototype.register).slice(0, 240) : '',
      scripts: Array.from(document.scripts).map(script => script.src || '[inline]').filter(Boolean),
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

async function registerExpectedWorker(page, expectedScope, expectedScript) {
  return withTimeout(page.evaluate(async ({ scopeUrl, scriptUrl }) => {
    if (!('serviceWorker' in navigator)) throw new Error('Service Worker unsupported');
    const container = navigator.serviceWorker;
    const prototype = Object.getPrototypeOf(container);
    const descriptor = Object.getOwnPropertyDescriptor(container, 'register');
    const ownRegister = Boolean(descriptor);
    const pageRegisterSource = String(container.register).slice(0, 240);
    const nativeRegister = prototype?.register;
    const scripts = Array.from(document.scripts).map(script => script.src || '[inline]').filter(Boolean);

    if (ownRegister && typeof nativeRegister === 'function' && container.register !== nativeRegister) {
      const isLockedNativeProxy =
        descriptor?.writable === false &&
        descriptor?.configurable === false &&
        /nativeRegister\.call\(container,\s*scriptURL,\s*options\)/.test(pageRegisterSource);

      if (!isLockedNativeProxy) {
        throw new Error(`Service Worker register API overridden by page code; register=${pageRegisterSource}; scripts=${JSON.stringify(scripts)}`);
      }
    }

    const register = typeof nativeRegister === 'function' ? nativeRegister : container.register;
    const registration = await register.call(container, '/cnc/sw.js', {
      scope: '/cnc/',
      updateViaCache: 'none'
    });
    if (registration.scope !== scopeUrl) {
      throw new Error(`Service Worker scope mismatch: expected ${scopeUrl}, got ${registration.scope}`);
    }
    const installingScript = registration.installing?.scriptURL || '';
    const waitingScript = registration.waiting?.scriptURL || '';
    const activeScript = registration.active?.scriptURL || '';
    for (const actual of [installingScript, waitingScript, activeScript]) {
      if (actual && actual !== scriptUrl) {
        throw new Error(`Service Worker script mismatch: expected ${scriptUrl}, got ${actual}`);
      }
    }
    return {
      scope: registration.scope,
      installingScript,
      waitingScript,
      activeScript,
      ownRegister,
      lockedNativeProxy: ownRegister && descriptor?.writable === false && descriptor?.configurable === false,
      scripts
    };
  }, { scopeUrl: expectedScope, scriptUrl: expectedScript }), 15000, 'Service Worker registration');
}

async function openControlledNavigation(page, controlledUrl, expectedScript) {
  const diagnostics = [];
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const url = new URL(controlledUrl);
    url.searchParams.set('__cnc_sw_probe', `${Date.now()}-${attempt}`);

    let navigationError = '';
    try {
      await page.goto(url.href, { waitUntil: 'commit', timeout: 15000 });
      await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
    } catch (error) {
      navigationError = String(error && error.message ? error.message : error);
    }

    if (await waitForController(page, expectedScript, 10000)) return page;
    diagnostics.push({ attempt, navigationError, snapshot: await controllerSnapshot(page) });
  }
  throw new Error(`Navigations were not controlled by ${expectedScript}: ${JSON.stringify(diagnostics)}`);
}

async function ensureControlled(page, errors, observePage, options = {}) {
  const { controlledUrl = page.url() } = options;
  const expectedScope = new URL('/cnc/', page.url()).href;
  const expectedScript = new URL('/cnc/sw.js', page.url()).href;

  if (!controlledUrl.startsWith(expectedScope)) {
    throw new Error(`Controlled URL outside Service Worker scope: ${controlledUrl}`);
  }

  await registerExpectedWorker(page, expectedScope, expectedScript);

  if (await waitForController(page, expectedScript, 10000)) return page;

  try {
    return await openControlledNavigation(page, controlledUrl, expectedScript);
  } catch (error) {
    const snapshot = await controllerSnapshot(page);
    throw new Error(`${error.message}; final=${JSON.stringify(snapshot)}`);
  }
}

module.exports = { ensureControlled, withTimeout };