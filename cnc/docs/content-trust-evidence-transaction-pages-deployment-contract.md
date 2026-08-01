# CNC 证据事务资源 Pages 部署契约

## 目标

`content-trust-evidence-transaction.schema.json` 与 `content-trust-evidence-transaction-template.json` 用于约束 CNC 高风险内容证据台账的事务记录。它们只负责保证更新前后 SHA-256、变更摘要和受控字段一致，不代表任何报警、G/M 代码、机床参数、刀补或安全步骤已经完成技术核实。

本契约把这两个资源纳入 GitHub Pages 公网门禁，避免仓库 `main` 已更新而 Pages 仍提供旧 Schema、旧空白模板或错误字段边界。

## 核验资源

```text
cnc/content-trust-evidence-transaction.schema.json
cnc/content-trust-evidence-transaction-template.json
```

每项资源必须同时满足：

1. 使用随机查询参数、`cache: no-store` 和禁止缓存请求读取。
2. 远程 `main` 与 Pages 公网字节长度完全一致。
3. 远程 `main` 与 Pages 公网 SHA-256 完全一致。
4. 当前分支、本地 `main` 资源和 Pages 资源均通过各自语义契约。
5. `main` push 复验时，当前检出文件还必须与远程 `main` 完全一致。
6. 成功或失败均写入结构化诊断文件并上传 Artifact。

## Schema 语义边界

事务 Schema 必须：

- 使用 JSON Schema Draft 2020-12；
- 固定 `$id` 为 `cnc/content-trust-evidence-transaction.schema.json`；
- 根节点只允许 8 个字段；
- `operationSummary` 只允许 5 个非负整数；
- 两个台账摘要必须是 64 位小写十六进制 SHA-256；
- `committedAt` 必须为 `date-time`；
- 根节点和汇总节点都禁止未受控字段；
- 明确说明事务成功不代表 CNC 技术内容已经核实。

## 空白模板边界

空白模板必须：

- 与 Schema 的 8 个根字段和 5 个汇总字段完全对齐；
- 事务编号、两个 SHA-256、时间、执行人和变更原因保持空字符串；
- 5 个汇总值保持 0；
- 不预填 64 个零或其他看似有效的伪造摘要；
- 不包含 `allowOperationalUse`、`reviewComplete` 等技术内容结论字段；
- 不能被误认为已经可提交的正式事务记录。

## 工作流触发

Pages 门禁同时支持：

```text
pull_request
push 到 main
workflow_dispatch
```

拉取请求阶段用于验证本地语义和当前正式公网基线。合并到 `main` 后，push 阶段必须再次核验当前检出资源、远程 `main` 和 Pages 公网的一致性，不能沿用合并前结果冒充上线确认。

## 失败处理

门禁失败时必须保留真实诊断，包括：

- 每次请求时间与状态；
- `main` 和 Pages 的字节数与 SHA-256；
- 缓存相关响应头；
- 本地是否与 `main` 一致；
- Schema 或模板的具体语义错误。

不得通过减少重试、跳过测试、放宽字段集合、填入伪造摘要或把 Pages 未同步状态当作成功来修复。

## 技术内容安全提示

证据事务工具和部署门禁只验证记录过程的一致性。任何不确定的机床参数、报警含义、刀补方法和安全步骤仍必须标注适用范围，并要求核对对应系统系列、机床型号和版本的原厂手册，结合现场工艺与空运行验证。
