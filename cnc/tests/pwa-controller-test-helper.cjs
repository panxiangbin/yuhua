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
  const directoryEntry = new URL('/cnc/', page.url()).href;

  // 真实公网入口是 /cnc/。先从目录URL完成注册，避免部分Chromium环境
  // 将从 /cnc/index.html 发起的scope参数错误固化为文件级作用域。
  if (register && page.url() !== directoryEntry) {
    await page.goto(directoryEntry, { waitUntil: 'domcontentloaded', timeout: 30000 });
  }

  const activation = await withTimeout(page.evaluate(async shouldRegister => {
    if (!('serviceWorker' in navigator)) throw new Error('Service Worker unsupported');

    const expectedScope = new URL('./', location.href).href;
    const expectedScript = new URL('./sw.js', location.href).href;
    const registrations = await navigator.serviceWorker.getRegistrations();
    let registration = registrations.find(item => item.scope === expectedScope);

    if (!registration && shouldRegister) {
      await Promise.all(
        registrations
          .filter(item => item.scope.startsWith(location.origin) && item.scope !== expectedScope)
          .map(item => item.unregister())
      );

      registration = await navigator.serviceWorker.register('./sw.js', {
        scope: './',
        updateViaCache: 'none'
      });

      if (registration.scope !== expectedScope) {
        const returnedScope = registration.scope;
        await registration.unregister();
        throw new Error(`Service Worker scope mismatch after directory registration: expected ${expectedScope}, got ${returnedScope}`);
      }
    }

    if (!registration) throw new Error(`Service Worker registration missing for ${expectedScope}`);
    if (registration.scope !== expectedScope) {
      throw new Error(`Service Worker scope mismatch: expected ${expectedScope}, got ${registration.scope}`);
    }

    // 直接跟踪真实Worker对象。Actions里的Chromium偶发不会及时把
    // registration.active字段同步回来，但installing/waiting Worker本身会持续更新state。
    const discoveryDeadline = Date.now() + 10000;
    let worker = registration.installing || registration.waiting || registration.active;
    while (!worker && Date.now() < discoveryDeadline) {
      await registration.update().catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 100));
      worker = registration.installing || registration.waiting || registration.active;
    }
    if (!worker) {
      throw new Error(`Service Worker object missing for ${expectedScope}`);
    }

    const activationDeadline = Date.now() + 60000;
    while (worker.state !== 'activated') {
      if (worker.state === 'redundant') {
        throw new Error(`Service Worker became redundant for ${expectedScope}`);
      }
      if (Date.now() >= activationDeadline) {
        throw new Error(`Service Worker activation timeout for ${expectedScope}; worker=${worker.state}; installing=${registration.installing?.state || ''}; waiting=${registration.waiting?.state || ''}; active=${registration.active?.state || ''}`);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      worker = registration.active || registration.waiting || registration.installing || worker;
    }

    return {
      expectedScope,
      expectedScript,
      activeState: worker.state,
      activeScript: worker.scriptURL || ''
    };
  }, register), 75000, 'serviceWorker registration and activation');

  if (activation.activeState !== 'activated') {
    throw new Error(`Service Worker not activated: ${JSON.stringify(activation)}`);
  }
  if (activation.activeScript !== activation.expectedScript) {
    throw new Error(`Unexpected active Service Worker script: ${JSON.stringify(activation)}`);
  }
  if (!controlledUrl.startsWith(activation.expectedScope)) {
    throw new Error(`Controlled URL outside Service Worker scope: ${controlledUrl}`);
  }
  if (await waitForController(page, 3000)) return page;

  try {
    return await openControlledNavigation(page, controlledUrl);
  } catch (error) {
    const snapshot = await controllerSnapshot(page);
    throw new Error(`${error.message}; final=${JSON.stringify(snapshot)}`);
  }
}

module.exports = { ensureControlled, withTimeout };
