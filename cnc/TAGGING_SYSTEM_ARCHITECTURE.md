# 智能标签与分类系统 — 架构设计

> 文档版本: 1.0  
> 对应代码: tagging-config.js, tagging-system.js, tagging-algorithms.js  
> 覆盖内容: 系统架构、7 维标签体系、标签管理流程、存储设计

---

## 一、系统概述

智能标签与分类系统（Tagging System）为 CNC Param QuickFinder 的 42,294 个知识文件建立多维度、可计算、可推理的标签元数据体系。系统从 7 个维度描述每个知识文件，使搜索、推荐、分类、导航具备智能特性。

### 1.1 解决的核心问题

| 问题 | 现状 | 改造后 |
|------|------|--------|
| 文件无统一标签 | 仅有目录分类，无结构化标签 | 7 维度标签全覆盖 |
| 搜索结果无法排序 | 简单文本匹配，无质量/热度排序 | 5 因子加权排序 |
| 无个性化推荐 | 无法根据用户行为推荐内容 | 4 策略融合推荐 |
| 难度不可知 | 新手老手都看到相同内容 | 自动难度评估 + 适配 |
| 缺乏内容关联 | 知识图谱关系稀疏 | 标签相似度 + 内容相关度 |

### 1.2 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    用户交互层 (UI)                           │
│  搜索界面  导航分类  推荐模块  标签管理  个人中心            │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   标签服务层 (API)                           │
│  tagFile()  search()  recommend()  getRelated()  classify() │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                算法引擎层 (Algorithms)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │自动分类  │ │相关度计算│ │难度评估  │ │推荐排序       │   │
│  │关键词匹配│ │Jaccard   │ │术语密度  │ │协同过滤       │   │
│  │路径推断  │ │TF-IDF    │ │文件长度  │ │内容推荐       │   │
│  │内容分析  │ │余弦相似  │ │代码复杂度│ │热度排序       │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                 数据层 (Storage)                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │标签索引表│ │文件标签表│ │关键词词典│ │用户画像表     │   │
│  │IndexedDB│ │IndexedDB│ │内存     │ │LocalStorage   │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 模块划分

| 模块 | 文件 | 职责 |
|------|------|------|
| 配置层 | tagging-config.js | 标签定义、关键词词典、权重配置、阈值 |
| 核心系统 | tagging-system.js | 标签 CRUD、自动分类、查询接口、标签管理 |
| 算法库 | tagging-algorithms.js | 相关度计算、难度评估、推荐算法、搜索排序 |

---

## 二、7 维标签体系

每个知识文件被赋予 7 个维度的标签，每个维度取值独立。标签以数组形式存储在文件元数据中，是后续所有算法的基础。

### 2.1 维度总览

| 维度 | 名称 | 取值数 | 说明 | 赋值方式 |
|------|------|--------|------|----------|
| D1 | 内容类型 | 8 主类+28 子类 | 知识内容的具体分类 | 自动(关键词+路径) + 手动修正 |
| D2 | 难度级别 | 5 级 | 内容学习的难度 | 自动(5 指标加权) + 手动调整 |
| D3 | 机床类型 | 7 类 | 适用的机床 | 自动(关键词匹配) |
| D4 | 材料类型 | 9 类 | 涉及的材料 | 自动(关键词匹配) |
| D5 | 系统品牌 | 7 类 | 涉及的数控系统 | 自动(关键词匹配) |
| D6 | 知识属性 | 7 类 | 知识的功能属性 | 自动+规则判定 |
| D7 | 时间属性 | 4 类 | 时间相关的标签 | 基于时间自动计算 |

### 2.2 维度1: 内容类型 (Content Type)

8 个一级分类，每个有 3-5 个二级分类，共 28 个叶子节点：

```
编程 (programming) #e74c3c
├── G代码 (gcode)          — G00-G99 代码详解
├── M代码 (mcode)          — M00-M99 代码详解
├── 宏程序 (macro)         — 变量、循环、宏调用
├── 固定循环 (cycle)       — G81-G89 标准循环
└── 编程技巧 (technique)   — 刀路优化、走刀策略

操作 (operation) #e67e22
├── 对刀 (setup)           — 对刀、寻边、分中
├── 机床操作 (operation)    — 开关机、MDI、DNC
├── 换刀 (toolchange)      — 刀库、刀臂、换刀
└── 维护保养 (maintain)    — 润滑、保养、精度检测

工艺 (process) #1abc9c
├── 切削参数 (cutting)     — Vc、F、ap 参数
├── 刀具选择 (tool_select) — 刀具类型、涂层
└── 工艺路线 (route)       — 工序、粗精加工

CAM (cam) #3498db
├── UG_NX (ug)             — Siemens NX 编程
├── Mastercam (mastercam)  — Mastercam 编程
├── PowerMill (powermill)  — PowerMill 编程
└── Fusion360 (fusion360)  — Fusion360 编程

维修 (repair) #e53935
├── 报警代码 (alarm)       — 报警代码查询
├── 故障诊断 (diagnosis)   — 故障分析排查
└── 维修案例 (repair_case) — 维修经验记录

质量 (quality) #9b59b6
├── 检测方法 (inspection)  — 测量、检验方法
├── 质量控制 (control)     — SPC、Cp/Cpk
└── 精度分析 (tolerance)   — 公差、形位公差

理论 (theory) #00bcd4
├── 基础理论 (foundation)  — 数控原理、插补
├── 原理解析 (math)        — 算法、数学模型
└── 标准规范 (standard)    — ISO、GB 标准

案例 (case) #e91e63
├── 加工案例 (case_machining) — 实际加工案例
├── 项目经验 (case_project)    — 技术方案、项目
└── 生产技巧 (case_skill)      — 经验、技巧
```

文件可同时属于多个二级分类（如含 G 代码的加工案例 = gcode + case_machining）。

### 2.3 维度2: 难度级别 (Difficulty Level)

5 个难度级别，从入门到专家：

| 级别 | ID | 分值 | 色值 | 判定标准 |
|------|----|------|------|----------|
| 入门 | beginner | 1 | #4caf50 | 零基础可学，术语密度<3%，无代码或≤3行代码，文件<2KB |
| 初级 | elementary | 2 | #8bc34a | 有基本概念，术语密度<6%，代码≤8行，文件2-4KB |
| 中级 | intermediate | 3 | #ffc107 | 需实操经验，术语密度<10%，代码≤15行，有公式 |
| 高级 | advanced | 4 | #ff9800 | 需精通原理，术语密度<15%，复杂代码，多公式 |
| 专家 | expert | 5 | #f44336 | 行业专家级别，术语密度≥20%，大量代码和公式 |

综合评分由 5 个指标加权计算：

```
难度评分 = 术语密度×0.25 + 文件大小评分×0.15 + 代码行数评分×0.20 + 
           公式数量评分×0.15 + 前置知识评分×0.25
```

### 2.4 维度3: 机床类型 (Machine Type)

| ID | 名称 | 关键词示例 |
|----|------|------------|
| milling | 加工中心 | 加工中心, 铣床, 立式, 卧式, 五轴, 龙门铣 |
| lathe | 车床 | 车床, 数控车, 车削中心, 走心机, 斜床身 |
| mill_turn | 车铣复合 | 车铣复合, 复合加工, B轴, Y轴, 动力刀塔 |
| grinder | 磨床 | 磨床, 磨削, 平面磨, 外圆磨, 内圆磨 |
| edm_wire | 线切割 | 线切割, 快走丝, 慢走丝, 中走丝 |
| edm | 电火花 | 电火花, EDM, 放电加工, 电脉冲 |
| general | 通用 | 数控机床, 通用, 各类机床 |

### 2.5 维度4: 材料类型 (Material Type)

| ID | 名称 | 关键词/牌号示例 |
|----|------|------------------|
| aluminum | 铝合金 | 6061, 7075, 5052, ADC12, A356 |
| stainless | 不锈钢 | 304, 316, 316L, 2205, sus304 |
| steel | 碳钢 | 45钢, Q235, 40Cr, 42CrMo, SKD11 |
| titanium | 钛合金 | TC4, Ti6Al4V, TA2, TA15 |
| cast_iron | 铸铁 | HT200, HT250, QT500 |
| copper | 铜合金 | 黄铜, 青铜, 紫铜, 铍铜 |
| plastic | 塑料 | POM, PEEK, PC, ABS, 尼龙 |
| composite | 复合材料 | 碳纤维, 玻璃纤维, CFRP |
| general | 通用材料 | 通用, 多种材料 |

### 2.6 维度5: 系统品牌 (System Brand)

| ID | 名称 | 关键词/型号 |
|----|------|-------------|
| fanuc | FANUC | FANUC, 发那科, 0i, 30i, 31i |
| siemens | SIEMENS | Siemens, 西门子, Sinumerik, 828D, 840D |
| mitsubishi | MITSUBISHI | 三菱, M70, M80, E68 |
| haas | HAAS | Haas, 哈斯, VF系列 |
| mazak | MAZAK | Mazak, 马扎克, Mazatrol |
| heidenhain | HEIDENHAIN | Heidenhain, 海德汉, TNC640 |
| general | 通用系统 | 通用, 不限系统 |

### 2.7 维度6: 知识属性 (Knowledge Attribute)

| ID | 名称 | 说明 | 判定规则 |
|----|------|------|----------|
| must_learn | 必修 | 新手必须掌握 | 文件含"基础""必修"关键词或>3关基础路径 |
| frequent | 高频 | 日常频繁使用 | 30天内访问量前20%或收藏数>10 |
| advanced | 进阶 | 提升技能 | 难度≥中级且含进阶关键词 |
| special | 专项 | 特定场景 | 机床/材料维度非"通用"且范围窄 |
| safety | 安全 | 涉及安全 | 含"安全""警告""危险"关键词 |
| pitfall | 避坑 | 易错提醒 | 含"误区""易错""常见错误"关键词 |
| handson | 实战 | 实战经验 | 含"实战""案例""经验"关键词 |

### 2.8 维度7: 时间属性 (Time Attribute)

| ID | 名称 | 判定规则 |
|----|------|----------|
| new | 最新 | 创建/更新日期在30天内 |
| hot | 热门 | 7天内访问量排名前20% |
| classic | 经典 | 总访问量排名前10%且更新时间<1年 |
| outdated | 待更新 | 更新时间超过1年且无人维护 |

---

## 三、标签管理流程

### 3.1 标签生成流程

每个文件的标签生成分为三个阶段：

```
文件入库 → 自动打标 (全自动) → 用户反馈修正 (半自动) → 存储

自动打标流程:
  1. 读取文件内容和元数据
  2. 扫描关键词词表 (匹配所有维度)
  3. 计算匹配度和置信度
  4. 对每个维度输出候选标签
  5. 应用规则过滤 (互斥/优先级)
  6. 存储到标签索引表

用户反馈修正:
  1. 用户手动添加标签
  2. 用户标记错误标签
  3. 系统根据反馈调整权重
  4. 定期批量重新计算
```

### 3.2 标签优先级规则

当多个标签在同一维度下冲突时：

1. **内容类型**: 关键词匹配数最多 > 路径匹配 > 文件名匹配
2. **难度级别**: 综合评分最高的一级（如果接近临界值则取低一级，宁低勿高）
3. **机床/材料/品牌**: 如果有专用标签（非"通用"），则专用标签覆盖通用
4. **知识属性**: 可叠加，只要满足条件就添加
5. **时间属性**: new 和 hot 可共存，outdated 与其他互斥

### 3.3 标签置信度

每个标签附带 0-1 的置信度分数，表示该标签的可信程度：

```
自动关键词匹配 (直接匹配): 置信度 0.8
路径推断: 置信度 0.6
文件名推断: 置信度 0.5
全文模糊匹配: 置信度 0.3
用户手动添加: 置信度 0.9
用户反馈确认: 置信度 1.0
```

---

## 四、搜索排序架构

搜索时，系统结合 5 个因子计算最终排序分：

```
排序分 = 关键词匹配×0.40 + 内容质量×0.20 + 热度×0.15 + 
         时效性×0.10 + 个性化匹配×0.15
```

### 4.1 关键词匹配 (40%)

```
标题完全匹配: +10 分
标题部分匹配: +5 分  
标签完全匹配: +8 分
标签部分匹配: +4 分
正文匹配: +2 分/次
路径匹配: +3 分
```

### 4.2 内容质量 (20%)

```
深度文件 (>14KB): 1.0
中等文件 (4-14KB): 0.7
基础文件 (<4KB): 0.4
有代码示例: +0.2
有表格/参数: +0.15
有图片: +0.1
```

### 4.3 热度 (15%)

```
7天访问次数 / 最高 7天访问次数 * 100
```

### 4.4 时效性 (10%)

```
30天内: 1.0
90天内: 0.7
半年内: 0.5
一年内: 0.3
超过一年: 0.1
```

### 4.5 个性化 (15%)

```
用户兴趣标签与文件标签的 Jaccard 相似度
用户难度偏好与文件难度级别的匹配度
```

---

## 五、推荐算法架构

推荐引擎融合 4 种策略：

```
推荐分 = 协同过滤×0.30 + 基于内容×0.35 + 
         热门推荐×0.15 + 难度适配×0.20
```

### 5.1 协同过滤

寻找与当前用户相似度最高的 Top-10 用户，推荐他们喜欢的但当前用户未查看的内容：

```
用户相似度 = Jaccard(用户A标签集, 用户B标签集)
```

### 5.2 基于内容

根据用户最近查看/收藏的内容标签，推荐标签相似度高的其他内容：

```
内容相似度 = 0.4×标签相似度 + 0.3×内容相似度 + 0.15×难度相似度 + 0.15×分类相似度
```

### 5.3 热门推荐

推荐近期访问量前 20 的内容，结合用户兴趣标签过滤（去掉不感兴趣的标签内容）。

### 5.4 难度适配

根据用户浏览历史推断其技能水平，推荐难度级别匹配的内容（入门用户推荐入门-初级，高级用户推荐中高级）。

---

## 六、系统接口总览

### 6.1 标签操作接口

| 方法 | 用途 | 参数 | 返回 |
|------|------|------|------|
| tagFile(fileId, tags) | 为文件添加标签 | fileId, tags对象 | {success, tagCount} |
| getFileTags(fileId) | 获取文件标签 | fileId | {tags对象} |
| removeTag(fileId, dimension) | 移除标签 | fileId, dimension | {success} |
| updateTagConfidence(fileId, tagId, confidence) | 更新置信度 | fileId, tagId, confidence | {success} |
| getFilesByTag(dimension, value) | 按标签查找文件 | dimension, value | fileId数组 |
| getAllTagStats() | 标签统计 | — | {各维度统计} |

### 6.2 搜索接口

| 方法 | 用途 | 参数 | 返回 |
|------|------|------|------|
| search(keyword, options) | 搜索带排序 | keyword, filters, sort | {results, total, time} |
| getSuggestions(keyword) | 搜索建议 | keyword | {suggestions} |
| searchByTags(tagFilters) | 标签组合搜索 | tagFilters对象 | {results} |

### 6.3 推荐接口

| 方法 | 用途 | 参数 | 返回 |
|------|------|------|------|
| getRecommendations(userId, limit) | 获取推荐 | userId, limit | {recommendations} |
| getRelatedFiles(fileId, limit) | 相关文件 | fileId, limit | {relatedList} |
| getUserProfile(userId) | 获取用户画像 | userId | {profile} |

### 6.4 算法接口

| 方法 | 用途 | 参数 | 返回 |
|------|------|------|------|
| autoClassify(fileContent, metadata) | 自动分类 | content, {path, size, name} | {tags, confidence} |
| assessDifficulty(fileContent, metadata) | 难度评估 | content, metadata | {level, score} |
| computeRelevance(fileAId, fileBId) | 相关度 | fileAId, fileBId | {score} |

---

## 七、存储设计概要

### 7.1 标签索引表 (IndexedDB)

```
store: file_tags
key: fileId
value: {
  fileId: string,
  contentCategory: [categoryId...],
  difficulty: { level, score },
  machineType: [machineId...],
  materialType: [materialId...],
  systemBrand: [brandId...],
  knowledgeAttributes: [attrId...],
  timeAttributes: [timeAttrId...],
  customTags: [string...],
  lastUpdated: timestamp,
  confidence: number
}

store: tag_index
key: [dimension, value]
value: Set<fileId>

store: keyword_cache
key: keyword
value: [dimension, category, weight]
```

### 7.2 用户画像表 (LocalStorage)

```
key: cnc_user_profile
value: {
  userId: 'local',
  viewedHistory: [{fileId, timestamp}],
  searchHistory: [{keyword, timestamp}],
  favorites: [fileId...],
  interestTags: [tag...],  // 自动推断的兴趣
  skillLevel: difficulty,   // 推断的技能水平
  preferredMachine: [machine...],
  preferredBrand: [brand...]
}
```

---

## 八、与现有系统的集成

### 8.1 加载顺序

```
1. KnowledgeGraph.js (图谱引擎)
2. import-config.js (导入配置)
3. tagging-config.js (标签配置) ← 本系统
4. tagging-system.js (标签系统) ← 本系统
5. tagging-algorithms.js (算法库) ← 本系统
6. graph-importer.js (导入器)
7. import-test.js (测试)
```

### 8.2 与知识图谱的关系

- 标签系统不替代知识图谱，而是为其提供元数据
- 文件节点在知识图谱中的 `properties.tags` 字段存储标签数据
- 标签系统搜索优先使用标签索引（更快），再回退到图谱查询
- 推荐算法使用标签数据 + 图谱关系数据

### 8.3 与搜索的关系

- 搜索使用标签系统的 5 因子排序算法替代简单的文本匹配
- 搜索词先用标签系统的 suggest API 获取联想建议
- 搜索结果按排序分降序排列

---

## 总结

本智能标签系统从 7 个维度（内容类型、难度、机床、材料、品牌、属性、时间）为 42K 知识文件建立统一的标签元数据。系统包含自动分类算法（基于关键词词典和规则）、相关度计算（Jaccard + TF-IDF 混合）、难度评估（5 指标加权）、推荐引擎（4 策略融合）和搜索排序（5 因子加权）。标签数据存储在 IndexedDB 的标签索引表中，支持毫秒级查询。
