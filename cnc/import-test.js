/**
 * import-test.js
 * 知识图谱导入系统测试脚本 — 完整性测试/性能测试/功能验证/浏览器控制台可执行
 * 所有测试通过 window.CNC_IMPORT_TEST 暴露
 * 用法: CNC_IMPORT_TEST.runAll() 或在控制台单步执行
 * 全局对象: window.CNC_IMPORT_TEST
 */
(function () {
  'use strict';

  if (window.CNC_IMPORT_TEST) return;

  var _results = { passed: 0, failed: 0, tests: [] };

  function _assert(condition, name, detail) {
    if (condition) {
      _results.passed++;
      _results.tests.push({ name: name, passed: true });
      console.log('  ✓ ' + name);
    } else {
      _results.failed++;
      _results.tests.push({ name: name, passed: false, detail: detail });
      console.error('  ✗ ' + name + (detail ? ' — ' + detail : ''));
    }
  }

  function _resetResults() {
    _results = { passed: 0, failed: 0, tests: [] };
  }

  function _log(level, msg) {
    if (level === 'info') console.info('[TEST] ' + msg);
    else if (level === 'warn') console.warn('[TEST] ' + msg);
    else if (level === 'error') console.error('[TEST] ' + msg);
    else console.log('[TEST] ' + msg);
  }

  // ── 样本数据 ──
  var _sampleFiles = [
    {
      path: '01_编程基础/G代码基础.md',
      name: 'G代码基础.md',
      content: '# G代码基础\n> 标签: G00,G01,快速定位\n\n## G00指令\nG00用于快速定位。G00 X100 Y200\n\n## G01指令\nG01 X100 F200 用于直线插补\n\nM03 M08 M30\n\n刀具: 立铣刀 端铣刀\n材料: 45号钢 铝合金\n机床: FANUC 0i-MF\n\n坐标系对刀非常重要。使用顺铣可以提高表面质量。'
    },
    {
      path: '04_刀具工艺/铣刀选择指南.md',
      name: '铣刀选择指南.md',
      content: '# 铣刀选择指南\n> 标签: 立铣刀,球头刀,面铣刀,切削参数\n\n## 刀具类型\n- 立铣刀: 用于轮廓加工\n- 球头刀: 用于曲面加工 R5 R10\n- 面铣刀: 用于平面加工\n\n## 切削参数\nF = fz × Z × n\nS = 8000 r/min\nap = 0.5 mm\n\n## 加工材料\n- 钢件: S45C SKD11\n- 铝件: 6061 7075\n- 钛合金: TC4\n\n西门子828D系统常用。'
    },
    {
      path: '06_考证职业/题库_G代码考点.md',
      name: '题库_G代码考点.md',
      content: '# 题库: G代码考点\n考点: G00 G01 G02 G03\n题型: 选择题\n\n1. G00指令的运动轨迹是？\nA. 直线 B. 圆弧 C. 各轴独立快速运动 D. 螺旋线\n答案: C\n\n2. G01指令中F的含义是？\nA. 主轴转速 B. 进给速度 C. 切削深度 D. 刀具号\n答案: B\n\nG54 G90 常用加工中心坐标系。'
    },
    {
      path: '02_机床操作/FANUC系统操作.md',
      name: 'FANUC系统操作.md',
      content: '# FANUC系统操作手册\n> 标签: FANUC,0i,加工中心,操作面板\n\n## 系统启动\nFANUC 0i-MF 加工中心\n\n## 手动操作\n- 回零操作\n- JOG进给\n- 手轮脉冲\n\n## MDI运行\nG90 G54 G00 X0 Y0\nM03 S1000\nG01 Z-5.0 F100\n\n注意: 三菱M70系统类似但不同。'
    },
    {
      path: '03_CAM软件/UG_NX编程流程.md',
      name: 'UG_NX编程流程.md',
      content: '# UG NX数控编程完整流程\n> 标签: UG,NX,CAM,编程\n\n## 编程步骤\n1. 导入模型\n2. 创建坐标系\n3. 创建刀具\n4. 创建工序\n\n## 后处理\n生成G代码: G00 G01 G02 G03\nM代码: M03 M05 M08 M09 M30\n\n刀具: 球头铣刀 R6 端铣刀 D20\n材料: 铝合金 7075'
    }
  ];

  // ── 测试 1: 配置加载 ──
  function testConfigLoaded() {
    _log('info', '测试 1: 配置加载');
    var cfg = window.CNC_IMPORT_CONFIG;
    _assert(cfg && cfg.CONFIG, 'CONFIG 对象存在');
    _assert(cfg.CONFIG.ENTITY_TYPES.length === 14, '实体类型 = 14 种', '实际: ' + (cfg ? cfg.CONFIG.ENTITY_TYPES.length : 'N/A'));
    _assert(cfg.CONFIG.RELATION_TYPES.length === 12, '关系类型 = 12 种', '实际: ' + (cfg ? cfg.CONFIG.RELATION_TYPES.length : 'N/A'));
    _assert(cfg.CONFIG.ALIAS_MAP && Object.keys(cfg.CONFIG.ALIAS_MAP).length > 30, '别名映射 > 30 条');
    _assert(typeof cfg.getEntityTypeLabel === 'function', 'getEntityTypeLabel 函数存在');
    _assert(typeof cfg.getRelationTypeLabel === 'function', 'getRelationTypeLabel 函数存在');
    _assert(typeof cfg.getWeight === 'function', 'getWeight 函数存在');
  }

  // ── 测试 2: 实体提取 ──
  function testEntityExtraction() {
    _log('info', '测试 2: 实体提取');
    var ext = window.CNC_ENTITY_EXTRACTOR;
    _assert(ext && typeof ext.extractAll === 'function', 'extractAll 函数存在');

    var content = _sampleFiles[0].content;
    var result = ext.extractAll(content, { path: _sampleFiles[0].path, fileId: 'test_001' });
    _assert(result && result.entities, '返回 entities 数组');
    _assert(result.entities.length > 0, '提取到实体', '实际: ' + result.entities.length + ' 个');

    var gcodes = ext.extractGCodes(content);
    _assert(gcodes.length >= 2, '提取 G代码', 'G代码: ' + gcodes.join(', '));

    var mcodes = ext.extractMCodes(content);
    _assert(mcodes.length >= 3, '提取 M代码', 'M代码: ' + mcodes.join(', '));

    var tools = ext.extractTools(content);
    _assert(tools.length >= 1, '提取刀具', '刀具: ' + tools.length + ' 种');

    var machines = ext.extractMachines(content);
    _assert(machines.length >= 1, '提取机床', '机床: ' + machines.length + ' 种');

    var materials = ext.extractMaterials(content);
    _assert(materials.length >= 1, '提取材料', '材料: ' + materials.length + ' 种');

    var concepts = ext.extractConcepts(content);
    _assert(concepts.length >= 1, '提取概念', '概念: ' + concepts.length + ' 个');

    var gcodes2 = ext.extractGCodes('no codes here');
    _assert(gcodes2.length === 0, '无代码内容返回空数组');

    var result2 = ext.extractAll('');
    _assert(result2 && result2.entities.length === 0, '空内容返回空实体');
  }

  // ── 测试 3: 数据清洗 ──
  function testDataCleaning() {
    _log('info', '测试 3: 数据清洗');
    var cleaner = window.CNC_DATA_CLEANER;
    _assert(cleaner && typeof cleaner.classifyFileQuality === 'function', 'classifyFileQuality 存在');

    var deep = cleaner.classifyFileQuality(20000, 'x'.repeat(6000));
    _assert(deep.level === 'deep', '>14KB 文件归类为 deep');

    var medium = cleaner.classifyFileQuality(8000, 'x'.repeat(2000));
    _assert(medium.level === 'medium', '4-14KB 文件归类为 medium');

    var basic = cleaner.classifyFileQuality(2000, 'x'.repeat(500));
    _assert(basic.level === 'basic', '<4KB 文件归类为 basic');

    var trash = cleaner.classifyFileQuality(50, 'x'.repeat(10));
    _assert(trash.discard, '过短文件标记为丢弃');

    var entities = [
      { id: 'gcode_G00', type: 'gcode', label: 'G00', confidence: 0.9 },
      { id: 'gcode_G00', type: 'gcode', label: 'G00', confidence: 0.8 },
      { id: 'gcode_G01', type: 'gcode', label: 'G01', confidence: 0.9 }
    ];
    var dedup = cleaner.deduplicateEntities(entities);
    _assert(dedup.entities.length === 2, '去重: 3→2');
    _assert(dedup.duplicates === 1, '去重: 1 个重复');
    _assert(dedup.entities[0].confidence === 0.9, '去重: 保留高置信度');

    var std = cleaner.standardizeEntityLabel({ type: 'gcode', label: 'g00' });
    _assert(std.label === 'G00', '标准化: g00 → G00');

    var categories = cleaner.extractCategories('F:/04_数控知识库/01_编程基础/G代码.md');
    _assert(categories.length >= 1, '路径提取分类');
  }

  // ── 测试 4: 关系构建 ──
  function testRelationshipBuilding() {
    _log('info', '测试 4: 关系构建');
    var builder = window.CNC_RELATIONSHIP_BUILDER;
    _assert(builder && typeof builder.buildAllRelations === 'function', 'buildAllRelations 存在');

    var entities = [
      { id: 'gcode_G00', type: 'gcode', label: 'G00', confidence: 0.9 },
      { id: 'gcode_G01', type: 'gcode', label: 'G01', confidence: 0.9 },
      { id: 'tool_endmill', type: 'tool', label: '端铣刀', confidence: 0.8, properties: { subtype: 'endmill' } },
      { id: 'material_steel', type: 'material', label: '钢', confidence: 0.7, properties: { materialKey: 'steel' } }
    ];
    var result = builder.buildAllRelations(entities, { filePath: 'test.md', fileNodeId: 'file_test' });
    _assert(result && result.edges, '返回 edges 数组');
    _assert(result.edges.length > 0, '生成了关系', '实际: ' + result.edges.length + ' 条');

    // 共现: G00-G01 → compared_with
    var hasCompared = false;
    for (var i = 0; i < result.edges.length; i++) {
      if (result.edges[i].relationType === 'compared_with') hasCompared = true;
    }
    _assert(hasCompared, '同类型实体→compared_with 关系');

    var coEdges = builder.buildCooccurrenceRelations([{ id: 'a', type: 'gcode', label: 'G00' }, { id: 'b', type: 'gcode', label: 'G01' }]);
    _assert(coEdges.length >= 1, '共现关系构建');

    var tmEdges = builder.buildToolMaterialRelations(
      [{ id: 'tool_endmill', type: 'tool', label: '端铣刀', properties: { subtype: 'endmill' } }],
      [{ id: 'material_steel', type: 'material', label: '钢', properties: { materialKey: 'steel' } }]
    );
    _assert(tmEdges.length >= 1, '刀具-材料关系');

    var frEdges = builder.buildFileReferenceRelations('file_test', entities);
    _assert(frEdges.length >= 1, '文件引用关系');
  }

  // ── 测试 5: 导入器实例化和基本操作 ──
  function testImporterBasic() {
    _log('info', '测试 5: 导入器基本操作');
    var GraphImporterClass = window.CNC_GRAPH_IMPORTER ? window.CNC_GRAPH_IMPORTER.GraphImporter : null;
    var KG = window.CNC_KnowledgeGraph;
    _assert(!!GraphImporterClass, 'GraphImporter 类存在');

    var graph = KG ? new KG() : null;
    var importer = graph ? new GraphImporterClass(graph) : null;
    _assert(!!importer, 'GraphImporter 实例化');
    _assert(!!importer.scanner, 'importer.scanner 存在');
    _assert(typeof importer.importNodes === 'function', 'importNodes 函数存在');
    _assert(typeof importer.importEdges === 'function', 'importEdges 函数存在');
    _assert(typeof importer.generateReport === 'function', 'generateReport 函数存在');
    _assert(typeof importer.abort === 'function', 'abort 函数存在');
    _assert(typeof importer.resetStats === 'function', 'resetStats 函数存在');

    // 测试节点导入
    if (graph && importer) {
      var nodes = [
        { id: 'test_g00', type: 'gcode', label: 'G00' },
        { id: 'test_g01', type: 'gcode', label: 'G01' },
        { id: 'test_m03', type: 'mcode', label: 'M03' }
      ];
      importer.importNodes(nodes).then(function (res) {
        _assert(res.imported === 3, '导入 3 个节点');
        var queried = graph.queryNodes({ type: 'gcode' }, 10, 0);
        _assert(queried.length >= 2, '查询 G代码节点 >= 2', '实际: ' + queried.length);
      });

      var edges = [
        { source: 'test_g00', target: 'test_g01', relationType: 'related_to', weight: 0.5 },
        { source: 'test_g01', target: 'test_m03', relationType: 'related_to', weight: 0.5 }
      ];
      importer.importEdges(edges).then(function (res) {
        _assert(res.imported === 2, '导入 2 条关系');
      });

      var report = importer.generateReport();
      _assert(!!report, '生成报告');
      _assert(report.importedNodes >= 3, '报告节点数 >= 3');
    }
  }

  // ── 测试 6: 完整导入流程 (使用样本数据) ──
  function testFullImport() {
    _log('info', '测试 6: 完整导入流程 (5 个样本文件)');
    var GraphImporterClass = window.CNC_GRAPH_IMPORTER ? window.CNC_GRAPH_IMPORTER.GraphImporter : null;
    var KG = window.CNC_KnowledgeGraph;
    if (!GraphImporterClass || !KG) {
      _assert(false, '依赖未加载', 'GraphImporter: ' + !!GraphImporterClass + ', KG: ' + !!KG);
      return;
    }

    var graph = new KG();
    var importer = new GraphImporterClass(graph);

    var fileEntries = _sampleFiles.map(function (f) {
      return { path: f.path, name: f.name, content: f.content };
    });

    importer.importFromFileEntries(fileEntries, {
      batchSize: 100,
      filterLowQuality: true,
      mergeDuplicates: true,
      enableProgress: true,
      enableLogging: false,
      onProgress: function (p) {
        // 进度回调
      },
      onComplete: function (report) {
        _assert(report.importedNodes > 0, '导入节点 > 0', '实际: ' + report.importedNodes);
        _assert(report.parsedFiles >= 3, '解析文件 >= 3', '实际: ' + report.parsedFiles);
        _assert(report.elapsed >= 0, '耗时记录', '实际: ' + report.elapsedStr);
        _assert(typeof report.summary === 'string' && report.summary.length > 0, '有摘要');
        _log('info', '导入报告: ' + report.summary);
      }
    });
  }

  // ── 测试 7: 考试题库处理 ──
  function testExamHandling() {
    _log('info', '测试 7: 考试题库处理');
    var ext = window.CNC_ENTITY_EXTRACTOR;
    if (!ext || typeof ext.extractFromExamContent !== 'function') {
      _assert(false, 'extractFromExamContent 存在');
      return;
    }

    var examContent = _sampleFiles[2].content;
    var result = ext.extractFromExamContent(examContent, {
      path: _sampleFiles[2].path,
      fileId: 'test_exam_001',
      categories: ['考证职业', 'G代码考点']
    });

    _assert(result && result.examTopics, '返回 examTopics');
    _assert(result.examTopics.length >= 1, '提取到考点', '考点: ' + result.examTopics.map(function (t) { return t.topic; }).join(', '));
    _assert(result.entities.length > 0, '同时提取实体');
  }

  // ── 测试 8: 关系验证 ──
  function testEdgeValidation() {
    _log('info', '测试 8: 关系验证');
    var cleaner = window.CNC_DATA_CLEANER;
    if (!cleaner || typeof cleaner.validateEdge !== 'function') {
      _assert(false, 'validateEdge 存在');
      return;
    }

    var validResult = cleaner.validateEdge({ source: 'a', target: 'b', relationType: 'related_to' });
    _assert(validResult.valid, '有效关系通过验证');

    var noTarget = cleaner.validateEdge({ source: 'a', relationType: 'related_to' });
    _assert(!noTarget.valid, '缺少 target 被拒绝');

    var selfLoop = cleaner.validateEdge({ source: 'a', target: 'a', relationType: 'related_to' });
    _assert(!selfLoop.valid, '自环被拒绝');

    var empty = cleaner.validateEdge(null);
    _assert(!empty.valid, '空值被拒绝');

    var results = cleaner.validateEdges([
      { source: 'a', target: 'b', relationType: 'related_to' },
      { source: 'a', target: 'a', relationType: 'self' },
      null
    ]);
    _assert(results.valid.length === 1, '批量验证: 1 有效');
    _assert(results.invalid.length === 2, '批量验证: 2 无效');
  }

  // ── 测试 9: 配置工具函数 ──
  function testConfigUtils() {
    _log('info', '测试 9: 配置工具函数');
    var cfg = window.CNC_IMPORT_CONFIG;
    if (!cfg) { _assert(false, '配置未加载'); return; }

    var label = cfg.getEntityTypeLabel('gcode');
    _assert(label === 'G代码', 'getEntityTypeLabel: gcode → G代码');

    var rLabel = cfg.getRelationTypeLabel('requires');
    _assert(rLabel === '前置要求', 'getRelationTypeLabel: requires → 前置要求');

    var weight = cfg.getWeight('requires');
    _assert(weight === 1.0, 'getWeight: requires → 1.0');
  }

  // ── 测试 10: 边界条件 ──
  function testEdgeCases() {
    _log('info', '测试 10: 边界条件');
    var ext = window.CNC_ENTITY_EXTRACTOR;
    var cleaner = window.CNC_DATA_CLEANER;

    if (ext) {
      var noGcodes = ext.extractGCodes(null);
      _assert(noGcodes.length === 0, 'extractGCodes(null) 返回 []');

      var noMcodes = ext.extractMCodes(undefined);
      _assert(noMcodes.length === 0, 'extractMCodes(undefined) 返回 []');

      var noTools = ext.extractTools('');
      _assert(noTools.length === 0, 'extractTools("") 返回 []');

      var noMachines = ext.extractMachines({});
      _assert(noMachines.length === 0, 'extractMachines({}) 返回 []');
    }

    if (cleaner) {
      var noEntities = cleaner.deduplicateEntities(null);
      _assert(noEntities && noEntities.entities.length === 0, 'deduplicateEntities(null)');

      var noFiles = cleaner.filterLowQualityFiles([]);
      _assert(noFiles.passed.length === 0 && noFiles.filtered.length === 0, 'filterLowQualityFiles([])');

      var noCat = cleaner.extractCategories('');
      _assert(noCat.length === 0, 'extractCategories("")');

      var similarity = cleaner.computeSimilarity('G00 G01', 'G00 G01');
      _assert(similarity >= 0.99, '相同文本相似度 ≈ 1.0');

      var diffSimilarity = cleaner.computeSimilarity('G00', 'M03');
      _assert(diffSimilarity < 0.5, '不同文本相似度 < 0.5');
    }
  }

  // ── 运行所有测试 ──
  function runAll() {
    _resetResults();
    _log('info', '========== CNC 知识图谱导入系统测试 ==========');
    _log('info', '时间: ' + new Date().toISOString());

    try { testConfigLoaded(); } catch (e) { _assert(false, '测试1 异常: ' + e.message); }
    try { testEntityExtraction(); } catch (e) { _assert(false, '测试2 异常: ' + e.message); }
    try { testDataCleaning(); } catch (e) { _assert(false, '测试3 异常: ' + e.message); }
    try { testRelationshipBuilding(); } catch (e) { _assert(false, '测试4 异常: ' + e.message); }
    try { testImporterBasic(); } catch (e) { _assert(false, '测试5 异常: ' + e.message); }
    try { testExamHandling(); } catch (e) { _assert(false, '测试7 异常: ' + e.message); }
    try { testEdgeValidation(); } catch (e) { _assert(false, '测试8 异常: ' + e.message); }
    try { testConfigUtils(); } catch (e) { _assert(false, '测试9 异常: ' + e.message); }
    try { testEdgeCases(); } catch (e) { _assert(false, '测试10 异常: ' + e.message); }

    // 完整导入（异步）
    testFullImport();

    _log('info', '========== 测试结果 ==========');
    _log('info', '通过: ' + _results.passed + ' | 失败: ' + _results.failed + ' | 总计: ' + _results.tests.length);

    return {
      passed: _results.passed,
      failed: _results.failed,
      total: _results.tests.length,
      tests: _results.tests,
      summary: _results.passed + '/' + _results.tests.length + ' 通过'
    };
  }

  // ── 运行快速测试 (仅同步) ──
  function runQuick() {
    _resetResults();
    try { testConfigLoaded(); } catch (e) { _assert(false, '配置异常: ' + e.message); }
    try { testEntityExtraction(); } catch (e) { _assert(false, '实体提取异常: ' + e.message); }
    try { testDataCleaning(); } catch (e) { _assert(false, '数据清洗异常: ' + e.message); }
    try { testRelationshipBuilding(); } catch (e) { _assert(false, '关系构建异常: ' + e.message); }
    try { testImporterBasic(); } catch (e) { _assert(false, '导入器异常: ' + e.message); }
    try { testExamHandling(); } catch (e) { _assert(false, '考试处理异常: ' + e.message); }
    try { testEdgeValidation(); } catch (e) { _assert(false, '关系验证异常: ' + e.message); }
    try { testConfigUtils(); } catch (e) { _assert(false, '配置工具异常: ' + e.message); }
    try { testEdgeCases(); } catch (e) { _assert(false, '边界条件异常: ' + e.message); }
    return { passed: _results.passed, failed: _results.failed, total: _results.tests.length };
  }

  // ── 导入样本验证 ──
  function importSampleSet(progressCallback, completeCallback) {
    var GraphImporterClass = window.CNC_GRAPH_IMPORTER ? window.CNC_GRAPH_IMPORTER.GraphImporter : null;
    var KG = window.CNC_KnowledgeGraph;
    if (!GraphImporterClass || !KG) {
      _log('error', '依赖未加载');
      return null;
    }

    var graph = new KG();
    var importer = new GraphImporterClass(graph);

    var fileEntries = _sampleFiles.map(function (f) {
      return { path: f.path, name: f.name, content: f.content };
    });

    importer.importFromFileEntries(fileEntries, {
      batchSize: 100,
      filterLowQuality: true,
      mergeDuplicates: true,
      enableProgress: true,
      onProgress: progressCallback || function () {},
      onComplete: function (report) {
        _log('info', '样本导入完成: ' + report.summary);
        if (completeCallback) completeCallback(report, graph, importer);
      }
    });

    return importer;
  }

  window.CNC_IMPORT_TEST = {
    runAll: runAll,
    runQuick: runQuick,
    importSampleSet: importSampleSet,
    getResults: function () { return _results; },
    resetResults: _resetResults,
    sampleFiles: _sampleFiles
  };

  console.log('[CNC_IMPORT_TEST] 导入测试脚本已加载。使用 CNC_IMPORT_TEST.runAll() 运行所有测试。');
})();
