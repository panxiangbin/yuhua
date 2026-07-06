/**
 * ui-search-highlights.js
 * 搜索结果高亮系统 — 关键词高亮/匹配导航/计数器
 * 全局对象: window.CNC_SEARCH_HIGHLIGHT
 */
(function () {
  'use strict';

  if (window.CNC_SEARCH_HIGHLIGHT) return;

  var _currentMatches = [];
  var _currentMatchIndex = -1;
  var _highlightedElements = [];

  function highlightKeywords(text, keywords) {
    if (!text || !keywords || !keywords.length) return text || '';
    var escapedText = _escape(text);
    for (var i = 0; i < keywords.length; i++) {
      var kw = keywords[i];
      if (!kw) continue;
      var escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      try {
        var regex = new RegExp('(' + escaped + ')', 'gi');
        escapedText = escapedText.replace(regex, '<mark class="search-highlight search-highlight-kw">$1</mark>');
      } catch (e) { /* ignore invalid regex */ }
    }
    return escapedText;
  }

  function highlightAllMatches(container, keyword) {
    if (!container || !keyword) return { count: 0 };
    _clearHighlights();

    var kw = keyword.trim();
    if (!kw) return { count: 0 };

    var treeWalker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
    var textNodes = [];
    while (treeWalker.nextNode()) { textNodes.push(treeWalker.currentNode); }

    var count = 0;
    var escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var regex;
    try { regex = new RegExp(escaped, 'gi'); }
    catch (e) { return { count: 0 }; }

    for (var i = 0; i < textNodes.length; i++) {
      var node = textNodes[i];
      if (!node.textContent || node.parentNode.tagName === 'SCRIPT' || node.parentNode.tagName === 'STYLE') continue;
      var matches = node.textContent.match(regex);
      if (!matches) continue;

      var span = document.createElement('span');
      var html = node.textContent.replace(regex, function (match) {
        count++;
        var id = 'search-match-' + count;
        return '<mark class="search-highlight search-highlight-match" id="' + id + '">' + match + '</mark>';
      });
      span.innerHTML = html;
      node.parentNode.replaceChild(span, node);
      _highlightedElements.push({ oldNode: node, newSpan: span });
    }

    _currentMatches = container.querySelectorAll('.search-highlight-match');
    _currentMatchIndex = -1;
    return { count: count, total: _currentMatches.length };
  }

  function scrollToNextMatch() {
    if (!_currentMatches.length) return null;
    _currentMatchIndex = (_currentMatchIndex + 1) % _currentMatches.length;
    var el = _currentMatches[_currentMatchIndex];
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('search-highlight-active');
    setTimeout(function () { el.classList.remove('search-highlight-active'); }, 2000);
    return _currentMatchIndex;
  }

  function scrollToPrevMatch() {
    if (!_currentMatches.length) return null;
    _currentMatchIndex = (_currentMatchIndex - 1 + _currentMatches.length) % _currentMatches.length;
    var el = _currentMatches[_currentMatchIndex];
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('search-highlight-active');
    setTimeout(function () { el.classList.remove('search-highlight-active'); }, 2000);
    return _currentMatchIndex;
  }

  function renderMatchCounter() {
    var total = _currentMatches.length;
    var current = _currentMatchIndex >= 0 ? _currentMatchIndex + 1 : 0;
    if (!total) return '<span class="match-counter">无匹配</span>';
    return '<span class="match-counter"><span class="match-current">' + current + '</span>/<span class="match-total">' + total + '</span> 个匹配 ' +
           '<button class="match-nav-btn match-prev" title="上一个">↑</button>' +
           '<button class="match-nav-btn match-next" title="下一个">↓</button></span>';
  }

  function clearHighlights() {
    _clearHighlights();
  }

  function _clearHighlights() {
    for (var i = _highlightedElements.length - 1; i >= 0; i--) {
      var entry = _highlightedElements[i];
      if (entry.newSpan && entry.newSpan.parentNode) {
        entry.newSpan.parentNode.replaceChild(entry.oldNode, entry.newSpan);
      }
    }
    _highlightedElements = [];
    _currentMatches = [];
    _currentMatchIndex = -1;
  }

  function _escape(text) {
    if (!text) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(text));
    return d.innerHTML;
  }

  window.CNC_SEARCH_HIGHLIGHT = {
    highlightKeywords: highlightKeywords,
    highlightAllMatches: highlightAllMatches,
    scrollToNextMatch: scrollToNextMatch,
    scrollToPrevMatch: scrollToPrevMatch,
    renderMatchCounter: renderMatchCounter,
    clearHighlights: clearHighlights
  };

  console.log('[CNC_SEARCH_HIGHLIGHT] 搜索高亮系统已加载。');
})();
