/**
 * performance-dashboard.js
 * 性能仪表盘 — 加载指标/资源分析/性能评分/警告/建议/FPS监控/历史对比
 * 全局对象: window.CNC_PERF_DASH
 */
(function () {
  'use strict';

  if (window.CNC_PERF_DASH) return;

  function _getMonitor() {
    return window.CNC_PERF;
  }

  function _resolveContainer(container) {
    if (!container) return null;
    return (typeof container === 'string') ? document.querySelector(container) : container;
  }

  function renderDashboard(container) {
    var el = _resolveContainer(container);
    if (!el) return;
    var monitor = _getMonitor();
    var report = monitor ? monitor.getPerformanceReport() : _emptyReport();
    var html = '<div class="perf-dashboard">';
    html += '<div class="perf-header"><h3>性能监控</h3><span class="perf-updated">运行时间: ' + report.uptimeSeconds + ' 秒 | 资源: ' + report.resourceCount + ' 个</span></div>';

    html += '<div class="perf-section"><h4>性能评分</h4>' + _renderScoreCard(report) + '</div>';
    html += '<div class="perf-metrics-grid">';
    html += _metricCard('页面加载', report.loadTime + 'ms', report.loadTimeRating, 'loadTime');
    html += _metricCard('DOM 解析', report.domReady + 'ms', report.domReadyRating, 'domReady');
    html += _metricCard('首字节(TTFB)', report.ttfbTime + 'ms', report.ttfbRating, 'ttfbTime');
    html += _metricCard('DNS 解析', report.dnsTime + 'ms', report.dnsRating, 'dnsTime');
    html += _metricCard('TCP 连接', report.tcpTime + 'ms', report.tcpRating, 'tcpTime');
    html += '</div>';

    html += '<div class="perf-two-column">';
    html += '<div class="perf-section"><h4>资源分析</h4>' + _renderResourceBreakdown(report) + '</div>';
    html += '<div class="perf-section"><h4>内存状态</h4>' + _renderMemory(report) + '</div>';
    html += '</div>';

    html += '<div class="perf-section"><h4>优化建议</h4>' + _renderSuggestions(report) + '</div>';

    html += '<div class="perf-actions"><button class="primary-button" id="perf-snapshot-btn">记录快照</button><button class="ghost-button" id="perf-fps-btn">启动FPS监控</button></div>';
    html += '</div>';
    el.innerHTML = html;
    _bindActions(el, container);
  }

  function renderMetrics(container, metrics) {
    var el = _resolveContainer(container);
    if (!el) return;
    if (!metrics || !metrics.pageLoad) { el.innerHTML = '<p>暂无性能数据</p>'; return; }
    var html = '<div class="perf-metrics-mini">';
    html += '<span>加载: ' + (metrics.pageLoad.loadTime || 0) + 'ms</span>';
    html += '<span>DOM: ' + (metrics.pageLoad.domReady || 0) + 'ms</span>';
    if (metrics.memory) html += '<span>内存: ' + _formatBytes(metrics.memory.usedJSHeapSize) + '</span>';
    html += '</div>';
    el.innerHTML = html;
  }

  function renderResourceChart(container) {
    renderDashboard(container);
  }

  function renderPerfScore(container) {
    var el = _resolveContainer(container);
    if (!el) return;
    var monitor = _getMonitor();
    var report = monitor ? monitor.getPerformanceReport() : _emptyReport();
    el.innerHTML = _renderScoreCard(report);
  }

  function _renderScoreCard(report) {
    var score = _calculateScore(report);
    var color = score >= 90 ? '#27ae60' : score >= 60 ? '#f39c12' : '#e74c3c';
    var label = score >= 90 ? '优秀' : score >= 60 ? '一般' : '较差';
    return '<div class="perf-score-circle" style="border-color:' + color + '"><span class="perf-score-value" style="color:' + color + '">' + score + '</span><span class="perf-score-label">' + label + '</span></div>';
  }

  function _calculateScore(report) {
    var score = 100;
    if (!report) return 0;
    if (report.loadTime > 2000) score -= 15;
    if (report.loadTime > 4000) score -= 15;
    if (report.ttfbTime > 800) score -= 10;
    if (report.ttfbTime > 1500) score -= 10;
    if (report.domReady > 1000) score -= 10;
    if (report.domReady > 2500) score -= 10;
    if (report.dnsTime > 200) score -= 5;
    if (report.tcpTime > 300) score -= 5;
    if (report.resourceCount > 50) score -= 5;
    if (report.totalResourceDuration > 5000) score -= 5;
    return Math.max(0, Math.min(100, score));
  }

  function _metricCard(label, value, rating, key) {
    var color = rating === '良好' ? '#27ae60' : rating === '一般' ? '#f39c12' : '#e74c3c';
    return '<div class="perf-metric-card"><div class="perf-metric-label">' + label + '</div><div class="perf-metric-value">' + value + '</div><div class="perf-metric-rating" style="color:' + color + '">' + rating + '</div></div>';
  }

  function _renderResourceBreakdown(report) {
    if (!report || report.resourceCount === 0) return '<p>暂无资源数据</p>';
    var breakdown = report.resourceBreakdown || {};
    var types = [
      { key: 'script', label: '脚本' },
      { key: 'link', label: '样式' },
      { key: 'img', label: '图片' },
      { key: 'fetch', label: 'Fetch' },
      { key: 'xmlhttprequest', label: 'XHR' },
      { key: 'other', label: '其他' }
    ];
    var html = '<div class="perf-resource-list">';
    for (var i = 0; i < types.length; i++) {
      var count = breakdown[types[i].key] || 0;
      if (count > 0) html += '<div class="resource-item"><span>' + types[i].label + '</span><span>' + count + ' 个</span></div>';
    }
    html += '<div class="resource-item total"><span>总计</span><span>' + report.resourceCount + ' 个, ' + _formatBytes(report.totalTransferSize) + ', ' + report.totalResourceDuration + 'ms</span></div>';
    html += '</div>';
    return html;
  }

  function _renderMemory(report) {
    if (!report || !report.memory) return '<p>不支持内存测量（需 Chrome/Edge）</p>';
    var m = report.memory;
    return '<div class="perf-memory"><p>已用: ' + _formatBytes(m.usedJSHeapSize) + ' / ' + _formatBytes(m.totalJSHeapSize) + '</p><p>限制: ' + _formatBytes(m.jsHeapSizeLimit) + '</p><div class="memory-bar"><div class="memory-fill" style="width:' + Math.min(m.usagePercent, 100) + '%"></div></div><p>使用率: ' + m.usagePercent + '%</p></div>';
  }

  function _renderSuggestions(report) {
    var suggestions = [];
    if (!report) return '<p>暂无数据</p>';
    if (report.loadTime > 2000) suggestions.push('页面加载时间较长 (' + report.loadTime + 'ms)，建议压缩资源、使用懒加载。');
    if (report.ttfbTime > 800) suggestions.push('首字节时间较久 (' + report.ttfbTime + 'ms)，建议优化后端响应或启用缓存。');
    if (report.domReady > 1500) suggestions.push('DOM 解析较慢 (' + report.domReady + 'ms)，建议减少阻塞脚本。');
    if (report.resourceCount > 40) suggestions.push('资源数量较多 (' + report.resourceCount + ' 个)，考虑合并文件或使用雪碧图。');
    if (report.totalTransferSize > 500000) suggestions.push('传输总量较大 (' + _formatBytes(report.totalTransferSize) + ')，启用 Gzip 压缩。');
    if (report.memory && report.memory.usagePercent > 80) suggestions.push('内存使用率较高 (' + report.memory.usagePercent + '%)，检查内存泄漏。');
    if (suggestions.length === 0) suggestions.push('性能表现良好，暂无优化建议。');
    var html = '<ul class="perf-suggestions">';
    for (var i = 0; i < suggestions.length; i++) {
      html += '<li>' + suggestions[i] + '</li>';
    }
    html += '</ul>';
    return html;
  }

  function _bindActions(el, container) {
    var snapBtn = el.querySelector('#perf-snapshot-btn');
    if (snapBtn) {
      snapBtn.addEventListener('click', function () {
        var monitor = _getMonitor();
        if (monitor) {
          var snap = monitor.captureSnapshot();
          snapBtn.textContent = '已记录 (' + new Date().toLocaleTimeString() + ')';
          setTimeout(function () { snapBtn.textContent = '记录快照'; }, 2000);
        }
      });
    }
    var fpsBtn = el.querySelector('#perf-fps-btn');
    if (fpsBtn) {
      fpsBtn.addEventListener('click', function () {
        var monitor = _getMonitor();
        if (!monitor) return;
        var isRunning = fpsBtn.textContent === '停止FPS';
        if (isRunning) {
          monitor.stopFPS();
          fpsBtn.textContent = '启动FPS监控';
          return;
        }
        monitor.measureFPS(function (fps) {
          fpsBtn.textContent = 'FPS: ' + fps;
        });
        fpsBtn.textContent = '停止FPS';
      });
    }
  }

  function _emptyReport() {
    return { loadTime: 0, loadTimeRating: '未知', domReady: 0, domReadyRating: '未知', ttfbTime: 0, ttfbRating: '未知', dnsTime: 0, dnsRating: '未知', tcpTime: 0, tcpRating: '未知', resourceCount: 0, totalResourceDuration: 0, totalTransferSize: 0, resourceBreakdown: {}, memory: null, snapshotsTaken: 0, uptimeSeconds: 0 };
  }

  function _formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    var units = ['B', 'KB', 'MB', 'GB'];
    var i = 0; var b = bytes;
    while (b >= 1024 && i < units.length - 1) { b /= 1024; i++; }
    return b.toFixed(1) + ' ' + units[i];
  }

  window.CNC_PERF_DASH = {
    renderDashboard: renderDashboard,
    renderMetrics: renderMetrics,
    renderResourceChart: renderResourceChart,
    renderPerfScore: renderPerfScore
  };

  console.log('[CNC_PERF_DASH] 性能仪表盘已加载。');
})();
