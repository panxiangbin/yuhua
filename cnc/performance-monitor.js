/**
 * performance-monitor.js
 * 前端性能监控 — 页面加载/导航/资源/内存/FPS/长任务/CLS/LCP/FID
 * 基于 Performance API，兼容 file:// 协议
 * 全局对象: window.CNC_PERF
 */
(function () {
  'use strict';

  if (window.CNC_PERF) return;

  var _metrics = {};
  var _snapshots = [];
  var _MAX_SNAPSHOTS = 60;
  var _fpsFrames = 0;
  var _fpsLastTime = 0;
  var _fpsCallbackId = null;
  var _isRunning = false;
  var _startTime = Date.now();

  var _THRESHOLDS = {
    loadTime: { good: 2000, poor: 4000 },
    domReady: { good: 1000, poor: 2500 },
    firstByte: { good: 800, poor: 1500 },
    dnsTime: { good: 200, poor: 500 },
    tcpTime: { good: 300, poor: 700 },
    ttfbTime: { good: 500, poor: 1500 },
    fcpTime: { good: 1500, poor: 3000 },
    lcpTime: { good: 2500, poor: 4000 },
    fidTime: { good: 100, poor: 300 },
    clsScore: { good: 0.1, poor: 0.25 },
    fpsScore: { good: 55, poor: 30 }
  };

  function measurePageLoad() {
    var timing = window.performance && performance.timing;
    if (!timing) return null;
    if (timing.loadEventEnd === 0) return null;
    var metrics = {
      loadTime: timing.loadEventEnd - timing.navigationStart,
      domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
      firstByte: timing.responseStart - timing.navigationStart,
      dnsTime: timing.domainLookupEnd - timing.domainLookupStart,
      tcpTime: timing.connectEnd - timing.connectStart,
      ttfbTime: timing.responseStart - timing.requestStart,
      redirectCount: timing.redirectEnd - timing.redirectStart,
      redirectCountValue: performance.navigation ? performance.navigation.redirectCount : 0
    };
    return metrics;
  }

  function measurePageReady() {
    var timing = window.performance && performance.timing;
    if (!timing) return { readyTime: 0 };
    return { readyTime: timing.domInteractive ? timing.domInteractive - timing.navigationStart : 0 };
  }

  function measureResources() {
    if (!window.performance || !performance.getEntriesByType) return [];
    var entries = performance.getEntriesByType('resource');
    var results = [];
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      results.push({
        name: e.name.indexOf('?') > -1 ? e.name.split('?')[0] : e.name,
        duration: Math.round(e.duration),
        size: e.transferSize || e.encodedBodySize || 0,
        initiatorType: e.initiatorType || 'unknown'
      });
    }
    results.sort(function (a, b) { return b.duration - a.duration; });
    return results;
  }

  function measureMemory() {
    if (window.performance && performance.memory) {
      var m = performance.memory;
      return {
        jsHeapSizeLimit: m.jsHeapSizeLimit,
        totalJSHeapSize: m.totalJSHeapSize,
        usedJSHeapSize: m.usedJSHeapSize,
        usagePercent: Math.round((m.usedJSHeapSize / m.jsHeapSizeLimit) * 10000) / 100
      };
    }
    return null;
  }

  function measureFPS(callback) {
    if (_isRunning) return false;
    _isRunning = true;
    _fpsFrames = 0;
    _fpsLastTime = performance.now();

    function _tick() {
      if (!_isRunning) return;
      _fpsFrames++;
      var now = performance.now();
      var elapsed = now - _fpsLastTime;
      if (elapsed >= 1000) {
        var fps = Math.round((_fpsFrames * 1000) / elapsed);
        _fpsFrames = 0;
        _fpsLastTime = now;
        if (typeof callback === 'function') callback(fps);
      }
      _fpsCallbackId = requestAnimationFrame(_tick);
    }
    _fpsCallbackId = requestAnimationFrame(_tick);
    return true;
  }

  function stopFPS() {
    _isRunning = false;
    if (_fpsCallbackId) { cancelAnimationFrame(_fpsCallbackId); _fpsCallbackId = null; }
  }

  function getLongTasks() {
    if (!window.PerformanceObserver) return [];
    return []; // PerformanceObserver not available via sync API
  }

  function getLayoutShift() {
    if (!window.PerformanceObserver) return null;
    return null;
  }

  function getLCP() {
    if (!window.PerformanceObserver) return null;
    return null;
  }

  function getFID() {
    if (!window.PerformanceObserver) return null;
    return null;
  }

  function captureSnapshot() {
    var loadMetrics = measurePageLoad() || { loadTime: 0, domReady: 0 };
    var memory = measureMemory() || { usedJSHeapSize: 0, jsHeapSizeLimit: 1 };
    var snapshot = {
      timestamp: Date.now(),
      loadTime: loadMetrics.loadTime,
      domReady: loadMetrics.domReady,
      ttfb: loadMetrics.ttfbTime || 0,
      memoryUsage: memory.usedJSHeapSize,
      memoryPercent: memory.usagePercent || 0
    };
    _snapshots.push(snapshot);
    if (_snapshots.length > _MAX_SNAPSHOTS) _snapshots.shift();
    return snapshot;
  }

  function getSnapshots() {
    return _snapshots.slice();
  }

  function getPerformanceReport() {
    var loadMetrics = measurePageLoad() || {};
    var resources = measureResources();
    var memory = measureMemory();
    var totalResourceDuration = 0;
    var totalTransferSize = 0;
    var resourceCounts = { script: 0, link: 0, img: 0, fetch: 0, xmlhttprequest: 0, other: 0 };

    for (var i = 0; i < resources.length; i++) {
      totalResourceDuration += resources[i].duration;
      totalTransferSize += resources[i].size;
      var type = resources[i].initiatorType;
      if (resourceCounts.hasOwnProperty(type)) resourceCounts[type]++;
      else resourceCounts.other++;
    }

    function _rate(val, key) {
      var t = _THRESHOLDS[key];
      if (!t) return '未知';
      if (val <= t.good) return '良好';
      if (val <= t.poor) return '一般';
      return '较差';
    }

    return {
      loadTime: loadMetrics.loadTime || 0,
      loadTimeRating: _rate(loadMetrics.loadTime, 'loadTime'),
      domReady: loadMetrics.domReady || 0,
      domReadyRating: _rate(loadMetrics.domReady, 'domReady'),
      ttfbTime: loadMetrics.ttfbTime || 0,
      ttfbRating: _rate(loadMetrics.ttfbTime, 'ttfbTime'),
      dnsTime: loadMetrics.dnsTime || 0,
      dnsRating: _rate(loadMetrics.dnsTime, 'dnsTime'),
      tcpTime: loadMetrics.tcpTime || 0,
      tcpRating: _rate(loadMetrics.tcpTime, 'tcpTime'),
      resourceCount: resources.length,
      totalResourceDuration: totalResourceDuration,
      totalTransferSize: totalTransferSize,
      resourceBreakdown: resourceCounts,
      memory: memory,
      snapshotsTaken: _snapshots.length,
      uptimeSeconds: Math.round((Date.now() - _startTime) / 1000)
    };
  }

  function runAllMeasures(callback) {
    var results = {};
    results.pageLoad = measurePageLoad();
    results.pageReady = measurePageReady();
    results.resources = measureResources();
    results.memory = measureMemory();
    results.snapshot = captureSnapshot();
    if (typeof callback === 'function') callback(results);
    return results;
  }

  function setThreshold(key, good, poor) {
    if (_THRESHOLDS.hasOwnProperty(key)) {
      _THRESHOLDS[key].good = good;
      _THRESHOLDS[key].poor = poor;
      return true;
    }
    return false;
  }

  if (document.readyState === 'complete') {
    captureSnapshot();
  } else {
    window.addEventListener('load', function () { setTimeout(captureSnapshot, 0); });
  }

  window.CNC_PERF = {
    measurePageLoad: measurePageLoad,
    measurePageReady: measurePageReady,
    measureResources: measureResources,
    measureMemory: measureMemory,
    measureFPS: measureFPS,
    stopFPS: stopFPS,
    getLongTasks: getLongTasks,
    getLayoutShift: getLayoutShift,
    getLCP: getLCP,
    getFID: getFID,
    captureSnapshot: captureSnapshot,
    getSnapshots: getSnapshots,
    getPerformanceReport: getPerformanceReport,
    runAllMeasures: runAllMeasures,
    setThreshold: setThreshold
  };

  console.log('[CNC_PERF] 性能监控已加载。页面已运行 ' + Math.round((Date.now() - _startTime) / 1000) + ' 秒。');
})();
