# Gemini CLI 一次性长任务

你现在只做一件事：在现有第一版知识库产物基础上，**一次性完成复核、修正、补全、增强**，输出可以继续接入主站的数据版本。

项目目录：

`F:\AI工作台\cnc_param_quickfinder\`

知识库目录：

`F:\AI工作台\04_数控知识库\`

你已经拥有第一版文件：

- `knowledge-index-master.json`
- `knowledge-relationships.json`
- `learning-paths.json`
- `parameter-quick-reference.json`
- `category-statistics.json`
- `search-index.json`
- `recommended-content.json`
- `KNOWLEDGE_SYSTEM_REPORT.md`

现在不要停留在“第一版已生成”，而是直接把它们提升为“可接入主站的第二版”。

---

## 本轮必须一次性完成的总目标

1. 复核昨天所有 Gemini 交付文件是否真实有效
2. 修复统计口径和报告不严谨的问题
3. 补齐缺失交付 `knowledge-tree.json`
4. 重建更强的 `search-index.json`
5. 扩充 `recommended-content.json`
6. 给 `knowledge-index-master.json` 批量补做 `relatedImages`
7. 扩大学习依赖 `prerequisites` 和 `nextSteps`
8. 输出正式版质量报告和本轮 QA 汇总

---

## 你必须先确认的已知问题

以下问题是我已经人工复核确认过的，不需要你再争论，直接修：

### 已确认问题 1

`knowledge-tree.json` 缺失，没有生成。

### 已确认问题 2

`search-index.json` 当前关键词总数太低：

- `metadata.totalKeywords = 223`

对于 4 万+知识条目明显不够。

### 已确认问题 3

`recommended-content.json` 目前内容过少，只够演示，不够正式使用。

### 已确认问题 4

`knowledge-index-master.json` 中：

- 总条目数：42294
- `relatedImages` 非空条目数：0

说明图片关联字段存在，但实际没有做起来。

### 已确认问题 5

`knowledge-index-master.json` 中：

- `prerequisites` 非空条目数：42
- `nextSteps` 非空条目数：72

覆盖率远远不够。

### 已确认问题 6

`KNOWLEDGE_SYSTEM_REPORT.md` 有报告草稿痕迹，包括：

- 统计表述不够严谨
- 口径解释不完整
- 存在模板残留

### 已确认问题 7

知识库真实目录复核值：

- 实际文件数：42307
- 实际总字节数：84393816

而你的第一版索引总数是 42294。你必须在本轮报告里解释这个差额来自什么过滤规则或哪些文件。

---

## 本轮具体交付文件

你最终必须输出并覆盖或新增以下文件：

### 保留并修正

- `knowledge-index-master.json`
- `knowledge-relationships.json`
- `learning-paths.json`
- `parameter-quick-reference.json`
- `category-statistics.json`
- `search-index.json`
- `recommended-content.json`
- `KNOWLEDGE_SYSTEM_REPORT.md`

### 新增必须补齐

- `knowledge-tree.json`
- `GEMINI_ROUND2_QA_SUMMARY.md`

---

## 每个文件的具体要求

### 1. knowledge-index-master.json

要求：

- 保持现有结构可兼容
- 每条记录尽量保留这些字段：
  - `id`
  - `path`
  - `filename`
  - `category`
  - `type`
  - `title`
  - `size`
  - `qualityLevel`
  - `keywords`
  - `relatedImages`
  - `difficulty`
  - `estimatedReadingTime`
  - `prerequisites`
  - `nextSteps`
  - `createdDate`
  - `summary`

增强要求：

- `relatedImages` 非空条目数目标：`>= 500`
- `prerequisites` 非空条目数目标：`>= 300`
- `nextSteps` 非空条目数目标：`>= 500`

### 2. knowledge-relationships.json

要求：

- 保持 `nodes + edges` 结构
- 继续使用现有 `id`
- 边类型至少保留：
  - `prerequisite`
  - `related`
  - `nextStep`
  - `advanced`

增强要求：

- 关系边不再只是演示规模
- 要和学习路径、推荐内容一致

### 3. learning-paths.json

要求：

- 至少保留 10 条学习路径
- 每条路径要可落地，不是口号
- 步骤要尽量指向真实知识点

重点路径：

- 数控编程入门
- 机床操作入门
- 铣床加工进阶
- 车床工艺进阶
- 对刀与坐标专题
- 刀具工艺专题
- 报警排查专题
- CAM 软件入门
- 质量检测入门
- 考证备考路径

### 4. parameter-quick-reference.json

要求：

- 不能只放少量示例
- 要扩充为真正能用于站内速查的数据

至少覆盖：

- 切削参数
- G代码速查
- M代码速查
- 常见报警代码
- 螺纹参数
- 刀具规格
- 材料与刀具组合建议

### 5. category-statistics.json

要求：

- 分类统计要与真实扫描口径一致
- 明确输出：
  - 分类文件数
  - 分类大小
  - 类型分布
  - 质量分布
  - 高频关键词
  - 推荐起步条目

### 6. search-index.json

要求：

- 重建，不要停留在 223 个关键词
- 目标关键词规模至少：`>= 3000`
- 每个关键词要尽量指向真实相关知识点

重点加强：

- G代码
- M代码
- 参数号
- 报警号
- 系统名称
- 刀具名称
- 工艺术语
- 新手常搜词

### 7. recommended-content.json

要求：

- 从“演示级”扩充到“可用级”
- 至少输出 `>= 80` 个用户场景

每个场景至少要有：

- `scenario`
- `entryTriggers`
- `recommendations`
- `reason`
- `priority`

### 8. knowledge-tree.json

这是本轮必须补齐的新增文件。

要求：

- 做成 4 级目录树
- 支持主站后续用来做学习路线和目录导航
- 每个节点尽量包含：
  - `id`
  - `title`
  - `type`
  - `path`
  - `count`
  - `children`
  - `recommendedEntryIds`

### 9. KNOWLEDGE_SYSTEM_REPORT.md

要求：

- 重写成正式版
- 去掉模板残留
- 说明扫描范围
- 说明过滤规则
- 说明统计口径
- 解释为什么 42307 实际文件和 42294 索引条目存在差额
- 明确哪些结果可以直接接入主站
- 明确哪些结果仍需人工复核

### 10. GEMINI_ROUND2_QA_SUMMARY.md

这是本轮必须新增的汇总文件。

必须写清楚：

1. 本轮修改了哪些文件
2. 每个文件解决了什么问题
3. `knowledge-tree.json` 是否已生成
4. 搜索关键词总数是多少
5. 推荐场景总数是多少
6. `relatedImages` 非空条目数是多少
7. `prerequisites` 非空条目数是多少
8. `nextSteps` 非空条目数是多少
9. 42307 与 42294 的差额原因
10. 仍未解决的问题有哪些

---

## 图片关联要求

补做 `relatedImages` 时，允许你参考以下现有文件：

- `featured-images.js`
- `featured-images-extended.js`
- `featured-images-part2.js`
- `featured-images-supplement.js`
- `gallery-library-enhanced.js`
- `entry-to-images-map.js`

要求：

- 优先精确匹配，不要乱填
- 优先按这些维度：
  - 标题关键词
  - G代码 / M代码
  - 参数号
  - 报警号
  - 系统名
  - 刀具名
  - 工艺专题名

---

## 学习依赖要求

扩充 `prerequisites / nextSteps` 时，优先覆盖：

- 坐标系
- 回零
- 对刀
- G00 / G01 / G02 / G03
- G54-G59
- G41 / G42
- G43 / G49
- G76 / G84 / G83
- 进给与转速
- 报警排查
- 刀具工艺
- CAM 软件

不要只给极少数核心条目做样例，目标是做到真正可驱动学习路线。

---

## 输出质量要求

- 不要只写“应该”“可能”“大概”
- 所有数字必须来自实际统计
- 如果某项做不到，明确写“未完成”和原因
- 不要删旧文件，直接覆盖修正版或新增补齐文件
- 如果采用过滤规则，必须在报告中写明

---

## 本轮完成判定

只有同时满足以下条件，才算完成：

- `knowledge-tree.json` 已生成
- `search-index.json` 关键词数 `>= 3000`
- `recommended-content.json` 场景数 `>= 80`
- `relatedImages` 非空条目数 `>= 500`
- `prerequisites` 非空条目数 `>= 300`
- `nextSteps` 非空条目数 `>= 500`
- `KNOWLEDGE_SYSTEM_REPORT.md` 已重写
- `GEMINI_ROUND2_QA_SUMMARY.md` 已生成

---

## 最后要求

完成后不要只说“做完了”。

请在 `GEMINI_ROUND2_QA_SUMMARY.md` 里给出实际统计结果，让我可以直接复核。

