/**
 * runtime-diagnostic.js
 * 运行时诊断工具模块 — 检查环境/资源/模块，生成结构化报告
 * 全局对象: window.CNC_DIAGNOSTIC
 * 可在浏览器控制台直接调用:
 *   window.CNC_DIAGNOSTIC.checkEnvironment()
 *   window.CNC_DIAGNOSTIC.printReport()
 */
(function () {
  'use strict';

  if (window.CNC_DIAGNOSTIC) return;

  // ========================================
  // 诊断缓存
  // ========================================
  var _lastReport = null;

  // ========================================
  // 关键资源清单
  // ========================================
  var _criticalResources = [
    { name: 'data.js', type: 'script', path: './data.js' },
    { name: 'app.js', type: 'script', path: './app.js' },
    { name: 'styles.css', type: 'css', path: './styles.css' }
  ];

  var _keyModules = [
    { name: 'CNC_ENV', global: 'CNC_ENV', required: true },
    { name: 'CNC_CONFIG', global: 'CNC_CONFIG', required: true },
    { name: 'CNC_LOADER', global: 'CNC_LOADER', required: true },
    { name: 'CNC_DIAGNOSTIC', global: 'CNC_DIAGNOSTIC', required: true },
    { name: 'CNC_DATA', global: 'CNC_DATA', required: true },
    { name: 'CNC_RUNTIME', global: 'CNC_RUNTIME', required: false },
    { name: 'CNC_FRONTEND', global: 'CNC_FRONTEND', required: false },
    { name: 'CNC_SEARCH_ALIASES', global: 'CNC_SEARCH_ALIASES', required: false },
    { name: 'CNC_KB_EXTRA', global: 'CNC_KB_EXTRA', required: false }
  ];

  // ========================================
  // 检查环境配置
  // ========================================
  function checkEnvironment() {
    var env = window.CNC_ENV;
    var config = window.CNC_CONFIG;
    var results = [];

    // 1. 协议检查
    if (env) {
      var proto = env.detectProtocol();
      results.push({
        category: '协议',
        name: 'protocol',
        value: proto,
        status: proto !== 'unknown' ? 'PASS' : 'FAIL',
        detail: proto === 'file' ? 'file:// 模式：fetch 不可用，script-tag 可用' : proto + ' 模式：所有加载方式可用'
      });

      var mode = env.getMode();
      results.push({
        category: '模式',
        name: 'runMode',
        value: mode,
        status: mode !== 'unknown' ? 'PASS' : 'FAIL',
        detail: mode === 'file-local' ? '本地文件模式' : mode === 'localhost' ? '本地服务模式' : '公网模式'
      });

      var caps = env.detectCapabilities();
      results.push({
        category: '能力',
        name: 'fetch',
        value: String(caps.fetch),
        status: caps.fetch ? 'PASS' : 'WARN',
        detail: caps.fetch ? 'fetch API 可用' : 'fetch 不可用（file:// 模式限制）'
      });
      results.push({
        category: '能力',
        name: 'localStorage',
        value: String(caps.localStorage),
        status: caps.localStorage ? 'PASS' : 'FAIL',
        detail: 'localStorage 可用于持久化缓存'
      });

      var browser = env.detectBrowser();
      results.push({
        category: '浏览器',
        name: 'browserType',
        value: browser.isChrome ? 'Chrome' : browser.isFirefox ? 'Firefox' : browser.isSafari ? 'Safari' : browser.isEdge ? 'Edge' : '其他',
        status: 'INFO',
        detail: browser.userAgent
      });

      results.push({
        category: '浏览器',
        name: 'isMobile',
        value: String(browser.isMobile),
        status: browser.isMobile ? 'WARN' : 'PASS',
        detail: browser.isMobile ? '移动端浏览器，部分功能可能受限' : '桌面端浏览器'
      });
    } else {
      results.push({
        category: '模块',
        name: 'CNC_ENV',
        value: '未加载',
        status: 'FAIL',
        detail: '环境检测模块未加载，请确认 script 标签包含 runtime-env-detector.js'
      });
    }

    // 2. 配置检查
    if (config) {
      var cfgMode = config.getConfig('mode');
      var timeout = config.getConfig('timeout');
      results.push({
        category: '配置',
        name: 'configMode',
        value: cfgMode,
        status: 'PASS',
        detail: '当前配置模式: ' + cfgMode
      });
      results.push({
        category: '配置',
        name: 'timeout',
        value: String(timeout),
        status: timeout >= 3000 ? 'PASS' : 'WARN',
        detail: '加载超时: ' + timeout + 'ms'
      });
      results.push({
        category: '配置',
        name: 'cdnEnabled',
        value: String(config.getConfig('cdn.enabled')),
        status: 'INFO',
        detail: 'CDN 模式: ' + (config.getConfig('cdn.enabled') ? '已启用' : '未启用')
      });
    }

    return results;
  }

  // ========================================
  // 检查资源加载状态
  // ========================================
  function checkResources() {
    var loader = window.CNC_LOADER;
    var results = [];
    var allResources = _criticalResources.slice();

    // 尝试从配置中获取更多资源
    var config = window.CNC_CONFIG;
    if (config) {
      var priorities = config.getConfig('resourcePriority');
      if (priorities) {
        Object.keys(priorities).forEach(function (level) {
          priorities[level].forEach(function (name) {
            if (!allResources.some(function (r) { return r.name === name; })) {
              allResources.push({ name: name, type: 'script', path: './' + name, priority: level });
            }
          });
        });
      }
    }

    allResources.forEach(function (res) {
      var exists = false;
      try {
        // 尝试通过判断 script/link 标签是否存在来检测
        if (res.type === 'script') {
          var scripts = document.querySelectorAll('script[src]');
          for (var i = 0; i < scripts.length; i++) {
            if (scripts[i].src.indexOf(res.name) !== -1) { exists = true; break; }
          }
        } else if (res.type === 'css') {
          var links = document.querySelectorAll('link[rel="stylesheet"]');
          for (var j = 0; j < links.length; j++) {
            if (links[j].href.indexOf(res.name) !== -1) { exists = true; break; }
          }
        }
      } catch (e) { /* ignore */ }

      results.push({
        category: '资源',
        name: res.name,
        type: res.type,
        value: exists ? '已加载' : '未检测到',
        status: exists ? 'PASS' : 'WARN',
        detail: res.priority ? '优先级: ' + res.priority : ''
      });
    });

    // 检查 JSON 数据是否可通过 CNC_FRONTEND 访问
    if (window.CNC_FRONTEND) {
      ['suggestions', 'index', 'riskKeywords', 'faq'].forEach(function (key) {
        var data = window.CNC_FRONTEND[key];
        results.push({
          category: '数据',
          name: 'CNC_FRONTEND.' + key,
          value: data ? (Array.isArray(data) ? data.length + ' 条' : '已加载') : '未加载',
          status: data ? 'PASS' : 'WARN',
          detail: key + ' 数据来源: opencode_frontend_ready/'
        });
      });
    } else {
      results.push({
        category: '数据',
        name: 'CNC_FRONTEND',
        value: '未加载',
        status: 'WARN',
        detail: '前端数据层未加载（file:// 模式不支持 fetch）'
      });
    }

    // 检查图片数据
    ['CNC_FEATURED_IMAGES', 'CNC_FEATURED_IMAGES_EXTENDED', 'CNC_GALLERY_LIBRARY', 'CNC_GALLERY_LIBRARY_ENHANCED'].forEach(function (g) {
      var data = window[g];
      results.push({
        category: '图片',
        name: g,
        value: data ? (typeof data === 'object' ? (Array.isArray(data) ? data.length + ' 条' : Object.keys(data).length + ' 键') : '已加载') : '未加载',
        status: data ? 'PASS' : 'WARN',
        detail: ''
      });
    });

    return results;
  }

  // ========================================
  // 检查模块依赖
  // ========================================
  function checkModules() {
    var results = [];

    _keyModules.forEach(function (mod) {
      var exists = !!window[mod.global];
      results.push({
        category: '模块',
        name: mod.global,
        value: exists ? '已加载' : '未加载',
        status: exists ? 'PASS' : (mod.required ? 'FAIL' : 'WARN'),
        detail: mod.required ? '必需模块' : '可选模块'
      });
    });

    // 检查运行时子模块
    if (window.CNC_RUNTIME) {
      ['DataLoader', 'SearchEngine', 'ImageLayer'].forEach(function (sub) {
        var exists = !!window.CNC_RUNTIME[sub];
        results.push({
          category: '运行时子模块',
          name: 'CNC_RUNTIME.' + sub,
          value: exists ? '已加载' : '未加载',
          status: exists ? 'PASS' : 'WARN',
          detail: sub === 'DataLoader' ? '装载器' : sub === 'SearchEngine' ? '搜索层' : '图片层'
        });
      });
    }

    return results;
  }

  // ========================================
  // 生成诊断报告
  // ========================================
  function generateReport() {
    var report = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      environment: checkEnvironment(),
      resources: checkResources(),
      modules: checkModules(),
      summary: {
        total: 0,
        pass: 0,
        warn: 0,
        fail: 0,
        info: 0
      }
    };

    // 汇总
    var allChecks = [].concat(report.environment, report.resources, report.modules);
    report.summary.total = allChecks.length;
    allChecks.forEach(function (check) {
      if (check.status === 'PASS') report.summary.pass++;
      else if (check.status === 'WARN') report.summary.warn++;
      else if (check.status === 'FAIL') report.summary.fail++;
      else if (check.status === 'INFO') report.summary.info++;
    });

    // 添加推荐策略
    if (window.CNC_ENV) {
      report.recommendedStrategy = window.CNC_ENV.getRecommendedStrategy();
    }

    if (window.CNC_CONFIG) {
      report.currentConfig = {
        mode: window.CNC_CONFIG.getConfig('mode'),
        timeout: window.CNC_CONFIG.getConfig('timeout'),
        enableFallback: window.CNC_CONFIG.getConfig('enableFallback'),
        enableServiceWorker: window.CNC_CONFIG.getConfig('enableServiceWorker')
      };
    }

    _lastReport = report;
    return report;
  }

  /**
   * 打印诊断报告到控制台
   */
  function printReport() {
    var report = _lastReport || generateReport();
    var bgColor = report.summary.fail > 0 ? '#c33' : report.summary.warn > 0 ? '#c90' : '#1a6b4f';
    var icon = report.summary.fail > 0 ? '❌' : report.summary.warn > 0 ? '⚠️' : '✅';

    console.log('%c' + icon + ' CNC 运行时诊断报告', 'font-size:18px;font-weight:bold;color:' + bgColor + ';');
    console.log('  时间戳: ' + report.timestamp);
    console.log('  当前 URL: ' + report.url);
    console.log('  推荐策略: ' + (report.recommendedStrategy || 'N/A'));
    console.log('');
    console.log('  ┌──────────────────────────────────────┐');
    console.log('  │  检查汇总                              │');
    console.log('  │  总计: ' + String(report.summary.total).padStart(3) + ' 项                              │');
    console.log('  │  ✅ 通过: ' + String(report.summary.pass).padStart(3) + ' 项                              │');
    console.log('  │  ⚠️ 警告: ' + String(report.summary.warn).padStart(3) + ' 项                              │');
    console.log('  │  ❌ 失败: ' + String(report.summary.fail).padStart(3) + ' 项                              │');
    console.log('  │  ℹ️  信息: ' + String(report.summary.info).padStart(3) + ' 项                              │');
    console.log('  └──────────────────────────────────────┘');
    console.log('');

    // 按类别输出
    var categories = {};
    [].concat(report.environment, report.resources, report.modules).forEach(function (check) {
      if (!categories[check.category]) categories[check.category] = [];
      categories[check.category].push(check);
    });

    Object.keys(categories).forEach(function (cat) {
      console.log('[' + cat + ']');
      categories[cat].forEach(function (check) {
        var icon = check.status === 'PASS' ? '✅' : check.status === 'WARN' ? '⚠️' : check.status === 'FAIL' ? '❌' : 'ℹ️';
        console.log('  ' + icon + ' ' + check.name + ' = ' + check.value + (check.detail ? ' (' + check.detail + ')' : ''));
      });
      console.log('');
    });

    if (report.currentConfig) {
      console.log('[配置]');
      Object.keys(report.currentConfig).forEach(function (key) {
        console.log('  ' + key + ': ' + JSON.stringify(report.currentConfig[key]));
      });
      console.log('');
    }

    console.log('报告生成完成。调用 window.CNC_DIAGNOSTIC.checkModules() 查看详细模块状态。');
  }

  // ========================================
  // 导出全局对象
  // ========================================
  window.CNC_DIAGNOSTIC = {
    checkEnvironment: checkEnvironment,
    checkResources: checkResources,
    checkModules: checkModules,
    generateReport: generateReport,
    printReport: printReport,
    getLastReport: function () { return _lastReport; }
  };

  console.log('[CNC_DIAGNOSTIC] 运行时诊断工具已加载。调用 window.CNC_DIAGNOSTIC.printReport() 打印完整报告。');
})();
