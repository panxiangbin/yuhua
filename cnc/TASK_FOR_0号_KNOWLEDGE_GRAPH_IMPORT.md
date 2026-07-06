# 0号任务：知识图谱数据导入系统完整实现

**任务编号**: TASK-0-20260706-KNOWLEDGE-GRAPH-DATA-IMPORT  
**任务类型**: 超长复杂任务  
**预计工作量**: 需要完整的系统设计、数据处理、性能优化  
**目标**: 将本地42,294个数控知识文件导入到知识图谱系统

---

## 一、任务背景

### 1.1 当前状态

**已完成**：
- 6号已设计并实现知识图谱引擎（KnowledgeGraph.js）
- 1号已将图谱引擎集成到软件中
- 图谱引擎支持节点、关系、遍历、推荐、IndexedDB持久化

**现状问题**：
- 知识图谱为空，没有任何数据
- 本地有42,294个知识文件未导入
- 无法使用图谱的查询、推荐、遍历功能

### 1.2 数据源信息

**位置**: `F:\AI工作台\04_数控知识库`  
**规模**: 42,294个文件，约77MB  
**最后更新**: 2026-06

**目录结构**：
```
F:/AI工作台/04_数控知识库/
├── 01_编程基础/          (471个文件)
│   ├── G代码系列/
│   ├── M代码系列/
│   ├── 宏程序系列/
│   └── 编程技巧/
├── 02_机床操作/          (207个文件)
│   ├── FANUC系统/
│   ├── 西门子系统/
│   ├── 三菱系统/
│   └── 维护保养/
├── 03_CAM软件/           (119个文件)
│   ├── UG_NX/
│   ├── Mastercam/
│   ├── PowerMill/
│   └── Fusion360/
├── 04_刀具工艺/          (378个文件)
│   ├── 刀具品牌/
│   ├── 材料加工/
│   └── 切削参数/
├── 05_故障维修/          (188个文件)
│   ├── 报警代码/
│   ├── 故障诊断/
│   └── 维修案例/
├── 06_检测质量/          (76个文件)
├── 06_考证职业/          (40,439个文件，71MB，占95%)
├── 07_行业资讯/          (201个文件)
└── 08_加工案例/          (129个文件)
```

**文件命名规范**：
- `知识类_xxx.md` — 知识性内容
- `教学_xxx.md` — 教程/教学类
- `案例_xxx.md` — 加工案例
- `题库_xxx.md` — 考试题目

**文件质量分级**：
- 深度文件 (>14KB): 含完整参数表+代码示例+实操要点
- 中等文件 (4-14KB): 主题明确，有参考价值
- 基础文件 (<4KB): 简洁条目或知识点

### 1.3 精选深度文件示例

- G代码M代码编程实例大全.md (41.9KB)
- FANUC G代码全集参考手册.md (25.1KB)
- UG NX数控编程完整指南.md (18.4KB)
- 切削参数速查大全.md (18.1KB)

---

## 二、任务目标

你需要设计并实现一个完整的知识图谱数据导入系统，包括：

### 2.1 核心目标

1. **数据解析系统** - 读取42K+个Markdown文件，解析内容和元数据
2. **实体识别系统** - 识别G代码、M代码、刀具、机床、材料、工艺等实体
3. **关系建立系统** - 建立前置知识、相关概念、应用场景等关系
4. **数据清洗系统** - 去重、标准化、质量过滤、关系验证
5. **导入执行系统** - 批量导入、进度跟踪、错误处理、回滚机制
6. **性能优化系统** - 分批处理、索引优化、查询优化、持久化策略
7. **验证测试系统** - 完整性验证、准确性验证、性能测试
8. **可视化建议** - 图谱结构可视化方案和交互设计建议

---

## 三、详细要求

### 3.1 数据解析要求

实现文件扫描器：

```javascript
class FileScanner {
  async scanDirectory(path, options = {}) {
    // 递归扫描目录
    // 过滤文件类型（.md）
    // 返回文件列表
  }
  
  async parseFile(filePath) {
    // 读取文件内容
    // 解析frontmatter（如果有）
    // 提取标题、标签、分类
    // 提取正文内容
    // 返回结构化数据
  }
  
  async batchParse(filePaths, batchSize = 100) {
    // 批量解析，避免内存溢出
  }
}
```

元数据提取：
- 从文件名提取分类（知识类/教学/案例/题库）
- 从文件路径提取主分类（编程基础/机床操作等）
- 从文件内容提取关键词
- 生成唯一ID（基于文件路径的hash）

### 3.2 实体识别要求

实现实体识别器：

```javascript
class EntityExtractor {
  extractGCodes(content) {
    // 正则匹配 G00, G01, G02, G03, G54 等
  }
  
  extractMCodes(content) {
    // 正则匹配 M03, M05, M08, M09 等
  }
  
  extractTools(content) {
    // 识别刀具类型（铣刀、车刀、钻头等）
  }
  
  extractMachines(content) {
    // 识别机床类型
  }
  
  extractMaterials(content) {
    // 识别材料类型
  }
  
  extractConcepts(content) {
    // 识别核心概念（坐标系、对刀等）
  }
  
  extractAll(content, fileMetadata) {
    // 综合提取所有实体
  }
}
```

实体标准化：
- G代码统一格式：`G54`（不是`g54`或`G 54`）
- 刀具统一命名：`端铣刀`（不是`平刀`或`平底刀`）
- 建立别名映射表

### 3.3 关系建立要求

实现关系识别器：

```javascript
class RelationshipBuilder {
  buildPrerequisiteRelations(entities, fileData) {
    // 识别前置知识关系
  }
  
  buildRelatedRelations(entities) {
    // 识别相关概念
  }
  
  buildApplicationRelations(entities, fileData) {
    // 识别应用场景
  }
  
  buildToolRelations(entities) {
    // 识别刀具依赖
  }
  
  buildAllRelations(nodeMap, fileDataList) {
    // 综合建立所有关系
  }
}
```

关系权重：
- 强关系：1.0（必需）
- 中关系：0.5（推荐）
- 弱关系：0.3（参考）

### 3.4 导入执行要求

实现导入器：

```javascript
class GraphImporter {
  constructor(knowledgeGraph) {
    this.graph = knowledgeGraph;
  }
  
  async importNodes(nodes, batchSize = 1000) {
    // 分批导入节点，显示进度，错误处理
  }
  
  async importEdges(edges, batchSize = 1000) {
    // 分批导入关系
  }
  
  async importFromDirectory(dirPath, options = {}) {
    // 完整导入流程：
    // 1. 扫描文件
    // 2. 解析内容
    // 3. 提取实体
    // 4. 建立关系
    // 5. 清洗数据
    // 6. 导入图谱
    // 7. 保存到IndexedDB
  }
}
```

---

## 四、输出要求

### 4.1 代码文件（6个）

1. **graph-importer.js** - 主导入器，包含所有导入逻辑
2. **entity-extractor.js** - 实体提取器，所有实体识别规则
3. **relationship-builder.js** - 关系构建器，关系识别规则
4. **data-cleaner.js** - 数据清洗器，去重算法和质量过滤
5. **import-config.js** - 导入配置，批处理大小和性能参数
6. **import-test.js** - 测试脚本，完整性和性能测试

### 4.2 文档文件（4个）

1. **GRAPH_IMPORT_ARCHITECTURE.md** - 导入系统架构（>5000字）
2. **GRAPH_IMPORT_MANUAL.md** - 导入操作手册（>3000字）
3. **GRAPH_IMPORT_REPORT.md** - 导入执行报告模板
4. **ENTITY_MAPPING_TABLE.md** - 实体映射表和别名表

### 4.3 使用示例

```javascript
// 完整导入
const importer = new GraphImporter(window.KnowledgeGraph);
await importer.importFromDirectory('F:/AI工作台/04_数控知识库', {
  batchSize: 1000,
  filterLowQuality: true,
  mergeDuplicates: true,
  enableProgress: true
});

// 仅导入特定目录
await importer.importFromDirectory('F:/AI工作台/04_数控知识库/01_编程基础', {
  entityTypes: ['gcode', 'mcode', 'concept']
});

// 生成统计报告
const report = await importer.generateReport();
```

---

## 五、特别要求

### 5.1 考证题库处理

**问题**：`06_考证职业`目录包含40,439个文件（占95%），大多是简单题目。

**要求**：
- 识别题库文件（文件名包含"题库_"）
- 提取题目类型和考点
- 按考点分组，创建"考点"节点
- 不要为每个题目创建独立节点

### 5.2 深度文件优先

**要求**：
- 优先处理深度文件（>14KB）
- 深度文件标记为"权威来源"
- 深度文件的实体权重更高

### 5.3 性能标准

- 42K文件导入时间 < 10分钟（目标）
- 内存使用 < 2GB
- 单次查询响应 < 100ms
- 推荐计算 < 500ms

---

## 六、验收标准

完成以下所有项才算任务完成：

**代码验收**：
- [ ] 6个JavaScript文件已创建
- [ ] 所有文件语法正确
- [ ] 所有类和方法实现完整
- [ ] 包含详细注释

**功能验收**：
- [ ] 能成功导入至少1000个文件（测试集）
- [ ] 能识别G代码、M代码、刀具、机床等实体
- [ ] 能建立正确的实体关系
- [ ] 能生成导入报告
- [ ] 能在浏览器控制台运行

**性能验收**：
- [ ] 1000个文件导入时间 < 30秒
- [ ] 内存使用合理（无明显泄漏）
- [ ] IndexedDB持久化成功

**文档验收**：
- [ ] 4个Markdown文档已创建
- [ ] 架构文档详细清晰
- [ ] 操作手册可直接使用
- [ ] 包含完整使用示例

---

## 七、参考资料

### 7.1 知识图谱引擎（已实现）

位置：`F:/AI工作台/cnc_param_quickfinder/KnowledgeGraph.js`

```javascript
class KnowledgeGraph {
  addNode(nodeData) {
    // nodeData: {id, type, name, properties, tags}
  }
  
  addEdge(edgeData) {
    // edgeData: {from, to, type, weight, properties}
  }
  
  queryNodes(filters, limit, offset) {}
  getRelated(nodeId, relationType, direction, limit) {}
  traverse(startId, relationTypes, direction, maxDepth) {}
  recommend(basedOnNodeId, limit) {}
  
  async saveToIndexedDB() {}
  async loadFromIndexedDB() {}
}
```

### 7.2 建议的实体类型

- `gcode` - G代码
- `mcode` - M代码
- `tool` - 刀具
- `machine` - 机床
- `material` - 材料
- `process` - 工艺
- `concept` - 概念
- `brand` - 品牌
- `parameter` - 参数
- `case` - 案例
- `problem` - 问题/故障
- `exam` - 考点

### 7.3 建议的关系类型

- `requires` - 前置要求
- `related_to` - 相关概念
- `part_of` - 包含关系
- `used_in` - 应用场景
- `replaces` - 替代关系
- `compared_with` - 对比关系
- `depends_on` - 依赖关系
- `causes` - 因果关系
- `tests` - 考核关系

---

## 八、最终输出清单

完成后，你应该提供：

**代码文件（6个）**：
1. graph-importer.js
2. entity-extractor.js
3. relationship-builder.js
4. data-cleaner.js
5. import-config.js
6. import-test.js

**文档文件（4个）**：
1. GRAPH_IMPORT_ARCHITECTURE.md
2. GRAPH_IMPORT_MANUAL.md
3. GRAPH_IMPORT_REPORT.md
4. ENTITY_MAPPING_TABLE.md

**使用示例（1个）**：
1. graph-import-example.html

---

## 九、协作说明

完成后，1号（Claude Code）将：
1. 验证你的代码
2. 集成到软件中
3. 在浏览器中测试
4. 执行实际导入
5. 反馈问题和改进建议

**输出方式**：
- 每个文件完整输出
- 使用代码块标记
- 标注文件名
- 代码必须能直接运行（不要伪代码）

---

## 十、任务开始

现在开始执行任务。

请先：
1. **规划阶段** - 说明总体设计思路、模块划分、数据处理流程
2. **实现阶段** - 逐个输出代码文件和文档文件
3. **验证阶段** - 提供测试方法、使用示例、预期结果

---

**任务开始时间**: 等待0号确认  
**任务状态**: 等待开始  

祝顺利完成！这是一个真正复杂、有挑战性的任务。
