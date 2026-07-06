# 0号任务：运行层双模式完整改造包

你是 0号（OPENCODE）。

这是一个超长任务包，要求你完成运行层的本地/公网双模式完整改造。

---

## 一、任务目标

让 `cnc_param_quickfinder` 项目能自动识别运行环境，并根据环境切换资源加载策略。

核心要求：
1. 本地 file:// 协议能正常运行
2. 公网 https:// 协议能正常运行
3. 资源加载失败时能给出明确诊断
4. 提供运行时配置管理
5. 提供环境切换测试工具

---

## 二、必须产出的文件

**目标目录**: `F:\AI工作台\cnc_param_quickfinder\`

### 文件1: `runtime-env-detector.js`
**功能**: 环境检测模块

**必须包含**:
1. `detectProtocol()` - 检测 file:// 还是 https://
2. `detectHost()` - 检测域名或本地路径
3. `detectBrowser()` - 检测浏览器类型
4. `getEnvironmentInfo()` - 返回完整环境信息对象
5. 全局对象 `window.CNC_ENV`

**最低要求**:
- 代码行数 ≥ 80 行
- 必须有完整注释
- 必须能在控制台直接调用

### 文件2: `runtime-config.js`
**功能**: 运行时配置管理

**必须包含**:
1. 本地模式配置（资源路径策略）
2. 公网模式配置（CDN路径策略）
3. `getConfig(key)` - 获取配置
4. `setConfig(key, value)` - 设置配置
5. `switchMode(mode)` - 切换模式
6. 全局对象 `window.CNC_CONFIG`

**最低要求**:
- 代码行数 ≥ 100 行
- 必须包含默认配置
- 必须支持配置覆盖

### 文件3: `runtime-loader.js`
**功能**: 资源加载器

**必须包含**:
1. `loadScript(src, options)` - 动态加载脚本
2. `loadCSS(href, options)` - 动态加载样式
3. `loadJSON(url, options)` - 加载JSON数据
4. `preloadResources(list)` - 批量预加载
5. `diagnoseLoadFailure(resource)` - 诊断加载失败原因
6. 全局对象 `window.CNC_LOADER`

**最低要求**:
- 代码行数 ≥ 120 行
- 必须支持超时控制
- 必须支持重试机制
- 必须有加载进度回调

### 文件4: `runtime-diagnostic.js`
**功能**: 运行时诊断工具

**必须包含**:
1. `checkEnvironment()` - 检查环境配置
2. `checkResources()` - 检查资源加载状态
3. `checkModules()` - 检查模块依赖
4. `generateReport()` - 生成诊断报告
5. `printReport()` - 打印诊断报告到控制台
6. 全局对象 `window.CNC_DIAGNOSTIC`

**最低要求**:
- 代码行数 ≥ 100 行
- 必须能检测所有关键资源
- 必须能输出结构化报告

### 文件5: `runtime-integration-guide.md`
**功能**: 集成指南文档

**必须包含**:
1. 模块加载顺序说明
2. index.html 修改示例
3. app.js 集成示例
4. 配置项完整说明
5. 常见问题解答（至少5个）
6. 测试用例（至少10个）

**最低要求**:
- 字数 ≥ 2000 字
- 必须有代码示例
- 必须有测试命令

### 文件6: `RUNTIME_COMPLETE_REPORT_20260706.md`
**功能**: 完整交付报告

**必须包含**:
1. 新增文件清单（完整路径）
2. 修改文件清单（如果有）
3. 运行测试命令及完整输出
4. 本地 file:// 实测结果（截图或日志）
5. 公网 https:// 预期行为说明
6. 不能确认的部分（明确列出）
7. 风险提示
8. 后续建议

**最低要求**:
- 字数 ≥ 3000 字
- 必须有实测证据
- 必须有验证方法

---

## 三、明确限制

### 禁止事项
1. ❌ **不要修改 app.js 的页面渲染逻辑**
2. ❌ **不要修改现有数据结构**
3. ❌ **不要删除已有功能**
4. ❌ **不要修改 search-aliases.js**
5. ❌ **不要修改 study-entry-rules.js**
6. ❌ **不要修改 search-runtime-debug.js**

### 必须遵守
1. ✅ **只改运行层和配置层**
2. ✅ **新增的全局对象必须用 CNC_ 前缀**
3. ✅ **所有函数必须有注释**
4. ✅ **所有代码必须能在浏览器控制台直接测试**

---

## 四、验证要求

### 必须在浏览器控制台能执行的命令

```javascript
// 1. 环境检测
window.CNC_ENV.detectProtocol()  // 返回 'file' 或 'http' 或 'https'
window.CNC_ENV.getEnvironmentInfo()  // 返回环境信息对象

// 2. 配置管理
window.CNC_CONFIG.getConfig('mode')  // 返回 'local' 或 'web'
window.CNC_CONFIG.switchMode('web')  // 切换到公网模式

// 3. 资源加载
window.CNC_LOADER.loadScript('./test.js')  // 返回 Promise
window.CNC_LOADER.diagnoseLoadFailure('./missing.js')  // 返回诊断信息

// 4. 诊断工具
window.CNC_DIAGNOSTIC.checkEnvironment()  // 返回检查结果
window.CNC_DIAGNOSTIC.printReport()  // 打印完整报告
```

### 必须运行的测试命令

```bash
# 1. 检查文件是否生成
ls F:\AI工作台\cnc_param_quickfinder\runtime-*.js
ls F:\AI工作台\cnc_param_quickfinder\RUNTIME_*.md

# 2. 检查 JavaScript 语法
node -c F:\AI工作台\cnc_param_quickfinder\runtime-env-detector.js
node -c F:\AI工作台\cnc_param_quickfinder\runtime-config.js
node -c F:\AI工作台\cnc_param_quickfinder\runtime-loader.js
node -c F:\AI工作台\cnc_param_quickfinder\runtime-diagnostic.js

# 3. 统计代码行数
wc -l F:\AI工作台\cnc_param_quickfinder\runtime-*.js
```

---

## 五、回复格式（严格遵守）

```markdown
0号回复：运行层双模式完整改造包已完成

## 1. 新增文件清单
- F:\AI工作台\cnc_param_quickfinder\runtime-env-detector.js (XXX行)
- F:\AI工作台\cnc_param_quickfinder\runtime-config.js (XXX行)
- F:\AI工作台\cnc_param_quickfinder\runtime-loader.js (XXX行)
- F:\AI工作台\cnc_param_quickfinder\runtime-diagnostic.js (XXX行)
- F:\AI工作台\cnc_param_quickfinder\runtime-integration-guide.md (XXX字)
- F:\AI工作台\cnc_param_quickfinder\RUNTIME_COMPLETE_REPORT_20260706.md (XXX字)

## 2. 修改文件清单
- [如果有，列出；如果没有，写"无"]

## 3. 运行过的测试命令及输出
[实际命令和完整输出]

## 4. 浏览器控制台测试结果
[实际测试结果]

## 5. 本地 file:// 实测结果
- 环境检测：[✓/✗] [详细说明]
- 资源加载：[✓/✗] [详细说明]
- 模块初始化：[✓/✗] [详细说明]

## 6. 公网 https:// 预期行为
- [详细说明]

## 7. 不能确认的部分
- [明确列出]

## 8. 风险提示
- [列出潜在风险]

## 9. 后续建议
- [列出后续优化建议]
```

---

## 六、质量标准

### 代码质量
- 所有函数必须有 JSDoc 注释
- 所有魔法数字必须用常量
- 所有错误必须有明确提示
- 所有异步操作必须有超时控制

### 文档质量
- 所有说明必须有示例
- 所有配置必须有默认值
- 所有错误必须有解决方案
- 所有测试必须有预期结果

### 交付质量
- 所有文件必须真实存在
- 所有命令必须真实运行
- 所有测试必须真实执行
- 所有结果必须真实可验证

---

开始执行任务。
