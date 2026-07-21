/* 数控小潘：锤子工业卡片风视觉样板，仅作用于手机首页和 G01 详情。 */
(function () {
  'use strict';

  var BUILD = '20260721t';
  var patchedRenderWorkspace = false;
  var patchedRenderDetail = false;
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
      'body.cnc-clean-ui.cnc-vivid-ui.cnc-industrial-sample[data-cnc-industrial-surface="g01"] #detail-code{' +
        'display:block!important;margin:10px 0 8px!important;color:var(--cnc-ic-ink)!important;' +
        'font-family:var(--cnc-ic-code-font)!important;font-size:40px!important;line-height:1!important;' +
        'font-weight:950!important;letter-spacing:-.04em!important;' +
      '}' +
      'body.cnc-clean-ui.cnc-vivid-ui.cnc-industrial-sample[data-cnc-industrial-surface="g01"] #detail-panel .detail-card-primary{' +
        'background-image:none!important;background-color:var(--cnc-ic-surface)!important;' +
      '}' +
    '}';
    document.head.appendChild(style);
  }

  function isG01Code(value) {
    var text = String(value || '').toUpperCase().replace(/\s+/g, '');
    return /^G0?1(?:[^0-9]|$)/.test(text);
  }

  function isG01EntryId(value) {
    return /(?:^|[-_])g0?1$/i.test(String(value || '')) || /gcode-g0?1/i.test(String(value || ''));
  }

  function activeViewId() {
    var active = document.querySelector('.view.active');
    return active ? active.id : '';
  }

  function isG01DetailOpen() {
    var codeText = (document.getElementById('detail-code') || {}).textContent;
    var panel = document.getElementById('detail-panel');
    var opened = Boolean(panel && (
      panel.classList.contains('mobile-open') ||
      (document.body && document.body.getAttribute('data-cnc-detail-open') === 'true') ||
      (window.innerWidth > 768 && activeViewId() === 'view-workspace')
    ));
    return opened && (isG01Code(codeText) || isG01EntryId(pendingEntryId));
  }

  function decorateHomeCards() {
    document.querySelectorAll('#view-dashboard .launchpad-card').forEach(function (card) {
      var title = ((card.querySelector('h3') || {}).textContent || '').trim();
      var rule = cardRules.find(function (item) { return item.match.test(title); });
      if (!rule) rule = { glyph: '•', tone: 'graphite' };
      card.dataset.industrialTone = rule.tone;
      var icon = card.querySelector('.launchpad-card-icon');
      if (icon) {
        icon.textContent = rule.glyph;
        icon.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function tagDetailCards() {
    var panel = document.getElementById('detail-panel');
    var grid = panel && panel.querySelector('.detail-content-grid');
    var primary = panel && panel.querySelector('.detail-card-primary');
    var trust = panel && panel.querySelector('.xp-trust-panel');

    if (grid && primary && trust && trust.parentElement !== grid) {
      primary.insertAdjacentElement('afterend', trust);
    }

    document.querySelectorAll('#detail-panel .detail-card').forEach(function (card) {
      card.removeAttribute('data-industrial-role');
      var heading = ((card.querySelector('h4') || {}).textContent || '').replace(/\s+/g, '');
      var role = 'secondary';
      if (card.classList.contains('detail-card-primary')) role = 'primary';
      else if (/新手先这样理解/.test(heading)) role = 'beginner';
      else if (/适合什么时候查/.test(heading)) role = 'usage';
      else if (/最容易错|高危操作提醒/.test(heading)) role = 'warning';
      else if (/加工前快速检查/.test(heading)) role = 'check';
      else if (/代码示例/.test(heading)) role = 'example';
      card.dataset.industrialRole = role;
    });
  }

  function setEntry(entryId) {
    pendingEntryId = String(entryId || '');
    if (!document.body) return false;
    if (isG01EntryId(pendingEntryId)) {
      document.body.classList.add('cnc-industrial-sample');
      document.body.setAttribute('data-cnc-industrial-surface', 'g01');
      tagDetailCards();
      window.setTimeout(tagDetailCards, 80);
      window.setTimeout(tagDetailCards, 260);
      return true;
    }
    return false;
  }

  function clearEntry() {
    pendingEntryId = '';
  }

  function syncSurface() {
    if (!document.body) return false;
    ensurePriorityStyle();
    document.body.classList.add('cnc-industrial-sample');
    decorateHomeCards();

    var surface = '';
    if (isG01DetailOpen()) {
      surface = 'g01';
      tagDetailCards();
    } else if (activeViewId() === 'view-dashboard') {
      surface = 'home';
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
    return patchedRenderWorkspace && patchedRenderDetail;
  }

  function scheduleSync(delay) {
    window.setTimeout(function () {
      patchRenderers();
      syncSurface();
    }, typeof delay === 'number' ? delay : 60);
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
      if (event.target.closest('[data-route],[data-filter],.result-card,[data-open-entry],#detail-back-btn,#favorite-toggle,.xp-bottom-nav button')) {
        scheduleInteractionSync();
      }
    }, true);
    window.addEventListener('hashchange', function () {
      scheduleSync(40);
      scheduleSync(150);
      scheduleSync(420);
    });
    window.addEventListener('popstate', function () { scheduleSync(50); });
  }

  function boot() {
    ensurePriorityStyle();
    decorateHomeCards();
    bindEvents();
    retryDelays.forEach(function (delay) {
      window.setTimeout(function () {
        patchRenderers();
        syncSurface();
      }, delay);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();

  window.CNC_INDUSTRIAL_SAMPLE = {
    build: BUILD,
    polling: false,
    observer: false,
    sync: syncSurface,
    setEntry: setEntry,
    clearEntry: clearEntry,
    tokens: {
      canvas: '#f1efe9',
      surface: '#fffdf9',
      ink: '#292c2f',
      blue: '#3f6179',
      warning: '#c48722',
      cardRadius: '14px',
      controlRadius: '10px'
    },
    runCheck: function () {
      var surface = document.body ? document.body.getAttribute('data-cnc-industrial-surface') : '';
      var cards = document.querySelectorAll('#view-dashboard .launchpad-card[data-industrial-tone]');
      return {
        passed: Boolean(document.body && document.body.classList.contains('cnc-industrial-sample') && cards.length >= 6 && document.querySelector('style[data-cnc-industrial-priority]')),
        build: BUILD,
        surface: surface,
        decoratedCards: cards.length,
        pendingEntryId: pendingEntryId,
        workspacePatched: patchedRenderWorkspace,
        detailPatched: patchedRenderDetail,
        polling: false,
        observer: false
      };
    }
  };
})();
