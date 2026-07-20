/* 数控小潘手机减法界面交互层：用独立页面状态稳定控制手机全屏详情。 */
(function () {
  'use strict';

  var BUILD = '20260720k';

  function openMobilePanel() {
    var panel = document.getElementById('detail-panel');
    if (!panel || !document.body) return false;

    panel.classList.add('mobile-open');
    panel.scrollTop = 0;
    document.body.classList.add('cnc-detail-open');
    document.body.setAttribute('data-cnc-detail-open', 'true');
    return true;
  }

  function closeMobilePanel() {
    var panel = document.getElementById('detail-panel');
    if (panel) panel.classList.remove('mobile-open', 'show-secondary');
    if (document.body) {
      document.body.classList.remove('cnc-detail-open');
      document.body.removeAttribute('data-cnc-detail-open');
    }
  }

  function confirmMobilePanel() {
    openMobilePanel();
    window.setTimeout(openMobilePanel, 50);
    window.setTimeout(openMobilePanel, 200);
  }

  function handleOpenIntent(event) {
    if (window.innerWidth > 768 || !event.target || !event.target.closest) return;
    var trigger = event.target.closest('#result-list [data-open-entry]');
    if (!trigger) return;

    window.__CNC_STABLE_LIST_SCROLL__ = window.scrollY;
    confirmMobilePanel();
  }

  document.addEventListener('pointerdown', handleOpenIntent, true);
  document.addEventListener('click', function (event) {
    if (!event.target || !event.target.closest) return;

    if (event.target.closest('#detail-back-btn,[data-cnc-bottom="back"]')) {
      closeMobilePanel();
      return;
    }

    handleOpenIntent(event);
  }, true);

  window.CNC_CLEAN_UI = {
    build: BUILD,
    openMobilePanel: openMobilePanel,
    closeMobilePanel: closeMobilePanel,
    confirmMobilePanel: confirmMobilePanel
  };
})();
