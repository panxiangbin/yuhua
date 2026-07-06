/**
 * theme-manager.js
 * 主题管理器 — 亮色/暗色/高对比/自定义主题/预览/持久化/CSS变量枚举/批量操作
 * 全局对象: window.CNC_THEME
 */
(function () {
  'use strict';

  if (window.CNC_THEME) return;

  var _current = 'light';
  var _themes = {
    light: {
      name: '亮色模式',
      vars: {
        '--bg-color': '#ffffff',
        '--text-color': '#2c3e50',
        '--primary-color': '#2980b9',
        '--secondary-color': '#34495e',
        '--border-color': '#dcdde1',
        '--shadow-color': 'rgba(0,0,0,0.1)',
        '--card-bg': '#f5f6fa',
        '--hover-bg': '#ecf0f1',
        '--input-bg': '#ffffff',
        '--header-bg': '#2c3e50',
        '--header-text': '#ffffff'
      }
    },
    dark: {
      name: '暗色模式',
      vars: {
        '--bg-color': '#1a1a2e',
        '--text-color': '#e0e0e0',
        '--primary-color': '#3498db',
        '--secondary-color': '#95a5a6',
        '--border-color': '#2d2d44',
        '--shadow-color': 'rgba(0,0,0,0.3)',
        '--card-bg': '#16213e',
        '--hover-bg': '#1a1a3e',
        '--input-bg': '#0f3460',
        '--header-bg': '#0f3460',
        '--header-text': '#e0e0e0'
      }
    },
    highcontrast: {
      name: '高对比模式',
      vars: {
        '--bg-color': '#000000',
        '--text-color': '#ffffff',
        '--primary-color': '#ffff00',
        '--secondary-color': '#00ffff',
        '--border-color': '#ffffff',
        '--shadow-color': 'rgba(255,255,255,0.2)',
        '--card-bg': '#111111',
        '--hover-bg': '#222222',
        '--input-bg': '#000000',
        '--header-bg': '#000000',
        '--header-text': '#ffff00'
      }
    }
  };
  var _listeners = [];
  var _STORAGE_KEY = 'cnc_theme';
  var _customVars = {};

  function _loadTheme() {
    try {
      var saved = localStorage.getItem(_STORAGE_KEY);
      if (saved) {
        var parsed = JSON.parse(saved);
        if (parsed && _themes[parsed] !== undefined) {
          _current = parsed;
          return;
        }
      }
    } catch (e) { }
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) _current = 'dark';
  }

  function _apply(vars) {
    var root = document.documentElement;
    for (var key in vars) {
      if (vars.hasOwnProperty(key)) {
        root.style.setProperty(key, vars[key]);
      }
    }
  }

  function _getCurrentVars() {
    var vars = {};
    var base = _themes[_current] || _themes.light;
    for (var k in base.vars) {
      if (base.vars.hasOwnProperty(k)) vars[k] = base.vars[k];
    }
    for (var ck in _customVars) {
      if (_customVars.hasOwnProperty(ck)) vars[ck] = _customVars[ck];
    }
    return vars;
  }

  function _notify(themeName) {
    for (var i = 0; i < _listeners.length; i++) {
      try { _listeners[i](themeName); } catch (e) { }
    }
  }

  function _persist() {
    try { localStorage.setItem(_STORAGE_KEY, JSON.stringify(_current)); } catch (e) { }
  }

  function _validateThemeName(name) {
    return name && /^[a-zA-Z0-9_-]+$/.test(name);
  }

  function init() {
    _loadTheme();
    applyTheme(_current);
  }

  function applyTheme(themeName) {
    if (!_validateThemeName(themeName)) return false;
    if (!_themes[themeName]) return false;
    _current = themeName;
    var vars = _getCurrentVars();
    _apply(vars);
    _persist();
    document.documentElement.setAttribute('data-theme', _current);
    _notify(_current);
    return true;
  }

  function getTheme() {
    return _current;
  }

  function getAvailableThemes() {
    var list = [];
    for (var key in _themes) {
      if (_themes.hasOwnProperty(key)) {
        list.push({ id: key, name: _themes[key].name });
      }
    }
    return list;
  }

  function addTheme(id, name, vars) {
    if (!_validateThemeName(id)) return false;
    if (!name || typeof name !== 'string') return false;
    if (!vars || typeof vars !== 'object') return false;
    if (_themes[id]) return false;

    var required = ['--bg-color', '--text-color', '--primary-color'];
    for (var i = 0; i < required.length; i++) {
      if (vars[required[i]] === undefined) return false;
    }
    _themes[id] = { name: name, vars: vars };
    return true;
  }

  function removeTheme(id) {
    if (id === 'light' || id === 'dark' || id === 'highcontrast') return false;
    if (!_themes[id]) return false;
    delete _themes[id];
    return true;
  }

  function setCustomVar(name, value) {
    if (!name || typeof name !== 'string') return false;
    if (!name.startsWith('--')) return false;
    _customVars[name] = String(value);
    _apply(_getCurrentVars());
    return true;
  }

  function removeCustomVar(name) {
    if (!name || typeof name !== 'string') return false;
    if (!_customVars[name]) return false;
    delete _customVars[name];
    _apply(_getCurrentVars());
    return true;
  }

  function getCustomVars() {
    var copy = {};
    for (var k in _customVars) {
      if (_customVars.hasOwnProperty(k)) copy[k] = _customVars[k];
    }
    return copy;
  }

  function resetToDefault() {
    _customVars = {};
    applyTheme(_current);
  }

  function getCSSVars() {
    var vars = _getCurrentVars();
    var list = [];
    for (var k in vars) {
      if (vars.hasOwnProperty(k)) {
        list.push({ name: k, value: vars[k], source: _customVars[k] ? 'custom' : 'theme' });
      }
    }
    return list;
  }

  function previewTheme(themeName) {
    if (!_themes[themeName]) return false;
    var vars = {};
    var base = _themes[themeName];
    for (var k in base.vars) {
      if (base.vars.hasOwnProperty(k)) vars[k] = base.vars[k];
    }
    for (var ck in _customVars) {
      if (_customVars.hasOwnProperty(ck)) vars[ck] = _customVars[ck];
    }
    _apply(vars);
    return true;
  }

  function onThemeChange(callback) {
    if (typeof callback !== 'function') return false;
    _listeners.push(callback);
    return _listeners.length;
  }

  function removeListener(callback) {
    var idx = _listeners.indexOf(callback);
    if (idx > -1) { _listeners.splice(idx, 1); return true; }
    return false;
  }

  init();

  window.CNC_THEME = {
    applyTheme: applyTheme,
    getTheme: getTheme,
    getAvailableThemes: getAvailableThemes,
    addTheme: addTheme,
    removeTheme: removeTheme,
    setCustomVar: setCustomVar,
    removeCustomVar: removeCustomVar,
    getCustomVars: getCustomVars,
    resetToDefault: resetToDefault,
    getCSSVars: getCSSVars,
    previewTheme: previewTheme,
    onThemeChange: onThemeChange,
    removeListener: removeListener
  };

  console.log('[CNC_THEME] 主题管理器已加载。当前主题: ' + _current);
})();
