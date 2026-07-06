# 智能标签系统 — API 规范

> 文档版本: 1.0
> 覆盖范围: CNC_TAGGING_SYSTEM + CNC_TAGGING_ALGORITHMS
> 方法总数: 35

---

## 一、CNC_TAGGING_SYSTEM（核心系统，21 个方法）

### 1.1 数据库初始化

#### `openDB(onReady)`

打开 IndexedDB 连接。首次调用时创建数据库和对象存储。

| 参数 | 类型 | 说明 |
|------|------|------|
| onReady | Function | 回调，参数为 IDBDatabase 实例或 null |

```javascript
CNC_TAGGING_SYSTEM.openDB(function(db) {
  if (db) console.log('数据库已就绪');
});
```

---

### 1.2 标签 CRUD（5 个方法）

#### `getTags(fileId, callback)`

获取文件的标签数据，优先从内存缓存读取。

| 参数 | 类型 | 说明 |
|------|------|------|
| fileId | String | 文件唯一标识 |
| callback | Function | 回调，参数为标签对象或 null |

```javascript
CNC_TAGGING_SYSTEM.getTags('file_abc123', function(tags) {
  console.log(tags.contentCategory, tags.difficulty);
});
```

返回数据结构:

```javascript
{
  fileId: 'file_abc123',
  contentCategory: [{ id: 'gcode', label: 'G代码', confidence: 0.85 }],
  difficulty: { level: 'intermediate', score: 3.2, details: {...} },
  machineType: [{ id: 'milling', label: '加工中心', confidence: 0.75 }],
  materialType: [],
  systemBrand: [],
  knowledgeAttr: [{ id: 'must_learn', label: '必修', confidence: 0.70 }],
  timeAttr: { lastUpdated: 1712345678000, new: true, hot: false, classic: false, outdated: false },
  customTags: ['用户标签'],
  lastUpdated: 1712345678000,
  confidence: 0.72
}
```

#### `setTags(fileId, tags, callback)`

写入文件标签，同时更新内存缓存、IndexedDB 队列、倒排索引和统计。

| 参数 | 类型 | 说明 |
|------|------|------|
| fileId | String | 文件唯一标识 |
| tags | Object | 标签对象（与 getTags 返回格式一致） |
| callback | Function | 可选，写入完成回调 |

#### `removeTags(fileId, callback)`

删除文件的标签数据，同时清除缓存。

| 参数 | 类型 | 说明 |
|------|------|------|
| fileId | String | 文件唯一标识 |
| callback | Function | 回调，参数为 Boolean |

#### `addCustomTag(fileId, tag, callback)`

为用户自定义标签添加一个标签值（自动去重）。

| 参数 | 类型 | 说明 |
|------|------|------|
| fileId | String | 文件唯一标识 |
| tag | String | 自定义标签文本 |
| callback | Function | 可选，回调返回更新后的标签对象 |

#### `removeCustomTag(fileId, tag, callback)`

移除用户自定义标签。

| 参数 | 类型 | 说明 |
|------|------|------|
| fileId | String | 文件唯一标识 |
| tag | String | 要移除的标签文本 |
| callback | Function | 可选 |

---

### 1.3 自动分类（2 个方法）

#### `autoClassifyFile(fileId, content, metadata, callback)`

对单个文件执行自动分类，并将结果写入存储。

| 参数 | 类型 | 说明 |
|------|------|------|
| fileId | String | 文件唯一标识 |
| content | String | 文件全文内容 |
| metadata | Object | 元数据 `{ path, name, size, ... }` |
| callback | Function | 回调，参数 `(record, tags)` |

```javascript
CNC_TAGGING_SYSTEM.autoClassifyFile('file_abc', 'G00 G01...', { path: '01_编程基础', name: 'G00详解.md' }, function(record, tags) {
  console.log('分类完成，置信度:', record.confidence);
});
```

#### `batchAutoClassify(files, options, callback)`

批量自动分类。使用分批处理防止阻塞 UI。

| 参数 | 类型 | 说明 |
|------|------|------|
| files | Array | 文件数组，每项 `{ fileId, content, metadata }` |
| options | Object | `{ batchSize: 50, interval: 100, onProgress: Function }` |
| callback | Function | 全部完成后的回调 |

```javascript
CNC_TAGGING_SYSTEM.batchAutoClassify(allFiles, {
  batchSize: 100,
  interval: 200,
  onProgress: function(p) { console.log(p.percent + '%'); }
}, function(results) {
  console.log('分类完成，共 ' + results.length + ' 个文件');
});
```

---

### 1.4 组合标签搜索（1 个方法）

#### `searchByTagCombination(tagFilters, callback)`

通过倒排索引快速查找满足多标签组合的文件 ID 列表。

| 参数 | 类型 | 说明 |
|------|------|------|
| tagFilters | Object | `{ contentCategory: 'gcode', difficulty: 'intermediate', systemBrand: 'fanuc' }` |
| callback | Function | 回调，参数为 fileId 数组 |

```javascript
CNC_TAGGING_SYSTEM.searchByTagCombination({
  contentCategory: 'gcode',
  machineType: 'milling',
  systemBrand: 'fanuc'
}, function(fileIds) {
  console.log('找到 ' + fileIds.length + ' 个匹配文件');
});
```

---

### 1.5 统计（2 个方法）

#### `getStats(callback)`

获取所有维度的标签统计。

| 参数 | 类型 | 说明 |
|------|------|------|
| callback | Function | 回调，参数为统计数组 |

#### `getDimensionStats(dimension, callback)`

获取指定维度的标签统计。

| 参数 | 类型 | 说明 |
|------|------|------|
| dimension | String | 维度名，如 `'contentCategory'`, `'machineType'` |
| callback | Function | 回调，参数为统计对象 |

```javascript
CNC_TAGGING_SYSTEM.getDimensionStats('contentCategory', function(stat) {
  console.log(stat.distribution.programming.count); // 编程类文件数
});
```

---

### 1.6 用户数据管理（11 个方法）

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `getProfile()` | 获取用户画像 | Object |
| `saveProfile(profile)` | 保存用户画像 | void |
| `getViewHistory()` | 获取浏览历史 | Array |
| `addViewHistory(entry)` | 添加浏览记录（自动重建画像） | void |
| `getSearchHistory()` | 获取搜索历史 | Array |
| `addSearchHistory(keyword, resultsCount)` | 添加搜索记录 | void |
| `getFavorites()` | 获取收藏列表 | Object |
| `addFavorite(fileId, title)` | 添加收藏 | void |
| `removeFavorite(fileId)` | 移除收藏 | void |
| `getPreferences()` | 获取用户偏好 | Object |
| `savePreferences(prefs)` | 保存用户偏好 | void |

```javascript
// 浏览记录格式
var entry = {
  fileId: 'file_abc',
  title: 'G00/G01快速定位',
  tags: { contentCategory: [{ id: 'gcode' }], difficulty: { level: 'intermediate' } },
  timestamp: Date.now(),
  duration: 120000
};
CNC_TAGGING_SYSTEM.addViewHistory(entry);
```

---

## 二、CNC_TAGGING_ALGORITHMS（算法库，18 个方法）

### 2.1 自动分类

#### `autoClassify(content, metadata)`

7 维度自动分类，返回包含所有维度的标签对象。

```javascript
var result = CNC_TAGGING_ALGORITHMS.autoClassify(fileContent, { path: '...', name: '...' });
// result.contentCategory, result.machineType, result.materialType, ...
```

---

### 2.2 难度评估

| 方法 | 说明 |
|------|------|
| `assessDifficulty(content, metadata)` | 5 指标加权难度评估 → `{ level, score, details }` |
| `computeTermDensity(content)` | 专业术语密度 |
| `analyzeCodeBlocks(content)` | 代码块复杂度分析 |
| `countFormulas(content)` | 公式数量 |
| `countPrerequisites(content)` | 前置知识检测 |

---

### 2.3 相似度计算

| 方法 | 说明 |
|------|------|
| `computeTagSimilarity(tagsA, tagsB)` | Jaccard + 余弦混合标签相似度 (0~1) |
| `flattenTags(tags)` | 展平标签对象为 `['cc:gcode', 'mt:milling', ...]` |
| `computeContentSimilarity(contentA, contentB)` | TF-IDF 余弦内容相似度 (0~1) |
| `extractKeywords(content)` | 提取 G代码/M代码/工艺术语 |
| `termFrequency(terms)` | 词频 (TF) 计算，归一化 |
| `cosineSimilarity(vecA, vecB)` | 余弦相似度，接受 `{ term: weight }` 格式 |

---

### 2.4 推荐系统

| 方法 | 说明 |
|------|------|
| `buildUserProfile(viewHistory, searchHistory, favorites)` | 从行为数据构建用户画像 |
| `getRecommendations(userProfile, allFiles, limits)` | 4 策略融合推荐 |
| `contentBasedFiltering(profile, allFiles)` | 基于内容的推荐 |
| `difficultyMatch(profile, allFiles)` | 难度匹配推荐 |

---

### 2.5 搜索排序

#### `rankSearchResults(results, keyword, userProfile)`

5 因子加权排序，为每个结果注入 `rankScore` 属性。

```javascript
var ranked = CNC_TAGGING_ALGORITHMS.rankSearchResults(searchResults, 'G00', userProfile);
```

---

### 2.6 搜索建议

#### `getSuggestions(keyword, knowledgeBase)`

基于关键词词典和文件名的实时搜索建议。

```javascript
var suggestions = CNC_TAGGING_ALGORITHMS.getSuggestions('G0', allFiles);
// [{ text: 'G00', type: 'keyword', score: 0.9 }, { text: 'G01', type: 'keyword', score: 0.85 }]
```

---

## 三、配置对象 CNC_TAG_CONFIG

配置对象提供以下属性供算法和系统使用：

| 属性 | 类型 | 说明 |
|------|------|------|
| `CONTENT_CATEGORIES` | Array | 内容类型 8 大类 28 子类 |
| `DIFFICULTY_LEVELS` | Array | 5 级难度定义 |
| `DIFFICULTY_THRESHOLDS` | Object | 各难度阈值 |
| `MACHINE_TYPES` | Array | 7 种机床类型 |
| `MATERIAL_TYPES` | Array | 9 种材料类型 |
| `SYSTEM_BRANDS` | Array | 7 种系统品牌 |
| `KNOWLEDGE_ATTRIBUTES` | Array | 7 种知识属性 |
| `TIME_ATTRIBUTES` | Array | 4 种时间属性 |
| `ALGORITHM_WEIGHTS` | Object | 所有算法权重配置 |
| `SIMILARITY_THRESHOLDS` | Object | 相似度判定阈值 |
| `TECHNICAL_TERMS` | Array | 200+ 专业术语表 |
| `FILE_PREFIX_MAP` | Array | 文件名前缀 → 标签映射 |
| `PATH_TAG_MAP` | Array | 路径 → 标签映射 |
| `getCategoryById(id)` | Function | ID 查分类 |
| `getDifficultyById(id)` | Function | ID 查难度 |
| `getAllKeywords()` | Function | 获取所有关键词 |

---

## 四、调用顺序

```
  1. 加载 tagging-config.js         → CNC_TAG_CONFIG
  2. 加载 tagging-algorithms.js     → CNC_TAGGING_ALGORITHMS
  3. 加载 tagging-system.js         → CNC_TAGGING_SYSTEM
  4. 调用 openDB()                   → 初始化 IndexedDB
  5. 调用 autoClassifyFile()         → 文件标签化
  6. 调用 searchByTagCombination()   → 标签搜索
  7. 调用 getRecommendations()       → 个性化推荐
  8. 调用 rankSearchResults()        → 搜索排序
```

加载顺序验证:

```javascript
if (window.CNC_TAG_CONFIG && window.CNC_TAGGING_ALGORITHMS && window.CNC_TAGGING_SYSTEM) {
  console.log('标签系统全部就绪');
}
```

---

## 五、错误处理

所有异步方法使用 Error-first 回调风格。IndexedDB 操作失败会自动将写入放回队列，1 秒后重试。LocalStorage 写入超过配额时静默失败（try/catch 捕获）。

```javascript
CNC_TAGGING_SYSTEM.getTags('nonexistent', function(tags) {
  if (!tags) console.warn('文件不存在或尚未标签化');
});
```
