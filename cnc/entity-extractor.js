/**
 * entity-extractor.js
 * 实体识别系统 — 从Markdown文件中提取G代码/M代码/刀具/机床/材料/工艺/概念/考点
 * 内置标准化/别名映射/去重/评分
 * 全局对象: window.CNC_ENTITY_EXTRACTOR
 */
(function () {
  'use strict';

  if (window.CNC_ENTITY_EXTRACTOR) return;

  var config = window.CNC_IMPORT_CONFIG;
  var _aliasMap = config ? config.CONFIG.ALIAS_MAP : {};
  var _toolPatterns = config ? config.CONFIG.TOOL_PATTERNS : [];
  var _machinePatterns = config ? config.CONFIG.MACHINE_PATTERNS : [];
  var _materialPatterns = config ? config.CONFIG.MATERIAL_PATTERNS : [];
  var _conceptPatterns = config ? config.CONFIG.CONCEPT_PATTERNS : [];

  function _normalize(text) {
    return (text || '').toString().trim();
  }

  function _dedupe(arr) {
    var seen = {};
    return arr.filter(function (item) {
      var key = typeof item === 'string' ? item : JSON.stringify(item);
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function _normalizeGCode(code) {
    var c = code.toUpperCase().replace(/\s+/g, '');
    return _aliasMap[c] || c;
  }

  function _normalizeMCode(code) {
    var c = code.toUpperCase().replace(/\s+/g, '');
    return _aliasMap[c] || c;
  }

  function _standardizeName(name) {
    return _aliasMap[name] || name;
  }

  function extractGCodes(content) {
    if (!content) return [];
    var regex = config ? config.CONFIG.GCODE_REGEX : /\bG\d{2,3}(?!\d)\b/g;
    var matches = content.match(regex);
    if (!matches) return [];
    return _dedupe(matches.map(_normalizeGCode));
  }

  function extractMCodes(content) {
    if (!content) return [];
    var regex = config ? config.CONFIG.MCODE_REGEX : /\bM\d{2,3}(?!\d)\b/g;
    var matches = content.match(regex);
    if (!matches) return [];
    return _dedupe(matches.map(_normalizeMCode));
  }

  function extractTCodes(content) {
    if (!content) return [];
    var regex = config ? config.CONFIG.TCODE_REGEX : /\bT\d{1,2}\b/g;
    var matches = content.match(regex);
    if (!matches) return [];
    return _dedupe(matches.map(function (t) { return t.toUpperCase(); }));
  }

  function extractTools(content) {
    if (!content) return [];
    var results = [];
    var contentLower = content.toLowerCase();
    for (var i = 0; i < _toolPatterns.length; i++) {
      var tp = _toolPatterns[i];
      for (var j = 0; j < tp.patterns.length; j++) {
        var p = tp.patterns[j].toLowerCase();
        if (contentLower.indexOf(p) !== -1) {
          var stdName = _standardizeName(tp.patterns[0]);
          results.push({
            type: 'tool',
            subtype: tp.type,
            name: stdName,
            original: tp.patterns[0],
            confidence: tp.type === 'endmill' || tp.type === 'drill' ? 0.9 : 0.7
          });
          break;
        }
      }
    }
    return results;
  }

  function extractMachines(content) {
    if (!content) return [];
    var results = [];
    for (var i = 0; i < _machinePatterns.length; i++) {
      var mp = _machinePatterns[i];
      var found = false;
      for (var j = 0; j < mp.patterns.length; j++) {
        if (content.indexOf(mp.patterns[j]) !== -1) {
          found = true;
          break;
        }
      }
      if (found) {
        results.push({
          type: 'machine',
          system: mp.system,
          name: mp.system,
          confidence: 0.8
        });
      }
    }
    return results;
  }

  function extractMaterials(content) {
    if (!content) return [];
    var results = [];
    for (var i = 0; i < _materialPatterns.length; i++) {
      var mp = _materialPatterns[i];
      var found = false;
      for (var j = 0; j < mp.patterns.length; j++) {
        if (content.indexOf(mp.patterns[j]) !== -1) {
          found = true;
          break;
        }
      }
      if (found) {
        results.push({
          type: 'material',
          material: mp.material,
          name: mp.patterns[0],
          confidence: 0.75
        });
      }
    }
    return results;
  }

  function extractConcepts(content) {
    if (!content) return [];
    var results = [];
    for (var i = 0; i < _conceptPatterns.length; i++) {
      if (content.indexOf(_conceptPatterns[i]) !== -1) {
        var stdName = _standardizeName(_conceptPatterns[i]);
        results.push({
          type: 'concept',
          name: stdName || _conceptPatterns[i],
          original: _conceptPatterns[i],
          confidence: 0.6
        });
      }
    }
    return results;
  }

  function extractParameters(content) {
    if (!content) return [];
    var results = [];
    // 提取切削参数 (feed/speed/depth)
    var feedMatch = content.match(/[Ff]\s*=\s*(\d+(?:\.\d+)?)\s*mm\/min/g);
    var speedMatch = content.match(/[Ss]\s*=\s*(\d+(?:\.\d+)?)\s*r\/min/g);
    var depthMatch = content.match(/[Aa][pP]\s*[:=]\s*(\d+(?:\.\d+)?)\s*mm/g);
    if (feedMatch) results.push({ type: 'parameter', name: '进给速度', value: feedMatch[0], confidence: 0.5 });
    if (speedMatch) results.push({ type: 'parameter', name: '主轴转速', value: speedMatch[0], confidence: 0.5 });
    if (depthMatch) results.push({ type: 'parameter', name: '切削深度', value: depthMatch[0], confidence: 0.5 });
    return results;
  }

  function extractProcesses(content) {
    if (!content) return [];
    var results = [];
    var processKeywords = ['铣削', '车削', '钻孔', '镗孔', '攻丝', '磨削', '线切割', '电火花', '激光切割', '水刀',
      '粗加工', '精加工', '半精加工', '开粗', '光刀', '清根', '倒角', '螺纹加工'];
    for (var i = 0; i < processKeywords.length; i++) {
      if (content.indexOf(processKeywords[i]) !== -1) {
        results.push({
          type: 'process',
          name: processKeywords[i],
          confidence: 0.5
        });
      }
    }
    return results;
  }

  function extractAll(content, fileMetadata) {
    if (!content) return { entities: [], warnings: [] };
    var warnings = [];

    var gcodes = extractGCodes(content);
    var mcodes = extractMCodes(content);
    var tcodes = extractTCodes(content);
    var tools = extractTools(content);
    var machines = extractMachines(content);
    var materials = extractMaterials(content);
    var concepts = extractConcepts(content);
    var parameters = extractParameters(content);
    var processes = extractProcesses(content);

    var entities = [];

    // G代码实体
    for (var g = 0; g < gcodes.length; g++) {
      entities.push({
        id: 'gcode_' + gcodes[g],
        type: 'gcode',
        label: gcodes[g],
        properties: { category: 'G代码', description: '' },
        metadata: { source: fileMetadata ? fileMetadata.path : '' },
        confidence: 0.9
      });
    }

    // M代码实体
    for (var m = 0; m < mcodes.length; m++) {
      entities.push({
        id: 'mcode_' + mcodes[m],
        type: 'mcode',
        label: mcodes[m],
        properties: { category: 'M代码', description: '' },
        metadata: { source: fileMetadata ? fileMetadata.path : '' },
        confidence: 0.9
      });
    }

    // 刀具实体
    var seenTools = {};
    for (var t = 0; t < tools.length; t++) {
      var tk = tools[t].subtype + '_' + tools[t].name;
      if (!seenTools[tk]) {
        seenTools[tk] = true;
        entities.push({
          id: 'tool_' + tools[t].subtype + '_' + tools[t].name.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_'),
          type: 'tool',
          label: tools[t].name,
          properties: { subtype: tools[t].subtype, category: '刀具' },
          metadata: { source: fileMetadata ? fileMetadata.path : '' },
          confidence: tools[t].confidence
        });
      }
    }

    // 机床实体
    var seenMachines = {};
    for (var mc = 0; mc < machines.length; mc++) {
      if (!seenMachines[machines[mc].system]) {
        seenMachines[machines[mc].system] = true;
        entities.push({
          id: 'machine_' + machines[mc].system.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          type: 'machine',
          label: machines[mc].system,
          properties: { system: machines[mc].system, category: '机床' },
          metadata: { source: fileMetadata ? fileMetadata.path : '' },
          confidence: machines[mc].confidence
        });
      }
    }

    // 材料实体
    var seenMaterials = {};
    for (var mt = 0; mt < materials.length; mt++) {
      if (!seenMaterials[materials[mt].material]) {
        seenMaterials[materials[mt].material] = true;
        entities.push({
          id: 'material_' + materials[mt].material,
          type: 'material',
          label: materials[mt].name,
          properties: { materialKey: materials[mt].material, category: '材料' },
          metadata: { source: fileMetadata ? fileMetadata.path : '' },
          confidence: materials[mt].confidence
        });
      }
    }

    // 概念实体
    var seenConcepts = {};
    for (var c = 0; c < concepts.length; c++) {
      if (!seenConcepts[concepts[c].name]) {
        seenConcepts[concepts[c].name] = true;
        entities.push({
          id: 'concept_' + concepts[c].name.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_'),
          type: 'concept',
          label: concepts[c].name,
          properties: { category: '概念', description: '' },
          metadata: { source: fileMetadata ? fileMetadata.path : '' },
          confidence: concepts[c].confidence
        });
      }
    }

    // 参数实体
    for (var p = 0; p < parameters.length; p++) {
      entities.push({
        id: 'parameter_' + parameters[p].name.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_') + '_' + (fileMetadata ? fileMetadata.fileId : ''),
        type: 'parameter',
        label: parameters[p].name,
        properties: { value: parameters[p].value, category: '参数' },
        metadata: { source: fileMetadata ? fileMetadata.path : '' },
        confidence: parameters[p].confidence
      });
    }

    // 工艺实体
    var seenProcesses = {};
    for (var pr = 0; pr < processes.length; pr++) {
      if (!seenProcesses[processes[pr].name]) {
        seenProcesses[processes[pr].name] = true;
        entities.push({
          id: 'process_' + processes[pr].name.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_'),
          type: 'process',
          label: processes[pr].name,
          properties: { category: '工艺' },
          metadata: { source: fileMetadata ? fileMetadata.path : '' },
          confidence: processes[pr].confidence
        });
      }
    }

    // 提取话题标签
    var tagMatch = content.match(/(?:标签|tags|keywords)[：:]\s*(.+)/i);
    var tags = [];
    if (tagMatch) {
      tags = tagMatch[1].split(/[,，、\s]+/).filter(function (t) { return t.trim(); });
    }

    return {
      entities: entities,
      tags: tags,
      gcodes: gcodes,
      mcodes: mcodes,
      toolCount: tools.length,
      machineCount: machines.length,
      materialCount: materials.length,
      conceptCount: concepts.length,
      warnings: warnings
    };
  }

  function extractFromExamContent(content, fileMetadata) {
    if (!content) return { entities: [], examTopics: [] };

    var result = extractAll(content, fileMetadata);
    var examTopics = [];

    // 从考题内容提取考点关键词
    var topicPatterns = ['考点', '知识点', '章节', '题型'];
    for (var i = 0; i < topicPatterns.length; i++) {
      var regex = new RegExp(topicPatterns[i] + '[：:]([^\\n]+)', 'g');
      var match;
      while ((match = regex.exec(content)) !== null) {
        var topic = match[1].trim();
        if (topic && topic.length < 50) {
          var normalized = _standardizeName(topic) || topic;
          examTopics.push({ topic: normalized, source: fileMetadata ? fileMetadata.path : '' });
        }
      }
    }

    // 如果没有找到考点关键词，使用路径中的分类名
    if (examTopics.length === 0 && fileMetadata && fileMetadata.categories) {
      for (var c = 0; c < fileMetadata.categories.length; c++) {
        examTopics.push({ topic: fileMetadata.categories[c], source: fileMetadata.path, inferred: true });
      }
    }

    return {
      entities: result.entities,
      tags: result.tags,
      examTopics: examTopics,
      gcodes: result.gcodes,
      mcodes: result.mcodes,
      warnings: result.warnings
    };
  }

  function mergeEntityLists(lists) {
    var merged = [];
    var seen = {};
    for (var i = 0; i < lists.length; i++) {
      var list = lists[i];
      if (!list || !list.entities) continue;
      for (var j = 0; j < list.entities.length; j++) {
        var e = list.entities[j];
        if (!seen[e.id]) {
          seen[e.id] = true;
          merged.push(e);
        }
      }
    }
    return merged;
  }

  window.CNC_ENTITY_EXTRACTOR = {
    extractGCodes: extractGCodes,
    extractMCodes: extractMCodes,
    extractTCodes: extractTCodes,
    extractTools: extractTools,
    extractMachines: extractMachines,
    extractMaterials: extractMaterials,
    extractConcepts: extractConcepts,
    extractParameters: extractParameters,
    extractProcesses: extractProcesses,
    extractAll: extractAll,
    extractFromExamContent: extractFromExamContent,
    mergeEntityLists: mergeEntityLists
  };

  console.log('[CNC_ENTITY_EXTRACTOR] 实体提取器已加载。支持: ' + _toolPatterns.length + ' 种刀具, ' + _machinePatterns.length + ' 种机床, ' + _materialPatterns.length + ' 种材料, ' + _conceptPatterns.length + ' 个概念模式');
})();
