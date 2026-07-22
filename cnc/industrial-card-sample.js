/* 数控小潘：锤子工业卡片风，覆盖手机首页与全部知识详情页。 */
(function () {
  'use strict';

  var BUILD = '20260722e';
  var DETAIL_STYLE_BUILD = '20260722d';
  var patchedRenderWorkspace = false;
  var patchedRenderDetail = false;
  var patchedRenderDashboardRecent = false;
  var pendingEntryId = '';
  var retryDelays = [0, 80, 180, 360, 700, 1200];

  var cardRules = [
    { match: /新手学习/, glyph: '01', tone: 'graphite' },
    { match: /G\/M代码/, glyph: 'G', tone: 'blue' },
    { match: /报警排查|报警号查询/, glyph: '!', tone: 'danger' },
    { match: /参数速查|参数号速查/, glyph: '#', tone: 'warning' },
    { match: /故障问诊|故障排查/, glyph: '?', tone: 'warning' },
    { match: /工艺刀具/, glyph: 'T', tone: 'success' },
    { match: /换算工具/, glyph: 'ƒ', tone: 'blue' }
  ];

  function ensureDetailStyle() {
    var link = document.querySelector('link[data-cnc-industrial-detail-pages]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = './industrial-detail-pages.css?v=' + DETAIL_STYLE_BUILD;
      link.dataset.cncIndustrialDetailPages = '1';
      document.head.appendChild(link);
    }
    return link;
  }

  function ensurePriorityStyle() {
    if (document.querySelector('style[data-cnc-industrial-priority]')) return;
    var style = document.createElement('style');
    style.dataset.cncIndustrialPriority = 'true';
    style.textContent = '@media(max-width:768px){' +
      'body.cnc-clean-ui.cnc-vivid-ui.cnc-industrial-sample[data-cnc-industrial-surface="home"] .launchpad-card,' +
      'body.cnc-clean-ui.cnc-vivid-ui.cnc-industrial-sample[data-cnc-industrial-surface="home"] .launchpad-card.primary{' +
        'background-image:none!important;background-color:var(--cnc-ic-surface)!important;' +
        'color:var(--cnc-ic-ink)!important;border:1px solid var(--cnc-ic-line)!important;' +
        'border-radius:var(--cnc-ic-radius-card)!important;' +
        'box-shadow:inset 4px 0 0 var(--cnc-ic-accent),var(--cnc-ic-shadow-card)!important;' +
        'transform:none!important;' +
      '}' +
      'body.cnc-clean-ui.cnc-vivid-ui.cnc-industrial-sample[data-cnc-industrial-surface="home"] .launchpad-card h3{' +
        'color:var(--cnc-ic-ink)!important;font-size:20px!important;font-weight:900!important;' +
      '}' +
      'body.cnc-clean-ui.cnc-vivid-ui.cnc-industrial-sample[data-cnc-industrial-surface="home"] .launchpad-card p{' +
        'display:block!important;color:var(--cnc-ic-muted)!important;font-size:13px!important;font-weight:600!important;' +
      '}' +
      'body.cnc-clean-ui.cnc-vivid-ui.cnc-industrial-sample[data-cnc-industrial-surface="home"] .launchpad-card:active{' +
        'background-image:none!important;background-color:var(--cnc-ic-surface-pressed)!important;' +
        'box-shadow:inset 4px 0 0 var(--cnc-ic-accent),var(--cnc-ic-shadow-pressed)!important;' +
        'transform:translateY(1px)!important;' +
      '}' +
      'body.cnc-industrial-sample[data-cnc-industrial-surface="home"] #dashboard-recent-section{' +
        'display:block!important;margin:14px 12px 0!important;padding:16px!important;border:1px solid var(--cnc-ic-line)!important;' +
        'border-radius:var(--cnc-ic-radius-card)!important;background:var(--cnc-ic-surface-soft)!important;' +
        'box-shadow:var(--cnc-ic-shadow-card)!important;' +
      '}' +
      'body.cnc-industrial-sample[data-cnc-industrial-surface="home"] #dashboard-recent-section .section-head{' +
        'display:block!important;margin-bottom:12px!important;' +
      '}' +
      'body.cnc-industrial-sample[data-cnc-industrial-surface="home"] #dashboard-recent-section .section-head h3{' +
        'margin:0!important;color:var(--cnc-ic-ink)!important;font-size:19px!important;font-weight:900!important;' +
      '}' +
      'body.cnc-industrial-sample[data-cnc-industrial-surface="home"] #dashboard-recent-list{' +
        'display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:9px!important;' +
      '}' +
      'body.cnc-industrial-sample[data-cnc-industrial-surface="home"] .recent-card{' +
        'display:grid!important;grid-template-columns:48px minmax(0,1fr) 18px!important;align-items:center!important;' +
        'gap:11px!important;min-height:82px!important;padding:12px!important;border:1px solid var(--cnc-ic-line)!important;' +
        'border-radius:12px!important;background:var(--cnc-ic-surface)!important;color:var(--cnc-ic-ink)!important;' +
        'box-shadow:inset 4px 0 0 var(--cnc-ic-blue),0 2px 8px rgba(46,43,38,.06)!important;cursor:pointer!important;' +
      '}' +
      'body.cnc-industrial-sample[data-cnc-industrial-surface="home"] .recent-card:after{' +
        'content:"›";grid-column:3;color:var(--cnc-ic-muted);font:700 24px/1 var(--cnc-ic-code-font);' +
      '}' +
      'body.cnc-industrial-sample[data-cnc-industrial-surface="home"] .recent-card:active{' +
        'background:var(--cnc-ic-surface-pressed)!important;box-shadow:inset 4px 0 0 var(--cnc-ic-blue),var(--cnc-ic-shadow-pressed)!important;transform:translateY(1px)!important;' +
      '}' +
      'body.cnc-industrial-sample[data-cnc-industrial-surface="home"] .recent-card:focus-visible{' +
        'outline:3px solid rgba(63,97,121,.28)!important;outline-offset:2px!important;' +
      '}' +
      'body.cnc-industrial-sample[data-cnc-industrial-surface="home"] .recent-card-icon{' +
        'display:grid!important;place-items:center!important;width:48px!important;height:48px!important;' +
        'border:1px solid var(--cnc-ic-line-strong)!important;border-radius:10px!important;background:var(--cnc-ic-blue-soft)!important;' +
        'color:var(--cnc-ic-blue-deep)!important;font:950 16px/1 var(--cnc-ic-code-font)!important;' +
      '}' +
      'body.cnc-industrial-sample[data-cnc-industrial-surface="home"] .recent-card h4{' +
        'margin:5px 0 3px!important;color:var(--cnc-ic-ink)!important;font-size:16px!important;font-weight:900!important;line-height:1.35!important;' +
      '}' +
      'body.cnc-industrial-sample[data-cnc-industrial-surface="home"] .recent-card p{' +
        'margin:0!important;color:var(--cnc-ic-muted)!important;font-size:12px!important;line-height:1.5!important;' +
      '}' +
      'body.cnc-industrial-sample[data-cnc-industrial-surface="home"] .recent-card-meta strong{' +
        'color:var(--cnc-ic-blue-deep)!important;font:950 16px/1 var(--cnc-ic-code-font)!important;' +
      '}' +
      'body.cnc-industrial-sample[data-cnc-industrial-surface="home"] .recent-empty{' +
        'padding:18px!important;border:1px dashed var(--cnc-ic-line-strong)!important;border-radius:12px!important;' +
        'background:var(--cnc-ic-surface)!important;color:var(--cnc-ic-muted)!important;font-size:13px!important;line-height:1.6!important;text-align:left!important;' +
      '}' +
      'body.cnc-clean-ui.cnc-vivid-ui.cnc-industrial-sample[data-cnc-industrial-surface="g01"] #detail-code,' +
      'body.cnc-clean-ui.cnc-vivid-ui.cnc-industrial-sample[data-cnc-industrial-surface="detail"] #detail-code{' +
        'display:block!important;margin:10px 0 8px!important;color:var(--cnc-ic-ink)!important;' +
        'font-family:var(--cnc-ic-code-font)!important;font-size:40px!important;line-height:1!important;' +
        'font-weight:950!important;letter-spacing:-.04em!important;' +
      '}' +
    '}';
    document.head.appendChild(style);
  }

  function isG01Code(value) {
    return /^G0?1(?:[^0-9]|$)/.test(String(value || '').toUpperCase().replace(/\s+/g, ''));
  }

  function isG01EntryId(value) {
    return /(?:^|[-_])g0?1$/i.test(String(value || '')) || /gcode-g0?1/i.test(String(value || ''));
  }

  function activeViewId() {
    var active = document.querySelector('.view.active');
    return active ? active.id : '';
  }

  function detailPanelOpen() {
    var panel = document.getElementById('detail-panel');
    return Boolean(panel && (panel.classList.contains('mobile-open') || (document.body && document.body.getAttribute('data-cnc-detail-open') === 'true') || (window.innerWidth > 768 && activeViewId() === 'view-workspace')));
  }

  function detailKind() {
    var code = ((document.getElementById('detail-code') || {}).textContent || '').trim();
    var title = ((document.getElementById('detail-title') || {}).textContent || '').trim();
    var category = ((document.getElementById('detail-category') || {}).textContent || '').trim();
    var text = (code + ' ' + title + ' ' + category + ' ' + pendingEntryId).toLowerCase();
    if (/报警|alarm|sv\d|ps\d|ot\d|ex\d/.test(text)) return 'alarm';
    if (/参数|parameter|param|\b\d{4}\b/.test(text)) return 'parameter';
    if (/故障|排查|诊断|fault|trouble/.test(text)) return 'fault';
    if (/^m\d|m代码|m-code/.test(text)) return 'mcode';
    if (/^g\d|g代码|g-code/.test(text)) return 'gcode';
    return 'knowledge';
  }

  function decorateHomeCards() {
    document.querySelectorAll('#view-dashboard .launchpad-card').forEach(function (card) {
      var title = ((card.querySelector('h3') || {}).textContent || '').trim();
      var rule = cardRules.find(function (item) { return item.match.test(title); }) || { glyph: '•', tone: 'graphite' };
      card.dataset.industrialTone = rule.tone;
      var icon = card.querySelector('.launchpad-card-icon');
      if (icon) {
        icon.textContent = rule.glyph;
        icon.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function recentGlyph(card) {
    var code = ((card.querySelector('.recent-card-meta strong') || {}).textContent || '').trim().toUpperCase();
    if (/^[GM]\d/.test(code)) return code.slice(0, 3);
    if (/^\d{3,}/.test(code)) return '#';
    return 'DOC';
  }

  function decorateDashboardRecent() {
    var container = document.getElementById('dashboard-recent-list');
    if (!container) return false;
    var empty = container.querySelector('.recent-empty');
    if (empty) empty.textContent = '还没有最近查看。先从上面的代码、报警或参数入口查一条，回来后会在这里快速继续。';
    container.querySelectorAll('.recent-card[data-entry-id]').forEach(function (card) {
      var title = ((card.querySelector('h4') || {}).textContent || '').trim();
      var code = ((card.querySelector('.recent-card-meta strong') || {}).textContent || '').trim();
      var icon = card.querySelector('.recent-card-icon');
      if (icon) {
        icon.textContent = recentGlyph(card);
        icon.setAttribute('aria-hidden', 'true');
      }
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', '继续查看 ' + (code ? code + ' ' : '') + title);
      if (card.dataset.industrialKeyboardBound !== 'true') {
        card.dataset.industrialKeyboardBound = 'true';
        card.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            card.click();
          }
        });
      }
    });
    return true;
  }

  function tagDetailCards() {
    var panel = document.getElementById('detail-panel');
    var grid = panel && panel.querySelector('.detail-content-grid');
    var primary = panel && panel.querySelector('.detail-card-primary');
    var trust = panel && panel.querySelector('.xp-trust-panel');
    if (grid && primary && trust && trust.parentElement !== grid) primary.insertAdjacentElement('afterend', trust);
    document.querySelectorAll('#detail-panel .detail-card').forEach(function (card) {
      card.removeAttribute('data-industrial-role');
      var heading = ((card.querySelector('h4') || {}).textContent || '').replace(/\s+/g, '');
      var role = 'secondary';
      if (card.classList.contains('detail-card-primary')) role = 'primary';
      else if (/新手先这样理解/.test(heading)) role = 'beginner';
      else if (/适合什么时候查/.test(heading)) role = 'usage';
      else if (/最容易错|高危操作提醒|风险|警告/.test(heading)) role = 'warning';
      else if (/加工前快速检查/.test(heading)) role = 'check';
      else if (/代码示例|程序示例|示例/.test(heading)) role = 'example';
      card.dataset.industrialRole = role;
    });
  }

  function setEntry(entryId) {
    pendingEntryId = String(entryId || '');
    if (!document.body) return false;
    document.body.classList.add('cnc-industrial-sample');
    document.body.setAttribute('data-cnc-industrial-surface', isG01EntryId(pendingEntryId) ? 'g01' : 'detail');
    document.body.setAttribute('data-cnc-detail-kind', detailKind());
    tagDetailCards();
    window.setTimeout(tagDetailCards, 80);
    window.setTimeout(tagDetailCards, 260);
    return true;
  }

  function clearEntry() {
    pendingEntryId = '';
    if (document.body) document.body.removeAttribute('data-cnc-detail-kind');
  }

  function syncSurface() {
    if (!document.body) return false;
    ensurePriorityStyle();
    ensureDetailStyle();
    document.body.classList.add('cnc-industrial-sample');
    decorateHomeCards();
    decorateDashboardRecent();
    var surface = '';
    if (detailPanelOpen()) {
      var codeText = (document.getElementById('detail-code') || {}).textContent || '';
      surface = (isG01Code(codeText) || isG01EntryId(pendingEntryId)) ? 'g01' : 'detail';
      document.body.setAttribute('data-cnc-detail-kind', detailKind());
      tagDetailCards();
    } else if (activeViewId() === 'view-dashboard') {
      surface = 'home';
      document.body.removeAttribute('data-cnc-detail-kind');
    }
    if (surface) document.body.setAttribute('data-cnc-industrial-surface', surface);
    else document.body.removeAttribute('data-cnc-industrial-surface');
    return Boolean(surface);
  }

  function patchRenderer(name, flagName) {
    if (window[flagName]) return true;
    var original = window[name];
    if (typeof original !== 'function') return false;
    window[name] = function () {
      var result = original.apply(this, arguments);
      window.setTimeout(syncSurface, 0);
      window.setTimeout(syncSurface, 90);
      window.setTimeout(syncSurface, 320);
      return result;
    };
    window[flagName] = true;
    return true;
  }

  function patchRenderers() {
    patchedRenderWorkspace = patchRenderer('renderWorkspace', '__CNC_INDUSTRIAL_WORKSPACE_PATCHED__') || patchedRenderWorkspace;
    patchedRenderDetail = patchRenderer('renderDetail', '__CNC_INDUSTRIAL_DETAIL_PATCHED__') || patchedRenderDetail;
    patchedRenderDashboardRecent = patchRenderer('renderDashboardRecent', '__CNC_INDUSTRIAL_DASHBOARD_RECENT_PATCHED__') || patchedRenderDashboardRecent;
    return patchedRenderWorkspace && patchedRenderDetail;
  }

  function scheduleSync(delay) {
    window.setTimeout(function () { patchRenderers(); syncSurface(); }, typeof delay === 'number' ? delay : 60);
  }

  function scheduleInteractionSync() {
    [30, 140, 320, 700, 1200].forEach(scheduleSync);
  }

  function bindEvents() {
    document.addEventListener('click', function (event) {
      if (!event.target || !event.target.closest) return;
      var entryButton = event.target.closest('[data-open-entry]');
      if (entryButton) setEntry(entryButton.getAttribute('data-open-entry') || '');
      if (event.target.closest('#detail-back-btn,[data-cnc-bottom="back"]')) clearEntry();
      if (event.target.closest('[data-route],[data-filter],.result-card,[data-open-entry],#detail-back-btn,#favorite-toggle,.xp-bottom-nav button,.recent-card')) scheduleInteractionSync();
    }, true);
    window.addEventListener('hashchange', function () { scheduleSync(40); scheduleSync(150); scheduleSync(420); });
    window.addEventListener('popstate', function () { scheduleSync(50); });
  }

  function boot() {
    ensurePriorityStyle();
    ensureDetailStyle();
    decorateHomeCards();
    decorateDashboardRecent();
    bindEvents();
    retryDelays.forEach(function (delay) { window.setTimeout(function () { patchRenderers(); syncSurface(); }, delay); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();

  window.CNC_INDUSTRIAL_SAMPLE = {
    build: BUILD,
    detailStyleBuild: DETAIL_STYLE_BUILD,
    polling: false,
    observer: false,
    sync: syncSurface,
    setEntry: setEntry,
    clearEntry: clearEntry,
    decorateDashboardRecent: decorateDashboardRecent,
    tokens: { canvas: '#f1efe9', surface: '#fffdf9', ink: '#292c2f', blue: '#3f6179', warning: '#c48722', cardRadius: '14px', controlRadius: '10px' },
    runCheck: function () {
      var surface = document.body ? document.body.getAttribute('data-cnc-industrial-surface') : '';
      var cards = document.querySelectorAll('#view-dashboard .launchpad-card[data-industrial-tone]');
      var detailStyle = document.querySelector('link[data-cnc-industrial-detail-pages]');
      var recentCards = document.querySelectorAll('#dashboard-recent-list .recent-card[role="button"][tabindex="0"]');
      var recentReady = Boolean(document.getElementById('dashboard-recent-list'));
      return {
        passed: Boolean(document.body && document.body.classList.contains('cnc-industrial-sample') && cards.length >= 6 && document.querySelector('style[data-cnc-industrial-priority]') && detailStyle && recentReady),
        build: BUILD,
        detailStyleBuild: DETAIL_STYLE_BUILD,
        surface: surface,
        detailKind: document.body ? document.body.getAttribute('data-cnc-detail-kind') || '' : '',
        decoratedCards: cards.length,
        decoratedRecentCards: recentCards.length,
        pendingEntryId: pendingEntryId,
        workspacePatched: patchedRenderWorkspace,
        detailPatched: patchedRenderDetail,
        dashboardRecentPatched: patchedRenderDashboardRecent,
        polling: false,
        observer: false
      };
    }
  };
})();