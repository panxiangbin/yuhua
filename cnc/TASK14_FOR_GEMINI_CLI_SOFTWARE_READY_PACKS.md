# Gemini CLI 一次性长任务 02

你上一轮已经把知识库索引、目录树、搜索索引、推荐内容、学习路径、参数速查等基础数据补到了可用状态。

这一轮不要重复扫 4 万文件，不要重新生成同一批基础文件。

你这轮只做一件事：

**把现有知识库进一步整理成“前端软件直接可用的精选数据包”。**

目标不是再做底层索引，而是做：

- 首页启动台数据
- 新手学习入口数据
- 图文专题入口数据
- 热门速查入口数据
- 报警排查流程数据
- 对刀/坐标/补偿等专题卡片数据
- 哪些知识点还缺专属图片的数据规划

项目目录：

`F:\AI工作台\cnc_param_quickfinder\`

可直接使用的现有输入：

- `knowledge-index-master.json`
- `knowledge-relationships.json`
- `learning-paths.json`
- `parameter-quick-reference.json`
- `category-statistics.json`
- `search-index.json`
- `recommended-content.json`
- `knowledge-tree.json`
- `featured-images.js`
- `featured-images-extended.js`
- `featured-images-part2.js`
- `featured-images-supplement.js`
- `gallery-library-enhanced.js`
- `entry-to-images-map.js`

---

## 这一轮的核心目标

把“海量知识库”进一步整理成“软件首页和工作区可直接消费的数据层”。

也就是说：

- 不只是“能搜到”
- 而是“能直接拿来做入口、做推荐、做图文卡片、做专题页”

---

## 你必须一次性完成的 8 个交付

### 1. `dashboard-launch-pads.json`

用途：

- 首页软件启动台数据

要求：

- 输出 12-24 个首页主入口卡片
- 每个入口必须明确区分：
  - 新手先学
  - 热门速查
  - 图文专题
  - 参数换算
  - 报警排查
  - 资料树入口
  - CAM 软件
  - 刀具工艺

每个卡片至少包含：

- `id`
- `title`
- `subtitle`
- `description`
- `type`
- `priority`
- `entryIds`
- `imageHint`
- `recommendedView`

---

### 2. `beginner-study-packs.json`

用途：

- 新手专区 / 学习路线区

要求：

- 至少做 12 组新手学习包
- 每组不是单条知识点，而是一个“能连续学”的小专题

优先专题：

- 坐标系
- 回零
- 对刀
- G00/G01
- G02/G03
- G54-G59
- G41/G42
- G43/G49
- G94/G95
- G81/G83/G84
- 图纸基础
- 量具基础

每个学习包至少包含：

- `id`
- `title`
- `summary`
- `difficulty`
- `estimatedMinutes`
- `entryIds`
- `mustLearnIds`
- `relatedImageIds`
- `nextPackIds`

---

### 3. `visual-topic-clusters.json`

用途：

- 图文专题区 / 只看图专区 / 学习图卡入口

要求：

- 至少做 20 组图文专题簇
- 每组要尽量图像化、直观化

优先方向：

- G代码动作图解
- 对刀步骤图解
- 坐标系图解
- 报警排查图解
- 刀具类型对比
- 材料与刀具搭配
- 常见加工工艺
- 螺纹加工
- 钻孔循环
- 补偿专题

每组至少包含：

- `id`
- `title`
- `coverImage`
- `clusterType`
- `entryIds`
- `imageDriven`
- `description`
- `keywords`

---

### 4. `alarm-diagnosis-flows.json`

用途：

- 报警排查入口 / 故障流程卡

要求：

- 至少做 30 条排查流程
- 不只是报警列表，要做成“先看什么、再看什么”的步骤流

每条流程至少包含：

- `id`
- `title`
- `system`
- `alarmCodes`
- `symptomKeywords`
- `initialChecks`
- `stepFlow`
- `relatedEntryIds`
- `dangerLevel`

---

### 5. `quick-lookup-collections.json`

用途：

- 老手速查入口

要求：

- 至少做 20 组速查集合

优先集合：

- 常用 G代码
- 常用 M代码
- FANUC 常见报警
- 进给与转速
- 螺纹参数
- 刀具规格
- 钻孔循环
- 坐标与偏置
- 对刀速查
- 材料切削建议

每组至少包含：

- `id`
- `title`
- `lookupType`
- `items`
- `entryIds`
- `searchTerms`

---

### 6. `software-recommendation-zones.json`

用途：

- 前端不同区域的推荐内容渲染

要求：

- 至少做 8 个推荐区
- 每个推荐区面向不同使用场景

至少包含这些区：

- 首页推荐
- 新手推荐
- 工作区推荐
- 图文推荐
- 报警推荐
- CAM 推荐
- 刀具工艺推荐
- 最近搜索联动推荐

每个区至少包含：

- `id`
- `title`
- `zoneType`
- `logicDescription`
- `seedEntryIds`
- `fallbackEntryIds`

---

### 7. `image-gap-plan.json`

用途：

- 后续继续补图的精确规划

要求：

- 从现有知识点中找出最该优先补专属图片的条目
- 至少列出 300 条

每条至少包含：

- `knowledgeId`
- `title`
- `category`
- `whyNeedImage`
- `recommendedImageType`
- `priority`
- `suggestedKeywords`

图片类型建议必须细分，例如：

- 动作步骤图
- 结构示意图
- 对比图
- 参数表图
- 故障排查流程图
- 刀具外观图
- 机床面板图

---

### 8. `GEMINI_SOFTWARE_READY_REPORT.md`

这是本轮必须输出的总报告。

必须写清楚：

1. 本轮新增了哪些文件
2. 每个文件给前端带来什么作用
3. 首页数据包有多少入口
4. 新手学习包有多少组
5. 图文专题簇有多少组
6. 报警排查流程有多少条
7. 速查集合有多少组
8. 推荐区有多少个
9. 补图计划列出了多少条缺图知识点
10. 哪些数据可以马上接入前端

---

## 输出要求

### 严格要求 1

不要重新生成已有基础文件，除非确实必须修正。

### 严格要求 2

本轮重点是“精选、产品化、软件化数据包”，不是“大而全底层索引”。

### 严格要求 3

所有输出都必须是真实从现有知识库和现有索引里整理出来的，不要空想结构。

### 严格要求 4

每个 JSON 文件都要可直接给前端读取，不要写成难以消费的散乱格式。

---

## 完成标准

只有同时满足以下条件，才算完成：

- `dashboard-launch-pads.json` 已生成
- `beginner-study-packs.json` 已生成
- `visual-topic-clusters.json` 已生成
- `alarm-diagnosis-flows.json` 已生成
- `quick-lookup-collections.json` 已生成
- `software-recommendation-zones.json` 已生成
- `image-gap-plan.json` 已生成
- `GEMINI_SOFTWARE_READY_REPORT.md` 已生成

