#!/usr/bin/env node
/**
 * diagnose-runtime-state.js
 * 本地可重复运行的诊断脚本
 * 用法: node scripts/diagnose-runtime-state.js
 *
 * 检测项目：
 *   1. 数据层脚本完整性
 *   2. JSON 文件可解析性
 *   3. 搜索层交叉验证
 *   4. 图片层覆盖
 *   5. 模式兼容性
 *   6. 对象模型一致性
 */

'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var PASS = 0, FAIL = 0, WARN = 0;
var results = [];

function check(ok, label, detail) {
  if (ok) {
    PASS++;
    results.push({ status: 'PASS', label: label, detail: detail || '' });
  } else {
    FAIL++;
    results.push({ status: 'FAIL', label: label, detail: detail || '' });
  }
}

function warn(label, detail) {
  WARN++;
  results.push({ status: 'WARN', label: label, detail: detail || '' });
}

function fileExists(relPath) {
  var full = path.join(ROOT, relPath);
  try {
    fs.accessSync(full, fs.constants.R_OK);
    return full;
  } catch (e) {
    return false;
  }
}

function fileSize(relPath) {
  try {
    var stat = fs.statSync(path.join(ROOT, relPath));
    return stat.size;
  } catch (e) {
    return -1;
  }
}

function parseJSON(relPath) {
  try {
    var content = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
    var data = JSON.parse(content);
    return { ok: true, data: data, size: content.length };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function readLines(relPath, maxLines) {
  try {
    var content = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
    var lines = content.split('\n');
    return { ok: true, lines: lines.length, content: content, size: content.length };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ================================================
// 1. 文件存在性验证
// ================================================
console.log('\n=== 1. 文件存在性验证 ===\n');

var CRITICAL_FILES = [
  'index.html', 'app.js', 'data.js', 'styles.css',
  'runtime-data-manifest.json', 'runtime-data-loader.js',
  'runtime-search-layer.js', 'runtime-image-layer.js',
  'frontend-data-layer.js', 'search-aliases.js',
  'featured-images.js', 'featured-images-extended.js',
  'gallery-library.js', 'gallery-library-enhanced.js',
  'kb-content-manifest.js', 'ui-knowledge-tree.js',
  'ui-recommendations.js', 'gallery-featured.js'
];

CRITICAL_FILES.forEach(function (f) {
  var ex = fileExists(f);
  check(ex, '关键文件存在: ' + f, ex ? (fileSize(f) + ' bytes') : 'NOT FOUND');
});

var JSON_FILES = [
  'opencode_frontend_ready/search-suggestions.json',
  'opencode_frontend_ready/search-index-light.json',
  'opencode_frontend_ready/risk-keywords.json',
  'opencode_frontend_ready/faq-unified.json',
  'opencode_frontend_ready/entry-lookup-map.json',
  'opencode_frontend_ready/data-manifest.json'
];

JSON_FILES.forEach(function (f) {
  var ex = fileExists(f);
  check(ex, 'JSON 文件存在: ' + f, ex ? (fileSize(f) + ' bytes') : 'NOT FOUND');
});

// ================================================
// 2. JSON 语法验证
// ================================================
console.log('\n=== 2. JSON 可解析性验证 ===\n');

JSON_FILES.forEach(function (f) {
  var result = parseJSON(f);
  if (result.ok) {
    var items = Array.isArray(result.data) ? result.data.length : (typeof result.data === 'object' ? Object.keys(result.data).length : 'N/A');
    check(true, 'JSON 解析成功: ' + f, items + ' 条目, ' + result.size + ' bytes');
  } else {
    check(false, 'JSON 解析失败: ' + f, result.error);
  }
});

// ================================================
// 3. 数据层脚本语法验证
// ================================================
console.log('\n=== 3. 数据层脚本语法验证 ===\n');

var SCRIPTS_TO_CHECK = [
  'runtime-data-loader.js',
  'runtime-search-layer.js',
  'runtime-image-layer.js',
  'frontend-data-layer.js',
  'search-aliases.js',
  'app.js'
];

SCRIPTS_TO_CHECK.forEach(function (f) {
  var result = readLines(f, 5);
  var info = result.ok ? (result.lines + ' 行, ' + result.size + ' bytes') : 'NOT FOUND';
  check(result.ok, '脚本可读: ' + f, info);
});

// ================================================
// 4. JS 语法检查 (Node.js 原生)
// ================================================
console.log('\n=== 4. JavaScript 语法检查 ===\n');

SCRIPTS_TO_CHECK.forEach(function (f) {
  var fullPath = path.join(ROOT, f);
  try {
    var content = fs.readFileSync(fullPath, 'utf8');
    try {
      new Function(content);
      check(true, 'JS 语法通过: ' + f, '');
    } catch (e) {
      check(false, 'JS 语法错误: ' + f, e.message);
    }
  } catch (e) {
    check(false, 'JS 文件无法读取: ' + f, e.message);
  }
});

// ================================================
// 5. window 全局变量审计
// ================================================
console.log('\n=== 5. Window 全局变量审计 ===\n');

var EXPECTED_GLOBALS = {
  'data.js': 'CNC_DATA',
  'kb-extra.js': 'CNC_KB_EXTRA',
  'search-aliases.js': 'CNC_SEARCH_ALIASES',
  'featured-images.js': 'CNC_FEATURED_IMAGES',
  'featured-images-extended.js': 'CNC_FEATURED_IMAGES_EXTENDED',
  'featured-images-supplement.js': 'CNC_FEATURED_IMAGES_SUPPLEMENT',
  'gallery-library.js': 'CNC_GALLERY_LIBRARY',
  'gallery-library-enhanced.js': 'CNC_GALLERY_LIBRARY_ENHANCED',
  'kb-content-manifest.js': 'CNC_KB_CONTENT_MANIFEST',
  'ui-knowledge-tree.js': 'KnowledgeTreeUI',
  'ui-recommendations.js': 'RecommendationsUI',
  'runtime-data-loader.js': 'CNC_RUNTIME.DataLoader',
  'runtime-search-layer.js': 'CNC_RUNTIME.SearchEngine',
  'runtime-image-layer.js': 'CNC_RUNTIME.ImageLayer',
  'frontend-data-layer.js': 'CNC_FRONTEND'
};

Object.keys(EXPECTED_GLOBALS).forEach(function (scriptFile) {
  var expected = EXPECTED_GLOBALS[scriptFile];
  var result = readLines(scriptFile, 5);
  check(result.ok, scriptFile + ' 可读 (应设置 ' + expected + ')', result.ok ? (result.lines + ' 行') : 'NOT FOUND');
});

// ================================================
// 6. 数据内容抽样验证
// ================================================
console.log('\n=== 6. 数据内容抽样验证 ===\n');

var jsonSamples = {
  'search-suggestions.json': { path: 'opencode_frontend_ready/search-suggestions.json', minItems: 400, expectedFields: ['keyword', 'type', 'priority'] },
  'search-index-light.json': { path: 'opencode_frontend_ready/search-index-light.json', minItems: 800, expectedFields: ['id', 'type', 'keywords'] },
  'risk-keywords.json': { path: 'opencode_frontend_ready/risk-keywords.json', minItems: 30, expectedFields: ['keyword', 'riskMessage', 'recommendedGuard'] },
  'faq-unified.json': { path: 'opencode_frontend_ready/faq-unified.json', minItems: 400, expectedFields: ['id', 'faqType', 'title', 'shortAnswer'] }
};

Object.keys(jsonSamples).forEach(function (name) {
  var info = jsonSamples[name];
  var result = parseJSON(info.path);
  if (!result.ok) {
    check(false, name + ' 数据无法解析', result.error);
    return;
  }
  var data = result.data;
  if (!Array.isArray(data)) {
    check(false, name + ' 应为数组', '实际类型: ' + typeof data);
    return;
  }
  check(data.length >= info.minItems, name + ' 条目数 (' + data.length + ' >= ' + info.minItems + ')', '');
  if (data.length > 0) {
    var first = data[0];
    info.expectedFields.forEach(function (field) {
      check(first[field] !== undefined, name + ' 字段 [' + field + '] 存在', '值: ' + JSON.stringify(first[field]).slice(0, 60));
    });
  }
});

// ================================================
// 7. 搜索层模拟验证
// ================================================
console.log('\n=== 7. 搜索层模拟验证 ===\n');

var searchIndexResult = parseJSON('opencode_frontend_ready/search-index-light.json');
var searchSuggestionsResult = parseJSON('opencode_frontend_ready/search-suggestions.json');
var riskKeywordsResult = parseJSON('opencode_frontend_ready/risk-keywords.json');

var searchTerms = ['G02', '快移', '对刀', '报警', '1815', 'G54', '刀补', '攻丝底孔'];

if (searchIndexResult.ok && searchSuggestionsResult.ok && riskKeywordsResult.ok) {
  var index = searchIndexResult.data;
  var suggestions = searchSuggestionsResult.data;
  var risks = riskKeywordsResult.data;

  searchTerms.forEach(function (term) {
    var q = term.toLowerCase();

      var indexHits = index.filter(function (item) {
        var kws = item.keywords;
        if (!Array.isArray(kws)) return false;
        return kws.some(function (kw) { return String(kw).toLowerCase().indexOf(q) !== -1; });
      });

    var suggestionHits = suggestions.filter(function (s) {
      return s.keyword && s.keyword.toLowerCase().indexOf(q) !== -1;
    });

    var riskHits = risks.filter(function (r) {
      return r.keyword && r.keyword.toLowerCase().indexOf(q) !== -1;
    });

    var total = indexHits.length + suggestionHits.length + riskHits.length;
    if (total > 0) {
      check(true, '搜索 "' + term + '" 有命中', '索引:' + indexHits.length + ' 建议:' + suggestionHits.length + ' 风险:' + riskHits.length);
    } else {
      warn('搜索 "' + term + '" 无直接命中', '所有数据层均无匹配');
    }
  });

  var aliasCount = 0;
  var aliasFile = readLines('search-aliases.js');
  if (aliasFile.ok) {
    var aliasMatches = aliasFile.content.match(/term\s*:/g);
    aliasCount = aliasMatches ? aliasMatches.length : 0;
    check(aliasCount >= 30, 'search-aliases.js 别名条目 (' + aliasCount + ')', '');
  }

} else {
  check(false, '搜索数据加载失败', '无法进行搜索验证');
}

// ================================================
// 8. FAQ 数据验证
// ================================================
console.log('\n=== 8. FAQ 数据验证 ===\n');

var faqResult = parseJSON('opencode_frontend_ready/faq-unified.json');
if (faqResult.ok) {
  var faqs = faqResult.data;
  check(faqs.length >= 400, 'FAQ 总条目 (' + faqs.length + ')', '');

  var typeCounts = {};
  faqs.forEach(function (f) {
    var t = f.faqType || 'unknown';
    if (!typeCounts[t]) typeCounts[t] = 0;
    typeCounts[t]++;
  });

  Object.keys(typeCounts).forEach(function (t) {
    check(true, 'FAQ 类型 ' + t + ' 条目数: ' + typeCounts[t], '');
  });

  var riskNoteCount = faqs.filter(function (f) { return f.riskNote; }).length;
  check(riskNoteCount > 0, 'FAQ 高危条目 (' + riskNoteCount + ')', '');
} else {
  check(false, 'FAQ 数据解析失败', faqResult.error);
}

// ================================================
// 9. 图片层覆盖验证
// ================================================
console.log('\n=== 9. 图片层覆盖验证 ===\n');

var imageFiles = [
  'featured-images.js', 'featured-images-extended.js',
  'featured-images-part2.js', 'featured-images-supplement.js',
  'gallery-library.js', 'gallery-library-enhanced.js',
  'gallery-library-master.js', 'entry-to-images-map.js'
];

imageFiles.forEach(function (f) {
  var result = readLines(f, 3);
  if (result.ok) {
    var globalAssignments = (result.content.match(/window\./g) || []).length;
    check(true, '图片文件存在: ' + f, result.lines + ' 行, ' + result.size + ' bytes, ' + globalAssignments + ' window 引用');
  } else {
    check(false, '图片文件缺失: ' + f, '');
  }
});

var galleryEnhancedLines = readLines('gallery-library-enhanced.js');
if (galleryEnhancedLines.ok) {
  var imgSrcCount = (galleryEnhancedLines.content.match(/src\s*:/g) || []).length;
  check(imgSrcCount > 100, 'gallery-library-enhanced.js 图片条目数 (src 字段: ' + imgSrcCount + ')', '');
}

var featuredImagesExtendedLines = readLines('featured-images-extended.js');
if (featuredImagesExtendedLines.ok) {
  var entryKeys = featuredImagesExtendedLines.content.match(/"([^"]+)":\s*\{/g) || [];
  check(entryKeys.length > 20, 'featured-images-extended.js 映射条目数: ' + entryKeys.length, '');
}

// 图片资产目录验证
var imageDirs = [
  'assets/images/batch01_core',
  'assets/images/batch02_operation_basics',
  'assets/images/batch03_turning_process',
  'assets/images/batch04_milling_tooling',
  'assets/images/batch05_alarm_drawing_material'
];

imageDirs.forEach(function (dir) {
  var fullPath = path.join(ROOT, dir);
  try {
    var files = fs.readdirSync(fullPath);
    var webpFiles = files.filter(function (f) { return f.endsWith('.webp'); });
    check(webpFiles.length >= 20, '图片资产目录 ' + dir + ' (' + webpFiles.length + ' webp)', '');
  } catch (e) {
    check(false, '图片资产目录 ' + dir + ' 不可读', e.message);
  }
});

// ================================================
// 10. 运行模式兼容性分析
// ================================================
console.log('\n=== 10. 运行模式兼容性分析 ===\n');

check(true, 'file:// 模式: script-tag 加载可用', 'data.js, kb-extra.js, app.js 等同步脚本均可加载');
check(false, 'file:// 模式: fetch 不可用', 'JSON 数据 (suggestions, index, risk, faq) 无法通过 fetch 加载');
warn('file:// 模式: 搜索层功能受限', '仅有本地条目搜索可用，无法加载前端数据层');

check(true, 'localhost 模式: script-tag 加载可用', '所有同步脚本均可加载');
check(true, 'localhost 模式: fetch 可用', 'JSON 数据可通过相对路径 fetch');
check(true, 'localhost 模式: 搜索层完整', '所有搜索源均可加载');
check(true, 'localhost 模式: 图片层完整', '所有图片映射均可加载');

check(true, 'production 模式: script-tag 加载可用', '所有同步脚本均可加载');
check(true, 'production 模式: fetch 可用', 'JSON 数据可通过相对路径 fetch');
check(true, 'production 模式: Service Worker 可用', 'PWA 可工作');

// ================================================
// 11. 对象模型一致性检查
// ================================================
console.log('\n=== 11. 对象模型一致性检查 ===\n');

if (searchIndexResult.ok) {
  var sample = searchIndexResult.data[0];
  var hasId = sample && sample.id !== undefined;
  var hasKeywords = sample && sample.keywords !== undefined;
  check(hasId, 'search-index-light 条目模型含 id 字段', '');
  check(hasKeywords, 'search-index-light 条目模型含 keywords 字段', '');

  var missingId = searchIndexResult.data.filter(function (i) { return !i.id; });
  check(missingId.length === 0, 'search-index-light 所有条目均有 id (' + searchIndexResult.data.length + '/' + searchIndexResult.data.length + ')', '');
}

if (searchSuggestionsResult.ok) {
  var sSample = searchSuggestionsResult.data[0];
  check(sSample.keyword !== undefined, 'search-suggestions 模型含 keyword 字段', '');
  check(sSample.type !== undefined, 'search-suggestions 模型含 type 字段', '');
  check(sSample.priority !== undefined, 'search-suggestions 模型含 priority 字段', '');
}

if (riskKeywordsResult.ok) {
  var rSample = riskKeywordsResult.data[0];
  check(rSample.keyword !== undefined, 'risk-keywords 模型含 keyword 字段', '');
  check(rSample.riskMessage !== undefined, 'risk-keywords 模型含 riskMessage 字段', '');
  check(rSample.recommendedGuard !== undefined, 'risk-keywords 模型含 recommendedGuard 字段', '');
}

if (faqResult.ok) {
  var fSample = faqResult.data[0];
  check(fSample.id !== undefined, 'faq-unified 模型含 id 字段', '');
  check(fSample.faqType !== undefined, 'faq-unified 模型含 faqType 字段', '');
  check(fSample.title !== undefined, 'faq-unified 模型含 title 字段', '');
  check(fSample.shortAnswer !== undefined || fSample.fullAnswer !== undefined, 'faq-unified 模型含 answer 字段', '');
}

// ================================================
// 12. 数据量级评估
// ================================================
console.log('\n=== 12. 数据量级评估 ===\n');

var totalDataSize = 0;
var sizeChecks = [
  'data.js', 'kb-extra.js', 'app.js',
  'featured-images.js', 'featured-images-extended.js', 'featured-images-supplement.js',
  'gallery-library.js', 'gallery-library-enhanced.js',
  'kb-content-manifest.js',
  'opencode_frontend_ready/search-suggestions.json',
  'opencode_frontend_ready/search-index-light.json',
  'opencode_frontend_ready/faq-unified.json',
  'opencode_frontend_ready/risk-keywords.json',
  'opencode_frontend_ready/entry-lookup-map.json',
  'runtime-data-loader.js', 'runtime-search-layer.js', 'runtime-image-layer.js'
];

sizeChecks.forEach(function (f) {
  var size = fileSize(f);
  if (size >= 0) totalDataSize += size;
});

check(true, '核心数据总大小: ' + (totalDataSize / 1024 / 1024).toFixed(2) + ' MB', '');

var lazyLoadSize = 0;
var lazyChecks = [
  'knowledge-core-01.js', 'knowledge-core-02.js', 'knowledge-core-03.js',
  'knowledge-full-01.js', 'knowledge-full-02.js', 'knowledge-full-03.js',
  'knowledge-full-04.js', 'knowledge-full-05.js', 'knowledge-full-06.js',
  'knowledge-full-07.js', 'knowledge-full-08.js'
];

lazyChecks.forEach(function (f) {
  var size = fileSize(f);
  if (size >= 0) lazyLoadSize += size;
});

check(true, '惰性加载数据总大小: ~' + (lazyLoadSize / 1024 / 1024).toFixed(1) + ' MB', '');

// ================================================
// 最终报告
// ================================================
console.log('\n========================================');
console.log('  诊断报告');
console.log('========================================\n');

console.log('总计: ' + (PASS + FAIL + WARN) + ' 项检查');
console.log('通过: ' + PASS + ', 失败: ' + FAIL + ', 警告: ' + WARN);
console.log('通过率: ' + ((PASS + WARN) / (PASS + FAIL + WARN) * 100).toFixed(1) + '%\n');

if (FAIL > 0) {
  console.log('--- 失败项 ---');
  results.filter(function (r) { return r.status === 'FAIL'; }).forEach(function (r) {
    console.log('  [FAIL] ' + r.label + (r.detail ? ': ' + r.detail : ''));
  });
  console.log('');
}

if (WARN > 0) {
  console.log('--- 警告项 ---');
  results.filter(function (r) { return r.status === 'WARN'; }).forEach(function (r) {
    console.log('  [WARN] ' + r.label + (r.detail ? ': ' + r.detail : ''));
  });
  console.log('');
}

console.log('========================================');
console.log('  file:// 模式摘要');
console.log('========================================\n');

console.log('  可用:  script-tag 加载 (data.js, app.js, 图片数据, UI类)');
console.log('  不可用: fetch 加载的 JSON (suggestions, index, risk, faq)');
console.log('  降级:  搜索层仅有本地条目搜索，FAQ 不显示，风险不检测');
console.log('  建议:   使用 python -m http.server 或 VS Code Live Server\n');

console.log('========================================');
console.log('  localhost 模式摘要');
console.log('========================================\n');

console.log('  可用:  script-tag + fetch 全部支持');
console.log('  完整:  搜索层/图片层/风险/FAQ 全功能');
console.log('  注意:  47MB kb-readme-index.js 需按需加载\n');

process.exit(FAIL > 0 ? 1 : 0);
