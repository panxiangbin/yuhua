/* 数控小潘：锤子工业卡片风查询工作区，仅作用于手机查询列表。 */
(function () {
  'use strict';

  var BUILD = '20260721v';
  var retryDelays = [0, 60, 160, 360, 760, 1300];
  var resultBindingDelays = [0, 60, 180, 360, 720, 1200];
  var booted = false;
  var suggestionCloseTimer = null;
  var lastSuggestionQuery = null;

  function ensureSuggestionStyle() {
    if (document.querySelector('style[data-cnc-industrial-suggestions]')) return;
    var style = document.createElement('style');
    style.dataset.cncIndustrialSuggestions = 'true';
    style.textContent = '@media(max-width:768px){' +
      'body.cnc-industrial-workspace[data-cnc-industrial-workspace="true"] #view-workspace .workspace-panel.search-panel,' +
      'body.cnc-industrial-workspace[data-cnc-industrial-workspace="true"] #view-workspace .search-toolbar{position:relative!important;top:auto!important;inset:auto!important;z-index:1!important;}' +
      'body.cnc-industrial-workspace[data-cnc-industrial-workspace="true"] #view-workspace #search-input{border-radius:10px!important;}' +
      'body.cnc-industrial-workspace[data-cnc-industrial-workspace="true"] #view-workspace .result-card{border-radius:14px!important;}' +
      'body.cnc-industrial-workspace[data-cnc-industrial-workspace="true"] #view-workspace .result-card .result-top strong{font-size:25px!important;font-weight:950!important;}' +
      'body.cnc-industrial-workspace[data-cnc-industrial-workspace="true"] #view-workspace #search-suggestions{position:static!important;inset:auto!important;z-index:auto!important;width:100%!important;max-height:176px!important;margin:9px 0 0!important;padding:5px!important;overflow-y:auto!important;border:1px solid var(--cnc-ic-line)!important;border-radius:9px!important;background:var(--cnc-ic-surface-soft)!important;box-shadow:inset 0 1px 2px rgba(46,43,38,.06)!important;}' +
      'body.cnc-industrial-workspace[data-cnc-industrial-workspace="true"] #search-suggestions[hidden]{display:none!important;}' +
      'body.cnc-industrial-workspace[data-cnc-industrial-workspace="true"] #search-suggestions .suggestion-item{display:grid!important;grid-template-columns:34px minmax(0,1fr) auto!important;gap:8px!important;width:100%!important;min-height:42px!important;padding:7px 8px!important;align-items:center!important;border:0!important;border-bottom:1px solid var(--cnc-ic-line)!important;border-radius:6px!important;background:transparent!important;color:var(--cnc-ic-ink)!important;box-shadow:none!important;text-align:left!important;}' +
      'body.cnc-industrial-workspace[data-cnc-industrial-workspace="true"] #search-suggestions .suggestion-item:last-child{border-bottom:0!important;}' +
      'body.cnc-industrial-workspace[data-cnc-industrial-workspace="true"] #search-suggestions .suggestion-item:active{background:var(--cnc-ic-surface-pressed)!important;transform:translateY(1px)!important;}' +
      'body.cnc-industrial-workspace[data-cnc-industrial-workspace="true"] #search-suggestions .suggestion-type-badge{display:inline-flex!important;width:30px!important;height:28px!important;align-items:center!important;justify-content:center!important;border:1px solid var(--cnc-ic-line-strong)!important;border-radius:6px!important;background:var(--cnc-ic-surface)!important;color:var(--cnc-iw-accent)!important;font-family:var(--cnc-ic-code-font)!important;font-size:11px!important;font-weight:900!important;}' +
      'body.cnc-industrial-workspace[data-cnc-industrial-workspace="true"] #search-suggestions .suggestion-text{font-family:var(--cnc-ic-code-font)!important;font-size:15px!important;font-weight:900!important;}' +
      'body.cnc-industrial-workspace[data-cnc-industrial-workspace="true"] #search-suggestions .suggestion-category{color:var(--cnc-ic-muted)!important;font-size:11px!important;font-weight:700!important;}' +
    '}';
    document.head.appendChild(style);
  }

  function setNormalFlow(node, zIndex) {
    if (!node) return;
    node.style.setProperty('position', 'relative', 'important');
    node.style.setProperty('top', 'auto', 'important');
    node.style.setProperty('inset', 'auto', 'important');
    node.style.setProperty('z-index', String(zIndex == null ? 1 : zIndex), 'important');
  }

  function enforceControlGeometry() {
    var input = document.getElementById('search-input');
    var panel = document.querySelector('#view-workspace .workspace-panel.search-panel');
    var toolbar = document.querySelector('#view-workspace .search-toolbar');
    var box = document.getElementById('search-suggestions');
    if (input) input.style.setProperty('border-radius', '10px', 'important');
    setNormalFlow(panel, 1);
    setNormalFlow(toolbar, 1);
    document.querySelectorAll('#result-list .result-card').forEach(function (card) {
      card.style.setProperty('border-radius', '14px', 'important');
      var code = card.querySelector('.result-top strong');
      if (code) {
        code.style.setProperty('font-size', '25px', 'important');
        code.style.setProperty('font-weight', '950', 'important');
      }
    });
    if (box) {
      box.style.setProperty('position', 'static', 'important');
      box.style.setProperty('inset', 'auto', 'important');
      box.style.setProperty('z-index', 'auto', 'important');
      box.style.setProperty('width', '100%', 'important');
      box.style.setProperty('max-height', '176px', 'important');
      box.style.setProperty('margin', '9px 0 0', 'important');
    }
  }

  function closeSuggestions() {
    if (suggestionCloseTimer !== null) {
      window.clearTimeout(suggestionCloseTimer);
      suggestionCloseTimer = null;
    }
    var box = document.getElementById('search-suggestions');
    if (!box) return;
    if (window.CNC_FRONTEND && typeof window.CNC_FRONTEND.closeSuggestionBox === 'function') {
      window.CNC_FRONTEND.closeSuggestionBox(box);
      return;
    }
    box.style.display = 'none';
    box.hidden = true;
    box.setAttribute('aria-hidden', 'true');
  }

  function scheduleSuggestionClose(query) {
    if (query === lastSuggestionQuery && suggestionCloseTimer !== null) return;
    lastSuggestionQuery = query;
    if (suggestionCloseTimer !== null) window.clearTimeout(suggestionCloseTimer);
    suggestionCloseTimer = window.setTimeout(function () {
      suggestionCloseTimer = null;
      closeSuggestions();
    }, 900);
  }

  function activeViewId() {
    var active = document.querySelector('.view.active');
    return active ? active.id : '';
  }

  function detailOpen() {
    var panel = document.getElementById('detail-panel');
    return Boolean(document.body && (document.body.getAttribute('data-cnc-detail-open') === 'true' || (panel && panel.classList.contains('mobile-open'))));
  }

  function currentMode() {
    try { if (typeof state !== 'undefined' && state && state.activeFilter) return String(state.activeFilter); } catch (ignored) {}
    return String(document.body && document.body.getAttribute('data-cnc-query-mode') || 'all');
  }

  function currentSelectedId() {
    try { return typeof state !== 'undefined' && state ? String(state.selectedId || '') : ''; } catch (ignored) { return ''; }
  }

  function bindStableResults() {
    if (window.CNC_CLEAN_UI && typeof window.CNC_CLEAN_UI.bindResultButtons === 'function') window.CNC_CLEAN_UI.bindResultButtons();
  }

  function decorateResults() {
    enforceControlGeometry();
    bindStableResults();
    document.querySelectorAll('#result-list .result-card').forEach(function (card) { card.dataset.industrialResult = 'true'; });
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
      closeSuggestions();
      return false;
    }
    document.body.setAttribute('data-cnc-industrial-workspace', 'true');
    document.body.setAttribute('data-cnc-industrial-mode', currentMode());
    decorateResults();
    return true;
  }

  function scheduleInteractionSync() {
    [0, 60, 160, 360, 760].forEach(function (delay) { window.setTimeout(syncWorkspaceSurface, delay); });
  }

  function scheduleResultBinding() {
    resultBindingDelays.forEach(function (delay) { window.setTimeout(decorateResults, delay); });
  }

  function fallbackOpenEntry(entryId) {
    if (!entryId || currentSelectedId() === entryId) return false;
    if (!window.app || typeof window.app.selectEntry !== 'function') return false;
    window.app.selectEntry(entryId);
    if (window.CNC_CLEAN_UI && typeof window.CNC_CLEAN_UI.confirmMobilePanel === 'function') window.CNC_CLEAN_UI.confirmMobilePanel(entryId);
    return true;
  }

  function scheduleOpenFallback(entryId) {
    window.setTimeout(function () { fallbackOpenEntry(entryId); }, 0);
    window.setTimeout(function () { fallbackOpenEntry(entryId); }, 90);
  }

  function settleClosedDetail() {
    window.setTimeout(function () {
      if (window.CNC_CLEAN_UI && typeof window.CNC_CLEAN_UI.closeMobilePanel === 'function') window.CNC_CLEAN_UI.closeMobilePanel();
      scheduleInteractionSync();
    }, 240);
  }

  function boot() {
    if (booted) return;
    booted = true;
    ensureSuggestionStyle();
    if (document.body) document.body.classList.add('cnc-industrial-workspace');
    retryDelays.forEach(function (delay) { window.setTimeout(syncWorkspaceSurface, delay); });
    scheduleResultBinding();
    window.__CNC_INDUSTRIAL_WORKSPACE_READY_AT__ = Math.round(performance.now());
  }

  document.addEventListener('click', function (event) {
    if (!event.target || !event.target.closest) return;
    var openButton = event.target.closest('[data-open-entry]');
    var resultCard = event.target.closest('#result-list .result-card');
    var backButton = event.target.closest('#detail-back-btn,[data-cnc-bottom="back"]');
    var entryId = openButton ? openButton.getAttribute('data-open-entry') : '';
    if (!entryId && resultCard) {
      var nestedButton = resultCard.querySelector('[data-open-entry]');
      entryId = nestedButton ? nestedButton.getAttribute('data-open-entry') : '';
    }
    if (resultCard || openButton) closeSuggestions();
    if (entryId) scheduleOpenFallback(entryId);
    if (backButton) settleClosedDetail();
    if (event.target.closest('[data-route],[data-filter],[data-open-entry],#result-list .result-card,#detail-back-btn,#home-btn,.xp-bottom-nav button')) {
      scheduleInteractionSync();
      scheduleResultBinding();
    }
  }, false);

  document.addEventListener('pointerdown', function (event) {
    if (event.target && event.target.closest && event.target.closest('#result-list')) closeSuggestions();
  }, true);

  document.addEventListener('input', function (event) {
    if (event.target && event.target.id === 'search-input') {
      scheduleResultBinding();
      scheduleSuggestionClose(String(event.target.value || ''));
    }
  }, true);

  document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeSuggestions(); }, true);
  window.addEventListener('scroll', function () { if (activeViewId() === 'view-workspace') closeSuggestions(); }, { passive: true });
  window.addEventListener('hashchange', scheduleInteractionSync);
  window.addEventListener('popstate', scheduleInteractionSync);
  document.addEventListener('DOMContentLoaded', boot, { once: true });
  window.addEventListener('load', function () { scheduleInteractionSync(); scheduleResultBinding(); }, { once: true });

  if (document.readyState !== 'loading') boot();

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
    closeSuggestions: closeSuggestions,
    enforceControlGeometry: enforceControlGeometry,
    fallbackOpenEntry: fallbackOpenEntry,
    runCheck: function () {
      var active = document.body && document.body.getAttribute('data-cnc-industrial-workspace') === 'true';
      var cards = document.querySelectorAll('#result-list .result-card[data-industrial-result="true"]');
      return {
        passed: Boolean(document.body && document.body.classList.contains('cnc-industrial-workspace')),
        active: active,
        mode: document.body ? document.body.getAttribute('data-cnc-industrial-mode') || '' : '',
        decoratedResults: cards.length,
        suggestionsStatic: Boolean(document.querySelector('style[data-cnc-industrial-suggestions]')),
        polling: false,
        observer: false,
        eventDriven: true,
        rendererPatched: false
      };
    }
  };
})();