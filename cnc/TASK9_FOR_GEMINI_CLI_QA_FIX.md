# Gemini CLI 第二轮任务：修正知识库交付质量并补齐缺项

## 任务背景

昨天你已经产出了一批知识库交付文件，文件已落盘，但经复核后发现这批数据**可以作为第一版基础产物**，**还不能直接接入主站**。

本轮不要重复泛扫，不要重新发明结构。请在现有产物基础上做**修正、补强、补缺**。

项目目录：

`F:\AI工作台\cnc_param_quickfinder\`

知识库目录：

`F:\AI工作台\04_数控知识库\`

现有第一版交付：

- `knowledge-index-master.json`
- `knowledge-relationships.json`
- `learning-paths.json`
- `parameter-quick-reference.json`
- `category-statistics.json`
- `search-index.json`
- `recommended-content.json`
- `KNOWLEDGE_SYSTEM_REPORT.md`

---

## 已复核出的明确问题

### 1. 缺少交付文件

以下文件**没有生成**：

- `knowledge-tree.json`

这是硬缺项，必须补齐。

### 2. 搜索索引明显过薄

当前：

- `search-index.json`
- `metadata.totalKeywords = 223`

对于 4 万+知识节点，这个关键词规模明显不够，不足以支撑主站搜索体验。

### 3. 推荐内容过少

当前：

- `recommended-content.json`
- 只有 `scenarios`
- 场景数非常少，仅够演示，不够实际使用

### 4. 图片关联基本没做起来

当前从 `knowledge-index-master.json` 复核结果：

- 总条目：42294
- `relatedImages` 非空条目数：0

这意味着你虽然输出了字段，但并没有真正完成图片关联。

### 5. 学习依赖过少

当前从 `knowledge-index-master.json` 复核结果：

- 有 `prerequisites` 的条目：42
- 有 `nextSteps` 的条目：72

对于这么大的知识库，这个数量偏低，只能算少量样例，不够支撑学习路径系统。

### 6. 报告内容存在明显不严谨点

`KNOWLEDGE_SYSTEM_REPORT.md` 中存在以下问题：

- 部分统计口径可疑
- 报告末尾存在未展开的模板字符串
- 报告可读性偏“自动生成草稿”，不够正式

### 7. 真实文件总数与旧任务目标数字存在偏差

我本地复核得到：

- 知识库真实文件数：42307
- 知识库总字节数：84393816

你需要在报告里说明：

- 为什么你的索引统计是 42294
- 与 42307 的差额来自什么文件类型或过滤规则

不能回避这个差异。

---

## 本轮任务目标

在**不破坏现有文件结构**的前提下，完成以下 6 项：

1. 生成 `knowledge-tree.json`
2. 重建更可用的 `search-index.json`
3. 扩充 `recommended-content.json`
4. 补做 `relatedImages` 映射
5. 扩大 `prerequisites / nextSteps` 覆盖
6. 重写正式版 `KNOWLEDGE_SYSTEM_REPORT.md`

---

## 具体要求

### A. 生成 `knowledge-tree.json`

输出文件：

`F:\AI工作台\cnc_param_quickfinder\knowledge-tree.json`

要求：

- 采用 4 级目录树结构
- 覆盖主分类、子分类、专题组、知识点
- 每个节点至少包含：
  - `id`
  - `title`
  - `type`
  - `children`
  - `count`
  - `path`
  - `recommendedEntryIds`
- 顶层分类至少要和知识库目录实际结构一致

### B. 重建 `search-index.json`

要求：

- 不要再只有 223 个关键词
- 目标关键词规模至少：
  - `>= 3000` 个可检索关键词
- 每个关键词要支持：
  - 知识点标题命中
  - 文件名命中
  - 别名/G代码/参数号/报警号命中
  - 常见中文叫法命中
- 输出中保留：
  - `keyword`
  - `occurrences`
  - `files`
  - `relevance`
  - `snippet`

额外要求：

- 对 G 代码、M 代码、参数号、报警号、机床系统名、刀具类型做专项增强

### C. 扩充 `recommended-content.json`

要求：

- 不要只做 2 个演示场景
- 至少输出：
  - `>= 80` 个用户场景
- 每个场景至少带：
  - `scenario`
  - `entryTriggers`
  - `recommendations`
  - `reason`
  - `priority`

重点场景：

- 新手学习
- G代码延伸阅读
- 报警排查
- 对刀与坐标
- 刀具与切削参数
- CAM 软件入门
- 实操案例串联

### D. 补做图片关联

可参考文件：

- `featured-images.js`
- `featured-images-extended.js`
- `featured-images-part2.js`
- `featured-images-supplement.js`
- `gallery-library-enhanced.js`
- `entry-to-images-map.js`

要求：

- 给 `knowledge-index-master.json` 中尽可能多的条目补上 `relatedImages`
- 本轮目标：
  - `relatedImages` 非空条目数达到 `>= 500`
- 不能乱填，优先按标题、关键词、分类、代码名精确匹配

### E. 扩大学习依赖覆盖

要求：

- `prerequisites` 非空条目数目标：`>= 300`
- `nextSteps` 非空条目数目标：`>= 500`

重点优先：

- 坐标系
- 回零
- 对刀
- G00/G01/G02/G03
- G54-G59
- G41/G42
- G43/G49
- G76/G84/G83
- 进给与转速
- 报警排查链路

### F. 重写正式版报告

输出文件：

`F:\AI工作台\cnc_param_quickfinder\KNOWLEDGE_SYSTEM_REPORT.md`

要求：

- 去掉模板残留
- 明确写出统计口径
- 明确写出过滤规则
- 明确解释 42294 与 42307 的差额
- 加入“可直接接入主站 / 仍需人工复核”的判断

---

## 验证要求

除了输出文件，还必须再输出一个复核摘要文件：

`F:\AI工作台\cnc_param_quickfinder\GEMINI_ROUND2_QA_SUMMARY.md`

里面必须写清楚：

1. 本轮实际修改了哪些文件
2. `knowledge-tree.json` 是否已生成
3. 搜索关键词总数是多少
4. 推荐场景总数是多少
5. `relatedImages` 非空条目数是多少
6. `prerequisites` 非空条目数是多少
7. `nextSteps` 非空条目数是多少
8. 42294 与 42307 的差额原因
9. 仍然没解决的问题有哪些

---

## 约束

- 不要覆盖掉现有文件结构
- 不要删除已有交付
- 不要输出“应该”“大概”“可能”
- 所有数字必须来自实际统计
- 如果某项做不到，要明确写“未完成”和原因

---

## 完成标准

只有同时满足以下条件，才算本轮完成：

- `knowledge-tree.json` 存在
- `search-index.json` 关键词数 `>= 3000`
- `recommended-content.json` 场景数 `>= 80`
- `relatedImages` 非空条目数 `>= 500`
- `prerequisites` 非空条目数 `>= 300`
- `nextSteps` 非空条目数 `>= 500`
- `KNOWLEDGE_SYSTEM_REPORT.md` 已重写为正式版
- `GEMINI_ROUND2_QA_SUMMARY.md` 已生成

