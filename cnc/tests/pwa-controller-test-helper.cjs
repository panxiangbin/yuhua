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
      readyState: document.readyState,
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

async function inspectWorkerResponse(page, expectedScript) {
  return page.evaluate(async scriptUrl => {
    try {
      const response = await fetch(scriptUrl, { cache: 'no-store', credentials: 'same-origin' });
      const source = await response.text();
      return {
        ok: response.ok,
        status: response.status,
        contentType: response.headers.get('content-type') || '',
        contentLength: source.length,
        sourcePrefix: source.slice(0, 120)
      };
    } catch (error) {
      return { fetchError: String(error && error.message ? error.message : error) };
    }
  }, expectedScript);
}

async function registrationSnapshot(page, expectedScope) {
  return page.evaluate(async scopeUrl => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const registration = registrations.find(item => item.scope === scopeUrl);
    return {
      registrations: registrations.map(item => ({
        scope: item.scope,
        installing: item.installing?.state || '',
        waiting: item.waiting?.state || '',
        active: item.active?.state || '',
        installingScript: item.installing?.scriptURL || '',
        waitingScript: item.waiting?.scriptURL || '',
        activeScript: item.active?.scriptURL || ''
      })),
      matched: registration ? {
        scope: registration.scope,
        installing: registration.installing?.state || '',
        waiting: registration.waiting?.state || '',
        active: registration.active?.state || ''
      } : null
    };
  }, expectedScope).catch(error => ({ snapshotError: String(error && error.message ? error.message : error) }));
}

async function startChromiumServiceWorkerDiagnostics(page) {
  const events = [];
  let session = null;
  try {
    session = await page.context().newCDPSession(page);
    session.on('ServiceWorker.workerRegistrationUpdated', payload => {
      events.push({ type: 'registration', registrations: payload.registrations || [] });
    });
    session.on('ServiceWorker.workerVersionUpdated', payload => {
      events.push({ type: 'version', versions: payload.versions || [] });
    });
    session.on('ServiceWorker.workerErrorReported', payload => {
      events.push({ type: 'error', errorMessage: payload.errorMessage || {} });
    });
    await session.send('ServiceWorker.enable');
  } catch (error) {
    events.push({ type: 'diagnostic-unavailable', error: String(error && error.message ? error.message : error) });
  }
  return {
    events,
    async stop() {
      if (!session) return;
      try { await session.send('ServiceWorker.disable'); } catch {}
      try { await session.detach(); } catch {}
    }
  };
}

async function registerExpectedWorker(page, expectedScope, expectedScript) {
  const response = await inspectWorkerResponse(page, expectedScript);
  if (!response.ok) {
    throw new Error(`Service Worker script response invalid: ${JSON.stringify(response)}`);
  }
  if (!/javascript|ecmascript/i.test(response.contentType)) {
    throw new Error(`Service Worker script MIME type invalid: ${JSON.stringify(response)}`);
  }

  const result = await withTimeout(page.evaluate(async ({ scopeUrl, registrationTimeoutMs }) => {
    if (!('serviceWorker' in navigator)) throw new Error('Service Worker unsupported');

    // Keep the timeout inside the page execution. An outer Promise.race alone can
    // reject in Node while leaving a hung Runtime.evaluate command attached to the
    // page, which blocks every later diagnostic call until the global watchdog fires.
    const registration = await Promise.race([
      navigator.serviceWorker.register('/cnc/sw.js', {
        scope: '/cnc/',
        updateViaCache: 'none'
      }),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`navigator.serviceWorker.register timeout after ${registrationTimeoutMs}ms`)), registrationTimeoutMs);
      })
    ]);

    if (registration.scope !== scopeUrl) {
      throw new Error(`Service Worker scope mismatch: expected ${scopeUrl}, got ${registration.scope}`);
    }
    const worker = registration.installing || registration.waiting || registration.active;
    const states = [];
    if (worker) {
      states.push(worker.state);
      await new Promise(resolve => {
        if (worker.state === 'activated' || worker.state === 'redundant') return resolve();
        const timer = setTimeout(resolve, 12000);
        const onStateChange = () => {
          states.push(worker.state);
          if (worker.state === 'activated' || worker.state === 'redundant') {
            clearTimeout(timer);
            worker.removeEventListener('statechange', onStateChange);
            resolve();
          }
        };
        worker.addEventListener('statechange', onStateChange);
      });
    }
    return {
      scope: registration.scope,
      states,
      installingScript: registration.installing?.scriptURL || '',
      waitingScript: registration.waiting?.scriptURL || '',
      activeScript: registration.active?.scriptURL || '',
      activeState: registration.active?.state || '',
      workerState: worker?.state || ''
    };
  }, { scopeUrl: expectedScope, registrationTimeoutMs: 12000 }), 15000, 'Service Worker registration');

  if (result.workerState === 'redundant' || result.states.includes('redundant')) {
    const snapshot = await registrationSnapshot(page, expectedScope);
    throw new Error(`Service Worker became redundant during installation: result=${JSON.stringify(result)} response=${JSON.stringify(response)} snapshot=${JSON.stringify(snapshot)}`);
  }
  return { ...result, response };
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
    diagnostics.push({
      attempt,
      navigationError,
      snapshot: await controllerSnapshot(page)
    });
  }
  throw new Error(`Navigations were not controlled by ${expectedScript}: ${JSON.stringify(diagnostics)}`);
}

async function ensureControlled(page, errors, observePage, options = {}) {
  const { controlledUrl = page.url() } = options;
  const directoryEntry = new URL('/cnc/', page.url()).href;
  const expectedScope = new URL('/cnc/', page.url()).href;
  const expectedScript = new URL('/cnc/sw.js', page.url()).href;
  const chromiumDiagnostics = await startChromiumServiceWorkerDiagnostics(page);

  try {
    if (!controlledUrl.startsWith(expectedScope)) {
      throw new Error(`Controlled URL outside Service Worker scope: ${controlledUrl}`);
    }

    if (page.url() !== directoryEntry) {
      await page.goto(directoryEntry, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }

    const registration = await registerExpectedWorker(page, expectedScope, expectedScript);
    console.log(`[PWA controller] registration=${JSON.stringify(registration)}`);

    if (await waitForController(page, expectedScript, 10000)) return page;

    try {
      return await openControlledNavigation(page, controlledUrl, expectedScript);
    } catch (error) {
      const snapshot = await controllerSnapshot(page);
      const response = await inspectWorkerResponse(page, expectedScript);
      throw new Error(`${error.message}; final=${JSON.stringify(snapshot)}; workerResponse=${JSON.stringify(response)}; chromiumServiceWorkerEvents=${JSON.stringify(chromiumDiagnostics.events)}`);
    }
  } finally {
    await chromiumDiagnostics.stop();
  }
}

module.exports = { ensureControlled, withTimeout };
