# CNC Param QuickFinder 运行时集成指南

## 目录

1. [概述](#1-概述)
2. [架构说明](#2-架构说明)
3. [环境检测模块 (CNC_ENV)](#3-环境检测模块-cnc_env)
4. [配置管理模块 (CNC_CONFIG)](#4-配置管理模块-cnc_config)
5. [资源加载器模块 (CNC_LOADER)](#5-资源加载器模块-cnc_loader)
6. [诊断工具模块 (CNC_DIAGNOSTIC)](#6-诊断工具模块-cnc_diagnostic)
7. [集成方式](#7-集成方式)
8. [测试用例](#8-测试用例)
9. [常见问题](#9-常见问题)

---

## 1. 概述

CNC Param QuickFinder 运行时是一套为纯前端 HTML/JS/CSS 项目设计的分层架构，支持在 `file://` 本地模式 和 `https://` 公网模式之间无缝切换。本指南介绍如何将运行时四个核心模块集成到现有项目中。

### 前置条件

- 浏览器支持 ES5+（无需构建工具）
- 项目为纯静态 HTML，无 Node.js / Webpack 等依赖
- 四个运行时脚本与主项目在同一目录

### 整体依赖关系

```
data.js（基础数据）
  └─ runtime-env-detector.js（环境检测）
       └─ runtime-config.js（配置管理）
            └─ runtime-loader.js（资源加载）
                 └─ runtime-diagnostic.js（诊断工具）
                      └─ runtime-data-loader.js（运行时数据层）
                           ├─ runtime-search-layer.js（搜索层）
                           ├─ runtime-image-layer.js（图片层）
                           └─ frontend-data-layer.js（前端数据层）
                                └─ app.js（主应用）
```

---

## 2. 架构说明

运行时层采用四层分离设计：

| 模块 | 全局对象 | 职责 | 依赖 |
|------|----------|------|------|
| env-detector | `CNC_ENV` | 检测协议/浏览器/能力 | 无 |
| config | `CNC_CONFIG` | 配置持久化和切换 | 可选: CNC_ENV |
| loader | `CNC_LOADER` | 动态加载脚本/CSS/JSON | 可选: CNC_CONFIG |
| diagnostic | `CNC_DIAGNOSTIC` | 生成诊断报告 | 可选: CNC_ENV, CNC_CONFIG, CNC_LOADER |

所有模块通过 `window` 全局对象暴露，可在浏览器控制台直接访问。

---

## 3. 环境检测模块 (CNC_ENV)

### 3.1 detectProtocol()

检测当前页面协议。返回 `'file'`, `'http'`, `'https'`, `'unknown'` 之一。

```javascript
var proto = window.CNC_ENV.detectProtocol();
console.log(proto); // 'file', 'http', 或 'https'
```

### 3.2 detectHost()

识别主机地址类别。可能返回值: `'localhost'`, `'127.0.0.1'`, `'file-system'`, `'production'`, `'unknown'`。

```javascript
var host = window.CNC_ENV.detectHost();
console.log(host); // 'file-system' 或 'production'
```

### 3.3 detectBrowser()

检测浏览器类型和移动端状态。

```javascript
var browser = window.CNC_ENV.detectBrowser();
console.log(browser.isChrome);  // true/false
console.log(browser.isFirefox); // true/false
console.log(browser.isMobile);  // 是否为移动端
console.log(browser.userAgent); // 完整 UA 字符串
```

### 3.4 detectCapabilities()

检查当前环境支持哪些浏览器 API。

```javascript
var caps = window.CNC_ENV.detectCapabilities();
console.log(caps.fetch);         // fetch API 是否可用
console.log(caps.localStorage);  // localStorage 是否可用
console.log(caps.serviceWorker); // Service Worker 是否可用
console.log(caps.webAssembly);   // WebAssembly 是否可用
```

### 3.5 getMode()

合并协议和主机信息，返回唯一的运行模式字符串。

```javascript
var mode = window.CNC_ENV.getMode();
// 'file-local': 本地 file:// 打开
// 'localhost':  本地 HTTP 服务
// 'production': 生产环境公网
console.log(mode);
```

### 3.6 getEnvironmentInfo()

返回完整的环境信息对象，包含协议、主机、浏览器、能力、推荐策略。

```javascript
var info = window.CNC_ENV.getEnvironmentInfo();
console.log(info);
// {
//   protocol: 'file',
//   host: 'file-system',
//   mode: 'file-local',
//   browser: { isChrome: true, isMobile: false, ... },
//   capabilities: { fetch: false, localStorage: true, ... },
//   recommendedStrategy: { method: 'script-tag', ... }
// }
```

### 3.7 canFetch()

专门用于判断 `fetch()` 是否可用。

```javascript
if (window.CNC_ENV.canFetch()) {
  fetch('./data.json').then(function (res) { return res.json(); });
} else {
  console.warn('file:// 模式下 fetch 不可用，请使用 script-tag');
}
```

### 3.8 getRecommendedStrategy()

返回适合当前环境的加载策略对象。

```javascript
var strategy = window.CNC_ENV.getRecommendedStrategy();
// 在 file:// 模式下:
// { method: 'script-tag', reason: 'fetch API is not available in file:// protocol', supportsJSON: false }
// 在 https:// 模式下:
// { method: 'fetch', reason: 'Standard web environment', supportsJSON: true }
console.log(strategy);
```

---

## 4. 配置管理模块 (CNC_CONFIG)

### 4.1 默认配置

模块加载时自动设置以下默认值：

```javascript
{
  mode: 'auto',              // 自动检测模式
  timeout: 10000,            // 加载超时（毫秒）
  retryCount: 2,             // 失败重试次数
  retryDelay: 1000,          // 重试间隔（毫秒）
  enableFallback: true,      // 启用后备策略
  enableServiceWorker: false, // 启用 Service Worker
  debug: false,              // 调试模式
  cdn: {                     // CDN 配置
    enabled: false,
    baseUrl: ''
  },
  resourcePriority: {        // 资源优先级分组
    critical: [],
    normal: [],
    deferred: []
  }
}
```

### 4.2 getConfig(key)

读取配置项。不传参数时返回全部配置的深拷贝。

```javascript
var mode = window.CNC_CONFIG.getConfig('mode');
var timeout = window.CNC_CONFIG.getConfig('timeout');
var fullConfig = window.CNC_CONFIG.getConfig();
console.log(mode, timeout);
```

### 4.3 setConfig(key, value)

设置单项配置，返回 `true` 表示成功。

```javascript
window.CNC_CONFIG.setConfig('timeout', 15000);
window.CNC_CONFIG.setConfig('cdn.enabled', true);
window.CNC_CONFIG.setConfig('debug', true);
```

### 4.4 switchMode(mode)

切换运行模式。可选值: `'auto'`, `'local'`, `'web'`。

```javascript
// 强制使用本地模式（即使检测到 https 协议也使用 script-tag 加载）
window.CNC_CONFIG.switchMode('local');

// 强制使用 Web 模式
window.CNC_CONFIG.switchMode('web');

// 恢复自动检测
window.CNC_CONFIG.switchMode('auto');
```

### 4.5 resetConfig()

将所有配置恢复为默认值。

```javascript
window.CNC_CONFIG.resetConfig();
```

### 4.6 exportConfig()

导出当前配置为可序列化的对象。

```javascript
var exported = window.CNC_CONFIG.exportConfig();
console.log(JSON.stringify(exported, null, 2));
```

### 4.7 importConfig(config)

导入配置并合并到当前配置中，返回 `true` 表示成功。

```javascript
window.CNC_CONFIG.importConfig({
  timeout: 20000,
  debug: true,
  cdn: { enabled: true, baseUrl: 'https://cdn.example.com/' }
});
```

### 4.8 onChange(callback)

注册配置变更监听器。当配置被修改时，回调函数接收变更后的键名列表。

```javascript
window.CNC_CONFIG.onChange(function (changedKeys) {
  console.log('配置已变更:', changedKeys);
});
```

---

## 5. 资源加载器模块 (CNC_LOADER)

### 5.1 loadScript(src, options)

动态加载 JavaScript 脚本。返回 Promise，成功时 resolve `true`，失败时 resolve `false`（不抛出异常）。

```javascript
window.CNC_LOADER.loadScript('./extra-module.js').then(function (success) {
  if (success) {
    console.log('脚本加载成功');
  } else {
    console.warn('脚本加载失败（已重试）');
  }
});
```

支持带选项的加载：

```javascript
window.CNC_LOADER.loadScript('./critical.js', {
  timeout: 5000,        // 5 秒超时
  retry: 3,             // 最多重试 3 次
  onProgress: function (status) {
    console.log(status.phase, status.src);
  }
});
```

### 5.2 loadCSS(href, options)

动态加载 CSS 样式。用法与 loadScript 类似。

```javascript
window.CNC_LOADER.loadCSS('./theme-dark.css').then(function (ok) {
  if (ok) document.body.classList.add('dark-theme');
});
```

### 5.3 loadJSON(url, options)

使用 fetch 加载 JSON 文件。在 `file://` 模式下，由于浏览器安全限制，会直接返回 `null` 并记录跳过。

```javascript
window.CNC_LOADER.loadJSON('./data.json').then(function (data) {
  if (data) {
    console.log('JSON 数据已加载:', data.length, '条');
  } else {
    console.warn('JSON 加载失败或跳过（file:// 模式）');
  }
});
```

支持进度回调：

```javascript
window.CNC_LOADER.loadJSON('./large-dataset.json', {
  onProgress: function (p) {
    if (p.phase === 'loading') console.log('正在加载...');
    else if (p.phase === 'complete') console.log('加载完成');
  }
});
```

### 5.4 preloadResources(list, onProgress)

批量预加载多种类型的资源。

```javascript
var resources = [
  { type: 'script', src: './module-a.js' },
  { type: 'css', href: './print-styles.css' },
  { type: 'script', src: './module-b.js', options: { timeout: 3000 } }
];

window.CNC_LOADER.preloadResources(resources, function (completed, total, item) {
  console.log('进度: ' + completed + '/' + total);
}).then(function (results) {
  console.log('所有资源预加载完成');
});
```

### 5.5 diagnoseLoadFailure(resource)

分析单个资源的加载失败原因，返回诊断信息对象。

```javascript
var diagnosis = window.CNC_LOADER.diagnoseLoadFailure('./data.json');
console.log('资源:', diagnosis.resource);
console.log('当前模式:', diagnosis.currentMode);
console.log('fetch 可用:', diagnosis.canFetch);
console.log('建议:', diagnosis.suggestions);
// 输出示例:
// 建议:
//   file:// 模式不支持 fetch 加载 JSON 文件，请使用 script-tag 或切换到 HTTP 服务
//   相对路径在 file:// 模式下可能无效，尝试使用完整路径
```

### 5.6 getStats()

获取加载统计信息。

```javascript
var stats = window.CNC_LOADER.getStats();
console.log('已加载:', stats.loaded);
console.log('失败:', stats.failed);
console.log('总计:', stats.total);
console.log('缓存大小:', stats.cacheSize);
```

### 5.7 getHistory(limit)

获取最近的加载历史记录。

```javascript
var history = window.CNC_LOADER.getHistory(10);
history.forEach(function (entry) {
  console.log(entry.timestamp, entry.type, entry.src, entry.status);
});
```

### 5.8 clearCache()

清空加载缓存，强制重新加载所有资源。

```javascript
window.CNC_LOADER.clearCache();
```

---

## 6. 诊断工具模块 (CNC_DIAGNOSTIC)

### 6.1 checkEnvironment()

检查运行时环境，返回诊断条目数组。

```javascript
var envChecks = window.CNC_DIAGNOSTIC.checkEnvironment();
envChecks.forEach(function (check) {
  console.log(check.name + ': ' + check.status + ' (' + check.value + ')');
});
```

### 6.2 checkResources()

检查关键资源是否已加载，返回诊断条目数组。

```javascript
var resourceChecks = window.CNC_DIAGNOSTIC.checkResources();
resourceChecks.forEach(function (check) {
  console.log(check.name + ': ' + check.status);
});
```

### 6.3 checkModules()

检查运行时模块在 window 对象上是否存在，返回诊断条目数组。

```javascript
var moduleChecks = window.CNC_DIAGNOSTIC.checkModules();
moduleChecks.forEach(function (check) {
  console.log('[' + check.status + '] ' + check.name + ': ' + check.value);
});
```

### 6.4 generateReport()

生成完整诊断报告（包含环境 + 资源 + 模块三项），返回报告对象。

```javascript
var report = window.CNC_DIAGNOSTIC.generateReport();
console.log('通过:', report.summary.pass);
console.log('警告:', report.summary.warn);
console.log('失败:', report.summary.fail);
```

### 6.5 printReport()

在浏览器控制台打印格式化的诊断报告。

```javascript
window.CNC_DIAGNOSTIC.printReport();
// 控制台输出示例:
// ✅ CNC 运行时诊断报告
//   时间戳: 2026-07-06T10:00:00.000Z
//   推荐策略: script-tag
//   ┌──────────────────────────────────────┐
//   │  检查汇总                              │
//   │  总计:  28 项                          │
//   │  ✅ 通过:  20 项                       │
//   │  ⚠️ 警告:  5 项                        │
//   │  ❌ 失败:  3 项                        │
//   └──────────────────────────────────────┘
```

---

## 7. 集成方式

### 7.1 标准集成（推荐）

在 index.html 中按依赖顺序添加 script 标签：

```html
<!-- 1. 基础数据 -->
<script src="./data.js"></script>

<!-- 2. 运行时四件套（按顺序） -->
<script src="./runtime-env-detector.js"></script>
<script src="./runtime-config.js"></script>
<script src="./runtime-loader.js"></script>
<script src="./runtime-diagnostic.js"></script>

<!-- 3. 运行时数据层 -->
<script src="./runtime-data-loader.js"></script>

<!-- 4. 运行时搜索层 -->
<script src="./runtime-search-layer.js"></script>

<!-- 5. 运行时图片层 -->
<script src="./runtime-image-layer.js"></script>

<!-- 6. 前端数据层 -->
<script src="./frontend-data-layer.js"></script>

<!-- 7. 主应用 -->
<script src="./app.js"></script>
```

### 7.2 公网部署

在公网服务器上部署时，运行时自动检测 `https://` 协议并启用 fetch 模式：

```html
<script>
  // 仅在 https 环境下改变配置
  if (window.location.protocol === 'https:') {
    CNC_CONFIG.switchMode('web');
    CNC_CONFIG.setConfig('cdn.enabled', true);
  }
</script>
```

### 7.3 动态加载集成

对于需要按需加载的场景，可以先加载 env-detector，然后根据环境决定后续加载策略：

```javascript
// 主入口: inline script
window.CNC_LOADER.loadScript('./runtime-env-detector.js').then(function () {
  if (CNC_ENV.canFetch()) {
    return CNC_LOADER.loadScript('./runtime-config.js');
  } else {
    // file:// 模式: 使用 script-tag
    var s = document.createElement('script');
    s.src = './runtime-config.js';
    document.body.appendChild(s);
  }
});
```

### 7.4 自定义配置嵌入

在 config 加载后、其他模块加载前，通过 inline script 注入自定义配置：

```html
<script src="./runtime-config.js"></script>
<script>
  CNC_CONFIG.importConfig({
    timeout: 15000,
    retryCount: 3,
    debug: true,
    resourcePriority: {
      critical: ['data.js', 'app.js'],
      normal: ['styles.css'],
      deferred: ['analytics.js']
    }
  });
</script>
<script src="./runtime-loader.js"></script>
```

---

## 8. 测试用例

以下测试用例均可在浏览器 DevTools 控制台中直接执行，无需额外测试框架。

### 8.1 环境检测测试

```
// TC-01: 协议检测
console.assert(
  ['file', 'http', 'https'].indexOf(CNC_ENV.detectProtocol()) !== -1,
  'TC-01 FAIL: 协议检测应返回 file/http/https'
);

// TC-02: 模式检测
var mode = CNC_ENV.getMode();
console.assert(
  ['file-local', 'localhost', 'production'].indexOf(mode) !== -1,
  'TC-02 FAIL: 模式应返回已知值，实际: ' + mode
);

// TC-03: fetch 能力检测
console.assert(
  typeof CNC_ENV.canFetch() === 'boolean',
  'TC-03 FAIL: canFetch() 应返回布尔值'
);

// TC-04: getEnvironmentInfo 完整性
var info = CNC_ENV.getEnvironmentInfo();
console.assert(info.protocol && info.mode && info.browser && info.capabilities && info.recommendedStrategy,
  'TC-04 FAIL: getEnvironmentInfo() 返回对象缺少字段'
);

// TC-05: 推荐策略包含 method
var strategy = CNC_ENV.getRecommendedStrategy();
console.assert(strategy.method === 'script-tag' || strategy.method === 'fetch',
  'TC-05 FAIL: 推荐策略 method 应为 script-tag 或 fetch'
);
```

### 8.2 配置管理测试

```
// TC-06: 读写配置
CNC_CONFIG.setConfig('testKey', 'testValue');
console.assert(CNC_CONFIG.getConfig('testKey') === 'testValue',
  'TC-06 FAIL: 配置写入后应能读取');
CNC_CONFIG.resetConfig();
console.assert(CNC_CONFIG.getConfig('testKey') === undefined,
  'TC-06 FAIL: 重置后自定义配置应消失');

// TC-07: 模式切换
CNC_CONFIG.switchMode('local');
console.assert(CNC_CONFIG.getConfig('mode') === 'local',
  'TC-07 FAIL: switchMode(local) 应设置 mode 为 local');
CNC_CONFIG.switchMode('auto');

// TC-08: 导出/导入
var original = CNC_CONFIG.getConfig('timeout');
CNC_CONFIG.importConfig({ timeout: 9999 });
console.assert(CNC_CONFIG.getConfig('timeout') === 9999,
  'TC-08 FAIL: import 后 timeout 应变为 9999');
CNC_CONFIG.setConfig('timeout', original);

// TC-09: onChange 监听器触发
var changed = false;
var unsub = CNC_CONFIG.onChange(function () { changed = true; });
CNC_CONFIG.setConfig('debug', true);
console.assert(changed === true,
  'TC-09 FAIL: 配置变更应触发 onChange');
// 注: onChange 返回取消订阅函数，但当前实现不直接支持 unsub，需要手动清空 listeners
```

### 8.3 加载器测试

```
// TC-10: loadScript 返回 Promise
var p = CNC_LOADER.loadScript('./data.js');
console.assert(p && typeof p.then === 'function',
  'TC-10 FAIL: loadScript 应返回 Promise');

// TC-11: 加载历史记录
var before = CNC_LOADER.getHistory(1).length;
CNC_LOADER.loadScript('./data.js').then(function () {
  var after = CNC_LOADER.getHistory(1).length;
  console.assert(after >= before,
    'TC-11 FAIL: 加载后历史记录应增加');
});

// TC-12: 统计信息
var stats = CNC_LOADER.getStats();
console.assert(typeof stats.loaded === 'number',
  'TC-12 FAIL: getStats() 应返回数字统计');

// TC-13: 加载失败诊断
var diag = CNC_LOADER.diagnoseLoadFailure('./nonexistent-file.js');
console.assert(Array.isArray(diag.suggestions) && diag.suggestions.length > 0,
  'TC-13 FAIL: 诊断应包含建议');
```

### 8.4 诊断测试

```
// TC-14: checkEnvironment 返回数组
var checks = CNC_DIAGNOSTIC.checkEnvironment();
console.assert(Array.isArray(checks) && checks.length > 0,
  'TC-14 FAIL: checkEnvironment 应返回非空数组');

// TC-15: checkModules 返回数组
var mods = CNC_DIAGNOSTIC.checkModules();
console.assert(Array.isArray(mods) && mods.length > 0,
  'TC-15 FAIL: checkModules 应返回非空数组');

// TC-16: generateReport 包含所有字段
var report = CNC_DIAGNOSTIC.generateReport();
console.assert(report.environment && report.resources && report.modules && report.summary,
  'TC-16 FAIL: 报告应包含 environment/resources/modules/summary');

// TC-17: printReport 不抛出异常
try {
  CNC_DIAGNOSTIC.printReport();
  console.log('TC-17 PASS: printReport 执行无异常');
} catch (e) {
  console.error('TC-17 FAIL: printReport 抛出异常:', e.message);
}
```

---

## 9. 常见问题

### Q1: file:// 模式下 JSON 文件为什么无法加载？

浏览器安全策略禁止 `file://` 协议下的 XMLHttpRequest 和 fetch 请求。解决方案：

1. 将 JSON 数据通过 script-tag 以内联变量的形式注入 HTML
2. 使用 HTTP 服务器（如 `npx serve .` 或 `python -m http.server`）提供服务
3. 运行时自动检测并给出提示（见 `CNC_LOADER.diagnoseLoadFailure()`）

### Q2: 如何判断当前是本地模式还是公网模式？

```javascript
var mode = window.CNC_ENV ? window.CNC_ENV.getMode() : 'unknown';
if (mode === 'production') {
  // 公网模式: 使用 CDN
} else {
  // 本地模式: 使用相对路径
}
```

### Q3: 运行时是否支持移动端浏览器？

支持。运行时会自动检测移动端并给出 WARN 级别的提示，所有模块均兼容移动端 Chrome 和 Safari。

### Q4: 是否支持 Service Worker？

运行时配置中包含 `enableServiceWorker` 字段，但默认关闭。Service Worker 仅在 `https://` 或 `localhost` 协议下可用，`file://` 协议不支持。

### Q5: 脚本加载顺序出错会怎样？

若加载顺序错误（如 `runtime-config.js` 在 `runtime-env-detector.js` 之前加载），config 模块会启用轮询机制（50ms 间隔，5 秒超时）等待 env-detector 就绪。但如果其他脚本加载顺序错误，可能导致 `CNC_*` 对象未定义，控制台报 `ReferenceError`。

### Q6: 如何调试运行时加载问题？

```javascript
// 打开详细日志
CNC_CONFIG.setConfig('debug', true);

// 运行诊断
CNC_DIAGNOSTIC.printReport();

// 检查模块
var missingModules = CNC_DIAGNOSTIC.checkModules()
  .filter(function (m) { return m.status === 'FAIL'; });
console.log('缺失模块:', missingModules);
```

### Q7: 重置配置后自定义配置丢失怎么办？

`resetConfig()` 恢复出厂默认值。如需保留自定义配置，使用 `exportConfig()` 导出后再调用 `importConfig()` 恢复：

```javascript
var backup = CNC_CONFIG.exportConfig();
CNC_CONFIG.resetConfig();
CNC_CONFIG.importConfig(backup);
```

### Q8: 是否需要构建工具？

不需要。所有运行时脚本为纯 ES5 语法，无 import/export 语句，所有模块通过 IIFE 封装，可直接在浏览器中运行。

### Q9: loadScript 和 document.write 的区别？

`loadScript` 使用 DOM 方法 `document.body.appendChild()` 动态添加 script 标签，不会阻塞页面渲染，且支持超时和重试。`document.write` 会阻塞渲染且在异步加载中不可用。

### Q10: 如何自定义超时和重试策略？

```javascript
// 全局设置
CNC_CONFIG.setConfig('timeout', 15000);  // 15 秒
CNC_CONFIG.setConfig('retryCount', 3);   // 重试 3 次
CNC_CONFIG.setConfig('retryDelay', 500); // 间隔 500ms

// 单次加载覆盖
CNC_LOADER.loadScript('./heavy.js', {
  timeout: 30000,
  retry: 1
});
```

---

## 附录: 控制台快速验证

加载完成后，依次执行以下 6 条命令验证模块工作正常：

```javascript
// 1. 环境检测
console.log('协议:', CNC_ENV.detectProtocol());

// 2. 环境信息
console.log('环境信息:', CNC_ENV.getEnvironmentInfo());

// 3. 读取配置
console.log('当前模式:', CNC_CONFIG.getConfig('mode'));

// 4. 切换模式
CNC_CONFIG.switchMode('web');
console.log('切换后模式:', CNC_CONFIG.getConfig('mode'));
CNC_CONFIG.switchMode('auto');

// 5. 脚本加载
CNC_LOADER.loadScript('./data.js').then(function (r) {
  console.log('加载结果:', r);
});

// 6. 诊断报告
CNC_DIAGNOSTIC.printReport();
```
