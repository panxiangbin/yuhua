(function () {
  'use strict';

  var GAME_QUERY_BUILD = '20260731c';
  var INDUSTRIAL_TOOLS_BUILD = '20260722d';

  // 换算工具增强层原先已有完整实现和真实浏览器门禁，但首页启动链没有加载它，
  // 导致工具 API 永远不就绪。这里仅接通现有 CNC 专用 CSS/JS，不改公式和测试。
  function ensureIndustrialToolsAssets() {
    if (!document.querySelector('link[data-cnc-industrial-tools]')) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = './industrial-tools.css?v=' + INDUSTRIAL_TOOLS_BUILD;
      link.dataset.cncIndustrialTools = INDUSTRIAL_TOOLS_BUILD;
      document.head.appendChild(link);
    }
    if (!document.querySelector('script[data-cnc-industrial-tools-script]')) {
      var script = document.createElement('script');
      script.src = './industrial-tools.js?v=' + INDUSTRIAL_TOOLS_BUILD;
      script.async = true;
      script.dataset.cncIndustrialToolsScript = INDUSTRIAL_TOOLS_BUILD;
      document.head.appendChild(script);
    }
  }

  ensureIndustrialToolsAssets();

  // 兼容旧版首页精选图渲染器：它读取 image.path，
  // 新图库数据统一使用 image.src。应用主脚本执行前补齐同源字段，
  // 避免首页把真实 WebP 路径误降级成不存在的同名 SVG。
  var enhanced = window.CNC_GALLERY_LIBRARY_ENHANCED;
  if (Array.isArray(enhanced)) {
    enhanced.forEach(function (image) {
      if (image && image.src && !image.path) image.path = image.src;
    });
  }

  function ensureGameQueryStyle() {
    if (document.querySelector('style[data-cnc-game-query-nav]')) return;
    var style = document.createElement('style');
    style.dataset.cncGameQueryNav = GAME_QUERY_BUILD;
    style.textContent = '@media (max-width:760px){' +
      'body.cnc-game-query-home-active #view-dashboard{padding-bottom:96px!important}' +
      'body.cnc-game-query-home-active>.xp-bottom-nav{display:none!important}' +
      '.xp-game-query-panel{margin-top:12px;padding:13px;border:1px solid rgba(117,178,255,.35);border-radius:17px;background:linear-gradient(180deg,#123b75,#092751);box-shadow:0 12px 28px rgba(0,0,0,.2)}' +
      '.xp-game-query-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px}' +
      '.xp-game-query-head h2{margin:0;color:#fff;font-size:17px;line-height:1.35;font-weight:1000}' +
      '.xp-game-query-head p{margin:3px 0 0;color:#bad2ee;font-size:11px;line-height:1.45}' +
      '.xp-game-query-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}' +
      '.xp-game-query-button{min-height:64px;display:grid;grid-template-columns:34px minmax(0,1fr);gap:8px;align-items:center;padding:9px 10px;border:1px solid rgba(255,255,255,.2);border-radius:13px;background:rgba(255,255,255,.09);color:#fff;text-align:left;font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
      '.xp-game-query-button:active{transform:translateY(2px);background:rgba(255,255,255,.15)}' +
      '.xp-game-query-button>span{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:#1577ff;font-size:18px;font-weight:1000}' +
      '.xp-game-query-button:nth-child(2)>span{background:#e66512}.xp-game-query-button:nth-child(3)>span{background:#7758f6}.xp-game-query-button:nth-child(4)>span{background:#22a866}' +
      '.xp-game-query-button strong{display:block;font-size:13px;line-height:1.25;font-weight:1000}' +
      '.xp-game-query-button small{display:block;margin-top:3px;color:#c6d8ed;font-size:9px;line-height:1.3;font-weight:800}' +
    '}';
    document.head.appendChild(style);
  }

  function dashboardActive() {
    var dashboard = document.getElementById('view-dashboard');
    return Boolean(dashboard && dashboard.classList.contains('active'));
  }

  function syncMobileNavigation() {
    if (!document.body) return;
    var active = dashboardActive();
    document.body.classList.toggle('cnc-game-query-home-active', active);
    var utility = document.querySelector('body>.xp-bottom-nav');
    if (utility) {
      utility.setAttribute('aria-hidden', active ? 'true' : 'false');
      utility.dataset.cncGameUtility = active ? 'hidden-on-game-home' : 'standard';
      if (active) utility.setAttribute('inert', '');
      else utility.removeAttribute('inert');
    }
  }

  function mountGameQueryPanel() {
    var home = document.getElementById('xp-game-home');
    if (!home) return false;
    var existing = home.querySelector('.xp-game-query-panel');
    if (!existing) {
      var panel = document.createElement('section');
      panel.className = 'xp-game-query-panel';
      panel.setAttribute('aria-labelledby', 'xp-game-query-title');
      panel.innerHTML = '<div class="xp-game-query-head"><div><h2 id="xp-game-query-title">现场速查</h2><p>查代码、报警、参数和故障，进入后可继续筛选。</p></div><span aria-hidden="true">🔎</span></div>' +
        '<div class="xp-game-query-grid">' +
          '<button type="button" class="xp-game-query-button" data-xp-query-filter="gcode" data-xp-filter="gcode" aria-label="进入G代码和M代码查询"><span>G</span><span><strong>G/M代码</strong><small>格式 · 含义 · 示例</small></span></button>' +
          '<button type="button" class="xp-game-query-button" data-xp-query-filter="alarm" data-xp-filter="alarm" aria-label="进入报警排查"><span>!</span><span><strong>报警排查</strong><small>报警号 · 原因 · 顺序</small></span></button>' +
          '<button type="button" class="xp-game-query-button" data-xp-query-filter="parameter" data-xp-filter="parameter" aria-label="进入参数速查"><span>P</span><span><strong>参数速查</strong><small>作用 · 风险 · 核验</small></span></button>' +
          '<button type="button" class="xp-game-query-button" data-xp-query-filter="fault" data-xp-filter="fault" aria-label="进入故障问诊"><span>?</span><span><strong>故障问诊</strong><small>现象 · 检查 · 边界</small></span></button>' +
        '</div>';
      var gameNav = home.querySelector('.xp-game-bottom-nav');
      if (gameNav) gameNav.insertAdjacentElement('beforebegin', panel);
      else home.appendChild(panel);
      existing = panel;
    }
    existing.dataset.ready = 'true';
    syncMobileNavigation();
    return true;
  }

  function openQueryMode(button, event) {
    var filter = button && button.getAttribute('data-xp-query-filter');
    if (!filter) return false;
    var guard = window.CNC_STARTUP_HOME_GUARD;
    if (guard && typeof guard.acceptTrustedRouteEvent === 'function') {
      guard.acceptTrustedRouteEvent(event);
    }

    // 复用应用已经验证过的原始工作区入口，确保启动首页守卫、查询模式拆分层
    // 和主路由按同一条真实事件链切换；仅在入口尚未生成时退回全局导航。
    var routeTarget = document.querySelector(
      '.launchpad-card[data-route="workspace"][data-filter="' + filter + '"],' +
      '#sidebar [data-route="workspace"][data-filter="' + filter + '"]'
    );
    if (routeTarget) routeTarget.click();
    else if (typeof window.navigate === 'function') window.navigate('workspace', { filter: filter });
    else return false;

    if (filter === 'gcode' && typeof window.CNC_LOAD_GCODE_PRO === 'function') {
      window.CNC_LOAD_GCODE_PRO();
    }
    window.setTimeout(function () {
      if (window.CNC_QUERY_MODES && typeof window.CNC_QUERY_MODES.applyModeMeta === 'function') {
        window.CNC_QUERY_MODES.applyModeMeta();
      }
      syncMobileNavigation();
    }, 0);
    window.setTimeout(syncMobileNavigation, 120);
    return true;
  }

  function installGameQueryNavigation() {
    ensureGameQueryStyle();
    var dashboard = document.getElementById('view-dashboard');
    if (!dashboard) return false;

    mountGameQueryPanel();
    var remounting = false;
    var mountObserver = new MutationObserver(function () {
      if (document.querySelector('#xp-game-home .xp-game-query-panel') || remounting) return;
      remounting = true;
      mountGameQueryPanel();
      remounting = false;
    });
    mountObserver.observe(dashboard, { childList: true, subtree: true });

    var viewObserver = new MutationObserver(syncMobileNavigation);
    viewObserver.observe(dashboard, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('click', function (event) {
      var queryButton = event.target && event.target.closest
        ? event.target.closest('#xp-game-home [data-xp-query-filter]')
        : null;
      if (queryButton) {
        event.preventDefault();
        openQueryMode(queryButton, event);
        return;
      }
      if (event.target && event.target.closest && event.target.closest('[data-route],[data-filter],[data-xp-route],[data-xp-filter]')) {
        window.setTimeout(syncMobileNavigation, 0);
        window.setTimeout(syncMobileNavigation, 120);
      }
    }, true);
    window.addEventListener('pageshow', function () {
      mountGameQueryPanel();
      syncMobileNavigation();
    });
    window.addEventListener('hashchange', function () { window.setTimeout(syncMobileNavigation, 0); });
    window.setTimeout(mountGameQueryPanel, 0);

    window.CNC_GAME_QUERY_NAV = {
      build: GAME_QUERY_BUILD,
      polling: false,
      observer: true,
      persistentRemount: true,
      mount: mountGameQueryPanel,
      sync: syncMobileNavigation,
      open: openQueryMode,
      runCheck: function () {
        var panel = document.querySelector('#xp-game-home .xp-game-query-panel[data-ready="true"]');
        var buttons = panel ? panel.querySelectorAll('[data-xp-query-filter]') : [];
        var utility = document.querySelector('body>.xp-bottom-nav');
        return {
          passed: Boolean(panel && buttons.length === 4),
          build: GAME_QUERY_BUILD,
          buttons: buttons.length,
          dashboardActive: dashboardActive(),
          utilityHidden: Boolean(
            utility &&
            utility.dataset.cncGameUtility === 'hidden-on-game-home' &&
            utility.getAttribute('aria-hidden') === 'true' &&
            utility.hasAttribute('inert') &&
            utility.getClientRects().length === 0
          )
        };
      }
    };
    return true;
  }

  // 最近查看卡片是 article + role=button。旧增强层虽然补了 tabindex，
  // 但 Enter 后只合成 click，启动导航层可能把工作区切换吞掉。
  // 在捕获阶段先把真实可信键盘事件交给启动首页守卫确认，再按条目 ID 导航；
  // Space 同样支持，并阻止页面滚动。
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    var target = event.target;
    var card = target && target.closest
      ? target.closest('#dashboard-recent-list .recent-card[data-entry-id]')
      : null;
    if (!card) return;

    var startupGuard = window.CNC_STARTUP_HOME_GUARD;
    if (startupGuard && typeof startupGuard.acceptTrustedRouteEvent === 'function') {
      startupGuard.acceptTrustedRouteEvent(event);
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    var entryId = card.dataset.entryId;
    try {
      state.selectedId = entryId;
      if (typeof window.navigate === 'function') {
        window.navigate('workspace');
        return;
      }
    } catch (error) {}

    // 仅在应用全局导航尚未就绪时退回原生点击，不伪造完成状态。
    card.click();
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installGameQueryNavigation, { once: true });
  } else {
    installGameQueryNavigation();
  }

  window.CNC_KB_CONTENT_MANIFEST = {
    build: '20260731h',
    enhancedImagesNormalized: Array.isArray(enhanced)
      ? enhanced.filter(function (image) { return image && image.path === image.src; }).length
      : 0,
    recentCardKeyboardNavigation: true,
    startupGuardBridge: true,
    industrialToolsBuild: INDUSTRIAL_TOOLS_BUILD,
    industrialToolsConnected: true,
    mobileGameQueryNavigation: GAME_QUERY_BUILD
  };
})();