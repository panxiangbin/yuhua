# 知识图谱数据导入系统架构文档

> 文档版本: 1.0  
> 创建日期: 2026-07-06  
> 对应代码: graph-importer.js, entity-extractor.js, relationship-builder.js, data-cleaner.js, import-config.js, import-test.js

---

## 一、系统概述

知识图谱数据导入系统（KG Import System）是 CNC Param QuickFinder 的数据填充子系统。其核心使命是将本地 42,294 个数控知识 Markdown 文件解析、提取、清洗、关联后导入 KnowledgeGraph 引擎，使知识图谱从"空壳"变为"可用"状态。

系统设计遵循六大原则：**可靠性优先**（42K 文件不可丢失）、**渐进式导入**（深度优先、分批处理）、**可恢复性**（每批可独立重试）、**性能可观测**（每阶段有计时和统计）、**数据质量可控**（多级过滤和校验）、**浏览器兼容**（纯前端，无 Node.js 依赖）。

### 1.1 系统范围

| 维度 | 内容 |
|------|------|
| 数据源 | F:\AI工作台\04_数控知识库 下的所有 .md 文件 |
| 文件规模 | 42,294 个文件，约 77MB |
| 实体类型 | 14 种（gcode, mcode, tool, machine, material, process, concept, brand, parameter, case, problem, exam, category, file） |
| 关系类型 | 12 种（requires, related_to, part_of, used_in, replaces, compared_with, depends_on, causes, tests, belongs_to, references, examples） |
| 目标存储 | KnowledgeGraph 引擎 + IndexedDB 持久化 |
| 运行环境 | 浏览器（file:// 协议受限） |

### 1.2 设计约束

1. **file:// 协议限制**：无法使用 fetch() 加载本地文件，无法使用 Service Worker，无法使用 FileSystem API 递归扫描目录。导入系统设计了 `FileScanner` 抽象层，在实际部署时由外部提供文件内容列表。
2. **纯浏览器运行**：所有代码为 ES5（IIFE 模式），无 npm 依赖，无构建步骤。
3. **内存安全**：42K 文件不可一次性加载到内存，必须分批处理。
4. **无伪代码**：所有导出的类和方法均为可执行实现。

---

## 二、整体架构

### 2.1 模块依赖关系

```
┌─────────────────────────────────────────────────────────────┐
│                     import-config.js                        │
│                   (集中配置 / 常量 / 别名映射)                 │
└──────────┬──────────┬──────────┬──────────┬─────────────────┘
           │          │          │          │
           ▼          ▼          ▼          ▼
┌──────────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐
│entity-       │ │data-     │ │relationship│ │graph-importer │
│extractor.js  │ │cleaner.js│ │-builder.js│ │(orchestrator) │
│(实体识别)     │ │(数据清洗) │ │(关系构建)  │ │               │
└──────────────┘ └──────────┘ └──────────┘ └───────┬───────┘
                                                    │
                                                    ▼
                                         ┌──────────────────┐
                                         │  KnowledgeGraph   │
                                         │  (图谱引擎，已存在) │
                                         │  addNode/addEdge  │
                                         │  saveToIndexedDB  │
                                         └──────────────────┘
                                                    │
                                                    ▼
                                         ┌──────────────────┐
                                         │   IndexedDB      │
                                         │  (持久化存储)     │
                                         └──────────────────┘
```

### 2.2 数据处理流水线

导入过程分为 6 个阶段，按顺序执行：

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  扫描    │ →  │  解析    │ →  │  提取    │ →  │  清洗    │ →  │  关联    │ →  │  导入    │
│ 扫描文件  │    │ 读取内容  │    │ 实体识别  │    │ 去重过滤  │    │ 关系构建  │    │ 写入图谱  │
│ 元数据提取 │    │ 分类标记  │    │ 代码|刀具  │    │ 标准化    │    │ 共现|依赖 │    │ 持久化   │
│ 质量分级  │    │ 标题提取  │    │ 机床|材料  │    │ 质量分级  │    │ 应用|包含 │    │ 报告生成  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

每个阶段有独立的计时、计数和错误收集，便于定位瓶颈和失败点。

### 2.3 类职责划分

| 类名 | 文件 | 职责 | 主要方法 |
|------|------|------|----------|
| `FileScanner` | graph-importer.js | 文件读取 + 元数据解析 | scanDirectory, parseFile, batchParse, _parseContent |
| `GraphImporter` | graph-importer.js | 导入编排 + 图数据库写入 | importNodes, importEdges, importFromFileEntries, importFromContent, generateReport |
| `CONFIG` 对象 | import-config.js | 所有配置常量 | ENTITY_TYPES, RELATION_TYPES, ALIAS_MAP, FILE_QUALITY 阈值等 |
| (函数集合) | entity-extractor.js | 从文本中提取各类实体 | extractGCodes, extractMCodes, extractTools, extractMachines, extractMaterials, extractConcepts, extractAll |
| (函数集合) | data-cleaner.js | 数据去重/过滤/验证/标准化 | deduplicateEntities, filterLowQualityFiles, validateEdges, standardizeEntities, cleanPipeline |
| (函数集合) | relationship-builder.js | 实体间关系推断 | buildCooccurrenceRelations, buildCodeDependencyRelations, buildToolMaterialRelations, buildAllRelations |
| (函数集合) | import-test.js | 测试与验证 | runAll, runQuick, importSampleSet |

---

## 三、核心模块设计

### 3.1 配置模块 (import-config.js)

集中管理所有可调参数，避免魔法数字散落在各文件中。

**配置组**：

- `BATCH_SIZE` — 各阶段批处理大小（扫描 500、解析 100、节点导入 1000、关系导入 1000）
- `FILE_QUALITY` — 文件质量阈值（深度文件 >14KB、中等 4-14KB、基础 <4KB、最低内容 100 字节）
- `ENTITY_TYPES` — 14 种实体类型枚举
- `RELATION_TYPES` — 12 种关系类型枚举
- `RELATION_WEIGHTS` — 每种关系的默认权重（requires=1.0, depends_on=1.0, related_to=0.5 等）
- `TOOL_PATTERNS` — 11 种刀具的识别关键词
- `MACHINE_PATTERNS` — 8 种机床品牌的识别关键词
- `MATERIAL_PATTERNS` — 8 种材料的识别关键词
- `CONCEPT_PATTERNS` — 35 个核心概念词
- `ALIAS_MAP` — 60+ 个别名到标准名的映射
- `EXAM_CONFIG` — 考试题库处理策略（按考点聚合，不逐题建节点）

设计上使用 `Object.freeze()` 深度冻结配置对象，确保运行时不会被意外修改。

### 3.2 实体提取器 (entity-extractor.js)

实体提取器通过正则匹配和关键词扫描从 Markdown 内容中识别数控领域实体。

**提取策略**：

| 实体类型 | 提取方法 | 示例 |
|----------|----------|------|
| G代码 | 正则 `\bG\d{2,3}(?!\d)\b` + 别名标准化 | G00, G01, G54 |
| M代码 | 正则 `\bM\d{2,3}(?!\d)\b` + 别名标准化 | M03, M08, M30 |
| T代码 | 正则 `\bT\d{1,2}\b` | T01, T12 |
| 刀具 | 关键词匹配（11 种模式，多别名） | 立铣刀, 球头刀, 钻头 |
| 机床 | 关键词匹配（8 种品牌，含型号） | FANUC, SIEMENS, MAZAK |
| 材料 | 关键词匹配（8 种材料，含牌号） | 45号钢, 6061, TC4 |
| 概念 | 35 个预定关键词扫描 | 坐标系, 对刀, 刀具补偿 |
| 参数 | 模式匹配（F=, S=, ap=） | 进给速度, 主轴转速 |
| 工艺 | 20 个工艺关键词扫描 | 铣削, 车削, 钻孔 |

**标准化流程**：
1. 原始文本 → 正则/关键词匹配 → 原始实体
2. 通过 `ALIAS_MAP` 别名表标准化名称（如"平刀"→"端铣刀"）
3. 去重（同类型同标签合并，保留高置信度）
4. 添加元数据（来源文件、置信度、分类）

**考试题库特殊处理**：
- 提取 `考点:` 行中的考点关键词
- 不逐题建节点，按考点聚合
- 使用路径分类作为后备考点

### 3.3 数据清洗器 (data-cleaner.js)

数据清洗器负责质量控制和数据标准化。

**文件质量分级**：

| 级别 | 条件 | 优先级 | 处理策略 |
|------|------|--------|----------|
| 深度文件 (deep) | >14KB 且 >5000 字 | 1（最高） | 标记为权威来源，实体权重 ×1.2 |
| 中等文件 (medium) | 4-14KB 且 >1000 字 | 2 | 正常处理 |
| 基础文件 (basic) | 100-4000 字 | 3 | 正常处理 |
| 低质文件 (trash) | <100 字 | 99（丢弃） | 跳过，不导入 |

**去重算法**：
- 标签+类型完全匹配 → 合并（保留高置信度）
- 内容哈希（简单哈希函数）→ 完全相同内容去重
- Jaccard 文本相似度（阈值 0.85）→ 高相似内容合并（保留深度文件）

**实体标准化**：
- G代码/M代码 → 大写去空格（g00 → G00）
- 概念名称 → 别名映射标准化

**关系验证**：
- 空值检查
- 自环拒绝
- 节点存在性检查（可选）
- 批量验证

### 3.4 关系构建器 (relationship-builder.js)

关系构建器通过多种策略推断实体间的语义关系。

**关系推断策略**：

| 关系类型 | 推断方式 | 权重 |
|----------|----------|------|
| related_to | 同一文件中共现的不同类型实体 | 0.5 |
| compared_with | 同一文件中的同类型不同代码（如 G90 vs G91） | 0.5 |
| requires | G代码依赖（G41 需要 G40 前置）、代码前置关系 | 1.0 |
| depends_on | 功能依赖关系 | 1.0 |
| used_in | 刀具-材料匹配（端铣刀→钢/铝）、工艺-刀具（铣削→立铣刀） | 0.6 |
| part_of | 机床-品牌归属 | 0.8 |
| references | 文件-实体引用关系 | 0.4 |
| belongs_to | 文件-分类归属 | 0.3 |
| tests | 考试-考点关联 | 0.5 |

**共现关系详解**：
同一文件中的实体两两配对。例如一个文件同时提到 G00 和 G01，就建立 `gcode_G00 -- compared_with → gcode_G01`。如果文件提到 G00 和"端铣刀"，则建立 `gcode_G00 -- related_to → tool_endmill`。

**专业领域规则**：
- 端铣刀 → 用于钢、铝加工
- 球头刀 → 用于钢、铝、钛合金
- 钻头 → 用于钢、铝、钛合金
- G41 需要 G40 前置
- M03 与 M04 互斥（正反转切换）
- 铣削加工使用立铣刀/球头刀/面铣刀

---

## 四、数据处理流程

### 4.1 标准导入流程

```
importFromFileEntries(fileEntries, options)
  │
  ├─ 阶段 1: 解析 (parse)
  │   ├─ 逐文件调用 _readFileViaAPI()
  │   │   ├─ 提取 contentHash, categories, prefix, type
  │   │   ├─ 提取 frontmatter, title, tags
  │   │   ├─ 质量分级 (classifyFileQuality)
  │   │   └─ 提取 topCategory / subCategory
  │   └─ 错误收集继续
  │
  ├─ 阶段 2: 提取 (extract)
  │   ├─ 普通文件 → extractAll(content, metadata)
  │   ├─ 考试文件 → extractFromExamContent(content, metadata)
  │   └─ 收集所有实体到 fileEntityMap
  │
  ├─ 阶段 3: 清洗 (clean)
  │   ├─ 实体标准化 (standardizeEntities)
  │   ├─ 实体去重 (deduplicateEntities)
  │   └─ 低置信度过滤 (<0.3)
  │
  ├─ 阶段 4: 关联 (relate)
  │   ├─ 按文件建立共现关系
  │   ├─ 建立代码依赖关系
  │   ├─ 建立刀具-材料关系
  │   ├─ 建立工艺-刀具关系
  │   ├─ 建立文件引用关系
  │   └─ 全局去重
  │
  ├─ 阶段 5: 导入 (import)
  │   ├─ 分批导入节点 (importNodes)
  │   └─ 分批导入关系 (importEdges)
  │
  └─ 阶段 6: 持久化 (persist)
      └─ graph.saveToIndexedDB()
```

### 4.2 回滚与错误处理

- 每批导入独立，前一失败不影响后续
- 错误收集在 stats.errors 中，不中断流程
- 提供 `abort()` 方法可随时中止
- 导入完成后通过 `generateReport()` 获取完整统计

### 4.3 进度回调

```javascript
options.onProgress = function(progress) {
  // progress: { loaded, total, percent, message }
  updateProgressBar(progress.percent);
};
options.onComplete = function(report) {
  // report: { importedNodes, importedEdges, parsedFiles, elapsedStr, summary }
  showResult(report.summary);
};
```

---

## 五、性能设计

### 5.1 批处理策略

| 阶段 | 批大小 | 依据 |
|------|--------|------|
| 文件解析 | 100 | 每文件约 2KB → 100 文件约 200KB，内存安全 |
| 节点导入 | 1000 | graph.addNode 为同步操作，批大小影响微乎其微 |
| 关系导入 | 1000 | 同上 |

### 5.2 内存管理

- 不在内存中保留所有文件内容
- `parseNext` 逐个处理文件后进入下一阶段
- 实体列表会累积（必需，因为需要全局去重）
- 42K 文件预计产生实体数：约 50K-200K（受文件密度影响）
- 200K 实体对象约 50-100MB，在浏览器可接受范围内

### 5.3 IndexedDB 性能

- `saveToIndexedDB()` 使用事务批量写入
- 节点和关系存储在独立的 object store
- 每个事务写入一个完整批
- 写入耗时预估：100K 节点 + 200K 关系 ≈ 10-30 秒

---

## 六、实体与关系模型

### 6.1 实体模型

```
{
  id: "gcode_G00",              // 唯一ID: {type}_{标准化名称}
  type: "gcode",                 // 实体类型
  label: "G00",                  // 显示标签（已标准化）
  properties: {
    category: "G代码",           // 分类
    description: "快速定位指令",  // 描述（可选）
    subtype: "modal"             // 子类型（可选）
  },
  metadata: {
    source: "01_编程基础/G代码.md", // 来源文件
    created: 1712345678000,       // 创建时间戳
    updated: 1712345678000,       // 更新时间戳
    version: 1                    // 版本
  }
}
```

### 6.2 关系模型

```
{
  id: "edge_1712345678000_abc123", // 自动生成
  source: "gcode_G00",
  target: "gcode_G01",
  relationType: "compared_with",
  weight: 0.5,
  properties: {
    cooccurrence: true,
    sourceFile: "01_编程基础/G代码.md"
  },
  bidirectional: false
}
```

### 6.3 实体-关系矩阵

| 实体 | G代码 | M代码 | 刀具 | 机床 | 材料 | 概念 | 工艺 | 文件 |
|------|-------|-------|------|------|------|------|------|------|
| G代码 | compared_with | related_to | - | - | - | related_to | related_to | references |
| M代码 | related_to | compared_with | - | - | - | related_to | related_to | references |
| 刀具 | - | - | compared_with | part_of | used_in | - | used_in | references |
| 机床 | - | - | part_of | compared_with | - | related_to | - | references |
| 材料 | - | - | used_in | - | compared_with | - | - | references |
| 概念 | related_to | related_to | - | related_to | - | related_to | related_to | references |
| 工艺 | related_to | related_to | used_in | - | - | related_to | related_to | references |
| 文件 | references | references | references | references | references | references | references | - |

---

## 七、考试题库处理策略

06_考证职业目录包含 40,439 个文件，占总数 95%。这些大多是简短的考题文件。策略如下：

1. **识别**：文件名包含"题库_"前缀
2. **考点提取**：扫描文件内容中的 `考点: xxx` 行
3. **聚合**：按考点名称分组，每个考点创建一个 `exam` 类型节点
4. **关联**：考点节点通过 `tests` 关系关联到对应的 `concept` 节点
5. **忽略**：孤立题目（无法归入任何考点）不建独立节点

这样处理将 40K 考题 → 约 500-2000 个考点节点，大幅减少图大小。

---

## 八、安全性考虑

1. **内容校验**：最大文件大小 50MB 安全阈值
2. **XSS 防护**：所有标签名称在导入前不做 HTML 渲染（由调用方负责）
3. **内存保护**：批处理 + 可中止机制防止内存溢出
4. **数据完整性**：IndexedDB 写入使用事务，部分写入失败不会破坏已有数据
5. **无外部请求**：所有处理在浏览器本地完成

---

## 九、测试策略

### 9.1 单元测试（import-test.js）

提供 `CNC_IMPORT_TEST.runAll()` 在浏览器控制台执行：

| 测试组 | 覆盖范围 | 断言数 |
|--------|----------|--------|
| 配置加载 | 配置对象完整性 | 7 |
| 实体提取 | 所有实体类型提取 | 11 |
| 数据清洗 | 质量分级/去重/标准化 | 9 |
| 关系构建 | 共现/刀具-材料/引用 | 6 |
| 导入器基础 | 实例化/方法存在/基本操作 | 7 |
| 考试题库 | 考点提取 | 3 |
| 关系验证 | 有效/无效/自环/空值 | 6 |
| 配置工具 | 标签/权重函数 | 3 |
| 边界条件 | null/''/{}/[] 输入 | 10+ |
| 完整导入 | 5 样本文件端到端 | 4 |

### 9.2 性能验收标准

| 指标 | 目标 |
|------|------|
| 1000 文件导入 | < 30 秒 |
| 42K 文件导入 | < 10 分钟 |
| 内存使用 | < 2GB |
| 单次查询响应 | < 100ms |
| 推荐计算 | < 500ms |

---

## 十、附录

### 10.1 文件清单

| 文件 | 行数 | 功能 |
|------|------|------|
| import-config.js | 283 | 集中配置（实体类型/关系类型/别名映射/性能参数） |
| entity-extractor.js | 373 | 实体识别（G代码/M代码/刀具/机床/材料/概念/参数/工艺） |
| data-cleaner.js | 246 | 数据清洗（去重/标准化/质量过滤/关系验证） |
| relationship-builder.js | 345 | 关系构建（共现/依赖/刀具-材料/包含/引用） |
| graph-importer.js | 564 | 导入编排（6阶段流水线/进度/回滚/报告） |
| import-test.js | 381 | 测试脚本（10 组测试，60+ 断言） |
| **合计** | **2192** | **6 个模块，完整导入系统** |

### 10.2 依赖图谱引擎 API

```
KnowledgeGraph.addNode(nodeData)   → node.id
KnowledgeGraph.addEdge(edgeData)   → edge.id
KnowledgeGraph.queryNodes(filters) → node[]
KnowledgeGraph.traverse(id, types, dir, depth) → result[]
KnowledgeGraph.recommend(id, limit) → candidate[]
KnowledgeGraph.saveToIndexedDB()   → Promise
KnowledgeGraph.loadFromIndexedDB() → Promise
```

### 10.3 与现有系统集成

导入系统通过 `window.CNC_*` 全局对象暴露，与现有系统集成时需保证加载顺序：

1. KnowledgeGraph.js（图谱引擎，已存在）
2. import-config.js（配置）
3. entity-extractor.js（实体提取）
4. data-cleaner.js（数据清洗）
5. relationship-builder.js（关系构建）
6. graph-importer.js（主导入器）
7. import-test.js（测试脚本，可选）

所有文件在 index.html 中以 `<script>` 标签加载后，即可通过 `new CNC_GRAPH_IMPORTER.GraphImporter(window.KnowledgeGraph)` 创建导入器实例。
