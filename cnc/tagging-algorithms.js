/**
 * tagging-algorithms.js
 * 智能标签系统算法库 — 自动分类/相关度/难度评估/推荐/搜索排序/搜索建议
 * 依赖: window.CNC_TAG_CONFIG
 * 全局对象: window.CNC_TAGGING_ALGORITHMS
 */
(function () {
  'use strict';

  if (window.CNC_TAGGING_ALGORITHMS) return;

  var C = window.CNC_TAG_CONFIG;
  if (!C) {
    console.error('[CNC_TAGGING_ALGORITHMS] CNC_TAG_CONFIG 未加载');
    return;
  }

  // ── 通用工具 ──
  function _trim(s) { return (s || '').replace(/^\s+|\s+$/g, ''); }
  function _lower(s) { return (s || '').toLowerCase(); }

  // ── 自动分类 ──
  function autoClassify(content, metadata) {
    var result = {
      contentCategory: [],
      machineType: [],
      materialType: [],
      systemBrand: [],
      knowledgeAttr: [],
      difficulty: null,
      confidence: {}
    };
    var text = _lower(content || '');
    var path = (metadata && metadata.path) || '';
    var name = (metadata && metadata.name) || '';

    result.contentCategory = _matchDimension(text, C.CONTENT_CATEGORIES, path, name, 'subcategories');
    result.machineType = _matchSimpleDimension(text, C.MACHINE_TYPES);
    if (result.machineType.length === 0) result.machineType.push({ id: 'general', label: '通用', confidence: 0.3 });
    result.materialType = _matchSimpleDimension(text, C.MATERIAL_TYPES);
    if (result.materialType.length === 0) result.materialType.push({ id: 'general', label: '通用材料', confidence: 0.3 });
    result.systemBrand = _matchSimpleDimension(text, C.SYSTEM_BRANDS);
    if (result.systemBrand.length === 0) result.systemBrand.push({ id: 'general', label: '通用系统', confidence: 0.3 });
    result.knowledgeAttr = _matchAttributes(text);
    result.difficulty = assessDifficulty(content, metadata);

    result.confidence = _computeOverallConfidence(result);
    return result;
  }

  function _matchDimension(text, categories, path, name, subKey) {
    var candidates = [];
    for (var i = 0; i < categories.length; i++) {
      var cat = categories[i];
      var subs = cat[subKey] || [];
      for (var j = 0; j < subs.length; j++) {
        var sub = subs[j];
        var kws = sub.keywords || [];
        var hits = 0;
        for (var k = 0; k < kws.length; k++) {
          if (text.indexOf(_lower(kws[k])) !== -1) hits++;
        }
        if (hits > 0) {
          var hitRatio = hits / Math.max(kws.length * 0.1, 3);
          var confidence = 0.7 * Math.min(hitRatio, 1.0);
          var pathRules = C.PATH_TAG_MAP || [];
          for (var p = 0; p < pathRules.length; p++) {
            if (path.indexOf(pathRules[p].path) !== -1) {
              var pTags = pathRules[p].tags || [];
              for (var pt = 0; pt < pTags.length; pt++) {
                if (pTags[pt] === sub.id) { confidence += 0.15; break; }
              }
            }
          }
          candidates.push({ id: sub.id, label: sub.label, confidence: Math.min(confidence, 1.0), hits: hits });
        }
      }
    }
    candidates.sort(function (a, b) { return b.confidence - a.confidence; });
    var out = [];
    for (var ci = 0; ci < candidates.length; ci++) {
      if (candidates[ci].confidence >= 0.3 && out.length < 3) out.push(candidates[ci]);
    }
    return out;
  }

  function _matchSimpleDimension(text, items) {
    var candidates = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var kws = item.keywords || [];
      var hits = 0;
      for (var j = 0; j < kws.length; j++) {
        if (text.indexOf(_lower(kws[j])) !== -1) hits++;
      }
      if (hits > 0) {
        var hitRatio = hits / Math.max(kws.length * 0.1, 3);
        var confidence = 0.7 * Math.min(hitRatio, 1.0);
        candidates.push({ id: item.id, label: item.label, confidence: Math.min(confidence, 1.0), hits: hits });
      }
    }
    candidates.sort(function (a, b) { return b.confidence - a.confidence; });
    var out = [];
    for (var ci = 0; ci < candidates.length; ci++) {
      if (candidates[ci].confidence >= 0.3 && out.length < 3) out.push(candidates[ci]);
    }
    return out;
  }

  function _matchAttributes(text) {
    var candidates = [];
    var attrs = C.KNOWLEDGE_ATTRIBUTES || [];
    for (var i = 0; i < attrs.length; i++) {
      var attr = attrs[i];
      var kws = attr.keywords || [];
      var hits = 0;
      for (var j = 0; j < kws.length; j++) {
        if (text.indexOf(_lower(kws[j])) !== -1) hits++;
      }
      if (hits > 0) {
        var hitRatio = hits / Math.max(kws.length * 0.1, 3);
        var confidence = 0.6 * Math.min(hitRatio, 1.0);
        candidates.push({ id: attr.id, label: attr.label, confidence: Math.min(confidence, 1.0), desc: attr.desc });
      }
    }
    candidates.sort(function (a, b) { return b.confidence - a.confidence; });
    var out = [];
    for (var ci = 0; ci < candidates.length; ci++) {
      if (candidates[ci].confidence >= 0.25 && out.length < 3) out.push(candidates[ci]);
    }
    return out;
  }

  function _computeOverallConfidence(result) {
    var scores = [];
    if (result.contentCategory && result.contentCategory.length > 0) {
      for (var i = 0; i < result.contentCategory.length; i++) scores.push(result.contentCategory[i].confidence);
    }
    if (result.machineType && result.machineType.length > 0) {
      for (var j = 0; j < result.machineType.length; j++) scores.push(result.machineType[j].confidence);
    }
    if (result.materialType && result.materialType.length > 0) {
      for (var k = 0; k < result.materialType.length; k++) scores.push(result.materialType[k].confidence);
    }
    if (result.systemBrand && result.systemBrand.length > 0) {
      for (var m = 0; m < result.systemBrand.length; m++) scores.push(result.systemBrand[m].confidence);
    }
    if (result.knowledgeAttr && result.knowledgeAttr.length > 0) {
      for (var n = 0; n < result.knowledgeAttr.length; n++) scores.push(result.knowledgeAttr[n].confidence);
    }
    if (scores.length === 0) return 0;
    var sum = 0;
    for (var s = 0; s < scores.length; s++) sum += scores[s];
    return Math.round((sum / scores.length) * 100) / 100;
  }

  // ── 难度评估 ──
  function assessDifficulty(content, metadata) {
    if (!content || content.length < 50) return { level: 'beginner', score: 1, details: {} };
    var text = content;
    var termDensity = computeTermDensity(text);
    var termScore = _scoreTermDensity(termDensity);
    var fileSize = text.length;
    var sizeScore = _scoreFileSize(fileSize);
    var codeStats = analyzeCodeBlocks(text);
    var codeScore = _scoreCodeComplexity(codeStats);
    var formulaCount = countFormulas(text);
    var formulaScore = _scoreFormulaCount(formulaCount);
    var prereqCount = countPrerequisites(text);
    var prereqScore = _scorePrerequisites(prereqCount);

    var dw = C.ALGORITHM_WEIGHTS && C.ALGORITHM_WEIGHTS.difficulty;
    var wTD = (dw && dw.termDensity) || 0.25;
    var wFS = (dw && dw.fileSize) || 0.15;
    var wCL = (dw && dw.codeLines) || 0.20;
    var wFC = (dw && dw.formulaCount) || 0.15;
    var wPC = (dw && dw.prereqCount) || 0.25;

    var totalScore = termScore * wTD + sizeScore * wFS + codeScore * wCL + formulaScore * wFC + prereqScore * wPC;
    var level;
    if (totalScore <= 1.5) level = 'beginner';
    else if (totalScore <= 2.5) level = 'elementary';
    else if (totalScore <= 3.5) level = 'intermediate';
    else if (totalScore <= 4.5) level = 'advanced';
    else level = 'expert';

    return {
      level: level,
      score: Math.round(totalScore * 10) / 10,
      details: {
        termDensity: Math.round(termDensity * 10000) / 10000,
        fileSize: fileSize,
        codeLines: codeStats.totalLines,
        formulaCount: formulaCount,
        prereqCount: prereqCount
      }
    };
  }

  function computeTermDensity(content) {
    var text = content.replace(/```[\s\S]*?```/g, '');
    var totalChars = text.length;
    if (totalChars === 0) return 0;
    var terms = C.TECHNICAL_TERMS || [];
    var termCount = 0;
    for (var i = 0; i < terms.length; i++) {
      var t = terms[i];
      var re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      var matches = text.match(re);
      if (matches) termCount += matches.length;
    }
    return termCount / totalChars;
  }

  function _scoreTermDensity(density) {
    var dt = C.DIFFICULTY_THRESHOLDS;
    if (!dt || !dt.termDensity) {
      if (density < 0.03) return 1;
      if (density < 0.06) return 2;
      if (density < 0.10) return 3;
      if (density < 0.15) return 4;
      return 5;
    }
    var map = dt.termDensity;
    var levels = ['beginner', 'elementary', 'intermediate', 'advanced', 'expert'];
    for (var i = levels.length - 1; i >= 0; i--) {
      if (density >= map[levels[i]]) return i + 1;
    }
    return 1;
  }

  function _scoreFileSize(size) {
    var dt = C.DIFFICULTY_THRESHOLDS;
    if (!dt || !dt.fileSize) {
      if (size < 2048) return 1;
      if (size < 4096) return 2;
      if (size < 8192) return 3;
      if (size < 14336) return 4;
      return 5;
    }
    var map = dt.fileSize;
    var levels = ['beginner', 'elementary', 'intermediate', 'advanced', 'expert'];
    for (var i = levels.length - 1; i >= 0; i--) {
      if (size >= map[levels[i]]) return i + 1;
    }
    return 1;
  }

  function analyzeCodeBlocks(content) {
    var result = { totalLines: 0, blockCount: 0, avgNestingDepth: 0, hasLoops: false, hasConditions: false };
    var codeBlockRegex = /```[\s\S]*?```/g;
    var blocks = content.match(codeBlockRegex);
    if (!blocks) return result;
    result.blockCount = blocks.length;
    var totalDepth = 0;
    for (var b = 0; b < blocks.length; b++) {
      var lines = blocks[b].split('\n');
      result.totalLines += lines.length;
      var maxNesting = 0;
      var currentNesting = 0;
      for (var l = 0; l < lines.length; l++) {
        var line = _trim(lines[l]);
        if (line.indexOf('IF') !== -1 || line.indexOf('WHILE') !== -1 || line.indexOf('FOR') !== -1) {
          currentNesting++;
          if (currentNesting > maxNesting) maxNesting = currentNesting;
        }
        if (line.indexOf('ENDIF') !== -1 || line.indexOf('ENDW') !== -1 || line.indexOf('NEXT') !== -1) {
          currentNesting = Math.max(0, currentNesting - 1);
        }
        if (line.match(/GOTO\s+\d+/)) result.hasLoops = true;
        if (line.match(/IF\s+\[.*\]/)) result.hasConditions = true;
      }
      totalDepth += maxNesting;
    }
    if (result.blockCount > 0) result.avgNestingDepth = Math.round((totalDepth / result.blockCount) * 10) / 10;
    return result;
  }

  function _scoreCodeComplexity(codeStats) {
    var lines = codeStats.totalLines;
    var dt = C.DIFFICULTY_THRESHOLDS;
    if (!dt || !dt.codeLines) {
      if (lines <= 3) return 1;
      if (lines <= 8) return 2;
      if (lines <= 15) return 3;
      if (lines <= 30) return 4;
      return 5;
    }
    var map = dt.codeLines;
    var levels = ['beginner', 'elementary', 'intermediate', 'advanced', 'expert'];
    for (var i = levels.length - 1; i >= 0; i--) {
      if (lines >= map[levels[i]]) return i + 1;
    }
    return 1;
  }

  function countFormulas(content) {
    var text = content;
    var count = 0;
    var patterns = [
      /[+\-*/%=]/, /Math\./, /sin|cos|tan|sqrt|abs|pow/, /圆周率|PI/, /[×÷±√∑∏∫]/
    ];
    for (var i = 0; i < patterns.length; i++) {
      var matches = text.match(patterns[i]);
      if (matches) count += matches.length;
    }
    var formulaBlocks = text.match(/```[\s\S]*?```/g);
    if (formulaBlocks) {
      for (var j = 0; j < formulaBlocks.length; j++) {
        var fm = formulaBlocks[j].match(/[+\-*/%=]/g);
        if (fm) count += fm.length * 0.5;
      }
    }
    return Math.round(count);
  }

  function _scoreFormulaCount(count) {
    var dt = C.DIFFICULTY_THRESHOLDS;
    if (!dt || !dt.formulaCount) {
      if (count <= 0) return 1;
      if (count <= 1) return 2;
      if (count <= 3) return 3;
      if (count <= 5) return 4;
      return 5;
    }
    var map = dt.formulaCount;
    var levels = ['beginner', 'elementary', 'intermediate', 'advanced', 'expert'];
    for (var i = levels.length - 1; i >= 0; i--) {
      if (count >= map[levels[i]]) return i + 1;
    }
    return 1;
  }

  function countPrerequisites(content) {
    var text = _lower(content);
    var count = 0;
    var patterns = [
      '前置', '前提', '需要先', '必须掌握', '要求', '预先',
      '在...之前', '需要了解', '需要有', '基础知识',
      '编程基础', 'G代码基础', '操作基础', 'CAM基础'
    ];
    for (var i = 0; i < patterns.length; i++) {
      if (text.indexOf(patterns[i]) !== -1) count++;
    }
    var fileRefs = text.match(/\[.+?\]\(.+?\.md\)/g);
    if (fileRefs) count += Math.round(fileRefs.length * 0.5);
    return count;
  }

  function _scorePrerequisites(count) {
    var dt = C.DIFFICULTY_THRESHOLDS;
    if (!dt || !dt.prereqCount) {
      if (count <= 0) return 1;
      if (count <= 1) return 2;
      if (count <= 3) return 3;
      if (count <= 5) return 4;
      return 5;
    }
    var map = dt.prereqCount;
    var levels = ['beginner', 'elementary', 'intermediate', 'advanced', 'expert'];
    for (var i = levels.length - 1; i >= 0; i--) {
      if (count >= map[levels[i]]) return i + 1;
    }
    return 1;
  }

  // ── 标签相似度 ──
  function computeTagSimilarity(tagsA, tagsB) {
    var flatA = flattenTags(tagsA);
    var flatB = flattenTags(tagsB);
    if (flatA.length === 0 || flatB.length === 0) return 0;

    var setB = {};
    for (var i = 0; i < flatB.length; i++) setB[flatB[i]] = true;
    var intersection = 0;
    for (var j = 0; j < flatA.length; j++) {
      if (setB[flatA[j]]) intersection++;
    }
    var all = flatA.concat(flatB);
    var unionKeys = {};
    for (var k = 0; k < all.length; k++) unionKeys[all[k]] = true;
    var unionSize = 0;
    for (var uk in unionKeys) { if (unionKeys.hasOwnProperty(uk)) unionSize++; }

    var weightedA = _tagWeightedVector(tagsA);
    var weightedB = _tagWeightedVector(tagsB);
    var weightedScore = cosineSimilarity(weightedA, weightedB);

    return unionSize > 0 ? (intersection / unionSize) * 0.6 + weightedScore * 0.4 : 0;
  }

  function flattenTags(tags) {
    var result = [];
    if (!tags) return result;
    if (tags.contentCategory) {
      for (var i = 0; i < tags.contentCategory.length; i++) {
        result.push('cc:' + (tags.contentCategory[i].id || tags.contentCategory[i]));
      }
    }
    if (tags.machineType) {
      for (var j = 0; j < tags.machineType.length; j++) {
        result.push('mt:' + (tags.machineType[j].id || tags.machineType[j]));
      }
    }
    if (tags.materialType) {
      for (var k = 0; k < tags.materialType.length; k++) {
        result.push('ml:' + (tags.materialType[k].id || tags.materialType[k]));
      }
    }
    if (tags.systemBrand) {
      for (var m = 0; m < tags.systemBrand.length; m++) {
        result.push('sb:' + (tags.systemBrand[m].id || tags.systemBrand[m]));
      }
    }
    if (tags.knowledgeAttr) {
      for (var n = 0; n < tags.knowledgeAttr.length; n++) {
        result.push('ka:' + (tags.knowledgeAttr[n].id || tags.knowledgeAttr[n]));
      }
    }
    return result;
  }

  function _tagWeightedVector(tags) {
    var vec = {};
    var dims = ['contentCategory', 'machineType', 'materialType', 'systemBrand', 'knowledgeAttr'];
    var weights = { contentCategory: 1.0, machineType: 0.8, materialType: 0.6, systemBrand: 0.7, knowledgeAttr: 0.9 };
    for (var d = 0; d < dims.length; d++) {
      var dim = dims[d];
      var items = tags[dim];
      if (items && items.length > 0) {
        for (var i = 0; i < items.length; i++) {
          var id = items[i].id || items[i];
          vec[dim + ':' + id] = weights[dim] * (1 - i * 0.1);
        }
      }
    }
    return vec;
  }

  // ── 内容相似度 (TF-IDF) ──
  function computeContentSimilarity(contentA, contentB) {
    if (!contentA || !contentB) return 0;
    var termsA = extractKeywords(contentA);
    var termsB = extractKeywords(contentB);
    var tfA = termFrequency(termsA);
    var tfB = termFrequency(termsB);
    var idf = _computeIDF([termsA, termsB]);
    var tfidfA = _applyIDF(tfA, idf);
    var tfidfB = _applyIDF(tfB, idf);
    return cosineSimilarity(tfidfA, tfidfB);
  }

  function extractKeywords(content) {
    var text = _lower(content);
    var terms = [];
    var gMatches = text.match(/\bG\d{2,3}\b/g);
    if (gMatches) {
      for (var i = 0; i < gMatches.length; i++) terms.push(gMatches[i]);
    }
    var mMatches = text.match(/\bM\d{2,3}\b/g);
    if (mMatches) {
      for (var j = 0; j < mMatches.length; j++) terms.push(mMatches[j]);
    }
    var techTerms = C.TECHNICAL_TERMS || [];
    for (var k = 0; k < techTerms.length; k++) {
      if (text.indexOf(_lower(techTerms[k])) !== -1) terms.push(techTerms[k]);
    }
    return terms;
  }

  function termFrequency(terms) {
    var tf = {};
    var maxFreq = 0;
    for (var i = 0; i < terms.length; i++) {
      tf[terms[i]] = (tf[terms[i]] || 0) + 1;
      if (tf[terms[i]] > maxFreq) maxFreq = tf[terms[i]];
    }
    if (maxFreq > 0) {
      for (var key in tf) {
        if (tf.hasOwnProperty(key)) tf[key] /= maxFreq;
      }
    }
    return tf;
  }

  function _computeIDF(docTerms) {
    var idf = {};
    var N = docTerms.length;
    for (var d = 0; d < N; d++) {
      var seen = {};
      for (var t = 0; t < docTerms[d].length; t++) {
        var term = docTerms[d][t];
        if (!seen[term]) {
          seen[term] = true;
          idf[term] = (idf[term] || 0) + 1;
        }
      }
    }
    for (var term in idf) {
      if (idf.hasOwnProperty(term)) {
        idf[term] = Math.log(N / (idf[term] || 1)) + 1;
      }
    }
    return idf;
  }

  function _applyIDF(tf, idf) {
    var result = {};
    for (var key in tf) {
      if (tf.hasOwnProperty(key)) {
        result[key] = tf[key] * (idf[key] || 1);
      }
    }
    return result;
  }

  function cosineSimilarity(vecA, vecB) {
    var dotProduct = 0;
    var magA = 0;
    var magB = 0;
    var keys = {};
    for (var key in vecA) { if (vecA.hasOwnProperty(key)) keys[key] = true; }
    for (var key2 in vecB) { if (vecB.hasOwnProperty(key2)) keys[key2] = true; }
    for (var k in keys) {
      if (keys.hasOwnProperty(k)) {
        var a = vecA[k] || 0;
        var b = vecB[k] || 0;
        dotProduct += a * b;
        magA += a * a;
        magB += b * b;
      }
    }
    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);
    return (magA > 0 && magB > 0) ? dotProduct / (magA * magB) : 0;
  }

  // ── 用户画像 ──
  function buildUserProfile(viewHistory, searchHistory, favorites) {
    var profile = {
      interestTags: {},
      skillLevel: 'beginner',
      preferredMachines: {},
      preferredBrands: {},
      preferredMaterials: {},
      viewedCategories: {},
      totalViews: 0,
      lastActive: Date.now()
    };
    var diffScores = { beginner: 1, elementary: 2, intermediate: 3, advanced: 4, expert: 5 };
    var skillSum = 0;
    var skillCount = 0;

    var vh = viewHistory || [];
    for (var i = 0; i < vh.length; i++) {
      var item = vh[i];
      profile.totalViews++;
      if (!item.tags) continue;
      var catTags = item.tags.contentCategory || [];
      for (var c = 0; c < catTags.length; c++) {
        var key = 'cc:' + (catTags[c].id || catTags[c]);
        profile.interestTags[key] = (profile.interestTags[key] || 0) + 1;
        profile.viewedCategories[key] = (profile.viewedCategories[key] || 0) + 1;
      }
      var daysSinceView = (Date.now() - (item.timestamp || Date.now())) / 86400000;
      var recencyWeight = Math.max(0.1, 1 - daysSinceView / 30);
      var machineTags = item.tags.machineType || [];
      for (var m = 0; m < machineTags.length; m++) {
        var mKey = machineTags[m].id || machineTags[m];
        profile.preferredMachines[mKey] = (profile.preferredMachines[mKey] || 0) + recencyWeight;
      }
      var brandTags = item.tags.systemBrand || [];
      for (var b = 0; b < brandTags.length; b++) {
        var bKey = brandTags[b].id || brandTags[b];
        profile.preferredBrands[bKey] = (profile.preferredBrands[bKey] || 0) + recencyWeight;
      }
      if (item.difficulty) {
        var itemScore = diffScores[item.difficulty.level] || 1;
        skillSum += itemScore;
        skillCount++;
      }
    }
    if (skillCount > 0) {
      var avg = skillSum / skillCount;
      var levels = ['beginner', 'elementary', 'intermediate', 'advanced', 'expert'];
      var idx = Math.min(Math.max(Math.round(avg) - 1, 0), 4);
      profile.skillLevel = levels[idx];
    }
    return profile;
  }

  // ── 推荐系统 ──
  function getRecommendations(userProfile, allFiles, limits) {
    limits = limits || {};
    var count = limits.count || 10;

    var rw = C.ALGORITHM_WEIGHTS && C.ALGORITHM_WEIGHTS.recommendation;
    var wCB = (rw && rw.contentBased) || 0.35;
    var wDM = (rw && rw.difficultyMatch) || 0.20;
    var wPO = (rw && rw.popularity) || 0.15;
    var wCF = (rw && rw.collaborative) || 0.30;

    var collabResults = collaborativeFiltering(userProfile, allFiles);
    var contentResults = contentBasedFiltering(userProfile, allFiles);
    var popularResults = _getPopularFiles(allFiles, 20);
    var diffResults = difficultyMatch(userProfile, allFiles);

    var merged = {};
    function _addResult(results, weight) {
      for (var i = 0; i < results.length; i++) {
        var item = results[i];
        var id = item.fileId || item.id || item.file;
        if (!merged[id]) {
          merged[id] = { fileId: id, score: 0, reasons: [], file: item.file || item };
        }
        merged[id].score += ((results.length - i) / results.length) * weight;
        if (item.reason) merged[id].reasons.push(item.reason);
      }
    }
    _addResult(collabResults, wCF);
    _addResult(contentResults, wCB);
    _addResult(popularResults, wPO);
    _addResult(diffResults, wDM);

    var out = [];
    for (var key in merged) {
      if (merged.hasOwnProperty(key)) out.push(merged[key]);
    }
    out.sort(function (a, b) { return b.score - a.score; });

    var viewedSet = {};
    var vh = userProfile.viewHistory || [];
    for (var v = 0; v < vh.length; v++) {
      viewedSet[vh[v].fileId] = true;
    }
    out = out.filter(function (r) { return !viewedSet[r.fileId]; });
    return out.slice(0, count);
  }

  function collaborativeFiltering(profile, allFiles) {
    return [];
  }

  function contentBasedFiltering(profile, allFiles) {
    var results = [];
    var interestKeys = Object.keys(profile.interestTags || {});
    interestKeys.sort(function (a, b) { return (profile.interestTags[b] || 0) - (profile.interestTags[a] || 0); });
    var topTags = interestKeys.slice(0, 5);

    if (topTags.length === 0) return results;

    for (var f = 0; f < allFiles.length; f++) {
      var file = allFiles[f];
      if (!file.tags) continue;
      var fileTags = flattenTags(file.tags);
      var matchScore = 0;
      for (var t = 0; t < topTags.length; t++) {
        for (var ft = 0; ft < fileTags.length; ft++) {
          if (fileTags[ft] === topTags[t]) { matchScore++; break; }
        }
      }
      if (matchScore > 0) {
        results.push({
          fileId: file.id || file.fileId,
          score: matchScore / topTags.length,
          reason: '基于你的浏览兴趣',
          file: file
        });
      }
    }
    results.sort(function (a, b) { return b.score - a.score; });
    return results.slice(0, 20);
  }

  function _getPopularFiles(allFiles, count) {
    var sorted = allFiles.slice(0);
    sorted.sort(function (a, b) {
      var pa = a.viewCount || a.popularity || 0;
      var pb = b.viewCount || b.popularity || 0;
      return pb - pa;
    });
    var out = [];
    for (var i = 0; i < Math.min(count, sorted.length); i++) {
      out.push({ fileId: sorted[i].id || sorted[i].fileId, score: 0, reason: '热门推荐', file: sorted[i] });
    }
    return out;
  }

  function difficultyMatch(profile, allFiles) {
    var userLevel = profile.skillLevel || 'beginner';
    var levels = ['beginner', 'elementary', 'intermediate', 'advanced', 'expert'];
    var userIdx = levels.indexOf(userLevel);
    if (userIdx === -1) userIdx = 0;
    var results = [];
    for (var f = 0; f < allFiles.length; f++) {
      var file = allFiles[f];
      var fileLevel = (file.tags && file.tags.difficulty && file.tags.difficulty.level) || 'beginner';
      var fileIdx = levels.indexOf(fileLevel);
      if (fileIdx === -1) fileIdx = 0;
      var diff = Math.abs(userIdx - fileIdx);
      var score = diff <= 1 ? 1.0 : diff <= 2 ? 0.5 : 0.1;
      if (score > 0.3) {
        results.push({
          fileId: file.id || file.fileId,
          score: score,
          reason: '适合你当前水平 (' + fileLevel + ')',
          file: file
        });
      }
    }
    results.sort(function (a, b) { return b.score - a.score; });
    return results.slice(0, 20);
  }

  // ── 搜索排序 ──
  function rankSearchResults(results, keyword, userProfile) {
    for (var i = 0; i < results.length; i++) {
      var result = results[i];
      var sr = C.ALGORITHM_WEIGHTS && C.ALGORITHM_WEIGHTS.searchRanking;
      var wKM = (sr && sr.keywordMatch) || 0.40;
      var wCQ = (sr && sr.contentQuality) || 0.20;
      var wPO = (sr && sr.popularity) || 0.15;
      var wTI = (sr && sr.timeliness) || 0.10;
      var wPE = (sr && sr.personalization) || 0.15;

      var matchScore = _computeKeywordMatch(result, keyword);
      var qualityScore = _computeQualityScore(result);
      var popularityScore = _computePopularityScore(result);
      var timelinessScore = _computeTimelinessScore(result);
      var personalScore = _computePersonalScore(result, userProfile);

      result.rankScore = Math.round(
        (matchScore * wKM + qualityScore * wCQ + popularityScore * wPO +
         timelinessScore * wTI + personalScore * wPE) * 100
      ) / 100;
    }
    results.sort(function (a, b) { return (b.rankScore || 0) - (a.rankScore || 0); });
    return results;
  }

  function _computeKeywordMatch(result, keyword) {
    var kw = _lower(keyword);
    var title = _lower(result.title || '');
    var tags = _lower(flattenTags(result.tags || {}).join(' '));
    var content = _lower((result.content || '').substring(0, 500));

    if (title === kw) return 1.0;
    if (title.indexOf(kw) !== -1) return 0.8;
    if (tags.indexOf(kw) !== -1) return 0.7;

    var kwParts = kw.split(/[\s,，、]/).filter(function (p) { return p.length > 0; });
    var titleHits = 0;
    for (var i = 0; i < kwParts.length; i++) {
      if (title.indexOf(kwParts[i]) !== -1) titleHits++;
    }
    if (titleHits > 0) return 0.4 + 0.4 * (titleHits / kwParts.length);
    if (content.indexOf(kw) !== -1) return 0.3;
    return 0.1;
  }

  function _computeQualityScore(result) {
    var size = result.size || (result.content || '').length || 0;
    var score;
    if (size > 14336) score = 1.0;
    else if (size > 4096) score = 0.7;
    else if (size > 500) score = 0.4;
    else score = 0.1;
    var content = result.content || '';
    if (content.indexOf('```') !== -1) score = Math.min(score + 0.15, 1.0);
    if (content.indexOf('|') !== -1) score = Math.min(score + 0.1, 1.0);
    return score;
  }

  function _computePopularityScore(result) {
    var views = result.viewCount || result.popularity || 0;
    return Math.min(views / 100, 1.0);
  }

  function _computeTimelinessScore(result) {
    var updated = result.updated || result.timestamp || 0;
    if (!updated) return 0.5;
    var daysSinceUpdate = (Date.now() - updated) / 86400000;
    if (daysSinceUpdate <= 30) return 1.0;
    if (daysSinceUpdate <= 90) return 0.7;
    if (daysSinceUpdate <= 180) return 0.5;
    if (daysSinceUpdate <= 365) return 0.3;
    return 0.1;
  }

  function _computePersonalScore(result, profile) {
    if (!profile) return 0.5;
    var fileTags = flattenTags(result.tags || {});
    var interestTags = Object.keys(profile.interestTags || {});
    var tagMatch = 0;
    for (var i = 0; i < interestTags.length; i++) {
      for (var j = 0; j < fileTags.length; j++) {
        if (fileTags[j] === interestTags[i]) { tagMatch++; break; }
      }
    }
    var tagScore = interestTags.length > 0 ? tagMatch / interestTags.length : 0;
    var diffMatch = 0;
    if (profile.skillLevel && result.tags && result.tags.difficulty) {
      var levels = ['beginner', 'elementary', 'intermediate', 'advanced', 'expert'];
      var userIdx = levels.indexOf(profile.skillLevel);
      var fileIdx = levels.indexOf(result.tags.difficulty.level);
      if (userIdx >= 0 && fileIdx >= 0) {
        diffMatch = Math.max(0, 1 - Math.abs(userIdx - fileIdx) * 0.3);
      }
    }
    return tagScore * 0.6 + diffMatch * 0.4;
  }

  // ── 搜索建议 ──
  function getSuggestions(keyword, knowledgeBase) {
    if (!keyword || keyword.length < 2) return [];
    var kw = _lower(keyword);
    var suggestions = [];
    var seen = {};
    var allKeys = [];
    if (C.getAllKeywords) {
      allKeys = C.getAllKeywords();
    }
    for (var i = 0; i < allKeys.length; i++) {
      if (_lower(allKeys[i]).indexOf(kw) !== -1 && !seen[allKeys[i]]) {
        seen[allKeys[i]] = true;
        suggestions.push({
          text: allKeys[i],
          type: 'keyword',
          score: allKeys[i].length / (allKeys[i].length + Math.abs(allKeys[i].length - kw.length))
        });
      }
    }
    if (knowledgeBase) {
      for (var j = 0; j < knowledgeBase.length; j++) {
        var name = _lower(knowledgeBase[j].name || '');
        if (name.indexOf(kw) !== -1 && !seen[name]) {
          seen[name] = true;
          suggestions.push({ text: knowledgeBase[j].name, type: 'file', score: 0.6 });
        }
      }
    }
    suggestions.sort(function (a, b) { return b.score - a.score; });
    return suggestions.slice(0, 8);
  }

  // ── 导出 ──
  window.CNC_TAGGING_ALGORITHMS = {
    // 自动分类
    autoClassify: autoClassify,
    // 难度评估
    assessDifficulty: assessDifficulty,
    computeTermDensity: computeTermDensity,
    analyzeCodeBlocks: analyzeCodeBlocks,
    countFormulas: countFormulas,
    countPrerequisites: countPrerequisites,
    // 标签相似度
    computeTagSimilarity: computeTagSimilarity,
    flattenTags: flattenTags,
    // 内容相似度
    computeContentSimilarity: computeContentSimilarity,
    extractKeywords: extractKeywords,
    termFrequency: termFrequency,
    cosineSimilarity: cosineSimilarity,
    // 用户画像
    buildUserProfile: buildUserProfile,
    // 推荐系统
    getRecommendations: getRecommendations,
    collaborativeFiltering: collaborativeFiltering,
    contentBasedFiltering: contentBasedFiltering,
    difficultyMatch: difficultyMatch,
    // 搜索排序
    rankSearchResults: rankSearchResults,
    // 搜索建议
    getSuggestions: getSuggestions
  };

  console.log('[CNC_TAGGING_ALGORITHMS] 算法库已加载。函数数: ' + Object.keys(window.CNC_TAGGING_ALGORITHMS).length);
})();
