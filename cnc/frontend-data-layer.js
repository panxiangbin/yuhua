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
    var q = prefix.toLowerCase();
    var results = window.CNC_FRONTEND.suggestions.filter(function (s) {
      return s && typeof s.keyword === 'string' && s.keyword.toLowerCase().indexOf(q) !== -1;
    }).slice(0, maxResults).map(function (s) {
      return { keyword: s.keyword, type: s.type, category: s.category, priority: s.priority };
    });
    results.sort(function (a, b) {
      return Number(a.priority || 99) - Number(b.priority || 99) || a.keyword.localeCompare(b.keyword);
    });
    return results;
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
    setSuggestionVisibility(boxEl, false);

    inputEl.addEventListener('input', function () {
      var val = inputEl.value.trim();
      if (val.length < 1 || !window.CNC_FRONTEND.suggestions) {
        boxEl.innerHTML = '';
        setSuggestionVisibility(boxEl, false);
        return;
      }
      var items = window.CNC_FRONTEND.getSuggestions(val, 4);
      if (!items.length) {
        boxEl.innerHTML = '';
        setSuggestionVisibility(boxEl, false);
        return;
      }
      boxEl.innerHTML = items.map(function (item) {
        var type = String(item.type || 'other');
        var typeLabel = type === 'gcode' ? 'G' : type === 'operation' ? 'OP' : type === 'alarm' ? 'AL' : type === 'param' ? 'PM' : 'OT';
        return '<button type="button" role="option" class="suggestion-item" data-suggestion="' + item.keyword.replace(/"/g, '&quot;') + '"><span class="suggestion-type-badge suggestion-type-' + type + '">' + typeLabel + '</span><span class="suggestion-text">' + item.keyword + '</span><span class="suggestion-category">' + (item.category || '') + '</span></button>';
      }).join('');
      setSuggestionVisibility(boxEl, true);

      boxEl.querySelectorAll('.suggestion-item').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var kw = btn.dataset.suggestion;
          inputEl.value = kw;
          boxEl.innerHTML = '';
          setSuggestionVisibility(boxEl, false);
          inputEl.dispatchEvent(new Event('input', { bubbles: true }));
          inputEl.focus();
        });
      });
    });

    inputEl.addEventListener('blur', function () {
      setTimeout(function () { setSuggestionVisibility(boxEl, false); }, 180);
    });

    inputEl.addEventListener('focus', function () {
      var val = inputEl.value.trim();
      if (val.length >= 1 && boxEl.children.length) setSuggestionVisibility(boxEl, true);
    });

    inputEl.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        setSuggestionVisibility(boxEl, false);
        inputEl.blur();
      }
    });
  };
})();