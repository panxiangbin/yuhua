/* 数控小潘：锤子工业卡片风查询工作区，仅作用于手机查询列表。 */
(function () {
  'use strict';

  var BUILD = '20260721v';
  var retryDelays = [0, 60, 160, 360, 760, 1300];
  var resultBindingDelays = [0, 60, 180, 360, 720, 1200];
  var booted = false;

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

  function bindStableResults() {
    if (window.CNC_CLEAN_UI && typeof window.CNC_CLEAN_UI.bindResultButtons === 'function') {
      window.CNC_CLEAN_UI.bindResultButtons();
    }
  }

  function decorateResults() {
    bindStableResults();
    document.querySelectorAll('#result-list .result-card').forEach(function (card) {
      card.dataset.industrialResult = 'true';
    });
    var toolbar = document.querySelector('#view-workspace .search-toolbar');
    if (toolbar) toolbar.dataset.industrialPanel = 'search';
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

  function scheduleInteractionSync() {
    [0, 60, 160, 360, 760].forEach(function (delay) {
      window.setTimeout(syncWorkspaceSurface, delay);
    });
  }

  function scheduleResultBinding() {
    resultBindingDelays.forEach(function (delay) {
      window.setTimeout(decorateResults, delay);
    });
  }

  function boot() {
    if (booted) return;
    booted = true;
    document.body && document.body.classList.add('cnc-industrial-workspace');
    retryDelays.forEach(function (delay) {
      window.setTimeout(syncWorkspaceSurface, delay);
    });
    scheduleResultBinding();
    window.__CNC_INDUSTRIAL_WORKSPACE_READY_AT__ = Math.round(performance.now());
  }

  /*
   * 纯事件驱动：不包裹 renderWorkspace，不改写搜索、详情或路由核心函数。
   * 旧搜索存在延迟重绘，因此在输入后1.2秒内做有限次数绑定，不启动永久定时器。
   */
  document.addEventListener('click', function (event) {
    if (!event.target || !event.target.closest) return;
    if (event.target.closest('[data-route],[data-filter],[data-open-entry],#detail-back-btn,#home-btn,.xp-bottom-nav button')) {
      scheduleInteractionSync();
      scheduleResultBinding();
    }
  }, true);

  document.addEventListener('input', function (event) {
    if (event.target && event.target.id === 'search-input') {
      scheduleResultBinding();
    }
  }, true);

  window.addEventListener('hashchange', scheduleInteractionSync);
  window.addEventListener('popstate', scheduleInteractionSync);
  document.addEventListener('DOMContentLoaded', boot, { once: true });
  window.addEventListener('load', function () {
    scheduleInteractionSync();
    scheduleResultBinding();
  }, { once: true });

  if (document.readyState === 'loading') {
    /* DOMContentLoaded 会执行 boot。 */
  } else {
    boot();
  }

  window.CNC_INDUSTRIAL_WORKSPACE = {
    build: BUILD,
    polling: false,
    observer: false,
    eventDriven: true,
    rendererPatched: false,
    maxReadinessAttempts: retryDelays.length,
    maxBindingAttempts: resultBindingDelays.length,
    sync: syncWorkspaceSurface,
    bindResults: bindStableResults,
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
        eventDriven: true,
        rendererPatched: false
      };
    }
  };
})();