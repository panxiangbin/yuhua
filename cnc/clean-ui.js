/* 数控小潘手机减法界面交互层：让G/M结果整卡稳定打开详情。 */
(function () {
  'use strict';

  var BUILD = '20260720k';

  function getCurrentState() {
    try {
      return state;
    } catch (error) {
      return null;
    }
  }

  function openResultCard(entryId) {
    var current = getCurrentState();
    if (!current || !entryId) return false;

    current.selectedId = entryId;
    window.__CNC_STABLE_LIST_SCROLL__ = window.scrollY;

    if (typeof renderWorkspace === 'function') renderWorkspace();
    if (typeof renderDetail === 'function') renderDetail();

    var panel = document.getElementById('detail-panel');
    if (!panel) return false;

    panel.classList.add('mobile-open');
    panel.scrollTop = 0;
    document.body.classList.add('cnc-detail-open');
    return true;
  }

  document.addEventListener('click', function (event) {
    if (window.innerWidth > 768 || !event.target || !event.target.closest) return;

    var current = getCurrentState();
    if (!current || current.activeFilter !== 'gcode') return;

    var card = event.target.closest('#result-list .result-card');
    if (!card) return;

    var trigger = event.target.closest('[data-open-entry]') || card.querySelector('[data-open-entry]');
    var entryId = trigger && trigger.dataset ? trigger.dataset.openEntry : '';
    if (!entryId) return;

    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    openResultCard(entryId);
  }, true);

  window.CNC_CLEAN_UI = {
    build: BUILD,
    openResultCard: openResultCard
  };
})();
