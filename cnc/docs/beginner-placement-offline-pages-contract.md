# CNC新手起点测评离线核心 Pages 公网验收契约

## 目标

本门禁专门验证 `cnc/beginner-placement.html` 不仅已经进入仓库和 Service Worker 核心清单，而且已经作为同一正式版本部署到 GitHub Pages 公网。

通用 PWA 离线核心门禁继续负责整体缓存版本；本门禁额外把起点测评生产页面本身纳入逐字节核验，避免只验证 `sw.js` 而漏掉测评 HTML 部署滞后、关键安全项硬门禁回退、无障碍语义回退或可信边界丢失。

## 受控资源

必须同时验证：

1. `cnc/beginner-placement.html`；
2. `cnc/sw.js`；
3. `cnc/build-info.json`。

远程 `main` 与 Pages 公网必须满足：

- HTTP 请求成功；
- 使用随机查询参数、`cache: no-store` 与禁止缓存请求头；
- 字节长度完全一致；
- SHA-256 完全一致；
- 最多18次真实部署等待，每次间隔10秒；
- 成功和失败都生成结构化诊断与 Artifact。

PR 合并前允许当前分支为目标 pwa7，而 `main` 与 Pages 仍为上一正式 pwa6，但只能报告 `branchDeploymentPending: true`，不得宣称 pwa7 已上线。`main` push 或手动正式验收时，当前分支、`main` 与 Pages 必须完全一致。

## PWA与核心缓存

- 分支目标 PWA 构建为 `20260802-pwa7`；
- 上一正式 PWA 构建为 `20260802-pwa6`；
- Service Worker 核心资源必须为10项且无重复；
- 核心资源必须同时包含起点测评、AI CNC老师、现场问诊单和判断说明页；
- 不允许通过在线预热起点测评冒充首次安装后的冷离线能力。

## 起点测评生产契约

目标公网测评页面必须继续包含：

- 六题进度条 `progressbar` 语义；
- 选项 `radiogroup` 语义；
- “测评只做推荐”的用途边界；
- 陌生程序验证、G00碰撞路径、首件检查和报警排查关键安全项；
- 任一关键安全项选择危险答案时，高总分不得抵消，必须推荐安全基础；
- 可见的“为什么这样推荐”判断依据；
- 答案与结果不写入长期学习记录；
- 具体参数、报警、刀补和恢复操作必须核对相同版本原厂手册；
- 高风险现场操作必须由授权人员确认。

页面不得新增 LocalStorage、IndexedDB 等长期测评写入，也不得提供固定上机值、参数写入步骤、安全联锁绕过或盲目复位方法。

## 防绕过

工作流必须使用 Node.js 24，执行 JavaScript 语法检查，禁止 `test.skip`、`describe.skip`、`it.skip`、零次重试和用 `process.exit(0)` 吞掉失败。任何失败都必须保持非零退出码；queued、in_progress、cancelled 和 skipped 均不能视为成功。

## 修改范围

只允许修改 `cnc/**` 与明确只服务 CNC 的工作流，不修改予华仪器官网根目录、仪器产品、图片、参数或产品数据，也不修改正式学习记录。
