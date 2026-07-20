/* 数控小潘手机减法界面交互层：为每个结果按钮直接绑定全屏动作。 */
(function () {
  'use strict';

  var BUILD = '20260720k';
  var originalRenderWorkspace = null;

  function ensureStateStyle() {
    if (document.querySelector('style[data-cnc-detail-state]')) return;
    var style = document.createElement('style');
    style.dataset.cncDetailState = 'true';
    style.textContent = '@media (max-width:768px){' +
      'body.cnc-clean-ui[data-cnc-detail-open="true"]{overflow:hidden!important;}' +
      'body.cnc-clean-ui[data-cnc-detail-open="true"] #view-workspace .detail-panel{' +
        'display:block!important;position:fixed!important;inset:0!important;' +
        'z-index:500!important;width:100vw!important;height:100dvh!important;' +
        'overflow-y:auto!important;' +
      '}' +
    '}';
    document.head.appendChild(style);
  }

  function openMobilePanel() {
    var panel = document.getElementById('detail-panel');
    if (!panel || !document.body || window.innerWidth > 768) return false;

    ensureStateStyle();
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

  function bindResultButtons() {
    document.querySelectorAll('#result-list [data-open-entry]').forEach(function (button) {
      if (button.dataset.cncCleanBound === 'true') return;
      button.dataset.cncCleanBound = 'true';

      button.addEventListener('pointerdown', function () {
        window.__CNC_STABLE_LIST_SCROLL__ = window.scrollY;
      });
      button.addEventListener('click', function () {
        confirmMobilePanel();
      });
    });
  }

  function patchWorkspaceRenderer() {
    if (window.__CNC_CLEAN_RENDER_PATCHED__) {
      bindResultButtons();
      return true;
    }

    try {
      if (typeof renderWorkspace !== 'function') return false;
      originalRenderWorkspace = renderWorkspace;
      renderWorkspace = function () {
        var result = originalRenderWorkspace.apply(this, arguments);
        bindResultButtons();
        return result;
      };
      window.__CNC_CLEAN_RENDER_PATCHED__ = true;
      bindResultButtons();
      return true;
    } catch (error) {
      console.warn('[CNC减法界面] 结果按钮绑定暂未就绪', error);
      return false;
    }
  }

  ensureStateStyle();

  var tries = 0;
  var timer = window.setInterval(function () {
    tries += 1;
    if (patchWorkspaceRenderer() || tries > 120) window.clearInterval(timer);
  }, 100);

  document.addEventListener('click', function (event) {
    if (!event.target || !event.target.closest) return;
    if (event.target.closest('#detail-back-btn,[data-cnc-bottom="back"]')) {
      closeMobilePanel();
    }
  }, true);

  window.CNC_CLEAN_UI = {
    build: BUILD,
    openMobilePanel: openMobilePanel,
    closeMobilePanel: closeMobilePanel,
    confirmMobilePanel: confirmMobilePanel,
    bindResultButtons: bindResultButtons
  };
})();
