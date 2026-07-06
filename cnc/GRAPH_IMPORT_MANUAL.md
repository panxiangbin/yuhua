# 知识图谱数据导入操作手册

> 文档版本: 1.0  
> 适用系统: CNC Param QuickFinder  
> 前置条件: KnowledgeGraph.js 已加载

---

## 一、快速开始

### 1.1 加载脚本

在浏览器控制台中依次加载以下脚本（或通过 HTML 的 `<script>` 标签引入）：

```html
<script src="import-config.js"></script>
<script src="entity-extractor.js"></script>
<script src="data-cleaner.js"></script>
<script src="relationship-builder.js"></script>
<script src="graph-importer.js"></script>
<script src="import-test.js"></script>
```

### 1.2 验证加载

在控制台执行：

```javascript
// 检查所有模块是否加载成功
console.log(window.CNC_IMPORT_CONFIG);        // 配置
console.log(window.CNC_ENTITY_EXTRACTOR);      // 实体提取器
console.log(window.CNC_DATA_CLEANER);          // 数据清洗器
console.log(window.CNC_RELATIONSHIP_BUILDER);  // 关系构建器
console.log(window.CNC_GRAPH_IMPORTER);        // 主导入器
```

### 1.3 运行测试

```javascript
// 快速测试（同步，约 1 秒）
CNC_IMPORT_TEST.runQuick();

// 完整测试（含异步 5 样本导入验证）
CNC_IMPORT_TEST.runAll();
```

测试通过后，所有功能已验证可用。

---

## 二、样本导入

### 2.1 导入 5 个内置样本

```javascript
CNC_IMPORT_TEST.importSampleSet(
  function(progress) {
    console.log('进度: ' + progress.percent + '% - ' + progress.message);
  },
  function(report, graph, importer) {
    console.log('导入完成:', report.summary);
    console.log('图节点数:', graph.nodes.size);
    console.log('图关系数:', graph.edges.size);
  }
);
```

### 2.2 验证导入结果

导入后查询图谱：

```javascript
// 查询所有 G代码 节点
var gcodes = graph.queryNodes({ type: 'gcode' }, 100, 0);
console.log('G代码数量:', gcodes.length);
gcodes.forEach(function(g) { console.log(' - ' + g.label); });

// 查询所有刀具节点
var tools = graph.queryNodes({ type: 'tool' }, 100, 0);
console.log('刀具数量:', tools.length);

// 查询一个概念的相关实体
var related = graph.getRelated('concept_坐标系', 'related_to', 'outgoing', 10);
console.log('"坐标系"相关实体:', related.length);

// 推荐
var recs = graph.recommend('gcode_G00', 5);
console.log('G00 推荐:', recs);
```

---

## 三、从文件导入

### 3.1 使用 importFromFileEntries

这是主要导入方法，接受文件条目数组：

```javascript
// 准备文件条目
// 方式 A: 手动构造（从文件读取或从数据源获取）
var fileEntries = [];
fileEntries.push({
  path: '01_编程基础/G00G01快速定位与直线插补.md',
  name: 'G00G01快速定位与直线插补.md',
  content: '# G00/G01详解\n...文件完整内容...'
});

// 方式 B: 批量添加
for (var i = 0; i < yourFileList.length; i++) {
  fileEntries.push({
    path: yourFileList[i].path,
    name: yourFileList[i].name,
    content: yourFileList[i].content
  });
}

// 创建导入器
var graph = new window.CNC_KnowledgeGraph();
var importer = new CNC_GRAPH_IMPORTER.GraphImporter(graph);

// 执行导入
importer.importFromFileEntries(fileEntries, {
  batchSize: 1000,
  filterLowQuality: true,
  mergeDuplicates: true,
  enableProgress: true,
  onProgress: function(p) {
    console.log('进度: ' + p.percent + '% (' + p.loaded + '/' + p.total + ')');
  },
  onComplete: function(report) {
    console.log('=== 导入报告 ===');
    console.log('节点:', report.importedNodes);
    console.log('关系:', report.importedEdges);
    console.log('耗时:', report.elapsedStr);
    console.log('摘要:', report.summary);
  }
});
```

### 3.2 使用 importFromContent（简化版）

不需要构造文件条目对象，直接传内容数组：

```javascript
var contents = [
  { path: '编程基础/G代码.md', content: '# G代码\n...' },
  { path: '刀具工艺/铣刀.md', content: '# 铣刀\n...' }
];

importer.importFromContent(contents, {
  batchSize: 100,
  mergeDuplicates: true,
  onComplete: function(report) { console.log(report.summary); }
});
```

### 3.3 导入特定目录

```javascript
// 导入器本身不支持文件系统扫描（file:// 协议限制）
// 请使用外部工具获取文件列表后调用 importFromFileEntries

// 示例：只导入编程基础目录
var programmingFiles = allFiles.filter(function(f) {
  return f.path.indexOf('01_编程基础') !== -1;
});
importer.importFromFileEntries(programmingFiles, {
  onComplete: function(report) { console.log('编程基础导入完成:', report.summary); }
});
```

### 3.4 仅导入特定实体类型

```javascript
// 通过实体提取器的 filter 逻辑控制
// 当前版本在提取后清洗阶段过滤低置信度实体
// 如需过滤特定类型，可在 import 前手动过滤：
var allEntities = extractResult.entities;
var gcodeOnly = allEntities.filter(function(e) { return e.type === 'gcode' || e.type === 'mcode'; });
graph.addNode(gcodeOnly[i]);  // 逐一添加
```

---

## 四、高级用法

### 4.1 分阶段导入

```javascript
var importer = new CNC_GRAPH_IMPORTER.GraphImporter(graph);

// 阶段 1: 只导入节点
importer.importNodes(allEntities, { batchSize: 1000 });

// 阶段 2: 只导入关系
importer.importEdges(allEdges, { batchSize: 1000 });

// 阶段 3: 持久化
graph.saveToIndexedDB().then(function() {
  console.log('已持久化到 IndexedDB');
});
```

### 4.2 增量导入

```javascript
// 导入器不会检查已有节点，重复调用 addNode 会覆盖
// 可以在导入前清空或使用不同 ID 前缀

// 先清空
importer.resetStats();

// 导入增量数据
importer.importFromFileEntries(newFileEntries, {
  mergeDuplicates: true,
  onComplete: function(report) {
    console.log('增量导入完成:', report.summary);
    console.log('总计:', graph.nodes.size, '节点,', graph.edges.size, '关系');
  }
});
```

### 4.3 自定义配置

```javascript
// 修改配置：调整阈值
CNC_IMPORT_CONFIG.CONFIG.FILE_QUALITY.DEEP_THRESHOLD = 10000; // 10KB 即视为深度文件

// 注意：CONFIG 是冻结的，修改不会生效
// 请在加载 import-config.js 后立即修改（在冻结前）

// 或向 CNC_IMPORT_CONFIG.CONFIG.ALIAS_MAP 添加自定义别名（冻结后无法添加）

// 推荐方式：在调用时通过参数控制
importer.importFromFileEntries(entries, {
  batchSize: 500,              // 调小批大小
  filterLowQuality: false,     // 不过滤低质量
  mergeDuplicates: true
});
```

### 4.4 自定义进度条

```javascript
importer.importFromFileEntries(entries, {
  onProgress: function(p) {
    var bar = '';
    var width = 30;
    var filled = Math.round(p.percent / 100 * width);
    for (var i = 0; i < width; i++) {
      bar += (i < filled) ? '█' : '░';
    }
    console.log('[' + bar + '] ' + p.percent + '% - ' + p.message);
  }
});
```

### 4.5 中止导入

```javascript
// 在 onProgress 回调中判断条件中止
var importer = new CNC_GRAPH_IMPORTER.GraphImporter(graph);

importer.importFromFileEntries(entries, {
  onProgress: function(p) {
    if (p.errors > 10) {
      importer.abort();
      console.warn('错误过多，已中止');
    }
  }
});
```

---

## 五、理解导入报告

导入完成后，`generateReport()` 返回以下结构：

```javascript
{
  timestamp: '2026-07-06T...',      // 完成时间
  totalFiles: 42294,                 // 输入文件总数
  parsedFiles: 42000,                // 成功解析数
  extractedEntities: 150000,        // 提取实体数
  builtRelations: 350000,           // 构建关系数
  importedNodes: 120000,            // 实际导入节点（去重后）
  importedEdges: 300000,            // 实际导入关系（去重后）
  duplicatesRemoved: 30000,         // 去重移除数
  errors: 50,                        // 错误数
  filteredLow: 200,                  // 低质量过滤数
  elapsed: 120000,                   // 耗时(ms)
  elapsedStr: '120.0s',             // 耗时(可读)
  summary: '120000 节点, 300000 关系, 42000 文件, 耗时 120.0s, 错误 50',
  phaseDetails: {
    parse:  { elapsed: 45000, elapsedStr: '45.0s' },
    extract: { elapsed: 30000, elapsedStr: '30.0s' },
    clean:   { elapsed: 5000, elapsedStr: '5.0s' },
    relate:  { elapsed: 20000, elapsedStr: '20.0s' },
    import:  { elapsed: 15000, elapsedStr: '15.0s' },
    persist: { elapsed: 5000, elapsedStr: '5.0s' }
  }
}
```

各阶段耗时占比参考：

| 阶段 | 占比 | 说明 |
|------|------|------|
| 解析 (parse) | ~38% | 读取文件、提取元数据 |
| 提取 (extract) | ~25% | 实体识别（正则/关键词） |
| 清洗 (clean) | ~4% | 去重/过滤（O(n)） |
| 关联 (relate) | ~17% | 关系推断（O(n²) 共现） |
| 导入 (import) | ~12% | 图数据库写入 |
| 持久化 (persist) | ~4% | IndexedDB 存储 |

---

## 六、故障排除

### 6.1 常见错误

| 错误 | 原因 | 解决 |
|------|------|------|
| "知识图谱引擎未初始化" | graph 参数为 null | 先 new KnowledgeGraph() |
| "读取失败" | 文件路径不对或 file:// 限制 | 确认文件存在，改用 importFromContent |
| "存储空间不足" | localStorage 配额超限 | 使用 IndexedDB 模式 |
| 导入结果为空 | 内容过短或低质量过滤 | 设置 filterLowQuality: false |
| 控制台无输出 | enableLogging: false | 设置 enableLogging: true |

### 6.2 性能调优

| 场景 | 建议 |
|------|------|
| 内存不足 | 减小 batchSize |
| 导入太慢 | 增大 batchSize，跳过质量过滤 |
| IndexedDB 慢 | 减少批量保存频率 |
| 实体过多 | 增加置信度阈值过滤 |
| 关系过多 | 禁用部分关系类型 |

---

## 七、最佳实践

1. **先小规模测试**：先用 100 个文件测试，确认结果正确后再全量导入
2. **分目录导入**：按知识领域分批导入，便于排查问题
3. **保留备份**：导入前先执行 `graph.saveToIndexedDB()` 备份
4. **监控控制台**：关注 warnings 和 errors 输出
5. **深度优先**：先导入深度文件（>14KB），它们包含最丰富的实体
6. **考试题库最后处理**：40K 考题按考点聚合后再导入
7. **定期持久化**：每导入 5000 文件后调用 `saveToIndexedDB()`

---

## 八、API 参考

### GraphImporter

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| constructor | knowledgeGraph | - | 创建导入器实例 |
| importNodes | nodes[], options | Promise | 分批导入节点 |
| importEdges | edges[], options | Promise | 分批导入关系 |
| importFromFileEntries | fileEntries[], options | Promise | 完整导入流程 |
| importFromContent | contentItems[], options | Promise | 简化导入 |
| importFromDirectory | dirPath, options | Promise | 需外部提供文件列表 |
| generateReport | - | Object | 生成导入报告 |
| abort | - | void | 中止导入 |
| resetStats | - | void | 重置统计 |
| getStats | - | Object | 获取当前统计 |

### FileScanner

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| scanDirectory | path, options | Promise | 扫描目录（受限） |
| parseFile | filePath, options | Promise | 解析单个文件 |
| batchParse | filePaths[], options | Promise | 批量解析 |
| _parseContent | content, filePath, options | Object | 解析内容元数据 |

### Options 参数

| 名称 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| batchSize | Number | 1000 | 批处理大小 |
| filterLowQuality | Boolean | true | 是否过滤低质量 |
| mergeDuplicates | Boolean | true | 是否合并重复 |
| enableProgress | Boolean | true | 启用进度回调 |
| enableLogging | Boolean | true | 启用控制台日志 |
| examGrouping | Boolean | true | 考试按考点聚合 |
| deepFilePriority | Boolean | true | 深度文件优先 |
| logLevel | Number | 1 | 日志级别 (0-4) |
| onProgress | Function | null | 进度回调 |
| onComplete | Function | null | 完成回调 |
