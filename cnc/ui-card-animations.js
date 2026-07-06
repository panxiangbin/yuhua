/**
 * ui-card-animations.js
 * 卡片动画系统 — 入场/悬停/展开/折叠/动画队列
 * 全局对象: window.CNC_CARD_ANIM
 */
(function () {
  'use strict';

  if (window.CNC_CARD_ANIM) return;

  var _queue = [];
  var _isPlaying = false;
  var _DEFAULT_DURATION = 300;
  var _STAGGER_DELAY = 60;

  function animateCardEntry(card, index) {
    if (!card) return;
    var el = (typeof card === 'string') ? document.querySelector(card) : card;
    if (!el) return;

    var delay = (index || 0) * _STAGGER_DELAY;
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity ' + _DEFAULT_DURATION + 'ms ease, transform ' + _DEFAULT_DURATION + 'ms ease';
    el.style.transitionDelay = delay + 'ms';

    _queue.push({ el: el, delay: delay, type: 'entry' });
    _processQueue();

    requestAnimationFrame(function () {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });

    setTimeout(function () {
      el.style.transitionDelay = '0ms';
      el.classList.add('card-animated');
    }, delay + _DEFAULT_DURATION);
  }

  function animateCardHover(card) {
    if (!card) return;
    var el = (typeof card === 'string') ? document.querySelector(card) : card;
    if (!el) return;

    el.addEventListener('mouseenter', function () {
      el.style.transform = 'translateY(-4px)';
      el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
      el.style.transition = 'all 0.25s ease';
    });

    el.addEventListener('mouseleave', function () {
      el.style.transform = 'translateY(0)';
      el.style.boxShadow = '';
      el.style.transition = 'all 0.25s ease';
    });
  }

  function animateCardExpand(card) {
    if (!card) return;
    var el = (typeof card === 'string') ? document.querySelector(card) : card;
    if (!el) return;

    if (el.classList.contains('card-expanded')) {
      animateCardCollapse(el);
      return;
    }

    var content = el.querySelector('.card-expandable-content');
    if (!content) return;

    el.classList.add('card-expanded');
    var fullHeight = content.scrollHeight;
    content.style.maxHeight = '0';
    content.style.overflow = 'hidden';
    content.style.transition = 'max-height ' + _DEFAULT_DURATION + 'ms ease';

    requestAnimationFrame(function () {
      content.style.maxHeight = fullHeight + 'px';
    });

    setTimeout(function () {
      content.style.maxHeight = 'none';
    }, _DEFAULT_DURATION + 50);
  }

  function animateCardCollapse(card) {
    if (!card) return;
    var el = (typeof card === 'string') ? document.querySelector(card) : card;
    if (!el) return;

    var content = el.querySelector('.card-expandable-content');
    if (!content) return;

    el.classList.remove('card-expanded');
    content.style.maxHeight = content.scrollHeight + 'px';

    requestAnimationFrame(function () {
      content.style.maxHeight = '0';
    });

    setTimeout(function () {
      content.style.maxHeight = '';
      content.style.overflow = '';
    }, _DEFAULT_DURATION + 50);
  }

  function animateBatch(cards, animationType) {
    if (!cards || !cards.length) return;
    for (var i = 0; i < cards.length; i++) {
      if (animationType === 'entry') animateCardEntry(cards[i], i);
      else if (animationType === 'hover') animateCardHover(cards[i]);
    }
  }

  function setGlobalDuration(ms) {
    _DEFAULT_DURATION = ms;
  }

  function _processQueue() {
    if (_isPlaying || _queue.length === 0) return;
    _isPlaying = true;
    var item = _queue.shift();
    setTimeout(function () {
      _isPlaying = false;
      _processQueue();
    }, item.delay + _DEFAULT_DURATION + 50);
  }

  window.CNC_CARD_ANIM = {
    animateCardEntry: animateCardEntry,
    animateCardHover: animateCardHover,
    animateCardExpand: animateCardExpand,
    animateCardCollapse: animateCardCollapse,
    animateBatch: animateBatch,
    setGlobalDuration: setGlobalDuration
  };

  console.log('[CNC_CARD_ANIM] 卡片动画系统已加载。');
})();
