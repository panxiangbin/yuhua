# CNC PWA离线核心 Pages 公网验收契约

## 目的

本门禁用于同时证明两件事：

1. 当前开发分支的目标离线核心契约完整、可测试且没有降低既有 AI CNC老师离线能力；
2. 远程 `main` 与 GitHub Pages 公网四项生产资源逐字节一致，不能把尚未合并的分支内容伪称为已经上线。

验证对象：

1. `cnc/sw.js`；
2. `cnc/build-info.json`；
3. `cnc/pwa-status.html`；
4. `cnc/pwa-self-test.html`。

## 分支版本与公网版本

当前受控升级为：

- 分支目标 PWA 构建：`20260802-pwa6`；
- 上一正式 PWA 构建：`20260802-pwa5`；
- 站点构建：`20260801-ai-handoff1`。

PR 合并前允许出现：

```text
当前分支：pwa6
远程 main：pwa5
Pages 公网：pwa5
branchDeploymentPending：true
```

这只表示分支尚待合并或部署，不代表 pwa6 已上线。此时必须同时满足：

- 当前分支完整符合 pwa6 十项核心资源契约；
- 远程 `main` 与 Pages 公网仍逐字节、SHA-256 完全一致；
- 公网 pwa5 继续完整符合原有九项 AI 老师离线核心契约。

`main` push 或手动正式验收时不允许继续存在分支与 `main`/Pages 不一致。正式验收只能在 Pages 真实返回 pwa6 且四项资源与 `main` 完全一致后通过。

除 pwa5、pwa6 外的构建号均视为未受控版本并失败。

## pwa6核心缓存

pwa6 Service Worker 核心缓存必须按受控顺序包含10项资源：

1. `./index.html`；
2. `./offline.html`；
3. `./pwa-status.html`；
4. `./pwa-self-test.html`；
5. `./pages-status.html`；
6. `./beginner-placement.html`；
7. `./ai-teacher.html`；
8. `./ai-teacher-intake.html`；
9. `./ai-teacher-explainability.html`；
10. `./build-info.json`。

pwa5 公网基线继续核对原有9项资源，不允许为了兼容分支而跳过 AI CNC老师、现场问诊单或判断说明页。

PWA 状态页和自检页必须与各自构建标记一致。pwa6 自检页必须真实核对10项资源并明确包含起点测评；不得只修改显示数字、重复条目或通过数组长度伪造完整性。

## 精确部署要求

每个生产资源都必须分别读取远程 `main` 与 Pages 公网版本，并满足：

- HTTP 请求成功；
- 使用随机查询参数；
- 使用 `cache: no-store` 与禁止缓存请求头；
- 字节长度完全一致；
- SHA-256 完全一致；
- 最多进行18次真实部署等待，每次间隔10秒；
- 成功与失败均生成结构化诊断和 Artifact。

PR 阶段还必须单独审计当前分支文件，明确记录每项资源是否与 `main` 一致。不得把页面“能打开”替代逐字节验证，也不得把上一正式版本仍可访问解释为新版本已经部署。

## 可见安全边界

状态页、自检页和构建标记必须继续说明：

- 起点测评只用于推荐学习路线，不是现场上机许可或工艺放行；
- 离线内容可能不是最新版本；
- 报警、参数、刀补和现场操作仍须核对相同版本机床原厂手册、企业安全制度和现场条件；
- 高风险操作须由现场师傅或授权人员指导；
- 自检只读，不修改学习记录、不清空缓存、不发放 XP。

离线核心部署不代表任何具体参数、报警解释、刀补数值、联锁或恢复步骤已经完成原厂资料复核，也不允许提供固定上机值、参数写入顺序、安全绕过或盲目复位方法。

## 门禁防绕过

工作流必须：

- 使用 Node.js 24；
- 执行 JavaScript 语法检查；
- 禁止 `test.skip`、`describe.skip`、`it.skip`；
- 禁止用 `process.exit(0)` 吞掉失败；
- 禁止把重试次数设置为0；
- 失败时保持非零退出码；
- 无论成功或失败都上传诊断 Artifact；
- 不把 queued、in_progress、cancelled 或 skipped 当作成功。

## 修改范围

本门禁只修改 `cnc/**` 与明确只服务 CNC 的工作流，不修改予华仪器官网根目录、仪器产品、图片、参数或产品数据，也不修改正式学习记录。
