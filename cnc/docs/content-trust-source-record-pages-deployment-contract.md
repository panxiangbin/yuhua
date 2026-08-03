# CNC 内容复核来源记录 Pages 部署契约

## 目标

`cnc/content-trust-source-record.schema.json` 和
`cnc/content-trust-source-record-template.json` 是高风险内容逐条复核的入口资源。

本门禁直接比较 `main` 原始文件与 GitHub Pages 公网文件的字节长度和
SHA-256，避免仓库已经合并、但公网仍停留在旧 Schema 或旧模板。

## 必须验证

### 来源记录 Schema

- JSON Schema 必须使用 draft 2020-12。
- 根对象与单条记录都必须禁止未声明字段。
- 根对象必须受控允许可选的 `instructions`，且至少包含 5 条有效说明。
- 固定登记 5 个高风险 CNC 数据集。
- 固定 5 类可追溯来源和 4 类复核结论。
- 15 个来源记录字段必须保持必填。
- `onMachineValidationRequired` 必须恒为 `true`。
- 可选文件摘要必须为 64 位小写十六进制 SHA-256。
- 统一提示必须保持：

> 教学参考，需按机床说明书、现场工艺和空运行验证

### 空白模板

- 只能包含 `schemaVersion`、`requiredNotice`、`instructions` 和 `records`。
- `instructions` 必须至少包含 5 条真实填写说明，不得使用占位文本。
- `records` 必须是空数组。
- 不得预填示例手册、机床、章节、复核人或技术结论，防止示例被误认为真实证据。
- 空白模板必须通过正式校验工具，禁止出现“模板可用但不符合自己的 Schema”的分叉。

## 公网一致性

每个资源都必须：

1. 使用随机查询参数和 `no-store` 请求；
2. 从 `main` 原始资源和 Pages 公网资源分别读取；
3. 字节长度完全一致；
4. SHA-256 完全一致；
5. 当前分支资源通过最新严格契约；
6. `main` 与 Pages 通过当前已部署基线契约；
7. 成功或失败都上传结构化诊断 Artifact。

PR 尚未合并时，当前分支资源可能合理地与 `main` 不同，诊断必须明确记录
`localMatchesMain: false` 和 `branchDeploymentPending: true`，不能伪称该分支已经上线。
合并后必须重新运行同一门禁；此时两项资源都必须达到 `localMatchesMain: true`，
并使用最新严格契约验证 Pages 公网副本。

固定最多进行 18 次公网重试。不得将重试次数设为 0，不得删除契约检查，
不得把 HTTP 可访问误当成逐字节部署成功。

## 本轮真实根因

首次门禁发现空白模板实际包含 `instructions`，但 Schema 的根对象使用
`additionalProperties: false` 且没有声明该字段；同时自定义校验器也没有拦截根节点额外字段。
这意味着模板虽然通过旧校验器，却不符合它宣称使用的 Schema。

修复必须同时完成：

- Schema 受控定义 `instructions`；
- 校验器拒绝其他根节点额外字段，并验证说明数组；
- 模板测试要求实际模板通过正式校验器；
- 新增根节点额外字段与无效说明的反例测试。

不得仅放宽 Pages 测试来掩盖该不一致。

## 技术边界

来源记录格式完整，只表示资料位置、版本、适用范围和复核过程可追溯。
它不表示报警、参数、刀补、G/M 代码或现场处置结论已经核实，更不表示可以直接上机使用。

逐条复核仍必须依据对应控制系统、机床厂配置和原厂资料，并在现场工艺许可下完成空运行及必要验证。

## 修改范围

本专项只允许修改：

- `cnc/content-trust-source-record.schema.json`
- `cnc/tools/validate-content-trust-source-record.cjs`
- `cnc/tests/content-trust-source-record-template-smoke.cjs`
- `cnc/tests/pages-content-trust-source-record-deployment-smoke.cjs`
- `.github/workflows/cnc-content-trust-source-record-pages-smoke.yml`
- `cnc/docs/content-trust-source-record-pages-deployment-contract.md`
- 与该专项直接相关的 CNC 测试诊断数据

不得修改予华仪器官网根目录、产品、图片或仪器数据。
