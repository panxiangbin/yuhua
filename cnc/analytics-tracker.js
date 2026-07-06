/**
 * analytics-tracker.js
 * 用户行为追踪引擎 — 页面访问/搜索/点击/停留时间/完整报告/导出/清理
 * 所有数据存储在 LocalStorage，上限 1000 条
 * 全局对象: window.CNC_ANALYTICS
 */
(function () {
  'use strict';

  if (window.CNC_ANALYTICS) return;

  var _events = [];
  var _sessionStart = Date.now();
  var _pageEnterTime = Date.now();
  var _currentPage = '';
  var _STORAGE_KEY = 'cnc_analytics_events';
  var _MAX_EVENTS = 1000;
  var _PRUNE_THRESHOLD = 800;
  var _isEnabled = true;

  function _load() {
    try {
      var raw = localStorage.getItem(_STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) _events = parsed;
      }
    } catch (e) {
      _events = [];
    }
  }

  function _save() {
    try {
      if (_events.length > _MAX_EVENTS) {
        _events = _events.slice(-_MAX_EVENTS);
      }
      localStorage.setItem(_STORAGE_KEY, JSON.stringify(_events));
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        _pruneStorage();
      }
    }
  }

  function _pruneStorage() {
    _events = _events.slice(-_PRUNE_THRESHOLD);
    try {
      localStorage.setItem(_STORAGE_KEY, JSON.stringify(_events));
    } catch (e) {
      _events = _events.slice(-500);
      try { localStorage.setItem(_STORAGE_KEY, JSON.stringify(_events)); } catch (e2) { }
    }
    console.warn('[CNC_ANALYTICS] 存储空间不足，已裁剪到 ' + _events.length + ' 条');
  }

  function _validateEvent(event) {
    if (!event || typeof event !== 'object') return false;
    if (!event.type) return false;
    var validTypes = ['pageview', 'search', 'click', 'timespent'];
    if (validTypes.indexOf(event.type) === -1) return false;
    return true;
  }

  function _record(event) {
    if (!_isEnabled) return false;
    if (!_validateEvent(event)) return false;
    event.timestamp = Date.now();
    event.sessionId = _sessionStart;
    _events.push(event);
    if (_events.length > _MAX_EVENTS) _events.shift();
    _save();
    return true;
  }

  function setEnabled(enabled) {
    _isEnabled = !!enabled;
  }

  function trackPageView(pageName) {
    var now = Date.now();
    var timeOnPrevPage = now - _pageEnterTime;
    if (_currentPage && timeOnPrevPage > 5) {
      _record({
        type: 'timespent',
        section: _currentPage,
        seconds: Math.round(timeOnPrevPage / 1000)
      });
    }
    _currentPage = pageName || window.location.pathname;
    _pageEnterTime = now;
    return _record({
      type: 'pageview',
      page: _currentPage,
      referrer: document.referrer || '',
      sessionDuration: now - _sessionStart
    });
  }

  function trackSearch(keyword, resultsCount) {
    if (!keyword || typeof keyword !== 'string') return false;
    var trimmed = keyword.trim();
    if (trimmed.length === 0) return false;
    return _record({
      type: 'search',
      keyword: trimmed,
      resultsCount: (typeof resultsCount === 'number' && resultsCount >= 0) ? resultsCount : 0
    });
  }

  function trackClick(elementId, context) {
    if (!elementId) return false;
    return _record({
      type: 'click',
      elementId: String(elementId).substring(0, 200),
      context: context || ''
    });
  }

  function trackTimeSpent(section, seconds) {
    if (!section) return false;
    var secs = Math.max(1, Math.round(seconds || 0));
    return _record({
      type: 'timespent',
      section: section,
      seconds: secs
    });
  }

  function getAnalyticsReport() {
    var total = _events.length;
    var pageviews = 0, searches = 0, clicks = 0, timespent = 0;
    var topKeywords = {};
    var topClicks = {};
    var pageViewsMap = {};
    var timeSpentMap = {};
    var dailyCounts = {};

    for (var i = 0; i < _events.length; i++) {
      var e = _events[i];
      if (e.type === 'pageview') { pageviews++; var p = e.page || 'unknown'; pageViewsMap[p] = (pageViewsMap[p] || 0) + 1; }
      else if (e.type === 'search') { searches++; var kw = e.keyword || ''; if (kw) topKeywords[kw] = (topKeywords[kw] || 0) + 1; }
      else if (e.type === 'click') { clicks++; var el = e.elementId || ''; if (el) topClicks[el] = (topClicks[el] || 0) + 1; }
      else if (e.type === 'timespent') { timespent++; var sec = e.seconds || 0; var s = e.section || 'unknown'; timeSpentMap[s] = (timeSpentMap[s] || 0) + sec; }

      if (e.timestamp) {
        var day = new Date(e.timestamp).toISOString().substring(0, 10);
        dailyCounts[day] = (dailyCounts[day] || 0) + 1;
      }
    }

    var sortedKw = Object.keys(topKeywords).sort(function (a, b) { return topKeywords[b] - topKeywords[a]; }).slice(0, 10);
    var sortedPages = Object.keys(pageViewsMap).sort(function (a, b) { return pageViewsMap[b] - pageViewsMap[a]; }).slice(0, 10);
    var totalTime = 0;
    for (var s in timeSpentMap) { if (timeSpentMap.hasOwnProperty(s)) totalTime += timeSpentMap[s]; }
    var sessionMinutes = Math.round((Date.now() - _sessionStart) / 60000);

    return {
      totalEvents: total,
      pageviews: pageviews,
      searches: searches,
      clicks: clicks,
      timeSpentEvents: timespent,
      totalTrackedSeconds: totalTime,
      sessionDurationMinutes: sessionMinutes,
      topKeywords: sortedKw,
      topKeywordsCount: sortedKw.map(function (k) { return topKeywords[k]; }),
      topPages: sortedPages,
      topPagesCount: sortedPages.map(function (p) { return pageViewsMap[p]; }),
      topClicks: topClicks,
      dailyActivity: dailyCounts,
      firstEvent: _events.length > 0 ? new Date(_events[0].timestamp).toISOString() : null,
      lastEvent: _events.length > 0 ? new Date(_events[_events.length - 1].timestamp).toISOString() : null,
      storageEstimate: JSON.stringify(_events).length + ' bytes'
    };
  }

  function getEventsByType(type) {
    if (!type) return _events.slice();
    return _events.filter(function (e) { return e.type === type; });
  }

  function getEventsByDateRange(start, end) {
    return _events.filter(function (e) {
      var ts = e.timestamp || 0;
      return ts >= start && ts <= end;
    });
  }

  function exportAnalytics() {
    return {
      exportedAt: new Date().toISOString(),
      sessionStart: new Date(_sessionStart).toISOString(),
      eventCount: _events.length,
      events: _events.slice(),
      report: getAnalyticsReport()
    };
  }

  function clearAnalytics() {
    _events = [];
    _sessionStart = Date.now();
    _save();
  }

  function getEventCount() {
    return _events.length;
  }

  function getSessionDuration() {
    return Math.round((Date.now() - _sessionStart) / 1000);
  }

  _load();

  window.CNC_ANALYTICS = {
    setEnabled: setEnabled,
    trackPageView: trackPageView,
    trackSearch: trackSearch,
    trackClick: trackClick,
    trackTimeSpent: trackTimeSpent,
    getAnalyticsReport: getAnalyticsReport,
    getEventsByType: getEventsByType,
    getEventsByDateRange: getEventsByDateRange,
    exportAnalytics: exportAnalytics,
    clearAnalytics: clearAnalytics,
    getEventCount: getEventCount,
    getSessionDuration: getSessionDuration
  };

  console.log('[CNC_ANALYTICS] 用户行为追踪已加载。已有 ' + _events.length + ' 条事件，当前会话已持续 ' + getSessionDuration() + ' 秒。');
})();
