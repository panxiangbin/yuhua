/**
 * keyboard-shortcuts.js
 * 快捷键管理器 — 注册/注销/分组/冲突检测/导出/导入/范围控制/统计
 * 全局对象: window.CNC_SHORTCUTS
 */
(function () {
  'use strict';

  if (window.CNC_SHORTCUTS) return;

  var _shortcuts = {};
  var _groups = {};
  var _scopes = {};
  var _enabled = true;
  var _activeScope = 'default';
  var _statistics = { registered: 0, fired: 0, conflicts: 0 };

  function _addShortcut(shortcut, callback, group, scope) {
    if (!shortcut || typeof shortcut !== 'string') return { success: false, error: '快捷键不能为空' };
    if (typeof callback !== 'function') return { success: false, error: '回调必须是函数' };

    var normalized = _normalizeKey(shortcut);
    if (!normalized) return { success: false, error: '无效的快捷键组合' };
    if (_shortcuts[normalized]) {
      return { success: false, error: '快捷键 "' + normalized + '" 已被注册' };
    }

    _shortcuts[normalized] = {
      shortcut: normalized,
      callback: callback,
      group: group || 'default',
      scope: scope || 'default',
      description: ''
    };
    _statistics.registered++;

    if (group && !_groups[group]) _groups[group] = [];
    if (group && _groups[group].indexOf(normalized) === -1) _groups[group].push(normalized);

    if (!_scopes[scope]) _scopes[scope] = [];
    _scopes[scope].push(normalized);

    return { success: true };
  }

  function _normalizeKey(key) {
    if (!key) return '';
    var parts = key.toLowerCase().split('+').map(function (p) { return p.trim(); }).filter(function (p) { return p; });
    parts.sort();
    var valid = ['ctrl', 'alt', 'shift', 'meta'];
    var hasModifier = false;
    for (var i = 0; i < parts.length; i++) {
      if (valid.indexOf(parts[i]) > -1) hasModifier = true;
    }
    return parts.join('+');
  }

  function _matchKey(e) {
    var parts = [];
    if (e.ctrlKey || e.metaKey) parts.push('ctrl');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');
    if (e.metaKey && !e.ctrlKey) {
      var idx = parts.indexOf('meta');
      if (idx === -1) parts.push('meta');
    }
    var key = e.key ? e.key.toLowerCase() : '';
    if (key === 'control' || key === 'alt' || key === 'shift' || key === 'meta') {
      return '';
    }
    if (key) parts.push(key);
    parts.sort();
    return parts.join('+');
  }

  function _handleKeyDown(e) {
    if (!_enabled) return;
    var combined = _matchKey(e);

    if (!combined) return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
      return;
    }
    var shortcut = _shortcuts[combined];
    if (shortcut && shortcut.scope === _activeScope) {
      e.preventDefault();
      _statistics.fired++;
      try { shortcut.callback(e, shortcut); } catch (ex) { console.warn('[CNC_SHORTCUTS] 快捷键回调异常:', ex); }
    }
  }

  function register(shortcut, callback, description) {
    var result = _addShortcut(shortcut, callback, undefined, undefined);
    if (result.success && description) {
      _shortcuts[_normalizeKey(shortcut)].description = description;
    }
    return result;
  }

  function registerGroup(group, shortcuts) {
    if (!group || !shortcuts || typeof shortcuts !== 'object') return { success: false, error: '参数无效' };
    var results = [];
    for (var key in shortcuts) {
      if (shortcuts.hasOwnProperty(key)) {
        var cb = shortcuts[key];
        if (typeof cb === 'function') {
          results.push(register(key, cb));
        } else if (Array.isArray(cb) && cb.length === 2) {
          var r = register(key, cb[0]);
          if (r.success) _shortcuts[_normalizeKey(key)].description = cb[1];
          results.push(r);
        }
      }
    }
    return { success: true, results: results };
  }

  function unregister(shortcut) {
    var normalized = _normalizeKey(shortcut);
    if (!_shortcuts[normalized]) return false;
    var s = _shortcuts[normalized];
    var g = s.group;
    var sc = s.scope;
    delete _shortcuts[normalized];
    if (g && _groups[g]) {
      var idx = _groups[g].indexOf(normalized);
      if (idx > -1) _groups[g].splice(idx, 1);
    }
    if (sc && _scopes[sc]) {
      var idx2 = _scopes[sc].indexOf(normalized);
      if (idx2 > -1) _scopes[sc].splice(idx2, 1);
    }
    return true;
  }

  function unregisterGroup(group) {
    if (!_groups[group]) return false;
    var keys = _groups[group].slice();
    for (var i = 0; i < keys.length; i++) {
      unregister(keys[i]);
    }
    delete _groups[group];
    return true;
  }

  function getShortcuts() {
    var list = [];
    for (var key in _shortcuts) {
      if (_shortcuts.hasOwnProperty(key)) {
        list.push({
          shortcut: _shortcuts[key].shortcut,
          group: _shortcuts[key].group,
          scope: _shortcuts[key].scope,
          description: _shortcuts[key].description
        });
      }
    }
    return list;
  }

  function getShortcutsByGroup(group) {
    if (!_groups[group]) return [];
    return _groups[group].map(function (k) { return _shortcuts[k] ? {
      shortcut: _shortcuts[k].shortcut,
      scope: _shortcuts[k].scope,
      description: _shortcuts[k].description
    } : null; }).filter(function (s) { return s; });
  }

  function setScope(scope) {
    if (!scope) return false;
    _activeScope = scope;
    return true;
  }

  function getScope() {
    return _activeScope;
  }

  function setEnabled(enabled) {
    _enabled = !!enabled;
  }

  function isEnabled() {
    return _enabled;
  }

  function detectConflicts(shortcuts) {
    var conflicts = [];
    for (var i = 0; i < shortcuts.length; i++) {
      var norm = _normalizeKey(shortcuts[i]);
      if (_shortcuts[norm]) {
        conflicts.push({ shortcut: norm, existing: _shortcuts[norm].description || '已注册', group: _shortcuts[norm].group });
      }
    }
    _statistics.conflicts += conflicts.length;
    return conflicts;
  }

  function exportShortcuts() {
    var list = getShortcuts();
    return {
      exportedAt: new Date().toISOString(),
      count: list.length,
      shortcuts: list
    };
  }

  function importShortcuts(config, callbackFactory) {
    if (!config || !Array.isArray(config.shortcuts)) return { success: false, error: '无效的导入格式' };
    if (typeof callbackFactory !== 'function') return { success: false, error: '需要提供回调工厂函数' };
    var imported = 0;
    var skipped = 0;
    var errors = [];
    for (var i = 0; i < config.shortcuts.length; i++) {
      var s = config.shortcuts[i];
      var cb = callbackFactory(s);
      if (typeof cb !== 'function') { skipped++; errors.push(s.shortcut + ': 无法生成回调'); continue; }
      var result = register(s.shortcut, cb, s.description || '');
      if (result.success) imported++;
      else { skipped++; errors.push(s.shortcut + ': ' + result.error); }
    }
    return { success: true, imported: imported, skipped: skipped, errors: errors };
  }

  function getStatistics() {
    return {
      registered: _statistics.registered,
      fired: _statistics.fired,
      conflicts: _statistics.conflicts,
      shortcutsInUse: Object.keys(_shortcuts).length,
      groups: Object.keys(_groups).length,
      scopes: Object.keys(_scopes).length,
      activeScope: _activeScope
    };
  }

  function onShortcut(shortcut, callback) {
    return register(shortcut, callback);
  }

  function off(shortcut) {
    return unregister(shortcut);
  }

  document.addEventListener('keydown', _handleKeyDown);

  window.CNC_SHORTCUTS = {
    register: register,
    registerGroup: registerGroup,
    unregister: unregister,
    unregisterGroup: unregisterGroup,
    getShortcuts: getShortcuts,
    getShortcutsByGroup: getShortcutsByGroup,
    setScope: setScope,
    getScope: getScope,
    setEnabled: setEnabled,
    isEnabled: isEnabled,
    detectConflicts: detectConflicts,
    exportShortcuts: exportShortcuts,
    importShortcuts: importShortcuts,
    getStatistics: getStatistics,
    onShortcut: onShortcut,
    off: off
  };

  console.log('[CNC_SHORTCUTS] 快捷键管理器已加载。注册 ' + _statistics.registered + ' 个快捷键，活跃范围: ' + _activeScope);
})();
