/**
 * runtime-env-detector.js
 * 环境检测模块 — 检测浏览器运行环境：协议、主机、浏览器类型、能力
 * 全局对象: window.CNC_ENV
 * 可在浏览器控制台直接调用:
 *   window.CNC_ENV.detectProtocol()
 *   window.CNC_ENV.getEnvironmentInfo()
 */
(function () {
  'use strict';

  // 若已存在则跳过
  if (window.CNC_ENV) return;

  // ========================================
  // 私有缓存：检测结果只执行一次
  // ========================================
  var _protocol = null;
  var _hostInfo = null;
  var _browserInfo = null;
  var _capabilities = null;

  /**
   * 检测协议类型
   * 返回值: 'file' | 'http' | 'https' | 'unknown'
   */
  function detectProtocol() {
    if (_protocol) return _protocol;
    var p = window.location.protocol;
    if (p === 'file:') _protocol = 'file';
    else if (p === 'http:') _protocol = 'http';
    else if (p === 'https:') _protocol = 'https';
    else _protocol = 'unknown';
    return _protocol;
  }

  /**
   * 检测主机信息
   * 返回值: { hostname, port, origin, isLocalhost, isIP, isCustomDomain }
   */
  function detectHost() {
    if (_hostInfo) return _hostInfo;
    var loc = window.location;
    var hostname = loc.hostname;
    var isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
    var isIP = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname);
    _hostInfo = {
      hostname: hostname,
      port: loc.port,
      origin: loc.origin,
      isLocalhost: isLocalhost,
      isIP: isIP,
      isCustomDomain: !isLocalhost && !isIP
    };
    return _hostInfo;
  }

  /**
   * 检测浏览器类型
   * 返回值: { userAgent, isChrome, isFirefox, isSafari, isEdge, isIE, isMobile }
   */
  function detectBrowser() {
    if (_browserInfo) return _browserInfo;
    var ua = navigator.userAgent || '';
    _browserInfo = {
      userAgent: ua,
      isChrome: /Chrome/.test(ua) && !/Edge/.test(ua),
      isFirefox: /Firefox/.test(ua),
      isSafari: /Safari/.test(ua) && !/Chrome/.test(ua),
      isEdge: /Edge/.test(ua),
      isIE: /Trident/.test(ua),
      isMobile: /Mobile|Android|iPhone|iPad|iPod/.test(ua)
    };
    return _browserInfo;
  }

  /**
   * 检测浏览器能力
   * 返回值: { fetch, serviceWorker, localStorage, sessionStorage, webWorker, cacheAPI, webGL }
   */
  function detectCapabilities() {
    if (_capabilities) return _capabilities;
    var isFile = detectProtocol() === 'file';
    _capabilities = {
      fetch: typeof fetch !== 'undefined' && !isFile,
      serviceWorker: 'serviceWorker' in navigator && !isFile,
      localStorage: typeof localStorage !== 'undefined',
      sessionStorage: typeof sessionStorage !== 'undefined',
      webWorker: typeof Worker !== 'undefined',
      cacheAPI: typeof caches !== 'undefined',
      webGL: (function () {
        try {
          var c = document.createElement('canvas');
          return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
        } catch (e) { return false; }
      })()
    };
    return _capabilities;
  }

  /**
   * 获取当前运行模式
   * 返回值: 'file-local' | 'localhost' | 'web' | 'unknown'
   */
  function getMode() {
    var proto = detectProtocol();
    if (proto === 'file') return 'file-local';
    var host = detectHost();
    if (host.isLocalhost) return 'localhost';
    if (proto === 'http' || proto === 'https') return 'web';
    return 'unknown';
  }

  /**
   * 判断当前是否支持 fetch
   */
  function supportsFetch() {
    return detectCapabilities().fetch;
  }

  /**
   * 判断当前是否支持 Service Worker
   */
  function supportsServiceWorker() {
    return detectCapabilities().serviceWorker;
  }

  /**
   * 获取完整环境信息对象
   */
  function getEnvironmentInfo() {
    return {
      protocol: detectProtocol(),
      host: detectHost(),
      browser: detectBrowser(),
      capabilities: detectCapabilities(),
      mode: getMode(),
      timestamp: new Date().toISOString(),
      url: window.location.href,
      language: navigator.language || '',
      platform: navigator.platform || '',
      cookieEnabled: navigator.cookieEnabled
    };
  }

  /**
   * 快速判断文件是否能通过 fetch 加载
   * 在 file:// 模式下始终返回 false，其他模式返回 true
   */
  function canFetch() {
    return detectProtocol() !== 'file';
  }

  /**
   * 获取推荐的数据加载策略
   * 返回值: 'script-tag' | 'fetch' | 'mixed'
   */
  function getRecommendedStrategy() {
    var mode = getMode();
    if (mode === 'file-local') return 'script-tag';
    if (mode === 'localhost') return 'fetch';
    return 'mixed';
  }

  // ========================================
  // 导出全局对象
  // ========================================
  window.CNC_ENV = {
    detectProtocol: detectProtocol,
    detectHost: detectHost,
    detectBrowser: detectBrowser,
    detectCapabilities: detectCapabilities,
    getMode: getMode,
    supportsFetch: supportsFetch,
    supportsServiceWorker: supportsServiceWorker,
    getEnvironmentInfo: getEnvironmentInfo,
    canFetch: canFetch,
    getRecommendedStrategy: getRecommendedStrategy
  };

  // 初始化时打印一条日志
  console.log('[CNC_ENV] 环境检测模块已加载。模式: ' + getMode() + ', 协议: ' + detectProtocol() + ', fetch: ' + supportsFetch());
})();
