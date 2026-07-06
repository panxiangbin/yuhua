/**
 * ui-learning-image-placeholder.js
 * 配图占位符与未来图片集成准备
 * 全局对象: window.CNC_LEARNING_IMAGES
 */
(function () {
  'use strict';

  if (window.CNC_LEARNING_IMAGES) return;

  var _imageSlots = {};
  var _placeholderColors = ['#cf6d36', '#5d655f', '#8b4513', '#2f4f4f', '#556b2f', '#4a708b'];

  function renderImagePlaceholder(description, width, height) {
    width = width || 600;
    height = height || 340;
    var colorIndex = Math.abs(_hashCode(description || '')) % _placeholderColors.length;
    var bgColor = _placeholderColors[colorIndex];
    var text = description || '图片占位符';
    var fontSize = Math.max(14, Math.min(24, Math.floor(width / 20)));

    var svg = _generatePlaceholderSVG(text, width, height, bgColor, fontSize);
    return '<div class="image-placeholder" style="width:' + width + 'px;max-width:100%;margin:10px 0;" data-description="' + _escape(text) + '">' +
           svg + '<p class="image-placeholder-caption">' + _escape(text) + '</p></div>';
  }

  function registerImageSlot(lessonId, imageId) {
    if (!_imageSlots[lessonId]) _imageSlots[lessonId] = [];
    if (!_imageSlots[lessonId].some(function (s) { return s === imageId; })) {
      _imageSlots[lessonId].push(imageId);
    }
    return _imageSlots[lessonId].length;
  }

  function loadActualImage(imageId, src) {
    var el = document.querySelector('[data-image-slot="' + imageId + '"]');
    if (!el) return false;
    var img = new Image();
    img.onload = function () {
      el.innerHTML = '<img src="' + _escape(src) + '" alt="' + (_escape(el.getAttribute('data-description') || '')) + '" style="max-width:100%;height:auto;">';
      el.classList.add('image-loaded');
    };
    img.onerror = function () {
      el.classList.add('image-load-error');
      el.innerHTML = '<div class="image-error-notice">图片加载失败: ' + _escape(src) + '</div>' + el.innerHTML;
    };
    img.src = src;
    return true;
  }

  function batchReplacePlaceholders(imageMap) {
    var count = 0;
    for (var lessonId in imageMap) {
      if (imageMap.hasOwnProperty(lessonId)) {
        var images = imageMap[lessonId];
        for (var i = 0; i < images.length; i++) {
          var slot = images[i];
          if (loadActualImage(slot.id, slot.src)) count++;
        }
      }
    }
    return count;
  }

  function getRegisteredSlots(lessonId) {
    return _imageSlots[lessonId] || [];
  }

  function getAllSlots() {
    var result = {};
    for (var key in _imageSlots) {
      if (_imageSlots.hasOwnProperty(key)) result[key] = _imageSlots[key].slice();
    }
    return result;
  }

  function _generatePlaceholderSVG(text, width, height, bgColor, fontSize) {
    var lines = _wrapText(text, Math.floor(width / (fontSize * 0.6)));
    var lineHeight = fontSize * 1.5;
    var totalHeight = lines.length * lineHeight;
    var startY = (height - totalHeight) / 2 + fontSize;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" class="placeholder-svg">';
    svg += '<rect width="' + width + '" height="' + height + '" fill="' + bgColor + '" opacity="0.15" rx="8"/>';
    svg += '<rect x="2" y="2" width="' + (width - 4) + '" height="' + (height - 4) + '" fill="none" stroke="' + bgColor + '" stroke-width="1.5" stroke-dasharray="6,4" rx="8"/>';
    svg += '<g fill="' + bgColor + '" opacity="0.6" font-family="sans-serif" font-size="' + fontSize + '" text-anchor="middle">';
    for (var i = 0; i < lines.length; i++) {
      svg += '<text x="' + (width / 2) + '" y="' + (startY + i * lineHeight) + '">' + _escapeXml(lines[i]) + '</text>';
    }
    svg += '</g></svg>';
    return svg;
  }

  function _wrapText(text, maxCharsPerLine) {
    if (!text) return [''];
    if (text.length <= maxCharsPerLine) return [text];
    var lines = [];
    for (var i = 0; i < text.length; i += maxCharsPerLine) {
      lines.push(text.substring(i, Math.min(i + maxCharsPerLine, text.length)));
    }
    return lines;
  }

  function _hashCode(str) {
    if (!str) return 0;
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + c;
      hash = hash & hash;
    }
    return hash;
  }

  function _escape(text) {
    if (!text) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(text));
    return d.innerHTML;
  }

  function _escapeXml(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  window.CNC_LEARNING_IMAGES = {
    renderImagePlaceholder: renderImagePlaceholder,
    registerImageSlot: registerImageSlot,
    loadActualImage: loadActualImage,
    batchReplacePlaceholders: batchReplacePlaceholders,
    getRegisteredSlots: getRegisteredSlots,
    getAllSlots: getAllSlots,
    generatePlaceholderSVG: _generatePlaceholderSVG
  };

  console.log('[CNC_LEARNING_IMAGES] 配图占位符系统已加载。');
})();
