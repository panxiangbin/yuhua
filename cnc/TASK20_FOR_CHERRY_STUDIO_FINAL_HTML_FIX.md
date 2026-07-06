# Cherry Studio 硬返修任务 04

你这轮**仍然没有通过**。

而且这次失败点非常明确，不是复杂架构问题，而是：

**你说修了，但 `index.html` 里最关键的错误引号还在。**

这会直接导致：

- 首页统计 DOM 选不中
- 快速搜索输入框选不中
- 启动台 class / data-route 失效
- 知识地图相关容器部分失效
- 后续脚本继续出现 `null` 报错

---

## 已经再次实测确认的真实结果

真实浏览器结果：

- `.launchpad-card = 0`
- `quickSearchExists = false`
- `treeNodeCount = 0`
- `categoryCardCount = 0`
- 推荐链路没有真实渲染出 `.recommendation-link`
- 页面仍有报错：
  - `Cannot set properties of null (setting 'innerHTML')`
  - `Cannot set properties of null (setting 'textContent')`

这说明：

- 你报告中的“6 个启动卡片正常显示”“无 null 报错”“分类视图 6 个卡片正常”都与真实验收不一致

---

## 已经锁定的根因

### 根因 1：`index.html` 增强区仍然保留大量错误引号

文件里现在还能直接看到这些真实问题：

- `section class=鈥漹iew active鈥?id=鈥漹iew-dashboard鈥?`
- `class=鈥漧aunchpad-card鈥?`
- `data-route=鈥漧earning-map鈥?`
- `id=”stat-entries”`
- `id=”stat-images”`
- `id=”stat-recents”`
- `type=”search”`
- `id=”quick-search-input”`
- `placeholder=”例如：G02、1815、对刀、报警、螺距...”`

也就是说：

- 不只是 class 有问题
- id、type、placeholder、data-route 都还在坏掉

---

### 根因 2：脚本在依赖根本不存在的节点

当前 `app.js` 里还在取：

- `#hero-metrics`
- `#dashboard-gallery-grid`
- `#stat-entries`
- `#stat-images`
- `#stat-recents`
- `#quick-search-input`

但由于 HTML 属性没被正确解析，这些节点很多实际拿不到。

所以你继续修 JS 防御是次要的，**先把 HTML 修成正常 DOM** 才是第一优先级。

---

## 这次必须完成的 5 个动作

### 1. 彻底修复首页增强区 HTML

要求：

- 把首页增强区所有错误引号全部替换为标准 ASCII 引号
- 不能再留任何：
  - `”`
  - `“`
  - `鈥`
  - 其他非标准属性引号

重点区域：

- `view-dashboard`
- `launchpad-hero`
- `launchpad-grid`
- `launchpad-search`
- 所有 `launchpad-card`
- 所有 `stat-*`
- `quick-search-input`
- `quick-search-btn`
- 所有 `keyword-chip`

---

### 2. 修复知识地图区 HTML 与切换链路

要求：

- 确保这些容器都能被真实选中：
  - `#knowledgeTreeContainer`
  - `#knowledgeTreeCanvas`
  - `#knowledgeCategoriesGrid`
  - `#learningPathsGrid`

- 确保点击“分类视图”时，至少能真实渲染出分类卡片

完成标准：

- `categoryCardCount > 0`

---

### 3. 消灭当前所有 null 报错

你必须针对真实报错去修：

- `Cannot set properties of null (setting 'innerHTML')`
- `Cannot set properties of null (setting 'textContent')`

重点排查：

- `updateLaunchpadStats()`
- `renderFeaturedImagesPreview()`
- `renderLibraryLog()` / `heroMetrics`
- 快速搜索增强逻辑
- 知识地图视图切换逻辑

---

### 4. 让至少一条推荐链路真实跑通

要求：

- 真实页面里能进入某个详情页
- 至少渲染出一个 `.recommendation-link`
- 点下去后详情标题改变

如果现在推荐数据不够，就做稳定降级内容，不要让页面空着。

---

### 5. 重写 `CHERRY_STUDIO_FIX_REPORT.md`

这次报告必须包含真实可核对结果：

1. 你修掉了哪些具体错误引号
2. 首页启动台最终 `.launchpad-card` 数量是多少
3. `#quick-search-input` 是否真实存在
4. 知识地图最终 `categoryCardCount` 是多少
5. 还剩不剩任何 `null` 报错
6. 推荐链路是否真实点击通过

不要再写“理论上可用”。

---

## 你必须重点修改的文件

- `F:\AI工作台\cnc_param_quickfinder\index.html`
- `F:\AI工作台\cnc_param_quickfinder\app.js`
- `F:\AI工作台\cnc_param_quickfinder\ui-knowledge-tree.js`
- `F:\AI工作台\cnc_param_quickfinder\ui-recommendations.js`

---

## 完成标准

只有同时满足以下条件，才算这轮通过：

- 首页增强区不再有错误引号
- `.launchpad-card > 0`
- `#quick-search-input` 真实存在
- `categoryCardCount > 0`
- 页面不再出现当前这几条 `null` 报错
- 推荐链路真实可点通
- `CHERRY_STUDIO_FIX_REPORT.md` 已重写

