/**
 * ui-image-filters.js
 * 图片滤镜系统 — 亮度/对比度/灰度/怀旧/CSS filter
 * 全局对象: window.CNC_IMAGE_FILTERS
 */
(function () {
  'use strict';

  if (window.CNC_IMAGE_FILTERS) return;

  var _currentFilters = { brightness: 1, contrast: 1, grayscale: 0, sepia: 0, saturate: 1, hueRotate: 0 };
  var _targetImage = null;
  var _onChangeCallback = null;

  function _getFilterString() {
    return 'brightness(' + _currentFilters.brightness + ') contrast(' + _currentFilters.contrast + ') grayscale(' + _currentFilters.grayscale + ') sepia(' + _currentFilters.sepia + ') saturate(' + _currentFilters.saturate + ') hue-rotate(' + _currentFilters.hueRotate + 'deg)';
  }

  function _apply() {
    if (_targetImage) {
      _targetImage.style.filter = _getFilterString();
    }
    if (_onChangeCallback) _onChangeCallback(getCurrentFilters());
  }

  function setTargetImage(img) {
    _targetImage = (typeof img === 'string') ? document.querySelector(img) : img;
    if (_targetImage) _apply();
  }

  function applyBrightness(value) {
    _currentFilters.brightness = Math.max(0, Math.min(3, value));
    _apply();
  }

  function applyContrast(value) {
    _currentFilters.contrast = Math.max(0, Math.min(3, value));
    _apply();
  }

  function applyGrayscale() {
    _currentFilters.grayscale = _currentFilters.grayscale > 0 ? 0 : 1;
    _apply();
  }

  function applySepia() {
    _currentFilters.sepia = _currentFilters.sepia > 0 ? 0 : 1;
    _apply();
  }

  function applySaturate(value) {
    _currentFilters.saturate = Math.max(0, Math.min(3, value));
    _apply();
  }

  function applyHueRotate(degree) {
    _currentFilters.hueRotate = degree;
    _apply();
  }

  function resetFilters() {
    _currentFilters = { brightness: 1, contrast: 1, grayscale: 0, sepia: 0, saturate: 1, hueRotate: 0 };
    _apply();
  }

  function getCurrentFilters() {
    return {
      brightness: _currentFilters.brightness,
      contrast: _currentFilters.contrast,
      grayscale: _currentFilters.grayscale,
      sepia: _currentFilters.sepia,
      saturate: _currentFilters.saturate,
      hueRotate: _currentFilters.hueRotate
    };
  }

  function renderFilterPanel() {
    var html = '<div class="image-filter-panel">';
    html += '<div class="filter-panel-header"><h4>图片滤镜</h4><button class="filter-reset-btn" data-action="reset-filters">重置</button></div>';

    html += '<div class="filter-slider-group"><label>亮度 <span id="filter-brightness-val">100%</span></label><input type="range" min="0" max="3" step="0.05" value="1" data-filter="brightness"></div>';
    html += '<div class="filter-slider-group"><label>对比度 <span id="filter-contrast-val">100%</span></label><input type="range" min="0" max="3" step="0.05" value="1" data-filter="contrast"></div>';
    html += '<div class="filter-slider-group"><label>饱和度 <span id="filter-saturate-val">100%</span></label><input type="range" min="0" max="3" step="0.05" value="1" data-filter="saturate"></div>';
    html += '<div class="filter-slider-group"><label>色相旋转 <span id="filter-hue-val">0°</span></label><input type="range" min="0" max="360" step="1" value="0" data-filter="hueRotate"></div>';

    html += '<div class="filter-toggle-group">';
    html += '<button class="filter-toggle-btn" data-filter="grayscale">灰度</button>';
    html += '<button class="filter-toggle-btn" data-filter="sepia">怀旧</button>';
    html += '</div></div>';
    return html;
  }

  function bindFilterPanel(container) {
    container = (typeof container === 'string') ? document.querySelector(container) : container;
    if (!container) return;

    container.addEventListener('input', function (e) {
      var slider = e.target.closest('[data-filter]');
      if (!slider) return;
      var filter = slider.getAttribute('data-filter');
      var val = parseFloat(slider.value);
      if (filter === 'brightness') { applyBrightness(val); _updateVal('filter-brightness-val', Math.round(val * 100) + '%'); }
      else if (filter === 'contrast') { applyContrast(val); _updateVal('filter-contrast-val', Math.round(val * 100) + '%'); }
      else if (filter === 'saturate') { applySaturate(val); _updateVal('filter-saturate-val', Math.round(val * 100) + '%'); }
      else if (filter === 'hueRotate') { applyHueRotate(val); _updateVal('filter-hue-val', Math.round(val) + '°'); }
    });

    container.addEventListener('click', function (e) {
      var toggle = e.target.closest('[data-filter]');
      if (!toggle || toggle.tagName !== 'BUTTON') return;
      var filter = toggle.getAttribute('data-filter');
      if (filter === 'grayscale') { applyGrayscale(); toggle.classList.toggle('active'); }
      else if (filter === 'sepia') { applySepia(); toggle.classList.toggle('active'); }
      else if (filter === 'reset-filters') { resetFilters(); container.querySelectorAll('.filter-toggle-btn.active').forEach(function (b) { b.classList.remove('active'); }); container.querySelectorAll('input[type="range"]').forEach(function (s) { s.value = s.getAttribute('data-filter') === 'hueRotate' ? '0' : '1'; }); _updateVal('filter-brightness-val', '100%'); _updateVal('filter-contrast-val', '100%'); _updateVal('filter-saturate-val', '100%'); _updateVal('filter-hue-val', '0°'); }
    });
  }

  function onChange(callback) {
    _onChangeCallback = callback;
  }

  function _updateVal(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  window.CNC_IMAGE_FILTERS = {
    applyBrightness: applyBrightness,
    applyContrast: applyContrast,
    applyGrayscale: applyGrayscale,
    applySepia: applySepia,
    applySaturate: applySaturate,
    applyHueRotate: applyHueRotate,
    resetFilters: resetFilters,
    getCurrentFilters: getCurrentFilters,
    setTargetImage: setTargetImage,
    renderFilterPanel: renderFilterPanel,
    bindFilterPanel: bindFilterPanel,
    onChange: onChange
  };

  console.log('[CNC_IMAGE_FILTERS] 图片滤镜系统已加载。');
})();
