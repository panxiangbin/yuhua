# 2号（Claude Code）第二轮深度审计报告

- 审计时间：2026-07-03 15:00-15:15
- 审计对象：`app.js`（1819行起，审计中被其他协作方持续修改，最终定稿基于本轮我改完后的版本）、`index.html`（687行）、`styles.css`（1881行）
- 前置阅读：`HANDOVER_TO_CODEX.md`、`CLAUDE_ROUTE_ROOT_CAUSE_20260703.md`
- 验证方式：`node -c` 语法检查、HTML/JS节点id交叉比对（脚本化diff，非人工数）、浏览器整页硬刷新实测（`about:blank`→目标URL，避免hash-only跳转假象）

---

## 0. 本轮改动声明（先说清楚动没动代码）

**动了。仅动了1个文件：`app.js`，且仅删除，未新增/未改逻辑。**

任务10授权范围内（"只允许修语法级错误或明显重复声明"），发现并修复了3处**明显重复的函数声明**（不是语法错误，`node -c`在改之前也是通过的，但JS允许同名`function`声明重复出现，后一份会静默覆盖前一份，前一份变成永远不会执行的死代码）：

| 函数名 | 修复前 | 处理方式 | 
|---|---|---|
| `getFeaturedImages` | 定义了2次（374行/498行，签名不同：`(entryId)` vs `(entryOrKey)`） | 删除第1份（374-393行，374行签名版本），只留第2份（原498行，签名更完整，覆盖率更高） |
| `renderGallery` | 定义了2次（976行/1052行） | 删除第1份（976-1001行） |
| `renderGalleryRich` | 定义了2次（1003行/1084行） | 删除第1份（1003-1050行） |

删除前已用两次独立 `Read` 精确核对行边界（含收尾大括号和空行），删除操作用 `Edit` 工具做精确字符串匹配替换（非按行号盲删），避免误删活代码。

**改前已备份**：`app.js` 改动前的完整快照存放在 `C:\Users\Administrator\AppData\Local\Temp\claude\F--AI---\f450b2a3-dc02-488c-98d7-f417c643bdef\scratchpad\app.js.backup_before_round2_150717`（68631字节），如需回滚可直接覆盖。

**改动后验证（全部真实执行，非推测）**：
```
$ node -c app.js
（无输出，语法通过）

$ grep -nE "^function (getFeaturedImages|renderGallery|renderGalleryRich|bindRouteButtons)\(" app.js
477:function getFeaturedImages(entryOrKey) {
955:function renderGallery() {
987:function renderGalleryRich() {
1320:function bindRouteButtons() {
```
每个函数名现在唯一出现一次。浏览器整页硬刷新后实测（`about:blank` → `http://localhost:8791/index.html`）：
```json
{
  "appDefined": "object",
  "statEntries": "1974",
  "searchResultCount": 45,   // 手动切到workspace后搜"G02"
  "galleryCards": 125         // 手动切到gallery
}
```
脚本正常执行、统计数字非0、搜索有结果、图库正常渲染——本次删除没有引入回归。

**没有动 `index.html`、`styles.css`，也没有动 `loadKnowledgeCore()` 里的路由覆盖逻辑**——那个是行为/逻辑问题，不属于"语法错误或明显重复声明"，按任务10要求不在本轮直接修复范围内，只记录、只建议，交给1号处理。

---

## 1. 当前根因排序（Top 3）

### 🥇 第1名：`loadKnowledgeCore()` 自动执行时无条件跳转，覆盖 hash 路由结果

- **位置**：`app.js` 第1295-1317行 `loadKnowledgeCore()` 函数，两个分支（1298行"已加载过"分支、1317行正常结束分支）末尾都无条件调用 `navigate("library")`。
- **触发链路**：`bootstrap()`（约1580行起）里，第1594行 `initHashRouting()` **先**正确执行——把 `#study-map`/`#workspace` 等hash正确解析并激活对应视图；但紧接着第1602行 `await loadKnowledgeCore()` 会**必然**执行（DEV_MODE下access自动放行，`state.coreLoaded`初始为`false`，触发条件恒真），执行完毕后无条件把视图和`location.hash`一起强制改成`library`，把刚才路由的结果覆盖掉。
- **实测证据**（本轮及上一轮多次复现）：整页硬刷新访问 `index.html#study-map`，`location.href`最终变成`.../index.html#library`，`activeView`是`view-library`——不是没跳，是跳完又被强制拉走。
- **同类问题**：`loadFullLocalArchive()`（约1490-1523行）末尾也有同样的无条件 `navigate("library")`，但它只在用户手动点"尝试加载完整本地索引"按钮时触发，不在自动初始化链路上，优先级低于上面这条。

### 🥈 第2名：`index.html` 与部分脚本的节点契约缺口（不崩溃，但功能静默失效）

- `#dashboard-gallery-grid`、`#workspace-mode-row` 两个id在HTML里不存在，`app.js`里对应函数都有`if (!dom.xxx) return;`判空，不会报错，但导致：首页"精选图库预览"下方一块内容永远不渲染；工作区"列表/图文"切换按钮和"仅带图"筛选按钮的高亮状态永远不同步（点击本身可能有效，但视觉状态和`data-workspace-mode`绑定逻辑对不上，`bindWorkspaceEvents`里的`dom.workspaceModeRow?.addEventListener(...)`用了可选链，同样静默失效）。
- `gallery-featured.js`（独立脚本，非app.js）需要`#cncGalleryGrid`/`#cncGalleryCount`，HTML里也不存在，该脚本第15行`if (!grid) return;`直接退出——**图片点击放大弹窗功能整个是死代码**，从未初始化过。这是我在最早那轮基线体检里就发现的问题（R5），本轮交叉核对确认依然成立、依然未修。

### 🥉 第3名：`ui-knowledge-tree.js` 里的 `fetch()` 在 `file://` 协议下必然失败，"知识地图"页面卡死

- **位置**：`ui-knowledge-tree.js` 第20行 `const response = await fetch('./knowledge-tree.json');`
- **风险**：`HANDOVER_TO_CODEX.md`第30-35行明确写着本项目的验证方法是`start index.html`（即双击打开，`file://`协议）。浏览器在`file://`源下会拦截`fetch()`本地文件请求（同源策略/CORS，不同于`<script src>`标签加载），导致这行必然抛错。`initEnhancedFeatures()`（app.js里）用`try/catch`包住了这次调用，不会白屏崩溃，但`knowledgeTreeUI.render()`永远不会拿到真实数据，"知识地图"页面会**永久停留在"正在加载知识地图..."占位符**。这正是最早基线体检发现的R8/H6现象，本轮首次定位到在`file://`环境下的确切技术原因（之前的测试环境都是`http://localhost:8791`，`fetch`本身没问题，所以没在CSS/协议层面复现出这条）。
- **注意**：这不是CSS问题，是JS的`fetch()`行为差异，放在这里是因为它是本轮排查"file://与http://表现差异"时定位到的最具体的一条。

---

## 2. 证据清单（本轮新产出，可复核）

### 2.1 语法检查
```
$ node -c app.js
（无输出 = 通过。历史上的 </article> 孤儿残留、bindRouteButtons 重复声明两处语法错误，
   在本轮审计开始前就已经被修复，不是本轮修的）
```

### 2.2 HTML/JS 节点契约交叉比对（脚本化 diff，来源：index.html 全部 id="..." vs app.js 全部 querySelector("#...")/getElementById("...")）

**JS引用但HTML缺失**（仅2个，均有判空保护，见根因第2名）：
```
dashboard-gallery-grid
workspace-mode-row
```

**data-route / view-* 容器id / VIEW_META键 三方一致性**：9个视图（dashboard/study/workspace/learning-map/gallery/calculator/library/favorites/access）**完全对齐，无缺口**。

**其余脚本（gallery-featured.js / ui-knowledge-tree.js / ui-recommendations.js）引用但HTML缺失**：
```
cncGalleryCount
cncGalleryGrid
```

### 2.3 函数重名/后定义覆盖前定义（本轮删除前的原始状态记录，供追溯）
```
374:function getFeaturedImages(entryId) {      ← 已删除（死代码）
498:function getFeaturedImages(entryOrKey) {    ← 保留（生效版本）
976:function renderGallery() {                  ← 已删除（死代码）
1003:function renderGalleryRich() {             ← 已删除（死代码）
1052:function renderGallery() {                 ← 保留（生效版本）
1084:function renderGalleryRich() {             ← 保留（生效版本）
1417:function bindRouteButtons() {              ← 只有1份，本轮之前已被修复，未再重复
```

### 2.4 DOM"先查后空用"模式审计

`dom`对象里有**5个字段被赋值后从未被引用**（грep `dom\.字段名` 全文0命中，只有定义行本身）：
```
heroMetrics        → #launchpad-stats
workspaceStatus     → #workspace-status-text
detailSource        → #detail-category   ⚠️ 和 dom.detailCategory 指向同一元素
detailImageTitle    → #detail-title      ⚠️ 和 dom.detailTitle 指向同一元素
detailImageCaption  → #detail-summary    ⚠️ 和 dom.detailSummary 指向同一元素
```
今天不会崩，因为它们从未被读写。但后3个是**潜在陷阱**：如果以后有AI"顺手"想恢复显示`entry.source`/图片标题/图片说明，直接写`dom.detailSource.textContent = ...`会**静默覆盖分类徽章**而不是新增字段——因为它俩指向同一个DOM节点。这类bug极难被发现，因为不报错、只是显示内容"莫名其妙变了"。

**判空保护不一致**：`renderWorkspace()`、`bindWorkspaceEvents()`系列函数里几乎每个`dom.xxx`访问都套了`if (dom.xxx)`；但`renderDetail()`空状态分支（约905-920行）、`renderFavoriteButton()`、`renderGallery`/`renderGalleryRich`、`renderLibraryStats()`、`renderProgressLinks()`/`renderLinkCloud()`等函数里的`dom.xxx.textContent/innerHTML`访问**完全没有判空**。今天不炸是因为这些id目前都在HTML里真实存在（已交叉核对），但这正是本项目历史上反复出现"改了HTML元素id就整体崩溃"的**根治盲区**——之前几轮的`renderHeroMetrics`/`renderWorkspace`/`renderDetail`连环崩溃，本质都是这个模式的具体案例，只是每次哪里炸了才去堵哪一个洞，没有统一处理。

### 2.5 styles.css 可见性检查
- `.view { display: none; } .view.active { display: block; }`（386-393行），无其他规则与之冲突，无`!important`覆盖，**视图切换的CSS机制本身是干净的**——之前多轮"active view切不过去"全部是JS层面`navigate()`没被调用或被覆盖，不是CSS藏了什么坑。
- 移动端媒体查询里`.topbar-right { display: none; }`（1137行）——证实了最早基线体检里发现的"手机端顶部快捷搜索按钮宽高为0"（M1问题），本轮在CSS源码层面坐实了原因。
- 全文无`url()`/`@font-face`/`@import`，styles.css本身没有file://敏感的资源加载。
- `app.js`本身无`fetch`/`XMLHttpRequest`（全部用`<script src>`动态注入加载数据，这种方式在`file://`下通常可用），但`ui-knowledge-tree.js`用了`fetch()`，见根因第3名。

---

## 3. 最小修复顺序清单（5步，附"为什么必须先做这个"）

1. **第一步：只修语法**
   现状：语法已经是干净的（本轮`node -c`通过），**这一步当前无需动作**。但必须写进施工单里作为强制前置检查——因为这个文件被多个AI并发编辑，历史上语法错误反复出现又反复被引入，任何后续步骤开始前都必须先跑一次`node -c app.js`确认仍然干净，不能想当然。
   *为什么必须先做*：语法都过不去，后面所有步骤（DOM契约、路由、搜索、UI）测出来的"失败"都是假象，会误导排查方向——之前几轮的验收循环就是在反复踩这个坑。

2. **第二步：只修节点契约**
   动作：给`index.html`补上`id="dashboard-gallery-grid"`（首页图库预览容器）和`id="workspace-mode-row"`（`.view-mode-toolbar`那个div），如果确认这两个功能当前不需要就保留现状但要在代码里加注释说明"有意跳过"，避免下一个AI以为是漏改。
   *为什么必须在路由之前做*：路由修好后所有视图都会被真实渲染到，这两个静默失效的功能才会第一次真正暴露在用户面前；如果先修路由再回头查节点契约，会把"路由问题"和"节点缺失问题"的排查结果混在一起，无法区分。

3. **第三步：只修路由激活**
   动作：处理`loadKnowledgeCore()`（1295-1317行）和`loadFullLocalArchive()`两处末尾无条件的`navigate("library")`——给函数加`silent`参数，仅在按钮点击场景保留跳转，`bootstrap()`自动调用场景传入`silent=true`跳过跳转。
   *为什么必须在节点契约之后、搜索逻辑之前做*：路由是所有视图能否被看到的前提，节点契约没修好会让路由修复的验收结果不可信（视图切对了但内容是空的，会误判"路由还没修好"）；而这一步不涉及搜索逻辑，必须独立验证通过（5个hash入口都能停在正确视图）才能进入下一步，避免跟第4步的改动混在一起排查。

4. **第四步：只修搜索逻辑**
   现状：本轮实测搜索本身其实是通的（手动导航到workspace后搜"G02"能出45条结果），**如果第三步修完后，直接从`#workspace`整页硬刷新进入仍然搜不出结果，才需要动这一步**，届时优先检查`bindWorkspaceEvents()`里`dom.searchInput`的事件绑定是否在`renderWorkspace()`触发前就已经完成。
   *为什么排在路由后面*：路由没修好之前，"搜索出不出结果"这件事根本没法在正确的视图状态下测试，任何这时候做的搜索相关改动都是盲改。

5. **第五步：再做UI**
   包括：图库放大弹窗（补`#cncGalleryGrid`/`#cncGalleryCount`节点或删除死代码）、`dom`对象里5个zombie字段清理、`file://`下知识地图的`fetch`降级方案（比如失败后改用`<script>`标签内联数据或提示用户改用本地服务器打开）、给`renderDetail`等函数补齐判空保护。
   *为什么放最后*：这些都是"改了会更好，但不改也不会阻塞主链路能不能跑通"的问题，前面4步是能不能用的问题，这一步是好不好用的问题，顺序不能颠倒。

---

## 4. 禁止误修清单

- **禁止在未重新执行`node -c app.js`确认语法干净之前，直接开始改路由或UI**。这个文件被多AI并发编辑，历史上语法错误反复被引入又反复被别人修掉，每次接手前默认"上次是好的"这个假设本身就是错的。
- **禁止把`loadKnowledgeCore()`自动调用路径和手动点击路径用同一份无条件跳转逻辑处理**——按钮点击时用户是有意要去"知识库管理"页看结果的，跳转合理；但`bootstrap()`自动触发时用户可能是从`#study-map`等其他入口进来的，跳转是在违背用户意图。这两个场景必须用参数区分，不能因为"图省事"合并处理。
- **禁止在没有先跑一遍脚本化的HTML/JS节点id交叉比对之前，就开始"顺手"调整UI样式或布局**。本项目的id命名在不同轮次的编辑中出现过好几次改名不同步（`#hero-metrics`→`#launchpad-stats`、`#workspace-status`→`#workspace-status-text`、`#detail-risk`→`#detail-risk-badge`等），任何UI改动前必须先确认自己要动的id现在到底叫什么，不能凭记忆或凭上一版代码的印象。
- **禁止把公网授权逻辑（`ACCESS_PROFILES`/`grantAccess`/邀请码哈希）和本地试用逻辑（`DEV_MODE`/`isLocalTrustedEnvironment`）混在一起改**。`HANDOVER_TO_CODEX.md`里记录了用户对"访问控制反复修不好"极度不满的原话（"你再骗我一次，，我就不让你当总指挥了"），这两套逻辑当前是分开判断、互不影响的干净状态（`initAccess()`里`DEV_MODE`和`isLocalTrustedEnvironment`各自独立return），任何"顺手优化"合并这两套逻辑的冲动都必须打住——公网部署时这套访问控制是要真正生效的，本地开发时的绕过逻辑绝不能泄漏到公网分支里。
- **禁止让多个AI同时改同一段`app.js`**。本轮审计期间，`app.js`在我读取过程中就至少被外部改动了2次（文件大小从67204→67948→68631字节，mtime分别是14:46/14:35/15:06附近），每次行号都在漂移。如果两个AI同时对同一函数做字符串级替换，极可能出现"编辑基于的旧内容"和"实际最新内容"不一致导致改坏文件而不自知。建议：动手改之前先报一声"我要改XX函数"，改完立刻说"改完了，现在可以改别的了"，形成简单的互斥。
- **禁止仅凭代码阅读就下"已修复"结论**。本报告前几轮的教训是：语法看起来改对了但漏删了残留片段、函数守卫看起来加对了但没有整页硬刷新验证。任何"改完了"的结论前必须至少跑一次`node -c`和一次整页硬刷新的浏览器实测，缺一不可。

---

## 5. 给1号执行的补丁清单（施工单格式）

### 补丁1：拆分 `loadKnowledgeCore()` 的自动/手动跳转行为
- **改哪个文件**：`app.js`
- **改哪一块**：`loadKnowledgeCore()` 函数（当前约1295-1317行，行号会漂移，用函数名定位）；`bootstrap()` 里调用它的那一行（当前约1602行，`await loadKnowledgeCore();`）；`bindAccessEvents()` 里邀请码提交成功后调用它的那一行（用`loadKnowledgeCore()`调用点搜索定位，非按钮点击场景）
- **具体改法**：函数签名改成 `async function loadKnowledgeCore(silent) {`，两处 `navigate("library");` 都改成 `if (!silent) navigate("library");`。`bootstrap()`里的自动调用改成 `await loadKnowledgeCore(true);`。`bindAccessEvents()`里邀请码提交成功后的自动调用同样改成 `await loadKnowledgeCore(true);`。`#load-core-library`按钮的点击绑定（`dom.loadCoreButton.addEventListener("click", loadKnowledgeCore)`）**不用改**，此时`silent`参数是`undefined`，等价于`false`，跳转行为保持不变。
- **预期效果**：整页硬刷新打开`index.html#study-map`，视图应稳定停在`view-learning-map`，不再被自动加载逻辑拉到`view-library`。
- **验证方式**：`about:blank`跳转到`http://本地服务器/index.html#study-map`（不能只改hash不刷新），执行 `document.querySelector('.view.active').id`，必须是`view-learning-map`。同样方式验证`#workspace`应停在`view-workspace`。改完后额外点一次"加载核心知识库包"按钮，确认它依然能正常跳到知识库管理页（回归测试，不能把按钮场景的跳转也误删了）。

### 补丁2：补齐或明确废弃两个缺失节点
- **改哪个文件**：`index.html`
- **改哪一块**：首页"精选图库预览"区域（搜索`featuredImagesPreview`附近，需要新增一个`id="dashboard-gallery-grid"`的容器，或确认`renderDashboardGallery()`这个功能是否还需要）；工作区"列表/图文"切换按钮所在的`.view-mode-toolbar`容器（补上`id="workspace-mode-row"`）
- **预期效果**：首页图库预览区能显示内容；工作区列表/图文模式切换按钮的高亮状态能正确同步，"仅带图"筛选按钮点击后状态能正常显示。
- **验证方式**：整页硬刷新首页，检查精选图库预览区是否有图片卡片渲染；进工作区点"列表"模式按钮，检查该按钮是否获得`active`class。

### 补丁3（低优先级，可延后）：图库放大弹窗死代码处理
- **改哪个文件**：`index.html`（补节点）或 `gallery-featured.js` + `index.html` 同时改（改用现有的`#gallery-grid`容器）
- **预期效果**：图库页点图片能弹出放大预览
- **验证方式**：图库页点任意图片卡片，检查`#cncGalleryModal`是否被加上`is-open`class

---

## 6. 学习页 / 工作区 / 详情页 / 授权页 代码结构点评

**目标不是改，是判断哪些能复用、哪些要推倒重来。**

### 学习页（`view-study`）
- 现状：4张路线卡片直接绑`data-entry-id`跳转到工作区对应详情，逻辑简单直接，**这部分已具雏形，可以直接复用**，不需要额外的路由或状态管理。
- 问题：内容目前是硬编码在`index.html`里的静态4条（坐标系/G02G03/报警/参数换算），和`learning-path-system.html`（2455行，技能树可视化+成就系统+打卡热力图，功能重得多）完全是两套独立实现，后者从未被集成。这是**结构性冗余**：两份代码都叫"学习路线"，服务同一个产品目标，但互不知道对方存在。继续在当前`view-study`上堆功能，还是切换到`learning-path-system.html`那套更完整的实现，是一个必须在动手前拍板的决策，不能两边都改。

### 工作区（`view-workspace`，搜索+列表+详情）
- 现状：这是全站唯一同时具备"真实数据接入+可用交互"的模块——本轮实测搜索"G02"能出45条结果，说明`getFilteredEntries()`/`scoreEntry()`这套过滤打分逻辑是扎实的，**这部分是全站最值得复用、最不该推倒重来的核心**。
- 问题：`renderWorkspace()`一个函数长达67行（828-895行），同时负责状态文案更新、搜索元信息更新、列表渲染、事件绑定4件事，且列表渲染部分用字符串拼HTML后整体`innerHTML`替换，每次搜索都会销毁重建所有DOM节点和事件监听器——数据量小（当前178+条）时无感，但如果后续接入`04_数控知识库`那4万+文件的完整索引，这种全量重渲染会成为明显的性能瓶颈。**不需要现在改**，但要在3号或后续任务的技术决策里提前标注这个风险点。

### 详情页（`view-workspace`右侧detail区）
- 现状：字段覆盖全（标题/分类/代码/摘要/新手理解/使用场景/风险/示例/下一步/原文预览/配图/相关推荐），信息架构设计是合理的，**结构本身可以复用**。
- 问题：`renderDetail()`函数里"空状态"分支和"有内容"分支各写了一遍几乎相同字段列表的赋值代码（905-920行 vs 925-936行），任何新增字段都要在两处同步改，本轮发现的`dom`对象5个zombie字段很大程度就是这种重复结构导致的遗留（改了一处忘了改另一处，或者两处都改错成同一个元素）。**这块代码组织方式已经在阻碍维护**，建议后续用一个`renderDetailField(dom节点, 值, 默认值)`的小工具函数统一两个分支的赋值逻辑，但这是重构级别的改动，不建议在当前"先让它能跑起来"的阶段做。

### 授权页（`view-access`）
- 现状：分享中心UI、邀请码复制、公网地址展示这些**纯展示逻辑已经完整**，`renderAccessCenter()`职责单一、有完整判空保护（255行`if (!dom.xxx) return;`），是本次审计里代码质量最好的一块。
- 问题：`ACCESS_PROFILES`里的邀请码是明文写在前端源码里的（`code: "xp-cnc-follower-2026"`这种），配合`sha256Hex`做客户端哈希校验——这只是"防看不防拆"的弱保护，任何打开浏览器控制台的人都能直接读到明文邀请码。`HANDOVER_TO_CODEX.md`里也提到"真正强控制要上Cloudflare Access或带登录后端"，这个认知是对的，当前实现只适合"防止随手转发链接被陌生人看到"这种轻量场景，**不要在没有后端的前提下把它当成真正的访问控制来宣传**。

---

## 7. 给3号的数据层任务建议

（3号=数据/知识库整理方向的AI，以下是建议的任务范围，不是本轮我要做的事）

1. **抽离"条目schema"为独立规范文档**：当前`normalizeEntry()`（app.js约330-347行）定义的字段集（id/category/title/code/summary/usage/beginner/warning/example/nextLearn/risk/source/tags/aliases）分散在代码注释里，没有独立的JSON Schema文档。建议3号把这14个字段的类型、必填/可选、取值范围（比如`risk`目前只看到"中"/"高"两种值，是否还有"低"？）整理成一份`ENTRY_SCHEMA.md`或`entry.schema.json`，后续无论是Gemini CLI生成的`knowledge-index-master.json`还是人工整理的数据，都能对照校验，避免字段名对不上（比如`beginner`还是`beginnerTip`这种细节分歧）。

2. **规范"图片映射"三层数据的合并优先级文档**：当前`CNC_FEATURED_IMAGES`（精准）/`CNC_FEATURED_IMAGES_EXTENDED`（智能扩展）/`CNC_FEATURED_IMAGES_SUPPLEMENT`（补充）三层数据结构相似但来源不同（人工标注/AI生成/专项补充），`getFeaturedImages()`里的合并优先级逻辑（先精准、再扩展、再补充）目前只存在于代码里，没有文档说明"什么情况下一条知识点会同时出现在三层里""出现冲突时以哪层为准"。这个逻辑本轮审计时发现有过至少2次重复实现（本轮删除的死代码就是证据），说明合并规则不够清晰、容易被不同AI重新发明一遍，值得3号整理成文档固化下来。

3. **`knowledge-tree.json`/`recommended-content.json`等数据文件的契约校验**：`HANDOVER_TO_CODEX.md`提到Gemini CLI要生成8个数据文件（`knowledge-index-master.json`等），`ui-knowledge-tree.js`/`ui-recommendations.js`已经在消费其中两个。建议3号在这些文件生成后，写一个轻量校验脚本（Node即可，不需要引入新框架），确认字段结构和`app.js`里`KnowledgeTreeUI`/`RecommendationsUI`两个类实际读取的字段名完全匹配——本次审计的经验是，"数据生成完了"和"数据能被现有代码正确消费"之间经常有落差，这个落差往往要等到页面渲染成空白才会被发现。

4. **42,294个知识库文件的批量整理，建议先分层不分块**：`HANDOVER_TO_CODEX.md`显示`06_考证职业`目录下有40,439个文件，占了整个知识库95%的体量，和其余7个目录（编程基础/机床操作/CAM软件/刀具工艺/故障维修/检测质量/行业资讯/加工案例，加起来才1600多个文件）体量悬殊。建议3号优先处理体量小但和产品核心功能（G代码速查、报警排查、参数换算）强相关的这1600多个文件，`06_考证职业`这类体量巨大但和"车间速查"场景关联度存疑的内容可以放在后面单独评估是否需要全部接入，避免为了"数字好看"而把不匹配产品定位的内容强行塞进搜索索引，稀释真正高频查询内容的搜索权重。

---

## 8. 未验证事项声明

- `file://`协议下的实际表现**未做真实浏览器验证**——本轮结论（"`ui-knowledge-tree.js`的`fetch`会在file://下失败"）基于浏览器同源策略的标准行为推断和代码逐行阅读，不是在真实`file://`环境里打开过验证。建议1号或3号后续用`start index.html`真实测一次并把控制台报错贴出来，坐实这一条。
- `learning-path-system.html`/`cnc-calculator-suite.html`/`cnc_program_checker_optimizer.html`三个独立组件本轮**未做代码审计**，只在上一轮基线体检里确认过它们是"无人引用的孤儿页面"，本轮结构点评部分对`learning-path-system.html`的描述（技能树/成就系统等）来自`HANDOVER_TO_CODEX.md`的文字说明，不是我自己读代码验证的。
- 补丁1（`loadKnowledgeCore`拆分）、补丁2（补节点）**均未实际执行**，只给出施工单，按用户本轮指令这两处不属于"语法错误或明显重复声明"，未授权我直接改，留给1号执行后我可以做独立验收。
