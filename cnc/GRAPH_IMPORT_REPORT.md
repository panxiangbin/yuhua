# 知识图谱数据导入执行报告

> 报告生成时间: {{TIMESTAMP}}  
> 执行环境: {{ENVIRONMENT}}  
> 数据源: F:\AI工作台\04_数控知识库

---

## 一、执行摘要

| 指标 | 值 |
|------|-----|
| 总文件数 | {{totalFiles}} |
| 成功解析 | {{parsedFiles}} |
| 提取实体 | {{extractedEntities}} |
| 构建关系 | {{builtRelations}} |
| 导入节点 | {{importedNodes}} |
| 导入关系 | {{importedEdges}} |
| 去重移除 | {{duplicatesRemoved}} |
| 低质过滤 | {{filteredLow}} |
| 总耗时 | {{elapsedStr}} |
| 错误数 | {{errors}} |

**摘要**: {{summary}}

---

## 二、分阶段耗时

| 阶段 | 耗时 | 占比 |
|------|------|------|
| 文件解析 (parse) | {{phase.parse.elapsed}} | {{phase.parse.percent}} |
| 实体提取 (extract) | {{phase.extract.elapsed}} | {{phase.extract.percent}} |
| 数据清洗 (clean) | {{phase.clean.elapsed}} | {{phase.clean.percent}} |
| 关系构建 (relate) | {{phase.relate.elapsed}} | {{phase.relate.percent}} |
| 图数据库导入 (import) | {{phase.import.elapsed}} | {{phase.import.percent}} |
| IndexedDB 持久化 (persist) | {{phase.persist.elapsed}} | {{phase.persist.percent}} |

---

## 三、实体统计

| 实体类型 | 数量 | 占比 |
|----------|------|------|
| G代码 | {{entityStats.gcode}} | {{entityStats.gcodePct}} |
| M代码 | {{entityStats.mcode}} | {{entityStats.mcodePct}} |
| 刀具 | {{entityStats.tool}} | {{entityStats.toolPct}} |
| 机床 | {{entityStats.machine}} | {{entityStats.machinePct}} |
| 材料 | {{entityStats.material}} | {{entityStats.materialPct}} |
| 工艺 | {{entityStats.process}} | {{entityStats.processPct}} |
| 概念 | {{entityStats.concept}} | {{entityStats.conceptPct}} |
| 参数 | {{entityStats.parameter}} | {{entityStats.parameterPct}} |
| 品牌 | {{entityStats.brand}} | {{entityStats.brandPct}} |
| 案例 | {{entityStats.case}} | {{entityStats.casePct}} |
| 问题/故障 | {{entityStats.problem}} | {{entityStats.problemPct}} |
| 考点 | {{entityStats.exam}} | {{entityStats.examPct}} |
| 分类 | {{entityStats.category}} | {{entityStats.categoryPct}} |
| 知识文件 | {{entityStats.file}} | {{entityStats.filePct}} |

**实体总计**: {{totalEntities}}

---

## 四、关系统计

| 关系类型 | 数量 | 占比 |
|----------|------|------|
| 前置要求 (requires) | {{relationStats.requires}} | {{relationStats.requiresPct}} |
| 相关概念 (related_to) | {{relationStats.related_to}} | {{relationStats.related_toPct}} |
| 包含关系 (part_of) | {{relationStats.part_of}} | {{relationStats.part_ofPct}} |
| 应用场景 (used_in) | {{relationStats.used_in}} | {{relationStats.used_inPct}} |
| 替代关系 (replaces) | {{relationStats.replaces}} | {{relationStats.replacesPct}} |
| 对比关系 (compared_with) | {{relationStats.compared_with}} | {{relationStats.compared_withPct}} |
| 依赖关系 (depends_on) | {{relationStats.depends_on}} | {{relationStats.depends_onPct}} |
| 因果关系 (causes) | {{relationStats.causes}} | {{relationStats.causesPct}} |
| 考核关系 (tests) | {{relationStats.tests}} | {{relationStats.testsPct}} |
| 属于 (belongs_to) | {{relationStats.belongs_to}} | {{relationStats.belongs_toPct}} |
| 引用 (references) | {{relationStats.references}} | {{relationStats.referencesPct}} |
| 示例 (examples) | {{relationStats.examples}} | {{relationStats.examplesPct}} |

**关系总计**: {{totalRelations}}

---

## 五、文件质量分析

| 质量级别 | 数量 | 占比 |
|----------|------|------|
| 深度文件 (>14KB) | {{quality.deep}} | {{quality.deepPct}} |
| 中等文件 (4-14KB) | {{quality.medium}} | {{quality.mediumPct}} |
| 基础文件 (<4KB) | {{quality.basic}} | {{quality.basicPct}} |
| 低质丢弃 | {{quality.trash}} | {{quality.trashPct}} |

---

## 六、目录分布

| 目录 | 文件数 | 实体数 | 关系数 |
|------|--------|--------|--------|
| 01_编程基础 | {{dir.01_编程基础.files}} | {{dir.01_编程基础.entities}} | {{dir.01_编程基础.edges}} |
| 02_机床操作 | {{dir.02_机床操作.files}} | {{dir.02_机床操作.entities}} | {{dir.02_机床操作.edges}} |
| 03_CAM软件 | {{dir.03_CAM软件.files}} | {{dir.03_CAM软件.entities}} | {{dir.03_CAM软件.edges}} |
| 04_刀具工艺 | {{dir.04_刀具工艺.files}} | {{dir.04_刀具工艺.entities}} | {{dir.04_刀具工艺.edges}} |
| 05_故障维修 | {{dir.05_故障维修.files}} | {{dir.05_故障维修.entities}} | {{dir.05_故障维修.edges}} |
| 06_检测质量 | {{dir.06_检测质量.files}} | {{dir.06_检测质量.entities}} | {{dir.06_检测质量.edges}} |
| 06_考证职业 | {{dir.06_考证职业.files}} | {{dir.06_考证职业.entities}} | {{dir.06_考证职业.edges}} |
| 07_行业资讯 | {{dir.07_行业资讯.files}} | {{dir.07_行业资讯.entities}} | {{dir.07_行业资讯.edges}} |
| 08_加工案例 | {{dir.08_加工案例.files}} | {{dir.08_加工案例.entities}} | {{dir.08_加工案例.edges}} |

---

## 七、错误报告

| 序号 | 文件 | 错误类型 | 错误信息 |
|------|------|----------|----------|
{{#errors}}
| {{index}} | {{file}} | {{type}} | {{message}} |
{{/errors}}

**总错误数**: {{totalErrors}}

---

## 八、系统状态

| 项目 | 状态 |
|------|------|
| KnowledgeGraph 引擎 | {{kgStatus}} |
| IndexedDB 持久化 | {{dbStatus}} |
| 图谱节点数 | {{kgNodeCount}} |
| 图谱关系数 | {{kgEdgeCount}} |
| 浏览器 | {{browserInfo}} |
| 可用内存 | {{memoryInfo}} |

---

## 九、优化建议

{{#suggestions}}
- {{suggestion}}
{{/suggestions}}

---

## 十、结论

{{conclusion}}

---

*报告模板 — 使用 importer.generateReport() 生成完整数据后填充*
