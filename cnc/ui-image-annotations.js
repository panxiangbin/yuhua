/**
 * ui-image-annotations.js
 * 图片标注系统 — Canvas 标注/文字/箭头/撤销/导出
 * 全局对象: window.CNC_IMAGE_ANNOTATE
 */
(function () {
  'use strict';

  if (window.CNC_IMAGE_ANNOTATE) return;

  var _canvas = null;
  var _ctx = null;
  var _imageEl = null;
  var _annotations = [];
  var _undoStack = [];
  var _redoStack = [];
  var _isAnnotating = false;
  var _currentTool = 'text';
  var _arrowStart = null;
  var _fontSize = 16;
  var _fontColor = '#ff4444';
  var _lineWidth = 2;
  var _MAX_UNDO = 50;

  function enableAnnotationMode(imageEl, canvas) {
    _imageEl = (typeof imageEl === 'string') ? document.querySelector(imageEl) : imageEl;
    _canvas = (typeof canvas === 'string') ? document.querySelector(canvas) : canvas;
    if (!_imageEl || !_canvas) { console.error('[CNC_IMAGE_ANNOTATE] 图片或Canvas元素不存在'); return false; }

    _canvas.width = _imageEl.naturalWidth || _imageEl.width;
    _canvas.height = _imageEl.naturalHeight || _imageEl.height;
    _ctx = _canvas.getContext('2d');
    _isAnnotating = true;
    _annotations = [];
    _undoStack = [];
    _redoStack = [];

    _drawImage();

    _canvas.addEventListener('click', _onCanvasClick);
    _canvas.addEventListener('mousedown', _onCanvasMouseDown);
    _canvas.addEventListener('mouseup', _onCanvasMouseUp);
    _canvas.addEventListener('mousemove', _onCanvasMouseMove);
    return true;
  }

  function addTextAnnotation(x, y, text) {
    if (!_ctx) return null;
    var annotation = { type: 'text', x: x, y: y, text: text || '标注', fontSize: _fontSize, color: _fontColor, timestamp: Date.now() };
    _annotations.push(annotation);
    _pushUndo();
    _drawImage();
    return annotation;
  }

  function addArrowAnnotation(x1, y1, x2, y2) {
    if (!_ctx) return null;
    var annotation = { type: 'arrow', x1: x1, y1: y1, x2: x2, y2: y2, color: _fontColor, lineWidth: _lineWidth, timestamp: Date.now() };
    _annotations.push(annotation);
    _pushUndo();
    _drawImage();
    return annotation;
  }

  function addRectAnnotation(x, y, w, h) {
    if (!_ctx) return null;
    var annotation = { type: 'rect', x: x, y: y, width: w, height: h, color: _fontColor, lineWidth: _lineWidth, timestamp: Date.now() };
    _annotations.push(annotation);
    _pushUndo();
    _drawImage();
    return annotation;
  }

  function undo() {
    if (_undoStack.length === 0) return false;
    _redoStack.push(JSON.parse(JSON.stringify(_annotations)));
    _annotations = _undoStack.pop();
    _drawImage();
    return true;
  }

  function redo() {
    if (_redoStack.length === 0) return false;
    _undoStack.push(JSON.parse(JSON.stringify(_annotations)));
    _annotations = _redoStack.pop();
    _drawImage();
    return true;
  }

  function clearAnnotations() {
    _pushUndo();
    _annotations = [];
    _drawImage();
  }

  function setTool(tool) {
    _currentTool = tool;
  }

  function setFontSize(size) {
    _fontSize = Math.max(8, Math.min(48, size));
  }

  function setFontColor(color) {
    _fontColor = color;
  }

  function setLineWidth(width) {
    _lineWidth = Math.max(1, Math.min(10, width));
  }

  function saveAnnotations() {
    return JSON.parse(JSON.stringify(_annotations));
  }

  function loadAnnotations(data) {
    if (!data) return false;
    _pushUndo();
    _annotations = JSON.parse(JSON.stringify(data));
    _drawImage();
    return true;
  }

  function exportAnnotatedImage() {
    if (!_canvas) return null;
    return _canvas.toDataURL('image/png');
  }

  function downloadAnnotatedImage(filename) {
    var dataUrl = exportAnnotatedImage();
    if (!dataUrl) return;
    var link = document.createElement('a');
    link.download = filename || 'annotated-image.png';
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function disableAnnotationMode() {
    _isAnnotating = false;
    if (_canvas) {
      _canvas.removeEventListener('click', _onCanvasClick);
      _canvas.removeEventListener('mousedown', _onCanvasMouseDown);
      _canvas.removeEventListener('mouseup', _onCanvasMouseUp);
      _canvas.removeEventListener('mousemove', _onCanvasMouseMove);
    }
    _canvas = null;
    _ctx = null;
    _imageEl = null;
  }

  function _drawImage() {
    if (!_ctx || !_imageEl) return;
    _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
    _ctx.drawImage(_imageEl, 0, 0, _canvas.width, _canvas.height);

    for (var i = 0; i < _annotations.length; i++) {
      var a = _annotations[i];
      if (a.type === 'text') {
        _ctx.font = a.fontSize + 'px sans-serif';
        _ctx.fillStyle = a.color;
        _ctx.fillText(a.text, a.x, a.y);
      } else if (a.type === 'arrow') {
        _ctx.strokeStyle = a.color;
        _ctx.lineWidth = a.lineWidth;
        _ctx.beginPath();
        _ctx.moveTo(a.x1, a.y1);
        _ctx.lineTo(a.x2, a.y2);
        _ctx.stroke();
        _drawArrowhead(a.x1, a.y1, a.x2, a.y2);
      } else if (a.type === 'rect') {
        _ctx.strokeStyle = a.color;
        _ctx.lineWidth = a.lineWidth;
        _ctx.strokeRect(a.x, a.y, a.width, a.height);
      }
    }
  }

  function _drawArrowhead(x1, y1, x2, y2) {
    var angle = Math.atan2(y2 - y1, x2 - x1);
    var headLen = 12;
    _ctx.beginPath();
    _ctx.moveTo(x2, y2);
    _ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    _ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    _ctx.closePath();
    _ctx.fill();
  }

  function _pushUndo() {
    _undoStack.push(JSON.parse(JSON.stringify(_annotations)));
    if (_undoStack.length > _MAX_UNDO) _undoStack.shift();
    _redoStack = [];
  }

  function _onCanvasClick(e) {
    if (!_isAnnotating) return;
    var rect = _canvas.getBoundingClientRect();
    var x = (e.clientX - rect.left) * (_canvas.width / rect.width);
    var y = (e.clientY - rect.top) * (_canvas.height / rect.height);
    if (_currentTool === 'text') {
      var text = prompt('输入标注文字:', '');
      if (text) addTextAnnotation(x, y, text);
    }
  }

  function _onCanvasMouseDown(e) {
    if (!_isAnnotating || _currentTool !== 'arrow') return;
    var rect = _canvas.getBoundingClientRect();
    var x = (e.clientX - rect.left) * (_canvas.width / rect.width);
    var y = (e.clientY - rect.top) * (_canvas.height / rect.height);
    _arrowStart = { x: x, y: y };
  }

  function _onCanvasMouseUp(e) {
    if (!_isAnnotating || !_arrowStart) return;
    var rect = _canvas.getBoundingClientRect();
    var x = (e.clientX - rect.left) * (_canvas.width / rect.width);
    var y = (e.clientY - rect.top) * (_canvas.height / rect.height);
    addArrowAnnotation(_arrowStart.x, _arrowStart.y, x, y);
    _arrowStart = null;
  }

  function _onCanvasMouseMove(e) {
    if (!_isAnnotating || !_arrowStart) return;
    var rect = _canvas.getBoundingClientRect();
    var x = (e.clientX - rect.left) * (_canvas.width / rect.width);
    var y = (e.clientY - rect.top) * (_canvas.height / rect.height);
    _drawImage();
    _ctx.strokeStyle = _fontColor;
    _ctx.lineWidth = _lineWidth;
    _ctx.beginPath();
    _ctx.moveTo(_arrowStart.x, _arrowStart.y);
    _ctx.lineTo(x, y);
    _ctx.stroke();
    _drawArrowhead(_arrowStart.x, _arrowStart.y, x, y);
  }

  window.CNC_IMAGE_ANNOTATE = {
    enableAnnotationMode: enableAnnotationMode,
    addTextAnnotation: addTextAnnotation,
    addArrowAnnotation: addArrowAnnotation,
    addRectAnnotation: addRectAnnotation,
    undo: undo,
    redo: redo,
    clearAnnotations: clearAnnotations,
    setTool: setTool,
    setFontSize: setFontSize,
    setFontColor: setFontColor,
    setLineWidth: setLineWidth,
    saveAnnotations: saveAnnotations,
    loadAnnotations: loadAnnotations,
    exportAnnotatedImage: exportAnnotatedImage,
    downloadAnnotatedImage: downloadAnnotatedImage,
    disableAnnotationMode: disableAnnotationMode
  };

  console.log('[CNC_IMAGE_ANNOTATE] 图片标注系统已加载。');
})();
