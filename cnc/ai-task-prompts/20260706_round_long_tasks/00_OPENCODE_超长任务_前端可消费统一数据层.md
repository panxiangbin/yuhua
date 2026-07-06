# 0号超长任务：前端可消费统一数据层工程包

你是0号（OPENCODE）。

你的回复开头必须写：

`0号回复：`

你这次不是写研究报告，也不是只修一个 JSON。
你要做的是：把当前已经产出的多包数据，整理成“前端可以直接读”的统一数据层。

你可以读取本地文件，也可以在本地生成新文件。

---

## 一、任务背景

当前项目目录：

`F:\AI工作台\cnc_param_quickfinder\`

你之前已经做过：

- `opencode_output\`
- `opencode_output_round2\`

其中现在已经确认可用的核心资产包括：

- `search_alias_dictionary_clean.json`
- `gcode_reference.json`
- `mcode_reference.json`
- `alarm_faq_data.json`
- `parameter_faq_data.json`
- `beginner_learning_faq.json`
- `related_links_map.json`

但这些文件现在仍然是“分散的数据包”，还不是前端最省事的消费形态。

你的这次任务目标是：

把它们整理成一个统一、轻量、可直接 fetch 的前端数据层。

---

## 二、你必须完成的核心目标

### 目标A：建立统一 manifest

请在以下新目录中工作：

`F:\AI工作台\cnc_param_quickfinder\opencode_frontend_ready\`

你必须生成：

`data-manifest.json`

这个文件至少要包含：

- 数据包名称
- 文件路径
- 条目数
- schema版本
- 是否可直接上线
- 是否含 draft
- 推荐用途
- 推荐前端加载方式

---

### 目标B：生成统一搜索层

请基于：

- `search_alias_dictionary_clean.json`
- `gcode_reference.json`
- `mcode_reference.json`
- `alarm_faq_data.json`
- `parameter_faq_data.json`
- `beginner_learning_faq.json`

生成以下文件：

1. `search-index-light.json`
2. `search-suggestions.json`
3. `risk-keywords.json`
4. `entry-lookup-map.json`

要求：

#### `search-index-light.json`

每条记录至少包含：

- `id`
- `type`
- `title`
- `keywords`
- `aliases`
- `riskLevel`
- `sourceFile`
- `directLinkHint`

目标：

做成一个前端可直接做本地搜索的轻量索引层。

#### `search-suggestions.json`

要给出可直接用于搜索框联想的热门词和建议词。

至少生成：

- 200 条建议词
- 要分类型
- 要标出优先级

#### `risk-keywords.json`

请从现有数据里抽取所有高风险词，至少覆盖：

- 坐标
- 刀补
- 回零
- 参数修改
- 报警排障
- 主轴/进给
- 工件零点

每条至少包含：

- `keyword`
- `riskType`
- `riskMessage`
- `recommendedGuard`

#### `entry-lookup-map.json`

用于把搜索结果快速引导到：

- 页面入口
- 具体知识点
- 具体工具
- 具体 FAQ

每条至少包含：

- `keyword`
- `targetType`
- `targetId`
- `reason`

---

### 目标C：生成统一 FAQ 层

请再生成：

1. `faq-unified.json`
2. `faq-high-risk-only.json`
3. `faq-review-queue.json`

要求：

#### `faq-unified.json`

把报警、参数、新手 FAQ 统一到一个 schema 下。

统一字段至少包括：

- `id`
- `faqType`
- `title`
- `question`
- `shortAnswer`
- `fullAnswer`
- `riskNote`
- `relatedKeywords`
- `reviewStatus`
- `sourceFile`

#### `faq-high-risk-only.json`

只抽高风险条目。
必须明确筛选逻辑。

#### `faq-review-queue.json`

把所有仍需人工重点确认的 FAQ 抽出来。
不要把所有 draft 一股脑扔进去，要做分级：

- `P0 必看`
- `P1 尽快看`
- `P2 可后看`

---

### 目标D：生成前端接入说明

请生成：

1. `frontend-consumption-guide.md`
2. `frontend-ready-summary-v2.md`

要求：

#### `frontend-consumption-guide.md`

必须站在前端开发视角，讲清楚：

- 哪个文件适合首页搜索
- 哪个文件适合详情页
- 哪个文件适合联想提示
- 哪个文件适合风险提醒
- 哪个文件适合 FAQ 详情弹层
- 哪个文件适合后续和图片系统联动

#### `frontend-ready-summary-v2.md`

要明确写：

- 哪些文件现在就能接
- 哪些文件先别接
- 哪些字段还不稳定
- 哪些数据包值得优先消费

---

## 三、验证要求

你必须自己做这些验证：

1. 你新生成的所有 JSON 都必须实际解析成功
2. 每个 JSON 都要统计条目数
3. 每个 JSON 都要检查是否存在空关键字段
4. 你要生成一份：

`validation-results.md`

里面必须写：

- 文件名
- 是否解析成功
- 条目数
- 是否有空字段
- 是否建议接入

---

## 四、限制条件

1. 不要改原始输入文件
2. 只在新目录 `opencode_frontend_ready\` 内生成文件
3. 不要只写报告，必须有真实 JSON 成果
4. 不要生成一堆内容重复的文件
5. 生成的 JSON 要尽量轻量，目标是“前端能直接用”

---

## 五、你最终必须交付的文件

至少包括：

- `data-manifest.json`
- `search-index-light.json`
- `search-suggestions.json`
- `risk-keywords.json`
- `entry-lookup-map.json`
- `faq-unified.json`
- `faq-high-risk-only.json`
- `faq-review-queue.json`
- `frontend-consumption-guide.md`
- `frontend-ready-summary-v2.md`
- `validation-results.md`

---

## 六、回复格式

你的聊天回复只允许包含下面四部分：

1. 你新生成了哪些文件
2. 哪些 JSON 已真实解析通过
3. 哪几个文件最值得 Codex 先接
4. 还有哪些问题你不能自动确认

不要写空话。
