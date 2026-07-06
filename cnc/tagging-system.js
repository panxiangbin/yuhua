/**
 * tagging-system.js
 * 智能标签系统核心 — 三层存储/标签CRUD/自动分类/组合查询/统计/批量操作
 * 依赖: window.CNC_TAG_CONFIG, window.CNC_TAGGING_ALGORITHMS
 * 全局对象: window.CNC_TAGGING_SYSTEM
 */
(function () {
  'use strict';

  if (window.CNC_TAGGING_SYSTEM) return;

  var C = window.CNC_TAG_CONFIG;
  var A = window.CNC_TAGGING_ALGORITHMS;
  if (!C || !A) {
    console.error('[CNC_TAGGING_SYSTEM] 依赖未加载: CNC_TAG_CONFIG=' + !!C + ', CNC_TAGGING_ALGORITHMS=' + !!A);
    return;
  }

  // ── 数据库配置 ──
  var DB_CONFIG = {
    name: 'CNC_TagSystem',
    version: 1,
    stores: [
      { name: 'file_tags', keyPath: 'fileId' },
      { name: 'tag_index', keyPath: 'id' },
      { name: 'tag_stats', keyPath: 'id' },
      { name: 'file_metadata', keyPath: 'fileId' }
    ]
  };

  // ── 存储键 ──
  var LS_KEYS = {
    profile: 'cnc_user_profile',
    history: 'cnc_view_history',
    searchHistory: 'cnc_search_history',
    favorites: 'cnc_favorites',
    preferences: 'cnc_user_preferences'
  };

  // ── 内存缓存 ──
  var _cache = {
    _tags: {},
    _tagIndex: {},
    _maxTags: 500,
    _maxIndex: 100,
    get: function (fileId) { return this._tags[fileId] || null; },
    set: function (fileId, tags) {
      var keys = Object.keys(this._tags);
      if (keys.length >= this._maxTags) delete this._tags[keys[0]];
      this._tags[fileId] = tags;
    },
    invalidate: function (fileId) { delete this._tags[fileId]; },
    clear: function () { this._tags = {}; this._tagIndex = {}; },
    getIndex: function (key) { return this._tagIndex[key] || null; },
    setIndex: function (key, files) {
      var keys = Object.keys(this._tagIndex);
      if (keys.length >= this._maxIndex) delete this._tagIndex[keys[0]];
      this._tagIndex[key] = files;
    }
  };

  // ── 更新队列 (批量写入IndexedDB) ──
  var _updateQueue = [];
  var _isUpdating = false;

  // ── 数据库引用 ──
  var _db = null;
  var _dbCallbacks = [];

  // ── IndexedDB 操作 ──
  function _openDB(onReady) {
    if (_db) { if (onReady) onReady(_db); return; }
    if (onReady) _dbCallbacks.push(onReady);
    if (_dbCallbacks.length > 1) return;
    var request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);
    request.onupgradeneeded = function (e) {
      var db = e.target.result;
      for (var i = 0; i < DB_CONFIG.stores.length; i++) {
        var storeDef = DB_CONFIG.stores[i];
        if (!db.objectStoreNames.contains(storeDef.name)) {
          db.createObjectStore(storeDef.name, { keyPath: storeDef.keyPath });
        }
      }
    };
    request.onsuccess = function (e) {
      _db = e.target.result;
      _db.onversionchange = function () { _db.close(); _db = null; };
      for (var j = 0; j < _dbCallbacks.length; j++) _dbCallbacks[j](_db);
      _dbCallbacks = [];
    };
    request.onerror = function (e) {
      console.error('[CNC_TAGGING_SYSTEM] IndexedDB 打开失败:', e.target.error);
      for (var k = 0; k < _dbCallbacks.length; k++) _dbCallbacks[k](null);
      _dbCallbacks = [];
    };
  }

  function _getStore(name, mode, callback) {
    _openDB(function (db) {
      if (!db) { callback(null); return; }
      var tx = db.transaction(name, mode);
      var store = tx.objectStore(name);
      callback(store, tx);
    });
  }

  // ── 更新队列处理 ──
  function _enqueueUpdate(fileId, tags) {
    _updateQueue.push({ fileId: fileId, tags: tags, timestamp: Date.now() });
    _processQueue();
  }

  function _processQueue() {
    if (_isUpdating || _updateQueue.length === 0) return;
    _isUpdating = true;
    var batch = _updateQueue.splice(0, 50);
    _getStore('file_tags', 'readwrite', function (store, tx) {
      if (!store) { _isUpdating = false; return; }
      for (var i = 0; i < batch.length; i++) {
        store.put(batch[i]);
      }
      tx.oncomplete = function () {
        _isUpdating = false;
        _processQueue();
      };
      tx.onerror = function () {
        _isUpdating = false;
        _updateQueue = batch.concat(_updateQueue);
        setTimeout(_processQueue, 1000);
      };
    });
  }

  // ── LocalStorage 工具 ──
  function _lsGet(key, def) {
    try {
      var val = localStorage.getItem(key);
      return val ? JSON.parse(val) : def;
    } catch (e) { return def; }
  }

  function _lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* quota exceeded */ }
  }

  // ── 标签CRUD ──
  function getTags(fileId, callback) {
    var cached = _cache.get(fileId);
    if (cached) { callback(cached); return; }
    _getStore('file_tags', 'readonly', function (store) {
      if (!store) { callback(null); return; }
      var req = store.get(fileId);
      req.onsuccess = function () {
        var result = req.result || null;
        if (result) _cache.set(fileId, result);
        callback(result);
      };
      req.onerror = function () { callback(null); };
    });
  }

  function setTags(fileId, tags, callback) {
    var record = {
      fileId: fileId,
      contentCategory: tags.contentCategory || [],
      difficulty: tags.difficulty || null,
      machineType: tags.machineType || [],
      materialType: tags.materialType || [],
      systemBrand: tags.systemBrand || [],
      knowledgeAttr: tags.knowledgeAttr || [],
      timeAttr: _computeTimeAttr(tags),
      customTags: tags.customTags || [],
      lastUpdated: Date.now(),
      confidence: tags.confidence || 0
    };
    _cache.set(fileId, record);
    _enqueueUpdate(fileId, record);
    _updateTagIndex(fileId, record);
    _updateStats(record);
    if (typeof callback === 'function') callback(record);
  }

  function removeTags(fileId, callback) {
    _cache.invalidate(fileId);
    _getStore('file_tags', 'readwrite', function (store, tx) {
      if (!store) { if (callback) callback(false); return; }
      var req = store.delete(fileId);
      tx.oncomplete = function () { if (callback) callback(true); };
      tx.onerror = function () { if (callback) callback(false); };
    });
  }

  function addCustomTag(fileId, tag, callback) {
    getTags(fileId, function (record) {
      if (!record) { if (callback) callback(null); return; }
      var custom = record.customTags || [];
      if (custom.indexOf(tag) === -1) {
        custom.push(tag);
        record.customTags = custom;
        record.lastUpdated = Date.now();
        _cache.set(fileId, record);
        _enqueueUpdate(fileId, record);
      }
      if (callback) callback(record);
    });
  }

  function removeCustomTag(fileId, tag, callback) {
    getTags(fileId, function (record) {
      if (!record) { if (callback) callback(null); return; }
      var custom = record.customTags || [];
      var idx = custom.indexOf(tag);
      if (idx !== -1) {
        custom.splice(idx, 1);
        record.customTags = custom;
        record.lastUpdated = Date.now();
        _cache.set(fileId, record);
        _enqueueUpdate(fileId, record);
      }
      if (callback) callback(record);
    });
  }

  // ── 自动分类 ──
  function autoClassifyFile(fileId, content, metadata, callback) {
    var tags = A.autoClassify(content, metadata);
    setTags(fileId, tags, function (record) {
      if (typeof callback === 'function') callback(record, tags);
    });
  }

  function batchAutoClassify(files, options, callback) {
    options = options || {};
    var batchSize = options.batchSize || 50;
    var interval = options.interval || 100;
    var onProgress = options.onProgress || null;
    var index = 0;
    var total = files.length;
    var results = [];

    function _processBatch() {
      var end = Math.min(index + batchSize, total);
      for (var i = index; i < end; i++) {
        var file = files[i];
        var tags = A.autoClassify(file.content, file.metadata || {});
        setTags(file.fileId, tags);
        results.push({ fileId: file.fileId, tags: tags });
      }
      index = end;
      if (onProgress) onProgress({ loaded: index, total: total, percent: Math.round((index / total) * 10000) / 100 });
      if (index < total) {
        setTimeout(_processBatch, interval);
      } else {
        if (typeof callback === 'function') callback(results);
      }
    }
    _processBatch();
  }

  // ── 时间属性计算 ──
  function _computeTimeAttr(tags) {
    var now = Date.now();
    var updated = tags.lastUpdated || now;
    var daysSinceUpdate = (now - updated) / 86400000;
    var timeAttr = { lastUpdated: updated };
    var timeDefs = C.TIME_ATTRIBUTES || [];
    for (var i = 0; i < timeDefs.length; i++) {
      var td = timeDefs[i];
      if (td.id === 'new') timeAttr.new = daysSinceUpdate <= (td.threshold || 30);
      else if (td.id === 'hot') timeAttr.hot = false;
      else if (td.id === 'classic') timeAttr.classic = tags.confidence >= (td.threshold || 0.6);
      else if (td.id === 'outdated') timeAttr.outdated = daysSinceUpdate > (td.threshold || 365);
    }
    return timeAttr;
  }

  // ── 倒排索引更新 ──
  function _updateTagIndex(fileId, record) {
    _getStore('tag_index', 'readwrite', function (store, tx) {
      if (!store) return;
      var flat = A.flattenTags(record);
      for (var i = 0; i < flat.length; i++) {
        (function (key) {
          var req = store.get(key);
          req.onsuccess = function () {
            var entry = req.result || { id: key, dimension: key.split(':')[0], value: key.split(':')[1] || '', files: [], count: 0, lastUpdated: Date.now() };
            if (entry.files.indexOf(fileId) === -1) {
              if (entry.files.length >= 1000) entry.files.shift();
              entry.files.push(fileId);
              entry.count = entry.files.length;
              entry.lastUpdated = Date.now();
              store.put(entry);
            }
          };
        })(flat[i]);
      }
    });
  }

  // ── 标签统计更新 ──
  function _updateStats(record) {
    _getStore('tag_stats', 'readwrite', function (store, tx) {
      if (!store) return;
      var dims = {
        contentCategory: record.contentCategory || [],
        machineType: record.machineType || [],
        materialType: record.materialType || [],
        systemBrand: record.systemBrand || [],
        knowledgeAttr: record.knowledgeAttr || []
      };
      for (var dim in dims) {
        if (dims.hasOwnProperty(dim)) {
          (function (dimension, items) {
            var statId = dimension + '_stats';
            var req = store.get(statId);
            req.onsuccess = function () {
              var stat = req.result || { id: statId, dimension: dimension, total: 0, distribution: {} };
              for (var j = 0; j < items.length; j++) {
                var tagId = items[j].id || items[j];
                if (!stat.distribution[tagId]) {
                  stat.distribution[tagId] = { count: 0, label: items[j].label || tagId };
                }
                stat.distribution[tagId].count++;
                stat.total++;
              }
              store.put(stat);
            };
          })(dim, dims[dim]);
        }
      }
    });
  }

  // ── 组合标签搜索 ──
  function searchByTagCombination(tagFilters, callback) {
    var keys = [];
    for (var dim in tagFilters) {
      if (tagFilters.hasOwnProperty(dim)) {
        keys.push(dim + ':' + tagFilters[dim]);
      }
    }
    if (keys.length === 0) { callback([]); return; }
    _getStore('tag_index', 'readonly', function (store) {
      if (!store) { callback([]); return; }
      var pending = keys.length;
      var results = [];
      var hasError = false;

      for (var i = 0; i < keys.length; i++) {
        (function (idx) {
          var cached = _cache.getIndex(keys[idx]);
          if (cached) {
            results[idx] = cached;
            pending--;
            if (pending === 0 && !hasError) _intersectResults(results, callback);
            return;
          }
          var req = store.get(keys[idx]);
          req.onsuccess = function () {
            results[idx] = req.result ? (req.result.files || []) : [];
            _cache.setIndex(keys[idx], results[idx]);
            pending--;
            if (pending === 0 && !hasError) _intersectResults(results, callback);
          };
          req.onerror = function () {
            results[idx] = [];
            hasError = true;
            pending--;
            if (pending === 0) callback([]);
          };
        })(i);
      }
    });
  }

  function _intersectResults(results, callback) {
    if (results.length === 0) { callback([]); return; }
    if (results.length === 1) { callback(results[0]); return; }
    var intersection = [];
    for (var i = 0; i < results[0].length; i++) {
      var id = results[0][i];
      var found = true;
      for (var j = 1; j < results.length; j++) {
        if (results[j].indexOf(id) === -1) { found = false; break; }
      }
      if (found) intersection.push(id);
    }
    callback(intersection);
  }

  // ── 统计 ──
  function getStats(callback) {
    _getStore('tag_stats', 'readonly', function (store) {
      if (!store) { callback(null); return; }
      var req = store.getAll();
      req.onsuccess = function () { callback(req.result || []); };
      req.onerror = function () { callback(null); };
    });
  }

  function getDimensionStats(dimension, callback) {
    _getStore('tag_stats', 'readonly', function (store) {
      if (!store) { callback(null); return; }
      var req = store.get(dimension + '_stats');
      req.onsuccess = function () { callback(req.result || null); };
      req.onerror = function () { callback(null); };
    });
  }

  // ── 用户数据管理 ──
  function getProfile() {
    return _lsGet(LS_KEYS.profile, {
      userId: 'local', skillLevel: 'beginner', interestTags: {},
      preferredMachines: {}, preferredBrands: {}, totalViews: 0, lastActive: Date.now(), lastUpdated: Date.now()
    });
  }

  function saveProfile(profile) {
    profile.lastUpdated = Date.now();
    _lsSet(LS_KEYS.profile, profile);
  }

  function getViewHistory() {
    return _lsGet(LS_KEYS.history, []);
  }

  function addViewHistory(entry) {
    var history = getViewHistory();
    history.unshift(entry);
    if (history.length > 200) history = history.slice(0, 200);
    _lsSet(LS_KEYS.history, history);
    _rebuildProfile();
  }

  function getSearchHistory() {
    return _lsGet(LS_KEYS.searchHistory, []);
  }

  function addSearchHistory(keyword, resultsCount) {
    var history = getSearchHistory();
    history.unshift({ keyword: keyword, timestamp: Date.now(), resultsCount: resultsCount || 0 });
    if (history.length > 50) history = history.slice(0, 50);
    _lsSet(LS_KEYS.searchHistory, history);
  }

  function getFavorites() {
    return _lsGet(LS_KEYS.favorites, {});
  }

  function addFavorite(fileId, title) {
    var favs = getFavorites();
    favs[fileId] = { fileId: fileId, title: title, addedAt: Date.now() };
    _lsSet(LS_KEYS.favorites, favs);
  }

  function removeFavorite(fileId) {
    var favs = getFavorites();
    delete favs[fileId];
    _lsSet(LS_KEYS.favorites, favs);
  }

  function getPreferences() {
    return _lsGet(LS_KEYS.preferences, {
      theme: 'light', fontSize: 16, recommendCount: 10,
      defaultSearchFilter: 'all', hideOutdated: true, customTags: [],
      tagOrder: ['contentCategory', 'difficulty', 'machineType', 'materialType', 'systemBrand', 'knowledgeAttr']
    });
  }

  function savePreferences(prefs) {
    _lsSet(LS_KEYS.preferences, prefs);
  }

  function _rebuildProfile() {
    var history = getViewHistory();
    var profile = A.buildUserProfile(history, [], getFavorites());
    saveProfile(profile);
  }

  // ── 导出 ──
  window.CNC_TAGGING_SYSTEM = {
    // 数据库
    openDB: _openDB,
    // 标签CRUD
    getTags: getTags,
    setTags: setTags,
    removeTags: removeTags,
    addCustomTag: addCustomTag,
    removeCustomTag: removeCustomTag,
    // 自动分类
    autoClassifyFile: autoClassifyFile,
    batchAutoClassify: batchAutoClassify,
    // 搜索
    searchByTagCombination: searchByTagCombination,
    // 统计
    getStats: getStats,
    getDimensionStats: getDimensionStats,
    // 用户数据
    getProfile: getProfile,
    saveProfile: saveProfile,
    getViewHistory: getViewHistory,
    addViewHistory: addViewHistory,
    getSearchHistory: getSearchHistory,
    addSearchHistory: addSearchHistory,
    getFavorites: getFavorites,
    addFavorite: addFavorite,
    removeFavorite: removeFavorite,
    getPreferences: getPreferences,
    savePreferences: savePreferences,
    // 缓存管理
    cache: _cache,
    // 构建工具
    rebuildProfile: _rebuildProfile,
    enqueueUpdate: _enqueueUpdate
  };

  console.log('[CNC_TAGGING_SYSTEM] 标签系统已加载。方法数: ' + Object.keys(window.CNC_TAGGING_SYSTEM).length);
})();
