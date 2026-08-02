# AI CNC老师一次性交接无障碍 Pages 精确部署契约

## 目标

确保已经合并到 `main` 的 AI CNC老师一次性交接无障碍能力，确实以同一文件内容部署到 GitHub Pages 公网。不得只凭本地文件、PR 测试通过或通用首页可访问，就宣称无障碍焦点与播报已经上线。

目标资源：

```text
cnc/ai-teacher-explainability.html
```

## 精确部署要求

每次验收必须分别读取：

1. 当前工作分支文件；
2. 远程 `main` 原始文件；
3. GitHub Pages 公网文件。

请求必须使用随机查询参数和禁止缓存头。远程 `main` 与 Pages 公网必须满足：

- HTTP 成功；
- 字节数完全相同；
- SHA-256 完全相同；
- 当前验收分支与 `main` 也必须逐字节一致。

允许最多 18 次真实部署等待，每次间隔 10 秒。等待结束后仍不一致必须失败，并上传完整诊断，不得用旧公网文件冒充新版本。

## 公网必须包含的无障碍能力

### 恢复状态

`#handoff-note` 必须同时具备：

- `role="status"`；
- `aria-live="polite"`；
- `aria-atomic="true"`；
- `tabindex="-1"`；
- 初始隐藏。

存储不可用、交接失效和 BFCache 返回后，程序必须把焦点送到恢复状态，让屏幕阅读器先播报当前情况。

### 判断结果

`#result` 必须：

- 使用 `role="region"`；
- 由 `aria-labelledby="result-title"` 命名；
- 由 `aria-describedby="result-reason"` 关联判断理由；
- 使用 `aria-live="polite"`；
- 使用 `aria-atomic="true"`。

`#result-title` 必须使用 `tabindex="-1"`。一次性交接成功、手动判断和示例判断完成后，焦点必须落到该标题。

### 焦点可见性

程序化聚焦的判断标题和恢复状态必须具有清晰可见焦点轮廓，至少验证：

- 3px 实线轮廓；
- 4px 轮廓偏移；
- 不允许 `outline:none` 隐藏焦点。

### BFCache

- `pagehide` 只能清理已消费问题，不得抢焦点；
- 只有 `pageshow.persisted === true` 的真实 BFCache 返回，才允许在清空旧问题和旧判断后把焦点送到恢复状态；
- 不得使用普通刷新冒充 BFCache；
- 不得重新显示已消费的问题或判断结果。

## 隐私与本地边界

- 临时问题只能使用当前标签页 SessionStorage；
- 消费后必须立即删除固定键；
- 不得写入 URL、LocalStorage、IndexedDB、成长档案或错题记录；
- 不得调用外部模型、站外接口、WebSocket 或 EventSource；
- SessionStorage 不可用时不得降级到长期存储。

## 门禁纪律

不得：

- 删除或跳过测试；
- 降低 ARIA、焦点、BFCache、字节或 SHA-256 断言；
- 用 `test.skip`、`describe.skip`、`it.skip`；
- 用 `process.exit(0)` 吞掉失败；
- 把 `cancelled`、`skipped`、`queued` 或 `in_progress` 当成成功；
- 伪造公网版本、字节数、SHA-256 或 Artifact。

成功和失败都必须上传结构化报告、发现说明和真实请求元数据。

## CNC技术与安全边界

判断说明仅用于教学分流，不代表具体机床、系统版本或现场状态已经确认。本页不得提供固定上机值、参数写入步骤、联锁绕过、盲目复位或现场放行方法。

涉及具体参数、报警、刀补、联锁和恢复操作，必须核对相同版本原厂手册、企业制度、受控工艺和现场条件，并由授权人员确认。资料清单与逐条复核记录不能互相替代，未逐条复核内容不可直接上机。
