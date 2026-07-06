# 路由修复验证报告

- 验证时间：2026-07-03 15:27-15:32
- 验证对象：`app.js`（当时修改时间 2026-07-03 15:23:09.345，64375字节，`node -c app.js` 通过）
- 验证方式：真实浏览器整页硬刷新（`about:blank` → 目标URL，避免hash-only跳转造成的假阳性），非代码阅读推测

---

## 1. `#study-map` 实际激活视图

**`view-learning-map`（正确，符合预期）**

```
整页硬刷新打开 http://localhost:8791/index.html#study-map，600ms后读取：
{
  "hash": "#study-map",
  "href": "http://localhost:8791/index.html#study-map",
  "activeView": "view-learning-map",
  "appDefined": "object"
}
```
`location.href` 没有被篡改，停在 `#study-map`；`.view.active` 是 `view-learning-map`，不再是之前几轮反复出现的 `view-dashboard`/`view-library`。**这次是真正跳过去了，不是假象。**

## 2. `#workspace` 实际激活视图

**`view-workspace`（正确，符合预期）**

```
整页硬刷新打开 http://localhost:8791/index.html#workspace，600ms后读取：
{
  "hash": "#workspace",
  "href": "http://localhost:8791/index.html#workspace",
  "activeView": "view-workspace",
  "resultListChildren": 120,
  "statEntries": "1974"
}
```
视图正确，且顺带确认了内容不是空壳：左侧结果列表渲染了120条（`renderWorkspace()`里`slice(0,120)`的上限，说明实际命中数≥120），首页统计字段`1974`（非0）。

**结论：`loadKnowledgeCore(silent)` 这处补丁对路由本身是有效的，`CLAUDE_CODE_AUDIT_ROUND2_20260703.md`里给1号的补丁1施工单已被正确执行**（`app.js`第1295行`async function loadKnowledgeCore(silent)`，两处`navigate("library")`都改成了`if (!silent) navigate("library")`，`bootstrap()`里自动调用处改成了`await loadKnowledgeCore(true)`）。

---

## 3. 按钮回归测试结果

**不通过。补丁引入了一个新的、真实存在的回归问题，不是推测——已用真实点击验证。**

### 问题现象
在`#study-map`/`#workspace`验证完之后，先手动切到`view-study`视图（离开library，制造可观察的跳转差异），再对`#load-core-library`按钮执行真实`.click()`（走真正的`addEventListener`触发路径，等同用户手指点击）：

```json
{
  "buttonExists": true,
  "beforeClickView": "view-study",
  "afterClickView": "view-study",   // ← 点击后视图没有变化，应该跳到 view-library
  "libraryLogText": "核心知识库包已经加载过，不再重复加载。核心知识库包已加载 3 个脚本，开始并入条目。"
}
```

`library-log`证明点击确实触发了`loadKnowledgeCore()`（日志文案对上了早返回分支"已经加载过，不再重复加载"），说明函数被正常调用了，**但`navigate("library")`没有执行**，视图停留在原来的`view-study`没有跳转。

### 根因
`app.js`第1449行：
```js
dom.loadCoreButton.addEventListener("click", loadKnowledgeCore);
```
这里把`loadKnowledgeCore`函数**直接作为事件处理器引用**传给`addEventListener`。浏览器触发click事件时，会把**click事件对象（MouseEvent）**作为第一个参数传给这个处理器——而这个第一个参数位置现在恰好是新加的`silent`参数。`MouseEvent`对象是truthy，所以`if (!silent)`里的`!silent`恒为`false`，`navigate("library")`被跳过了——**这不是原来施工单要的效果，是1号加`silent`参数时漏掉了这一处调用点的副作用**。

补丁清单里其实提到过这个按钮"不用改"，但那是指"不用加silent参数调用"，没有考虑到`addEventListener`直接传函数引用这种写法本身会让第一个参数被事件对象占用——这是一个经典的JS陷阱（把函数当处理器直接传，而不是包一层箭头函数），补丁施工单本身对这一点交代得不够精确，导致1号改完之后这个副作用没被发现。

---

## 4. 下一步修复方案

**改哪个文件**：`app.js`
**改哪一块**：第1449行 `dom.loadCoreButton.addEventListener("click", loadKnowledgeCore);`
**具体改法**：改成箭头函数包一层，显式不传参数：
```js
dom.loadCoreButton.addEventListener("click", () => loadKnowledgeCore());
```
这样点击事件对象不会泄漏进`loadKnowledgeCore`的参数列表，`silent`在按钮点击场景下会是`undefined`（等价于`false`），`navigate("library")`会正常执行。

**同时要检查**：`app.js`里搜索`addEventListener("click", loadFullLocalArchive)`这一类写法（`loadFullLocalArchive`函数目前虽然没有`silent`参数，但如果后续有人对它做同样的`silent`参数改造，会踩到一模一样的坑）——建议1号顺手确认`#load-full-library`按钮的绑定方式，如果也是直接传函数引用，先记录风险，暂不用动，等真的要给`loadFullLocalArchive`加`silent`参数时一并改成箭头函数写法。

**验证方式**（1号改完后，交给2号或自行验证均可，但必须真实点击，不能只读代码）：
1. 整页硬刷新打开`#study-map`，确认停在`view-learning-map`（回归确认，不能因为这次改动把已经修好的路由改坏）
2. 手动切到非library的任意视图（如`study`）
3. 对`#load-core-library`执行`.click()`或用鼠标真实点击
4. 检查`document.querySelector('.view.active').id`，必须变成`view-library`
5. 检查`#library-log`最新一条日志文案，确认和点击行为对应（"已经加载过"或"已加载N个脚本"）
