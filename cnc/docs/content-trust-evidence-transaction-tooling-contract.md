# CNC 内容复核证据事务生成工具契约

## 目标

证据台账事务记录包含更新前后文件 SHA-256、变更数据集数量、资料清单新增数量、逐条复核记录新增数量、唯一复核条目增量和状态流转数量。人工填写这些字段容易出现摘要抄错、数量漂移或输入文件被误覆盖。

本契约增加受控 JSON Schema、不可直接提交的空白模板和自动摘要生成工具。工具只根据更新前后台账的真实 UTF-8 文件与正式校验器结果计算事务记录，不生成手册、页码、机床型号、报警解释、G/M 代码结论、刀补数值或安全操作结论。

## 文件

```text
cnc/content-trust-evidence-transaction.schema.json
cnc/content-trust-evidence-transaction-template.json
cnc/tools/generate-content-trust-evidence-transaction.cjs
cnc/tests/content-trust-evidence-transaction-tooling-smoke.cjs
.github/workflows/cnc-content-trust-evidence-transaction-tooling-smoke.yml
```

## Schema 边界

事务根节点只能包含以下 8 个字段：

```text
schemaVersion
transactionId
expectedBaseLedgerSha256
nextLedgerSha256
committedAt
actor
changeReason
operationSummary
```

`operationSummary` 只能包含以下 5 个非负整数：

```text
datasetsChanged
sourceRecordsAdded
itemReviewRecordsAdded
reviewedItemsAdded
stateTransitions
```

Schema 与正式事务校验器导出的字段集合必须一致。任何额外根字段或汇总字段都应失败。

## 空白模板

空白模板用于说明字段结构，不是可直接提交的有效事务记录：

- `transactionId`、两个 SHA-256、时间、执行人和变更原因保持空白；
- 不预填 64 个零或其他看似有效的伪造摘要；
- 直接交给正式事务校验器时必须失败；
- 正式记录应由生成工具根据真实输入文件生成。

## 生成工具

示例：

```bash
node cnc/tools/generate-content-trust-evidence-transaction.cjs \
  --before /tmp/cnc-evidence-ledger-before.json \
  --after cnc/content-trust-evidence-ledger.json \
  --manifest cnc/content-trust-manifest.json \
  --transaction-id CNC-EVIDENCE-20260802-ALARM-SOURCES-01 \
  --actor "受控资料复核工具" \
  --reason "登记已取得并确认适用范围的原厂资料清单记录。" \
  --committed-at 2026-08-02T03:30:00+08:00 \
  --output cnc/content-trust-evidence-transaction.json
```

工具必须：

1. 按原始 UTF-8 文本计算更新前后台账 SHA-256。
2. 调用正式 `validate-content-trust-evidence-transaction.cjs` 获取真实差异计数。
3. 使用真实计数生成 `operationSummary`，不得接受人工覆盖汇总数量。
4. 对最终事务再次调用正式校验器；存在任何台账、来源、状态、摘要或结构错误时不得写入输出文件。
5. 不得把输出路径指向更新前台账、更新后台账或可信度清单，防止覆盖输入。
6. 未提供输出路径时只向标准输出打印事务 JSON，便于人工审查或安全管道接收。

`committedAt` 可省略并使用执行时刻，但可复现测试和受控批处理应明确传入 ISO 8601 时间。

## 自动测试

独立门禁至少验证：

- Schema 与正式校验器字段集合一致；
- 空白模板受控且不能直接提交；
- 合法资料清单导入时，两个哈希和 5 项汇总均来自真实差异；
- 同一输入、事务编号和时间产生确定性结果；
- 命令行输出文件能够再次通过正式事务校验器；
- 修改治理字段时生成器拒绝输出；
- 目标台账在生成后发生变化时，旧事务摘要立即失效；
- 缺少变更原因时失败；
- 输出路径试图覆盖任一输入文件时失败且输入文件保持不变。

成功只表示事务记录结构、哈希与差异汇总可靠，不表示任何 CNC 技术条目已经完成原厂资料复核。所有技术内容仍为教学参考，需按机床说明书、现场工艺和空运行验证。

## 改动范围

该能力只服务 CNC 内容可信度与数据可靠性流程。不得借此修改予华仪器官网根目录、产品、图片或仪器数据，也不得绕过现有完整手机、PWA、课程、题库、模拟、成长档案、Pages 和公网门禁。
