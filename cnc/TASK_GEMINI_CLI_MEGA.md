# Gemini CLI - 超大型任务（5小时+）

## 任务目标

对 `F:\AI工作台\04_数控知识库` 中的 42,294 个文件进行深度分析，建立**完整的知识索引与智能推荐系统**。

---

## 核心交付物（7个JSON文件 + 1个报告）

### 1. `knowledge-index-master.json`
**全局知识库索引表**

```json
{
  "version": "1.0",
  "generatedAt": "2026-07-02T18:00:00Z",
  "totalFiles": 42294,
  "totalSize": "77MB",
  "entries": [
    {
      "id": "kb-00001",
      "path": "F:\\AI工作台\\04_数控知识库\\01_编程基础\\知识类_G54工件坐标系设定.md",
      "filename": "知识类_G54工件坐标系设定.md",
      "category": "编程基础",
      "type": "知识类",
      "title": "G54工件坐标系设定",
      "size": 8256,
      "qualityLevel": "medium",
      "keywords": ["G54", "工件坐标系", "对刀", "坐标偏置"],
      "relatedImages": ["gcode-g54-g59-001", "beginner-coordinate-001"],
      "difficulty": "入门",
      "estimatedReadingTime": 5,
      "prerequisites": ["kb-00002", "kb-00003"],
      "nextSteps": ["kb-00004", "kb-00005"],
      "createdDate": "2026-06",
      "summary": "介绍G54工件坐标系的设定方法、对刀流程及注意事项..."
    }
  ]
}
```

**关键字段说明**：
- `id`: 唯一标识（kb-xxxxx）
- `qualityLevel`: 根据文件大小判断（>14KB=high, 4-14KB=medium, <4KB=low）
- `keywords`: 从文件名和内容提取的关键词（5-10个）
- `relatedImages`: 关联的图片ID（从图片映射系统匹配）
- `difficulty`: 难度等级（入门/进阶/高级/专家）
- `prerequisites`: 前置知识点ID列表
- `nextSteps`: 后续推荐学习的知识点ID列表
- `summary`: 200字以内的内容摘要

---

### 2. `knowledge-relationships.json`
**知识点关联关系图谱**

```json
{
  "nodes": [
    {
      "id": "kb-00001",
      "title": "G54工件坐标系设定",
      "category": "编程基础",
      "level": 1,
      "importance": 95
    }
  ],
  "edges": [
    {
      "from": "kb-00001",
      "to": "kb-00004",
      "type": "prerequisite",
      "strength": 0.9
    },
    {
      "from": "kb-00001",
      "to": "kb-00005",
      "type": "related",
      "strength": 0.7
    },
    {
      "from": "kb-00001",
      "to": "kb-00006",
      "type": "nextStep",
      "strength": 0.85
    }
  ]
}
```

**关系类型**：
- `prerequisite`: 前置必学（强依赖）
- `related`: 相关知识（弱关联）
- `nextStep`: 后续推荐（学习路径）
- `advanced`: 进阶版本（难度递进）

**强度计算规则**：
- 关键词重合度
- 同一目录下的文件
- 文件名相似度
- 难度级别差异

---

### 3. `learning-paths.json`
**智能学习路径推荐**

```json
{
  "paths": [
    {
      "id": "path-beginner-programming",
      "title": "数控编程入门路径",
      "difficulty": "入门",
      "estimatedHours": 40,
      "steps": [
        {
          "order": 1,
          "knowledgeId": "kb-00001",
          "title": "机床坐标系认知",
          "mandatory": true,
          "estimatedTime": 2
        },
        {
          "order": 2,
          "knowledgeId": "kb-00002",
          "title": "G54工件坐标系设定",
          "mandatory": true,
          "estimatedTime": 3
        }
      ],
      "prerequisites": [],
      "outcomes": ["能独立完成简单零件编程", "掌握G54-G59坐标系设定"],
      "nextPaths": ["path-advanced-programming", "path-cam-software"]
    }
  ]
}
```

**至少生成10条学习路径**：
1. 数控编程入门路径
2. 车床操作精通路径
3. 铣床加工进阶路径
4. 刀具工艺专家路径
5. 故障诊断维修路径
6. CAM软件应用路径
7. 宏程序编程路径
8. 多轴加工路径
9. 检测质量控制路径
10. 职业考证备考路径

---

### 4. `parameter-quick-reference.json`
**参数速查表（从知识库提取）**

```json
{
  "categories": [
    {
      "category": "切削参数",
      "subcategories": [
        {
          "name": "45钢",
          "tools": [
            {
              "toolType": "硬质合金铣刀",
              "diameter": 10,
              "cuttingSpeed": "80-120 m/min",
              "feedPerTooth": "0.08-0.12 mm/z",
              "depthOfCut": "2-5 mm",
              "note": "使用冷却液",
              "source": "kb-02345"
            }
          ]
        }
      ]
    },
    {
      "category": "G代码参数",
      "items": [
        {
          "code": "G54",
          "name": "工件坐标系1",
          "format": "G54 X_ Y_ Z_",
          "description": "选择第一组工件坐标系",
          "example": "G54 G00 X100 Y50",
          "relatedCodes": ["G55", "G56", "G57", "G58", "G59"],
          "source": "kb-00123"
        }
      ]
    },
    {
      "category": "报警代码",
      "systems": [
        {
          "system": "FANUC",
          "alarms": [
            {
              "code": "090",
              "description": "主轴负载过大",
              "causes": ["切削量过大", "刀具磨损", "转速设置不当"],
              "solutions": ["减小切削深度", "更换刀具", "调整转速参数"],
              "source": "kb-03456"
            }
          ]
        }
      ]
    }
  ]
}
```

**提取内容**：
- 切削参数（不同材料+刀具组合）
- G代码速查（常用G代码详解）
- M代码速查
- 报警代码库（FANUC/西门子/三菱）
- 螺纹参数表
- 刀具规格表

---

### 5. `category-statistics.json`
**分类统计分析**

```json
{
  "categories": [
    {
      "name": "01_编程基础",
      "totalFiles": 471,
      "totalSize": "4.2MB",
      "breakdown": {
        "知识类": 285,
        "教学类": 120,
        "案例类": 45,
        "题库类": 21
      },
      "qualityDistribution": {
        "high": 32,
        "medium": 198,
        "low": 241
      },
      "topKeywords": ["G54", "对刀", "坐标系", "刀补", "G00", "G01"],
      "recommendedStarting": ["kb-00001", "kb-00023", "kb-00045"],
      "averageReadingTime": 6
    }
  ],
  "globalStats": {
    "mostCommonKeywords": [
      { "keyword": "刀具", "count": 8234 },
      { "keyword": "编程", "count": 6789 },
      { "keyword": "加工", "count": 5432 }
    ],
    "fileTypeDistribution": {
      "知识类": 12456,
      "教学类": 8234,
      "案例类": 3456,
      "题库类": 40439
    }
  }
}
```

---

### 6. `search-index.json`
**全文搜索索引**

```json
{
  "index": [
    {
      "keyword": "G54",
      "occurrences": 234,
      "files": [
        {
          "knowledgeId": "kb-00001",
          "title": "G54工件坐标系设定",
          "relevance": 1.0,
          "snippet": "G54是第一组工件坐标系，用于设定工件在机床坐标系中的位置..."
        }
      ]
    }
  ],
  "metadata": {
    "totalKeywords": 8234,
    "indexedFiles": 42294,
    "lastUpdated": "2026-07-02"
  }
}
```

**索引关键词**：
- 所有G代码（G00-G99）
- 所有M代码（M00-M99）
- 常用术语（对刀、刀补、坐标系等）
- 机床品牌（FANUC、西门子、三菱等）
- CAM软件名称
- 材料名称
- 刀具类型

---

### 7. `recommended-content.json`
**智能推荐引擎数据**

```json
{
  "scenarios": [
    {
      "scenario": "用户查看了G54",
      "recommendations": [
        {
          "knowledgeId": "kb-00002",
          "title": "G55-G59工件坐标系",
          "reason": "同类知识扩展",
          "priority": 0.9
        },
        {
          "knowledgeId": "kb-00123",
          "title": "对刀操作流程",
          "reason": "实操应用",
          "priority": 0.85
        }
      ]
    },
    {
      "scenario": "用户收藏了5个刀具相关知识点",
      "recommendations": [
        {
          "pathId": "path-tool-expert",
          "title": "刀具工艺专家路径",
          "reason": "用户兴趣匹配",
          "priority": 0.95
        }
      ]
    }
  ]
}
```

---

### 8. `KNOWLEDGE_SYSTEM_REPORT.md`
**完整分析报告**

包含：
1. 总体统计（文件数、大小、分类分布）
2. 质量评估（高/中/低质量文件数量及占比）
3. 知识覆盖度分析（哪些领域内容丰富，哪些薄弱）
4. 学习路径建议（基于文件分布推荐的学习顺序）
5. 数据质量问题（重复文件、命名不规范、空文件等）
6. 优化建议（如何补充、如何整理）

---

## 执行要求

### 阶段1：文件扫描与元数据提取（1.5小时）
1. 遍历所有 42,294 个文件
2. 提取文件名、路径、大小、修改日期
3. 根据命名规范识别类型（知识类、教学、案例、题库）
4. 判断质量等级（根据文件大小）
5. 生成初步的 `knowledge-index-master.json`

### 阶段2：内容分析与关键词提取（1.5小时）
1. 读取所有深度文件（>14KB）的内容
2. 读取部分中等文件（4-14KB）的内容（至少1000个）
3. 提取关键词（从文件名和内容）
4. 识别G代码、M代码、参数、品牌等结构化信息
5. 建立关键词索引 `search-index.json`

### 阶段3：关联关系建立（1小时）
1. 根据关键词重合度建立文件间关联
2. 根据目录结构建立层级关系
3. 识别前置知识和后续知识
4. 生成 `knowledge-relationships.json`

### 阶段4：学习路径与推荐系统（1小时）
1. 设计10条学习路径
2. 每条路径包含10-20个知识点
3. 设定难度级别和预计学习时间
4. 生成 `learning-paths.json` 和 `recommended-content.json`

### 阶段5：参数提取与统计分析（30分钟）
1. 从文件中提取结构化参数
2. 生成 `parameter-quick-reference.json`
3. 统计分析生成 `category-statistics.json`
4. 编写完整报告 `KNOWLEDGE_SYSTEM_REPORT.md`

---

## 技术要求

1. **大规模文件处理**：使用高效的文件遍历和批处理
2. **编码处理**：正确处理中文文件名和内容（UTF-8）
3. **错误容忍**：部分文件读取失败不应中断整个流程
4. **增量处理**：如果任务中断，应能从断点继续
5. **内存管理**：不要一次性加载所有文件到内存

---

## 质量标准

1. ✅ 所有42,294个文件都被扫描并记录
2. ✅ 至少1000个文件有内容摘要
3. ✅ 至少5000个知识点建立了关联关系
4. ✅ 10条学习路径完整且合理
5. ✅ 参数速查表包含至少100条实用数据
6. ✅ 搜索索引覆盖至少500个关键词
7. ✅ 所有JSON文件格式正确、可解析
8. ✅ 报告详实、有数据支撑

---

## 输出文件位置

所有文件输出到：`F:\AI工作台\cnc_param_quickfinder\`

文件清单：
- `knowledge-index-master.json`
- `knowledge-relationships.json`
- `learning-paths.json`
- `parameter-quick-reference.json`
- `category-statistics.json`
- `search-index.json`
- `recommended-content.json`
- `KNOWLEDGE_SYSTEM_REPORT.md`

---

## 预计工作量

**总计：5-6小时**

这是一个需要深度分析42K+文件的超大型任务。慢慢做，做完整，做专业。

---

*任务发起人：Kiro (Claude Opus 4.7)*  
*任务类型：超大型数据分析与索引构建*  
*预计时间：5-6小时*  
*优先级：高*
