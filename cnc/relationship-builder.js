/**
 * relationship-builder.js
 * 关系构建系统 — 基于共现/文件结构/模式匹配建立实体间关系
 * 支持前置/相关/包含/应用/替代/对比/依赖/因果/考核 9种关系类型
 * 全局对象: window.CNC_RELATIONSHIP_BUILDER
 */
(function () {
  'use strict';

  if (window.CNC_RELATIONSHIP_BUILDER) return;

  var config = window.CNC_IMPORT_CONFIG;
  var _weights = config ? config.CONFIG.RELATION_WEIGHTS : {};

  function _getWeight(type) {
    return _weights[type] || 0.5;
  }

  // ── 同一文件中共现实体 → related_to ──
  function buildCooccurrenceRelations(entities, fileEntities) {
    if (!entities || entities.length < 2) return [];
    var edges = [];
    var added = {};

    for (var i = 0; i < entities.length; i++) {
      for (var j = i + 1; j < entities.length; j++) {
        var ei = entities[i];
        var ej = entities[j];
        if (!ei.id || !ej.id) continue;
        var key = ei.id + '|' + ej.id;
        var revKey = ej.id + '|' + ei.id;
        if (added[key] || added[revKey]) continue;

        // 同一类型不同代码 → compared_with
        // 不同类型 → related_to
        var relationType = (ei.type === ej.type && ei.type !== 'file') ? 'compared_with' : 'related_to';
        var weight = (ei.confidence || 0.5) * (ej.confidence || 0.5);

        edges.push({
          source: ei.id,
          target: ej.id,
          relationType: relationType,
          weight: Math.round(weight * 10) / 10,
          properties: {
            cooccurrence: true,
            sourceFile: fileEntities ? fileEntities.filePath : ''
          }
        });
        added[key] = true;
      }
    }
    return edges;
  }

  // ── 文件分类层次 → part_of ──
  function buildCategoryRelations(filePath, fileNodeId, categoryEntities) {
    var edges = [];
    if (!categoryEntities || !categoryEntities.length) return edges;
    if (!fileNodeId) return edges;

    for (var i = 0; i < categoryEntities.length; i++) {
      edges.push({
        source: fileNodeId,
        target: categoryEntities[i].id,
        relationType: 'belongs_to',
        weight: _getWeight('belongs_to'),
        properties: { level: i }
      });
    }
    return edges;
  }

  // ── G代码/M代码 → depends_on / requires ──
  function buildCodeDependencyRelations(gcodes, mcodes) {
    var edges = [];
    // G代码之间的依赖关系 (G90/G91, G41/G42)
    var gDeps = {
      'G41': { depends_on: 'G40', reason: '取消补偿后启用' },
      'G42': { depends_on: 'G40', reason: '取消补偿后启用' },
      'G43': { depends_on: 'G49', reason: '取消长度补偿后启用' },
      'G94': { related_to: 'G95', reason: '进给模式切换' },
      'G98': { related_to: 'G99', reason: '返回平面模式切换' }
    };

    for (var i = 0; i < gcodes.length; i++) {
      var g = gcodes[i];
      var dep = gDeps[g];
      if (dep) {
        for (var r in dep) {
          if (dep.hasOwnProperty(r) && r === 'depends_on') {
            edges.push({
              source: 'gcode_' + dep.depends_on,
              target: 'gcode_' + g,
              relationType: 'requires',
              weight: _getWeight('requires'),
              properties: { reason: dep.reason }
            });
          }
        }
      }
    }

    // M代码与G代码关系
    var mToG = {
      'M03': { related_to: 'M04', reason: '主轴正反转切换' },
      'M08': { related_to: 'M09', reason: '冷却液开关' }
    };
    for (var m in mToG) {
      if (mToG.hasOwnProperty(m)) {
        for (var j = 0; j < mcodes.length; j++) {
          if (mcodes[j] === m) {
            edges.push({
              source: 'mcode_' + m,
              target: 'mcode_' + (mToG[m].related_to),
              relationType: 'related_to',
              weight: _getWeight('related_to'),
              properties: { reason: mToG[m].reason }
            });
          }
        }
      }
    }

    return edges;
  }

  // ── 刀具-材料匹配 → used_in ──
  function buildToolMaterialRelations(toolEntities, materialEntities) {
    var edges = [];
    if (!toolEntities || !materialEntities) return edges;
    // 硬质合金→钢, 高速钢→铝 等常见匹配
    var toolMaterialMap = {
      'endmill': ['steel', 'aluminum'],
      'ballnose': ['steel', 'aluminum', 'titanium'],
      'facemill': ['steel', 'cast_iron'],
      'drill': ['steel', 'aluminum', 'titanium'],
      'tap': ['steel', 'aluminum']
    };

    for (var i = 0; i < toolEntities.length; i++) {
      var tool = toolEntities[i];
      var subtypes = toolMaterialMap[tool.properties && tool.properties.subtype];
      if (!subtypes) continue;
      for (var j = 0; j < materialEntities.length; j++) {
        var mat = materialEntities[j];
        if (subtypes.indexOf(mat.properties && mat.properties.materialKey) !== -1) {
          edges.push({
            source: tool.id,
            target: mat.id,
            relationType: 'used_in',
            weight: _getWeight('used_in'),
            properties: { note: tool.label + ' 适用于 ' + mat.label }
          });
        }
      }
    }
    return edges;
  }

  // ── 工艺-刀具关系 ──
  function buildProcessToolRelations(processEntities, toolEntities) {
    var edges = [];
    var processToolMap = {
      '铣削': ['endmill', 'ballnose', 'facemill'],
      '车削': ['insert'],
      '钻孔': ['drill'],
      '镗孔': ['boringbar'],
      '攻丝': ['tap'],
      '螺纹加工': ['threadmill'],
      '倒角': ['chamfertool']
    };

    for (var i = 0; i < processEntities.length; i++) {
      var proc = processEntities[i];
      var toolTypes = processToolMap[proc.label];
      if (!toolTypes) continue;
      for (var j = 0; j < toolEntities.length; j++) {
        var t = toolEntities[j];
        if (toolTypes.indexOf(t.properties && t.properties.subtype) !== -1) {
          edges.push({
            source: proc.id,
            target: t.id,
            relationType: 'used_in',
            weight: _getWeight('used_in'),
            properties: { note: proc.label + ' 使用 ' + t.label }
          });
        }
      }
    }
    return edges;
  }

  // ── 机床-系统关系 ──
  function buildMachineSystemRelations(machineEntities) {
    var edges = [];
    var systemBrands = {
      'FANUC': ['发那科', 'FANUC'],
      'SIEMENS': ['西门子', 'SIEMENS'],
      'MITSUBISHI': ['三菱', 'MITSUBISHI'],
      'HEIDENHAIN': ['海德汉', 'HEIDENHAIN'],
      'MAZAK': ['马扎克', 'MAZAK'],
      'OKUMA': ['大隈', 'OKUMA'],
      'HAAS': ['哈斯', 'HAAS'],
      'BROTHER': ['兄弟', 'BROTHER']
    };

    for (var i = 0; i < machineEntities.length; i++) {
      var m = machineEntities[i];
      var brands = systemBrands[m.properties && m.properties.system];
      if (brands) {
        for (var b = 0; b < brands.length; b++) {
          var brandId = 'brand_' + m.properties.system.toLowerCase();
          edges.push({
            source: m.id,
            target: brandId,
            relationType: 'part_of',
            weight: _getWeight('part_of'),
            properties: { note: m.label + ' 属于 ' + brands[b] }
          });
        }
      }
    }
    return edges;
  }

  // ── 文件-实体引用关系 ──
  function buildFileReferenceRelations(fileNodeId, entities) {
    var edges = [];
    if (!fileNodeId || !entities) return edges;
    for (var i = 0; i < entities.length; i++) {
      var e = entities[i];
      if (e.type === 'file' || e.type === 'category') continue;
      edges.push({
        source: fileNodeId,
        target: e.id,
        relationType: 'references',
        weight: _getWeight('references'),
        properties: { confidence: e.confidence || 0.5 }
      });
    }
    return edges;
  }

  // ── 考试-考点关系 ──
  function buildExamRelations(examNodeId, topics) {
    var edges = [];
    if (!examNodeId || !topics || !topics.length) return edges;
    for (var i = 0; i < topics.length; i++) {
      var topicId = 'concept_' + topics[i].topic.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_');
      edges.push({
        source: examNodeId,
        target: topicId,
        relationType: 'tests',
        weight: _getWeight('tests'),
        properties: { inferred: topics[i].inferred || false }
      });
    }
    return edges;
  }

  // ── 综合构建所有关系 ──
  function buildAllRelations(entities, fileData) {
    if (!entities || !entities.length) return { edges: [], stats: {} };

    var allEdges = [];
    var stats = {
      cooccurrence: 0,
      category: 0,
      codeDependency: 0,
      toolMaterial: 0,
      processTool: 0,
      fileReference: 0,
      examRelation: 0,
      total: 0
    };

    // 按类型分组
    var byType = {};
    for (var i = 0; i < entities.length; i++) {
      var e = entities[i];
      if (!byType[e.type]) byType[e.type] = [];
      byType[e.type].push(e);
    }

    // 共现关系 (同一文件中的实体)
    var coEdges = buildCooccurrenceRelations(entities, fileData);
    allEdges = allEdges.concat(coEdges);
    stats.cooccurrence = coEdges.length;

    // G代码/M代码依赖关系
    var gcodes = (byType['gcode'] || []).map(function (e) { return e.label; });
    var mcodes = (byType['mcode'] || []).map(function (e) { return e.label; });
    var depEdges = buildCodeDependencyRelations(gcodes, mcodes);
    allEdges = allEdges.concat(depEdges);
    stats.codeDependency = depEdges.length;

    // 刀具-材料关系
    var tools = byType['tool'] || [];
    var materials = byType['material'] || [];
    var tmEdges = buildToolMaterialRelations(tools, materials);
    allEdges = allEdges.concat(tmEdges);
    stats.toolMaterial = tmEdges.length;

    // 工艺-刀具关系
    var processes = byType['process'] || [];
    var ptEdges = buildProcessToolRelations(processes, tools);
    allEdges = allEdges.concat(ptEdges);
    stats.processTool = ptEdges.length;

    // 文件引用关系
    var fileNode = null;
    if (fileData && fileData.fileNodeId) {
      fileNode = { id: fileData.fileNodeId };
      var frEdges = buildFileReferenceRelations(fileData.fileNodeId, entities);
      allEdges = allEdges.concat(frEdges);
      stats.fileReference = frEdges.length;
    }

    // 去重
    var seenEdges = {};
    var dedupedEdges = [];
    for (var j = 0; j < allEdges.length; j++) {
      var edge = allEdges[j];
      var key = edge.source + '|' + edge.target + '|' + edge.relationType;
      if (!seenEdges[key]) {
        seenEdges[key] = true;
        dedupedEdges.push(edge);
      }
    }

    stats.total = dedupedEdges.length;

    return { edges: dedupedEdges, stats: stats };
  }

  // ── 批量构建文件集的关系 ──
  function buildBatchRelations(fileEntitiesList) {
    if (!fileEntitiesList || !fileEntitiesList.length) return { edges: [], stats: { total: 0 } };

    var allEdges = [];
    var totalStats = {
      cooccurrence: 0, category: 0, codeDependency: 0,
      toolMaterial: 0, processTool: 0, fileReference: 0,
      examRelation: 0, total: 0
    };

    for (var i = 0; i < fileEntitiesList.length; i++) {
      var item = fileEntitiesList[i];
      if (!item || !item.entities) continue;
      var result = buildAllRelations(item.entities, item.fileData || null);
      allEdges = allEdges.concat(result.edges);
      for (var key in result.stats) {
        if (result.stats.hasOwnProperty(key) && totalStats.hasOwnProperty(key)) {
          totalStats[key] += result.stats[key];
        }
      }
    }

    // 全局去重
    var seenEdges = {};
    var dedupedEdges = [];
    for (var j = 0; j < allEdges.length; j++) {
      var edge = allEdges[j];
      var key = edge.source + '|' + edge.target + '|' + edge.relationType;
      if (!seenEdges[key]) {
        seenEdges[key] = true;
        dedupedEdges.push(edge);
      }
    }

    totalStats.total = dedupedEdges.length;

    return { edges: dedupedEdges, stats: totalStats };
  }

  window.CNC_RELATIONSHIP_BUILDER = {
    buildCooccurrenceRelations: buildCooccurrenceRelations,
    buildCategoryRelations: buildCategoryRelations,
    buildCodeDependencyRelations: buildCodeDependencyRelations,
    buildToolMaterialRelations: buildToolMaterialRelations,
    buildProcessToolRelations: buildProcessToolRelations,
    buildMachineSystemRelations: buildMachineSystemRelations,
    buildFileReferenceRelations: buildFileReferenceRelations,
    buildExamRelations: buildExamRelations,
    buildAllRelations: buildAllRelations,
    buildBatchRelations: buildBatchRelations
  };

  console.log('[CNC_RELATIONSHIP_BUILDER] 关系构建器已加载。支持 9 种关系类型');
})();
