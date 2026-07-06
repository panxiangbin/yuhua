# 智能标签系统 — 实施指南

> 文档版本: 1.0
> 实施阶段: 4 阶段，预计总工时 2-3 天
> 依赖: 知识图谱导入系统 (graph-importer.js) + 移动端 UI (mobile-ui-demo.html)

---

## 一、实施总览

### 1.1 系统架构

```
┌──────────────────────────────────────────────────┐
│                 知识文件 (.md / .txt)              │
└──────────────┬───────────────────────────────────┘
               ▼
┌──────────────────────────────────────────────────┐
│         知识图谱导入系统 (graph-importer.js)        │
│    输出: 文件元数据 (路径/名称/大小/内容哈希)        │
└──────────────┬───────────────────────────────────┘
               ▼
┌──────────────────────────────────────────────────┐
│             智能标签系统 (本系统)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │ tagging-     │  │ tagging-    │  │ tagging-  │ │
│  │ config.js    │  │ algorithms  │  │ system.js │ │
│  │ (配置/关键词) │  │ .js (算法)  │  │ (存储/API)│ │
│  └─────────────┘  └─────────────┘  └───────────┘ │
└──────────────┬───────────────────────────────────┘
               ▼
┌──────────────────────────────────────────────────┐
│             应用层 (消费方)                         │
│  搜索排序 / 个性化推荐 / 标签筛选 / 统计展示        │
└──────────────────────────────────────────────────┘
```

### 1.2 文件清单

| 文件 | 行数 | 职责 | 优先级 |
|------|------|------|--------|
| `tagging-config.js` | 358 | 7 维度定义、550+ 关键词、权重配置 | P0（已完成） |
| `TAGGING_SYSTEM_ARCHITECTURE.md` | - | 架构说明 | P0（已完成） |
| `TAGGING_KEYWORD_DICTIONARY.md` | - | 关键词词典说明 | P0（已完成） |
| `TAGGING_ALGORITHMS.md` | 811 | 5 大算法完整说明 | P0（已完成） |
| `TAGGING_DATA_STRUCTURE.md` | 565 | 三层存储设计 | P0（已完成） |
| `tagging-algorithms.js` | - | 18 个算法函数 | P0（已完成） |
| `tagging-system.js` | - | 21 个系统 API | P0（已完成） |
| `TAGGING_API_SPECIFICATION.md` | - | 35 个方法完整 API 文档 | P0（已完成） |
| `TAGGING_IMPLEMENTATION_GUIDE.md` | - | 实施指南 | P0（已完成） |

---

## 二、实施阶段

### 阶段 1：依赖安装与验证（0.5 天）

#### 1.1 检查依赖

确保以下文件已在项目中存在:

```
□ tagging-config.js        CNC_TAG_CONFIG
□ graph-importer.js         (可选) 用于元数据输入
□ KnowledgeGraph.js         (可选) 用于文件数据源
```

#### 1.2 加载顺序

```html
<!-- 在 index.html 中按此顺序加载 -->
<script src="tagging-config.js"></script>
<script src="tagging-algorithms.js"></script>
<script src="tagging-system.js"></script>
```

#### 1.3 验证安装

在浏览器 DevTools Console 中执行:

```javascript
// 验证全局对象
console.log(!!window.CNC_TAG_CONFIG);              // → true
console.log(!!window.CNC_TAGGING_ALGORITHMS);      // → true
console.log(!!window.CNC_TAGGING_SYSTEM);          // → true

// 验证算法
var algo = CNC_TAGGING_ALGORITHMS;
console.log(typeof algo.autoClassify);              // → function
console.log(typeof algo.assessDifficulty);          // → function
console.log(typeof algo.getRecommendations);        // → function
console.log(typeof algo.rankSearchResults);         // → function

// 验证系统 API
var sys = CNC_TAGGING_SYSTEM;
console.log(typeof sys.getTags);                    // → function
console.log(typeof sys.searchByTagCombination);     // → function
console.log(typeof sys.autoClassifyFile);           // → function
```

#### 1.4 浏览器兼容性

| 特性 | 兼容性 | 说明 |
|------|--------|------|
| IndexedDB | IE 10+, 所有现代浏览器 | 用于标签持久化 |
| LocalStorage | IE 8+, 所有现代浏览器 | 用于用户数据 |
| ES5 | 所有浏览器 | 代码使用 ES5 IIFE 模式 |

---

### 阶段 2：核心功能集成（1 天）

#### 2.1 文件标签化接入点

在知识图谱导入完成后，调用标签系统进行自动分类:

```javascript
// 在 graph-importer.js 的导入完成回调中
function onImportCompleted(importedFiles) {
  // 批量自动分类
  var filesForTagging = importedFiles.map(function(f) {
    return {
      fileId: f.fileId,
      content: f.content,
      metadata: { path: f.path, name: f.name }
    };
  });

  CNC_TAGGING_SYSTEM.batchAutoClassify(filesForTagging, {
    batchSize: 100,
    interval: 200,
    onProgress: function(p) {
      updateProgressBar('标签化', p.percent);
    }
  }, function(results) {
    console.log('标签化完成: ' + results.length + ' 个文件');
  });
}
```

#### 2.2 文件详情页标签展示

```javascript
// 文件详情页打开时
function onFileOpen(fileId) {
  CNC_TAGGING_SYSTEM.getTags(fileId, function(tags) {
    if (!tags) return;
    // 渲染难度标签
    renderDifficultyBadge(tags.difficulty);
    // 渲染内容类型标签
    renderTagChips('.category-tags', tags.contentCategory);
    // 渲染机床类型标签
    renderTagChips('.machine-tags', tags.machineType);
    // 渲染系统品牌标签
    renderTagChips('.brand-tags', tags.systemBrand);
    // 渲染知识属性标签
    renderTagChips('.attr-tags', tags.knowledgeAttr);

    // 添加浏览记录
    CNC_TAGGING_SYSTEM.addViewHistory({
      fileId: fileId,
      title: getFileTitle(fileId),
      tags: tags,
      timestamp: Date.now(),
      duration: 0
    });
  });
}
```

#### 2.3 标签筛选功能

```javascript
// 标签筛选面板
function applyTagFilter(filters) {
  CNC_TAGGING_SYSTEM.searchByTagCombination(filters, function(fileIds) {
    // fileIds 是满足所有标签条件的文件 ID 列表
    renderFileList(fileIds);
  });
}

// 示例: 筛选 G代码 + 中级 + FANUC
applyTagFilter({
  contentCategory: 'gcode',
  difficulty: 'intermediate',
  systemBrand: 'fanuc'
});
```

---

### 阶段 3：高级功能集成（0.5 天）

#### 3.1 个性化推荐

```javascript
// 在首页或侧边栏展示推荐
function showRecommendations() {
  var profile = CNC_TAGGING_SYSTEM.getProfile();
  var allFiles = getFileList(); // 从知识图谱获取全量文件列表
  var enrichedFiles = allFiles.map(function(f) {
    // 同步获取标签（或从缓存读取）
    f.tags = CNC_TAGGING_SYSTEM.cache.get(f.fileId) || { difficulty: { level: 'beginner' } };
    return f;
  });

  var recommendations = CNC_TAGGING_ALGORITHMS.getRecommendations(profile, enrichedFiles, { count: 10 });
  renderRecommendationCards(recommendations);
}
```

#### 3.2 搜索排序增强

```javascript
// 搜索结果处理
function processSearchResults(keyword, rawResults, callback) {
  var profile = CNC_TAGGING_SYSTEM.getProfile();

  // 补充标签信息
  var enriched = rawResults.map(function(r) {
    var tags = CNC_TAGGING_SYSTEM.cache.get(r.fileId);
    if (tags) r.tags = tags;
    return r;
  });

  // 搜索排序
  var ranked = CNC_TAGGING_ALGORITHMS.rankSearchResults(enriched, keyword, profile);

  // 记录搜索历史
  CNC_TAGGING_SYSTEM.addSearchHistory(keyword, ranked.length);

  callback(ranked);
}
```

#### 3.3 搜索建议

```javascript
// 搜索框输入实时建议
function onSearchInput(keyword) {
  var allFiles = getFileList();
  var suggestions = CNC_TAGGING_ALGORITHMS.getSuggestions(keyword, allFiles);
  renderSuggestions(suggestions);
}
```

---

### 阶段 4：测试与验收（0.5 天）

#### 4.1 验收标准

| # | 验收项 | 验证方法 | 预期结果 |
|---|--------|---------|----------|
| 1 | 文件标签化 | 对一篇 G代码文件执行 autoClassifyFile() | 正确标注 contentCategory: gcode |
| 2 | 难度评估 | 对含 30+ 行代码的文件评估 | 难度 ≥ intermediate |
| 3 | 标签持久化 | 写入标签后刷新页面再次读取 | 标签数据恢复 |
| 4 | 标签搜索 | 按 contentCategory: gcode 搜索 | 返回所有 G代码文件 |
| 5 | 用户画像 | 浏览 5 篇 G代码文件后获取画像 | interestTags 包含 cc:gcode |
| 6 | 推荐结果 | 调用 getRecommendations() | 返回与兴趣匹配的结果 |
| 7 | 搜索排序 | 搜索 "G00" | 标题含 G00 的文件排在前 |
| 8 | 搜索建议 | 输入 "G0" | 建议列表含 G00、G01 等 |
| 9 | 批量性能 | 1000 个文件批量分类 | 总耗时 < 30 秒 |
| 10 | 内存占用 | 42K 文件标签化后 | JS heap < 50MB |

#### 4.2 测试脚本

```javascript
// 验收测试: 在 DevTools Console 中执行
(function testTaggingSystem() {
  var pass = 0;
  var fail = 0;

  function assert(desc, condition) {
    if (condition) { pass++; console.log('✓ ' + desc); }
    else { fail++; console.error('✗ ' + desc); }
  }

  // 测试 1: 全局对象存在
  assert('CNC_TAG_CONFIG 已加载', !!window.CNC_TAG_CONFIG);
  assert('CNC_TAGGING_ALGORITHMS 已加载', !!window.CNC_TAGGING_ALGORITHMS);
  assert('CNC_TAGGING_SYSTEM 已加载', !!window.CNC_TAGGING_SYSTEM);

  // 测试 2: 自动分类
  var sampleContent = 'G00 快速定位 G01 直线插补 G02 圆弧插补 G03 逆圆 F500 S3000 M03';
  var result = CNC_TAGGING_ALGORITHMS.autoClassify(sampleContent, { path: '01_编程基础', name: 'test.md' });
  assert('自动分类返回对象', typeof result === 'object');
  assert('内容类型含 gcode', result.contentCategory && result.contentCategory.some(function(c) { return c.id === 'gcode'; }));
  assert('难度已评估', result.difficulty && result.difficulty.score >= 1);

  // 测试 3: 相似度
  var sim = CNC_TAGGING_ALGORITHMS.computeTagSimilarity(result, result);
  assert('自身相似度 = 1', Math.abs(sim - 1) < 0.001);

  // 测试 4: 搜索排序
  var ranked = CNC_TAGGING_ALGORITHMS.rankSearchResults(
    [{ title: 'G00 详解', content: '...' }, { title: 'M03 详解', content: '...' }],
    'G00', null
  );
  assert('G00 搜索结果排序', ranked[0].rankScore >= ranked[1].rankScore);

  // 测试 5: 存储
  CNC_TAGGING_SYSTEM.setTags('test_file_001', result, function(record) {
    assert('setTags 写入成功', record && record.fileId === 'test_file_001');
    CNC_TAGGING_SYSTEM.getTags('test_file_001', function(tags) {
      assert('getTags 读取成功', tags && tags.fileId === 'test_file_001');
      console.log('测试完成: ' + pass + ' 通过, ' + fail + ' 失败');
    });
  });
})();
```

#### 4.3 性能基准

在 42,000 个知识文件的场景下，预期性能指标:

| 操作 | 预估耗时 | 内存增量 |
|------|---------|---------|
| 单文件自动分类 | < 5ms | - |
| 批量分类 (42K 文件) | ~5 分钟 | ~50MB |
| 标签搜索 (单维) | < 10ms | - |
| 标签搜索 (三维组合) | < 20ms | - |
| 个性化推荐 | < 10ms | - |
| 搜索排序 (100 结果) | < 5ms | - |

---

## 三、集成注意事项

### 3.1 与知识图谱导入系统的集成

标签系统设计为知识图谱导入管道的 **后处理阶段**：

```
graph-importer.js 导入完成
    ↓
每个文件已分配 fileId
    ↓
将文件内容和元数据传给 tagSystem.autoClassifyFile()
    ↓
标签写入 IndexedDB (异步)
    ↓
标签可用于搜索/推荐/排序
```

### 3.2 与移动端 UI 的集成

标签系统为移动端 UI 提供数据支撑：

| 移动端 UI 组件 | 标签系统接口 |
|---------------|------------|
| 首页标签筛选栏 | `searchByTagCombination()` |
| 文件详情标签展示 | `getTags()` |
| "猜你喜欢" 推荐 | `getRecommendations()` |
| 搜索结果排序 | `rankSearchResults()` |
| 搜索输入建议 | `getSuggestions()` |
| 用户偏好设置 | `getPreferences()`, `savePreferences()` |
| 收藏管理 | `addFavorite()`, `getFavorites()` |

### 3.3 首次加载优化

- 首次加载时不自动执行批量分类（避免阻塞）
- 在用户无操作时（requestIdleCallback）异步处理
- 每批 100 个文件，间隔 200ms

```javascript
if ('requestIdleCallback' in window) {
  requestIdleCallback(function() {
    CNC_TAGGING_SYSTEM.batchAutoClassify(pendingFiles, {
      batchSize: 100, interval: 200
    });
  });
}
```

### 3.4 file:// 协议注意事项

- IndexedDB 在 `file://` 协议下**可以正常工作**（Chrome 允许）
- LocalStorage 在 `file://` 协议下**部分浏览器不允许**（Firefox 禁止）
- 如果检测到 `file://` 且 LocalStorage 不可用，标签系统会静默降级（数据仅存内存）

```javascript
// 检测 LocalStorage 可用性
var lsAvailable = false;
try { localStorage.setItem('_test', '1'); localStorage.removeItem('_test'); lsAvailable = true; } catch(e) {}
```

---

## 四、维护与扩展

### 4.1 关键词扩展

编辑 `tagging-config.js` 中的关键词数组即可。系统会自动在下次分类时采用新关键词。

```javascript
// 在子分类中添加新关键词
subcategories: [
  { id: 'gcode', label: 'G代码', keywords: ['原有关键词...', '新关键词1', '新关键词2'] },
]
```

### 4.2 新维度扩展

如需新增标签维度：

1. 在 `tagging-config.js` 中添加维度数据
2. 在 `tagging-algorithms.js` 中添加匹配函数
3. 在 `tagging-system.js` 的 `file_tags` 结构中添加字段
4. 在 `TAGGING_DATA_STRUCTURE.md` 中更新文档

### 4.3 权重调优

算法权重集中在 `tagging-config.js` 的 `ALGORITHM_WEIGHTS` 中，可在线调整无需重启：

```javascript
// 实时调整搜索排序权重
CNC_TAG_CONFIG.ALGORITHM_WEIGHTS.searchRanking.keywordMatch = 0.50;
CNC_TAG_CONFIG.ALGORITHM_WEIGHTS.searchRanking.popularity = 0.10;
```

### 4.4 数据迁移

IndexedDB 版本升级由 `DB_CONFIG.version` 控制。`openDB()` 的 `onupgradeneeded` 回调处理数据迁移（当前在 tagging-system.js 中实现）。
