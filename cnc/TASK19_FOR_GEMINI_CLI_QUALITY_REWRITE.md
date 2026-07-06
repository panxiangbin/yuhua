# Gemini CLI 超长任务 05

你上一轮的 7 个详情体验数据包，**结构层是通过的**：

- 文件都生成了
- 数量都达标
- 字段都齐全
- 关联 ID 也都是真实存在

但是这一轮**不能算完全通过**，原因不是结构，而是**内容质量问题**。

---

## 已经实测确认的问题

### 问题 1：`entry-teaching-cards.json` 存在大规模模板灌水

真实验证结果：

- 共 850 条
- 其中有一组几乎完全相同的内容模板，重复了 **742 条**

这说明：

- 你虽然满足了“数量”
- 但没有真正满足“产品可用”
- 前端接进去以后会显得像批量凑数，而不是教学增强层

---

### 问题 2：很多卡片没有真正贴合具体知识点

例如现在出现了大量这种情况：

- `beginnerSummary` 只是泛泛说“这是一个数控核心知识点”
- `whyItMatters` 只是泛泛说“这是编程基础”
- `commonMistake` 还是通用错误，不是当前知识点特有的错误
- `quickCheck` 没有贴合当前条目本身

这类内容不能直接上前端详情页。

---

### 问题 3：详情页增强层还不够“前端可消费”

目前虽然结构上可读，但还缺少两类真正有产品价值的东西：

1. **高价值条目必须更具体**
2. **字段格式要更适合前端统一渲染**

特别是：

- `relatedImageIds` 现在放的是对象数组，不够轻量
- 有些 `searchAliases` 质量偏低，像截断字符串
- 一些 `nextLearningIds` 过于固定，像批量复制

---

## 这一轮只做一件事

**不要继续扩数量。只做“高质量重写 + 前端规范化”。**

也就是说：

- 不追求把 850 变成更多
- 不追求再加新包
- 就把最重要的那些内容修到真的可用

---

## 你必须一次性完成的 6 个交付

### 1. 重写 `entry-teaching-cards.json`

要求：

- 保持总量仍然 **不少于 850 条**
- 但必须重写其中**至少 300 条高价值条目**
- 这些重写条目必须做到真正贴合具体知识点

优先重写类别：

- G代码 / M代码核心条目
- 对刀 / 坐标 / 回零 / 补偿
- 报警 / 故障 / 参数
- 刀具 / 工艺 / 材料
- 测量 / 图纸 / 量具
- CAM 核心操作

优先重写对象：

- 搜索高频
- 首页高优先
- 学习包里出现的知识点
- 图文专题里出现的知识点
- 报警流里出现的知识点
- priority 高的知识点

### 具体质量要求

对于重写后的高价值条目：

- `beginnerSummary` 必须具体，不许再写“这是一个核心知识点”这种空话
- `whyItMatters` 必须说出真实后果或真实价值
- `whenToUse` 必须明确到场景
- `commonMistake` 必须是这个条目特有或高度相关的错误
- `quickCheck` 必须是用户现在就能做的检查动作

### 格式要求

保留原字段：

- `id`
- `title`
- `category`
- `beginnerSummary`
- `whyItMatters`
- `whenToUse`
- `commonMistake`
- `quickCheck`
- `relatedEntryIds`
- `relatedImageIds`
- `nextLearningIds`
- `searchAliases`

但要补一项新字段：

- `qualityTier`

可选值：

- `core_rewritten`
- `standard`

说明：

- 至少 300 条为 `core_rewritten`
- 其余可保留 `standard`

---

### 2. 新增 `entry-teaching-cards-core.json`

用途：

- 给前端先接“高质量核心教学卡”
- 避免一下子把 850 条全上

要求：

- 从 `entry-teaching-cards.json` 中抽出 **300 条高质量核心条目**
- 这些条目必须全部是 `qualityTier = core_rewritten`

字段和主文件保持一致。

---

### 3. 新增 `detail-render-priority.json`

用途：

- 给前端决定“哪些详情页值得优先加载教学增强卡”

要求：

- 至少覆盖 **500 个知识点**
- 优先收录：
  - 首页入口涉及条目
  - 学习包条目
  - 图文专题条目
  - 计算器联动条目
  - 报警流相关条目

每条至少包含：

- `id`
- `title`
- `priorityLevel`
- `renderReason`
- `preferredCardSet`

说明：

- `priorityLevel` 可用：
  - `p0`
  - `p1`
  - `p2`
- `preferredCardSet` 可用：
  - `core`
  - `full`

---

### 4. 规范化 `searchAliases`

要求：

- 在重写后的高价值条目中，`searchAliases` 不能再出现明显截断词
- 每条至少提供 3 到 8 个真正有检索价值的别名

优先包括：

- 原始写法
- 常见口语叫法
- 常见系统写法
- 常见错误搜索词

例如：

- `G41`
- `刀补`
- `半径补偿`
- `左补`
- `刀具补偿`

---

### 5. 规范化 `relatedImageIds`

现在的问题是：

- 有些条目里放的是整对象，不够轻量

这一轮要求：

- 把主文件 `entry-teaching-cards.json` 的 `relatedImageIds` 改成轻量结构
- 统一改成**字符串数组**

例如：

- `["beginner-coordinate-001", "gcode-g00-g01-001"]`

如果确实无法给图片 ID，就给稳定的图片键名，不要再放大对象。

---

### 6. 新增 `GEMINI_QUALITY_REWRITE_REPORT.md`

必须写清楚：

1. 重写了多少条高价值教学卡
2. 哪些类别被重点重写
3. `entry-teaching-cards-core.json` 抽出了多少条
4. `detail-render-priority.json` 覆盖了多少知识点
5. `searchAliases` 做了什么规范化
6. `relatedImageIds` 如何改成轻量结构
7. 这轮之后还有哪些质量缺口

---

## 严格要求

### 严格要求 1

不要再靠模板重复凑数量。

### 严格要求 2

不要新增新的大而全数据包。

### 严格要求 3

这一轮重点是“把能上前端的高价值核心区修到像样”。

### 严格要求 4

保留与现有系统的真实 ID 联动，不允许造假 ID。

### 严格要求 5

重写必须明显更具体，不能只比原来多几个字。

---

## 完成标准

只有同时满足以下条件才算完成：

- `entry-teaching-cards.json` 仍不少于 850 条
- 至少 300 条标记为 `qualityTier = core_rewritten`
- `entry-teaching-cards-core.json` 已生成，至少 300 条
- `detail-render-priority.json` 已生成，至少 500 条
- 重写后的高价值条目不再大规模使用同一套模板文案
- `relatedImageIds` 已统一为字符串数组
- `GEMINI_QUALITY_REWRITE_REPORT.md` 已生成

