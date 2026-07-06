/**
 * ui-card-masonry.js
 * 卡片瀑布流布局引擎 — 响应式列数/卡片分配/重排/虚拟滚动
 * 全局对象: window.CNC_CARD_MASONRY
 */
(function () {
  'use strict';

  if (window.CNC_CARD_MASONRY) return;

  var _container = null;
  var _columns = 3;
  var _columnElements = [];
  var _cardElements = [];
  var _gutter = 16;
  var _resizeTimer = null;
  var _isInitialized = false;
  var _virtualScrollEnabled = false;
  var _visibleRange = { start: 0, end: 0 };

  function initMasonryLayout(container, options) {
    options = options || {};
    _container = (typeof container === 'string') ? document.querySelector(container) : container;
    if (!_container) { console.error('[CNC_CARD_MASONRY] 容器元素不存在'); return false; }
    _gutter = options.gutter || 16;
    _calculateColumns();
    _container.style.position = 'relative';
    _container.style.visibility = 'hidden';
    _buildColumnWrappers();
    _isInitialized = true;
    if (options.virtualScroll) { _virtualScrollEnabled = true; }
    window.addEventListener('resize', _onResize);
    return true;
  }

  function calculateColumns() {
    return _calculateColumns();
  }

  function distributeCards(cards) {
    if (!_isInitialized) { console.error('[CNC_CARD_MASONRY] 未初始化，请先调用 initMasonryLayout'); return false; }
    _cardElements = [];
    _clearColumns();
    if (!cards || !cards.length) return false;
    for (var i = 0; i < cards.length; i++) {
      var card = (typeof cards[i] === 'string') ? cards[i] : cards[i];
      var wrapper = _getShortestColumn();
      var cardEl = _createCardElement(card, i);
      wrapper.appendChild(cardEl);
      _cardElements.push(cardEl);
    }
    _container.style.visibility = 'visible';
    _updateVirtualRange();
    return true;
  }

  function reflow() {
    if (!_isInitialized) return false;
    var oldColumns = _columns;
    _calculateColumns();
    if (oldColumns !== _columns) {
      var allCards = [];
      for (var i = 0; i < _columnElements.length; i++) {
        var children = _columnElements[i].querySelectorAll('.masonry-card');
        for (var j = 0; j < children.length; j++) {
          allCards.push(children[j]);
        }
      }
      _clearColumns();
      for (var k = 0; k < allCards.length; k++) {
        var col = _getShortestColumn();
        col.appendChild(allCards[k]);
      }
    }
    return true;
  }

  function getColumnCount() {
    return _columns;
  }

  function addCard(card, position) {
    if (!_isInitialized) return false;
    var col;
    if (position === 'first') { col = _getShortestColumn(); col.insertBefore(_createCardElement(card, 0), col.firstChild); }
    else if (position === 'last') { col = _getShortestColumn(); col.appendChild(_createCardElement(card, _cardElements.length)); }
    else {
      col = _getShortestColumn();
      col.appendChild(_createCardElement(card, _cardElements.length));
    }
    return true;
  }

  function destroy() {
    if (_resizeTimer) clearTimeout(_resizeTimer);
    window.removeEventListener('resize', _onResize);
    _container = null;
    _columnElements = [];
    _cardElements = [];
    _isInitialized = false;
  }

  function _calculateColumns() {
    if (!_container) return 0;
    var width = _container.clientWidth;
    if (width < 480) _columns = 2;
    else if (width < 768) _columns = 2;
    else if (width < 1024) _columns = 3;
    else _columns = 4;
    return _columns;
  }

  function _buildColumnWrappers() {
    _columnElements = [];
    for (var i = 0; i < _columns; i++) {
      var col = document.createElement('div');
      col.className = 'masonry-column';
      col.style.cssText = 'width:' + (100 / _columns) + '%;display:inline-block;vertical-align:top;box-sizing:border-box;padding:0 ' + (_gutter / 2) + 'px;';
      _container.appendChild(col);
      _columnElements.push(col);
    }
  }

  function _clearColumns() {
    for (var i = 0; i < _columnElements.length; i++) {
      _columnElements[i].innerHTML = '';
    }
  }

  function _getShortestColumn() {
    var minH = Infinity, minIdx = 0;
    for (var i = 0; i < _columnElements.length; i++) {
      var h = _columnElements[i].offsetHeight;
      if (h < minH) { minH = h; minIdx = i; }
    }
    return _columnElements[minIdx];
  }

  function _createCardElement(card, index) {
    var el;
    if (typeof card === 'string') {
      el = document.createElement('div');
      el.className = 'masonry-card';
      el.innerHTML = card;
    } else if (card instanceof HTMLElement) {
      el = card;
      el.classList.add('masonry-card');
    } else {
      el = document.createElement('div');
      el.className = 'masonry-card';
      el.textContent = String(card);
    }
    el.setAttribute('data-masonry-index', index);
    el.style.cssText = 'margin-bottom:' + _gutter + 'px;break-inside:avoid;';
    return el;
  }

  function _updateVirtualRange() {
    if (!_virtualScrollEnabled) return;
    if (!_container) return;
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var viewportH = window.innerHeight;
    var containerTop = _container.offsetTop;
    _visibleRange.start = Math.max(0, Math.floor((scrollTop - containerTop) / 300) - 5);
    _visibleRange.end = Math.min(_cardElements.length, Math.ceil((scrollTop - containerTop + viewportH) / 300) + 5);
    for (var i = 0; i < _cardElements.length; i++) {
      var visible = i >= _visibleRange.start && i <= _visibleRange.end;
      _cardElements[i].style.display = visible ? '' : 'none';
    }
  }

  function _onResize() {
    if (_resizeTimer) clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(function () { reflow(); }, 200);
  }

  window.CNC_CARD_MASONRY = {
    initMasonryLayout: initMasonryLayout,
    calculateColumns: calculateColumns,
    distributeCards: distributeCards,
    reflow: reflow,
    getColumnCount: getColumnCount,
    addCard: addCard,
    destroy: destroy
  };

  console.log('[CNC_CARD_MASONRY] 瀑布流布局引擎已加载。');
})();
