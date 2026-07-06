/**
 * data-cleaner.js
 * 数据清洗系统 — 去重/标准化/质量过滤/内容哈希/别名映射/关系验证
 * 全局对象: window.CNC_DATA_CLEANER
 */
(function () {
  'use strict';

  if (window.CNC_DATA_CLEANER) return;

  var config = window.CNC_IMPORT_CONFIG;

  // ── 工具函数 ──
  function _hash(str) {
    if (!str) return '';
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      h = ((h << 5) - h) + c;
      h = h & h;
    }
    return 'h' + Math.abs(h).toString(36);
  }

  function _normalizeText(text) {
    return (text || '')
      .replace(/[\r\n]+/g, ' ')
      .replace(/[　\s]+/g, ' ')
      .replace(/[#*_`~>|\[\]()\-]/g, '')
      .trim()
      .toLowerCase();
  }

  function _computeSimilarity(a, b) {
    if (!a || !b) return 0;
    var normA = _normalizeText(a);
    var normB = _normalizeText(b);
    if (normA === normB) return 1.0;
    if (normA.length < 10 || normB.length < 10) return normA === normB ? 1.0 : 0;
    // Jaccard相似度 (基于单词)
    var wordsA = normA.split(/\s+/).filter(function (w) { return w.length > 1; });
    var wordsB = normB.split(/\s+/).filter(function (w) { return w.length > 1; });
    var setA = {}, setB = {};
    var union = {}, intersectionCount = 0;
    for (var i = 0; i < wordsA.length; i++) { setA[wordsA[i]] = true; union[wordsA[i]] = true; }
    for (var j = 0; j < wordsB.length; j++) { setB[wordsB[j]] = true; union[wordsB[j]] = true; }
    for (var k in setA) { if (setA.hasOwnProperty(k) && setB[k]) intersectionCount++; }
    var unionCount = Object.keys(union).length;
    return unionCount === 0 ? 0 : intersectionCount / unionCount;
  }

  function _computeContentHash(content) {
    return _hash(_normalizeText(content));
  }

  // ── 文件质量分级 ──
  function classifyFileQuality(fileSize, content) {
    var size = fileSize || 0;
    var contentLen = (content || '').length;

    if (size > 14336 && contentLen > 5000) {      // >14KB, >5000字
      return { level: 'deep', score: 3, label: '深度文件', priority: 1 };
    }
    if (size > 4096 && contentLen > 1000) {        // 4-14KB
      return { level: 'medium', score: 2, label: '中等文件', priority: 2 };
    }
    if (contentLen > 100) {                         // 基础文件
      return { level: 'basic', score: 1, label: '基础文件', priority: 3 };
    }
    return { level: 'trash', score: 0, label: '低质文件', priority: 99, discard: true };
  }

  // ── 文件过滤器 ──
  function filterLowQualityFiles(files) {
    if (!files || !files.length) return { passed: [], filtered: [] };
    var passed = [], filtered = [];
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      var q = classifyFileQuality(f.size, f.content);
      if (q.discard) {
        filtered.push({ file: f, reason: '内容过短 (' + (f.content || '').length + ' 字)', quality: q });
      } else {
        f.quality = q;
        passed.push(f);
      }
    }
    return { passed: passed, filtered: filtered };
  }

  // ── 实体去重 ──
  function deduplicateEntities(entities) {
    if (!entities || !entities.length) return { entities: [], duplicates: 0 };

    var result = [];
    var seen = {};
    var duplicates = 0;

    for (var i = 0; i < entities.length; i++) {
      var e = entities[i];
      var key = e.type + ':' + e.label;
      if (seen[key]) {
        duplicates++;
        // 保留置信度更高的
        var existing = seen[key];
        if ((e.confidence || 0) > (existing.confidence || 0)) {
          var idx = result.indexOf(existing);
          if (idx > -1) result[idx] = e;
          seen[key] = e;
        }
      } else {
        seen[key] = e;
        result.push(e);
      }
    }

    return { entities: result, duplicates: duplicates };
  }

  // ── 文件级去重 (基于内容hash) ──
  function deduplicateFiles(files) {
    if (!files || !files.length) return { unique: [], duplicates: [] };

    var seenHashes = {};
    var unique = [], duplicates = [];

    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      var h = _computeContentHash(f.content || '');
      if (f.contentHash) h = f.contentHash;
      if (seenHashes[h]) {
        duplicates.push({ file: f, duplicateOf: seenHashes[h] });
      } else {
        seenHashes[h] = f.path || f.name || i;
        unique.push(f);
      }
    }

    return { unique: unique, duplicates: duplicates };
  }

  // ── 标准化文件名 → 类型分类 ──
  function classifyFileByPrefix(filename) {
    if (!filename) return { prefix: 'unknown', type: 'knowledge' };
    var prefixMap = config ? config.CONFIG.FILE_PREFIX_MAP : {};
    for (var prefix in prefixMap) {
      if (prefixMap.hasOwnProperty(prefix) && filename.indexOf(prefix) === 0) {
        return { prefix: prefix, type: prefixMap[prefix] };
      }
    }
    return { prefix: 'unknown', type: 'knowledge' };
  }

  // ── 分类路径 → 分类链 ──
  function extractCategories(filePath) {
    if (!filePath) return [];
    var parts = filePath.replace(/\\/g, '/').split('/');
    var categories = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].trim();
      if (p && p.indexOf('.') === -1 && p.indexOf('_') !== -1) {
        // 如 "01_编程基础" → "编程基础"
        var name = p.replace(/^\d+_/, '');
        if (name) categories.push(name);
      }
    }
    return categories;
  }

  // ── 关系验证 ──
  function validateEdge(edge, nodeIds) {
    if (!edge) return { valid: false, reason: '空关系' };
    if (!edge.source || !edge.target) return { valid: false, reason: '缺少 source/target' };
    if (edge.source === edge.target) return { valid: false, reason: '自环关系' };
    if (nodeIds && nodeIds.size > 0) {
      if (!nodeIds.has(edge.source)) return { valid: false, reason: 'source 节点不存在: ' + edge.source };
      if (!nodeIds.has(edge.target)) return { valid: false, reason: 'target 节点不存在: ' + edge.target };
    }
    return { valid: true };
  }

  function validateEdges(edges, nodeIds) {
    if (!edges) return { valid: [], invalid: [] };
    var valid = [], invalid = [];
    for (var i = 0; i < edges.length; i++) {
      var result = validateEdge(edges[i], nodeIds);
      if (result.valid) valid.push(edges[i]);
      else invalid.push({ edge: edges[i], reason: result.reason });
    }
    return { valid: valid, invalid: invalid };
  }

  // ── 标准化实体标签（统一格式） ──
  function standardizeEntityLabel(entity) {
    if (!entity || !entity.label) return entity;
    var label = entity.label.trim();
    if (entity.type === 'gcode' || entity.type === 'mcode') {
      label = label.toUpperCase().replace(/\s+/g, '');
    }
    if (entity.type === 'concept') {
      label = _standardizeName(label);
    }
    entity.label = label;
    return entity;
  }

  function _standardizeName(name) {
    var aliasMap = config ? config.CONFIG.ALIAS_MAP : {};
    return aliasMap[name] || name;
  }

  function standardizeEntities(entities) {
    if (!entities) return [];
    return entities.map(standardizeEntityLabel);
  }

  // ── 综合清洗管道 ──
  function cleanPipeline(files, entities, edges) {
    var result = {
      files: { input: 0, passed: 0, filtered: 0, duplicates: 0 },
      entities: { input: 0, afterDedup: 0, duplicates: 0 },
      edges: { input: 0, valid: 0, invalid: 0 }
    };

    // 文件过滤
    if (files) {
      result.files.input = files.length;
      var filteredFiles = filterLowQualityFiles(files);
      var dedupFiles = deduplicateFiles(filteredFiles.passed);
      result.files.passed = dedupFiles.unique.length;
      result.files.filtered = filteredFiles.filtered.length;
      result.files.duplicates = dedupFiles.duplicates.length;
    }

    // 实体去重+标准化
    if (entities) {
      result.entities.input = entities.length;
      var stdEntities = standardizeEntities(entities);
      var dedupResult = deduplicateEntities(stdEntities);
      result.entities.afterDedup = dedupResult.entities.length;
      result.entities.duplicates = dedupResult.duplicates;
    }

    // 关系验证
    if (edges) {
      result.edges.input = edges.length;
      var nodeIdSet = new Set();
      if (entities) {
        var dedupResult2 = deduplicateEntities(standardizeEntities(entities));
        for (var i = 0; i < dedupResult2.entities.length; i++) {
          var e = dedupResult2.entities[i];
          if (e.id) nodeIdSet.add(e.id);
        }
      }
      var validatedEdges = validateEdges(edges, nodeIdSet);
      result.edges.valid = validatedEdges.valid.length;
      result.edges.invalid = validatedEdges.invalid.length;
    }

    return result;
  }

  window.CNC_DATA_CLEANER = {
    classifyFileQuality: classifyFileQuality,
    filterLowQualityFiles: filterLowQualityFiles,
    deduplicateEntities: deduplicateEntities,
    deduplicateFiles: deduplicateFiles,
    classifyFileByPrefix: classifyFileByPrefix,
    extractCategories: extractCategories,
    validateEdge: validateEdge,
    validateEdges: validateEdges,
    standardizeEntityLabel: standardizeEntityLabel,
    standardizeEntities: standardizeEntities,
    cleanPipeline: cleanPipeline,
    computeContentHash: _computeContentHash,
    computeSimilarity: _computeSimilarity
  };

  console.log('[CNC_DATA_CLEANER] 数据清洗器已加载。');
})();
