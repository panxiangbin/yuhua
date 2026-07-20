/* 数控小潘手机减法界面交互层：保留原详情逻辑，只补全手机全屏状态。 */
(function () {
  'use strict';

  var BUILD = '20260720k';

  function openMobilePanel() {
    var panel = document.getElementById('detail-panel');
    if (!panel) return false;

    panel.classList.add('mobile-open');
    panel.scrollTop = 0;
    document.body.classList.add('cnc-detail-open');
    return true;
  }

  document.addEventListener('click', function (event) {
    if (window.innerWidth > 768 || !event.target || !event.target.closest) return;

    var trigger = event.target.closest('#result-list [data-open-entry]');
    if (!trigger) return;

    window.__CNC_STABLE_LIST_SCROLL__ = window.scrollY;
    window.setTimeout(openMobilePanel, 0);
  }, true);

  window.CNC_CLEAN_UI = {
    build: BUILD,
    openMobilePanel: openMobilePanel
  };
})();
