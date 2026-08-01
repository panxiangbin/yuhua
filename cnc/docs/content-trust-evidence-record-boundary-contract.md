# CNC 内容复核资料清单与逐条记录边界契约

## 目的

高风险 CNC 内容的“资料已经取得”和“具体条目已经复核”是两个不同事实。本契约防止只登记一本手册，就把报警、G/M 代码、诊断建议或课程内容批量标记为已核实。

统一边界始终保持：

> 教学参考，需按机床说明书、现场工艺和空运行验证

结构校验、资料齐备、逐条复核完成，都不代表可以跳过机床厂要求、现场工艺确认、首件检查或空运行验证。

## 两类记录

### 1. `sourceRecords`：资料清单记录

用于证明某个高风险数据集已经取得可追溯资料。每条记录至少包含：

- 发布机构；
- 文档名称；
- 文档编号或版本；
- 适用系统或机床；
- 页码或章节；
- 复核日期；
- 复核人；
- 资料清单核对说明。

资料清单完整时，只允许从 `awaiting_sources` 进入 `sources_ready`。这表示可以开始逐条复核，不表示任何具体条目已经核实。

### 2. `itemReviewRecords`：逐条复核记录

每条记录必须符合 `cnc/content-trust-source-record.schema.json` 的完整 15 字段契约，包括：

- 所属数据集与稳定条目键；
- 来源类型、发布机构、文档和版本；
- 适用系统或机床、页码或章节、证据位置；
- 复核日期与复核人；
- 复核说明与适用范围说明；
- 复核结论；
- `onMachineValidationRequired: true`。

逐条记录的 `datasetPath` 必须与它所在的数据集一致。`reviewedItemCount` 必须等于已登记的唯一 `itemKey` 数量，不能手工夸大。

## 状态流转

允许的状态只有：

1. `awaiting_sources`：资料清单尚未完整；不得有逐条复核记录。
2. `sources_ready`：资料清单完整、可以开始逐条复核；此时仍不得声称条目已核实。
3. `in_review`：至少已有一条满足完整 Schema 的逐条复核记录。
4. `review_complete`：逐条记录存在且没有 `insufficient_evidence` 结论；仍需按适用范围进行现场工艺和空运行验证。

禁止的状态跳跃包括：

- 没有资料清单就登记逐条复核记录；
- 有逐条复核记录却停留在 `sources_ready`；
- 没有逐条记录就进入 `in_review` 或 `review_complete`；
- 仍有证据不足结论却标记全部复核完成；
- 用资料清单数量代替逐条复核数量。

## 自动门禁

`cnc/tools/validate-content-trust-evidence-ledger.cjs` 负责：

- 根节点和数据集字段白名单；
- 五个高风险数据集完整性与唯一性；
- 资料清单字段、日期、占位内容和重复记录；
- 逐条记录完整 Schema 校验；
- 数据集归属、唯一条目计数和状态流转；
- `allowOperationalUse: false` 边界。

`cnc/tests/content-trust-evidence-record-boundary-smoke.cjs` 使用正反场景验证：

- 空白诚实基线；
- 资料齐备但尚未逐条复核；
- 合法进入复核中；
- 缺字段、路径错位、计数夸大、无资料先复核、证据不足却完成等情况必须失败。

手机状态页分别显示“资料清单记录”和“逐条复核记录”，不得将两者合并成含义模糊的“来源记录”。

## 当前真实状态

当前五个高风险数据集继续保持：

- `state: awaiting_sources`；
- `readyForItemReview: false`；
- `sourceRecords: []`；
- `itemReviewRecords: []`；
- `reviewedItemCount: 0`。

这表示尚未收到足够的可追溯资料，也没有伪造任何逐条核实结论。
