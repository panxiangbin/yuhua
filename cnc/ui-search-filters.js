/**
 * ui-search-filters.js
 * 高级筛选器系统 — 多条件组合筛选/预设保存/筛选面板
 * 全局对象: window.CNC_SEARCH_FILTERS
 */
(function () {
  'use strict';

  if (window.CNC_SEARCH_FILTERS) return;

  var _currentFilters = { categories: [], tags: [], level: null, hasImages: null };
  var _presets = {};
  var _PRESETS_KEY = 'cnc_search_filter_presets';
  var _FILTER_OPTIONS = {
    categories: ['G代码', 'M代码', '参数', '报警', '故障', '操作', '刀具', '工艺', '材料', '图纸', '量具', '案例'],
    tags: ['基础', '进阶', '高级', '新手', '安全', '警告'],
    levels: ['beginner', 'intermediate', 'advanced']
  };

  function _loadPresets() {
    try {
      var data = localStorage.getItem(_PRESETS_KEY);
      if (data) _presets = JSON.parse(data);
    } catch (e) { _presets = {}; }
  }

  function _savePresets() {
    try { localStorage.setItem(_PRESETS_KEY, JSON.stringify(_presets)); }
    catch (e) { console.warn('[CNC_SEARCH_FILTERS] 保存预设失败:', e.message); }
  }

  _loadPresets();

  function renderFilterPanel() {
    var html = '<div class="search-filter-panel" id="search-filter-panel">';
    html += '<div class="filter-header"><h3>高级筛选</h3><button class="filter-close-btn" id="filter-close-btn">×</button></div>';
    html += '<div class="filter-section"><h4>分类</h4><div class="filter-options" data-filter-type="categories">';
    var cats = _FILTER_OPTIONS.categories;
    for (var i = 0; i < cats.length; i++) {
      var checked = _currentFilters.categories.indexOf(cats[i]) !== -1 ? ' checked' : '';
      html += '<label class="filter-chip' + (checked ? ' active' : '') + '"><input type="checkbox" value="' + cats[i] + '"' + checked + '>' + cats[i] + '</label>';
    }
    html += '</div></div>';
    html += '<div class="filter-section"><h4>难度</h4><div class="filter-options" data-filter-type="level">';
    var levels = [
      { value: 'beginner', label: '新手' },
      { value: 'intermediate', label: '进阶' },
      { value: 'advanced', label: '高级' }
    ];
    for (var j = 0; j < levels.length; j++) {
      var active = _currentFilters.level === levels[j].value ? ' active' : '';
      html += '<label class="filter-chip level' + active + '"><input type="radio" name="filter-level" value="' + levels[j].value + '"' + (_currentFilters.level === levels[j].value ? ' checked' : '') + '>' + levels[j].label + '</label>';
    }
    html += '<label class="filter-chip"><input type="radio" name="filter-level" value=""' + (!_currentFilters.level ? ' checked' : '') + '>全部</label>';
    html += '</div></div>';
    html += '<div class="filter-section"><h4>图片</h4><div class="filter-options" data-filter-type="hasImages">';
    var imgActive = _currentFilters.hasImages === true ? ' active' : '';
    html += '<label class="filter-chip' + imgActive + '"><input type="checkbox" id="filter-has-images"' + (_currentFilters.hasImages ? ' checked' : '') + '>仅显示有图片的条目</label>';
    html += '</div></div>';
    html += '<div class="filter-actions"><button class="primary-button" id="filter-apply-btn">应用筛选</button>';
    html += '<button class="ghost-button" id="filter-reset-btn">重置</button></div>';
    html += '<div class="filter-presets"><h4>预设方案</h4><div class="preset-list" id="preset-list">';
    var presetKeys = Object.keys(_presets);
    for (var k = 0; k < presetKeys.length; k++) {
      html += '<div class="preset-item" data-preset="' + presetKeys[k] + '"><span>' + presetKeys[k] + '</span><button class="preset-load ghost-button small">加载</button><button class="preset-delete ghost-button small">删除</button></div>';
    }
    html += '</div><div class="preset-save-row"><input type="text" id="preset-name-input" placeholder="预设名称..." class="preset-input"><button class="primary-button small" id="preset-save-btn">保存当前</button></div></div>';
    html += '</div>';
    return html;
  }

  function applyFilters(filters) {
    if (filters) {
      if (filters.categories) _currentFilters.categories = filters.categories;
      if (filters.level !== undefined) _currentFilters.level = filters.level;
      if (filters.hasImages !== undefined) _currentFilters.hasImages = filters.hasImages;
    }
    return _doFilter();
  }

  function getCurrentFilters() {
    return {
      categories: _currentFilters.categories.slice(),
      level: _currentFilters.level,
      hasImages: _currentFilters.hasImages
    };
  }

  function resetFilters() {
    _currentFilters = { categories: [], tags: [], level: null, hasImages: null };
  }

  function saveFilterPreset(name, filters) {
    if (!name || !name.trim()) return false;
    _presets[name.trim()] = filters || getCurrentFilters();
    _savePresets();
    return true;
  }

  function loadFilterPreset(name) {
    var preset = _presets[name];
    if (!preset) return null;
    _currentFilters = {
      categories: preset.categories ? preset.categories.slice() : [],
      tags: preset.tags ? preset.tags.slice() : [],
      level: preset.level || null,
      hasImages: preset.hasImages || null
    };
    return getCurrentFilters();
  }

  function deleteFilterPreset(name) {
    if (!_presets[name]) return false;
    delete _presets[name];
    _savePresets();
    return true;
  }

  function getPresets() {
    var result = {};
    for (var key in _presets) {
      if (_presets.hasOwnProperty(key)) result[key] = _presets[key];
    }
    return result;
  }

  function _doFilter() {
    var results = [];
    var allItems = _getAllItems();
    for (var i = 0; i < allItems.length; i++) {
      var item = allItems[i];
      if (_currentFilters.categories.length > 0) {
        var cat = item.category || '';
        if (_currentFilters.categories.indexOf(cat) === -1) continue;
      }
      if (_currentFilters.level) {
        var itemLevel = item.level || 'beginner';
        if (itemLevel !== _currentFilters.level) continue;
      }
      if (_currentFilters.hasImages === true) {
        if (!item.image && !item.images) continue;
      }
      results.push(item);
    }
    return results;
  }

  function _getAllItems() {
    if (window.CNC_DATA && CNC_DATA.ENTRIES) return CNC_DATA.ENTRIES;
    if (window.CNC_RUNTIME && CNC_RUNTIME.DataLoader) return CNC_RUNTIME.DataLoader.ENTRIES || [];
    return [];
  }

  window.CNC_SEARCH_FILTERS = {
    renderFilterPanel: renderFilterPanel,
    applyFilters: applyFilters,
    getCurrentFilters: getCurrentFilters,
    resetFilters: resetFilters,
    saveFilterPreset: saveFilterPreset,
    loadFilterPreset: loadFilterPreset,
    deleteFilterPreset: deleteFilterPreset,
    getPresets: getPresets
  };

  console.log('[CNC_SEARCH_FILTERS] 高级筛选器已加载。预设数: ' + Object.keys(_presets).length);
})();
