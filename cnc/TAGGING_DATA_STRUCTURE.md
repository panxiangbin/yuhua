# 智能标签系统 — 数据结构与存储设计

> 文档版本: 1.0  
> 存储方案: IndexedDB (主) + LocalStorage (用户数据) + 内存缓存 (热数据)  
> 对应代码: tagging-system.js

---

## 一、存储架构

### 1.1 三层存储体系

```
┌─────────────────────────────────────────────────────┐
│             内存缓存 (Memory Cache)                  │
│  - 热数据：最近访问的文件标签                         │
│  - 关键词词典 (冻结, 只读)                            │
│  - 常用查询结果缓存 (LRU, 最多500条)                  │
│  存取速度: <1μs                                     │
├─────────────────────────────────────────────────────┤
│          IndexedDB (异步持久化存储)                   │
│  - 标签索引表 (file_tags)                             │
│  - 标签倒排表 (tag_index)                             │
│  - 标签统计 (tag_stats)                               │
│  存取速度: 5-50ms                                   │
├─────────────────────────────────────────────────────┤
│          LocalStorage (同步用户数据)                   │
│  - 用户画像 (profile)                                 │
│  - 浏览历史 (history)                                 │
│  - 用户偏好 (preferences)                             │
│  存取速度: <5ms                                      │
│  容量限制: ~5MB                                      │
└─────────────────────────────────────────────────────┘
```

### 1.2 数据流转

```
写入流程:
  文件入库 → 自动分类(生成标签) → 写入内存缓存 → 异步写入IndexedDB → 更新倒排索引

读取流程:
  标签查询 → 检查内存缓存(hit→返回) → 查询IndexedDB → 写入缓存 → 返回

用户数据:
  浏览记录 → 写入LocalStorage(同步) → 更新用户画像(异步) → 可选同步到IndexedDB
```

---

## 二、IndexedDB 数据表

### 2.1 数据库 Schema

```javascript
var DB_CONFIG = {
  name: 'CNC_TagSystem',
  version: 1,
  stores: [
    {
      name: 'file_tags',
      keyPath: 'fileId',
      indexes: [
        { name: 'category', keyPath: 'contentCategory', multiEntry: true },
        { name: 'difficulty', keyPath: 'difficulty.level' },
        { name: 'machine', keyPath: 'machineType', multiEntry: true },
        { name: 'material', keyPath: 'materialType', multiEntry: true },
        { name: 'brand', keyPath: 'systemBrand', multiEntry: true },
        { name: 'updated', keyPath: 'lastUpdated' }
      ]
    },
    {
      name: 'tag_index',
      keyPath: 'id',  // 'dimension:value'
      indexes: [
        { name: 'dimension', keyPath: 'dimension' },
        { name: 'count', keyPath: 'count' }
      ]
    },
    {
      name: 'tag_stats',
      keyPath: 'id'
    },
    {
      name: 'file_metadata',
      keyPath: 'fileId',
      indexes: [
        { name: 'size', keyPath: 'size' },
        { name: 'created', keyPath: 'created' },
        { name: 'path', keyPath: 'path' }
      ]
    }
  ]
};
```

### 2.2 file_tags 表 — 文件标签主表

核心表，存储每个文件的所有标签数据：

```javascript
// 记录结构
{
  fileId: 'file_abc123',                          // 文件唯一ID
  contentCategory: [                               // D1: 内容类型
    { id: 'gcode', label: 'G代码', confidence: 0.85 },
    { id: 'technique', label: '编程技巧', confidence: 0.45 }
  ],
  difficulty: {                                    // D2: 难度
    level: 'intermediate',
    score: 3.2,
    details: {
      termDensity: 0.08,
      fileSize: 5640,
      codeLines: 12,
      formulaCount: 2,
      prereqCount: 3
    }
  },
  machineType: [                                   // D3: 机床
    { id: 'milling', label: '加工中心', confidence: 0.75 },
    { id: 'general', label: '通用', confidence: 0.20 }
  ],
  materialType: [                                  // D4: 材料
    { id: 'aluminum', label: '铝合金', confidence: 0.65 },
    { id: 'general', label: '通用材料', confidence: 0.30 }
  ],
  systemBrand: [                                   // D5: 系统品牌
    { id: 'fanuc', label: 'FANUC', confidence: 0.55 },
    { id: 'general', label: '通用系统', confidence: 0.40 }
  ],
  knowledgeAttr: [                                 // D6: 知识属性
    { id: 'must_learn', label: '必修', confidence: 0.70 },
    { id: 'handson', label: '实战', confidence: 0.50 }
  ],
  timeAttr: {                                      // D7: 时间属性
    lastUpdated: 1712345678000,
    new: false,          // 是否30天内
    hot: true,           // 是否近期热门
    classic: false,      // 是否经典
    outdated: false      // 是否过时
  },
  customTags: ['用户自定义', 'CNC加工'],            // 用户自定义标签
  lastUpdated: 1712345678000,                      // 最后更新时间
  confidence: 0.72                                  // 综合置信度
}
```

查询示例：

```javascript
// 查询所有G代码类的文件
db.transaction('file_tags')
  .objectStore('file_tags')
  .index('category')
  .getAll('gcode');

// 查询中级难度的文件
db.transaction('file_tags')
  .objectStore('file_tags')
  .index('difficulty')
  .getAll('intermediate');
```

### 2.3 tag_index 表 — 标签倒排索引

用于快速根据标签查找文件：

```javascript
// 记录结构
{
  id: 'contentCategory:gcode',    // 维度:值
  dimension: 'contentCategory',   // 标签维度
  value: 'gcode',                  // 标签值
  files: [                         // 包含此标签的文件ID列表
    'file_abc123',
    'file_def456',
    // ... 最多存储前1000个
  ],
  count: 128,                      // 包含此标签的文件总数
  lastUpdated: 1712345678000
}
```

查询示例：

```javascript
// 快速查找所有G代码相关的文件
var gcodeFiles = tagIndex['contentCategory:gcode'].files;

// 组合查询: G代码 + FANUC
var gcodeSet = new Set(tagIndex['contentCategory:gcode'].files);
var fanucSet = new Set(tagIndex['systemBrand:fanuc'].files);
var intersection = [...gcodeSet].filter(x => fanucSet.has(x));
```

倒排索引容量预估：

```
平均每个文件有 8 个标签 (含子标签)
42K × 8 = 336K 条索引记录
每条记录平均 100 bytes
总容量: ~34MB (IndexedDB 可接受范围)
```

### 2.4 tag_stats 表 — 标签统计

用于展示标签分布和热门标签：

```javascript
{
  id: 'category_stats',
  type: 'category_stats',
  dimension: 'contentCategory',
  total: 8,
  distribution: {
    programming: { count: 18500, label: '编程' },
    operation: { count: 5200, label: '操作' },
    process: { count: 4800, label: '工艺' },
    cam: { count: 2100, label: 'CAM' },
    repair: { count: 3800, label: '维修' },
    quality: { count: 1200, label: '质量' },
    theory: { count: 3600, label: '理论' },
    case: { count: 3100, label: '案例' }
  }
}

{
  id: 'difficulty_stats',
  type: 'difficulty_stats',
  dimension: 'difficulty',
  distribution: {
    beginner: { count: 8500, label: '入门' },
    elementary: { count: 12000, label: '初级' },
    intermediate: { count: 11000, label: '中级' },
    advanced: { count: 7200, label: '高级' },
    expert: { count: 3600, label: '专家' }
  }
}

{
  id: 'machine_stats',
  type: 'machine_stats',
  dimension: 'machineType',
  distribution: {
    milling: { count: 22000, label: '加工中心' },
    lathe: { count: 8500, label: '车床' },
    mill_turn: { count: 1200, label: '车铣复合' },
    grinder: { count: 1800, label: '磨床' },
    edm_wire: { count: 2100, label: '线切割' },
    edm: { count: 1500, label: '电火花' },
    general: { count: 5200, label: '通用' }
  }
}
```

### 2.5 file_metadata 表 — 文件元数据

```javascript
{
  fileId: 'file_abc123',
  path: '01_编程基础/G00G01快速定位与直线插补.md',
  name: 'G00G01快速定位与直线插补详解.md',
  title: 'G00/G01快速定位与直线插补详解',
  size: 5640,
  created: 1712345678000,
  updated: 1712345678000,
  contentHash: 'h3f8a2b',
  prefix: '知识',
  topCategory: '编程基础',
  subCategory: 'G代码系列'
}
```

---

## 三、LocalStorage 用户数据

### 3.1 用户画像 (cnc_user_profile)

```javascript
{
  userId: 'local',                    // 本地单用户模式
  skillLevel: 'intermediate',         // 推断的技能水平
  interestTags: {                     // 兴趣标签权重 (由浏览历史计算)
    'cc:gcode': 15,
    'cc:technique': 8,
    'cc:operation': 6,
    'mt:milling': 10,
    'sb:fanuc': 7
  },
  preferredMachines: {                // 偏好机床
    'milling': 12,
    'lathe': 3
  },
  preferredBrands: {                  // 偏好品牌
    'fanuc': 8,
    'siemens': 4
  },
  totalViews: 156,
  lastActive: 1712345678000,
  lastUpdated: 1712345678000
}
```

### 3.2 浏览历史 (cnc_view_history)

```javascript
[
  {
    fileId: 'file_abc123',
    title: 'G00/G01快速定位与直线插补详解',
    tags: { contentCategory: ['gcode'], difficulty: { level: 'intermediate' } },
    timestamp: 1712345678000,
    duration: 120000  // 停留时间 ms
  },
  // ... 最多 200 条
]
```

### 3.3 搜索历史 (cnc_search_history)

```javascript
[
  { keyword: 'G00', timestamp: 1712345678000, resultsCount: 47 },
  { keyword: 'FANUC 对刀', timestamp: 1712345678000, resultsCount: 12 },
  // ... 最多 50 条
]
```

### 3.4 收藏列表 (cnc_favorites)

```javascript
{
  'file_abc123': { fileId: 'file_abc123', title: 'G00/G01快速定位', addedAt: 1712345678000 },
  'file_def456': { fileId: 'file_def456', title: 'FANUC G代码全集', addedAt: 1712345678000 }
}
```

### 3.5 用户偏好 (cnc_user_preferences)

```javascript
{
  theme: 'dark',                              // 亮色/暗色
  fontSize: 18,                               // 正文字号 px
  autoDarkMode: true,                         // 自动跟随系统
  recommendCount: 10,                         // 推荐数量
  defaultSearchFilter: 'all',                 // 默认搜索筛选
  hideOutdated: true,                         // 隐藏过时内容
  customTags: ['我的收藏', '工作中', '学习中'], // 自定义标签列表
  tagOrder: ['contentCategory','difficulty','machineType','materialType','systemBrand','knowledgeAttr'] // 标签显示顺序
}
```

---

## 四、内存缓存设计

### 4.1 缓存策略

```javascript
var MemoryCache = {
  _tags: {},           // { fileId: tags } 最近访问的文件标签
  _tag_index: {},      // { 'dimension:value': files[] } 热门标签索引
  _maxTags: 500,       // 最大缓存标签数
  _maxIndex: 100,      // 最大缓存索引条目
  
  get: function(fileId) {
    return this._tags[fileId] || null;
  },
  
  set: function(fileId, tags) {
    if (Object.keys(this._tags).length >= this._maxTags) {
      // LRU: 移除最早添加的
      var firstKey = Object.keys(this._tags)[0];
      delete this._tags[firstKey];
    }
    this._tags[fileId] = tags;
  },
  
  invalidate: function(fileId) {
    delete this._tags[fileId];
  },
  
  clear: function() {
    this._tags = {};
    this._tag_index = {};
  }
};
```

### 4.2 热数据预估

```
内存缓存:
  标签缓存: 500 条 × 2KB = 1MB
  关键词词典: 550 词 × 100B = 55KB
  配置数据: 冻结常量 ≈ 50KB
  总内存: < 2MB

IndexedDB:
  file_tags: 42K × 800B = 33.6MB
  tag_index: ~10K 条 × 200B = 2MB
  tag_stats: 10 条 × 1KB = 10KB
  file_metadata: 42K × 200B = 8.4MB
  总计: ~44MB

LocalStorage:
  用户画像: ~2KB
  浏览历史: ~100KB (200条)
  搜索历史: ~10KB (50条)
  收藏: ~50KB
  偏好: ~1KB
  总计: < 200KB
```

---

## 五、索引优化

### 5.1 查询类型与索引使用

| 查询类型 | 使用索引 | 预期耗时 |
|----------|---------|----------|
| 按 fileId 查标签 | file_tags 主键 | <5ms |
| 按内容类型查文件 | file_tags.category 索引 | <20ms |
| 按难度查文件 | file_tags.difficulty 索引 | <30ms |
| 组合多标签查询 | tag_index 倒排索引 + 内存求交 | <10ms |
| 标签统计 | tag_stats 主键 | <5ms |
| 热门前10标签 | tag_index.count 索引 (降序) | <15ms |

### 5.2 组合标签查询优化

对于多标签组合查询（如"找所有 G代码+中级+FANUC 的文件"），使用倒排索引加速：

```javascript
function searchByTagCombination(tagFilters) {
  // tagFilters = { contentCategory: 'gcode', difficulty: 'intermediate', brand: 'fanuc' }
  
  return new Promise(function(resolve, reject) {
    var db = openDB();
    var tx = db.transaction('tag_index');
    var store = tx.objectStore('tag_index');
    
    var promises = [];
    var filterKeys = [];
    
    Object.keys(tagFilters).forEach(function(dimension) {
      var value = tagFilters[dimension];
      var key = dimension + ':' + value;
      filterKeys.push(key);
      promises.push(new Promise(function(res, rej) {
        var req = store.get(key);
        req.onsuccess = function() { res(req.result ? req.result.files : []); };
        req.onerror = function() { rej(req.error); };
      }));
    });
    
    Promise.all(promises).then(function(results) {
      // 对多组结果取交集
      if (results.length === 0) resolve([]);
      if (results.length === 1) resolve(results[0]);
      
      var intersection = results[0].filter(function(fileId) {
        for (var i = 1; i < results.length; i++) {
          if (results[i].indexOf(fileId) === -1) return false;
        }
        return true;
      });
      resolve(intersection);
    }).catch(function(err) {
      reject(err);
    });
  });
}
```

---

## 六、数据一致性

### 6.1 标签更新策略

| 场景 | 更新策略 | 说明 |
|------|---------|------|
| 文件重新导入 | 覆盖旧标签 | 自动分类重新运行 |
| 用户手动添加标签 | 添加并标记 user=true | 置信度设为 0.9 |
| 用户手动移除标签 | 标记 removed=true | 不物理删除 |
| 批量重新分类 | 异步更新, 分批进行 | 每批 500 文件, 间隔 100ms |
| 用户反馈修正 | 更新置信度 | 正反馈 +0.1, 负反馈 -0.15 |

### 6.2 并发控制

```javascript
var _updateQueue = [];
var _isUpdating = false;

function enqueueUpdate(fileId, tags) {
  _updateQueue.push({ fileId: fileId, tags: tags, timestamp: Date.now() });
  processQueue();
}

function processQueue() {
  if (_isUpdating || _updateQueue.length === 0) return;
  _isUpdating = true;
  
  var batch = _updateQueue.splice(0, 50); // 每批 50 个
  var db = openDB();
  var tx = db.transaction('file_tags', 'readwrite');
  
  batch.forEach(function(item) {
    tx.objectStore('file_tags').put({
      fileId: item.fileId,
      tags: item.tags,
      lastUpdated: item.timestamp
    });
  });
  
  tx.oncomplete = function() {
    _isUpdating = false;
    processQueue(); // 处理下一批
  };
  
  tx.onerror = function() {
    _isUpdating = false;
    // 将失败的放回队列
    _updateQueue = batch.concat(_updateQueue);
    setTimeout(processQueue, 1000); // 1秒后重试
  };
}
```

---

## 七、数据迁移与版本管理

### 7.1 IndexedDB 版本迁移

```javascript
function migrateDB(oldVersion, newVersion, db) {
  if (oldVersion < 1) {
    // v1: 初始创建
    db.createObjectStore('file_tags', { keyPath: 'fileId' });
    db.createObjectStore('tag_index', { keyPath: 'id' });
    db.createObjectStore('tag_stats', { keyPath: 'id' });
    db.createObjectStore('file_metadata', { keyPath: 'fileId' });
  }
  if (oldVersion < 2) {
    // v2: 添加索引
    var tagStore = db.transaction('file_tags').objectStore('file_tags');
    tagStore.createIndex('category', 'contentCategory', { multiEntry: true });
    tagStore.createIndex('difficulty', 'difficulty.level');
    tagStore.createIndex('machine', 'machineType', { multiEntry: true });
    tagStore.createIndex('material', 'materialType', { multiEntry: true });
    tagStore.createIndex('brand', 'systemBrand', { multiEntry: true });
  }
  // 未来版本
}
```

---

## 总结

本数据结构文档定义了智能标签系统的三层存储体系：内存缓存（<2MB，<1μs 读取）、IndexedDB（~44MB，5-50ms 读取）、LocalStorage（<200KB，<5ms 读取）。核心数据表包括文件标签表（42K 条）、标签倒排索引（10K 条）、标签统计和文件元数据。通过倒排索引和多索引支持毫秒级标签组合查询，满足搜索和推荐的实时性要求。
