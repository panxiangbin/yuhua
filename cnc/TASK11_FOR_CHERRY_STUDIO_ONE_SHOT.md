# Cherry Studio 一次性长任务

你这轮不要重复做 Gemini 正在处理的数据清洗、知识树生成、搜索索引扩充。

你这轮只负责一件事：

**把当前数控网页继续推进成更像正式软件的前端版本，并为 Gemini 即将补齐的数据预留可直接接入的位置。**

项目目录：

`F:\AI工作台\cnc_param_quickfinder\`

当前正式公网入口：

`https://panxiangbin.github.io/yuhua/cnc/`

---

## 你的角色

你现在是这个项目的前端执行负责人。

你要做的是：

1. 强化“图片扑面而来”的视觉体验
2. 强化“目录树 + 工作区”的软件感
3. 把将来 Gemini 产出的 `knowledge-tree.json`、更强搜索索引、更多推荐内容，预留出可直接挂接的前端接口
4. 不要把项目重新做回普通长页面

---

## 当前项目状态

### 已经有的

- `index.html`
- `styles.css`
- `app.js`
- `gallery-featured.js`
- `gallery-library.js`
- `gallery-library-enhanced.js`
- `featured-images.js`
- `featured-images-extended.js`
- `featured-images-part2.js`
- `featured-images-supplement.js`
- `entry-to-images-map.js`

### 已经验证有效的

- 本地访问控制对本地调试已自动放行
- 工作区已有：
  - 目录树
  - 图文模式
  - 只看带图
  - 详情连看
- 首页已有精选图库
- 图库已有 125 张图片接入
- 大量知识条目已经能显示图片

### 当前最明显还不够好的点

1. 图片虽然有了，但还不够“扑面而来”
2. 工作区还不够像正式软件
3. 分类钻取还不够深
4. 很多入口仍然偏“搜索页”，不是“资料软件”
5. 将来 `knowledge-tree.json` 接进来之后，前端还没有完整的承接结构

---

## 本轮你必须完成的目标

### 目标 1：把首页做得更像正式软件入口

要求：

- 首页不要只是展示信息块
- 要有更清晰的“进入方式”
- 用户一打开就知道：
  - 从哪学
  - 去哪查
  - 哪里看图
  - 哪里做换算

你要强化这些区域：

- 新手入口
- 图片入口
- 工作区入口
- 参数换算入口
- 热门知识入口

要求结果：

- 首页更像启动台 / 控制台
- 不像普通展示页

---

### 目标 2：把工作区继续软件化

要求：

- 强化左侧树状导航
- 强化右侧结果区
- 让图文卡片层级更清晰
- 让用户更容易连续浏览

你要重点优化：

1. 工作区顶部信息条
2. 当前筛选状态显示
3. 图文卡片的视觉主次
4. 详情页中的“继续看相关内容”
5. 详情页中的图片展示区

要求结果：

- 工作区看起来像资料软件，不像网页列表

---

### 目标 3：新增“学习地图 / 分类钻取”承接层

注意：

Gemini 正在补 `knowledge-tree.json`，你这轮先把前端承接结构准备好。

你要做的是：

- 在现有页面中加入一个更明确的“学习地图 / 资料目录”区域
- 支持未来直接读取 `knowledge-tree.json`
- 在文件没到位时，允许优雅降级到现有分类数据

至少要准备好：

- `loadKnowledgeTree()` 或同类接口
- 树节点渲染逻辑
- 目录钻取面板
- 节点点击后的内容联动

要求结果：

- 未来 `knowledge-tree.json` 一到，就能直接挂进去

---

### 目标 4：加强图片主导的学习体验

要求：

- 让更多入口先看到图片，不要先看到密密麻麻文字
- 让图卡在首页、工作区、详情页之间有统一体验
- 不只是图库页有图，其他核心入口也要明显有图

重点优化：

1. 首页精选图库区
2. 工作区图文模式卡片
3. 详情页配图区
4. 学习路线区的配图区
5. 带图条目的识别标记

要求结果：

- 用户明显感受到这是“图文资料软件”

---

### 目标 5：预留 Gemini 第二轮数据接入口

Gemini 当前会补这些文件：

- `knowledge-tree.json`
- 更强版本 `search-index.json`
- 更强版本 `recommended-content.json`
- 更丰富的 `knowledge-index-master.json`

你这轮必须把前端结构预留好，不要等数据到了再大改。

你要在代码中预留或实现：

1. `knowledge-tree.json` 的加载入口
2. 推荐内容区域的渲染入口
3. 更强搜索索引的兼容读取入口
4. 图文卡片的扩展字段兼容

要求：

- 不破坏当前现有功能
- 数据来了可以直接接

---

## 你应该优先修改的文件

主改这些：

- `F:\AI工作台\cnc_param_quickfinder\index.html`
- `F:\AI工作台\cnc_param_quickfinder\styles.css`
- `F:\AI工作台\cnc_param_quickfinder\app.js`

按需可改这些：

- `F:\AI工作台\cnc_param_quickfinder\gallery-featured.js`
- `F:\AI工作台\cnc_param_quickfinder\knowledge-gallery.js`
- `F:\AI工作台\cnc_param_quickfinder\highlight-keywords.js`

不要乱动这些数据文件：

- `knowledge-index-master.json`
- `knowledge-relationships.json`
- `learning-paths.json`
- `search-index.json`
- `recommended-content.json`
- `knowledge-tree.json`

这些由 Gemini 主责。

---

## 明确禁止

1. 不要重做访问控制逻辑
2. 不要把站点改回长滚动页
3. 不要删除现有视图
4. 不要只做视觉皮肤，不改交互层级
5. 不要把数据层和前端层搅乱

---

## 你要交付的内容

### 必须修改

- `index.html`
- `styles.css`
- `app.js`

### 如有需要可新增

- `ui-knowledge-tree.js`
- `ui-recommendations.js`
- `ui-workspace-enhanced.js`

如果新增，请在 `index.html` 正确引入。

### 必须新增一份说明文件

输出：

`F:\AI工作台\cnc_param_quickfinder\CHERRY_STUDIO_ROUND1_REPORT.md`

报告里必须写清楚：

1. 这轮改了哪些文件
2. 每个文件改了什么
3. 首页软件化做了哪些增强
4. 工作区软件化做了哪些增强
5. 学习地图 / 目录钻取做了哪些承接
6. Gemini 二轮数据到位后，哪些地方已经可以直接接入
7. 哪些地方仍然需要后续补强

---

## 验证要求

你不能只改代码不验证。

至少验证这些：

1. 页面能正常打开
2. 首页入口区正常显示
3. 工作区图文模式正常显示
4. 目录树点击后有联动
5. 没有把原有访问控制、本地图文模式、详情区浏览逻辑搞坏

如果有本地验证结果，请在报告里写出来。

---

## 完成标准

只有同时满足以下条件，才算这轮完成：

- 首页更像软件入口
- 工作区更像资料软件
- 学习地图 / 分类钻取承接层已搭好
- 图片体验明显增强
- Gemini 二轮数据接入口已预留
- `CHERRY_STUDIO_ROUND1_REPORT.md` 已生成

