# AI CNC 老师交接恢复 Pages 公网验收契约

## 目标

AI CNC 老师判断说明页已经在 `main` 中加入一次性交接恢复加固。本契约要求 GitHub Pages 公网实际返回的页面与远程 `main` 逐字节一致，并且 SHA-256 完全相同，不能只凭仓库文件、构建标记或旧的通用 Pages 结果宣称恢复能力已经上线。

## 精确资源

本门禁只验收：

- `cnc/ai-teacher-explainability.html`

当前分支、远程 `main` 和 Pages 公网三份资源必须满足：

- HTTP 请求成功；
- 字节长度一致；
- SHA-256 一致；
- 当前分支与 `main` 一致；
- 禁止把旧页面、缓存页面或尚未合并的分支页面当成正式部署。

请求必须使用随机查询参数、`cache: no-store`、`Cache-Control: no-cache, no-store` 与 `Pragma: no-cache`。允许在真实部署传播期间重试，但最终不一致必须失败并保留诊断。

## 恢复能力必须真实存在

公网页面必须包含：

- SessionStorage 读取或删除异常的 `storage-unavailable` 恢复状态；
- 已消费问题在 `pagehide` 时清理；
- BFCache 返回时通过 `pageshow` 与 `event.persisted` 再次清理；
- 清理后状态 `consumed-cleared`；
- 问题、判断标题、判断理由、风险标签和结果区域均不再次显示；
- 手动输入与示例问题仍可继续使用；
- 独立标签页仍受 SessionStorage 标签页隔离约束。

运行时专项仍必须真实确认 `pageshow.persisted === true`。本 Pages 门禁负责确认这套已经通过运行时测试的恢复代码，确实进入 `main` 和公网资源；不能用普通刷新、字符串替换或静态伪造代替运行时专项。

## 隐私与数据边界

临时问题只允许使用当前标签页 SessionStorage。不得降级到：

- URL 查询参数或片段；
- LocalStorage；
- IndexedDB；
- Cookie；
- 成长档案；
- 错题记录；
- 站外接口或外部模型。

公网页面不得新增 `fetch`、XMLHttpRequest、WebSocket 或 EventSource 等站外联网调用。

## 技术与安全内容边界

判断说明与恢复提示不得提供固定转速、进给、安全高度、参数值、刀补值、参数写入、联锁绕过、盲目复位或现场放行方法。

涉及具体参数、报警、刀补和恢复操作，必须核对相同版本原厂手册、企业制度、受控工艺和现场条件，并由授权人员确认。资料清单与逐条复核记录不能互相代替，未逐条复核内容不可直接上机。

## 失败处理

以下任一情况必须失败：

- main 或 Pages 不可达；
- main 与 Pages 字节或 SHA-256 不一致；
- 当前分支与 main 不一致；
- 缺少任一恢复标识或安全边界；
- 出现长期交接存储、站外联网或门禁绕过；
- Artifact 未生成。

不得删除测试、降低断言、跳过步骤，不能把 queued、pending、cancelled 或 skipped 当成成功。
