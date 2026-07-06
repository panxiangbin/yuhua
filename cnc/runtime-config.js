/**
 * runtime-config.js
 * 运行时配置管理模块 — 管理本地/公网双模式配置
 * 全局对象: window.CNC_CONFIG
 * 可在浏览器控制台直接调用:
 *   window.CNC_CONFIG.getConfig('mode')
 *   window.CNC_CONFIG.switchMode('web')
 *   window.CNC_CONFIG.setConfig('basePath', './dist/')
 */
(function () {
  'use strict';

  if (window.CNC_CONFIG) return;

  // ========================================
  // 默认配置
  // ========================================
  var _defaults = {
    // 模式: 'auto' | 'local' | 'web'
    mode: 'auto',
    // 基础路径
    basePath: './',
    // 数据文件路径
    dataPath: './',
    // 图片资产路径
    imagePath: './assets/images/',
    // 前端就绪数据路径
    frontendDataPath: './opencode_frontend_ready/',
    // 超时配置（毫秒）
    timeout: 10000,
    // 重试次数
    retryCount: 2,
    // 重试间隔（毫秒）
    retryDelay: 1000,
    // 是否启用详细日志
    verbose: true,
    // 是否启用降级
    enableFallback: true,
    // 是否启用 Service Worker
    enableServiceWorker: true,
    // 是否启用 localStorage 缓存
    enableCache: true,
    // 最大缓存条目数
    maxCacheItems: 500,
    // CDN 配置（公网模式使用）
    cdn: {
      enabled: false,
      baseUrl: '',
      fallbackToLocal: true
    },
    // 资源优先级配置
    resourcePriority: {
      critical: ['data.js', 'app.js', 'styles.css'],
      high: ['search-aliases.js', 'featured-images.js'],
      medium: ['gallery-library.js', 'kb-extra.js'],
      low: ['knowledge-core-01.js', 'knowledge-core-02.js']
    }
  };

  // ========================================
  // 当前配置（深拷贝默认值）
  // ========================================
  function cloneObject(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  var _config = cloneObject(_defaults);

  // ========================================
  // 覆盖记录（用于诊断回滚）
  // ========================================
  var _overrides = {};

  // ========================================
  // 回调列表
  // ========================================
  var _listeners = [];

  /**
   * 根据运行模式自动推断配置
   */
  function autoDetectConfig() {
    var env = window.CNC_ENV;
    if (!env) return;
    var mode = env.getMode();

    if (mode === 'file-local') {
      _config.mode = 'local';
      _config.basePath = './';
      _config.dataPath = './';
      _config.imagePath = './assets/images/';
      _config.frontendDataPath = './opencode_frontend_ready/';
      _config.cdn.enabled = false;
      _config.enableServiceWorker = false;
      _config.timeout = 5000;
    } else if (mode === 'localhost') {
      _config.mode = 'local';
      _config.basePath = './';
      _config.dataPath = './';
      _config.imagePath = './assets/images/';
      _config.frontendDataPath = './opencode_frontend_ready/';
      _config.cdn.enabled = false;
      _config.enableServiceWorker = true;
      _config.timeout = 10000;
    } else if (mode === 'web') {
      _config.mode = 'web';
      _config.basePath = './';
      _config.dataPath = './';
      _config.imagePath = './assets/images/';
      _config.frontendDataPath = './opencode_frontend_ready/';
      _config.cdn.enabled = false;
      _config.enableServiceWorker = true;
      _config.timeout = 15000;
    }
  }

  /**
   * 获取完整配置或指定 key 的配置
   * @param {string} key - 可选，点号分隔如 'cdn.baseUrl'
   */
  function getConfig(key) {
    if (!key) return cloneObject(_config);
    var keys = key.split('.');
    var val = _config;
    for (var i = 0; i < keys.length; i++) {
      if (val == null) return undefined;
      val = val[keys[i]];
    }
    return val;
  }

  /**
   * 设置配置
   * @param {string} key - 点号分隔键名
   * @param {*} value - 配置值
   * @returns {boolean} 是否设置成功
   */
  function setConfig(key, value) {
    if (!key) return false;
    var keys = key.split('.');
    var target = _config;
    for (var i = 0; i < keys.length - 1; i++) {
      if (target[keys[i]] == null) target[keys[i]] = {};
      target = target[keys[i]];
    }
    var lastKey = keys[keys.length - 1];
    _overrides[key] = { from: target[lastKey], to: value, timestamp: new Date().toISOString() };
    target[lastKey] = value;
    // 触发回调
    for (var j = 0; j < _listeners.length; j++) {
      try { _listeners[j](key, value); } catch (e) { console.warn('[CNC_CONFIG] 回调异常:', e); }
    }
    console.log('[CNC_CONFIG] 配置已更新: ' + key + ' =', value);
    return true;
  }

  /**
   * 切换运行模式
   * @param {'auto'|'local'|'web'} mode
   */
  function switchMode(mode) {
    if (['auto', 'local', 'web'].indexOf(mode) === -1) {
      console.warn('[CNC_CONFIG] 无效模式: ' + mode + '，仅支持 auto/local/web');
      return false;
    }
    _config.mode = mode;
    if (mode === 'auto') {
      autoDetectConfig();
    } else if (mode === 'local') {
      setConfig('basePath', './');
      setConfig('cdn.enabled', false);
      setConfig('enableServiceWorker', false);
    } else if (mode === 'web') {
      setConfig('basePath', './');
      setConfig('cdn.enabled', false);
      setConfig('enableServiceWorker', true);
    }
    console.log('[CNC_CONFIG] 模式已切换为: ' + mode);
    return true;
  }

  /**
   * 重置为默认配置
   */
  function resetConfig() {
    _config = cloneObject(_defaults);
    _overrides = {};
    autoDetectConfig();
    console.log('[CNC_CONFIG] 已重置为默认配置');
    return true;
  }

  /**
   * 获取覆盖历史
   */
  function getOverrideHistory() {
    return cloneObject(_overrides);
  }

  /**
   * 注册配置变更监听器
   * @param {function} callback - (key, value) => void
   */
  function onChange(callback) {
    if (typeof callback === 'function') _listeners.push(callback);
  }

  /**
   * 移除配置变更监听器
   */
  function offChange(callback) {
    var idx = _listeners.indexOf(callback);
    if (idx !== -1) _listeners.splice(idx, 1);
  }

  /**
   * 导出当前配置为 JSON 字符串
   */
  function exportConfig() {
    return JSON.stringify(_config, null, 2);
  }

  /**
   * 从 JSON 字符串导入配置
   */
  function importConfig(jsonStr) {
    try {
      var obj = JSON.parse(jsonStr);
      Object.keys(obj).forEach(function (key) {
        setConfig(key, obj[key]);
      });
      return true;
    } catch (e) {
      console.warn('[CNC_CONFIG] 导入配置失败:', e);
      return false;
    }
  }

  // ========================================
  // 自动检测
  // ========================================
  if (window.CNC_ENV) {
    autoDetectConfig();
  } else {
    // 等 CNC_ENV 加载后再检测
    var _checkInterval = setInterval(function () {
      if (window.CNC_ENV) {
        clearInterval(_checkInterval);
        autoDetectConfig();
        console.log('[CNC_CONFIG] 环境已就绪，配置已自动适配');
      }
    }, 50);
    // 5秒后停止等待
    setTimeout(function () { clearInterval(_checkInterval); }, 5000);
  }

  // ========================================
  // 导出全局对象
  // ========================================
  window.CNC_CONFIG = {
    getConfig: getConfig,
    setConfig: setConfig,
    switchMode: switchMode,
    resetConfig: resetConfig,
    getOverrideHistory: getOverrideHistory,
    onChange: onChange,
    offChange: offChange,
    exportConfig: exportConfig,
    importConfig: importConfig
  };

  console.log('[CNC_CONFIG] 运行时配置模块已加载。模式: ' + _config.mode + ', 超时: ' + _config.timeout + 'ms');
})();
