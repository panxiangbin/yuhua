(function () {
  'use strict';

  var DATA_DIR = './opencode_frontend_ready/';
  var FILES = {
    suggestions: 'search-suggestions.json',
    index: 'search-index-light.json',
    risk: 'risk-keywords.json',
    faq: 'faq-unified.json',
    lookup: 'entry-lookup-map.json'
  };

  function loadJSON(filename) {
    return fetch(DATA_DIR + filename).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).catch(function (e) {
      console.warn('[frontend-data] Failed to load ' + filename, e);
      return [];
    });
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function normalizeSearchText(value) {
    return String(value || '')
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/^([gm])0*([0-9]+)$/i, function (_, letter, digits) {
        return letter.toLowerCase() + String(Number(digits)).padStart(2, '0');
      });
  }

  function buildRiskMap(arr) {
    var map = {};
    arr.forEach(function (item) {
      if (!item || typeof item.keyword !== 'string') return;
      map[item.keyword.toLowerCase()] = item;
    });
    return map;
  }

  function normalizeKeywords(value) {
    if (Array.isArray(value)) return value.filter(function (item) { return typeof item === 'string' && item.trim(); });
    if (typeof value === 'string') {
      return value.split(/[，,、|;；\s]+/).map(function (item) { return item.trim(); }).filter(Boolean);
    }
    return [];
  }

  function buildKeywordIndex(arr) {
    var map = {};
    arr.forEach(function (item) {
      if (!item) return;
      normalizeKeywords(item.keywords).forEach(function (kw) {
        var key = kw.toLowerCase();
        if (!map[key]) map[key] = [];
        map[key].push(item);
      });
    });
    return map;
  }

  function setSuggestionVisibility(boxEl, visible) {
    if (!boxEl) return;
    boxEl.style.display = visible ? 'block' : 'none';
    boxEl.hidden = !visible;
    boxEl.setAttribute('aria-hidden', visible ? 'false' : 'true');
  }

  window.CNC_FRONTEND = {};

  window.CNC_FRONTEND.init = function () {
    return Promise.all([
      loadJSON(FILES.suggestions),
      loadJSON(FILES.index),
      loadJSON(FILES.risk),
      loadJSON(FILES.faq),
      loadJSON(FILES.lookup)
    ]).then(function (results) {
      window.CNC_FRONTEND.suggestions = Array.isArray(results[0]) ? results[0] : [];
      window.CNC_FRONTEND.index = Array.isArray(results[1]) ? results[1] : [];
      window.CNC_FRONTEND.riskKeywords = Array.isArray(results[2]) ? results[2] : [];
      window.CNC_FRONTEND.faq = Array.isArray(results[3]) ? results[3] : [];
      window.CNC_FRONTEND.lookup = Array.isArray(results[4]) ? results[4] : [];

      window.CNC_FRONTEND.riskMap = buildRiskMap(window.CNC_FRONTEND.riskKeywords);
      window.CNC_FRONTEND.keywordIndex = buildKeywordIndex(window.CNC_FRONTEND.index);

      window.CNC_FRONTEND.idIndex = {};
      window.CNC_FRONTEND.index.forEach(function (item) {
        if (item && item.id) window.CNC_FRONTEND.idIndex[item.id] = item;
      });

      if (window.CNC_RUNTIME) {
        window.CNC_RUNTIME._frontendData = {
          suggestions: window.CNC_FRONTEND.suggestions,
          index: window.CNC_FRONTEND.index,
          riskKeywords: window.CNC_FRONTEND.riskKeywords,
          faq: window.CNC_FRONTEND.faq,
          lookup: window.CNC_FRONTEND.lookup
        };
      }

      return true;
    });
  };

  window.CNC_FRONTEND.getSuggestions = function (prefix, maxResults) {
    if (!prefix || !window.CNC_FRONTEND.suggestions) return [];
    maxResults = maxResults || 6;
    var q = normalizeSearchText(prefix);
    return window.CNC_FRONTEND.suggestions
      .filter(function (item) {
        return item && typeof item.keyword === 'string' && normalizeSearchText(item.keyword).indexOf(q) !== -1;
      })
      .map(function (item) {
        var normalized = normalizeSearchText(item.keyword);
        var matchRank = normalized === q ? 0 : normalized.indexOf(q) === 0 ? 1 : 2;
        return {
          keyword: item.keyword,
          type: item.type,
          category: item.category,
          priority: item.priority,
          matchRank: matchRank
        };
      })
      .sort(function (a, b) {
        return a.matchRank - b.matchRank ||
          Number(a.priority || 99) - Number(b.priority || 99) ||
          a.keyword.localeCompare(b.keyword, 'zh-CN', { numeric: true, sensitivity: 'base' });
      })
      .slice(0, maxResults);
  };

  window.CNC_FRONTEND.getRiskFor = function (text) {
    if (!text || !window.CNC_FRONTEND.riskMap) return null;
    var q = text.toLowerCase();
    var keys = Object.keys(window.CNC_FRONTEND.riskMap);
    for (var i = 0; i < keys.length; i++) {
      if (q.indexOf(keys[i]) !== -1) return window.CNC_FRONTEND.riskMap[keys[i]];
    }
    return null;
  };

  window.CNC_FRONTEND.getIndexMatches = function (keyword) {
    if (!keyword || !window.CNC_FRONTEND.keywordIndex) return [];
    var q = keyword.toLowerCase();
    var seen = {};
    var results = [];
    var keys = Object.keys(window.CNC_FRONTEND.keywordIndex);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf(q) !== -1 || q.indexOf(keys[i]) !== -1) {
        var items = window.CNC_FRONTEND.keywordIndex[keys[i]];
        for (var j = 0; j < items.length; j++) {
          var item = items[j];
          if (item && !seen[item.id]) {
            seen[item.id] = true;
            results.push(item);
          }
        }
      }
    }
    return results.slice(0, 10);
  };

  window.CNC_FRONTEND.getFAQs = function (faqType, maxResults) {
    var faqs = window.CNC_FRONTEND.faq || [];
    maxResults = maxResults || 50;
    if (faqType && faqType !== 'all') {
      return faqs.filter(function (f) { return f.faqType === faqType; }).slice(0, maxResults);
    }
    return faqs.slice(0, maxResults);
  };

  window.CNC_FRONTEND.closeSuggestionBox = function (boxEl) {
    if (!boxEl) boxEl = document.getElementById('search-suggestions');
    if (!boxEl) return;
    setSuggestionVisibility(boxEl, false);
  };

  window.CNC_FRONTEND.renderSuggestionBox = function (inputEl, boxEl) {
    if (!inputEl || !boxEl || inputEl.dataset.cncSuggestionBound === 'true') return;
    inputEl.dataset.cncSuggestionBound = 'true';
    boxEl.setAttribute('role', 'listbox');
    boxEl.setAttribute('aria-label', '搜索建议');
    inputEl.setAttribute('role', 'combobox');
    inputEl.setAttribute('aria-autocomplete', 'list');
    inputEl.setAttribute('aria-controls', boxEl.id || 'search-suggestions');
    inputEl.setAttribute('aria-expanded', 'false');

    var activeIndex = -1;

    function optionButtons() {
      return Array.prototype.slice.call(boxEl.querySelectorAll('.suggestion-item'));
    }

    function resetActive() {
      activeIndex = -1;
      optionButtons().forEach(function (button) {
        button.classList.remove('active');
        button.setAttribute('aria-selected', 'false');
      });
      inputEl.removeAttribute('aria-activedescendant');
    }

    function syncExpanded(visible) {
      setSuggestionVisibility(boxEl, visible);
      inputEl.setAttribute('aria-expanded', visible ? 'true' : 'false');
      if (!visible) resetActive();
    }

    function setActive(nextIndex) {
      var buttons = optionButtons();
      if (!buttons.length) return;
      activeIndex = (nextIndex + buttons.length) % buttons.length;
      buttons.forEach(function (button, index) {
        var active = index === activeIndex;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      var current = buttons[activeIndex];
      inputEl.setAttribute('aria-activedescendant', current.id);
      current.scrollIntoView({ block: 'nearest' });
    }

    function choose(button) {
      if (!button) return;
      var keyword = button.dataset.suggestion || '';
      inputEl.value = keyword;
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      boxEl.innerHTML = '';
      syncExpanded(false);
      inputEl.focus();
    }

    syncExpanded(false);

    inputEl.addEventListener('input', function () {
      var val = inputEl.value.trim();
      resetActive();
      if (val.length < 1 || !window.CNC_FRONTEND.suggestions) {
        boxEl.innerHTML = '';
        syncExpanded(false);
        return;
      }
      var items = window.CNC_FRONTEND.getSuggestions(val, 4);
      if (!items.length) {
        boxEl.innerHTML = '';
        syncExpanded(false);
        return;
      }
      boxEl.innerHTML = items.map(function (item, index) {
        var type = String(item.type || 'other');
        var typeLabel = type === 'gcode' ? 'G' : type === 'operation' ? 'OP' : type === 'alarm' ? 'AL' : type === 'param' ? 'PM' : 'OT';
        return '<button id="cnc-search-option-' + index + '" type="button" role="option" aria-selected="false" class="suggestion-item" data-suggestion="' +
          escapeHtml(item.keyword) + '"><span class="suggestion-type-badge suggestion-type-' + escapeHtml(type) + '">' +
          typeLabel + '</span><span class="suggestion-text">' + escapeHtml(item.keyword) +
          '</span><span class="suggestion-category">' + escapeHtml(item.category || '') + '</span></button>';
      }).join('');
      syncExpanded(true);

      optionButtons().forEach(function (button) {
        button.addEventListener('pointerdown', function (event) {
          event.preventDefault();
        });
        button.addEventListener('click', function () {
          choose(button);
        });
      });
    });

    inputEl.addEventListener('blur', function () {
      setTimeout(function () { syncExpanded(false); }, 180);
    });

    inputEl.addEventListener('focus', function () {
      var val = inputEl.value.trim();
      if (val.length >= 1 && boxEl.children.length) syncExpanded(true);
    });

    inputEl.addEventListener('keydown', function (event) {
      var buttons = optionButtons();
      if (event.key === 'ArrowDown' && buttons.length) {
        event.preventDefault();
        syncExpanded(true);
        setActive(activeIndex + 1);
        return;
      }
      if (event.key === 'ArrowUp' && buttons.length) {
        event.preventDefault();
        syncExpanded(true);
        setActive(activeIndex <= 0 ? buttons.length - 1 : activeIndex - 1);
        return;
      }
      if (event.key === 'Enter' && activeIndex >= 0 && buttons[activeIndex]) {
        event.preventDefault();
        choose(buttons[activeIndex]);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        syncExpanded(false);
      }
    });
  };
})();