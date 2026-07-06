# Cherry Studio 硬返修任务 03

你这轮**不能算通过**。

原因不是“还有一点小问题”，而是：

- 你报告里说首页启动台正常
- 但真实浏览器验收结果仍然是 `.launchpad-card = 0`
- 你报告里说知识地图已正常渲染
- 但真实浏览器验收结果仍然是 `treeNodeCount = 0`、`categoryCardCount = 0`
- 你报告里说没有运行时报错
- 但真实浏览器验收结果仍然有多条 `pageerror`

也就是说：

**你的报告结论和真实页面状态不一致。**

这次不要再写“已完成”的自述报告来代替修复。  
你必须按下面这些“已经实测确认”的问题逐条修。

---

## 当前已经实测确认的真实问题

### 问题 1：首页启动台依然没有真实渲染

真实验收结果：

- `document.querySelectorAll('.launchpad-card').length === 0`

根因已经明确，不是猜测：

- `index.html` 里首页增强区**仍然大量保留错误引号**
- 例如现在文件里仍能看到：
  - `class=”launchpad-hero”`
  - `class=”launchpad-card”`
  - `data-route=”learning-map”`
  - `type=”search”`
  - `id=”quick-search-input”`

这会直接导致：

- class 识别失败
- data-route 识别失败
- CSS 选不中
- JS 选不中

所以你报告里说“引号没问题、首页启动台没问题”是错误结论。

---

### 问题 2：知识地图仍然没有真实内容

真实验收结果：

- 进入 `learning-map` 后：
  - `treeNodeCount = 0`
  - `categoryCardCount = 0`
  - 页面没有真实树节点

说明：

- 你虽然加了 `knowledgeTreeUI.render()`
- 但知识地图实际仍没有渲染出内容
- 不是“看起来应该能用”，而是**浏览器里就是空的**

你必须继续查：

- 是不是 HTML 容器没有被正确识别
- 是不是 placeholder / canvas / categories grid 其中某个节点拿不到
- 是不是视图切换时 `switchView` 没有真正触发
- 是不是 `knowledge-tree.json` 读取后没有进入真实 render 分支

---

### 问题 3：页面仍存在真实运行时报错

真实浏览器报错：

- `Cannot set properties of null (setting 'innerHTML')`
- `Cannot set properties of null (setting 'textContent')`
- `Cannot set properties of null (setting 'textContent')`
- `Cannot set properties of null (setting 'textContent')`

这说明：

- 你现在的页面初始化里仍然有多个容器实际不存在
- 或者因为错误引号导致节点没有被 DOM 正常解析出来
- 你的“已经没有运行时错误”的结论不成立

这次必须找出真实触发点，不要只说“我检查代码看起来没问题”。

---

### 问题 4：`window.app.selectEntry` 虽然改了，但推荐链路仍未通过真实验收

当前真实验收时：

- 推荐点击链路没有形成有效通过结果

不一定是 `selectEntry` 本身还错，  
也可能是：

- 没有真实推荐按钮被渲染出来
- 推荐容器没拿到
- 推荐数据没接入
- 详情页渲染没完成就绑定了点击

总之：

**这一条必须用真实页面结果证明能点、能跳、能变更详情标题。**

---

## 这次你必须完成的 6 个动作

### 1. 全量修复 `index.html` 增强区中的错误引号

要求：

- 把所有 `”`、`“`、`鈥�` 之类错误引号全部替换为标准 ASCII 引号
- 重点检查首页增强区、快速搜索区、知识地图区
- 不允许再保留任何这类错误 HTML 属性写法

你必须重点检查这些区域：

- 首页启动台
- 快速搜索
- 热门关键词按钮
- 知识地图工具栏
- 学习路径卡片

---

### 2. 真正修复首页启动台

完成后必须满足：

- `.launchpad-card` 数量大于 0
- 卡片样式真实生效
- 卡片 `data-route` 点击能跳转

---

### 3. 真正修复知识地图渲染

完成后必须满足至少一项：

- `treeNodeCount > 0`
- 或 `categoryCardCount > 0`

不能再是两个都为 0。

并且：

- 如果树视图没数据，分类视图也必须有真实降级内容
- 不能只有空白区域

---

### 4. 找出并修复所有当前 `null` 报错来源

你必须定位到真实出错点，而不是泛泛而谈。

重点检查：

- `updateLaunchpadStats()`
- `renderFeaturedImagesPreview()`
- `renderRecommendations()`
- 知识地图 placeholder / canvas / grid 容器
- 快速搜索输入框和按钮
- 任何初始化时直接 `.innerHTML` / `.textContent` 的地方

要求：

- 页面打开后不再出现：
  - `Cannot set properties of null (setting 'innerHTML')`
  - `Cannot set properties of null (setting 'textContent')`

---

### 5. 让推荐链路通过真实验收

完成后必须满足：

- 至少能在真实页面里点开一个知识点详情
- 再点击一个推荐项
- 详情标题发生变化，证明跳转成功

这次不要只说“理论上可用”。

---

### 6. 重新生成 `CHERRY_STUDIO_FIX_REPORT.md`

这次报告不能只写“已完成”。

必须写清楚：

1. 你在 `index.html` 里具体修了哪些错误引号区域
2. 首页启动台最终真实数量是多少
3. 知识地图最终是树视图有内容，还是分类视图有内容
4. 你修掉了哪几个真实 `null` 报错点
5. 推荐链路你是怎么验证通过的
6. 是否还有剩余缺口

---

## 你必须重点修改的文件

- `F:\AI工作台\cnc_param_quickfinder\index.html`
- `F:\AI工作台\cnc_param_quickfinder\app.js`
- `F:\AI工作台\cnc_param_quickfinder\ui-knowledge-tree.js`
- `F:\AI工作台\cnc_param_quickfinder\ui-recommendations.js`
- `F:\AI工作台\cnc_param_quickfinder\styles-enhanced.css`

---

## 完成标准

只有同时满足以下条件，才算这轮返修通过：

- `index.html` 中首页增强区不再含错误引号
- `.launchpad-card` 数量大于 0
- 知识地图至少一种视图真实渲染出内容
- 页面打开后不再出现当前这几条 `null` 报错
- 推荐链路真实可点击并能切换详情
- `CHERRY_STUDIO_FIX_REPORT.md` 已重写

