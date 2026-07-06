# Gemini CLI 超长任务 04

你前两轮已经完成了：

- 知识索引与搜索层
- 学习路径与推荐层
- 前端精选数据包
- 图文专题入口扩充
- 图片覆盖修复与缺图规划

这一次不要再回到底层大扫描，也不要重复生成已经合格的文件。

这一次只做一件事：

**把“软件的详情页体验、场景化学习、实操决策支持”做厚。**

目标不是继续堆索引，而是产出一批：

- 前端详情页可以直接吃的数据包
- 新手看得懂的解释层
- 现场操作者能直接点开的行动卡片
- 让搜索结果、学习包、图文专题、参数换算之间真正联动起来

项目目录：
`F:\AI工作台\cnc_param_quickfinder\`

---

## 这轮允许你直接使用的已有文件

- `knowledge-index-master.json`
- `knowledge-relationships.json`
- `learning-paths.json`
- `parameter-quick-reference.json`
- `category-statistics.json`
- `search-index.json`
- `recommended-content.json`
- `knowledge-tree.json`
- `dashboard-launch-pads.json`
- `beginner-study-packs.json`
- `visual-topic-clusters.json`
- `alarm-diagnosis-flows.json`
- `quick-lookup-collections.json`
- `software-recommendation-zones.json`
- `image-gap-plan.json`
- `existing-image-coverage-audit.json`
- `entry-to-images-map.js`
- `gallery-library-enhanced.js`
- `gallery-library-master.js`

---

## 这轮的核心目标

当前系统已经有：

- 能搜
- 能分组
- 有图文入口
- 有学习包

但还缺一层关键产品体验：

- 一个知识点点进去以后，除了原文摘要，还应该马上看到“新手解释”“什么时候用”“最容易错哪”“下一步学什么”
- 一个现场问题点进去以后，应该能直接看到“第一步干什么、第二步看哪里、不要先碰什么”
- 一个参数换算结果出来以后，应该能给出“适合继续看哪些知识点”
- 一个图文专题看完以后，应该能自动接到“继续学什么/继续查什么”

这一轮就是补这层。

---

## 你必须一次性完成的 8 个交付

### 1. `entry-teaching-cards.json`

用途：

- 这是详情页“教学增强层”
- 给核心知识点补一层前端可直接展示的教学卡

要求：

- 至少覆盖 **800 个核心知识点**
- 重点覆盖：
  - G代码 / M代码
  - 对刀 / 坐标 / 补偿
  - 刀具 / 工艺 / 材料
  - 报警 / 参数 / 故障
  - 测量 / 图纸 / 量具

每条至少包含：

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

要求说明：

- `beginnerSummary` 要明显像“讲给新手听”
- `commonMistake` 必须是具体错误，不要空话
- `quickCheck` 要写成“你现在可以先检查什么”

---

### 2. `scenario-playbooks.json`

用途：

- 这是“现场问题入口”
- 让用户按场景进入，而不是只靠关键词搜索

要求：

- 至少做 **80 个场景剧本**
- 场景要覆盖真实现场高频情况

优先场景：

- 开机不会回零
- 对刀老是乱
- 圆弧总报警
- 攻丝容易断丝锥
- 表面粗糙度不好
- 尺寸总漂
- 刀补一开就过切
- 程序空跑看不懂
- 钻孔发热或排屑差
- 主轴负载高
- 铝件积屑瘤
- 薄壁件变形
- 螺纹尺寸不稳定
- 机床突然限位
- 工件坐标老丢

每条至少包含：

- `id`
- `title`
- `sceneType`
- `symptom`
- `likelyCauses`
- `firstAction`
- `doNotDoFirst`
- `stepActions`
- `relatedEntryIds`
- `relatedFlowIds`
- `relatedCalculatorIds`

---

### 3. `calculator-recipes.json`

用途：

- 这是“参数换算之后该怎么学/怎么用”的桥接层

要求：

- 至少做 **50 个换算使用方案**
- 把计算器和知识点、工艺点、速查集合连起来

每条至少包含：

- `id`
- `title`
- `calculatorType`
- `inputMeaning`
- `resultMeaning`
- `typicalUseCase`
- `commonWrongInput`
- `afterCalculationCheck`
- `recommendedEntryIds`
- `recommendedLookupIds`

优先覆盖：

- 转速
- 切削速度
- 进给
- 螺距
- 小径 / 大径
- 攻丝参数
- 钻孔参数
- 车削 / 铣削基础参数

---

### 4. `alarm-action-cards.json`

用途：

- 给报警排查页做“短卡片模式”
- 比完整 flow 更短，更适合手机快速看

要求：

- 至少做 **100 条报警行动卡**
- 优先从 `alarm-diagnosis-flows.json` 和现有知识点里提炼

每条至少包含：

- `id`
- `title`
- `system`
- `alarmCodes`
- `riskLevel`
- `oneLineDiagnosis`
- `firstThreeChecks`
- `stopConditions`
- `relatedFlowId`
- `relatedEntryIds`

说明：

- `firstThreeChecks` 必须非常短，适合手机卡片
- `stopConditions` 要写清楚“什么情况先停机、不要硬试”

---

### 5. `machine-panel-guides.json`

用途：

- 做“面板不会按”的新手快速入口

要求：

- 至少做 **60 条面板/操作引导卡**
- 覆盖：
  - 回零
  - MDI
  - 手轮
  - 单段
  - 空运行
  - 进给倍率
  - 主轴倍率
  - 程序编辑
  - 刀补输入
  - 坐标查看
  - 报警复位

每条至少包含：

- `id`
- `title`
- `machineActionType`
- `targetControlArea`
- `whatItDoes`
- `whenToUse`
- `wrongOperationRisk`
- `stepGuide`
- `relatedEntryIds`
- `preferredImageKeywords`

---

### 6. `tooling-decision-cards.json`

用途：

- 做“刀具怎么选”的决策层

要求：

- 至少做 **120 条刀具/工艺决策卡**
- 优先覆盖：
  - 外圆车刀
  - 切断刀
  - 螺纹刀
  - 面铣刀
  - 立铣刀
  - 球刀
  - 钻头
  - 铰刀
  - 镗刀
  - 丝锥
  - 不同材料下的刀具选择

每条至少包含：

- `id`
- `title`
- `toolType`
- `workMaterial`
- `recommendedUse`
- `avoidUse`
- `selectionReason`
- `commonWearSignal`
- `relatedEntryIds`
- `relatedImageIds`

---

### 7. `entry-priority-index.json`

用途：

- 这是前端的“内容优先级索引”
- 以后首页推荐、搜索排序、学习入口排序、详情页相关推荐都可以吃它

要求：

- 至少覆盖 **1000 个知识点**
- 必须是从真实知识点中打分整理出来的

每条至少包含：

- `id`
- `title`
- `category`
- `priorityScore`
- `beginnerValue`
- `shopfloorValue`
- `imageReadiness`
- `calculatorRelevance`
- `recommendedSurface`

说明：

- `recommendedSurface` 可以是数组，例：
  - `dashboard`
  - `search`
  - `study_pack`
  - `visual_topic`
  - `alarm_center`
  - `calculator_followup`

---

### 8. `GEMINI_DETAIL_EXPERIENCE_REPORT.md`

这是本轮总报告，必须写清楚：

1. 本轮新生成了哪些文件
2. 每个文件给前端带来的作用
3. `entry-teaching-cards.json` 覆盖了多少个知识点
4. `scenario-playbooks.json` 做了多少个场景
5. `calculator-recipes.json` 做了多少个换算方案
6. `alarm-action-cards.json` 做了多少条报警行动卡
7. `machine-panel-guides.json` 做了多少条面板引导
8. `tooling-decision-cards.json` 做了多少条刀具决策卡
9. `entry-priority-index.json` 覆盖了多少知识点
10. 哪些数据可以马上给前端接入

---

## 严格要求

### 严格要求 1

不要重做已经存在的基础索引文件。

### 严格要求 2

所有 `relatedEntryIds / nextLearningIds / relatedFlowIds` 必须来自真实已有文件，不要空想 ID。

### 严格要求 3

不要把内容写成空泛说明文。  
要写成真正能被软件界面直接展示的短块内容。

### 严格要求 4

新手解释必须口语化，但不能低质量。

### 严格要求 5

这一轮重点是“产品化详情体验层”，不是再做百科式大索引。

---

## 完成标准

只有同时满足以下条件才算完成：

- `entry-teaching-cards.json` 已生成，覆盖至少 800 个知识点
- `scenario-playbooks.json` 已生成，至少 80 条
- `calculator-recipes.json` 已生成，至少 50 条
- `alarm-action-cards.json` 已生成，至少 100 条
- `machine-panel-guides.json` 已生成，至少 60 条
- `tooling-decision-cards.json` 已生成，至少 120 条
- `entry-priority-index.json` 已生成，覆盖至少 1000 个知识点
- `GEMINI_DETAIL_EXPERIENCE_REPORT.md` 已生成

