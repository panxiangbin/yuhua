/* 数控小潘手机减法界面交互层：结果整卡点击、查询拆分与低开销初始化。 */
(function () {
  'use strict';

  var BUILD = '20260721q';
  var QUERY_BUILD = '20260720n';
  var originalRenderWorkspace = null;
  var retryDelays = [0, 40, 100, 220, 480, 900, 1600];
  var retryIndex = 0;
  var retryTimer = null;

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

  function ensureQueryModes() {
    if (!document.querySelector('link[data-cnc-query-modes-style]')) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = './query-modes.css?v=' + QUERY_BUILD;
      link.dataset.cncQueryModesStyle = 'true';
      document.head.appendChild(link);
    }

    if (window.CNC_QUERY_MODES && window.CNC_QUERY_MODES.build === QUERY_BUILD) {
      if (window.CNC_QUERY_MODES.refresh) window.CNC_QUERY_MODES.refresh();
      return true;
    }

    if (!document.querySelector('script[data-cnc-query-modes-script]')) {
      var script = document.createElement('script');
      script.src = './query-modes.js?v=' + QUERY_BUILD;
      script.async = true;
      script.dataset.cncQueryModesScript = 'true';
      script.addEventListener('load', scheduleReadinessCheck, { once: true });
      script.addEventListener('error', function () {
        console.error('[CNC查询拆分] 独立查询模块加载失败');
      }, { once: true });
      document.head.appendChild(script);
    }
    return false;
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
      button.addEventListener('click', confirmMobilePanel);
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

  function readinessCheck() {
    retryTimer = null;
    var queryReady = ensureQueryModes();
    var workspaceReady = patchWorkspaceRenderer();
    if (queryReady && workspaceReady) {
      window.__CNC_CLEAN_READY_AT__ = Math.round(performance.now());
      return;
    }
    scheduleReadinessCheck();
  }

  function scheduleReadinessCheck() {
    if (retryTimer !== null || retryIndex >= retryDelays.length) return;
    var delay = retryDelays[retryIndex++];
    retryTimer = window.setTimeout(readinessCheck, delay);
  }

  ensureStateStyle();
  ensureQueryModes();
  scheduleReadinessCheck();
  document.addEventListener('DOMContentLoaded', scheduleReadinessCheck, { once: true });
  window.addEventListener('load', scheduleReadinessCheck, { once: true });

  document.addEventListener('click', function (event) {
    if (!event.target || !event.target.closest) return;
    if (event.target.closest('#detail-back-btn,[data-cnc-bottom="back"]')) closeMobilePanel();
  }, true);

  window.CNC_CLEAN_UI = {
    build: BUILD,
    queryBuild: QUERY_BUILD,
    polling: false,
    maxReadinessAttempts: retryDelays.length,
    openMobilePanel: openMobilePanel,
    closeMobilePanel: closeMobilePanel,
    confirmMobilePanel: confirmMobilePanel,
    bindResultButtons: bindResultButtons,
    ensureQueryModes: ensureQueryModes,
    scheduleReadinessCheck: scheduleReadinessCheck
  };
})();