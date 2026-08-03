# CNC PWA 构建引用审计契约

## 目的

防止 Service Worker、离线状态页、自检页、浏览器回归和 Pages 部署测试分别保留不同的 PWA 构建号，造成“页面显示已更新、实际缓存仍是旧版”或升级测试验证了错误版本。

## 当前构建与上一构建

1. `cnc/build-info.json` 的 `pwaBuild` 是当前 PWA 缓存构建的唯一受控标记。
2. 当前构建针必须来自明确的文件和变量，不得把课程、AI 页面、组件或普通脚本中的通用 `BUILD` 常量误判为 PWA 缓存版本。
3. `cnc/tests/mobile-pwa-upgrade-data-smoke.cjs` 中明确命名的 `PREVIOUS_PWA_BUILD` 是唯一受控的上一版本，用于验证旧 CNC 缓存清理和学习数据保护。
4. 当前构建与上一构建不得相同。

## 必须保持一致的当前构建针

以下文件中的受控 PWA 构建针必须全部等于 `build-info.json.pwaBuild`：

- `cnc/sw.js`
- `cnc/pwa-status.html`
- `cnc/pwa-self-test.html`
- `cnc/tests/mobile-pwa-offline-cache-smoke.cjs`
- `cnc/tests/mobile-pwa-profile-bfcache-smoke.cjs`
- `cnc/tests/mobile-pwa-upgrade-data-smoke.cjs` 的当前构建
- `cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs`
- `cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs`
- `cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs`

新增正式 PWA 构建针时，必须同时进入审计脚本和工作流结构检查；不得依靠宽泛正则扫描任意 `BUILD` 变量。

## 引用分类

审计必须区分以下四类引用：

1. **运行中构建引用**：生产、浏览器测试和部署工作流真正参与缓存、构建判断或升级验证的 PWA 版本。
2. **文档历史引用**：中文契约中为说明升级历史保留的版本，只进入诊断清单，不视为当前构建针。
3. **审计治理引用**：审计脚本自身声明的当前、上一版本格式或受控豁免，只用于治理，不能反向污染审计结果。
4. **受控历史诊断引用**：当前仅允许：
   - `cnc/runtime-env-detector.js` 中的 `20260728-pwa3`
   - `cnc/import-test.js` 中的 `20260728-pwa3`

上述两处只记录早期原生 Service Worker 注册启动状态，不参与缓存命名、Worker 构建响应、离线资源判断或 Pages 版本验收。豁免必须精确到“文件 + 版本 + 原因”；若对应引用被删除，未使用的豁免本身必须使门禁失败，防止形成永久静默白名单。

除当前构建、上一构建及上述两处精确诊断引用外，其他运行代码、测试或 CNC 工作流中的 PWA 版本均必须失败。

## 诊断与反绕过

每次成功或失败都必须上传结构化报告，至少包含：

- 当前 PWA 构建；
- 上一 PWA 构建；
- 精确当前构建针及来源文件；
- 上一构建针；
- 运行中引用、文档历史引用和审计治理引用；
- 受控历史诊断引用及原因；
- 过期当前构建针；
- 未声明运行引用；
- 未使用的历史豁免。

不得通过以下方式制造绿色结果：

- 删除测试或减少受控构建针；
- 使用宽泛正则把普通组件版本当作 PWA 版本；
- 把 `${expectedBuild}`、正则源码或占位符当作真实版本；
- 将任意旧版本加入无边界白名单；
- 使用 `test.skip`、`describe.skip`、`it.skip` 或 `process.exit(0)` 吞掉失败；
- 将 `cancelled`、`skipped`、排队或运行中状态视为成功。

## 范围与安全边界

本门禁只审计 CNC PWA 构建与缓存可靠性，不修改成绩、XP、成长档案、题库记录或现场参数。离线课程只用于学习；具体机床参数、报警、刀补、联锁、复位和恢复操作必须核对相同版本原厂手册、企业制度、受控工艺和现场条件，并由授权人员确认。
