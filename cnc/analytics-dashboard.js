/**
 * analytics-dashboard.js
 * 分析仪表盘 — 统计卡片/柱状图/热门关键词/用户旅程/事件分类/导出
 * 全局对象: window.CNC_ANALYTICS_DASH
 */
(function () {
  'use strict';

  if (window.CNC_ANALYTICS_DASH) return;

  function _getTracker() {
    return window.CNC_ANALYTICS;
  }

  function _resolveContainer(container) {
    if (!container) return null;
    return (typeof container === 'string') ? document.querySelector(container) : container;
  }

  function renderDashboard(container) {
    var el = _resolveContainer(container);
    if (!el) return;
    var tracker = _getTracker();
    var report = tracker ? tracker.getAnalyticsReport() : {
      totalEvents: 0, pageviews: 0, searches: 0, clicks: 0, timeSpentEvents: 0,
      topKeywords: [], topKeywordsCount: [], topPages: [], topPagesCount: [],
      topClicks: {}, dailyActivity: {}, sessionDurationMinutes: 0,
      firstEvent: null, lastEvent: null, storageEstimate: '0 bytes'
    };

    var html = '<div class="analytics-dashboard">';
    html += '<div class="analytics-header"><h3>用户行为分析</h3><span class="analytics-updated">会话时长: ' + report.sessionDurationMinutes + ' 分钟 | 存储: ' + report.storageEstimate + '</span></div>';

    html += '<div class="analytics-grid">';
    html += _statCard('📄', '页面访问', report.pageviews);
    html += _statCard('🔍', '搜索次数', report.searches);
    html += _statCard('👆', '点击次数', report.clicks);
    html += _statCard('⏱', '停留事件', report.timeSpentEvents);
    html += _statCard('📊', '总事件', report.totalEvents);
    html += '</div>';

    html += '<div class="analytics-section"><h4>热门搜索关键词</h4>';
    html += (report.topKeywords.length > 0)
      ? _renderBarChart(report.topKeywords.slice(0, 8), report.topKeywordsCount.slice(0, 8), '搜索')
      : '<p class="analytics-empty">暂无搜索数据</p>';
    html += '</div>';

    html += '<div class="analytics-section"><h4>热门访问页面</h4>';
    html += (report.topPages.length > 0)
      ? _renderBarChart(report.topPages.slice(0, 8), report.topPagesCount.slice(0, 8), '次')
      : '<p class="analytics-empty">暂无页面访问数据</p>';
    html += '</div>';

    html += '<div class="analytics-section"><h4>事件分类分布</h4>' + _renderPieChart(report.pageviews, report.searches, report.clicks, report.timeSpentEvents) + '</div>';

    html += '<div class="analytics-two-column">';
    html += '<div class="analytics-section"><h4>近期活动</h4>' + _renderTimeline(report) + '</div>';
    html += '<div class="analytics-section"><h4>每日活动</h4>' + _renderDailyHeatmap(report.dailyActivity) + '</div>';
    html += '</div>';

    html += '<div class="analytics-actions"><button class="primary-button" id="analytics-export-btn">导出数据</button><button class="ghost-button" id="analytics-clear-btn">清空数据</button></div>';
    html += '</div>';
    el.innerHTML = html;

    _bindActions(el);
  }

  function renderUsageChart(container) {
    renderDashboard(container);
  }

  function renderHotKeywords(container) {
    var el = _resolveContainer(container);
    if (!el) return;
    var tracker = _getTracker();
    var report = tracker ? tracker.getAnalyticsReport() : { topKeywords: [] };
    if (report.topKeywords.length > 0) {
      var html = '<div class="analytics-hotkeywords">';
      for (var i = 0; i < Math.min(report.topKeywords.length, 20); i++) {
        html += '<span class="hotkeyword-badge" data-rank="' + (i + 1) + '">' + _escape(report.topKeywords[i]) + ' (' + report.topKeywordsCount[i] + ')</span>';
      }
      html += '</div>';
      el.innerHTML = html;
    } else {
      el.innerHTML = '<p class="analytics-empty">暂无搜索数据，开始搜索后会在这里显示热门关键词</p>';
    }
  }

  function renderUserJourney(container) {
    var el = _resolveContainer(container);
    if (!el) return;
    var tracker = _getTracker();
    var events = tracker ? tracker.exportAnalytics().events || [] : [];
    var recent = events.slice(-30);
    if (recent.length === 0) {
      el.innerHTML = '<div class="analytics-journey"><h4>最近操作</h4><p class="analytics-empty">暂无操作记录</p></div>';
      return;
    }
    var html = '<div class="analytics-journey"><h4>最近操作（最新 ' + recent.length + ' 条）</h4><div class="journey-list">';
    for (var i = recent.length - 1; i >= 0; i--) {
      var e = recent[i];
      var icon = e.type === 'pageview' ? '📄' : e.type === 'search' ? '🔍' : e.type === 'click' ? '👆' : '⏱';
      var label = e.page || e.keyword || e.elementId || e.section || '';
      if (label.length > 40) label = label.substring(0, 40) + '...';
      html += '<div class="journey-item"><span class="journey-icon">' + icon + '</span>';
      html += '<span class="journey-type">' + e.type + '</span>';
      html += '<span class="journey-detail">' + _escape(label) + '</span>';
      html += '<span class="journey-time">' + _formatTime(e.timestamp) + '</span></div>';
    }
    html += '</div></div>';
    el.innerHTML = html;
  }

  function _statCard(icon, label, value) {
    return '<div class="analytics-stat-card"><div class="stat-icon">' + icon + '</div><div class="stat-body"><strong>' + value + '</strong><span>' + label + '</span></div></div>';
  }

  function _renderBarChart(labels, values, unit) {
    unit = unit || '';
    var max = 1;
    for (var i = 0; i < values.length; i++) { if (values[i] > max) max = values[i]; }
    var html = '<div class="analytics-barchart">';
    for (var j = 0; j < labels.length; j++) {
      var pct = (values[j] / max) * 100;
      var label = labels[j].length > 16 ? labels[j].substring(0, 16) + '...' : labels[j];
      html += '<div class="bar-row"><span class="bar-label" title="' + _escape(labels[j]) + '">' + _escape(label) + '</span>';
      html += '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%"></div></div>';
      html += '<span class="bar-value">' + values[j] + unit + '</span></div>';
    }
    html += '</div>';
    return html;
  }

  function _renderPieChart(pv, sr, cl, ts) {
    var total = pv + sr + cl + ts;
    if (total === 0) return '<p class="analytics-empty">暂无事件数据</p>';
    var items = [
      { label: '页面访问', value: pv, color: '#cf6d36' },
      { label: '搜索', value: sr, color: '#2980b9' },
      { label: '点击', value: cl, color: '#27ae60' },
      { label: '停留', value: ts, color: '#8e44ad' }
    ];
    var html = '<div class="analytics-pie-legend">';
    for (var i = 0; i < items.length; i++) {
      var pct = Math.round(items[i].value / total * 100);
      html += '<div class="pie-legend-item"><span class="pie-dot" style="background:' + items[i].color + '"></span>' + items[i].label + ': ' + items[i].value + ' (' + pct + '%)</div>';
    }
    html += '</div>';
    return html;
  }

  function _renderTimeline(report) {
    if (!report.firstEvent) return '<p class="analytics-empty">无事件记录</p>';
    return '<div class="analytics-timeline"><p>首次: ' + (report.firstEvent || '无') + '</p><p>最近: ' + (report.lastEvent || '无') + '</p></div>';
  }

  function _renderDailyHeatmap(daily) {
    var days = Object.keys(daily);
    if (days.length === 0) return '<p class="analytics-empty">暂无每日数据</p>';
    var max = 1;
    for (var i = 0; i < days.length; i++) { if (daily[days[i]] > max) max = daily[days[i]]; }
    var html = '<div class="analytics-heatmap">';
    var sorted = days.sort();
    for (var j = 0; j < sorted.length; j++) {
      var intensity = Math.round((daily[sorted[j]] / max) * 100);
      html += '<div class="heatmap-day" title="' + sorted[j] + ': ' + daily[sorted[j]] + ' 事件" style="opacity:' + (0.3 + intensity / 100 * 0.7) + '">' + sorted[j].substring(5) + '</div>';
    }
    html += '</div>';
    return html;
  }

  function _bindActions(container) {
    var exportBtn = container.querySelector('#analytics-export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        var tracker = _getTracker();
        if (!tracker) return;
        var data = tracker.exportAnalytics();
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'cnc-analytics-export-' + new Date().toISOString().substring(0, 10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }
    var clearBtn = container.querySelector('#analytics-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        if (confirm('确定清空所有分析数据？此操作不可撤销。')) {
          var tracker = _getTracker();
          if (tracker) { tracker.clearAnalytics(); renderDashboard(container); }
        }
      });
    }
  }

  function _formatTime(ts) {
    if (!ts) return '';
    var diff = Date.now() - ts;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    return Math.floor(diff / 86400000) + '天前';
  }

  function _escape(text) {
    if (text === null || text === undefined) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(String(text)));
    return d.innerHTML;
  }

  window.CNC_ANALYTICS_DASH = {
    renderDashboard: renderDashboard,
    renderUsageChart: renderUsageChart,
    renderHotKeywords: renderHotKeywords,
    renderUserJourney: renderUserJourney
  };

  console.log('[CNC_ANALYTICS_DASH] 分析仪表盘已加载。');
})();
