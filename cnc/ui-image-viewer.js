/**
 * ui-image-viewer.js
 * 图片查看器 — 放大/缩小/旋转/拖拽/滚轮/键盘
 * 全局对象: window.CNC_IMAGE_VIEWER
 */
(function () {
  'use strict';

  if (window.CNC_IMAGE_VIEWER) return;

  var _viewerEl = null;
  var _imgEl = null;
  var _scale = 1;
  var _rotation = 0;
  var _isDragging = false;
  var _dragStartX = 0, _dragStartY = 0;
  var _translateX = 0, _translateY = 0;
  var _MIN_SCALE = 0.25;
  var _MAX_SCALE = 5;
  var _ZOOM_STEP = 0.25;
  var _currentSrc = '';
  var _overlayEl = null;

  function _createViewer() {
    if (_viewerEl) return;
    _overlayEl = document.createElement('div');
    _overlayEl.className = 'image-viewer-overlay';
    _overlayEl.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:10000;display:none;align-items:center;justify-content:center;';

    _viewerEl = document.createElement('div');
    _viewerEl.className = 'image-viewer';
    _viewerEl.style.cssText = 'position:relative;max-width:90vw;max-height:90vh;display:flex;align-items:center;justify-content:center;';

    _imgEl = document.createElement('img');
    _imgEl.className = 'image-viewer-img';
    _imgEl.style.cssText = 'max-width:100%;max-height:85vh;object-fit:contain;cursor:grab;transition:transform 0.15s ease;user-select:none;-webkit-user-drag:none;';
    _imgEl.draggable = false;

    var controls = document.createElement('div');
    controls.className = 'image-viewer-controls';
    controls.style.cssText = 'position:absolute;bottom:-50px;left:50%;transform:translateX(-50%);display:flex;gap:8px;background:rgba(0,0,0,0.6);padding:8px 14px;border-radius:8px;';

    var buttons = [
      { label: '−', title: '缩小', action: 'zoomout' },
      { label: '+', title: '放大', action: 'zoomin' },
      { label: '↺', title: '左旋', action: 'rotate-90' },
      { label: '↻', title: '右旋', action: 'rotate-90' },
      { label: '↕', title: '重置', action: 'reset' },
      { label: '×', title: '关闭', action: 'close' }
    ];

    for (var i = 0; i < buttons.length; i++) {
      var btn = document.createElement('button');
      btn.textContent = buttons[i].label;
      btn.title = buttons[i].title;
      btn.setAttribute('data-action', buttons[i].action);
      btn.style.cssText = 'background:transparent;border:1px solid rgba(255,255,255,0.3);color:#fff;width:36px;height:36px;border-radius:4px;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;transition:background 0.2s;';
      btn.addEventListener('mouseenter', function () { this.style.background = 'rgba(255,255,255,0.15)'; });
      btn.addEventListener('mouseleave', function () { this.style.background = 'transparent'; });
      btn.addEventListener('click', _onControlClick);
      controls.appendChild(btn);
    }

    var info = document.createElement('div');
    info.className = 'image-viewer-info';
    info.id = 'image-viewer-info';
    info.style.cssText = 'position:absolute;top:-36px;right:0;color:rgba(255,255,255,0.6);font-size:13px;font-family:sans-serif;';

    _viewerEl.appendChild(_imgEl);
    _viewerEl.appendChild(controls);
    _viewerEl.appendChild(info);
    _overlayEl.appendChild(_viewerEl);
    document.body.appendChild(_overlayEl);

    _overlayEl.addEventListener('click', function (e) {
      if (e.target === _overlayEl) closeViewer();
    });

    _imgEl.addEventListener('mousedown', _onMouseDown);
    document.addEventListener('mousemove', _onMouseMove);
    document.addEventListener('mouseup', _onMouseUp);
    _overlayEl.addEventListener('wheel', _onWheel, { passive: false });
    document.addEventListener('keydown', _onKeyDown);
  }

  function openImageViewer(imageSrc) {
    _createViewer();
    if (!imageSrc) return;
    _currentSrc = imageSrc;
    _scale = 1;
    _rotation = 0;
    _translateX = 0;
    _translateY = 0;
    _imgEl.src = imageSrc;
    _updateTransform();
    _overlayEl.style.display = 'flex';
    _updateInfo();
    document.body.style.overflow = 'hidden';
  }

  function zoomIn() {
    _scale = Math.min(_scale + _ZOOM_STEP, _MAX_SCALE);
    _updateTransform();
    _updateInfo();
  }

  function zoomOut() {
    _scale = Math.max(_scale - _ZOOM_STEP, _MIN_SCALE);
    _updateTransform();
    _updateInfo();
  }

  function rotateImage(degree) {
    _rotation = (_rotation + degree) % 360;
    _updateTransform();
    _updateInfo();
  }

  function resetView() {
    _scale = 1;
    _rotation = 0;
    _translateX = 0;
    _translateY = 0;
    _updateTransform();
    _updateInfo();
  }

  function closeViewer() {
    if (!_overlayEl) return;
    _overlayEl.style.display = 'none';
    _imgEl.src = '';
    document.body.style.overflow = '';
  }

  function _updateTransform() {
    _imgEl.style.transform = 'translate(' + _translateX + 'px, ' + _translateY + 'px) scale(' + _scale + ') rotate(' + _rotation + 'deg)';
  }

  function _updateInfo() {
    var infoEl = document.getElementById('image-viewer-info');
    if (infoEl) {
      infoEl.textContent = Math.round(_scale * 100) + '% | ' + _rotation + '°';
    }
  }

  function _onControlClick(e) {
    var action = e.currentTarget.getAttribute('data-action');
    if (action === 'zoomin') zoomIn();
    else if (action === 'zoomout') zoomOut();
    else if (action === 'rotate-90') rotateImage(90);
    else if (action === 'rotate-90-ccw') rotateImage(-90);
    else if (action === 'reset') resetView();
    else if (action === 'close') closeViewer();
  }

  function _onMouseDown(e) {
    if (e.button !== 0) return;
    _isDragging = true;
    _dragStartX = e.clientX - _translateX;
    _dragStartY = e.clientY - _translateY;
    _imgEl.style.cursor = 'grabbing';
  }

  function _onMouseMove(e) {
    if (!_isDragging) return;
    _translateX = e.clientX - _dragStartX;
    _translateY = e.clientY - _dragStartY;
    _updateTransform();
  }

  function _onMouseUp() {
    _isDragging = false;
    _imgEl.style.cursor = 'grab';
  }

  function _onWheel(e) {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  }

  function _onKeyDown(e) {
    if (!_overlayEl || _overlayEl.style.display === 'none') return;
    if (e.key === 'Escape') closeViewer();
    else if (e.key === '+' || e.key === '=') zoomIn();
    else if (e.key === '-') zoomOut();
    else if (e.key === 'r') rotateImage(90);
    else if (e.key === 'R') rotateImage(-90);
    else if (e.key === '0') resetView();
  }

  window.CNC_IMAGE_VIEWER = {
    openImageViewer: openImageViewer,
    zoomIn: zoomIn,
    zoomOut: zoomOut,
    rotateImage: rotateImage,
    resetView: resetView,
    closeViewer: closeViewer
  };

  console.log('[CNC_IMAGE_VIEWER] 图片查看器已加载。');
})();
