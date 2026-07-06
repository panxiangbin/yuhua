(function () {
  'use strict';

  var CNC_RUNTIME = window.CNC_RUNTIME || {};
  if (CNC_RUNTIME.DataLoader) return;

  var env = detectEnvironment();
  var cache = {};
  var statusLog = [];
  var pendingLoads = {};

  function detectEnvironment() {
    var proto = window.location.protocol;
    var host = window.location.hostname;
    var isFile = proto === 'file:';
    var isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
    var isHttps = proto === 'https:';
    var isProduction = isHttps && !isLocalhost;

    var capabilities = {
      fetch: !isFile,
      scriptTag: true,
      localStorage: true,
      serviceWorker: isHttps || isLocalhost,
      cacheApi: isHttps || isLocalhost
    };

    return {
      mode: isFile ? 'file' : isLocalhost ? 'localhost' : 'production',
      protocol: proto,
      hostname: host,
      isFile: isFile,
      isLocalhost: isLocalhost,
      isProduction: isProduction,
      capabilities: capabilities
    };
  }

  function log(level, source, message, data) {
    var entry = {
      timestamp: new Date().toISOString(),
      level: level,
      source: source,
      message: message,
      data: data || null
    };
    statusLog.push(entry);
    if (level === 'error') {
      console.error('[RuntimeLoader] ' + source + ': ' + message, data || '');
    } else if (level === 'warn') {
      console.warn('[RuntimeLoader] ' + source + ': ' + message, data || '');
    } else {
      console.log('[RuntimeLoader] ' + source + ': ' + message, data || '');
    }
    return entry;
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var id = 'script-' + src.replace(/[^a-zA-Z0-9]/g, '-');
      if (cache[id]) {
        resolve(cache[id]);
        return;
      }
      if (pendingLoads[id]) {
        pendingLoads[id].push(function (result) { resolve(result); });
        return;
      }
      pendingLoads[id] = [];
      var script = document.createElement('script');
      script.src = src;
      script.onload = function () {
        cache[id] = true;
        log('info', 'loadScript', src + ' loaded');
        var callbacks = pendingLoads[id] || [];
        delete pendingLoads[id];
        resolve(true);
        callbacks.forEach(function (cb) { cb(true); });
      };
      script.onerror = function () {
        log('warn', 'loadScript', src + ' failed to load');
        var callbacks = pendingLoads[id] || [];
        delete pendingLoads[id];
        resolve(false);
        callbacks.forEach(function (cb) { cb(false); });
      };
      document.body.appendChild(script);
    });
  }

  function loadJSON(url) {
    var id = 'json-' + url.replace(/[^a-zA-Z0-9]/g, '-');
    if (cache[id] !== undefined) {
      return Promise.resolve(cache[id]);
    }
    if (pendingLoads[id]) {
      return new Promise(function (resolve) {
        pendingLoads[id].push(function (result) { resolve(result); });
      });
    }
    pendingLoads[id] = [];

    if (!env.capabilities.fetch) {
      log('warn', 'loadJSON', url + ' skipped (no fetch in file:// mode)');
      cache[id] = null;
      var callbacks = pendingLoads[id] || [];
      delete pendingLoads[id];
      callbacks.forEach(function (cb) { cb(null); });
      return Promise.resolve(null);
    }

    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (data) {
      cache[id] = data;
      log('info', 'loadJSON', url + ' loaded (' + (Array.isArray(data) ? data.length : Object.keys(data).length) + ' items)');
      var cbs = pendingLoads[id] || [];
      delete pendingLoads[id];
      cbs.forEach(function (cb) { cb(data); });
      return data;
    }).catch(function (err) {
      log('error', 'loadJSON', url + ' failed: ' + err.message);
      cache[id] = null;
      var cbs = pendingLoads[id] || [];
      delete pendingLoads[id];
      cbs.forEach(function (cb) { cb(null); });
      return null;
    });
  }

  function loadBatch(items) {
    return Promise.all(items.map(function (item) {
      if (item.type === 'script') return loadScript(item.path);
      if (item.type === 'json') return loadJSON(item.path);
      return Promise.resolve(null);
    }));
  }

  function getStatus() {
    return {
      env: env,
      cacheKeys: Object.keys(cache),
      cacheSize: Object.keys(cache).length,
      log: statusLog.slice(-50),
      errors: statusLog.filter(function (e) { return e.level === 'error'; }),
      warnings: statusLog.filter(function (e) { return e.level === 'warn'; })
    };
  }

  function getCapabilities() {
    return env.capabilities;
  }

  function getEnv() {
    return env;
  }

  function isReady() {
    return true;
  }

  CNC_RUNTIME.env = env;
  CNC_RUNTIME.DataLoader = {
    loadScript: loadScript,
    loadJSON: loadJSON,
    loadBatch: loadBatch,
    getStatus: getStatus,
    getCapabilities: getCapabilities,
    getEnv: getEnv,
    isReady: isReady,
    log: log,
    _cache: cache,
    _statusLog: statusLog
  };

  window.CNC_RUNTIME = CNC_RUNTIME;
  log('info', 'DataLoader', 'Initialized. Mode: ' + env.mode + ', fetch: ' + env.capabilities.fetch);
})();
