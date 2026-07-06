/**
 * ui-search-suggestions.js
 * 实时搜索建议系统 — 生成建议/渲染下拉/高亮匹配/键盘导航
 * 全局对象: window.CNC_SEARCH_SUGGEST
 */
(function () {
  'use strict';

  if (window.CNC_SEARCH_SUGGEST) return;

  var _suggestionCache = {};
  var _selectedIndex = -1;
  var _currentSuggestions = [];
  var _debounceTimer = null;
  var _onSelectCallback = null;

  function generateSuggestions(keyword) {
    if (!keyword || keyword.trim().length < 2) return [];
    var kw = keyword.trim().toLowerCase();
    if (_suggestionCache[kw]) return _suggestionCache[kw];

    var suggestions = [];
    var source = _getKeywordSource();

    for (var i = 0; i < source.length; i++) {
      var item = source[i];
      if (_matches(item, kw)) {
        suggestions.push({ text: item, matchType: _getMatchType(item, kw) });
      }
      if (suggestions.length >= 10) break;
    }

    suggestions.sort(function (a, b) {
      var order = { prefix: 0, contains: 1, pinyin: 2, fuzzy: 3 };
      return (order[a.matchType] || 99) - (order[b.matchType] || 99);
    });

    _suggestionCache[kw] = suggestions;
    return suggestions;
  }

  function renderSuggestionDropdown(suggestions, inputEl) {
    _currentSuggestions = suggestions;
    _selectedIndex = -1;
    var existing = document.getElementById('search-suggestions-dropdown');
    if (existing) existing.parentNode.removeChild(existing);

    if (!suggestions || !suggestions.length) return null;

    var dropdown = document.createElement('div');
    dropdown.id = 'search-suggestions-dropdown';
    dropdown.className = 'search-suggestions-dropdown';
    dropdown.style.cssText = 'position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #e5e0db;border-radius:0 0 8px 8px;box-shadow:0 4px 12px rgba(0,0,0,0.1);z-index:1000;max-height:300px;overflow-y:auto;';

    for (var i = 0; i < suggestions.length; i++) {
      var item = document.createElement('div');
      item.className = 'suggestion-item';
      item.setAttribute('data-index', i);
      item.style.cssText = 'padding:10px 14px;cursor:pointer;font-size:14px;border-bottom:1px solid #f0ece8;display:flex;align-items:center;gap:8px;';
      item.innerHTML = '<span class="suggestion-icon">' + _getIcon(suggestions[i].matchType) + '</span><span class="suggestion-text">' + highlightMatch(suggestions[i].text, inputEl ? inputEl.value : '') + '</span><span class="suggestion-type" style="margin-left:auto;font-size:11px;color:#999;">' + _getLabel(suggestions[i].matchType) + '</span>';
      item.addEventListener('mousedown', function (e) {
        e.preventDefault();
        var idx = parseInt(this.getAttribute('data-index'), 10);
        selectSuggestion(idx);
      });
      item.addEventListener('mouseenter', function () {
        var idx = parseInt(this.getAttribute('data-index'), 10);
        _highlightItem(idx);
      });
      dropdown.appendChild(item);
    }

    var parent = (inputEl && inputEl.parentNode) || document.body;
    parent.style.position = parent.style.position || 'relative';
    parent.appendChild(dropdown);
    return dropdown;
  }

  function highlightMatch(text, keyword) {
    if (!keyword || !text) return _escape(text);
    var escaped = _escape(text);
    var kw = _escape(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    var regex = new RegExp('(' + kw + ')', 'gi');
    return escaped.replace(regex, '<mark class="suggestion-highlight">$1</mark>');
  }

  function selectSuggestion(index) {
    var sug = _currentSuggestions[index];
    if (!sug) return null;
    _selectedIndex = index;
    if (_onSelectCallback) _onSelectCallback(sug);
    var dropdown = document.getElementById('search-suggestions-dropdown');
    if (dropdown) dropdown.parentNode.removeChild(dropdown);
    trackSuggestionClick(sug);
    return sug;
  }

  function trackSuggestionClick(suggestion) {
    try {
      var history = JSON.parse(localStorage.getItem('cnc_suggestion_clicks') || '[]');
      history.push({ text: suggestion.text, matchType: suggestion.matchType, timestamp: Date.now() });
      if (history.length > 200) history = history.slice(-200);
      localStorage.setItem('cnc_suggestion_clicks', JSON.stringify(history));
    } catch (e) { /* ignore */ }
  }

  function onSelect(callback) {
    _onSelectCallback = callback;
  }

  function handleKeyboardNavigation(e, inputEl) {
    var dropdown = document.getElementById('search-suggestions-dropdown');
    if (!dropdown) return false;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _selectedIndex = Math.min(_selectedIndex + 1, _currentSuggestions.length - 1);
      _highlightItem(_selectedIndex);
      _scrollIntoView(dropdown, _selectedIndex);
      return true;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      _selectedIndex = Math.max(_selectedIndex - 1, 0);
      _highlightItem(_selectedIndex);
      _scrollIntoView(dropdown, _selectedIndex);
      return true;
    } else if (e.key === 'Enter' && _selectedIndex >= 0) {
      e.preventDefault();
      selectSuggestion(_selectedIndex);
      return true;
    } else if (e.key === 'Escape') {
      dropdown.parentNode.removeChild(dropdown);
      return true;
    }
    return false;
  }

  function debounceSuggest(keyword, inputEl, delay) {
    delay = delay || 200;
    if (_debounceTimer) clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(function () {
      var suggestions = generateSuggestions(keyword);
      renderSuggestionDropdown(suggestions, inputEl);
    }, delay);
  }

  function clearCache() {
    _suggestionCache = {};
  }

  function _getKeywordSource() {
    var source = [];
    if (window.CNC_SEARCH_ALIASES && CNC_SEARCH_ALIASES.ALIASES) {
      source = source.concat(Object.keys(CNC_SEARCH_ALIASES.ALIASES));
    }
    if (window.CNC_DATA) {
      if (CNC_DATA.SUGGESTIONS) source = source.concat(CNC_DATA.SUGGESTIONS);
      if (CNC_DATA.ALL_KEYWORDS) source = source.concat(CNC_DATA.ALL_KEYWORDS);
    }
    if (source.length < 20) {
      var fallback = ['G00','G01','G02','G03','G04','G54','G55','G90','G91','G81','G83','G41','G42','M03','M05','M06','M08','M09','M30','T01','T02','S500','S1000','F0.1','F0.2','报警','对刀','回零','坐标系','工件','刀具','主轴','进给','转速','螺距','螺纹','倒角','钻孔','镗孔','攻丝','铣削','车削','G代码','M代码','参数','刀具补偿','半径补偿','长度补偿','换刀','冷却液','急停','行程','原点','参考点','安全高度','切入切出','顺铣','逆铣','公差','配合','基准','图纸'];
      source = source.concat(fallback);
    }
    return source.filter(function (v, i, a) { return a.indexOf(v) === i; });
  }

  function _matches(item, keyword) {
    if (!item) return false;
    var lower = item.toLowerCase();
    if (lower.indexOf(keyword) === 0) return true;
    if (lower.indexOf(keyword) !== -1) return true;
    return false;
  }

  function _getMatchType(item, keyword) {
    var lower = item.toLowerCase();
    if (lower.indexOf(keyword) === 0) return 'prefix';
    if (lower.indexOf(keyword) !== -1) return 'contains';
    return 'fuzzy';
  }

  function _getIcon(matchType) {
    return matchType === 'prefix' ? '🔤' : matchType === 'contains' ? '🔍' : '💡';
  }

  function _getLabel(matchType) {
    return matchType === 'prefix' ? '前缀匹配' : matchType === 'contains' ? '包含' : '模糊';
  }

  function _highlightItem(index) {
    document.querySelectorAll('.suggestion-item').forEach(function (el) {
      var idx = parseInt(el.getAttribute('data-index'), 10);
      el.style.background = idx === index ? '#fef5e7' : 'transparent';
    });
  }

  function _scrollIntoView(dropdown, index) {
    var items = dropdown.querySelectorAll('.suggestion-item');
    if (items[index]) items[index].scrollIntoView({ block: 'nearest' });
  }

  function _escape(text) {
    if (!text) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(text));
    return d.innerHTML;
  }

  window.CNC_SEARCH_SUGGEST = {
    generateSuggestions: generateSuggestions,
    renderSuggestionDropdown: renderSuggestionDropdown,
    highlightMatch: highlightMatch,
    selectSuggestion: selectSuggestion,
    trackSuggestionClick: trackSuggestionClick,
    onSelect: onSelect,
    handleKeyboardNavigation: handleKeyboardNavigation,
    debounceSuggest: debounceSuggest,
    clearCache: clearCache
  };

  console.log('[CNC_SEARCH_SUGGEST] 实时搜索建议系统已加载。关键词源数: ' + _getKeywordSource().length);
})();
