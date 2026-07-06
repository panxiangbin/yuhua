/**
 * runtime-loader.js
 * 资源加载器模块 — 动态加载脚本/样式/JSON，支持超时、重试、诊断
 * 全局对象: window.CNC_LOADER
 * 可在浏览器控制台直接调用:
 *   window.CNC_LOADER.loadScript('./data.js')
 *   window.CNC_LOADER.loadJSON('./data.json')
 *   window.CNC_LOADER.diagnoseLoadFailure('./missing.js')
 */
(function () {
  'use strict';

  if (window.CNC_LOADER) return;

  // ========================================
  // 缓存
  // ========================================
  var _cache = {};
  var _pending = {};
  var _loadHistory = [];
  var _stats = { loaded: 0, failed: 0, total: 0 };

  // ========================================
  // 工具函数
  // ========================================

  /**
   * 获取超时时间
   */
  function getTimeout() {
    var cfg = window.CNC_CONFIG;
    return cfg ? cfg.getConfig('timeout') || 10000 : 10000;
  }

  /**
   * 获取重试次数
   */
  function getRetryCount() {
    var cfg = window.CNC_CONFIG;
    return cfg ? cfg.getConfig('retryCount') || 2 : 2;
  }

  /**
   * 获取重试间隔
   */
  function getRetryDelay() {
    var cfg = window.CNC_CONFIG;
    return cfg ? cfg.getConfig('retryDelay') || 1000 : 1000;
  }

  /**
   * 生成缓存键
   */
  function cacheKey(type, src) {
    return type + '::' + src;
  }

  /**
   * 记录加载历史
   */
  function record(type, src, status, detail) {
    var entry = {
      type: type,
      src: src,
      status: status,
      detail: detail || '',
      timestamp: new Date().toISOString()
    };
    _loadHistory.push(entry);
    if (_loadHistory.length > 1000) _loadHistory.shift();
    if (status === 'success') _stats.loaded++;
    else _stats.failed++;
    _stats.total++;
    return entry;
  }

  /**
   * 创建带超时的 Promise
   */
  function withTimeout(promise, ms, label) {
    ms = ms || getTimeout();
    var timer = null;
    var timeoutPromise = new Promise(function (_, reject) {
      timer = setTimeout(function () {
        reject(new Error('超时: ' + label + ' (' + ms + 'ms)'));
      }, ms);
    });
    return Promise.race([promise, timeoutPromise]).then(function (result) {
      clearTimeout(timer);
      return result;
    }, function (err) {
      clearTimeout(timer);
      throw err;
    });
  }

  // ========================================
  // 核心加载函数
  // ========================================

  /**
   * 动态加载 JavaScript 脚本
   * @param {string} src - 脚本路径
   * @param {object} options - { timeout, retry, onProgress }
   * @returns {Promise<boolean>}
   */
  function loadScript(src, options) {
    options = options || {};
    var key = cacheKey('script', src);
    if (_cache[key]) return Promise.resolve(true);
    if (_pending[key]) return _pending[key];

    var maxRetry = options.retry !== undefined ? options.retry : getRetryCount();
    var timeout = options.timeout || getTimeout();

    var attempt = function (retriesLeft) {
      if (options.onProgress) options.onProgress({ src: src, phase: 'loading', retriesLeft: retriesLeft });
      return new Promise(function (resolve, reject) {
        var script = document.createElement('script');
        script.src = src;
        script.async = false;
        script.onload = function () {
          _cache[key] = true;
          delete _pending[key];
          record('script', src, 'success');
          if (options.onProgress) options.onProgress({ src: src, phase: 'complete' });
          resolve(true);
        };
        script.onerror = function () {
          if (retriesLeft > 0) {
            console.warn('[CNC_LOADER] 脚本加载失败，重试中 (' + retriesLeft + '): ' + src);
            if (options.onProgress) options.onProgress({ src: src, phase: 'retry', retriesLeft: retriesLeft - 1 });
            setTimeout(function () {
              resolve(attempt(retriesLeft - 1));
            }, getRetryDelay());
          } else {
            delete _pending[key];
            record('script', src, 'failed', '加载失败，重试耗尽');
            if (options.onProgress) options.onProgress({ src: src, phase: 'failed' });
            resolve(false);
          }
        };
        document.body.appendChild(script);
      });
    };

    var promise = withTimeout(attempt(maxRetry), timeout, 'loadScript: ' + src);
    _pending[key] = promise;
    return promise;
  }

  /**
   * 动态加载 CSS 样式
   * @param {string} href - 样式路径
   * @param {object} options - { timeout, retry, onProgress }
   * @returns {Promise<boolean>}
   */
  function loadCSS(href, options) {
    options = options || {};
    var key = cacheKey('css', href);
    if (_cache[key]) return Promise.resolve(true);
    if (_pending[key]) return _pending[key];

    var maxRetry = options.retry !== undefined ? options.retry : getRetryCount();

    var attempt = function (retriesLeft) {
      return new Promise(function (resolve, reject) {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = function () {
          _cache[key] = true;
          delete _pending[key];
          record('css', href, 'success');
          resolve(true);
        };
        link.onerror = function () {
          if (retriesLeft > 0) {
            setTimeout(function () {
              resolve(attempt(retriesLeft - 1));
            }, getRetryDelay());
          } else {
            delete _pending[key];
            record('css', href, 'failed', '加载失败');
            resolve(false);
          }
        };
        document.head.appendChild(link);
      });
    };

    var promise = withTimeout(attempt(maxRetry), options.timeout || getTimeout(), 'loadCSS: ' + href);
    _pending[key] = promise;
    return promise;
  }

  /**
   * 加载 JSON 数据
   * @param {string} url - JSON 路径
   * @param {object} options - { timeout, retry, onProgress }
   * @returns {Promise<object|null>}
   */
  function loadJSON(url, options) {
    options = options || {};
    var key = cacheKey('json', url);
    if (_cache[key] !== undefined) return Promise.resolve(_cache[key]);
    if (_pending[key]) return _pending[key];

    var env = window.CNC_ENV;
    if (env && !env.canFetch()) {
      record('json', url, 'skipped', 'file:// 模式不支持 fetch');
      _cache[key] = null;
      return Promise.resolve(null);
    }

    var maxRetry = options.retry !== undefined ? options.retry : getRetryCount();

    var attempt = function (retriesLeft) {
      if (options.onProgress) options.onProgress({ src: url, phase: 'loading', retriesLeft: retriesLeft });
      return fetch(url).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + res.statusText);
        return res.json();
      }).then(function (data) {
        _cache[key] = data;
        delete _pending[key];
        record('json', url, 'success', Array.isArray(data) ? data.length + ' items' : typeof data);
        if (options.onProgress) options.onProgress({ src: url, phase: 'complete' });
        return data;
      }).catch(function (err) {
        if (retriesLeft > 0) {
          console.warn('[CNC_LOADER] JSON 加载失败，重试中 (' + retriesLeft + '): ' + url);
          return new Promise(function (resolve) {
            setTimeout(function () {
              resolve(attempt(retriesLeft - 1));
            }, getRetryDelay());
          });
        } else {
          delete _pending[key];
          _cache[key] = null;
          record('json', url, 'failed', err.message);
          return null;
        }
      });
    };

    var promise = withTimeout(attempt(maxRetry), options.timeout || getTimeout(), 'loadJSON: ' + url);
    _pending[key] = promise;
    return promise;
  }

  /**
   * 批量预加载资源
   * @param {Array} list - [{ type: 'script'|'css'|'json', src: '...', options: {} }]
   * @param {function} onProgress - (completed, total, item) => void
   * @returns {Promise<Array>}
   */
  function preloadResources(list, onProgress) {
    if (!list || !list.length) return Promise.resolve([]);
    var total = list.length;
    var results = [];
    var completed = 0;

    var promises = list.map(function (item) {
      var loader = null;
      if (item.type === 'script') loader = loadScript(item.src, item.options);
      else if (item.type === 'css') loader = loadCSS(item.href || item.src, item.options);
      else if (item.type === 'json') loader = loadJSON(item.src, item.options);
      else return Promise.resolve(null);

      return loader.then(function (result) {
        completed++;
        results.push({ type: item.type, src: item.src || item.href, success: !!result });
        if (onProgress) onProgress(completed, total, item);
        return result;
      });
    });

    return Promise.all(promises);
  }

  /**
   * 诊断资源加载失败原因
   * @param {string} resource - 资源路径
   * @returns {object} 诊断信息
   */
  function diagnoseLoadFailure(resource) {
    var info = {
      resource: resource,
      exists: false,
      protocolSupported: true,
      userAgent: navigator.userAgent,
      currentMode: window.CNC_ENV ? window.CNC_ENV.getMode() : 'unknown',
      canFetch: window.CNC_ENV ? window.CNC_ENV.canFetch() : false,
      history: _loadHistory.filter(function (h) { return h.src === resource; }),
      suggestions: []
    };

    // 检查协议
    var proto = window.CNC_ENV ? window.CNC_ENV.detectProtocol() : 'unknown';
    if (proto === 'file' && (resource.indexOf('.json') !== -1 || resource.indexOf('fetch') !== -1)) {
      info.protocolSupported = false;
      info.suggestions.push('file:// 模式不支持 fetch 加载 JSON 文件，请使用 script-tag 或切换到 HTTP 服务');
    }

    // 检查是否是相对路径
    if (resource.indexOf('./') === 0 || resource.indexOf('../') === 0) {
      if (proto === 'file') {
        info.suggestions.push('相对路径在 file:// 模式下可能无效，尝试使用完整路径');
      }
    }

    // 检查缓存
    var key = cacheKey('script', resource) || cacheKey('json', resource) || cacheKey('css', resource);
    if (_cache[key]) {
      info.suggestions.push('资源已在缓存中，但可能加载状态异常');
    }

    // 检查网络
    if (!navigator.onLine) {
      info.suggestions.push('浏览器处于离线状态，请检查网络连接');
    }

    // 检查跨域
    if (proto !== 'file' && resource.indexOf('http') === 0 && resource.indexOf(window.location.origin) !== 0) {
      info.suggestions.push('跨域资源可能需要 CORS 配置');
    }

    if (info.suggestions.length === 0) {
      info.suggestions.push('资源路径可能不正确，检查文件是否存在于指定位置');
    }

    return info;
  }

  /**
   * 获取加载统计
   */
  function getStats() {
    return {
      loaded: _stats.loaded,
      failed: _stats.failed,
      total: _stats.total,
      cacheSize: Object.keys(_cache).length,
      historyCount: _loadHistory.length
    };
  }

  /**
   * 获取加载历史
   */
  function getHistory(limit) {
    limit = limit || 50;
    return _loadHistory.slice(-limit);
  }

  /**
   * 清空缓存
   */
  function clearCache() {
    _cache = {};
    _pending = {};
    console.log('[CNC_LOADER] 缓存已清空');
  }

  // ========================================
  // 导出全局对象
  // ========================================
  window.CNC_LOADER = {
    loadScript: loadScript,
    loadCSS: loadCSS,
    loadJSON: loadJSON,
    preloadResources: preloadResources,
    diagnoseLoadFailure: diagnoseLoadFailure,
    getStats: getStats,
    getHistory: getHistory,
    clearCache: clearCache
  };

  console.log('[CNC_LOADER] 资源加载器已加载。超时: ' + getTimeout() + 'ms, 重试: ' + getRetryCount() + '次');
})();
