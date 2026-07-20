/* 数控小潘手机减法界面交互层：整卡详情、独立报警/参数/故障查询。 */
(function () {
  'use strict';

  var BUILD = '20260720k';
  var originalRenderWorkspace = null;
  var originalFilterKeyMatches = null;
  var originalNavigate = null;

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
      'body.cnc-vivid-ui .launchpad-card[data-filter="alarm"]{background:linear-gradient(135deg,#ff304f,#ff7a18)!important;}' +
      'body.cnc-vivid-ui .launchpad-card[data-filter="params"]{background:linear-gradient(135deg,#ee8b00,#ffc400)!important;}' +
      'body.cnc-vivid-ui .launchpad-card[data-filter="fault"]{background:linear-gradient(135deg,#00a86b,#00c6a2)!important;}' +
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

  function getEntryHay(entry) {
    return String([
      entry && entry.id,
      entry && entry.category,
      entry && entry.title,
      entry && entry.code,
      entry && entry.summary,
      entry && entry.usage,
      entry && entry.beginner,
      entry && entry.warning,
      entry && entry.source,
      entry && entry.tags,
      entry && entry.aliases
    ].filter(Boolean).join(' ')).toLowerCase();
  }

  function installSplitFilters() {
    if (window.__CNC_SPLIT_FILTERS_INSTALLED__) return true;
    try {
      if (typeof filterKeyMatches !== 'function') return false;
      originalFilterKeyMatches = filterKeyMatches;
      filterKeyMatches = function (entry, key) {
        var hay = getEntryHay(entry);
        if (key === 'alarm') {
          return hay.indexOf('报警') !== -1 || /\b(?:sv|sp|ps|ot|ex|sr|ds|mc)\s*[-_]?\d{2,5}\b/i.test(hay);
        }
        if (key === 'params') {
          var parameterLike = hay.indexOf('参数') !== -1 || /\b\d{3,5}(?:\.[0-7])?\b/.test(hay);
          var alarmLike = hay.indexOf('报警') !== -1 || /\b(?:sv|sp|ps|ot|ex|sr|ds|mc)\s*[-_]?\d{2,5}\b/i.test(hay);
          return parameterLike && !alarmLike;
        }
        if (key === 'fault') {
          return hay.indexOf('故障') !== -1 || hay.indexOf('维修') !== -1 || hay.indexOf('排查') !== -1 || hay.indexOf('异常') !== -1;
        }
        return originalFilterKeyMatches(entry, key);
      };

      if (typeof FILTER_META !== 'undefined') {
        FILTER_META.alarm = { label: '报警号' };
        FILTER_META.params = { label: '参数号' };
        FILTER_META.fault = { label: '故障排查' };
      }
      window.__CNC_SPLIT_FILTERS_INSTALLED__ = true;
      return true;
    } catch (error) {
      console.warn('[CNC入口拆分] 筛选器暂未就绪', error);
      return false;
    }
  }

  function createSplitCard(filter, icon, title, desc, badge) {
    var card = document.createElement('button');
    card.type = 'button';
    card.className = 'launchpad-card';
    card.dataset.route = 'workspace';
    card.dataset.filter = filter;
    card.innerHTML = '<span class="launchpad-card-icon">' + icon + '</span>' +
      '<span><h3>' + title + '</h3><p>' + desc + '</p><span class="launchpad-badge">' + badge + '</span></span>';
    return card;
  }

  function injectSplitCards() {
    var grid = document.querySelector('.launchpad-grid');
    if (!grid || grid.querySelector('[data-filter="alarm"]')) return Boolean(grid);
    var mixed = grid.querySelector('[data-filter="params"]');
    if (!mixed) return false;

    var alarm = createSplitCard('alarm', '🚨', '报警号查询', '按报警编号查原因、风险与处理顺序', 'SV · SP · PS · OT');
    var params = createSplitCard('params', '⚙️', '参数号速查', '单独查询参数含义、适用系统和修改风险', '参数号 · 位参数');
    var fault = createSplitCard('fault', '🛠️', '故障排查', '按现象查电气、机械、主轴和换刀问题', '现象 → 原因 → 检查');
    mixed.replaceWith(alarm, params, fault);
    return true;
  }

  function updateWorkspaceCopy(filter) {
    var map = {
      alarm: ['报警号查询', '输入报警号，例如 SV0401、PS0001、OT0500', 'ALARM CODE'],
      params: ['参数号速查', '输入参数号，例如 1815、1320、3401', 'PARAMETER'],
      fault: ['故障排查', '输入故障现象，例如 主轴不转、换刀卡住、回零失败', 'TROUBLESHOOTING']
    };
    var item = map[filter];
    if (!item) return;
    var topTitle = document.getElementById('topbar-title');
    var topKicker = document.getElementById('topbar-kicker');
    var wsTitle = document.getElementById('workspace-title');
    var wsEyebrow = document.getElementById('workspace-eyebrow');
    var input = document.getElementById('search-input');
    if (topTitle) topTitle.textContent = item[0];
    if (topKicker) { topKicker.textContent = item[2]; topKicker.style.display = ''; }
    if (wsTitle) wsTitle.textContent = item[0];
    if (wsEyebrow) wsEyebrow.textContent = item[2];
    if (input) input.placeholder = item[1];
  }

  function patchNavigation() {
    if (window.__CNC_SPLIT_NAV_PATCHED__) return true;
    try {
      if (typeof navigate !== 'function') return false;
      originalNavigate = navigate;
      navigate = function (view, options) {
        var result = originalNavigate.apply(this, arguments);
        if (view === 'workspace' && typeof state !== 'undefined') updateWorkspaceCopy(state.activeFilter);
        return result;
      };
      window.__CNC_SPLIT_NAV_PATCHED__ = true;
      return true;
    } catch (error) {
      console.warn('[CNC入口拆分] 导航文案暂未就绪', error);
      return false;
    }
  }

  function bindSplitCards() {
    document.querySelectorAll('.launchpad-card[data-filter="alarm"],.launchpad-card[data-filter="params"],.launchpad-card[data-filter="fault"]').forEach(function (card) {
      if (card.dataset.cncSplitBound === 'true') return;
      card.dataset.cncSplitBound = 'true';
      card.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (typeof navigate === 'function') {
          navigate('workspace', { filter: card.dataset.filter, keyword: '' });
          if (typeof renderAll === 'function') renderAll();
          updateWorkspaceCopy(card.dataset.filter);
        }
      }, true);
    });
  }

  function bindResultButtons() {
    document.querySelectorAll('#result-list [data-open-entry]').forEach(function (button) {
      if (button.dataset.cncCleanBound === 'true') return;
      button.dataset.cncCleanBound = 'true';
      button.addEventListener('pointerdown', function () {
        window.__CNC_STABLE_LIST_SCROLL__ = window.scrollY;
      });
      button.addEventListener('click', function () { confirmMobilePanel(); });
    });
  }

  function patchWorkspaceRenderer() {
    installSplitFilters();
    patchNavigation();
    injectSplitCards();
    bindSplitCards();

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
        if (typeof state !== 'undefined') updateWorkspaceCopy(state.activeFilter);
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
    var ready = patchWorkspaceRenderer();
    if ((ready && injectSplitCards()) || tries > 120) window.clearInterval(timer);
  }, 100);

  document.addEventListener('click', function (event) {
    if (!event.target || !event.target.closest) return;
    if (event.target.closest('#detail-back-btn,[data-cnc-bottom="back"]')) closeMobilePanel();
  }, true);

  window.CNC_CLEAN_UI = {
    build: BUILD,
    openMobilePanel: openMobilePanel,
    closeMobilePanel: closeMobilePanel,
    confirmMobilePanel: confirmMobilePanel,
    bindResultButtons: bindResultButtons,
    installSplitFilters: installSplitFilters,
    injectSplitCards: injectSplitCards
  };
})();
