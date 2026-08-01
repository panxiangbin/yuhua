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
- 固定登记 5 个高风险 CNC 数据集。
- 固定 5 类可追溯来源和 4 类复核结论。
- 15 个来源记录字段必须保持必填。
- `onMachineValidationRequired` 必须恒为 `true`。
- 可选文件摘要必须为 64 位小写十六进制 SHA-256。
- 统一提示必须保持：

> 教学参考，需按机床说明书、现场工艺和空运行验证

### 空白模板

- 只能包含 `schemaVersion`、`requiredNotice` 和 `records`。
- `records` 必须是空数组。
- 不得预填示例手册、机床、章节、复核人或技术结论，防止示例被误认为真实证据。

## 公网一致性

每个资源都必须：

1. 使用随机查询参数和 `no-store` 请求；
2. 从 `main` 原始资源和 Pages 公网资源分别读取；
3. 字节长度完全一致；
4. SHA-256 完全一致；
5. 本地、`main` 和 Pages 三处均通过同一技术契约检查；
6. 成功或失败都上传结构化诊断 Artifact。

固定最多进行 18 次公网重试。不得将重试次数设为 0，不得删除契约检查，
不得把 HTTP 可访问误当成逐字节部署成功。

## 技术边界

来源记录格式完整，只表示资料位置、版本、适用范围和复核过程可追溯。
它不表示报警、参数、刀补、G/M 代码或现场处置结论已经核实，更不表示可以直接上机使用。

逐条复核仍必须依据对应控制系统、机床厂配置和原厂资料，并在现场工艺许可下完成空运行及必要验证。

## 修改范围

本专项只允许修改：

- `cnc/tests/pages-content-trust-source-record-deployment-smoke.cjs`
- `.github/workflows/cnc-content-trust-source-record-pages-smoke.yml`
- `cnc/docs/content-trust-source-record-pages-deployment-contract.md`
- 与该专项直接相关的 CNC 测试诊断数据

不得修改予华仪器官网根目录、产品、图片或仪器数据。
