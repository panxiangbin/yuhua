# AI CNC 老师 Pages 公网部署验收契约

## 目标

AI CNC 老师涉及新手训练建议、高风险拒答、来源追溯和离线使用。仓库文件通过测试，不等于公网已经部署，也不等于浏览器正在使用同一版本。本契约要求同时核验当前分支、远程 `main` 与 GitHub Pages 公网资源。

## 精确核验资源

每次门禁同时读取：

- `cnc/ai-teacher.html`
- `cnc/sw.js`
- `cnc/build-info.json`

远程 `main` 与 Pages 公网必须字节长度一致、SHA-256 一致，并使用随机查询参数、`no-store` 和禁止缓存请求头，防止旧缓存造成误判。

## AI 老师可信问答边界

公网页面必须继续保持：

- 中文页面和面向零基础的说明；
- 浏览器本地运行，不调用外部模型，不上传学习数据；
- 对固定上机参数、具体参数写入、联锁绕过和盲目复位进行明确阻断；
- 明确显示“已阻断高风险请求”和“无法给出可直接上机的固定值或绕过步骤”；
- 每条回答展示“依据来源与可信状态”；
- 链接内容可信度状态页和证据台账；
- 明确资料清单与逐条复核记录不能互相代替；
- 要求按相同系统、机床型号和版本核对原厂手册；
- 不包含 `fetch`、`XMLHttpRequest`、`WebSocket`、`EventSource` 或站外 URL。

技术内容仍属于教学参考。不确定的机床参数、报警、刀补和安全步骤必须核对原厂手册、现场工艺并进行受控空运行验证。

## PWA 与构建一致性

门禁必须确认：

- `ai-teacher.html` 的站点构建号等于 `build-info.json` 的 `build`；
- `sw.js` 的 PWA 构建号等于 `build-info.json` 的 `pwaBuild`；
- Service Worker 的核心资源清单包含 `ai-teacher.html`、`ai-teacher-intake.html` 和 `build-info.json`；
- Service Worker 继续保留缓存修复消息和安装诊断能力。

## 两阶段部署边界

拉取请求阶段允许当前分支资源暂时不同于远程 `main`，但必须：

1. 当前分支自身通过全部可信问答和构建契约；
2. 当前 `main` 与 Pages 公网保持逐字节一致；
3. 诊断中明确记录 `branchDeploymentPending: true`，不得宣称分支改动已经上线。

合并到 `main` 后，由 `push` 触发的同一门禁必须满足：

- 当前检出资源与远程 `main` 完全一致；
- 远程 `main` 与 Pages 公网完全一致；
- `branchDeploymentPending: false`。

只有合并后复验成功，才允许报告新版 AI CNC 老师已经正式部署。

## 失败处理

失败时必须保留结构化 `report.json` 和 `findings.txt`，读取真实 HTTP 状态、SHA-256、字节数、构建号和语义检查结果。不得减少重试次数到 0、跳过测试、冻结旧构建号或把未部署状态解释为成功。
