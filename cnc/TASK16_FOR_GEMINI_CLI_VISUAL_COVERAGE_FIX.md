# Gemini CLI 一次性长任务 03

你上一轮已经完成了前端可直接消费的 7 个精选数据包，这一轮不要重复扫描 4 万条知识库底层内容，也不要重做已经合格的结构。

这一轮只做一件事：
**把“软件前端精选数据包”从“基本可用”修到“可直接接入上线”。**

项目目录：
`F:\AI工作台\cnc_param_quickfinder\`

你必须基于当前真实文件继续工作，优先使用这些现成输入：

- `dashboard-launch-pads.json`
- `beginner-study-packs.json`
- `visual-topic-clusters.json`
- `alarm-diagnosis-flows.json`
- `quick-lookup-collections.json`
- `software-recommendation-zones.json`
- `image-gap-plan.json`
- `gallery-library-enhanced.js`
- `gallery-library-master.js`
- `entry-to-images-map.js`
- `knowledge-index-master.json`

---

## 这一轮已经发现的真实问题

### 1. 少量图片路径引用到了不存在的文件

下面这些路径目前不存在，必须修正成项目里真实存在的图片，不能再写空想路径：

- `dashboard-launch-pads.json`
  - `pad-probe-macro`
  - `assets/images/batch01_core/probe-overview-001.webp`

- `visual-topic-clusters.json`
  - `cluster-vernier-caliper`
  - `assets/images/batch02_operation_basics/vernier-caliper-detail-001.webp`
  - `cluster-probe-overview`
  - `assets/images/batch01_core/probe-overview-001.webp`
  - `cluster-probe-safety`
  - `assets/images/batch01_core/probe-safety-mistakes-001.webp`
  - `cluster-auto-centering`
  - `assets/images/batch01_core/auto-centering-rectangle-001.webp`
  - `cluster-bore-center`
  - `assets/images/batch01_core/bore-center-measure-001.webp`

### 2. `image-gap-plan.json` 的图片类型分布太单一

当前统计：

- `参数表图`：258
- `动作步骤图`：21
- `刀具外观图`：21
- `故障排查流程图`：3
- `对比图`：16
- `机床面板图`：1

这不符合真实软件场景。你这一轮必须把它修得更均衡、更像“要做大量图片的软件规划”，不能大部分都堆成参数表图。

### 3. 需要继续强化“图文入口”厚度

上一轮 `visual-topic-clusters.json` 只有 20 组，够用但还不够厚。  
这一轮需要把图文专题入口做得更丰富，让后续首页、图库页、学习页都能直接消费。

---

## 这一轮必须一次性完成的 5 个交付

### 1. 修复 `dashboard-launch-pads.json`

要求：

- 保持现有结构不变
- 修复所有 `imageHint` 为真实存在的图片路径
- 不允许出现不存在的图片文件

每一项仍然必须保留：

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

### 2. 修复并增强 `visual-topic-clusters.json`

要求：

- 把原来的 20 组扩充到 **至少 40 组**
- 所有 `coverImage` 必须指向真实存在的图片
- 每组都必须保持“图文型入口”的产品感，而不是普通条目列表

优先扩充方向：

- G代码动作图解
- 对刀与坐标设定
- 刀补与长度补偿
- 钻孔 / 攻丝 / 镗孔循环
- 刀具识别与用途
- 常见加工工艺
- 常见报警图解
- 测量与量具使用
- 夹具与装夹
- CAM 编程与后处理

每组仍然必须保留：

- `id`
- `title`
- `coverImage`
- `clusterType`
- `entryIds`
- `imageDriven`
- `description`
- `keywords`

---

### 3. 重做 `image-gap-plan.json`

要求：

- 仍然保留 **至少 320 条**
- 但必须显著改善 `recommendedImageType` 分布，不能再几乎全是 `参数表图`
- 这份计划要明显更适合“图片非常多的软件”

你必须把图片类型细化并拉开比例，建议至少覆盖这些类型：

- `动作步骤图`
- `结构示意图`
- `对比图`
- `参数表图`
- `故障排查流程图`
- `刀具外观图`
- `机床面板图`
- `装夹示意图`
- `测量读数图`
- `坐标轨迹图`

并且：

- 高优先级条目要更多聚焦在新手最难理解、最依赖图示的内容
- `suggestedKeywords` 要更像真实出图提示词关键词，不要机械重复

每条仍必须保留：

- `knowledgeId`
- `title`
- `category`
- `whyNeedImage`
- `recommendedImageType`
- `priority`
- `suggestedKeywords`

---

### 4. 新增 `existing-image-coverage-audit.json`

用途：

- 这是给前端和后续补图流程看的“真实图片覆盖审计表”

要求：

- 至少统计以下 4 类：
  - 首页入口卡片
  - 图文专题入口
  - 学习包引用图
  - 速查入口引用图
- 明确标出：
  - 已命中真实图片的条目
  - 缺图条目
  - 用了替代图的条目
- 输出要适合程序读取

建议结构至少包含：

- `section`
- `totalItems`
- `withRealImage`
- `withFallbackImage`
- `missingImage`
- `missingItems`

---

### 5. 新增 `GEMINI_VISUAL_COVERAGE_FIX_REPORT.md`

这是本轮总报告，必须写清楚：

1. 修复了多少个无效图片路径
2. `visual-topic-clusters.json` 从多少组扩充到多少组
3. `image-gap-plan.json` 现在的图片类型分布
4. 哪些文件已经可以直接给前端接入
5. 新增的 `existing-image-coverage-audit.json` 有什么作用
6. 这一轮是否还存在已知缺口

---

## 严格要求

### 严格要求 1

不能凭空写图片路径。  
所有图片路径都必须来自项目里真实存在的文件。

### 严格要求 2

不能改坏已经存在的字段结构。  
这轮是“修正 + 增强”，不是重做格式。

### 严格要求 3

不要生成一堆解释性废话。  
重点是产出前端能直接消费的数据包。

### 严格要求 4

不要回到底层大扫描。  
只围绕现有精选数据包继续做产品化增强。

---

## 完成标准

只有同时满足以下条件才算完成：

- `dashboard-launch-pads.json` 中无失效图片路径
- `visual-topic-clusters.json` 扩充到至少 40 组，且无失效图片路径
- `image-gap-plan.json` 仍有至少 320 条，且图片类型明显更均衡
- `existing-image-coverage-audit.json` 已生成
- `GEMINI_VISUAL_COVERAGE_FIX_REPORT.md` 已生成

