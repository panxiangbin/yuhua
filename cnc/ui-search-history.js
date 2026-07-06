/**
 * ui-search-history.js
 * 搜索历史管理系统 — 增删查/去重/排序/持久化
 * 全局对象: window.CNC_SEARCH_HISTORY
 */
(function () {
  'use strict';

  if (window.CNC_SEARCH_HISTORY) return;

  var _history = [];
  var _STORAGE_KEY = 'cnc_search_history';
  var _MAX_ITEMS = 50;

  function _load() {
    try {
      var data = localStorage.getItem(_STORAGE_KEY);
      if (data) _history = JSON.parse(data);
    } catch (e) { _history = []; }
  }

  function _save() {
    try { localStorage.setItem(_STORAGE_KEY, JSON.stringify(_history)); }
    catch (e) { console.warn('[CNC_SEARCH_HISTORY] 保存失败:', e.message); }
  }

  _load();

  function addToHistory(keyword) {
    if (!keyword || !keyword.trim()) return false;
    var kw = keyword.trim();
    _history = _history.filter(function (item) { return item.keyword !== kw; });
    _history.unshift({ keyword: kw, timestamp: Date.now() });
    if (_history.length > _MAX_ITEMS) _history = _history.slice(0, _MAX_ITEMS);
    _save();
    return true;
  }

  function getHistory(limit) {
    limit = limit || 20;
    return _history.slice(0, Math.min(limit, _history.length));
  }

  function clearHistory() {
    _history = [];
    _save();
  }

  function renderHistoryList(limit) {
    limit = limit || 10;
    var items = getHistory(limit);
    if (!items.length) return '<p class="history-empty">暂无搜索历史</p>';
    var html = '<div class="search-history-list" id="search-history-list">';
    html += '<div class="history-header"><span>搜索历史</span><button class="history-clear-btn ghost-button small" id="history-clear-btn">清空</button></div>';
    html += '<ul class="history-items">';
    for (var i = 0; i < items.length; i++) {
      var timeStr = _formatTime(items[i].timestamp);
      html += '<li class="history-item" data-keyword="' + _escape(items[i].keyword) + '">';
      html += '<span class="history-time">' + timeStr + '</span>';
      html += '<span class="history-keyword">' + _escape(items[i].keyword) + '</span>';
      html += '<button class="history-remove" data-keyword="' + _escape(items[i].keyword) + '" title="删除">×</button>';
      html += '</li>';
    }
    html += '</ul></div>';
    return html;
  }

  function removeHistoryItem(keyword) {
    var len = _history.length;
    _history = _history.filter(function (item) { return item.keyword !== keyword; });
    if (_history.length !== len) { _save(); return true; }
    return false;
  }

  function getHistoryCount() {
    return _history.length;
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
    if (!text) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(text));
    return d.innerHTML;
  }

  window.CNC_SEARCH_HISTORY = {
    addToHistory: addToHistory,
    getHistory: getHistory,
    clearHistory: clearHistory,
    renderHistoryList: renderHistoryList,
    removeHistoryItem: removeHistoryItem,
    getHistoryCount: getHistoryCount
  };

  console.log('[CNC_SEARCH_HISTORY] 搜索历史已加载。共 ' + _history.length + ' 条记录。');
})();
