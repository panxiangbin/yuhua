# Cherry Studio 返修任务

你上一轮不是完全通过，而是**部分完成 + 存在实质性集成故障**。

这轮不要继续做新设计，不要继续扩展新功能。

你只做一件事：

**把上一轮已经做出来的前端软件化增强，修到真正可用。**

---

## 当前已确认的问题

下面这些问题不是猜测，是已经实际验证出来的：

### 问题 1：首页启动台没有真正渲染出来

实测结果：

- 页面能打开
- 但 `.launchpad-card` 数量为 `0`

已定位原因：

- `index.html` 中大量新增节点使用了弯引号/错误引号
- 例如：
  - `class=”launchpad-card”`
  - `data-route=”learning-map”`

这会导致浏览器无法按预期识别 class 和属性，CSS 和 JS 绑定都失效。

### 问题 2：知识地图视图没有真正显示树内容

实测结果：

- 进入 `learning-map` 视图后
- 工具栏按钮存在
- 但：
  - `treeNodeCount = 0`
  - `categoryCardCount = 0`
  - `knowledgeTreeCanvas` 没显示
  - placeholder 还在

说明：

- 你虽然接入了 `ui-knowledge-tree.js`
- 但真正渲染没有跑通

### 问题 3：页面存在真实运行时报错

实际浏览器报错：

- `Cannot set properties of null (setting 'innerHTML')`

这说明你的增强逻辑里有节点选择或初始化顺序问题，至少有一个容器实际不存在或没有正确匹配到。

### 问题 4：推荐系统点击逻辑有 bug

已定位代码问题：

在 `ui-recommendations.js` 中：

```js
link.dataset.entryId = rec.id || rec.knowledgeId;
...
if (window.app && rec.id) {
  window.app.selectEntry(rec.id);
}
```

问题在于：

- 数据里很多推荐项只有 `knowledgeId`
- 点击时却只认 `rec.id`
- 所以推荐项可能能渲染，但点击不工作

### 问题 5：window.app.selectEntry 内部调用了未定义函数

已定位：

`app.js` 里导出的：

```js
window.app = {
  selectEntry: (id) => {
    const entry = state.entries.find(e => e.id === id);
    if (entry) {
      selectEntry(entry);
    }
  }
}
```

这里内部调用的 `selectEntry(entry)` 在实际运行里报：

- `ReferenceError: selectEntry is not defined`

说明你导出的桥接方法写错了，不能正常从外部模块打开条目详情。

---

## 你这轮必须完成的事

### 1. 修正 index.html 中所有错误引号

要求：

- 全部恢复为标准 HTML 引号
- 确保 class、id、data-* 属性都能被正常识别

### 2. 修复首页启动台真实渲染

目标：

- `.launchpad-card` 必须真实出现在 DOM 中
- CSS 能命中
- 点击路由能工作

### 3. 修复知识地图真实渲染

目标：

- `knowledge-tree.json` 能加载时显示真实树内容
- 如果加载失败，降级方案也必须真实渲染出内容
- 不能只停留在 placeholder

### 4. 修复增强初始化中的 null 容器错误

要求：

- 找到导致 `innerHTML` 报错的具体节点
- 修掉初始化顺序或节点缺失问题
- 页面打开后不能再出现这个 page error

### 5. 修复推荐系统点击行为

要求：

- 推荐项点击时同时兼容：
  - `rec.id`
  - `rec.knowledgeId`
- 点击后能真实进入对应知识点详情

### 6. 修复 window.app.selectEntry 桥接

要求：

- 不能再调用未定义函数
- 必须改成真正可用的跨模块入口

### 7. 做一轮完整回归验证

至少验证：

1. 首页启动台卡片是否显示
2. 首页卡片点击是否能跳转
3. `learning-map` 树是否真实显示
4. 分类视图是否真实显示
5. 推荐项是否可点击
6. 页面是否还有运行时错误
7. 原有工作区、图库、详情区没有被你修坏

---

## 你应该修改的文件

必须优先检查和修改：

- `F:\AI工作台\cnc_param_quickfinder\index.html`
- `F:\AI工作台\cnc_param_quickfinder\app.js`
- `F:\AI工作台\cnc_param_quickfinder\ui-knowledge-tree.js`
- `F:\AI工作台\cnc_param_quickfinder\ui-recommendations.js`
- `F:\AI工作台\cnc_param_quickfinder\styles-enhanced.css`

---

## 你必须新增的报告

输出：

`F:\AI工作台\cnc_param_quickfinder\CHERRY_STUDIO_FIX_REPORT.md`

里面必须写清楚：

1. 修了哪些文件
2. 每个文件修了什么 bug
3. 首页启动台是否恢复正常
4. 知识地图是否恢复正常
5. 推荐项点击是否恢复正常
6. 是否还存在浏览器报错
7. 你实际做了哪些回归验证

---

## 完成标准

只有同时满足以下条件，才算这轮返修完成：

- 首页 `.launchpad-card` 数量正常
- `learning-map` 不再只有 placeholder
- 推荐项点击可用
- `window.app.selectEntry` 可用
- 页面打开后不再出现 `Cannot set properties of null (setting 'innerHTML')`
- `CHERRY_STUDIO_FIX_REPORT.md` 已生成

