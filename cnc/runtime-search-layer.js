(function () {
  'use strict';

  var CNC_RUNTIME = window.CNC_RUNTIME || {};
  if (CNC_RUNTIME.SearchEngine) return;

  var sources = [];
  var aliasMap = {};
  var riskMap = {};
  var faqIndex = {};
  var lastQuery = null;
  var lastResults = [];

  function normalizeText(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[\s]+/g, ' ')
      .replace(/[^a-z0-9\u4e00-\u9fa5\-\+\.\/]+/g, ' ')
      .trim();
  }

  function getEntryText(entry) {
    return [
      entry.id, entry.title, entry.code, entry.category,
      entry.summary, entry.usage, entry.beginner, entry.warning,
      entry.source, entry.risk
    ].concat(entry.tags || []).concat(entry.aliases || []).filter(Boolean).join(' ');
  }

  function expandAliases(keyword) {
    var normalized = normalizeText(keyword);
    if (aliasMap[normalized]) {
      return [keyword].concat(aliasMap[normalized]);
    }
    return [keyword];
  }

  function searchLocalEntries(keyword, entries) {
    if (!keyword || !entries || !entries.length) return [];
    var expanded = expandAliases(keyword);
    var parts = expanded.map(function (t) { return normalizeText(t); }).filter(Boolean);
    var results = [];
    var seen = {};

    entries.forEach(function (entry) {
      if (seen[entry.id]) return;
      var hay = normalizeText(getEntryText(entry));
      var matched = parts.some(function (part) {
        return hay.indexOf(part) !== -1;
      });
      if (!matched) return;
      seen[entry.id] = true;

      var hayNorm = normalizeText(getEntryText(entry));
      var q = normalizeText(keyword);
      var score = 0;
      if (hayNorm.indexOf(q) !== -1) score += 10;
      if (normalizeText(entry.code) === q) score += 140;
      if (normalizeText(entry.title) === q) score += 120;
      if ((entry.aliases || []).some(function (a) { return normalizeText(a) === q; })) score += 100;
      if ((entry.tags || []).some(function (t) { return normalizeText(t) === q; })) score += 90;
      if (normalizeText(entry.code).indexOf(q) !== -1) score += 70;
      if (normalizeText(entry.title).indexOf(q) !== -1) score += 60;
      if (normalizeText(entry.summary || '').indexOf(q) !== -1) score += 20;

      results.push({
        id: entry.id,
        title: entry.title,
        code: entry.code,
        category: entry.category,
        summary: entry.summary || '',
        source: 'local',
        score: score,
        riskLevel: entry.risk || '中',
        tags: entry.tags || [],
        aliases: entry.aliases || [],
        entry: entry
      });
    });

    return results;
  }

  function searchIndexLight(keyword, indexItems) {
    if (!keyword || !indexItems || !indexItems.length) return [];
    var q = normalizeText(keyword);
    var results = [];
    var seen = {};

    indexItems.forEach(function (item) {
      if (seen[item.id]) return;
      var matched = (item.keywords || []).some(function (kw) {
        return normalizeText(kw).indexOf(q) !== -1 || q.indexOf(normalizeText(kw)) !== -1;
      });
      if (!matched) return;
      seen[item.id] = true;
      results.push({
        id: item.id,
        title: item.title || item.id,
        code: '',
        category: item.type || '未分类',
        summary: '',
        source: 'index-light',
        score: 5,
        riskLevel: item.riskLevel || 'low',
        tags: [],
        aliases: item.keywords || [],
        directLinkHint: item.directLinkHint || ''
      });
    });

    return results;
  }

  function searchFAQs(keyword, faqItems) {
    if (!keyword || !faqItems || !faqItems.length) return [];
    var q = normalizeText(keyword);
    var results = [];
    var seen = {};

    faqItems.forEach(function (faq) {
      if (seen[faq.id]) return;
      var hay = normalizeText((faq.title || '') + ' ' + (faq.question || '') + ' ' + (faq.shortAnswer || '') + ' ' + (faq.fullAnswer || '') + ' ' + ((faq.relatedKeywords || []).join(' ')));
      if (hay.indexOf(q) === -1) return;
      seen[faq.id] = true;
      results.push({
        id: faq.id,
        title: faq.title || faq.question,
        code: '',
        category: 'FAQ-' + (faq.faqType || 'unknown'),
        summary: (faq.shortAnswer || '').slice(0, 120),
        source: 'faq',
        score: 8,
        riskLevel: faq.riskNote ? '高' : '低',
        tags: faq.relatedKeywords || [],
        aliases: [],
        faqType: faq.faqType,
        fullAnswer: faq.fullAnswer || ''
      });
    });

    return results;
  }

  function getSuggestions(prefix, allSuggestions, maxResults) {
    if (!prefix || !allSuggestions || !allSuggestions.length) return [];
    maxResults = maxResults || 10;
    var q = prefix.toLowerCase();
    var results = allSuggestions.filter(function (s) {
      return s.keyword.toLowerCase().indexOf(q) !== -1;
    }).slice(0, maxResults).map(function (s) {
      return { keyword: s.keyword, type: s.type, category: s.category, priority: s.priority };
    });
    results.sort(function (a, b) {
      return a.priority - b.priority || a.keyword.localeCompare(b.keyword);
    });
    return results;
  }

  function getRiskFor(text) {
    if (!text) return null;
    var q = text.toLowerCase();
    var keys = Object.keys(riskMap);
    for (var i = 0; i < keys.length; i++) {
      if (q.indexOf(keys[i]) !== -1) {
        return riskMap[keys[i]];
      }
    }
    return null;
  }

  function buildAliasMap(aliases) {
    aliasMap = {};
    if (!aliases) return;
    aliases.forEach(function (a) {
      var key = normalizeText(a.term);
      if (!aliasMap[key]) aliasMap[key] = [];
      (a.expands || []).forEach(function (e) {
        if (aliasMap[key].indexOf(e) === -1) aliasMap[key].push(e);
      });
    });
  }

  function buildRiskMap(risks) {
    riskMap = {};
    if (!risks) return;
    risks.forEach(function (r) {
      riskMap[r.keyword.toLowerCase()] = r;
    });
  }

  function buildFAQIndex(faqs) {
    faqIndex = {};
    if (!faqs) return;
    faqs.forEach(function (f) {
      if (!faqIndex[f.faqType]) faqIndex[f.faqType] = [];
      faqIndex[f.faqType].push(f);
    });
  }

  function Engine(config) {
    config = config || {};
    this.entries = config.entries || [];
    this.indexLight = config.indexLight || [];
    this.suggestions = config.suggestions || [];
    this.faqs = config.faqs || [];
    this.riskKeywords = config.riskKeywords || [];
    this.aliases = config.aliases || [];

    buildAliasMap(this.aliases);
    buildRiskMap(this.riskKeywords);
    buildFAQIndex(this.faqs);

    sources = [
      { name: 'local', count: this.entries.length, loaded: true },
      { name: 'index-light', count: this.indexLight.length, loaded: true },
      { name: 'suggestions', count: this.suggestions.length, loaded: true },
      { name: 'faq', count: this.faqs.length, loaded: true },
      { name: 'risk', count: this.riskKeywords.length, loaded: true },
      { name: 'aliases', count: Object.keys(aliasMap).length, loaded: true }
    ];
  }

  Engine.prototype.search = function (keyword, options) {
    options = options || {};
    var maxResults = options.maxResults || 50;
    var includeFAQ = options.includeFAQ !== false;
    var includeIndex = options.includeIndex !== false;

    if (!keyword || !keyword.trim()) return [];
    lastQuery = keyword;

    var results = [];

    var localResults = searchLocalEntries(keyword, this.entries);
    results = results.concat(localResults);

    if (includeIndex) {
      var indexResults = searchIndexLight(keyword, this.indexLight);
      var existingIds = {};
      results.forEach(function (r) { existingIds[r.id] = true; });
      indexResults.forEach(function (r) {
        if (!existingIds[r.id]) {
          results.push(r);
          existingIds[r.id] = true;
        }
      });
    }

    if (includeFAQ) {
      var faqResults = searchFAQs(keyword, this.faqs);
      var faqIds = {};
      results.forEach(function (r) { faqIds[r.id] = true; });
      faqResults.forEach(function (r) {
        if (!faqIds[r.id]) {
          results.push(r);
          faqIds[r.id] = true;
        }
      });
    }

    results.sort(function (a, b) { return b.score - a.score; });
    lastResults = results.slice(0, maxResults);
    return lastResults;
  };

  Engine.prototype.autocomplete = function (prefix, maxResults) {
    return getSuggestions(prefix, this.suggestions, maxResults);
  };

  Engine.prototype.checkRisk = function (text) {
    return getRiskFor(text);
  };

  Engine.prototype.expandTerms = function (keyword) {
    return expandAliases(keyword);
  };

  Engine.prototype.getFAQs = function (faqType, maxResults) {
    maxResults = maxResults || 20;
    if (faqType && faqType !== 'all') {
      return (faqIndex[faqType] || []).slice(0, maxResults);
    }
    var all = [];
    var types = Object.keys(faqIndex);
    types.forEach(function (t) {
      all = all.concat(faqIndex[t]);
    });
    return all.slice(0, maxResults);
  };

  Engine.prototype.getLastQuery = function () {
    return lastQuery;
  };

  Engine.prototype.getLastResults = function () {
    return lastResults;
  };

  Engine.prototype.getSourceStats = function () {
    return sources.map(function (s) {
      return { name: s.name, count: s.count, loaded: s.loaded };
    });
  };

  Engine.prototype.refresh = function (config) {
    if (config.entries) this.entries = config.entries;
    if (config.indexLight) this.indexLight = config.indexLight;
    if (config.suggestions) this.suggestions = config.suggestions;
    if (config.faqs) this.faqs = config.faqs;
    if (config.riskKeywords) { this.riskKeywords = config.riskKeywords; buildRiskMap(config.riskKeywords); }
    if (config.aliases) { this.aliases = config.aliases; buildAliasMap(config.aliases); }
    return this;
  };

  CNC_RUNTIME.SearchEngine = Engine;
  CNC_RUNTIME.SearchEngine.create = function (config) {
    return new Engine(config);
  };

  window.CNC_RUNTIME = CNC_RUNTIME;
})();
