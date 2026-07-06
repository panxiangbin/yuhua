# GEMINI CLI 任务 22

这次不要再批量生成大包内容，也不要再写 800 条近似模板文案。

你的任务不是“补内容”，而是给前端落地提供一个 **严格的手机端界面契约**。

---

## 一、任务目标

基于当前项目已有页面与数据结构，产出一份可以直接交给前端执行的：

**手机优先 UI 结构契约 + 页面模块规格 + 内容密度限制说明**

目的只有一个：

让 Cherry Studio 后续做手机端界面时，有一个不能随便发挥、不能乱堆内容的明确标准。

---

## 二、你要产出的文件

请创建以下 3 个文件：

1. `F:\AI工作台\cnc_param_quickfinder\mobile-ui-contract.json`
2. `F:\AI工作台\cnc_param_quickfinder\mobile-page-specs.json`
3. `F:\AI工作台\cnc_param_quickfinder\GEMINI_MOBILE_UI_CONTRACT_REPORT.md`

---

## 三、你的输入依据

请基于当前项目这些现有内容来做，不要凭空另起炉灶：

- `index.html`
- `app.js`
- `styles.css`
- `styles-enhanced.css`
- `dashboard-launch-pads.json`
- `beginner-study-packs.json`
- `visual-topic-clusters.json`
- `quick-lookup-collections.json`
- `entry-teaching-cards-core.json`
- `detail-render-priority.json`

---

## 四、你必须输出的内容

### A. `mobile-ui-contract.json`

按页面输出手机端硬规则，至少包含这些页面：

- dashboard
- study-map
- workspace
- library
- calculator
- detail-panel

每个页面至少要包含这些字段：

- `pageId`
- `mobilePriority`
- `primaryGoal`
- `mustShowModules`
- `optionalModules`
- `maxCardsAboveFold`
- `maxPrimaryActions`
- `maxLinesPerCard`
- `recommendedImageUsage`
- `overflowRisk`

---

### B. `mobile-page-specs.json`

给每个页面写清楚手机端模块规范，至少包含：

- 模块名称
- 模块用途
- 模块排序
- 是否首屏必显
- 每个模块推荐展示多少条
- 文本最多几行
- 是否强制配图
- 如果无图时如何降级
- 适合新手还是进阶用户

必须覆盖至少这些模块：

- 顶部导航
- 页面标题区
- 搜索区
- 分类筛选区
- 卡片列表区
- 学习路径区
- 推荐区
- 详情区
- 计算器输入区
- 结果解释区

---

### C. `GEMINI_MOBILE_UI_CONTRACT_REPORT.md`

报告里必须明确回答：

1. 为什么当前项目不能继续“先堆内容再修手机端”
2. 哪 3 个页面最应该优先做手机端
3. dashboard 首屏最多应该放几个主入口
4. study-map 首屏最多应该放几步学习路径
5. workspace 首屏最多应该出现多少筛选项
6. 哪些模块必须强制配图
7. 哪些模块文字必须严格收短

---

## 五、硬性约束

你这次不能再做这些事情：

- 不要生成海量重复文案
- 不要重写知识库正文
- 不要改前端代码
- 不要碰邀请码/授权系统
- 不要再输出“看起来很多、实际难消费”的超长模板字段

你这次只做一件事：

**把手机端界面的边界条件定义清楚。**

---

## 六、完成标准

只有满足以下条件才算通过：

- 3 个文件都真实存在
- JSON 能被正常解析
- 页面至少覆盖 dashboard / study-map / workspace / library / calculator / detail-panel
- 每个页面都有明确的“展示上限”和“内容密度限制”
- 报告里能明确告诉前端“什么该收，什么该放，什么必须配图”

---

## 七、特别提醒

这轮不要追求“多”，追求“准”。

如果你 1 分钟就做完，说明你大概率又在模板化交差。

我要的是 **前端可执行的手机端规格**，不是一堆漂亮空话。
