/* 数控小潘：锤子工业卡片风查询工作区，仅作用于手机查询列表。 */
(function () {
  'use strict';

  var BUILD = '20260721v';
  var retryDelays = [0, 60, 160, 360, 760, 1300];
  var retryIndex = 0;
  var retryTimer = null;
  var originalRenderWorkspace = null;

  function activeViewId() {
    var active = document.querySelector('.view.active');
    return active ? active.id : '';
  }

  function detailOpen() {
    var panel = document.getElementById('detail-panel');
    return Boolean(document.body && (
      document.body.getAttribute('data-cnc-detail-open') === 'true' ||
      (panel && panel.classList.contains('mobile-open'))
    ));
  }

  function currentMode() {
    try {
      if (typeof state !== 'undefined' && state && state.activeFilter) {
        return String(state.activeFilter);
      }
    } catch (ignored) {}
    return String(document.body && document.body.getAttribute('data-cnc-query-mode') || 'all');
  }

  function decorateResults() {
    document.querySelectorAll('#result-list .result-card').forEach(function (card) {
      card.dataset.industrialResult = 'true';
    });
    var searchPanel = document.querySelector('#view-workspace .workspace-panel.search-panel');
    if (searchPanel) searchPanel.dataset.industrialPanel = 'search';
  }

  function syncWorkspaceSurface() {
    if (!document.body) return false;
    document.body.classList.add('cnc-industrial-workspace');

    var active = activeViewId() === 'view-workspace' && !detailOpen();
    if (!active) {
      document.body.removeAttribute('data-cnc-industrial-workspace');
      document.body.removeAttribute('data-cnc-industrial-mode');
      return false;
    }

    document.body.setAttribute('data-cnc-industrial-workspace', 'true');
    document.body.setAttribute('data-cnc-industrial-mode', currentMode());
    decorateResults();
    return true;
  }

  function patchWorkspaceRenderer() {
    if (window.__CNC_INDUSTRIAL_WORKSPACE_PATCHED__) return true;
    try {
      if (typeof renderWorkspace !== 'function') return false;
      originalRenderWorkspace = renderWorkspace;
      renderWorkspace = function () {
        var result = originalRenderWorkspace.apply(this, arguments);
        window.setTimeout(syncWorkspaceSurface, 0);
        window.setTimeout(syncWorkspaceSurface, 100);
        return result;
      };
      window.__CNC_INDUSTRIAL_WORKSPACE_PATCHED__ = true;
      return true;
    } catch (error) {
      console.warn('[CNC工业查询界面] 工作区渲染器暂未就绪', error);
      return false;
    }
  }

  function readinessCheck() {
    retryTimer = null;
    if (patchWorkspaceRenderer()) {
      syncWorkspaceSurface();
      window.__CNC_INDUSTRIAL_WORKSPACE_READY_AT__ = Math.round(performance.now());
      return;
    }
    scheduleReadinessCheck();
  }

  function scheduleReadinessCheck() {
    if (retryTimer !== null || retryIndex >= retryDelays.length) return;
    retryTimer = window.setTimeout(readinessCheck, retryDelays[retryIndex++]);
  }

  function scheduleInteractionSync() {
    [0, 80, 240, 620].forEach(function (delay) {
      window.setTimeout(syncWorkspaceSurface, delay);
    });
  }

  document.addEventListener('click', function (event) {
    if (!event.target || !event.target.closest) return;
    if (event.target.closest('[data-route],[data-filter],[data-open-entry],#detail-back-btn,#home-btn,.xp-bottom-nav button')) {
      scheduleInteractionSync();
    }
  }, true);

  window.addEventListener('hashchange', scheduleInteractionSync);
  window.addEventListener('popstate', scheduleInteractionSync);
  document.addEventListener('DOMContentLoaded', scheduleReadinessCheck, { once: true });
  window.addEventListener('load', scheduleReadinessCheck, { once: true });

  scheduleReadinessCheck();

  window.CNC_INDUSTRIAL_WORKSPACE = {
    build: BUILD,
    polling: false,
    observer: false,
    maxReadinessAttempts: retryDelays.length,
    sync: syncWorkspaceSurface,
    runCheck: function () {
      var active = document.body && document.body.getAttribute('data-cnc-industrial-workspace') === 'true';
      var cards = document.querySelectorAll('#result-list .result-card[data-industrial-result="true"]');
      return {
        passed: Boolean(document.body && document.body.classList.contains('cnc-industrial-workspace')),
        active: active,
        mode: document.body ? document.body.getAttribute('data-cnc-industrial-mode') || '' : '',
        decoratedResults: cards.length,
        polling: false,
        observer: false,
        workspacePatched: Boolean(window.__CNC_INDUSTRIAL_WORKSPACE_PATCHED__)
      };
    }
  };
})();