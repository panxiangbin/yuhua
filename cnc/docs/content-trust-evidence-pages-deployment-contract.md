# CNC 内容复核证据资源 Pages 部署契约

## 目标

内容复核证据台账和资料准备度页面合并到 `main` 后，必须确认 GitHub Pages 公网实际部署了同一份文件，而且部署后的语义仍然正确。不能只凭提交记录、构建号、HTTP 200、文件字节一致或页面能打开就宣称证据边界可靠。

## 精确核验资源

- `cnc/content-trust-evidence.html`
- `cnc/content-trust-evidence-ledger.json`
- 配套语义参考：`cnc/content-trust-manifest.json`

门禁分别从 `main` 原始文件和 Pages 公网读取资源，使用随机查询参数、`no-store` 和禁止缓存请求头；两侧字节数与 SHA-256 必须完全一致。证据台账还必须分别与同一来源的可信度清单一起通过正式校验器。

## 页面语义契约

公网资料准备度页面必须保留：

- `zh-CN` 页面语言；
- “CNC 内容复核资料准备度”标题；
- 对证据台账的 `no-store` 请求；
- 统一提示“教学参考，需按机床说明书、现场工艺和空运行验证”；
- “资料清单记录”和“逐条复核记录”两个独立统计；
- `sourceRecords`、`itemReviewRecords` 和 `reviewedItemCount` 的独立读取；
- “两者不能互相代替”的边界说明；
- 资料已齐数量、阻断原因和资料请求清单；
- 返回内容可信度状态和 CNC 新手训练平台的入口。

不得把一本手册的资料清单记录解释为其中全部报警、代码、诊断或课程条目已经逐条核实。

## 台账语义契约

公网证据台账必须保持：

- `schemaVersion` 为 1；
- 5 个高风险数据集完整且唯一登记；
- 报警数据和 G/M 代码数据为 P0；
- 8 个资料清单必填字段完整；
- `stateDefinitions` 同时定义 `awaiting_sources`、`sources_ready`、`in_review` 和 `review_complete`；
- 每个数据集分别包含 `sourceRecords` 和 `itemReviewRecords` 数组；
- `reviewedItemCount` 必须等于逐条复核记录中唯一 `itemKey` 的真实数量；
- 状态、资料清单、逐条复核记录和 `readyForItemReview` 必须一致；
- 可信度清单中的全部高风险数据继续保持 `allowOperationalUse: false`；
- 每项均有至少两条资料请求和明确阻断原因。

门禁调用正式的 `validate-content-trust-evidence-ledger.cjs` 校验本地分支、`main` 和 Pages 公网三份台账，不复制一套更宽松的旁路规则。

## 合法状态流转

门禁允许真实证据进展，不把当前的 0 条记录冻结为永久基线：

- `awaiting_sources`：资料清单为空、逐条复核为空、`readyForItemReview=false`；
- `sources_ready`：资料清单已完整登记、逐条复核为空、`readyForItemReview=true`；
- `in_review`：资料清单和逐条复核记录均存在、`readyForItemReview=true`；
- `review_complete`：满足正式校验器的完整条件，且不得仍有 `insufficient_evidence` 结论。

当前全部数据集仍处于 `awaiting_sources`、两类记录均为 0，这是当前真实证据状态，不是质量成绩。以后取得真实资料或完成逐条复核时，应通过可审计变更推进状态，而不是为了维持固定数字压制真实进展。

## 重试与诊断

Pages 部署可能晚于 `main` 更新。门禁最多进行 18 次真实公网重试，每次间隔 10 秒；失败时必须保留每次 HTTP、字节数、SHA-256、状态语义、两类记录计数和错误信息。成功或失败都写入 Pages 诊断 Artifact。

## 禁止事项

不得通过以下方式制造绿色结果：

- 只检查 HTTP 200，不比较字节和 SHA-256；
- 只比较文件，不验证资料清单与逐条复核语义；
- 删除页面、台账或状态流转契约；
- 冻结 `awaiting_sources` 或 0 条记录，阻止合法证据进展；
- 把缓存中的旧文件当作最新部署；
- 把“资料准备度页面已部署”解释为报警、G/M 代码或诊断内容已经核实；
- 删除测试、降低断言、跳过步骤或把 `cancelled`、`skipped` 当作成功；
- 修改予华仪器官网根目录、产品、图片或仪器数据。
