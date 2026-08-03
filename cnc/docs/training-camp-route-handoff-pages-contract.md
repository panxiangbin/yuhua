# CNC 训练营一次性路线交接 Pages 精确部署契约

## 目标

为 `cnc/training-camp.html` 建立独立的公网部署门禁，避免只验证“训练营已进入 Service Worker 核心缓存”，却没有确认训练营生产页面本身已经与 `main` 和 GitHub Pages 公网逐字节一致。

## 精确部署范围

每次门禁必须使用禁止缓存请求读取并比较：

- `cnc/training-camp.html`；
- `cnc/sw.js`；
- `cnc/build-info.json`。

`main` 与 Pages 公网必须同时满足：

1. HTTP 请求成功；
2. 字节数完全一致；
3. SHA-256 完全一致；
4. 站点构建为 `20260801-ai-handoff1`；
5. PWA 构建为 `20260802-pwa8`；
6. 训练营存在于 11 项核心预缓存中，且核心资源无重复。

拉取请求阶段允许当前分支的生产资源尚未进入 `main`，但不得把这种状态写成“已部署”。`main` 正式运行时不允许分支、`main` 与 Pages 仍不一致。

## 一次性交接消费端契约

公网训练营页面必须保留以下边界：

- 固定键 `cnc_beginner_placement_route_handoff_v1` 只从当前标签页的 `SessionStorage` 读取；
- 读取到原始值后，必须在 JSON 解析、字段校验和页面显示之前删除固定键；
- 最长有效期为 5 分钟；
- `critical-safety`、`low-score`、`foundation-gap`、`advanced-ready` 四种分类分别绑定唯一受控标题、说明、第一步入口和前三步；
- 分类与标题、说明、入口或任一步骤不完全一致时，整份载荷必须拒绝；
- 最终展示必须采用受控目录的数据，不得直接信任临时载荷文字或链接；
- 标题、路线和步骤只能通过 `textContent`、`createTextNode`、`replaceChildren` 等纯文本方式渲染，临时路线渲染区不得使用 `innerHTML`；
- 已消费路线在刷新、`pagehide` 和真实 BFCache 返回时不得重新出现；
- 不得把固定交接键降级写入 URL、LocalStorage、IndexedDB、成绩、XP、成长档案或错题记录。

训练营依据正式学习记录生成的“系统推荐”与本次测评临时路线必须继续分开显示，任何临时数据不得覆盖正式学习记录。

## 中文可信边界

公网页面必须明确说明：

- 测评推荐不代表现场上机许可；
- 训练内容不能替代相同版本机床原厂手册、企业安全制度、现场指导、上机授权和现场监护；
- 实际按键、回零、刀补、报警和安全要求可能随系统、机型、厂家参数和企业制度变化。

不得新增固定上机值、参数写入步骤、联锁绕过、盲目复位或未经验证的现场放行方法。

## 诊断产物

工作流无论成功或失败都必须上传 Artifact，至少包含：

- 工作流初始化信息；
- 每次公网轮询的 HTTP、字节数、SHA-256、缓存头和最终 URL；
- 当前分支、`main` 与 Pages 的匹配状态；
- 一次性交接、受控路线、纯文本渲染、BFCache 清理、SessionStorage-only 和核心缓存验收结果；
- 失败堆栈或成功摘要。

不得使用 `test.skip`、`describe.skip`、`it.skip`、`process.exit(0)` 或零次轮询绕过门禁，也不得把 cancelled、skipped、queued 或 in-progress 当作成功。
