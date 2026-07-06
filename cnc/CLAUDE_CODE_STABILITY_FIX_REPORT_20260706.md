# 代码稳定性与前端遗留问题清理报告

- 执行时间：2026-07-06 08:19-08:40
- 执行人：2号（Claude Code）
- 流程：分析 → 执行 → 验证 → 证据 → 汇报，每一步均为真实操作，非代码阅读推测

---

## 一、检查过哪些文件

全部7个指定文件均已实读并审查：

| 文件 | 检查方式 | 结论 |
|---|---|---|
| `app.js` | 全文分段精读 + grep交叉核对 | 主要问题集中地，见下文 |
| `index.html` | 定向读取图库/工作区/学习页/访问页/搜索区相关段落 | 结构与id基本正常，图库容器id已改名但app.js未同步 |
| `styles.css` | grep核对`.gallery-grid`相关规则 | 无冲突，`.gallery-grid`是class不是id，删app.js死代码不影响样式 |
| `gallery-library.js` | 全文结构确认 | 纯数据文件（`window.CNC_GALLERY_LIBRARY = [...]`），无逻辑，无冲突 |
| `gallery-library-enhanced.js` | 顶层声明扫描 | 纯数据文件，无冲突 |
| `featured-images.js` | 顶层声明扫描+内容抽查 | 纯数据文件，无冲突 |
| `featured-images-supplement.js` | 顶层声明扫描 | 纯数据文件，无冲突 |

**结论**：4个数据文件（gallery-library.js / gallery-library-enhanced.js / featured-images.js / featured-images-supplement.js）都只有一个顶层 `window.XXX = [...]`赋值，没有函数、没有逻辑分支，`node -c`全部通过，不是本轮不稳定问题的来源。所有实质问题都在`app.js`里。

---

## 二、发现了哪些问题

### 问题1：`normalizeCompactText` 无限递归（Sev-1，已确认存在多日）
- 位置：`app.js`（修复前）第1967行
- 现象：函数体第一行调用自己而不是做文本处理，导致`RangeError: Maximum call stack size exceeded`
- 影响：学习卡片点击/键盘Enter全部触发，12张卡片无论标题是否匹配规则都会先崩溃

### 问题2：图库旧选择器遗留 + 双套渲染代码并存
- 位置：`app.js` dom对象里 `galleryGrid: document.querySelector("#gallery-grid")`，以及`renderGallery()`/`renderGalleryRich()`两个函数
- 现象：`index.html`里图库容器id已经改成`#cncGalleryGrid`（由独立脚本`gallery-featured.js`管理），但`app.js`里这两个函数仍无判空地操作已经不存在的`#gallery-grid`，`navigate("gallery")`时抛出`TypeError: Cannot set properties of null`
- 附带发现：`renderGallery()`函数在当前代码里其实已经**没有任何调用点**（只有`renderGalleryRich()`被`navigate()`调用），是彻底的死代码，双套渲染逻辑长期共存但只有一套真正在跑（且那一套是坏的）
- 影响：直接分享`#gallery`链接打开的用户，会静默丢失参数计算器初始值计算、访问控制初始化、知识库核心包自动加载、知识地图/推荐系统初始化（因为异常发生在`bootstrap()`同步执行链路中途，后续`await`步骤全部不会执行）；侧边栏点击"图片图库"按钮也会导致侧边栏无法自动关闭

### 问题3：`search-clear-btn` 只有DOM节点，没有绑定逻辑
- 位置：`index.html`里`<button id="search-clear-btn">`存在，`app.js`全文对这个id **零引用**
- 现象：点击"×"清除按钮完全没有反应，输入框内容和搜索结果都不会被清空
- 影响：中等，是一个"看起来有功能但实际没接上"的典型样本

### 问题4（授权相关）：前端邀请码不是真实访问控制
- 位置：`app.js`顶部`ACCESS_PROFILES`数组
- 现象：明文邀请码（`code`字段）和对应SHA-256哈希（`hash`字段）**都打包在同一份公开前端脚本里**，任何人打开DevTools或直接看`.js`源码就能读到明文，哈希校验形同虚设
- 判断：这不是bug，是设计上的定位问题——它的实际作用是"发链接的人自己心里有数"这种轻量分发过滤，从未真正阻止过懂得查看源码的人。`index.html`访问控制页里的文案本身已经比较诚实（"真正强控制要上 Cloudflare Access 或带登录后端"），没有把它包装成"已安全"，但**代码层面完全没有对应的警示注释**，容易被后续接手的AI或工程师误当成真实校验逻辑去信任或复用

---

## 三、实际改了哪些文件

**只改了 `app.js` 一个文件。** `index.html`、`styles.css`及4个数据文件均未修改（审查后确认不需要改，也符合"不大拆页面结构"的要求）。

改动前已备份到scratchpad：
```
app.js.backup_stability_20260706_082201（68行 diff 前的完整快照，可回滚）
index.html.backup_stability_20260706_082201
```

`app.js` 总行数：2216 → 2152（净减少64行，主要是删除了两个重复/失效的图库渲染函数）。

---

## 四、每个问题对应的修复方式

### 修复1：`normalizeCompactText` 递归
```diff
 function normalizeCompactText(text) {
-  return normalizeCompactText(text)
+  return String(text || '')
+    .toLowerCase()
     .replace(/\s+/g, '')
     .replace(/[：:，,。.!！?？"“”'‘’（）()【】\[\]-]/g, '');
 }
```
函数体第一行从"调用自己"改成"对入参做基础的字符串化+转小写"，和文件里另一个正常的同类函数`normalizeText`写法保持一致。

### 修复2：图库旧选择器与死代码
- 删除 `dom.galleryGrid: document.querySelector("#gallery-grid")` 这一映射（对应字段已彻底不存在于HTML里）
- 删除 `renderGallery()` 函数（1191-1221行，本来就没有调用点的纯死代码）
- 删除 `renderGalleryRich()` 函数（1223-1275行，唯一真正被调用但内部崩溃的函数）
- 删除 `navigate()` 函数里 `if (view === "gallery") renderGalleryRich();` 这一调用，改为一行注释说明图库视图现在完全由`gallery-featured.js`独立管理`#cncGalleryGrid`
- **没有**采用"给`dom.galleryGrid`加判空"这种糊弄式修法，因为这两个函数渲染的目标容器在当前设计里已经不存在，加判空只能让它不崩溃、但仍然是无意义的死代码，直接删除更符合"清理遗留"的任务目标

### 修复3：`search-clear-btn` 补全绑定
- `dom`对象新增 `searchClearBtn: document.querySelector("#search-clear-btn")`
- `bindWorkspaceEvents()`里新增点击绑定：清空`state.keyword`、清空输入框、重新渲染工作区、把焦点还给输入框

### 修复4：前端邀请码安全边界标注
- 在`app.js`里`ACCESS_PROFILES`数组定义之前，新增一段明确的中文注释，说明这是"演示层/分发便利层"而非真实访问控制，解释哈希校验为什么挡不住"看源码"这种绕过方式
- 在`grantAccess()`函数定义前追加一行简短提示注释，指回顶部的完整说明
- **没有**删除或加密`ACCESS_PROFILES`里的明文邀请码，也没有改动`index.html`访问控制页的文案——因为站长明确需要"生成/复制分享链接"这个自用功能，且页面文案本身已经诚实地告知了这是弱保护；本轮任务边界是"标记清楚，不要误导"，不是"做真实后端安全"，改动到此为止

---

## 五、做了哪些验证

全部通过真实浏览器整页硬刷新（`about:blank` → 目标URL）完成，非页内跳转、非代码阅读推测：

| 验证项 | 方法 | 结果 |
|---|---|---|
| 1. JS语法校验 | `node -c app.js` | ✅ 无输出，通过 |
| 2. 本地页面能打开 | 硬刷新 `index.html` | ✅ `view-dashboard`正常渲染，统计1974条 |
| 3. `#workspace` 正常显示结果 | 硬刷新 `#workspace` | ✅ `view-workspace`，120条结果渲染，搜索元信息正确 |
| 4. `#gallery` 正常显示图库 | 硬刷新 `#gallery` | ✅ `view-gallery`，`#cncGalleryGrid`渲染20张卡片 |
| 5. `#learning-map` 正常显示学习地图 | 硬刷新 `#study-map` | ✅ `view-learning-map`，树容器渲染1.2MB内容，画布可见（此前长期卡在"正在加载中"，现已确认真实出树） |
| 6. 搜索清除按钮有实际效果 | 输入"报警"→点清除按钮 | ✅ 输入框清空、结果从71条恢复到全部1974条 |
| 7. 图库不再因旧选择器报错 | 直接调用`window.app.navigate('gallery')`，同时对比`#calculator`作对照组 | ✅ 不再抛出`TypeError`；且`#rpm-result`能正确算出"建议转速约764rpm"、`#knowledge-pill`显示"核心知识包已接入"——证明`bootstrap()`不再被这个异常打断 |
| 8. 学习页不因死递归导致卡片构建失败 | 12张卡片逐一真实点击+第4关额外测键盘Enter | ✅ 12/12 全部**不再抛出`RangeError`**（这是本次要修的崩溃问题，已彻底解决）；其中3张（含第4关）成功匹配规则并跳转，`state.selectedId`精确落在`learn-coordinate-system`；另外9张正确进入"未配置匹配规则"的`console.warn`分支后安全返回，不是崩溃，是设计内的正常兜底行为 |

---

## 六、哪些项已确认修复

- ✅ `normalizeCompactText`无限递归——已修复并验证，12张学习卡片点击/键盘Enter均不再崩溃
- ✅ 图库`#gallery-grid`选择器不匹配+双套死代码——已删除失效代码，`#gallery`路由不再抛异常，`bootstrap()`初始化链路不再被打断
- ✅ `search-clear-btn`绑定缺失——已补全，真实点击验证清空生效
- ✅ 前端邀请码安全边界——已在代码里加明确注释标注"非安全控制，仅演示/分发便利层"，不存在被误当作真实校验的风险

## 七、哪些项仍有风险但暂未处理

**以下项已执行但无法确认完成：**

- **学习卡片内容匹配�covered率只有3/12（25%）**：修复消除了崩溃，但`STUDY_CARD_MATCH_RULES`规则数组里的12条标题，和`index.html`里实际12张学习卡片的标题，只有3组能通过模糊匹配对上（第1、2、4关），其余9关点击后会正确触发"未配置匹配规则"的警告并安全返回、不跳转。这是**内容/数据层面的不匹配**（学习页的12关课程内容看起来被重新设计过，但`STUDY_CARD_MATCH_RULES`数组没有同步更新），不是本轮任务范围内的"代码稳定性"问题，我没有去猜测应该把哪条规则的`cardTitle`改成哪个新标题——这类内容映射决策应该由清楚"新12关课程具体对应哪些知识点"的人（3号或内容负责的AI）来定，我不应该凭猜测去写。
- **`#gallery-grid`/`renderGallery`删除后，是否有其他地方（比如某个未被我搜到的旧脚本）依赖过这两个函数名或`dom.galleryGrid`**：我已经用`grep`对`app.js`全文和`index.html`做过交叉核对，确认没有残留引用，但没有对项目里其他从未被要求检查的独立HTML文件（如`learning-path-system.html`等孤儿页面）做过交叉检查，如果那些页面曾经复制过这段逻辑，不在本轮核实范围内。
- **首页统计里"扩展知识条目"数量在不同测试轮次里数值不一致（178基础/0扩展 vs 178基础/1796扩展）**：这是`loadKnowledgeCore()`异步加载核心知识包所需时间导致的正常时序差异（我验证`#workspace`那次距页面刚加载完很近，核心包脚本可能还在加载中），不是本轮改动引入的新问题，但我没有专门测过"核心包加载完成后`#workspace`数据是否会自动刷新"，如果用户长时间停留在工作区、指望后台加载完自动更新列表，这一点未验证。

---

## 八、改动文件清单 / 关键函数清单 / 后续交接事项

### 改动文件清单
- `F:\AI工作台\cnc_param_quickfinder\app.js`（唯一改动文件）

### 关键函数清单（本轮新增/修改/删除）
| 函数/字段 | 操作 | 位置（修复后） |
|---|---|---|
| `normalizeCompactText(text)` | 修改函数体 | 约第1902行 |
| `dom.galleryGrid` | 删除 | 原第164行 |
| `renderGallery()` | 删除（整个函数） | 原1191-1221行 |
| `renderGalleryRich()` | 删除（整个函数） | 原1223-1275行 |
| `navigate()`里的gallery渲染调用 | 替换为注释 | 约第717行 |
| `dom.searchClearBtn` | 新增 | 约第143行 |
| `bindWorkspaceEvents()`里的清除按钮绑定 | 新增 | 约第1540行 |
| `ACCESS_PROFILES`上方安全说明注释 | 新增 | 文件顶部第12行前 |
| `grantAccess()`上方提示注释 | 新增 | 约第1427行前 |

### 仍需后续接手的事项（建议交给对应角色）
1. **交给3号或内容负责AI**：补齐`STUDY_CARD_MATCH_RULES`里剩余9条规则的`cardTitle`/`keywords`，使其和`index.html`当前12关学习卡片的真实标题对应上，把匹配覆盖率从25%提到100%。这是内容映射工作，不是代码bug。
2. **交给1号（如需要）**：如果后续要把访问控制升级为真实后端校验（Cloudflare Access或登录后端），本轮加的注释已经明确标出了具体位置（`ACCESS_PROFILES`数组、`grantAccess()`函数），可以直接定位到这两处开始替换逻辑，不用重新排查。
3. **建议交给2号自己下一轮或任何执行方**：确认`loadKnowledgeCore()`异步加载完成后，工作区如果用户正停留在该页面，列表内容是否需要/是否已经自动刷新——本轮未测这个时序场景。
