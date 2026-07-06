# 3号超长任务：图片系统返工升级与 Batch 002 扩容包

你是3号（Gemini CLI）。

你的回复开头必须写：

`3号回复：`

你这次不是继续简单扩图，而是要把上一轮已经生成的图片系统，修成“合同更严、结构更稳、能继续大规模扩张”的版本。

你可以读取本地文件，也可以在本地生成文件。

---

## 一、任务背景

当前你已经生成过：

`F:\AI工作台\cnc_param_quickfinder\image-system-round1\`

其中已有：

- `image-master-plan.md`
- `image-batch-001-prompts.json`
- `image-batch-001-prompts.md`
- `image-entry-map-round1.json`
- `image-filename-rules.md`

Codex 已核实：

1. 这些文件真实存在
2. batch001 的 JSON 可解析
3. 当前核心问题不是“有没有文件”，而是“规范不统一”

已确认的问题包括：

- 命名规则和实际文件名不一致
- 分类缩写不一致
- 首页图的 targetAudience 错位
- 图种比例失衡，流程图/刀路图过多，坐标/对刀/图纸类过少

这次你的任务就是：

把 round1 修成一个更严格的 round2，并顺手产出 batch002。

---

## 二、你的任务目标

请在新目录中工作：

`F:\AI工作台\cnc_param_quickfinder\image-system-round2\`

---

## 三、必须完成的工作

### 任务A：修图片系统合同

你必须重新生成并统一这些文件：

1. `image-schema-contract.md`
2. `image-filename-rules-v2.md`
3. `image-type-taxonomy.json`
4. `image-audience-rules.md`

要求：

#### `image-schema-contract.md`

明确规定每条图片任务记录必须有哪些字段：

- `imageId`
- `pageArea`
- `topicTitle`
- `imageType`
- `filename`
- `prompt`
- `negativePrompt`
- `styleNotes`
- `priority`
- `targetAudience`
- `relatedEntryOrSection`
- `mobileCropSafety`
- `visualGoal`

并写清：

- 哪些字段必填
- 哪些字段值必须来自固定枚举
- 哪些字段不能自由发挥

#### `image-filename-rules-v2.md`

你必须修掉上一轮规则和实际文件不一致的问题。
这一版必须只保留一套正式命名，不允许再混用。

#### `image-type-taxonomy.json`

你要给图片类型建立正式 taxonomy，不允许再出现：

- 规则里叫一个名字
- JSON 里写另一个名字

#### `image-audience-rules.md`

你要明确：

- 首页入口图的受众应该怎么标
- 新手学习卡的受众应该怎么标
- 报警排查页的受众应该怎么标
- 工艺刀具和参数页的受众应该怎么标

---

### 任务B：返工 batch001

请生成：

1. `image-batch-001-prompts-fixed.json`
2. `image-batch-001-prompts-fixed.md`
3. `image-entry-map-round2.json`

要求：

- 修正 batch001 的 targetAudience
- 修正 filename 和 taxonomy 一致性
- 修正 pageArea 命名不稳定问题
- 保留已有高质量 prompt，不要无脑重写
- 但要把明显不适合新手首页的条目修正过来

你必须自己统计：

- 修了多少条
- 哪几类改动最多

---

### 任务C：新建 batch002

请继续生成第二批：

1. `image-batch-002-prompts.json`
2. `image-batch-002-prompts.md`

批量要求：

- 不少于 240 条
- 这次重点补足 round1 失衡部分

这批重点要补：

- 坐标示意图
- 对刀步骤图
- 图纸实物对比图
- 参数仪表图
- 刀具/材料新手对比图

而不是继续大量堆流程图。

---

### 任务D：生成“直接给 Gemini 画”的纯提示词包

请生成：

1. `gemini-direct-prompts-batch001.txt`
2. `gemini-direct-prompts-batch002.txt`

要求：

- 一条图一段完整提示词
- 不要 JSON 包裹
- 方便用户直接复制给 Gemini
- 每条前面要带图片文件名和主题名

---

### 任务E：生成图片覆盖统计

请生成：

1. `image-coverage-report.md`

必须统计：

- 各 pageArea 覆盖数量
- 各 imageType 覆盖数量
- 各 targetAudience 覆盖数量
- 各 priority 覆盖数量
- 首页/学习页/详情页/授权区分别有多少图

并明确指出：

- 还有哪些页面明显缺图
- 哪些类型还不够平衡

---

## 四、验证要求

你必须自己验证：

1. 所有 JSON 解析通过
2. batch001 fixed 条目数正确
3. batch002 条目数正确
4. taxonomy 中的 imageType 与批次文件完全一致
5. filename 规则与所有文件名一致

再生成：

`image-round2-validation.md`

---

## 五、输出文件至少包括

- `image-schema-contract.md`
- `image-filename-rules-v2.md`
- `image-type-taxonomy.json`
- `image-audience-rules.md`
- `image-batch-001-prompts-fixed.json`
- `image-batch-001-prompts-fixed.md`
- `image-entry-map-round2.json`
- `image-batch-002-prompts.json`
- `image-batch-002-prompts.md`
- `gemini-direct-prompts-batch001.txt`
- `gemini-direct-prompts-batch002.txt`
- `image-coverage-report.md`
- `image-round2-validation.md`

---

## 六、回复格式

你的聊天回复只允许写：

1. 新生成了哪些文件
2. batch001 修了多少条
3. batch002 生成了多少条
4. 哪三个问题被你真正修掉了
5. 还剩哪些问题需要 Codex 再判断
