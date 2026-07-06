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
      map[item.keyword.toLowerCase()] = item;
    });
    return map;
  }

  function buildKeywordIndex(arr) {
    var map = {};
    arr.forEach(function (item) {
      (item.keywords || []).forEach(function (kw) {
        var key = kw.toLowerCase();
        if (!map[key]) map[key] = [];
        map[key].push(item);
      });
    });
    return map;
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
      window.CNC_FRONTEND.suggestions = results[0];
      window.CNC_FRONTEND.index = results[1];
      window.CNC_FRONTEND.riskKeywords = results[2];
      window.CNC_FRONTEND.faq = results[3];
      window.CNC_FRONTEND.lookup = results[4];

      window.CNC_FRONTEND.riskMap = buildRiskMap(results[2]);
      window.CNC_FRONTEND.keywordIndex = buildKeywordIndex(results[1]);

      window.CNC_FRONTEND.idIndex = {};
      results[1].forEach(function (item) {
        if (item.id) window.CNC_FRONTEND.idIndex[item.id] = item;
      });

      if (window.CNC_RUNTIME) {
        window.CNC_RUNTIME._frontendData = {
          suggestions: results[0],
          index: results[1],
          riskKeywords: results[2],
          faq: results[3],
          lookup: results[4]
        };
      }

      return true;
    });
  };

  window.CNC_FRONTEND.getSuggestions = function (prefix, maxResults) {
    if (!prefix || !window.CNC_FRONTEND.suggestions) return [];
    maxResults = maxResults || 10;
    var q = prefix.toLowerCase();
    var results = window.CNC_FRONTEND.suggestions.filter(function (s) {
      return s.keyword.toLowerCase().indexOf(q) !== -1;
    }).slice(0, maxResults).map(function (s) {
      return { keyword: s.keyword, type: s.type, category: s.category, priority: s.priority };
    });
    results.sort(function (a, b) {
      return a.priority - b.priority || a.keyword.localeCompare(b.keyword);
    });
    return results;
  };

  window.CNC_FRONTEND.getRiskFor = function (text) {
    if (!text || !window.CNC_FRONTEND.riskMap) return null;
    var q = text.toLowerCase();
    var keys = Object.keys(window.CNC_FRONTEND.riskMap);
    for (var i = 0; i < keys.length; i++) {
      if (q.indexOf(keys[i]) !== -1) {
        return window.CNC_FRONTEND.riskMap[keys[i]];
      }
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
          if (!seen[item.id]) {
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

  window.CNC_FRONTEND.renderSuggestionBox = function (inputEl, boxEl) {
    if (!inputEl || !boxEl) return;

    inputEl.addEventListener('input', function () {
      var val = inputEl.value.trim();
      if (val.length < 1) {
        boxEl.innerHTML = '';
        boxEl.style.display = 'none';
        return;
      }
      if (!window.CNC_FRONTEND.suggestions) {
        boxEl.style.display = 'none';
        return;
      }
      var items = window.CNC_FRONTEND.getSuggestions(val);
      if (!items.length) {
        boxEl.innerHTML = '';
        boxEl.style.display = 'none';
        return;
      }
      boxEl.style.display = 'block';
      boxEl.innerHTML = items.map(function (item) {
        var typeLabel = item.type === 'gcode' ? 'G' : item.type === 'operation' ? 'OP' : item.type === 'alarm' ? 'AL' : item.type === 'param' ? 'PM' : 'OT';
        return '<button type="button" class="suggestion-item" data-suggestion="' + item.keyword.replace(/"/g, '&quot;') + '"><span class="suggestion-type-badge suggestion-type-' + item.type + '">' + typeLabel + '</span><span class="suggestion-text">' + item.keyword + '</span><span class="suggestion-category">' + item.category + '</span></button>';
      }).join('');

      boxEl.querySelectorAll('.suggestion-item').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var kw = btn.dataset.suggestion;
          inputEl.value = kw;
          boxEl.innerHTML = '';
          boxEl.style.display = 'none';
          inputEl.dispatchEvent(new Event('input'));
        });
      });
    });

    inputEl.addEventListener('blur', function () {
      setTimeout(function () { boxEl.style.display = 'none'; }, 200);
    });

    inputEl.addEventListener('focus', function () {
      var val = inputEl.value.trim();
      if (val.length >= 1 && boxEl.children.length) {
        boxEl.style.display = 'block';
      }
    });
  };
})();
