/* 数控小潘 CNC随身助手：报警、参数、故障三种独立查询模式。 */
(function () {
  'use strict';

  var BUILD = '20260720n';
  var MODE_META = {
    alarm: {
      label: '报警排查',
      kicker: '报警排查',
      title: '输入报警号，按顺序排查',
      eyebrow: 'ALARM CHECK',
      workspaceTitle: '报警排查',
      placeholder: '输入报警号，例如 SV0401、PS0001、OT0500'
    },
    parameter: {
      label: '参数速查',
      kicker: '参数速查',
      title: '查参数作用、风险和修改前检查',
      eyebrow: 'PARAMETER',
      workspaceTitle: '参数速查',
      placeholder: '输入参数号或名称，例如 1815、回零参数、主轴参数'
    },
    fault: {
      label: '故障问诊',
      kicker: '故障问诊',
      title: '按故障现象查原因和检查顺序',
      eyebrow: 'FAULT DIAGNOSIS',
      workspaceTitle: '故障问诊',
      placeholder: '描述现象，例如 回零失败、换刀异常、尺寸不稳、主轴异响'
    }
  };

  var originalFilterKeyMatches = null;
  var originalNavigate = null;
  var originalRenderWorkspace = null;

  function norm(value) {
    if (typeof normalizeText === 'function') return normalizeText(value || '');
    return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function entryHay(entry) {
    if (typeof getEntryText === 'function') return norm(getEntryText(entry));
    return norm([
      entry && entry.id,
      entry && entry.category,
      entry && entry.title,
      entry && entry.code,
      entry && entry.summary,
      entry && entry.usage,
      entry && entry.warning,
      entry && entry.source,
      entry && Array.isArray(entry.tags) ? entry.tags.join(' ') : ''
    ].filter(Boolean).join(' '));
  }

  function entryParts(entry) {
    return {
      category: norm(entry && entry.category),
      title: norm(entry && entry.title),
      code: norm(entry && entry.code).replace(/[\s_-]+/g, ''),
      hay: entryHay(entry)
    };
  }

  function hasAlarmCode(code, hay) {
    return /^(sv|sp|ps|ot|ex|sr|ds|alm|alarm)\d{3,6}$/i.test(code) ||
      /\b(sv|sp|ps|ot|ex|sr|ds|alm|alarm)\s*[-_]?\s*\d{3,6}\b/i.test(hay);
  }

  function isAlarmEntry(entry) {
    var p = entryParts(entry);
    if (hasAlarmCode(p.code, p.hay)) return true;
    if (p.category.indexOf('报警') !== -1 || p.title.indexOf('报警') !== -1) return true;
    return /报警号|伺服报警|主轴报警|过行程报警|系统报警|报警代码/.test(p.hay);
  }

  function isParameterEntry(entry) {
    var p = entryParts(entry);
    var explicitParameter = p.category.indexOf('参数') !== -1 ||
      p.title.indexOf('参数') !== -1 ||
      /参数号|系统参数|机床参数|伺服参数|主轴参数|坐标参数|刀补参数|parameter/.test(p.hay);
    var numericParameter = /^\d{3,6}$/.test(p.code) && /参数|设定|设置|轴|伺服|主轴|坐标|回零/.test(p.hay);
    var alarmPrimary = hasAlarmCode(p.code, p.hay) || p.category.indexOf('报警') !== -1 || p.title.indexOf('报警') !== -1;
    return (explicitParameter || numericParameter) && !alarmPrimary;
  }

  function isFaultEntry(entry) {
    var p = entryParts(entry);
    var faultSignal = p.category.indexOf('故障') !== -1 ||
      p.category.indexOf('维修') !== -1 ||
      p.category.indexOf('诊断') !== -1 ||
      /故障|维修|异常|失效|失败|无法|不能|不动|异响|振动|过热|尺寸不稳|回零失败|换刀异常|卡刀|断刀|刀纹|锥度|单网纹|排查/.test(p.title + ' ' + p.hay);
    var alarmPrimary = hasAlarmCode(p.code, p.hay) || p.category.indexOf('报警') !== -1 || p.title.indexOf('报警') !== -1;
    return faultSignal && !alarmPrimary;
  }

  function classifyEntry(entry) {
    if (isAlarmEntry(entry)) return 'alarm';
    if (isParameterEntry(entry)) return 'parameter';
    if (isFaultEntry(entry)) return 'fault';
    return 'other';
  }

  function patchFilterRules() {
    if (window.__CNC_QUERY_FILTER_PATCHED__) return true;
    try {
      if (typeof filterKeyMatches !== 'function' || typeof FILTER_META === 'undefined') return false;
      originalFilterKeyMatches = filterKeyMatches;
      FILTER_META.alarm = { label: MODE_META.alarm.label };
      FILTER_META.parameter = { label: MODE_META.parameter.label };
      FILTER_META.fault = { label: MODE_META.fault.label };
      delete FILTER_META.params;

      filterKeyMatches = function (entry, key) {
        if (key === 'alarm') return isAlarmEntry(entry);
        if (key === 'parameter') return isParameterEntry(entry);
        if (key === 'fault') return isFaultEntry(entry);
        return originalFilterKeyMatches(entry, key);
      };
      window.__CNC_QUERY_FILTER_PATCHED__ = true;
      return true;
    } catch (error) {
      console.warn('[CNC查询拆分] 筛选规则暂未就绪', error);
      return false;
    }
  }

  function setCardMode(card, mode, icon, title, desc, badge) {
    if (!card) return;
    card.dataset.route = 'workspace';
    card.dataset.filter = mode;
    card.dataset.queryMode = mode;
    var iconNode = card.querySelector('.launchpad-card-icon');
    var titleNode = card.querySelector('h3');
    var descNode = card.querySelector('p');
    var badgeNode = card.querySelector('.launchpad-badge');
    if (iconNode) iconNode.textContent = icon;
    if (titleNode) titleNode.textContent = title;
    if (descNode) descNode.textContent = desc;
    if (badgeNode) badgeNode.textContent = badge;
  }

  function bindNewRouteButton(button) {
    if (!button || button.dataset.cncQueryRouteBound === 'true') return;
    button.dataset.cncQueryRouteBound = 'true';
    button.addEventListener('click', function () {
      if (typeof navigate === 'function') navigate('workspace', { filter: button.dataset.filter });
    });
  }

  function updateDashboardCards() {
    var cards = Array.prototype.slice.call(document.querySelectorAll('.launchpad-card'));
    var alarmCard = cards.find(function (card) {
      var h = card.querySelector('h3');
      return h && h.textContent.trim() === '报警排查';
    });
    var parameterCard = cards.find(function (card) {
      var h = card.querySelector('h3');
      return h && h.textContent.trim() === '参数速查';
    });

    setCardMode(alarmCard, 'alarm', '🚨', '报警排查', '输入报警号，查看原因和安全排查顺序', '→ 查报警');
    setCardMode(parameterCard, 'parameter', '⚙', '参数速查', '查参数作用、适用范围和修改风险', '→ 查参数');

    var faultCard = document.querySelector('.launchpad-card[data-filter="fault"]');
    if (!faultCard && parameterCard) {
      faultCard = document.createElement('article');
      faultCard.className = 'launchpad-card';
      faultCard.innerHTML = '<div class="launchpad-card-icon">🩺</div>' +
        '<div><h3>故障问诊</h3><p>按异常现象查原因、检查顺序和处理边界</p><span class="launchpad-badge">→ 查故障</span></div>';
      parameterCard.insertAdjacentElement('afterend', faultCard);
      setCardMode(faultCard, 'fault', '🩺', '故障问诊', '按异常现象查原因、检查顺序和处理边界', '→ 查故障');
      bindNewRouteButton(faultCard);
    }
  }

  function updateSidebar() {
    var panel = document.querySelector('[data-tree-panel="workspace"]');
    if (!panel) return;
    var legacy = panel.querySelector('.tree-item[data-filter="params"]');
    var alarmButton = panel.querySelector('.tree-item[data-filter="alarm"]');
    if (!alarmButton && legacy) {
      alarmButton = legacy;
      alarmButton.dataset.filter = 'alarm';
      alarmButton.textContent = '报警排查';
    }
    if (!alarmButton) return;

    var parameterButton = panel.querySelector('.tree-item[data-filter="parameter"]');
    if (!parameterButton) {
      parameterButton = alarmButton.cloneNode(true);
      parameterButton.dataset.filter = 'parameter';
      parameterButton.textContent = '参数速查';
      parameterButton.removeAttribute('data-cnc-query-route-bound');
      alarmButton.insertAdjacentElement('afterend', parameterButton);
      bindNewRouteButton(parameterButton);
    }

    var faultButton = panel.querySelector('.tree-item[data-filter="fault"]');
    if (!faultButton) {
      faultButton = alarmButton.cloneNode(true);
      faultButton.dataset.filter = 'fault';
      faultButton.textContent = '故障问诊';
      faultButton.removeAttribute('data-cnc-query-route-bound');
      parameterButton.insertAdjacentElement('afterend', faultButton);
      bindNewRouteButton(faultButton);
    }
  }

  function applyModeMeta() {
    if (typeof state === 'undefined') return;
    var mode = MODE_META[state.activeFilter];
    if (!mode) {
      if (document.body) document.body.removeAttribute('data-cnc-query-mode');
      return;
    }
    if (document.body) document.body.setAttribute('data-cnc-query-mode', state.activeFilter);
    var kicker = document.getElementById('topbar-kicker');
    var topTitle = document.getElementById('topbar-title');
    var eyebrow = document.getElementById('workspace-eyebrow');
    var title = document.getElementById('workspace-title');
    var input = document.getElementById('search-input');
    if (kicker) {
      kicker.textContent = mode.kicker;
      kicker.style.display = '';
    }
    if (topTitle) topTitle.textContent = mode.title;
    if (eyebrow) eyebrow.textContent = mode.eyebrow;
    if (title) title.textContent = mode.workspaceTitle;
    if (input) input.placeholder = mode.placeholder;
  }

  function patchNavigation() {
    if (!window.__CNC_QUERY_NAV_PATCHED__) {
      try {
        if (typeof navigate !== 'function') return false;
        originalNavigate = navigate;
        navigate = function () {
          var result = originalNavigate.apply(this, arguments);
          window.setTimeout(applyModeMeta, 0);
          return result;
        };
        if (window.app) window.app.navigate = navigate;
        window.__CNC_QUERY_NAV_PATCHED__ = true;
      } catch (error) {
        console.warn('[CNC查询拆分] 路由补丁暂未就绪', error);
        return false;
      }
    }

    if (!window.__CNC_QUERY_RENDER_PATCHED__) {
      try {
        if (typeof renderWorkspace !== 'function') return false;
        originalRenderWorkspace = renderWorkspace;
        renderWorkspace = function () {
          var result = originalRenderWorkspace.apply(this, arguments);
          applyModeMeta();
          return result;
        };
        window.__CNC_QUERY_RENDER_PATCHED__ = true;
      } catch (error) {
        console.warn('[CNC查询拆分] 渲染补丁暂未就绪', error);
        return false;
      }
    }
    return true;
  }

  function getCounts() {
    if (typeof state === 'undefined' || !Array.isArray(state.entries)) return { alarm: 0, parameter: 0, fault: 0 };
    return state.entries.reduce(function (counts, entry) {
      var type = classifyEntry(entry);
      if (counts[type] !== undefined) counts[type] += 1;
      return counts;
    }, { alarm: 0, parameter: 0, fault: 0 });
  }

  function install() {
    if (!patchFilterRules()) return false;
    updateDashboardCards();
    updateSidebar();
    patchNavigation();
    if (typeof renderPresetChips === 'function') renderPresetChips();
    applyModeMeta();
    window.CNC_QUERY_MODES = {
      build: BUILD,
      classifyEntry: classifyEntry,
      getCounts: getCounts,
      applyModeMeta: applyModeMeta,
      refresh: function () {
        updateDashboardCards();
        updateSidebar();
        applyModeMeta();
      }
    };
    return true;
  }

  var tries = 0;
  var timer = window.setInterval(function () {
    tries += 1;
    if (install() || tries > 100) window.clearInterval(timer);
  }, 50);
})();
