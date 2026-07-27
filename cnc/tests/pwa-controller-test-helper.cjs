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
  const activation = await withTimeout(page.evaluate(async shouldRegister => {
    if (!('serviceWorker' in navigator)) throw new Error('Service Worker unsupported');

    const scopePath = '/cnc/';
    const scriptPath = '/cnc/sw.js';
    const expectedScope = new URL(scopePath, location.origin).href;
    const expectedScript = new URL(scriptPath, location.origin).href;

    let registrations = await navigator.serviceWorker.getRegistrations();
    let registration = registrations.find(item => item.scope === expectedScope);

    if (!registration && shouldRegister) {
      // 测试使用临时浏览器档案。先清理同源错误作用域，避免首页自动注册
      // 与显式测试注册发生竞态，再用路径形式建立唯一的 /cnc/ 注册。
      await Promise.all(
        registrations
          .filter(item => item.scope.startsWith(location.origin) && item.scope !== expectedScope)
          .map(item => item.unregister())
      );

      registration = await navigator.serviceWorker.register(scriptPath, {
        scope: scopePath,
        updateViaCache: 'none'
      });

      if (registration.scope !== expectedScope) {
        const returnedScope = registration.scope;
        await registration.unregister();
        throw new Error(`Service Worker scope mismatch after clean registration: expected ${expectedScope}, got ${returnedScope}`);
      }
    }

    if (!registration) throw new Error(`Service Worker registration missing for ${expectedScope}`);
    if (registration.scope !== expectedScope) {
      throw new Error(`Service Worker scope mismatch: expected ${expectedScope}, got ${registration.scope}`);
    }

    const activeWorker = registration.active && registration.active.state === 'activated'
      ? registration.active
      : await new Promise((resolve, reject) => {
          let worker = registration.installing || registration.waiting || registration.active;
          const timeout = setTimeout(() => {
            cleanup();
            reject(new Error(`Service Worker activation timeout for ${expectedScope}`));
          }, 60000);
          const cleanup = () => {
            clearTimeout(timeout);
            registration.removeEventListener('updatefound', onUpdateFound);
            if (worker) worker.removeEventListener('statechange', onStateChange);
          };
          const onStateChange = () => {
            if (worker && worker.state === 'activated') {
              cleanup();
              resolve(worker);
            }
            if (worker && worker.state === 'redundant') {
              cleanup();
              reject(new Error(`Service Worker became redundant for ${expectedScope}`));
            }
          };
          const watch = candidate => {
            if (!candidate) return;
            if (worker) worker.removeEventListener('statechange', onStateChange);
            worker = candidate;
            if (worker.state === 'activated') {
              cleanup();
              resolve(worker);
              return;
            }
            worker.addEventListener('statechange', onStateChange);
          };
          const onUpdateFound = () => watch(registration.installing);
          registration.addEventListener('updatefound', onUpdateFound);
          watch(worker);
        });

    return {
      expectedScope,
      expectedScript,
      activeState: activeWorker.state,
      activeScript: activeWorker.scriptURL || ''
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
